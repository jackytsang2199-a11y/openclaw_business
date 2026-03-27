import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index";

describe("Admin Usage Endpoints", () => {
  const adminHeaders = {
    "X-API-Key": "test-confirm-key",
    "Content-Type": "application/json",
  };

  beforeEach(async () => {
    await env.DB.exec("DELETE FROM api_usage");
    await env.DB.exec("DELETE FROM usage_history");
    await env.DB.exec("DELETE FROM audit_log");
  });

  async function seedUsage(customerId: string, token: string, tier: number, budget: number | null = null) {
    const now = new Date().toISOString();
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    await env.DB.prepare(
      `INSERT INTO api_usage (customer_id, gateway_token, tier, monthly_budget_hkd, current_month, current_spend_hkd, total_requests, total_tokens_in, total_tokens_out, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`
    ).bind(customerId, token, tier, budget, month, now, now).run();
  }

  it("lists all usage (GET /api/usage)", async () => {
    await seedUsage("1001", "tok1", 2, 16.0);
    await seedUsage("1002", "tok2", 1, null);

    const req = new Request("http://localhost/api/usage", { headers: adminHeaders });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.usage).toHaveLength(2);
    // Token should be masked
    expect(body.usage[0].gateway_token).toMatch(/\*+.{4}$/);
  });

  it("gets single customer usage (GET /api/usage/:id)", async () => {
    await seedUsage("1001", "abcdef1234567890", 2, 16.0);

    const req = new Request("http://localhost/api/usage/1001", { headers: adminHeaders });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.usage.customer_id).toBe("1001");
    expect(body.usage.gateway_token).toMatch(/\*+7890$/);
  });

  it("returns 404 for unknown customer", async () => {
    const req = new Request("http://localhost/api/usage/9999", { headers: adminHeaders });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(404);
  });

  it("updates budget (PATCH /api/usage/:id)", async () => {
    await seedUsage("1001", "tok1", 2, null);

    const req = new Request("http://localhost/api/usage/1001", {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ monthly_budget_hkd: 20.0 }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.usage.monthly_budget_hkd).toBe(20.0);

    // Check audit log
    const audit = await env.DB.prepare("SELECT * FROM audit_log WHERE customer_id = ?").bind("1001").first() as any;
    expect(audit.action).toBe("budget_updated");
  });

  it("bulk updates budget by tier (POST /api/usage/budgets)", async () => {
    await seedUsage("1001", "tok1", 2);
    await seedUsage("1002", "tok2", 2);
    await seedUsage("1003", "tok3", 1);

    const req = new Request("http://localhost/api/usage/budgets", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ tier: 2, monthly_budget_hkd: 16.0 }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.updated).toBe(2);
  });

  it("resets monthly spend (POST /api/usage/:id/reset)", async () => {
    await seedUsage("1001", "tok1", 2, 16.0);
    await env.DB.prepare(
      "UPDATE api_usage SET current_spend_hkd = 12.0, warned_at = '2026-03-20T00:00:00Z' WHERE customer_id = ?"
    ).bind("1001").run();

    const req = new Request("http://localhost/api/usage/1001/reset", {
      method: "POST",
      headers: adminHeaders,
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.usage.current_spend_hkd).toBe(0);
    expect(body.usage.warned_at).toBeNull();
  });

  it("revokes token (POST /api/usage/:id/revoke)", async () => {
    await seedUsage("1001", "tok_to_revoke", 2);

    const req = new Request("http://localhost/api/usage/1001/revoke", {
      method: "POST",
      headers: adminHeaders,
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.message).toContain("revoked");

    // Verify token no longer works for lookup
    const usage = await env.DB.prepare(
      "SELECT * FROM api_usage WHERE gateway_token = ?"
    ).bind("tok_to_revoke").first();
    expect(usage).toBeNull();
  });

  it("rotates token (POST /api/usage/:id/rotate)", async () => {
    await seedUsage("1001", "old_token_value", 2);

    const req = new Request("http://localhost/api/usage/1001/rotate", {
      method: "POST",
      headers: adminHeaders,
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.new_token).toBeDefined();
    expect(body.new_token.length).toBe(64);
    expect(body.new_token).not.toBe("old_token_value");
  });

  it("rejects admin endpoints with gateway token (not API key)", async () => {
    await seedUsage("1001", "gateway_tok", 2);

    const req = new Request("http://localhost/api/usage", {
      headers: { "Authorization": "Bearer gateway_tok" },
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(401);
  });

  it("creates usage record (POST /api/usage)", async () => {
    const req = new Request("http://localhost/api/usage", {
      method: "POST",
      headers: { ...adminHeaders, "X-Worker-Token": "test-worker-token" },
      body: JSON.stringify({
        customer_id: "1001",
        gateway_token: "new_generated_token",
        tier: 2,
      }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(201);

    const body = await resp.json() as any;
    expect(body.usage.customer_id).toBe("1001");
  });
});
