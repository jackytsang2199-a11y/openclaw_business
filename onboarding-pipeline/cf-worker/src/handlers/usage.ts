import { Env } from "../lib/types";
import {
  verifyConfirmApiKey,
  verifyWorkerToken,
  unauthorized,
  badRequest,
  notFound,
  json,
} from "../lib/auth";
import {
  createApiUsage,
  getUsageByCustomerId,
  listAllUsage,
  updateUsageBudget,
  updateUsageBudgetByTier,
  resetUsageMonth,
  revokeToken,
  rotateToken,
  writeAuditLog,
} from "../lib/db";

function maskToken(token: string): string {
  if (!token || token.length < 4) return "****";
  return "****" + token.slice(-4);
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function handleListUsage(request: Request, env: Env): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const all = await listAllUsage(env.DB);
  const usage = all.map(u => ({
    ...u,
    gateway_token: maskToken(u.gateway_token),
    percent_used: u.monthly_budget_hkd ? Math.round((u.current_spend_hkd / u.monthly_budget_hkd) * 1000) / 10 : null,
    warned: !!u.warned_at,
    blocked: !!u.blocked_at,
  }));
  return json({ usage });
}

export async function handleGetUsage(request: Request, env: Env, customerId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const usage = await getUsageByCustomerId(env.DB, customerId);
  if (!usage) return notFound("Customer not found");

  return json({
    usage: {
      ...usage,
      gateway_token: maskToken(usage.gateway_token),
      percent_used: usage.monthly_budget_hkd ? Math.round((usage.current_spend_hkd / usage.monthly_budget_hkd) * 1000) / 10 : null,
    },
  });
}

export async function handleUpdateUsage(request: Request, env: Env, customerId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const existing = await getUsageByCustomerId(env.DB, customerId);
  if (!existing) return notFound("Customer not found");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (body.monthly_budget_hkd === undefined) {
    return badRequest("Missing required field: monthly_budget_hkd");
  }

  const updated = await updateUsageBudget(env.DB, customerId, body.monthly_budget_hkd as number);
  await writeAuditLog(env.DB, {
    action: "budget_updated",
    customer_id: customerId,
    details: JSON.stringify({ before: existing.monthly_budget_hkd, after: body.monthly_budget_hkd }),
    actor_ip: request.headers.get("CF-Connecting-IP") || undefined,
  });

  return json({ usage: updated });
}

export async function handleBulkUpdateBudgets(request: Request, env: Env): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.tier || body.monthly_budget_hkd === undefined) {
    return badRequest("Missing required fields: tier, monthly_budget_hkd");
  }

  const count = await updateUsageBudgetByTier(env.DB, body.tier as number, body.monthly_budget_hkd as number);
  return json({ updated: count });
}

export async function handleResetUsage(request: Request, env: Env, customerId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const existing = await getUsageByCustomerId(env.DB, customerId);
  if (!existing) return notFound("Customer not found");

  const reset = await resetUsageMonth(env.DB, customerId, existing.current_month);
  await writeAuditLog(env.DB, {
    action: "spend_reset",
    customer_id: customerId,
    details: JSON.stringify({ previous_spend: existing.current_spend_hkd }),
    actor_ip: request.headers.get("CF-Connecting-IP") || undefined,
  });

  return json({ usage: reset });
}

export async function handleRevokeToken(request: Request, env: Env, customerId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const existing = await getUsageByCustomerId(env.DB, customerId);
  if (!existing) return notFound("Customer not found");

  await revokeToken(env.DB, customerId);
  await writeAuditLog(env.DB, {
    action: "token_revoked",
    customer_id: customerId,
    details: JSON.stringify({ token_last4: existing.gateway_token.slice(-4) }),
    actor_ip: request.headers.get("CF-Connecting-IP") || undefined,
  });

  return json({ message: "Token revoked. Customer API access disabled." });
}

export async function handleRotateToken(request: Request, env: Env, customerId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const existing = await getUsageByCustomerId(env.DB, customerId);
  if (!existing) return notFound("Customer not found");

  const newToken = generateToken();
  await rotateToken(env.DB, customerId, newToken);
  await writeAuditLog(env.DB, {
    action: "token_rotated",
    customer_id: customerId,
    details: JSON.stringify({ old_last4: existing.gateway_token.slice(-4), new_last4: newToken.slice(-4) }),
    actor_ip: request.headers.get("CF-Connecting-IP") || undefined,
  });

  return json({ new_token: newToken });
}

export async function handleCreateUsage(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.customer_id || !body.gateway_token || !body.tier) {
    return badRequest("Missing required fields: customer_id, gateway_token, tier");
  }

  try {
    const usage = await createApiUsage(env.DB, {
      customer_id: body.customer_id as string,
      gateway_token: body.gateway_token as string,
      tier: body.tier as number,
      monthly_budget_hkd: body.monthly_budget_hkd as number | undefined,
    });
    return json({ usage }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UNIQUE constraint")) {
      return json({ error: "Gateway token already exists" }, 409);
    }
    throw err;
  }
}
