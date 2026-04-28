import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("handleCreateUsage — budget passthrough", () => {
  it("stores monthly_budget_hkd when provided in request body", async () => {
    const resp = await SELF.fetch("https://api.3nexgen.com/api/usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Token": "test-worker-token",
      },
      body: JSON.stringify({
        customer_id: "9001",
        gateway_token: "aabbccdd00112233445566778899aabbccddeeff00112233445566778899aabb",
        tier: 2,
        monthly_budget_hkd: 70,
      }),
    });

    expect(resp.status).toBe(201);
    const data = await resp.json() as { usage: { monthly_budget_hkd: number | null } };
    expect(data.usage.monthly_budget_hkd).toBe(70);
  });

  it("stores monthly_budget_hkd for each tier correctly", async () => {
    const tiers = [
      { tier: 1, budget: 40, cid: "9002" },
      { tier: 2, budget: 70, cid: "9003" },
      { tier: 3, budget: 100, cid: "9004" },
    ];

    for (const { tier, budget, cid } of tiers) {
      const token = `token_tier${tier}_${"a".repeat(56)}`;
      const resp = await SELF.fetch("https://api.3nexgen.com/api/usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Token": "test-worker-token",
        },
        body: JSON.stringify({
          customer_id: cid,
          gateway_token: token,
          tier,
          monthly_budget_hkd: budget,
        }),
      });

      expect(resp.status).toBe(201);
      const data = await resp.json() as { usage: { monthly_budget_hkd: number | null; tier: number } };
      expect(data.usage.tier).toBe(tier);
      expect(data.usage.monthly_budget_hkd).toBe(budget);
    }
  });

  it("stores null budget when monthly_budget_hkd is not provided", async () => {
    const resp = await SELF.fetch("https://api.3nexgen.com/api/usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Token": "test-worker-token",
      },
      body: JSON.stringify({
        customer_id: "9005",
        gateway_token: "no_budget_token_" + "b".repeat(48),
        tier: 1,
        // no monthly_budget_hkd
      }),
    });

    expect(resp.status).toBe(201);
    const data = await resp.json() as { usage: { monthly_budget_hkd: number | null } };
    expect(data.usage.monthly_budget_hkd).toBeNull();
  });

  it("budget is readable via GET /api/usage/:id after creation", async () => {
    // Create usage with budget
    await SELF.fetch("https://api.3nexgen.com/api/usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Token": "test-worker-token",
      },
      body: JSON.stringify({
        customer_id: "9006",
        gateway_token: "readable_budget_" + "c".repeat(48),
        tier: 3,
        monthly_budget_hkd: 100,
      }),
    });

    // Read it back via admin endpoint
    const resp = await SELF.fetch("https://api.3nexgen.com/api/usage/9006", {
      headers: { "X-API-Key": "test-confirm-key" },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json() as { usage: { monthly_budget_hkd: number | null } };
    expect(data.usage.monthly_budget_hkd).toBe(100);
  });
});
