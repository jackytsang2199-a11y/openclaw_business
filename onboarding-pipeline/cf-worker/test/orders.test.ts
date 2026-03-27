import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import worker from "../src/index";

// Mock the Telegram API globally
const mockFetch = vi.fn();

describe("POST /api/orders", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM jobs");
    await env.DB.exec("DELETE FROM id_counter");
    await env.DB.exec("INSERT INTO id_counter (key, value) VALUES ('next_id', 1001)");
    vi.restoreAllMocks();
  });

  it("creates order with valid bot token", async () => {
    // Mock Telegram getMe to return a valid bot
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({
        ok: true,
        result: { id: 12345, is_bot: true, first_name: "Test Bot", username: "test_helper_bot" },
      }))
    ));

    const body = {
      tier: 2,
      display_name: "My AI Helper",
      telegram_user_id: "999888",
      email: "user@test.com",
      bot_token: "12345:FAKE_TOKEN_ABC",
    };
    const req = new Request("https://api.3nexgen.com/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(201);
    const data = await res.json() as { order: { id: string; status: string; bot_username: string } };
    expect(data.order.id).toBe("1001");
    expect(data.order.status).toBe("pending_payment");
    expect(data.order.bot_username).toBe("test_helper_bot");
  });

  it("rejects invalid bot token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, description: "Not Found" }), { status: 404 })
    ));

    const body = {
      tier: 2,
      display_name: "Bad Bot",
      telegram_user_id: "999",
      email: "bad@test.com",
      bot_token: "invalid_token",
    };
    const req = new Request("https://api.3nexgen.com/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("bot token");
  });

  it("rejects duplicate bot token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({
        ok: true,
        result: { id: 12345, is_bot: true, first_name: "Bot", username: "dup_bot" },
      })))
    ));

    const body = {
      tier: 2,
      display_name: "Bot 1",
      telegram_user_id: "111",
      email: "a@b.com",
      bot_token: "12345:SAME_TOKEN",
    };
    const req1 = new Request("https://api.3nexgen.com/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const ctx1 = createExecutionContext();
    await worker.fetch(req1, env, ctx1);
    await waitOnExecutionContext(ctx1);

    const req2 = new Request("https://api.3nexgen.com/api/orders", {
      method: "POST",
      body: JSON.stringify({ ...body, telegram_user_id: "222", email: "c@d.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const ctx2 = createExecutionContext();
    const res2 = await worker.fetch(req2, env, ctx2);
    await waitOnExecutionContext(ctx2);

    expect(res2.status).toBe(409);
  });

  it("rejects missing required fields", async () => {
    const body = { tier: 2, display_name: "Test" }; // missing fields
    const req = new Request("https://api.3nexgen.com/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(400);
  });
});
