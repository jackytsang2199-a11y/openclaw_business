import { Job, VpsInstance } from "./types";

// --- ID generation ---

export async function getNextId(db: D1Database): Promise<string> {
  const row = await db
    .prepare("UPDATE id_counter SET value = value + 1 WHERE key = 'next_id' RETURNING value - 1 AS current")
    .first<{ current: number }>();
  if (!row) throw new Error("id_counter not initialized");
  return String(row.current);
}

// --- Order / Job functions ---

interface CreateOrderParams {
  tier: number;
  display_name: string;
  telegram_user_id: string;
  email: string;
  bot_token: string;
  bot_username: string;
}

export async function createOrder(db: D1Database, params: CreateOrderParams): Promise<Job> {
  const id = await getNextId(db);
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO jobs (id, status, job_type, tier, display_name, telegram_user_id, email, bot_token, bot_username, created_at, updated_at)
       VALUES (?, 'pending_payment', 'deploy', ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, params.tier, params.display_name, params.telegram_user_id, params.email, params.bot_token, params.bot_username, now, now)
    .run();

  return (await getJobById(db, id))!;
}

export async function confirmPayment(db: D1Database, orderId: string, paymentMethod: string): Promise<Job | null> {
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `UPDATE jobs SET status = 'ready', payment_method = ?, updated_at = ?
       WHERE id = ? AND status = 'pending_payment'
       RETURNING *`
    )
    .bind(paymentMethod, now, orderId)
    .first<Job>();
  return row ?? null;
}

export async function getNextJob(db: D1Database): Promise<Job | null> {
  const row = await db
    .prepare(
      `UPDATE jobs SET status = 'provisioning', updated_at = ?
       WHERE id = (SELECT id FROM jobs WHERE status = 'ready' ORDER BY created_at ASC LIMIT 1)
       RETURNING *`
    )
    .bind(new Date().toISOString())
    .first<Job>();
  return row ?? null;
}

export async function getJobById(db: D1Database, id: string): Promise<Job | null> {
  const row = await db.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first<Job>();
  return row ?? null;
}

export async function updateJobStatus(
  db: D1Database,
  id: string,
  status: string,
  extra?: Partial<Pick<Job, "server_ip" | "error_log" | "re_queue_count">>
): Promise<Job> {
  const sets = ["status = ?", "updated_at = ?"];
  const binds: unknown[] = [status, new Date().toISOString()];

  if (extra?.server_ip !== undefined) {
    sets.push("server_ip = ?");
    binds.push(extra.server_ip);
  }
  if (extra?.error_log !== undefined) {
    sets.push("error_log = ?");
    binds.push(extra.error_log);
  }
  if (extra?.re_queue_count !== undefined) {
    sets.push("re_queue_count = ?");
    binds.push(extra.re_queue_count);
  }

  binds.push(id);
  await db.prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();
  return (await getJobById(db, id))!;
}

// --- Health functions ---

export async function updateHealth(db: D1Database, workerId: string = "pi5"): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO health (worker_id, last_ping, alerted) VALUES (?, ?, 0)
       ON CONFLICT(worker_id) DO UPDATE SET last_ping = ?, alerted = 0`
    )
    .bind(workerId, now, now)
    .run();
}

export async function getHealth(db: D1Database, workerId: string = "pi5"): Promise<{ last_ping: string; alerted: number } | null> {
  return db.prepare("SELECT last_ping, alerted FROM health WHERE worker_id = ?").bind(workerId).first();
}

export async function markAlerted(db: D1Database, workerId: string = "pi5"): Promise<void> {
  await db.prepare("UPDATE health SET alerted = 1 WHERE worker_id = ?").bind(workerId).run();
}

// --- VPS instance functions ---

interface CreateVpsParams {
  vps_id: string;
  contabo_contract_id?: string;
  contabo_ip?: string;
  customer_id?: string;
  status: string;
  tier?: number;
  reinstall_count?: number;
  billing_start?: string;
  cancel_date?: string;
  cancel_deadline?: string;
}

export async function createVpsInstance(db: D1Database, params: CreateVpsParams): Promise<VpsInstance> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO vps_instances (vps_id, contabo_contract_id, contabo_ip, customer_id, status, tier, reinstall_count, billing_start, cancel_date, cancel_deadline, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      params.vps_id,
      params.contabo_contract_id ?? null,
      params.contabo_ip ?? null,
      params.customer_id ?? null,
      params.status,
      params.tier ?? null,
      params.reinstall_count ?? 0,
      params.billing_start ?? null,
      params.cancel_date ?? null,
      params.cancel_deadline ?? null,
      now,
      now,
    )
    .run();

  return (await getVpsById(db, params.vps_id))!;
}

export async function getVpsById(db: D1Database, vpsId: string): Promise<VpsInstance | null> {
  return db.prepare("SELECT * FROM vps_instances WHERE vps_id = ?").bind(vpsId).first<VpsInstance>();
}

export async function getRecyclableVps(db: D1Database): Promise<VpsInstance | null> {
  const row = await db
    .prepare("SELECT * FROM vps_instances WHERE status = 'cancelling' ORDER BY cancel_date ASC LIMIT 1")
    .first<VpsInstance>();
  return row ?? null;
}

export async function updateVpsInstance(
  db: D1Database,
  vpsId: string,
  fields: Partial<Omit<VpsInstance, "vps_id" | "created_at" | "updated_at">>
): Promise<VpsInstance | null> {
  const sets: string[] = ["updated_at = ?"];
  const binds: unknown[] = [new Date().toISOString()];

  const allowedFields = ["contabo_contract_id", "contabo_ip", "customer_id", "status", "tier", "reinstall_count", "billing_start", "cancel_date", "cancel_deadline"] as const;

  for (const key of allowedFields) {
    if (key in fields) {
      sets.push(`${key} = ?`);
      binds.push((fields as Record<string, unknown>)[key] ?? null);
    }
  }

  if (sets.length === 1) return await getVpsById(db, vpsId); // nothing to update

  binds.push(vpsId);
  await db.prepare(`UPDATE vps_instances SET ${sets.join(", ")} WHERE vps_id = ?`).bind(...binds).run();
  return await getVpsById(db, vpsId);
}

export async function listVpsByStatus(db: D1Database, status: string): Promise<VpsInstance[]> {
  const { results } = await db
    .prepare("SELECT * FROM vps_instances WHERE status = ? ORDER BY created_at ASC")
    .bind(status)
    .all<VpsInstance>();
  return results;
}
