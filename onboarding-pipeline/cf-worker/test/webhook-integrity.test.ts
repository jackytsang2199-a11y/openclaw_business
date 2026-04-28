// Phase 2 — payment integrity tests
//
// Covers: variant validation, idempotency via event_id, subscription
// lifecycle (cancel/expire/refund/failed/recovered), LS identity linking.
//
// Real LS payload fixtures will replace these hand-built mocks in Task 2.7
// once the user exports webhook history from the LS dashboard.

import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index";
import { createOrder, createApiUsage, getUsageByCustomerId, linkLsIdentity } from "../src/lib/db";

async function sign(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function send(body: string, headers: Record<string, string> = {}) {
  const sig = await sign(body, "test-webhook-secret");
  const req = new Request("https://api.3nexgen.com/api/webhook/lemonsqueezy", {
    method: "POST",
    body,
    headers: { "X-Signature": sig, "Content-Type": "application/json", ...headers },
  });
  const ctx = createExecutionContext();
  const res = await worker.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

describe("Phase 2 webhook integrity", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM jobs");
    await env.DB.exec("DELETE FROM api_usage");
    await env.DB.exec("DELETE FROM webhook_events");
    await env.DB.exec("DELETE FROM audit_log");
    await env.DB.exec("DELETE FROM id_counter");
    await env.DB.exec("INSERT INTO id_counter (key, value) VALUES ('next_id', 1001)");
  });

  // ── Variant validation ──────────────────────────────────────────────────

  it("rejects order with unknown variant_id when variant map is non-empty", async () => {
    const order = await createOrder(env.DB, {
      tier: 2, display_name: "X", telegram_user_id: "1", email: "a@b.com",
      bot_token: "11:AA", bot_username: "bot_v_unknown",
    });
    const body = JSON.stringify({
      meta: { event_name: "order_created", event_id: "evt_unknown_variant", custom_data: { order_id: order.id } },
      data: { id: "ord_x1", attributes: { first_order_item: { variant_id: "var_DOES_NOT_EXIST" }, total: 39800, currency: "HKD" } },
    });
    const res = await send(body);
    expect(res.status).toBe(400);
    const data = await res.json() as { rejected: string };
    expect(data.rejected).toBe("unknown_variant");
  });

  it("rejects order with mismatched amount", async () => {
    const order = await createOrder(env.DB, {
      tier: 2, display_name: "X", telegram_user_id: "2", email: "b@c.com",
      bot_token: "22:BB", bot_username: "bot_amount_mismatch",
    });
    // var_tier2 = T2 monthly = HKD 398.00 = 39800 cents. Send 30000 (wrong).
    const body = JSON.stringify({
      meta: { event_name: "order_created", event_id: "evt_amount_mismatch", custom_data: { order_id: order.id } },
      data: { id: "ord_x2", attributes: { first_order_item: { variant_id: "var_tier2" }, total: 30000, currency: "HKD" } },
    });
    const res = await send(body);
    expect(res.status).toBe(400);
    const data = await res.json() as { rejected: string };
    expect(data.rejected).toBe("amount_mismatch");
  });

  it("rejects order with wrong currency", async () => {
    const order = await createOrder(env.DB, {
      tier: 1, display_name: "X", telegram_user_id: "3", email: "c@d.com",
      bot_token: "33:CC", bot_username: "bot_currency_mismatch",
    });
    // T1 monthly = HKD 248 = 24800 cents
    const body = JSON.stringify({
      meta: { event_name: "order_created", event_id: "evt_currency_mismatch", custom_data: { order_id: order.id } },
      data: { id: "ord_x3", attributes: { first_order_item: { variant_id: "var_tier1" }, total: 24800, currency: "USD" } },
    });
    const res = await send(body);
    expect(res.status).toBe(400);
    const data = await res.json() as { rejected: string };
    expect(data.rejected).toBe("currency_mismatch");
  });

  it("accepts order with matching variant + amount + currency", async () => {
    const order = await createOrder(env.DB, {
      tier: 2, display_name: "X", telegram_user_id: "4", email: "d@e.com",
      bot_token: "44:DD", bot_username: "bot_match_ok",
    });
    const body = JSON.stringify({
      meta: { event_name: "order_created", event_id: "evt_match_ok", custom_data: { order_id: order.id } },
      data: { id: "ord_x4", attributes: { first_order_item: { variant_id: "var_tier2" }, total: 39800, currency: "HKD" } },
    });
    const res = await send(body);
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; order_id: string };
    expect(data.ok).toBe(true);
    expect(data.order_id).toBe(order.id);
  });

  // ── Idempotency ─────────────────────────────────────────────────────────

  it("dedupes by event_id even when bodies differ", async () => {
    const order = await createOrder(env.DB, {
      tier: 1, display_name: "X", telegram_user_id: "5", email: "e@f.com",
      bot_token: "55:EE", bot_username: "bot_dedup",
    });
    const body1 = JSON.stringify({
      meta: { event_name: "order_created", event_id: "evt_dedup_same", custom_data: { order_id: order.id } },
      data: { id: "ord_dedup1", attributes: { first_order_item: { variant_id: "var_tier1" }, total: 24800, currency: "HKD" } },
    });
    const res1 = await send(body1);
    expect(res1.status).toBe(200);

    // Different body but same event_id → should dedupe
    const body2 = JSON.stringify({
      meta: { event_name: "order_created", event_id: "evt_dedup_same", custom_data: { order_id: order.id } },
      data: { id: "ord_dedup2_DIFFERENT", attributes: { first_order_item: { variant_id: "var_tier1" }, total: 24800, currency: "HKD" } },
    });
    const res2 = await send(body2);
    expect(res2.status).toBe(200);
    const data = await res2.json() as { deduped: boolean; already_confirmed: boolean };
    expect(data.deduped).toBe(true);
    expect(data.already_confirmed).toBe(true);
  });

  it("dedupes via X-Event-Id header", async () => {
    const order = await createOrder(env.DB, {
      tier: 1, display_name: "X", telegram_user_id: "6", email: "f@g.com",
      bot_token: "66:FF", bot_username: "bot_header_dedup",
    });
    const body = JSON.stringify({
      meta: { event_name: "order_created", custom_data: { order_id: order.id } },
      data: { id: "ord_header", attributes: { first_order_item: { variant_id: "var_tier1" }, total: 24800, currency: "HKD" } },
    });
    const res1 = await send(body, { "X-Event-Id": "hdr_evt_123" });
    expect(res1.status).toBe(200);

    const res2 = await send(body, { "X-Event-Id": "hdr_evt_123" });
    expect(res2.status).toBe(200);
    const data = await res2.json() as { deduped: boolean };
    expect(data.deduped).toBe(true);
  });

  // ── Refund handling ─────────────────────────────────────────────────────

  it("zeroes budget + blocks customer on refund", async () => {
    const customer = await createApiUsage(env.DB, {
      customer_id: "1100", gateway_token: "tok_1100_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      tier: 2, monthly_budget_hkd: 70,
    });
    await linkLsIdentity(env.DB, customer.customer_id, { ls_subscription_id: "ls_sub_1100", ls_status: "active" });

    const body = JSON.stringify({
      meta: { event_name: "subscription_payment_refunded", event_id: "evt_refund_1100" },
      data: { id: "ls_sub_1100", attributes: { subscription_id: "ls_sub_1100", refunded_amount: 39800 } },
    });
    const res = await send(body);
    expect(res.status).toBe(200);
    const data = await res.json() as { action: string };
    expect(data.action).toBe("refund_handled");

    const updated = await getUsageByCustomerId(env.DB, customer.customer_id);
    expect(updated?.monthly_budget_hkd).toBe(0);
    expect(updated?.blocked_at).not.toBeNull();
    expect(updated?.ls_status).toBe("refunded");
  });

  // ── Payment failed grace policy ─────────────────────────────────────────

  it("sets payment_failed_at on first fail (Day 0)", async () => {
    const customer = await createApiUsage(env.DB, {
      customer_id: "1101", gateway_token: "tok_1101_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
      tier: 1, monthly_budget_hkd: 40,
    });
    await linkLsIdentity(env.DB, customer.customer_id, { ls_subscription_id: "ls_sub_1101" });

    const body = JSON.stringify({
      meta: { event_name: "subscription_payment_failed", event_id: "evt_fail_day0" },
      data: { id: "ls_sub_1101", attributes: { subscription_id: "ls_sub_1101" } },
    });
    const res = await send(body);
    expect(res.status).toBe(200);
    const data = await res.json() as { day: number; action: string };
    expect(data.day).toBe(0);
    expect(data.action).toBe("alerted_only");

    const updated = await getUsageByCustomerId(env.DB, customer.customer_id);
    expect(updated?.payment_failed_at).not.toBeNull();
    expect(updated?.monthly_budget_hkd).toBe(40); // unchanged on Day 0
  });

  it("clears payment_failed_at on subsequent successful renewal", async () => {
    const customer = await createApiUsage(env.DB, {
      customer_id: "1102", gateway_token: "tok_1102_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
      tier: 1, monthly_budget_hkd: 40,
    });
    await linkLsIdentity(env.DB, customer.customer_id, { ls_subscription_id: "ls_sub_1102" });
    // Pre-set as failing
    await env.DB.prepare("UPDATE api_usage SET payment_failed_at = ? WHERE customer_id = ?")
      .bind(new Date(Date.now() - 2 * 86400_000).toISOString(), customer.customer_id).run();

    const body = JSON.stringify({
      meta: { event_name: "subscription_payment_success", event_id: "evt_renewal_1102" },
      data: { id: "ls_sub_1102", attributes: { subscription_id: "ls_sub_1102" } },
    });
    const res = await send(body);
    expect(res.status).toBe(200);

    const updated = await getUsageByCustomerId(env.DB, customer.customer_id);
    expect(updated?.payment_failed_at).toBeNull();
  });

  // ── Subscription lifecycle by subscription_id (no custom_data) ──────────

  it("handles subscription_cancelled looked up via subscription_id only", async () => {
    const customer = await createApiUsage(env.DB, {
      customer_id: "1103", gateway_token: "tok_1103_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      tier: 2, monthly_budget_hkd: 70,
    });
    await linkLsIdentity(env.DB, customer.customer_id, { ls_subscription_id: "ls_sub_1103", ls_status: "active" });

    // Note: no custom_data.order_id
    const body = JSON.stringify({
      meta: { event_name: "subscription_cancelled", event_id: "evt_cancel_1103" },
      data: { id: "ls_sub_1103", attributes: { subscription_id: "ls_sub_1103", ends_at: "2026-05-28T00:00:00Z" } },
    });
    const res = await send(body);
    expect(res.status).toBe(200);

    const updated = await getUsageByCustomerId(env.DB, customer.customer_id);
    expect(updated?.ls_status).toBe("cancelled");
    expect(updated?.ls_ends_at).toBe("2026-05-28T00:00:00Z");
  });
});
