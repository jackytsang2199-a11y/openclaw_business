import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import {
  createApiUsage,
  getUsageByToken,
  getUsageByCustomerId,
  listAllUsage,
  updateUsageSpend,
  updateUsageBudget,
  updateUsageBudgetByTier,
  resetUsageMonth,
  revokeToken,
  rotateToken,
  writeAuditLog,
  writeUsageHistory,
} from "../src/lib/db";

describe("api_usage CRUD", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM api_usage");
    await env.DB.exec("DELETE FROM usage_history");
    await env.DB.exec("DELETE FROM audit_log");
  });

  it("creates usage record and retrieves by token", async () => {
    const usage = await createApiUsage(env.DB, {
      customer_id: "1001",
      gateway_token: "abc123token",
      tier: 2,
    });
    expect(usage.customer_id).toBe("1001");
    expect(usage.gateway_token).toBe("abc123token");
    expect(usage.tier).toBe(2);
    expect(usage.monthly_budget_hkd).toBeNull();
    expect(usage.current_spend_hkd).toBe(0);
    expect(usage.current_month).toMatch(/^\d{4}-\d{2}$/);

    const found = await getUsageByToken(env.DB, "abc123token");
    expect(found).not.toBeNull();
    expect(found!.customer_id).toBe("1001");
  });

  it("returns null for unknown token", async () => {
    const found = await getUsageByToken(env.DB, "nonexistent");
    expect(found).toBeNull();
  });

  it("retrieves by customer_id", async () => {
    await createApiUsage(env.DB, {
      customer_id: "1001",
      gateway_token: "tok1",
      tier: 2,
    });
    const found = await getUsageByCustomerId(env.DB, "1001");
    expect(found).not.toBeNull();
    expect(found!.gateway_token).toBe("tok1");
  });

  it("lists all usage records", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 1 });
    await createApiUsage(env.DB, { customer_id: "1002", gateway_token: "tok2", tier: 2 });
    const all = await listAllUsage(env.DB);
    expect(all).toHaveLength(2);
  });

  it("updates spend and token counts", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 2 });
    const updated = await updateUsageSpend(env.DB, "1001", {
      cost_hkd: 1.5,
      tokens_in: 1000,
      tokens_out: 500,
    });
    expect(updated.current_spend_hkd).toBe(1.5);
    expect(updated.total_requests).toBe(1);
    expect(updated.total_tokens_in).toBe(1000);
    expect(updated.total_tokens_out).toBe(500);

    // Accumulates
    const updated2 = await updateUsageSpend(env.DB, "1001", {
      cost_hkd: 0.5,
      tokens_in: 200,
      tokens_out: 100,
    });
    expect(updated2.current_spend_hkd).toBe(2.0);
    expect(updated2.total_requests).toBe(2);
    expect(updated2.total_tokens_in).toBe(1200);
  });

  it("updates budget for single customer", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 2 });
    const updated = await updateUsageBudget(env.DB, "1001", 16.0);
    expect(updated!.monthly_budget_hkd).toBe(16.0);
  });

  it("bulk updates budget by tier", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 2 });
    await createApiUsage(env.DB, { customer_id: "1002", gateway_token: "tok2", tier: 2 });
    await createApiUsage(env.DB, { customer_id: "1003", gateway_token: "tok3", tier: 1 });
    const count = await updateUsageBudgetByTier(env.DB, 2, 16.0);
    expect(count).toBe(2);

    const tier1 = await getUsageByCustomerId(env.DB, "1003");
    expect(tier1!.monthly_budget_hkd).toBeNull(); // tier 1 unchanged
  });

  it("resets monthly counters and writes history", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 2 });
    await updateUsageSpend(env.DB, "1001", { cost_hkd: 5.0, tokens_in: 5000, tokens_out: 2000 });
    await updateUsageBudget(env.DB, "1001", 16.0);

    const reset = await resetUsageMonth(env.DB, "1001", "2026-02");
    expect(reset.current_spend_hkd).toBe(0);
    expect(reset.warned_at).toBeNull();
    expect(reset.blocked_at).toBeNull();
    expect(reset.total_requests).toBe(0);
    expect(reset.current_month).toMatch(/^\d{4}-\d{2}$/);

    // Check history was written for the old month
    const history = await env.DB.prepare(
      "SELECT * FROM usage_history WHERE customer_id = ?"
    ).bind("1001").first();
    expect(history).not.toBeNull();
    expect((history as any).month).toBe("2026-02");
    expect((history as any).spend_hkd).toBe(5.0);
  });

  it("revokes token (sets to empty string)", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 2 });
    await revokeToken(env.DB, "1001");
    const found = await getUsageByToken(env.DB, "tok1");
    expect(found).toBeNull();
    const byId = await getUsageByCustomerId(env.DB, "1001");
    expect(byId!.gateway_token).toBe("");
  });

  it("rotates token", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "old_token", tier: 2 });
    const updated = await rotateToken(env.DB, "1001", "new_token_value");
    expect(updated!.gateway_token).toBe("new_token_value");

    const byOld = await getUsageByToken(env.DB, "old_token");
    expect(byOld).toBeNull();
    const byNew = await getUsageByToken(env.DB, "new_token_value");
    expect(byNew).not.toBeNull();
  });

  it("writes audit log", async () => {
    await writeAuditLog(env.DB, {
      action: "budget_updated",
      customer_id: "1001",
      details: JSON.stringify({ before: null, after: 16.0 }),
      actor_ip: "1.2.3.4",
    });
    const log = await env.DB.prepare(
      "SELECT * FROM audit_log WHERE customer_id = ?"
    ).bind("1001").first();
    expect(log).not.toBeNull();
    expect((log as any).action).toBe("budget_updated");
  });
});
