import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import worker from "../src/index";

describe("AI Gateway Proxy", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM api_usage");
    await env.DB.exec("DELETE FROM usage_history");
    await env.DB.exec("DELETE FROM audit_log");
    vi.restoreAllMocks();
  });

  async function createUsageRecord(customerId: string, token: string, tier: number, budget: number | null = null) {
    const now = new Date().toISOString();
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    await env.DB.prepare(
      `INSERT INTO api_usage (customer_id, gateway_token, tier, monthly_budget_hkd, current_month, current_spend_hkd, total_requests, total_tokens_in, total_tokens_out, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`
    ).bind(customerId, token, tier, budget, month, now, now).run();
  }

  function makeProxyRequest(token: string, provider: string = "deepseek") {
    return new Request(`http://localhost/api/ai/${provider}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "hello" }],
      }),
    });
  }

  it("rejects request with no auth token", async () => {
    const req = new Request("http://localhost/api/ai/deepseek/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-chat", messages: [] }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(401);
    const body = await resp.json() as any;
    expect(body.error).toBe("Missing authentication token");
  });

  it("rejects request with invalid token", async () => {
    const req = makeProxyRequest("invalid_token_here");
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(401);
    const body = await resp.json() as any;
    expect(body.error).toBe("Invalid authentication token");
  });

  it("rejects request when budget is exceeded", async () => {
    await createUsageRecord("1001", "valid_token", 2, 10.0);
    // Set spend to over budget
    await env.DB.prepare(
      "UPDATE api_usage SET current_spend_hkd = 10.5 WHERE customer_id = ?"
    ).bind("1001").run();

    const req = makeProxyRequest("valid_token");
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(429);
    const body = await resp.json() as any;
    expect(body.error).toContain("Monthly usage limit reached");
  });

  it("passes through when budget is NULL (no limit)", async () => {
    await createUsageRecord("1001", "valid_token", 2, null);

    // Mock global fetch so it doesn't actually call AI Gateway
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: "hi" } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      }), { status: 200 }))
    ));

    const req = makeProxyRequest("valid_token");
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    // Verify usage was tracked even without budget
    const usage = await env.DB.prepare(
      "SELECT * FROM api_usage WHERE customer_id = ?"
    ).bind("1001").first();
    expect((usage as any).total_requests).toBe(1);
    expect((usage as any).total_tokens_in).toBe(100);
  });

  it("adds X-Budget-Warning header at 90% spend", async () => {
    await createUsageRecord("1001", "valid_token", 2, 10.0);
    await env.DB.prepare(
      "UPDATE api_usage SET current_spend_hkd = 9.0 WHERE customer_id = ?"
    ).bind("1001").run();

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: "hi" } }],
        usage: { prompt_tokens: 50, completion_tokens: 20 },
      }), { status: 200 }))
    ));

    const req = makeProxyRequest("valid_token");
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("X-Budget-Warning")).toBe("true");
  });

  it("tracks cost using correct DeepSeek rates ($0.28/$0.42 per 1M)", async () => {
    await createUsageRecord("1001", "valid_token", 2, null);

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: "hi" } }],
        usage: { prompt_tokens: 1000000, completion_tokens: 1000000 },
      }), { status: 200 }))
    ));

    const req = makeProxyRequest("valid_token", "deepseek");
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const usage = await env.DB.prepare(
      "SELECT current_spend_hkd FROM api_usage WHERE customer_id = ?"
    ).bind("1001").first() as any;

    // DeepSeek V3.2: $0.28/1M input + $0.42/1M output = $0.70 USD
    // × 7.8 = HKD $5.46
    const expectedHkd = (0.28 + 0.42) * 7.8;
    expect(usage.current_spend_hkd).toBeCloseTo(expectedHkd, 1);
  });

  it("tracks cost using correct OpenAI embedding rates ($0.02/1M input, $0 output)", async () => {
    await createUsageRecord("1001", "valid_token", 2, null);

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({
        data: [{ embedding: [0.1, 0.2] }],
        usage: { prompt_tokens: 1000000, completion_tokens: 0 },
      }), { status: 200 }))
    ));

    const req = new Request("http://localhost/api/ai/openai/embeddings", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid_token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: "test text",
      }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const usage = await env.DB.prepare(
      "SELECT current_spend_hkd FROM api_usage WHERE customer_id = ?"
    ).bind("1001").first() as any;

    // OpenAI embed: $0.02/1M input + $0 output = $0.02 USD × 7.8 = HKD $0.156
    const expectedHkd = 0.02 * 7.8;
    expect(usage.current_spend_hkd).toBeCloseTo(expectedHkd, 2);
  });

  it("routes zhipu provider to correct upstream URL", async () => {
    await createUsageRecord("1001", "valid_token", 2, null);

    const mockFetch = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: "hi" } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      }), { status: 200 }))
    );
    vi.stubGlobal("fetch", mockFetch);

    const req = new Request("http://localhost/api/ai/zhipu/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid_token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [{ role: "user", content: "hello" }],
      }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    // Verify it called the Zhipu API
    expect(mockFetch).toHaveBeenCalledWith(
      "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      expect.anything()
    );
  });

  it("tracks zhipu requests at zero cost (free tier)", async () => {
    await createUsageRecord("1001", "valid_token", 2, null);

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: "hi" } }],
        usage: { prompt_tokens: 1000, completion_tokens: 500 },
      }), { status: 200 }))
    ));

    const req = new Request("http://localhost/api/ai/zhipu/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid_token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [{ role: "user", content: "hello" }],
      }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const usage = await env.DB.prepare(
      "SELECT current_spend_hkd, total_requests, total_tokens_in FROM api_usage WHERE customer_id = ?"
    ).bind("1001").first() as any;

    // Zhipu GLM-4-Flash is free — cost should be 0
    expect(usage.current_spend_hkd).toBe(0);
    // But tokens and requests still tracked
    expect(usage.total_requests).toBe(1);
    expect(usage.total_tokens_in).toBe(1000);
  });

  it("tracks tokens from streamed SSE responses", async () => {
    await createUsageRecord("1001", "valid_token", 2, null);

    // Simulate SSE stream response with usage in final chunk
    const sseBody = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n',
      'data: {"choices":[],"usage":{"prompt_tokens":500,"completion_tokens":200}}\n',
      'data: [DONE]\n',
    ].join("\n");

    const mockFetch = vi.fn().mockImplementation((url: string, init: any) => {
      // Verify stream_options was injected into the forwarded request
      const body = JSON.parse(init.body);
      expect(body.stream_options).toEqual({ include_usage: true });

      return Promise.resolve(new Response(sseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }));
    });
    vi.stubGlobal("fetch", mockFetch);

    const req = new Request("http://localhost/api/ai/deepseek/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid_token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        stream: true,
        messages: [{ role: "user", content: "hello" }],
      }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const usage = await env.DB.prepare(
      "SELECT total_tokens_in, total_tokens_out, current_spend_hkd FROM api_usage WHERE customer_id = ?"
    ).bind("1001").first() as any;

    expect(usage.total_tokens_in).toBe(500);
    expect(usage.total_tokens_out).toBe(200);
    expect(usage.current_spend_hkd).toBeGreaterThan(0);
  });

  it("resets monthly counters on new month", async () => {
    await createUsageRecord("1001", "valid_token", 2, 10.0);
    // Set to old month
    await env.DB.prepare(
      "UPDATE api_usage SET current_month = '2026-01', current_spend_hkd = 8.0, total_requests = 500, warned_at = '2026-01-20T00:00:00Z' WHERE customer_id = ?"
    ).bind("1001").run();

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: "hi" } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      }), { status: 200 }))
    ));

    const req = makeProxyRequest("valid_token");
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    // Check usage was reset (and this request added to the fresh month)
    const usage = await env.DB.prepare(
      "SELECT * FROM api_usage WHERE customer_id = ?"
    ).bind("1001").first() as any;
    expect(usage.total_requests).toBe(1); // Only this request
    expect(usage.warned_at).toBeNull();

    // Check history was written for old month
    const history = await env.DB.prepare(
      "SELECT * FROM usage_history WHERE customer_id = ? AND month = ?"
    ).bind("1001", "2026-01").first() as any;
    expect(history).not.toBeNull();
    expect(history.spend_hkd).toBe(8.0);
  });
});
