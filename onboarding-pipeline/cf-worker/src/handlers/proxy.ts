import { Env, ApiUsage } from "../lib/types";
import { unauthorized, tooManyRequests } from "../lib/auth";
import {
  getUsageByToken,
  updateUsageSpend,
  setWarned,
  setBlocked,
  resetUsageMonth,
} from "../lib/db";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function calculateCostHkd(
  provider: string,
  tokensIn: number,
  tokensOut: number,
  env: Env
): number {
  const usdToHkd = parseFloat(env.USD_TO_HKD || "7.8");
  let inputRate: number;
  let outputRate: number;

  if (provider === "openai") {
    // text-embedding-3-small: $0.02/1M input, $0 output
    inputRate = parseFloat(env.OPENAI_INPUT_RATE || "0.00000002");
    outputRate = parseFloat(env.OPENAI_OUTPUT_RATE || "0");
  } else if (provider === "zhipu") {
    // GLM-4-Flash: FREE
    inputRate = parseFloat(env.ZHIPU_INPUT_RATE || "0");
    outputRate = parseFloat(env.ZHIPU_OUTPUT_RATE || "0");
  } else {
    // DeepSeek V3.2: $0.28/1M input, $0.42/1M output
    inputRate = parseFloat(env.DEEPSEEK_INPUT_RATE || "0.00000028");
    outputRate = parseFloat(env.DEEPSEEK_OUTPUT_RATE || "0.00000042");
  }

  return (tokensIn * inputRate + tokensOut * outputRate) * usdToHkd;
}

/** Extract usage from SSE stream — finds the last data chunk with usage info. */
function extractUsageFromSSE(body: string): { prompt_tokens: number; completion_tokens: number } | null {
  const lines = body.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
    try {
      const parsed = JSON.parse(line.slice(6));
      if (parsed.usage) return parsed.usage;
    } catch {
      continue;
    }
  }
  return null;
}

export async function handleAiProxy(
  request: Request,
  env: Env,
  provider: string,
  subpath: string
): Promise<Response> {
  // 1. Extract gateway token from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized("Missing authentication token");
  }
  const token = authHeader.slice(7);

  // 2. Look up token in D1
  let usage = await getUsageByToken(env.DB, token);
  if (!usage) {
    return unauthorized("Invalid authentication token");
  }

  // 3. Check if month needs reset
  const month = currentMonth();
  if (usage.current_month !== month) {
    usage = await resetUsageMonth(env.DB, usage.customer_id, usage.current_month);
  }

  // 4. Check budget
  if (usage.monthly_budget_hkd !== null) {
    if (usage.current_spend_hkd >= usage.monthly_budget_hkd) {
      return tooManyRequests("Monthly usage limit reached. Your limit resets on the 1st of next month.");
    }
  }

  // 5. Forward directly to provider API with real key
  const providerBaseUrls: Record<string, string> = {
    deepseek: "https://api.deepseek.com/v1",
    openai: "https://api.openai.com/v1",
    zhipu: "https://open.bigmodel.cn/api/paas/v4",
  };
  const baseUrl = providerBaseUrls[provider];
  if (!baseUrl) {
    return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKeyMap: Record<string, string> = {
    openai: env.OPENAI_API_KEY,
    zhipu: env.ZHIPU_API_KEY,
  };
  const apiKey = apiKeyMap[provider] || env.DEEPSEEK_API_KEY;
  const providerUrl = `${baseUrl}/${subpath}`;

  // Read request body and inject stream_options if streaming
  let requestBody = await request.text();
  let isStreaming = false;
  try {
    const parsed = JSON.parse(requestBody);
    if (parsed.stream) {
      isStreaming = true;
      parsed.stream_options = { include_usage: true };
      requestBody = JSON.stringify(parsed);
    }
  } catch {
    // Not JSON — pass through as-is
  }

  const gatewayResponse = await fetch(providerUrl, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: requestBody,
  });

  // 6. Read response and extract token usage
  const responseBody = await gatewayResponse.text();
  let tokensIn = 0;
  let tokensOut = 0;

  if (isStreaming) {
    // Parse SSE stream for usage in final chunk
    const sseUsage = extractUsageFromSSE(responseBody);
    if (sseUsage) {
      tokensIn = sseUsage.prompt_tokens || 0;
      tokensOut = sseUsage.completion_tokens || 0;
    }
  } else {
    try {
      const parsed = JSON.parse(responseBody);
      if (parsed.usage) {
        tokensIn = parsed.usage.prompt_tokens || 0;
        tokensOut = parsed.usage.completion_tokens || 0;
      }
    } catch {
      // If response isn't JSON or has no usage, track request but not tokens
    }
  }

  // 7. Calculate cost and update D1
  const costHkd = calculateCostHkd(provider, tokensIn, tokensOut, env);
  const updatedUsage = await updateUsageSpend(env.DB, usage.customer_id, {
    cost_hkd: costHkd,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
  });

  // 8. Build response with optional warning header
  const responseHeaders = new Headers({
    "Content-Type": gatewayResponse.headers.get("Content-Type") || "application/json",
  });

  if (updatedUsage.monthly_budget_hkd !== null) {
    const percentUsed = updatedUsage.current_spend_hkd / updatedUsage.monthly_budget_hkd;

    if (percentUsed >= 0.9 && !updatedUsage.warned_at) {
      await setWarned(env.DB, usage.customer_id);
      responseHeaders.set("X-Budget-Warning", "true");
    } else if (updatedUsage.warned_at) {
      // Already warned — keep sending the header
      responseHeaders.set("X-Budget-Warning", "true");
    }

    if (percentUsed >= 1.0 && !updatedUsage.blocked_at) {
      await setBlocked(env.DB, usage.customer_id);
    }
  }

  return new Response(responseBody, {
    status: gatewayResponse.status,
    headers: responseHeaders,
  });
}
