import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index";
import { createOrder } from "../src/lib/db";

// Helper: sign a payload with HMAC-SHA256
async function sign(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("POST /api/webhook/lemonsqueezy", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM jobs");
    await env.DB.exec("DELETE FROM id_counter");
    await env.DB.exec("INSERT INTO id_counter (key, value) VALUES ('next_id', 1001)");
  });

  it("rejects unsigned request", async () => {
    const body = JSON.stringify({ meta: { event_name: "order_created" } });
    const req = new Request("https://api.3nexgen.com/api/webhook/lemonsqueezy", {
      method: "POST",
      body,
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(401);
  });

  it("confirms existing order on valid order_created webhook", async () => {
    // First create an order
    const order = await createOrder(env.DB, {
      tier: 2,
      display_name: "My AI",
      telegram_user_id: "340067089",
      email: "user@example.com",
      bot_token: "123:ABC",
      bot_username: "myai_bot",
    });

    const payload = {
      meta: {
        event_name: "order_created",
        custom_data: {
          order_id: order.id,
        },
      },
      data: {
        id: "order_12345",
        attributes: {
          first_order_item: { variant_id: "var_tier2" },
          user_email: "user@example.com",
        },
      },
    };
    const body = JSON.stringify(payload);
    const signature = await sign(body, "test-webhook-secret");
    const req = new Request("https://api.3nexgen.com/api/webhook/lemonsqueezy", {
      method: "POST",
      body,
      headers: { "X-Signature": signature, "Content-Type": "application/json" },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; order_id: string; status: string };
    expect(data.ok).toBe(true);
    expect(data.order_id).toBe(order.id);
    expect(data.status).toBe("ready");
  });

  it("returns warning when no order_id in custom_data", async () => {
    const payload = {
      meta: {
        event_name: "order_created",
        custom_data: {},
      },
      data: {
        id: "order_dup",
        attributes: { first_order_item: { variant_id: "var_tier1" } },
      },
    };
    const body = JSON.stringify(payload);
    const signature = await sign(body, "test-webhook-secret");
    const req = new Request("https://api.3nexgen.com/api/webhook/lemonsqueezy", {
      method: "POST",
      body,
      headers: { "X-Signature": signature, "Content-Type": "application/json" },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as { warning: string };
    expect(data.warning).toContain("No order_id");
  });

  it("returns already_confirmed on duplicate webhook for same order", async () => {
    const order = await createOrder(env.DB, {
      tier: 2,
      display_name: "Bot",
      telegram_user_id: "123",
      email: "b@c.com",
      bot_token: "456:DEF",
      bot_username: "bot_dup",
    });

    const payload = {
      meta: { event_name: "order_created", custom_data: { order_id: order.id } },
      data: { id: "order_dup2", attributes: { first_order_item: { variant_id: "var_tier1" } } },
    };
    const body = JSON.stringify(payload);
    const signature = await sign(body, "test-webhook-secret");
    const makeReq = () =>
      new Request("https://api.3nexgen.com/api/webhook/lemonsqueezy", {
        method: "POST",
        body,
        headers: { "X-Signature": signature, "Content-Type": "application/json" },
      });

    const ctx1 = createExecutionContext();
    await worker.fetch(makeReq(), env, ctx1);
    await waitOnExecutionContext(ctx1);

    const ctx2 = createExecutionContext();
    const res2 = await worker.fetch(makeReq(), env, ctx2);
    await waitOnExecutionContext(ctx2);
    expect(res2.status).toBe(200);
    const data = await res2.json() as { ok: boolean; already_confirmed: boolean };
    expect(data.ok).toBe(true);
    expect(data.already_confirmed).toBe(true);
  });
});
