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
