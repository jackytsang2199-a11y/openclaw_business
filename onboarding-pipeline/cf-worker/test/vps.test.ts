import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index";

const workerHeaders = {
  "X-Worker-Token": "test-worker-token",
  "Content-Type": "application/json",
};

describe("VPS Recycling Endpoints", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM vps_instances");
  });

  it("POST /api/vps creates instance", async () => {
    const req = new Request("https://api.3nexgen.com/api/vps", {
      method: "POST",
      body: JSON.stringify({
        vps_id: "vps-001",
        contabo_contract_id: "ct-001",
        contabo_ip: "1.2.3.4",
        customer_id: "1001",
        status: "provisioning",
        tier: 2,
      }),
      headers: workerHeaders,
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(201);
    const data = await res.json() as { vps: { vps_id: string; status: string } };
    expect(data.vps.vps_id).toBe("vps-001");
    expect(data.vps.status).toBe("provisioning");
  });

  it("GET /api/vps/recyclable returns oldest cancelling", async () => {
    // Create two cancelling VPSes
    for (const [id, ip, date] of [
      ["vps-new", "2.2.2.2", "2026-03-28T00:00:00Z"],
      ["vps-old", "1.1.1.1", "2026-03-27T00:00:00Z"],
    ]) {
      const req = new Request("https://api.3nexgen.com/api/vps", {
        method: "POST",
        body: JSON.stringify({ vps_id: id, contabo_ip: ip, status: "cancelling", cancel_date: date }),
        headers: workerHeaders,
      });
      const ctx = createExecutionContext();
      await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
    }

    const req = new Request("https://api.3nexgen.com/api/vps/recyclable", {
      method: "GET",
      headers: { "X-Worker-Token": "test-worker-token" },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(200);
    const data = await res.json() as { vps: { vps_id: string } };
    expect(data.vps.vps_id).toBe("vps-old");
  });

  it("GET /api/vps/recyclable returns null when none available", async () => {
    const req = new Request("https://api.3nexgen.com/api/vps/recyclable", {
      method: "GET",
      headers: { "X-Worker-Token": "test-worker-token" },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(200);
    const data = await res.json() as { vps: null };
    expect(data.vps).toBeNull();
  });

  it("PATCH /api/vps/:id updates fields", async () => {
    // Create first
    const createReq = new Request("https://api.3nexgen.com/api/vps", {
      method: "POST",
      body: JSON.stringify({ vps_id: "vps-001", contabo_ip: "1.2.3.4", status: "active", customer_id: "1001" }),
      headers: workerHeaders,
    });
    const createCtx = createExecutionContext();
    await worker.fetch(createReq, env, createCtx);
    await waitOnExecutionContext(createCtx);

    // Update
    const req = new Request("https://api.3nexgen.com/api/vps/vps-001", {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelling", customer_id: null }),
      headers: workerHeaders,
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(200);
    const data = await res.json() as { vps: { status: string; customer_id: null } };
    expect(data.vps.status).toBe("cancelling");
    expect(data.vps.customer_id).toBeNull();
  });

  it("GET /api/vps?status=active lists filtered", async () => {
    for (const [id, status] of [["v1", "active"], ["v2", "active"], ["v3", "cancelling"]]) {
      const req = new Request("https://api.3nexgen.com/api/vps", {
        method: "POST",
        body: JSON.stringify({ vps_id: id, status, contabo_ip: `${id}.0.0.1` }),
        headers: workerHeaders,
      });
      const ctx = createExecutionContext();
      await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
    }

    const req = new Request("https://api.3nexgen.com/api/vps?status=active", {
      method: "GET",
      headers: { "X-Worker-Token": "test-worker-token" },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(200);
    const data = await res.json() as { vps_list: Array<{ vps_id: string }> };
    expect(data.vps_list).toHaveLength(2);
  });

  it("rejects VPS endpoints without worker token", async () => {
    const req = new Request("https://api.3nexgen.com/api/vps/recyclable", {
      method: "GET",
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(401);
  });
});
