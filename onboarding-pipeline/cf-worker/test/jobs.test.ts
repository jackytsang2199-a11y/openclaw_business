import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index";

const workerHeaders = {
  "X-Worker-Token": "test-worker-token",
  "Content-Type": "application/json",
};

describe("GET /api/jobs/next", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM jobs");
    await env.DB.exec("DELETE FROM id_counter");
    await env.DB.exec("INSERT INTO id_counter (key, value) VALUES ('next_id', 1043)");
  });

  it("rejects without worker token", async () => {
    const req = new Request("https://api.3nexgen.com/api/jobs/next");
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(401);
  });

  it("returns null when no jobs", async () => {
    const req = new Request("https://api.3nexgen.com/api/jobs/next", {
      headers: workerHeaders,
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as { job: null };
    expect(data.job).toBeNull();
  });

  it("returns and claims oldest ready job", async () => {
    // Seed a job directly — must include bot_token (NOT NULL)
    await env.DB.prepare(
      `INSERT INTO jobs (id, status, job_type, tier, display_name, telegram_user_id, email, payment_method, bot_token, bot_username, created_at, updated_at)
       VALUES ('1043', 'ready', 'deploy', 2, 'Test Bot', '123', 'a@b.com', 'fps', '123:ABC', 'NexGenAI_1043_bot', '2026-03-26T00:00:00Z', '2026-03-26T00:00:00Z')`
    ).run();

    const req = new Request("https://api.3nexgen.com/api/jobs/next", {
      headers: workerHeaders,
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as { job: { id: string; status: string } };
    expect(data.job.id).toBe("1043");
    expect(data.job.status).toBe("provisioning");
  });
});

describe("PATCH /api/jobs/:id", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM jobs");
    await env.DB.prepare(
      `INSERT INTO jobs (id, status, job_type, tier, display_name, telegram_user_id, email, payment_method, bot_token, bot_username, created_at, updated_at)
       VALUES ('1043', 'provisioning', 'deploy', 2, 'Test', '123', 'a@b.com', 'fps', '456:DEF', 'NexGenAI_1043_bot', '2026-03-26T00:00:00Z', '2026-03-26T00:00:00Z')`
    ).run();
  });

  it("updates job status", async () => {
    const req = new Request("https://api.3nexgen.com/api/jobs/1043", {
      method: "PATCH",
      headers: workerHeaders,
      body: JSON.stringify({ status: "installing", server_ip: "5.6.7.8" }),
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as { job: { status: string; server_ip: string } };
    expect(data.job.status).toBe("installing");
    expect(data.job.server_ip).toBe("5.6.7.8");
  });

  it("returns 404 for unknown job", async () => {
    const req = new Request("https://api.3nexgen.com/api/jobs/9999", {
      method: "PATCH",
      headers: workerHeaders,
      body: JSON.stringify({ status: "complete" }),
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(404);
  });
});
