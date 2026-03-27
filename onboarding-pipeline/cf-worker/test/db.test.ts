import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import {
  createOrder,
  getJobById,
  getNextJob,
  updateJobStatus,
  confirmPayment,
  getRecyclableVps,
  createVpsInstance,
  updateVpsInstance,
  listVpsByStatus,
} from "../src/lib/db";

describe("Order DB functions", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM jobs");
    await env.DB.exec("DELETE FROM id_counter");
    await env.DB.exec("INSERT INTO id_counter (key, value) VALUES ('next_id', 1001)");
  });

  it("createOrder inserts job with pending_payment status", async () => {
    const job = await createOrder(env.DB, {
      tier: 2,
      display_name: "Test Bot",
      telegram_user_id: "123456",
      email: "test@test.com",
      bot_token: "123:ABC",
      bot_username: "test_bot",
    });
    expect(job.id).toBe("1001");
    expect(job.status).toBe("pending_payment");
    expect(job.bot_token).toBe("123:ABC");
    expect(job.bot_username).toBe("test_bot");
  });

  it("createOrder generates sequential IDs without T prefix", async () => {
    const job1 = await createOrder(env.DB, {
      tier: 1,
      display_name: "Bot 1",
      telegram_user_id: "111",
      email: "a@b.com",
      bot_token: "111:AAA",
      bot_username: "bot1_bot",
    });
    const job2 = await createOrder(env.DB, {
      tier: 2,
      display_name: "Bot 2",
      telegram_user_id: "222",
      email: "c@d.com",
      bot_token: "222:BBB",
      bot_username: "bot2_bot",
    });
    expect(job1.id).toBe("1001");
    expect(job2.id).toBe("1002");
  });

  it("createOrder rejects duplicate bot_token", async () => {
    await createOrder(env.DB, {
      tier: 2,
      display_name: "Bot 1",
      telegram_user_id: "111",
      email: "a@b.com",
      bot_token: "same:TOKEN",
      bot_username: "same_bot",
    });
    await expect(
      createOrder(env.DB, {
        tier: 2,
        display_name: "Bot 2",
        telegram_user_id: "222",
        email: "c@d.com",
        bot_token: "same:TOKEN",
        bot_username: "same_bot",
      })
    ).rejects.toThrow();
  });

  it("confirmPayment flips pending_payment to ready", async () => {
    const order = await createOrder(env.DB, {
      tier: 2,
      display_name: "Test",
      telegram_user_id: "123",
      email: "a@b.com",
      bot_token: "123:ABC",
      bot_username: "test_bot",
    });
    const confirmed = await confirmPayment(env.DB, order.id, "fps");
    expect(confirmed).not.toBeNull();
    expect(confirmed!.status).toBe("ready");
    expect(confirmed!.payment_method).toBe("fps");
  });

  it("confirmPayment returns null for non-pending_payment job", async () => {
    const order = await createOrder(env.DB, {
      tier: 2,
      display_name: "Test",
      telegram_user_id: "123",
      email: "a@b.com",
      bot_token: "123:ABC",
      bot_username: "test_bot",
    });
    await confirmPayment(env.DB, order.id, "fps"); // now ready
    const result = await confirmPayment(env.DB, order.id, "fps"); // already ready
    expect(result).toBeNull();
  });

  it("getNextJob only picks up ready jobs, not pending_payment", async () => {
    await createOrder(env.DB, {
      tier: 1,
      display_name: "Pending",
      telegram_user_id: "111",
      email: "a@b.com",
      bot_token: "111:AAA",
      bot_username: "pending_bot",
    });
    const job = await getNextJob(env.DB);
    expect(job).toBeNull(); // pending_payment, not ready
  });
});

describe("VPS DB functions", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM vps_instances");
  });

  it("createVpsInstance inserts a record", async () => {
    const vps = await createVpsInstance(env.DB, {
      vps_id: "vps-001",
      contabo_contract_id: "ct-001",
      contabo_ip: "1.2.3.4",
      customer_id: "1001",
      status: "provisioning",
      tier: 2,
    });
    expect(vps.vps_id).toBe("vps-001");
    expect(vps.status).toBe("provisioning");
    expect(vps.contabo_ip).toBe("1.2.3.4");
  });

  it("getRecyclableVps returns oldest cancelling VPS", async () => {
    await createVpsInstance(env.DB, {
      vps_id: "vps-new",
      status: "cancelling",
      contabo_ip: "2.2.2.2",
      cancel_date: "2026-03-28T00:00:00Z",
    });
    await createVpsInstance(env.DB, {
      vps_id: "vps-old",
      status: "cancelling",
      contabo_ip: "1.1.1.1",
      cancel_date: "2026-03-27T00:00:00Z",
    });
    const vps = await getRecyclableVps(env.DB);
    expect(vps).not.toBeNull();
    expect(vps!.vps_id).toBe("vps-old"); // oldest first
  });

  it("getRecyclableVps returns null when no cancelling VPS", async () => {
    await createVpsInstance(env.DB, {
      vps_id: "vps-active",
      status: "active",
      contabo_ip: "1.1.1.1",
    });
    const vps = await getRecyclableVps(env.DB);
    expect(vps).toBeNull();
  });

  it("updateVpsInstance updates specified fields", async () => {
    await createVpsInstance(env.DB, {
      vps_id: "vps-001",
      status: "active",
      contabo_ip: "1.2.3.4",
      customer_id: "1001",
      tier: 2,
    });
    const updated = await updateVpsInstance(env.DB, "vps-001", {
      status: "cancelling",
      customer_id: null,
      cancel_date: "2026-03-27T00:00:00Z",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("cancelling");
    expect(updated!.customer_id).toBeNull();
  });

  it("listVpsByStatus filters correctly", async () => {
    await createVpsInstance(env.DB, { vps_id: "v1", status: "active", contabo_ip: "1.1.1.1" });
    await createVpsInstance(env.DB, { vps_id: "v2", status: "active", contabo_ip: "2.2.2.2" });
    await createVpsInstance(env.DB, { vps_id: "v3", status: "cancelling", contabo_ip: "3.3.3.3" });
    const active = await listVpsByStatus(env.DB, "active");
    expect(active).toHaveLength(2);
  });
});
