import { Job, VpsInstance, ApiUsage } from "./types";

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

export async function listJobsByStatus(db: D1Database, status: string): Promise<Job[]> {
  const { results } = await db
    .prepare("SELECT * FROM jobs WHERE status = ? ORDER BY created_at ASC")
    .bind(status)
    .all<Job>();
  return results ?? [];
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

// ── API Usage ──

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function createApiUsage(
  db: D1Database,
  params: { customer_id: string; gateway_token: string; tier: number; monthly_budget_hkd?: number }
): Promise<ApiUsage> {
  const now = new Date().toISOString();
  const month = currentMonth();
  return db
    .prepare(
      `INSERT INTO api_usage (customer_id, gateway_token, tier, monthly_budget_hkd, current_month, current_spend_hkd, total_requests, total_tokens_in, total_tokens_out, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)
       RETURNING *`
    )
    .bind(params.customer_id, params.gateway_token, params.tier, params.monthly_budget_hkd ?? null, month, now, now)
    .first<ApiUsage>() as Promise<ApiUsage>;
}

export async function getUsageByToken(db: D1Database, token: string): Promise<ApiUsage | null> {
  return db
    .prepare("SELECT * FROM api_usage WHERE gateway_token = ?")
    .bind(token)
    .first<ApiUsage>();
}

export async function getUsageByCustomerId(db: D1Database, customerId: string): Promise<ApiUsage | null> {
  return db
    .prepare("SELECT * FROM api_usage WHERE customer_id = ?")
    .bind(customerId)
    .first<ApiUsage>();
}

export async function listAllUsage(db: D1Database): Promise<ApiUsage[]> {
  const result = await db
    .prepare("SELECT * FROM api_usage ORDER BY customer_id")
    .all<ApiUsage>();
  return result.results;
}

export async function updateUsageSpend(
  db: D1Database,
  customerId: string,
  update: { cost_hkd: number; tokens_in: number; tokens_out: number }
): Promise<ApiUsage> {
  const now = new Date().toISOString();
  return db
    .prepare(
      `UPDATE api_usage SET
         current_spend_hkd = current_spend_hkd + ?,
         total_requests = total_requests + 1,
         total_tokens_in = total_tokens_in + ?,
         total_tokens_out = total_tokens_out + ?,
         updated_at = ?
       WHERE customer_id = ?
       RETURNING *`
    )
    .bind(update.cost_hkd, update.tokens_in, update.tokens_out, now, customerId)
    .first<ApiUsage>() as Promise<ApiUsage>;
}

export async function updateUsageBudget(
  db: D1Database,
  customerId: string,
  budgetHkd: number
): Promise<ApiUsage | null> {
  const now = new Date().toISOString();
  return db
    .prepare(
      "UPDATE api_usage SET monthly_budget_hkd = ?, updated_at = ? WHERE customer_id = ? RETURNING *"
    )
    .bind(budgetHkd, now, customerId)
    .first<ApiUsage>();
}

export async function updateUsageBudgetByTier(
  db: D1Database,
  tier: number,
  budgetHkd: number
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db
    .prepare("UPDATE api_usage SET monthly_budget_hkd = ?, updated_at = ? WHERE tier = ?")
    .bind(budgetHkd, now, tier)
    .run();
  return result.meta.changes;
}

export async function setWarned(db: D1Database, customerId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE api_usage SET warned_at = ?, updated_at = ? WHERE customer_id = ?")
    .bind(now, now, customerId)
    .run();
}

export async function setBlocked(db: D1Database, customerId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE api_usage SET blocked_at = ?, updated_at = ? WHERE customer_id = ?")
    .bind(now, now, customerId)
    .run();
}

export async function resetUsageMonth(
  db: D1Database,
  customerId: string,
  oldMonth: string
): Promise<ApiUsage> {
  // Get current values for history
  const current = await getUsageByCustomerId(db, customerId);
  if (current) {
    await writeUsageHistory(db, {
      customer_id: customerId,
      month: oldMonth,
      spend_hkd: current.current_spend_hkd,
      requests: current.total_requests,
      tokens_in: current.total_tokens_in,
      tokens_out: current.total_tokens_out,
      budget_hkd: current.monthly_budget_hkd,
    });
  }

  const now = new Date().toISOString();
  const month = currentMonth();
  return db
    .prepare(
      `UPDATE api_usage SET
         current_month = ?, current_spend_hkd = 0,
         warned_at = NULL, blocked_at = NULL,
         total_requests = 0, total_tokens_in = 0, total_tokens_out = 0,
         updated_at = ?
       WHERE customer_id = ?
       RETURNING *`
    )
    .bind(month, now, customerId)
    .first<ApiUsage>() as Promise<ApiUsage>;
}

export async function revokeToken(db: D1Database, customerId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE api_usage SET gateway_token = '', updated_at = ? WHERE customer_id = ?")
    .bind(now, customerId)
    .run();
}

export async function rotateToken(
  db: D1Database,
  customerId: string,
  newToken: string
): Promise<ApiUsage | null> {
  const now = new Date().toISOString();
  return db
    .prepare(
      "UPDATE api_usage SET gateway_token = ?, updated_at = ? WHERE customer_id = ? RETURNING *"
    )
    .bind(newToken, now, customerId)
    .first<ApiUsage>();
}

// ── Audit Log ──

export async function writeAuditLog(
  db: D1Database,
  params: { action: string; customer_id: string; details?: string; actor_ip?: string }
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO audit_log (action, customer_id, details, actor_ip, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(params.action, params.customer_id, params.details ?? null, params.actor_ip ?? null, now)
    .run();
}

// ── Usage History ──

export async function writeUsageHistory(
  db: D1Database,
  params: {
    customer_id: string;
    month: string;
    spend_hkd: number;
    requests: number;
    tokens_in: number;
    tokens_out: number;
    budget_hkd: number | null;
  }
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO usage_history (customer_id, month, spend_hkd, requests, tokens_in, tokens_out, budget_hkd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      params.customer_id, params.month, params.spend_hkd,
      params.requests, params.tokens_in, params.tokens_out,
      params.budget_hkd, now
    )
    .run();
}
