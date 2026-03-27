import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import worker from "../src/index";
import { createOrder } from "../src/lib/db";

describe("POST /api/confirm/:orderId", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM jobs");
    await env.DB.exec("DELETE FROM id_counter");
    await env.DB.exec("INSERT INTO id_counter (key, value) VALUES ('next_id', 1001)");
  });

  it("confirms payment for pending order", async () => {
    const order = await createOrder(env.DB, {
      tier: 2,
      display_name: "Test",
      telegram_user_id: "123",
      email: "a@b.com",
      bot_token: "123:ABC",
      bot_username: "test_bot",
    });

    const req = new Request(`https://api.3nexgen.com/api/confirm/${order.id}`, {
      method: "POST",
      body: JSON.stringify({ payment_method: "fps" }),
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "test-confirm-key",
      },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(200);
    const data = await res.json() as { order: { id: string; status: string } };
    expect(data.order.status).toBe("ready");
  });

  it("rejects confirm on non-existent order", async () => {
    const req = new Request("https://api.3nexgen.com/api/confirm/9999", {
      method: "POST",
      body: JSON.stringify({ payment_method: "fps" }),
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "test-confirm-key",
      },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(404);
  });

  it("rejects confirm on already-ready order", async () => {
    const order = await createOrder(env.DB, {
      tier: 2,
      display_name: "Test",
      telegram_user_id: "123",
      email: "a@b.com",
      bot_token: "123:ABC",
      bot_username: "test_bot",
    });

    // Confirm once
    const req1 = new Request(`https://api.3nexgen.com/api/confirm/${order.id}`, {
      method: "POST",
      body: JSON.stringify({ payment_method: "fps" }),
      headers: { "Content-Type": "application/json", "X-API-Key": "test-confirm-key" },
    });
    const ctx1 = createExecutionContext();
    await worker.fetch(req1, env, ctx1);
    await waitOnExecutionContext(ctx1);

    // Confirm again
    const req2 = new Request(`https://api.3nexgen.com/api/confirm/${order.id}`, {
      method: "POST",
      body: JSON.stringify({ payment_method: "fps" }),
      headers: { "Content-Type": "application/json", "X-API-Key": "test-confirm-key" },
    });
    const ctx2 = createExecutionContext();
    const res2 = await worker.fetch(req2, env, ctx2);
    await waitOnExecutionContext(ctx2);

    expect(res2.status).toBe(400);
  });

  it("rejects without API key", async () => {
    const req = new Request("https://api.3nexgen.com/api/confirm/1001", {
      method: "POST",
      body: JSON.stringify({ payment_method: "fps" }),
      headers: { "Content-Type": "application/json" },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(401);
  });
});
