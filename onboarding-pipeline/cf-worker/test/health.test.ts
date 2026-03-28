import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index";

const workerHeaders = {
  "X-Worker-Token": "test-worker-token",
  "Content-Type": "application/json",
};

describe("POST /api/health", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM health");
  });

  it("rejects without worker token", async () => {
    const req = new Request("https://api.3nexgen.com/api/health", {
      method: "POST",
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(401);
  });

  it("records health ping", async () => {
    const req = new Request("https://api.3nexgen.com/api/health", {
      method: "POST",
      headers: workerHeaders,
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(true);

    // Verify stored in DB
    const row = await env.DB.prepare("SELECT * FROM health WHERE worker_id = 'pi5'").first();
    expect(row).not.toBeNull();
  });
});
