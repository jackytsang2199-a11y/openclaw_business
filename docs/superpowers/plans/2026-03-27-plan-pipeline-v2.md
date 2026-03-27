# Pipeline V2: Customer-Created Bots & VPS Recycling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pre-created bot pool with customer-provided Telegram bots, add VPS recycling endpoints to the CF Worker, and decouple order submission from payment confirmation.

**Architecture:** Modify the existing CF Worker (TypeScript, Cloudflare D1) to add a public order endpoint with Telegram bot validation, payment confirmation flow, and VPS lifecycle CRUD. Modify the Pi5 worker (Python) to remove bot pool dependency and read bot tokens from job data. Output website content as markdown spec only.

**Tech Stack:** TypeScript (CF Worker, Vitest), Python (Pi5 worker, pytest), Cloudflare D1 (SQLite), Wrangler CLI

**Spec:** `docs/superpowers/specs/2026-03-27-pipeline-v2-bot-and-recycling-design.md`

---

## File Structure

### CF Worker (`onboarding-pipeline/cf-worker/`)

| File | Action | Responsibility |
|------|--------|---------------|
| `schema.sql` | Modify | Updated jobs table + new vps_instances table |
| `src/lib/types.ts` | Modify | Job interface (bot_token, pending_payment), VpsInstance interface |
| `src/lib/db.ts` | Modify | createOrder, confirmPayment, VPS CRUD functions |
| `src/lib/telegram.ts` | Create | validateBotToken() — calls Telegram getMe API |
| `src/handlers/orders.ts` | Create | POST /api/orders — public order submission |
| `src/handlers/vps.ts` | Create | VPS recycling endpoints (4 routes) |
| `src/handlers/confirm.ts` | Modify | Payment confirm only (no job creation) |
| `src/handlers/webhook.ts` | Modify | Match order_id from custom_data |
| `src/handlers/jobs.ts` | Modify | Add pending_payment to valid statuses |
| `src/index.ts` | Modify | Add new routes |
| `test/setup.ts` | Modify | Updated schema + vps_instances table |
| `test/db.test.ts` | Modify | Tests for new DB functions |
| `test/orders.test.ts` | Create | Order submission + bot validation tests |
| `test/vps.test.ts` | Create | VPS recycling endpoint tests |
| `test/confirm.test.ts` | Modify | Payment confirm tests (no job creation) |

### Pi5 Worker (`onboarding-pipeline/pi5-worker/`)

| File | Action | Responsibility |
|------|--------|---------------|
| `bot_pool.py` | Delete | No longer needed |
| `tests/test_bot_pool.py` | Delete | No longer needed |
| `scripts/bot-pool-status.sh` | Delete | No longer needed |
| `deployer.py` | Modify | Remove BotPool, read bot from job |
| `worker.py` | Modify | Remove BotPool init |
| `config.py` | Modify | Remove pool config |
| `tests/test_deployer.py` | Modify | Update tests for new flow |

### Website Content (markdown only)

| File | Action | Responsibility |
|------|--------|---------------|
| `website-lovable/content/botfather-tutorial.md` | Create | BotFather tutorial in 香港書面語 |
| `website-lovable/content/order-form-spec.md` | Create | Order form fields + API integration spec |

---

## Task 1: Update D1 Schema

**Files:**
- Modify: `onboarding-pipeline/cf-worker/schema.sql`
- Modify: `onboarding-pipeline/cf-worker/test/setup.ts`

- [ ] **Step 1: Update schema.sql with new jobs table and vps_instances table**

```sql
-- Job queue for customer onboarding pipeline
-- V2: customer-created bots, pending_payment status, plain numeric IDs
DROP TABLE IF EXISTS jobs;
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,                          -- 1001, 1002, ...
  status TEXT NOT NULL DEFAULT 'pending_payment',
  job_type TEXT NOT NULL DEFAULT 'deploy',
  tier INTEGER NOT NULL,
  target_tier INTEGER,
  display_name TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  payment_method TEXT,                          -- lemon_squeezy | fps | payme
  bot_token TEXT NOT NULL,
  bot_username TEXT NOT NULL,                   -- from getMe validation
  server_ip TEXT,
  error_log TEXT,
  re_queue_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Auto-incrementing ID counter starting at 1001
DROP TABLE IF EXISTS id_counter;
CREATE TABLE IF NOT EXISTS id_counter (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT OR IGNORE INTO id_counter (key, value) VALUES ('next_id', 1001);

-- Pi5 health tracking
DROP TABLE IF EXISTS health;
CREATE TABLE IF NOT EXISTS health (
  worker_id TEXT PRIMARY KEY DEFAULT 'pi5',
  last_ping TEXT NOT NULL,
  alerted INTEGER DEFAULT 0
);

-- VPS instance tracking for recycling pool
CREATE TABLE IF NOT EXISTS vps_instances (
  vps_id TEXT PRIMARY KEY,
  contabo_contract_id TEXT,
  contabo_ip TEXT,
  customer_id TEXT,                             -- order_id, nullable (NULL when recyclable)
  status TEXT NOT NULL,                         -- provisioning | active | cancelling | expired
  tier INTEGER,
  reinstall_count INTEGER DEFAULT 0,
  billing_start TEXT,
  cancel_date TEXT,
  cancel_deadline TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 2: Update test/setup.ts to match new schema**

Replace the entire file:

```typescript
import { env } from "cloudflare:test";

// Apply D1 schema before all tests — each statement must be separate
await env.DB.exec("DROP TABLE IF EXISTS jobs");
await env.DB.exec("CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'pending_payment', job_type TEXT NOT NULL DEFAULT 'deploy', tier INTEGER NOT NULL, target_tier INTEGER, display_name TEXT NOT NULL, telegram_user_id TEXT NOT NULL, email TEXT NOT NULL, payment_method TEXT, bot_token TEXT NOT NULL, bot_username TEXT NOT NULL, server_ip TEXT, error_log TEXT, re_queue_count INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");

await env.DB.exec("DROP TABLE IF EXISTS id_counter");
await env.DB.exec("CREATE TABLE IF NOT EXISTS id_counter (key TEXT PRIMARY KEY, value INTEGER NOT NULL)");
await env.DB.exec("INSERT OR IGNORE INTO id_counter (key, value) VALUES ('next_id', 1001)");

await env.DB.exec("DROP TABLE IF EXISTS health");
await env.DB.exec("CREATE TABLE IF NOT EXISTS health (worker_id TEXT PRIMARY KEY DEFAULT 'pi5', last_ping TEXT NOT NULL, alerted INTEGER DEFAULT 0)");

await env.DB.exec("DROP TABLE IF EXISTS vps_instances");
await env.DB.exec("CREATE TABLE IF NOT EXISTS vps_instances (vps_id TEXT PRIMARY KEY, contabo_contract_id TEXT, contabo_ip TEXT, customer_id TEXT, status TEXT NOT NULL, tier INTEGER, reinstall_count INTEGER DEFAULT 0, billing_start TEXT, cancel_date TEXT, cancel_deadline TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
```

- [ ] **Step 3: Verify schema loads locally**

Run:
```bash
cd onboarding-pipeline/cf-worker
npm run db:init
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add onboarding-pipeline/cf-worker/schema.sql onboarding-pipeline/cf-worker/test/setup.ts
git commit -m "feat: update D1 schema for Pipeline V2 (customer bots + VPS recycling)"
```

---

## Task 2: Update Types and Auth

**Files:**
- Modify: `onboarding-pipeline/cf-worker/src/lib/types.ts`
- Modify: `onboarding-pipeline/cf-worker/src/lib/auth.ts`

- [ ] **Step 1: Update types.ts**

Replace the entire file:

```typescript
export interface Env {
  DB: D1Database;
  LEMONSQUEEZY_WEBHOOK_SECRET: string;
  WORKER_TOKEN: string;
  CONFIRM_API_KEY: string;
  OWNER_TELEGRAM_BOT_TOKEN: string;
  OWNER_TELEGRAM_CHAT_ID: string;
  VARIANT_TIER_MAP: string;
}

export interface Job {
  id: string;
  status: string;
  job_type: string;
  tier: number;
  target_tier: number | null;
  display_name: string;
  telegram_user_id: string;
  email: string;
  payment_method: string | null;
  bot_token: string;
  bot_username: string;
  server_ip: string | null;
  error_log: string | null;
  re_queue_count: number;
  created_at: string;
  updated_at: string;
}

export interface VpsInstance {
  vps_id: string;
  contabo_contract_id: string | null;
  contabo_ip: string | null;
  customer_id: string | null;
  status: string;
  tier: number | null;
  reinstall_count: number;
  billing_start: string | null;
  cancel_date: string | null;
  cancel_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export type JobStatus = "pending_payment" | "ready" | "provisioning" | "installing" | "qa" | "complete" | "failed" | "stale";
export type JobType = "deploy" | "upgrade" | "downgrade" | "cancel" | "delete" | "reactivate";
export type PaymentMethod = "lemon_squeezy" | "fps" | "payme";
export type VpsStatus = "provisioning" | "active" | "cancelling" | "expired";
```

- [ ] **Step 2: Add conflict() helper to auth.ts**

Add this function at the end of `onboarding-pipeline/cf-worker/src/lib/auth.ts`:

```typescript
export function conflict(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 409,
    headers: { "Content-Type": "application/json" },
  });
}

export function notFound(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/lib/types.ts onboarding-pipeline/cf-worker/src/lib/auth.ts
git commit -m "feat: add VpsInstance type, pending_payment status, conflict/notFound helpers"
```

---

## Task 3: Telegram Bot Validation

**Files:**
- Create: `onboarding-pipeline/cf-worker/src/lib/telegram.ts`

- [ ] **Step 1: Create telegram.ts**

```typescript
interface GetMeResponse {
  ok: boolean;
  result?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  };
  description?: string;
}

export interface BotInfo {
  bot_id: number;
  username: string;
  first_name: string;
}

export async function validateBotToken(token: string): Promise<BotInfo | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data: GetMeResponse = await res.json();
    if (!data.ok || !data.result?.is_bot || !data.result.username) {
      return null;
    }

    return {
      bot_id: data.result.id,
      username: data.result.username,
      first_name: data.result.first_name,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/lib/telegram.ts
git commit -m "feat: add Telegram bot token validation via getMe API"
```

---

## Task 4: Update DB Functions

**Files:**
- Modify: `onboarding-pipeline/cf-worker/src/lib/db.ts`
- Modify: `onboarding-pipeline/cf-worker/test/db.test.ts`

- [ ] **Step 1: Write failing tests for new DB functions**

Replace the entire `test/db.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd onboarding-pipeline/cf-worker
npx vitest run test/db.test.ts
```
Expected: FAIL — functions not exported from db.ts yet

- [ ] **Step 3: Implement new DB functions**

Replace the entire `src/lib/db.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd onboarding-pipeline/cf-worker
npx vitest run test/db.test.ts
```
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/lib/db.ts onboarding-pipeline/cf-worker/test/db.test.ts
git commit -m "feat: add order/VPS DB functions with pending_payment flow"
```

---

## Task 5: Order Submission Handler

**Files:**
- Create: `onboarding-pipeline/cf-worker/src/handlers/orders.ts`
- Create: `onboarding-pipeline/cf-worker/test/orders.test.ts`

- [ ] **Step 1: Write failing tests for order submission**

Create `test/orders.test.ts`:

```typescript
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        ok: true,
        result: { id: 12345, is_bot: true, first_name: "Bot", username: "dup_bot" },
      }))
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd onboarding-pipeline/cf-worker
npx vitest run test/orders.test.ts
```
Expected: FAIL — handler not wired up yet

- [ ] **Step 3: Create orders.ts handler**

Create `src/handlers/orders.ts`:

```typescript
import { Env } from "../lib/types";
import { badRequest, conflict, json } from "../lib/auth";
import { createOrder } from "../lib/db";
import { validateBotToken } from "../lib/telegram";

interface OrderRequest {
  tier: number;
  display_name: string;
  telegram_user_id: string;
  email: string;
  bot_token: string;
}

export async function handleCreateOrder(request: Request, env: Env): Promise<Response> {
  let body: OrderRequest;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  // Validate required fields
  const required = ["tier", "display_name", "telegram_user_id", "email", "bot_token"] as const;
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return badRequest(`Missing required field: ${field}`);
    }
  }

  if (![1, 2, 3].includes(body.tier)) {
    return badRequest("tier must be 1, 2, or 3");
  }

  // Validate bot token via Telegram API
  const botInfo = await validateBotToken(body.bot_token);
  if (!botInfo) {
    return badRequest("Invalid bot token — could not verify via Telegram API");
  }

  // Create order (D1 unique constraint on bot_token catches duplicates)
  try {
    const order = await createOrder(env.DB, {
      tier: body.tier,
      display_name: body.display_name,
      telegram_user_id: body.telegram_user_id,
      email: body.email,
      bot_token: body.bot_token,
      bot_username: botInfo.username,
    });

    return json({ order: { id: order.id, status: order.status, bot_username: order.bot_username, tier: order.tier } }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UNIQUE constraint")) {
      return conflict("This bot token is already associated with an existing order");
    }
    throw err;
  }
}
```

- [ ] **Step 4: Wire up the route in index.ts**

Add to `src/index.ts` — add the import at the top:

```typescript
import { handleCreateOrder } from "./handlers/orders";
```

Add the route before the catch-all:

```typescript
    // Route: Order submission (public — no auth)
    if (method === "POST" && path === "/api/orders") {
      return handleCreateOrder(request, env);
    }
```

Update the catch-all endpoints list to include `"POST /api/orders"`.

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
cd onboarding-pipeline/cf-worker
npx vitest run test/orders.test.ts
```
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/handlers/orders.ts onboarding-pipeline/cf-worker/test/orders.test.ts onboarding-pipeline/cf-worker/src/index.ts
git commit -m "feat: add POST /api/orders with Telegram bot validation"
```

---

## Task 6: Update Confirm and Webhook Handlers

**Files:**
- Modify: `onboarding-pipeline/cf-worker/src/handlers/confirm.ts`
- Modify: `onboarding-pipeline/cf-worker/src/handlers/webhook.ts`
- Modify: `onboarding-pipeline/cf-worker/src/handlers/jobs.ts`
- Modify: `onboarding-pipeline/cf-worker/test/confirm.test.ts`

- [ ] **Step 1: Rewrite confirm.ts — payment confirmation only**

Replace the entire file:

```typescript
import { Env } from "../lib/types";
import { verifyConfirmApiKey, unauthorized, badRequest, notFound, json } from "../lib/auth";
import { confirmPayment, getJobById } from "../lib/db";

interface ConfirmRequest {
  payment_method: string;
  amount_hkd?: number;
  reference?: string;
}

export async function handleConfirm(request: Request, env: Env, orderId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) {
    return unauthorized("Invalid API key");
  }

  const existing = await getJobById(env.DB, orderId);
  if (!existing) {
    return notFound("Order not found");
  }

  let body: ConfirmRequest;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.payment_method) {
    return badRequest("Missing required field: payment_method");
  }

  if (!["fps", "payme", "lemon_squeezy"].includes(body.payment_method)) {
    return badRequest("payment_method must be fps, payme, or lemon_squeezy");
  }

  const confirmed = await confirmPayment(env.DB, orderId, body.payment_method);
  if (!confirmed) {
    return badRequest(`Order ${orderId} is not in pending_payment status (current: ${existing.status})`);
  }

  return json({ order: { id: confirmed.id, status: confirmed.status } });
}
```

- [ ] **Step 2: Rewrite webhook.ts — match existing order by custom_data.order_id**

Replace the entire file:

```typescript
import { Env } from "../lib/types";
import { verifyLemonSqueezySignature } from "../lib/hmac";
import { confirmPayment, getJobById } from "../lib/db";
import { unauthorized, badRequest, json } from "../lib/auth";

interface LemonSqueezyWebhook {
  meta: {
    event_name: string;
    custom_data?: {
      order_id?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      first_order_item?: {
        variant_id?: string;
      };
      user_email?: string;
    };
  };
}

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  const signature = request.headers.get("X-Signature") ?? "";

  if (!await verifyLemonSqueezySignature(body, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET)) {
    return unauthorized("Invalid webhook signature");
  }

  let payload: LemonSqueezyWebhook;
  try {
    payload = JSON.parse(body);
  } catch {
    return badRequest("Invalid JSON body");
  }

  // Only process order_created events
  if (payload.meta.event_name !== "order_created") {
    return json({ ignored: true, event: payload.meta.event_name });
  }

  // Match order by custom_data.order_id
  const orderId = payload.meta.custom_data?.order_id;
  if (!orderId) {
    console.log("[webhook] Lemon Squeezy payment received without order_id in custom_data — manual investigation needed");
    return json({ warning: "No order_id in custom_data — payment received but not matched" });
  }

  const existing = await getJobById(env.DB, orderId);
  if (!existing) {
    console.log(`[webhook] Order ${orderId} not found in D1 — payment received but order missing`);
    return json({ warning: `Order ${orderId} not found` });
  }

  const confirmed = await confirmPayment(env.DB, orderId, "lemon_squeezy");
  if (!confirmed) {
    // Already confirmed — idempotent, no error
    return json({ ok: true, already_confirmed: true });
  }

  return json({ ok: true, order_id: confirmed.id, status: confirmed.status });
}
```

- [ ] **Step 3: Update jobs.ts — add pending_payment to valid statuses**

In `src/handlers/jobs.ts`, change line 31:

```typescript
  const validStatuses = ["pending_payment", "ready", "provisioning", "installing", "qa", "complete", "failed", "stale"];
```

- [ ] **Step 4: Update index.ts — change confirm route to accept orderId**

In `src/index.ts`, replace the confirm route:

```typescript
    // Route: Manual payment confirm (admin only)
    const confirmMatch = path.match(/^\/api\/confirm\/(\d+)$/);
    if (method === "POST" && confirmMatch) {
      return handleConfirm(request, env, confirmMatch[1]);
    }
```

Update the import to use the new signature (it now takes orderId as third param — already done in the handler).

Also update the job route regex to accept plain numbers instead of T-prefixed:

```typescript
    // Route: Pi5 updates job status
    const jobMatch = path.match(/^\/api\/jobs\/(\d+)$/);
    if (method === "PATCH" && jobMatch) {
      return handleUpdateJob(request, env, jobMatch[1]);
    }
```

Update the catch-all endpoints list:

```typescript
    return json({ error: "Not found", endpoints: [
      "POST /api/orders",
      "POST /api/webhook/lemonsqueezy",
      "POST /api/confirm/:orderId",
      "GET  /api/jobs/next",
      "PATCH /api/jobs/:id",
      "POST /api/health",
      "GET  /api/vps/recyclable",
      "POST /api/vps",
      "PATCH /api/vps/:id",
      "GET  /api/vps?status=:status",
    ]}, 404);
```

- [ ] **Step 5: Rewrite confirm.test.ts**

Replace the entire file:

```typescript
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
```

- [ ] **Step 6: Run all tests**

Run:
```bash
cd onboarding-pipeline/cf-worker
npx vitest run
```
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/handlers/confirm.ts onboarding-pipeline/cf-worker/src/handlers/webhook.ts onboarding-pipeline/cf-worker/src/handlers/jobs.ts onboarding-pipeline/cf-worker/src/index.ts onboarding-pipeline/cf-worker/test/confirm.test.ts
git commit -m "feat: decouple order from payment — confirm flips pending_payment to ready"
```

---

## Task 7: VPS Recycling Endpoints

**Files:**
- Create: `onboarding-pipeline/cf-worker/src/handlers/vps.ts`
- Create: `onboarding-pipeline/cf-worker/test/vps.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/vps.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd onboarding-pipeline/cf-worker
npx vitest run test/vps.test.ts
```
Expected: FAIL — handler not created yet

- [ ] **Step 3: Create vps.ts handler**

Create `src/handlers/vps.ts`:

```typescript
import { Env } from "../lib/types";
import { verifyWorkerToken, unauthorized, badRequest, notFound, json } from "../lib/auth";
import { getRecyclableVps, createVpsInstance, updateVpsInstance, listVpsByStatus, getVpsById } from "../lib/db";

export async function handleGetRecyclableVps(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  const vps = await getRecyclableVps(env.DB);
  return json({ vps });
}

export async function handleCreateVps(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.vps_id || !body.status) {
    return badRequest("Missing required fields: vps_id, status");
  }

  try {
    const vps = await createVpsInstance(env.DB, {
      vps_id: body.vps_id as string,
      contabo_contract_id: (body.contabo_contract_id as string) ?? undefined,
      contabo_ip: (body.contabo_ip as string) ?? undefined,
      customer_id: (body.customer_id as string) ?? undefined,
      status: body.status as string,
      tier: (body.tier as number) ?? undefined,
      reinstall_count: (body.reinstall_count as number) ?? undefined,
      billing_start: (body.billing_start as string) ?? undefined,
      cancel_date: (body.cancel_date as string) ?? undefined,
      cancel_deadline: (body.cancel_deadline as string) ?? undefined,
    });
    return json({ vps }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UNIQUE constraint")) {
      return json({ error: "VPS instance already exists" }, 409);
    }
    throw err;
  }
}

export async function handleUpdateVps(request: Request, env: Env, vpsId: string): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  const existing = await getVpsById(env.DB, vpsId);
  if (!existing) {
    return notFound("VPS instance not found");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const vps = await updateVpsInstance(env.DB, vpsId, body);
  return json({ vps });
}

export async function handleListVps(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  if (!status) {
    return badRequest("Missing required query param: status");
  }

  const vpsList = await listVpsByStatus(env.DB, status);
  return json({ vps_list: vpsList });
}
```

- [ ] **Step 4: Wire up VPS routes in index.ts**

Add import at top of `src/index.ts`:

```typescript
import { handleGetRecyclableVps, handleCreateVps, handleUpdateVps, handleListVps } from "./handlers/vps";
```

Add routes before the catch-all:

```typescript
    // Route: VPS recyclable check
    if (method === "GET" && path === "/api/vps/recyclable") {
      return handleGetRecyclableVps(request, env);
    }

    // Route: VPS list by status
    if (method === "GET" && path === "/api/vps") {
      return handleListVps(request, env);
    }

    // Route: VPS create
    if (method === "POST" && path === "/api/vps") {
      return handleCreateVps(request, env);
    }

    // Route: VPS update
    const vpsMatch = path.match(/^\/api\/vps\/(.+)$/);
    if (method === "PATCH" && vpsMatch) {
      return handleUpdateVps(request, env, vpsMatch[1]);
    }
```

**Important:** The VPS routes must be ordered carefully — `/api/vps/recyclable` must come before `/api/vps/:id` to avoid the regex matching "recyclable" as a VPS ID.

- [ ] **Step 5: Run all tests**

Run:
```bash
cd onboarding-pipeline/cf-worker
npx vitest run
```
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/handlers/vps.ts onboarding-pipeline/cf-worker/test/vps.test.ts onboarding-pipeline/cf-worker/src/index.ts
git commit -m "feat: add VPS recycling endpoints (recyclable, create, update, list)"
```

---

## Task 8: Deploy CF Worker

**Files:**
- No file changes — deployment only

- [ ] **Step 1: Run full test suite**

```bash
cd onboarding-pipeline/cf-worker
npx vitest run
```
Expected: ALL PASS

- [ ] **Step 2: Apply schema to remote D1**

```bash
cd onboarding-pipeline/cf-worker
wrangler d1 execute nexgen-jobs --remote --file=schema.sql
```
Expected: Schema applied successfully. Note: this drops and recreates tables — acceptable since no real customers exist.

- [ ] **Step 3: Deploy worker**

```bash
cd onboarding-pipeline/cf-worker
wrangler deploy
```
Expected: Deployed to `api.3nexgen.com`

- [ ] **Step 4: Verify endpoints**

```bash
# Test orders endpoint (should fail validation — no real bot token)
curl -s -X POST https://api.3nexgen.com/api/orders \
  -H "Content-Type: application/json" \
  -d '{"tier":2,"display_name":"Test","telegram_user_id":"123","email":"test@test.com","bot_token":"fake"}' | python3 -m json.tool

# Expected: {"error": "Invalid bot token — could not verify via Telegram API"}

# Test VPS recyclable (should return null — no VPSes in D1)
curl -s https://api.3nexgen.com/api/vps/recyclable \
  -H "X-Worker-Token: YOUR_WORKER_TOKEN" | python3 -m json.tool

# Expected: {"vps": null}
```

- [ ] **Step 5: Commit deployment note**

No code changes — this is a deployment step only.

---

## Task 9: Update Pi5 Worker — Remove Bot Pool

**Files:**
- Delete: `onboarding-pipeline/pi5-worker/bot_pool.py`
- Delete: `onboarding-pipeline/pi5-worker/tests/test_bot_pool.py`
- Delete: `onboarding-pipeline/pi5-worker/scripts/bot-pool-status.sh`
- Modify: `onboarding-pipeline/pi5-worker/config.py`
- Modify: `onboarding-pipeline/pi5-worker/worker.py`
- Modify: `onboarding-pipeline/pi5-worker/deployer.py`
- Modify: `onboarding-pipeline/pi5-worker/tests/test_deployer.py`

- [ ] **Step 1: Delete bot pool files**

```bash
rm onboarding-pipeline/pi5-worker/bot_pool.py
rm onboarding-pipeline/pi5-worker/tests/test_bot_pool.py
rm onboarding-pipeline/pi5-worker/scripts/bot-pool-status.sh
```

- [ ] **Step 2: Remove pool config from config.py**

Remove these two lines from `onboarding-pipeline/pi5-worker/config.py`:

```python
BOT_POOL_DIR = Path(os.environ.get("BOT_POOL_DIR", str(Path.home() / "bot-pool")))
```

and:

```python
BOT_POOL_LOW_THRESHOLD = int(os.environ.get("BOT_POOL_LOW_THRESHOLD", "20"))  # Alert when below this
```

- [ ] **Step 3: Update worker.py — remove BotPool**

Replace the entire file:

```python
"""Main worker loop: poll CF Worker for jobs, deploy, repeat.

The worker is intentionally synchronous. The Agent SDK's async nature is
handled inside deployer.deploy() — it calls anyio.run() to bridge into
the async Agent SDK session. This keeps the outer loop simple.
"""

import time
import traceback

import config
from api_client import ApiClient
from notifier import Notifier
from deployer import Deployer


def main():
    api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
    notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)
    deployer = Deployer(api, notifier, config.OPENCLAW_INSTALL_DIR)

    last_health_ping = 0
    print(f"[worker] Started. Polling {config.CF_WORKER_URL} every {config.POLL_INTERVAL}s")
    print(f"[worker] Agent: Claude Max plan (Sonnet 4.6), max {config.AGENT_MAX_TURNS} turns")
    print(f"[worker] Claude auth: {'OK' if config.CLAUDE_AUTH_DIR.exists() else 'MISSING — run claude login!'}")

    while True:
        try:
            # Health ping every 5 minutes
            now = time.time()
            if now - last_health_ping >= config.HEALTH_INTERVAL:
                api.send_health_ping()
                last_health_ping = now

            # Poll for next job
            job = api.get_next_job()
            if job:
                print(f"[worker] Job found: {job['id']} (Tier {job['tier']}, {job['job_type']})")
                notifier.notify_new_job(job)

                if job["job_type"] == "deploy":
                    start = time.time()
                    success = deployer.deploy(job)
                    elapsed = time.time() - start
                    print(f"[worker] {job['id']}: {'SUCCESS' if success else 'FAILED'} in {elapsed:.0f}s")

                elif job["job_type"] == "cancel":
                    from vps_lifecycle import VpsLifecycle
                    lifecycle = VpsLifecycle(api, notifier)
                    lifecycle.handle_cancel(job)

                else:
                    notifier.send(
                        f"{job['id']} — job type '{job['job_type']}' requires manual handling"
                    )
                    api.update_job(job["id"], "failed",
                                   error_log=f"Job type {job['job_type']} not automated yet")
            else:
                pass

        except KeyboardInterrupt:
            print("[worker] Shutting down...")
            break
        except Exception:
            print(f"[worker] Error: {traceback.format_exc()}")
            time.sleep(10)
            continue

        time.sleep(config.POLL_INTERVAL)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Update deployer.py — read bot from job data**

Replace the entire file:

```python
"""Orchestrates full customer deployment using Claude Agent SDK.

Architecture:
  - VPS provisioning: subprocess (deterministic Contabo API call)
  - Script installation + QA + debugging: Claude Agent SDK (AI operator)
  - Webhook + notifications: direct API calls (deterministic)

The Agent SDK session gets Bash tool access and follows the CLAUDE.md playbook
as a structured prompt. It can interpret QA output, debug failures, and make
adaptive decisions — this is the "AI is the operator" architecture.
"""

import subprocess
import os
import anyio
from pathlib import Path
from typing import Optional

from api_client import ApiClient
from notifier import Notifier
from playbook import (
    build_deployment_prompt,
    get_system_prompt,
    TIER_SCRIPTS,
    TIER_QA,
)
import config


class Deployer:
    def __init__(
        self,
        api: ApiClient,
        notifier: Notifier,
        install_dir: Path = None,
    ):
        self.api = api
        self.notifier = notifier
        self.install_dir = install_dir or config.OPENCLAW_INSTALL_DIR
        self.ssh_key = str(config.SSH_KEY_PATH)

    def deploy(self, job: dict) -> bool:
        """Run full deployment pipeline. Returns True on success.

        Called from the sync worker loop — uses anyio.run() internally for
        the async Agent SDK session.
        """
        job_id = job["id"]
        tier = job["tier"]
        telegram_user_id = job.get("telegram_user_id", "")

        try:
            # Step 1: Get bot from job data (customer-created)
            bot = self._get_bot_from_job(job)
            if not bot:
                self.api.update_job(job_id, "failed", error_log="No bot_token in job data")
                self.notifier.notify_failed(job_id, "No bot_token in job data")
                return False

            # Send waiting message to customer
            Notifier.send_customer_message(
                bot["token"],
                telegram_user_id,
                "Setting up your AI assistant, please wait approximately 15 minutes... "
                "If you have any questions, contact @NexGenAI_Support_bot or support@3nexgen.com"
            )

            # Step 2: Provision VPS (sync — deterministic API call)
            server_ip = self._provision_vps(job_id, tier)
            if not server_ip:
                self._handle_failure(job_id, bot, telegram_user_id, "VPS provisioning failed")
                return False

            self.api.update_job(job_id, "installing", server_ip=server_ip)

            # Step 3: Run Agent SDK deployment session (async)
            success = anyio.run(
                self._run_agent_deployment,
                job_id, tier, server_ip, bot["token"], telegram_user_id,
            )

            if not success:
                self._handle_failure(job_id, bot, telegram_user_id, "Agent deployment failed — check logs")
                return False

            # Step 4: Set webhook and deliver (sync — deterministic)
            self.api.update_job(job_id, "qa")
            webhook_url = f"https://{server_ip}:18789/webhook"
            Notifier.set_webhook(bot["token"], webhook_url)

            Notifier.send_customer_message(
                bot["token"],
                telegram_user_id,
                "Your AI assistant is ready! Start chatting now."
            )

            self.api.update_job(job_id, "complete")
            self.notifier.notify_complete(job_id)
            return True

        except Exception as e:
            import traceback
            error_msg = str(e)[:500]
            print(f"[deployer] {job_id}: EXCEPTION: {error_msg}")
            traceback.print_exc()
            self.api.update_job(job_id, "failed", error_log=error_msg)
            self.notifier.notify_failed(job_id, error_msg)
            return False

    def _get_bot_from_job(self, job: dict) -> Optional[dict]:
        """Read bot token and username from job data (customer-created bot)."""
        bot_token = job.get("bot_token")
        bot_username = job.get("bot_username")
        if not bot_token:
            return None
        return {"token": bot_token, "username": bot_username or "unknown"}

    async def _run_agent_deployment(
        self,
        job_id: str,
        tier: int,
        server_ip: str,
        bot_token: str,
        telegram_user_id: str,
    ) -> bool:
        """Launch Claude Agent SDK session to execute the CLAUDE.md playbook.

        Returns True if the agent outputs DEPLOYMENT_SUCCESS, False otherwise.
        """
        from claude_code_sdk import query, ClaudeCodeOptions, ResultMessage

        # Build client.env content (never written to disk until the agent does it)
        client_env = (
            f"CLIENT_ID={job_id}\n"
            f"TIER={tier}\n"
            f"DEEPSEEK_API_KEY={config.DEEPSEEK_API_KEY}\n"
            f"OPENAI_API_KEY={config.OPENAI_API_KEY}\n"
            f"TELEGRAM_BOT_TOKEN={bot_token}\n"
            f"TELEGRAM_ALLOWED_USERS={telegram_user_id}\n"
        )

        prompt = build_deployment_prompt(
            job_id=job_id,
            tier=tier,
            server_ip=server_ip,
            ssh_key_path=self.ssh_key,
            install_dir=str(self.install_dir),
            client_env_content=client_env,
        )

        system_prompt = get_system_prompt(self.ssh_key, server_ip)
        result_text = ""
        agent_error = None

        # Auth health check: verify Claude Max OAuth token exists (zero-cost filesystem check)
        if not config.CLAUDE_AUTH_DIR.exists():
            print(f"[agent] {job_id}: ABORT — ~/.claude/ not found. Run 'claude login' on Pi5.")
            self.notifier.send(f"{job_id}: Claude auth missing! Run 'claude login' on Pi5.")
            return False

        try:
            async for message in query(
                prompt=prompt,
                options=ClaudeCodeOptions(
                    allowed_tools=["Bash", "Read"],
                    cwd=str(self.install_dir),
                    permission_mode="bypassPermissions",
                    system_prompt=system_prompt,
                    model="sonnet",
                    max_turns=config.AGENT_MAX_TURNS,
                ),
            ):
                if isinstance(message, ResultMessage):
                    result_text = message.result or ""
                    print(f"[agent] Session complete. Cost: ${message.total_cost_usd or 0:.4f}")

        except Exception as e:
            agent_error = str(e)
            print(f"[agent] Agent SDK error: {agent_error}")

        # Parse result
        if "DEPLOYMENT_SUCCESS" in result_text:
            print(f"[agent] {job_id}: DEPLOYMENT_SUCCESS")
            return True

        failure_reason = "Agent did not produce DEPLOYMENT_SUCCESS"
        if "DEPLOYMENT_FAILED:" in result_text:
            failure_reason = result_text.split("DEPLOYMENT_FAILED:", 1)[1].strip()[:300]
        elif agent_error:
            failure_reason = f"Agent SDK error: {agent_error[:300]}"

        print(f"[agent] {job_id}: FAILED — {failure_reason}")
        return False

    def _provision_vps(self, job_id: str, tier: int) -> Optional[str]:
        """Recycle-first VPS provisioning. Returns server IP or None."""
        from vps_lifecycle import VpsLifecycle
        lifecycle = VpsLifecycle(self.api, self.notifier)

        # --- Recycling branch: check pool first ---
        recycled_ip = lifecycle.try_recycle(job_id, tier)
        if recycled_ip:
            print(f"[deploy] {job_id}: Recycled existing VPS -> {recycled_ip}")
            return recycled_ip

        # --- Fresh provisioning: no recyclable VPS available ---
        provision_dir = self.install_dir / "provision"
        provider = os.environ.get("PROVISION_PROVIDER", "contabo")
        create_script = f"{provider}-create.sh"

        result = subprocess.run(
            ["bash", str(provision_dir / create_script), job_id, str(tier)],
            capture_output=True, text=True, timeout=1200,
            cwd=str(self.install_dir),
        )
        if result.returncode != 0:
            print(f"[deploy] {create_script} failed: {result.stderr}")
            return None

        result = subprocess.run(
            ["bash", str(provision_dir / "wait-for-ssh.sh"), job_id],
            capture_output=True, text=True, timeout=300,
            cwd=str(self.install_dir),
        )
        if result.returncode != 0:
            print(f"[deploy] wait-for-ssh failed: {result.stderr}")
            return None

        info_file = self.install_dir / "clients" / job_id / "server-info.env"
        info = {}
        for line in info_file.read_text().splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                info[k.strip()] = v.strip()

        server_ip = info.get("SERVER_IP")
        server_id = info.get("SERVER_ID")
        contract_id = info.get("CONTRACT_ID")

        if not server_ip or not server_id:
            if server_id:
                try:
                    self.api.create_vps_instance({
                        "vps_id": server_id,
                        "contabo_contract_id": contract_id,
                        "contabo_ip": "",
                        "customer_id": job_id,
                        "status": "failed",
                        "tier": tier,
                        "reinstall_count": 0,
                        "billing_start": __import__("datetime").datetime.utcnow().isoformat() + "Z",
                    })
                except Exception:
                    pass
            return None

        # Register new VPS in D1 tracking table
        try:
            self.api.create_vps_instance({
                "vps_id": server_id,
                "contabo_contract_id": contract_id,
                "contabo_ip": server_ip,
                "customer_id": job_id,
                "status": "provisioning",
                "tier": tier,
                "reinstall_count": 0,
                "billing_start": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            })
        except Exception as e:
            print(f"[deploy] WARNING: failed to register VPS in D1: {e}")

        return server_ip

    def _handle_failure(self, job_id: str, bot: dict, telegram_user_id: str, error: str) -> None:
        """Handle deployment failure: notify customer + owner."""
        try:
            Notifier.send_customer_message(
                bot["token"],
                telegram_user_id,
                "We encountered an issue setting up your AI assistant. "
                "Our team has been notified and will resolve this shortly. "
                "Contact @NexGenAI_Support_bot for updates."
            )
        except Exception:
            pass

        self.api.update_job(job_id, "failed", error_log=error)
        self.notifier.notify_failed(job_id, error)
```

- [ ] **Step 5: Update test_deployer.py**

Replace the entire file:

```python
import unittest
from unittest.mock import patch, MagicMock
import os

os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "test")
os.environ.setdefault("DEEPSEEK_API_KEY", "test-dk")
os.environ.setdefault("OPENAI_API_KEY", "test-ok")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")

from deployer import Deployer
from playbook import build_deployment_prompt, TIER_SCRIPTS


class TestDeployer(unittest.TestCase):
    def test_get_tier_scripts(self):
        scripts = TIER_SCRIPTS[1]
        self.assertIn("00-swap-setup.sh", scripts)
        self.assertNotIn("05-setup-qdrant.sh", scripts)

        scripts2 = TIER_SCRIPTS[2]
        self.assertIn("05-setup-qdrant.sh", scripts2)
        self.assertNotIn("11-setup-chromium.sh", scripts2)

        scripts3 = TIER_SCRIPTS[3]
        self.assertIn("11-setup-chromium.sh", scripts3)

    def test_build_deployment_prompt(self):
        """Verify the playbook prompt includes all critical sections."""
        prompt = build_deployment_prompt(
            job_id="1001",
            tier=2,
            server_ip="203.0.113.50",
            ssh_key_path="/home/pi/.ssh/nexgen_automation",
            install_dir="/home/pi/openclaw_install",
            client_env_content="CLIENT_ID=1001\nTIER=2\nDEEPSEEK_API_KEY=sk-test",
        )
        self.assertIn("203.0.113.50", prompt)
        self.assertIn("nexgen_automation", prompt)
        self.assertIn("05-setup-qdrant.sh", prompt)
        self.assertIn("06-setup-mem0.sh", prompt)
        self.assertNotIn("11-setup-chromium.sh", prompt)
        self.assertIn("GATE CHECK", prompt)
        self.assertIn("01-health-check.sh", prompt)
        self.assertIn("Troubleshooting", prompt)

    def test_build_prompt_tier1_excludes_qdrant(self):
        prompt = build_deployment_prompt(
            job_id="1002",
            tier=1,
            server_ip="10.0.0.1",
            ssh_key_path="/key",
            install_dir="/install",
            client_env_content="CLIENT_ID=1002",
        )
        self.assertNotIn("05-setup-qdrant.sh", prompt)
        self.assertNotIn("06-setup-mem0.sh", prompt)
        self.assertIn("04-install-openclaw.sh", prompt)


class TestGetBotFromJob(unittest.TestCase):
    """Test that _get_bot_from_job reads token from job data."""

    def setUp(self):
        self.mock_api = MagicMock()
        self.mock_notifier = MagicMock()
        self.deployer = Deployer(self.mock_api, self.mock_notifier)

    def test_returns_bot_from_job(self):
        """Bot token and username are read from job data."""
        job = {
            "id": "1001",
            "bot_token": "12345:FAKE",
            "bot_username": "test_helper_bot",
            "tier": 2,
        }
        bot = self.deployer._get_bot_from_job(job)
        self.assertIsNotNone(bot)
        self.assertEqual(bot["token"], "12345:FAKE")
        self.assertEqual(bot["username"], "test_helper_bot")

    def test_returns_none_when_no_token(self):
        """Returns None when job has no bot_token."""
        job = {"id": "1001", "tier": 2}
        bot = self.deployer._get_bot_from_job(job)
        self.assertIsNone(bot)

    def test_failure_does_not_touch_pool(self):
        """On failure, no bot pool operations happen — bot stays with customer."""
        bot = {"token": "12345:FAKE", "username": "test_bot"}
        self.deployer._handle_failure("1001", bot, "999", "test error")
        self.mock_api.update_job.assert_called_with("1001", "failed", error_log="test error")
        # No pool.return_bot call — BotPool doesn't exist


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 6: Run Pi5 worker tests**

```bash
cd onboarding-pipeline/pi5-worker
python3 -m pytest tests/ -v
```
Expected: ALL PASS (bot_pool tests are gone, deployer tests updated)

- [ ] **Step 7: Commit**

```bash
git rm onboarding-pipeline/pi5-worker/bot_pool.py onboarding-pipeline/pi5-worker/tests/test_bot_pool.py onboarding-pipeline/pi5-worker/scripts/bot-pool-status.sh
git add onboarding-pipeline/pi5-worker/config.py onboarding-pipeline/pi5-worker/worker.py onboarding-pipeline/pi5-worker/deployer.py onboarding-pipeline/pi5-worker/tests/test_deployer.py
git commit -m "feat: remove bot pool, deployer reads bot token from job data"
```

---

## Task 10: Deploy Pi5 Worker

**Files:**
- No file changes — deployment to Pi5

- [ ] **Step 1: SCP updated files to Pi5**

```bash
scp onboarding-pipeline/pi5-worker/deployer.py jacky999@192.168.1.30:~/onboarding-pipeline/pi5-worker/
scp onboarding-pipeline/pi5-worker/worker.py jacky999@192.168.1.30:~/onboarding-pipeline/pi5-worker/
scp onboarding-pipeline/pi5-worker/config.py jacky999@192.168.1.30:~/onboarding-pipeline/pi5-worker/
```

- [ ] **Step 2: Delete bot pool files on Pi5**

```bash
ssh jacky999@192.168.1.30 "rm -f ~/onboarding-pipeline/pi5-worker/bot_pool.py ~/onboarding-pipeline/pi5-worker/tests/test_bot_pool.py ~/onboarding-pipeline/pi5-worker/scripts/bot-pool-status.sh"
```

- [ ] **Step 3: Remove BOT_POOL_DIR and BOT_POOL_LOW_THRESHOLD from Pi5 .env**

```bash
ssh jacky999@192.168.1.30 "sed -i '/BOT_POOL_DIR/d; /BOT_POOL_LOW_THRESHOLD/d' ~/onboarding-pipeline/pi5-worker/.env"
```

- [ ] **Step 4: Run tests on Pi5**

```bash
ssh jacky999@192.168.1.30 "cd ~/onboarding-pipeline/pi5-worker && ~/nexgen-worker-env/bin/python3 -m pytest tests/ -v"
```
Expected: ALL PASS

- [ ] **Step 5: Restart worker service (if running)**

```bash
ssh jacky999@192.168.1.30 "export XDG_RUNTIME_DIR=/run/user/1000 && export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus && systemctl --user restart nexgen-worker 2>/dev/null; echo 'done'"
```

---

## Task 11: Website Content — BotFather Tutorial

**Files:**
- Create: `website-lovable/content/botfather-tutorial.md`

- [ ] **Step 1: Create tutorial content in 香港書面語**

Create `website-lovable/content/botfather-tutorial.md`:

```markdown
# 如何建立您的 Telegram Bot

在訂購 NexGen AI 服務之前，您需要先建立自己的 Telegram Bot。整個過程只需 2 分鐘。

---

## 步驟一：開啟 BotFather

在 Telegram 搜尋 **@BotFather** 並開啟對話。

BotFather 是 Telegram 的官方工具，用於建立和管理 Bot。

> [screenshot placeholder: search BotFather in Telegram]

---

## 步驟二：建立新 Bot

發送指令：

```
/newbot
```

BotFather 會回覆您，要求輸入 Bot 的顯示名稱。

> [screenshot placeholder: /newbot response]

---

## 步驟三：輸入顯示名稱

輸入您希望的 Bot 名稱，例如：

```
我的AI助手
```

這是您在 Telegram 對話清單中看到的名稱，之後可以隨時更改。

---

## 步驟四：選擇用戶名

BotFather 會要求您選擇一個用戶名。用戶名必須：
- 以 `_bot` 結尾
- 只能使用英文字母、數字和底線
- 不能與其他 Bot 重複

例如：

```
MyAI_Helper_bot
```

如果提示「已被使用」，請嘗試其他名稱，例如加上數字：`MyAI_Helper_2026_bot`

---

## 步驟五：複製 Bot Token

建立成功後，BotFather 會發送一段 **Bot Token**，格式如下：

```
1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ123456789
```

**請複製這段 Token**，然後貼上到 NexGen AI 訂單表格中。

> [screenshot placeholder: BotFather success message with token highlighted]

---

## 常見問題

### 用戶名已被使用？
請嘗試其他名稱。建議加入個人特色或數字，例如 `ClaireAI_2026_bot`。

### Token 是什麼？
Token 是您 Bot 的專屬密碼，讓我們的系統能夠為您的 Bot 安裝 AI 功能。

### Token 安全嗎？
- 請勿與他人分享您的 Token
- 我們的系統使用加密傳輸和儲存
- 如果您懷疑 Token 洩漏，可以在 BotFather 使用 `/revoke` 重新產生

### 建立 Bot 後可以更改名稱嗎？
可以。在 BotFather 使用 `/setname` 指令即可更改顯示名稱。
```

- [ ] **Step 2: Commit**

```bash
mkdir -p website-lovable/content
git add website-lovable/content/botfather-tutorial.md
git commit -m "docs: add BotFather tutorial in 香港書面語"
```

---

## Task 12: Website Content — Order Form Spec

**Files:**
- Create: `website-lovable/content/order-form-spec.md`

- [ ] **Step 1: Create order form spec**

Create `website-lovable/content/order-form-spec.md`:

```markdown
# Order Form — Technical Spec

This document defines the order form for the 3nexgen.com website. It specifies the form fields, validation rules, API integration, and payment flow.

---

## Form Fields

| Field | Type | Required | Validation | Notes |
|-------|------|----------|-----------|-------|
| 服務計劃 (Service Tier) | Dropdown | Yes | Must be 1, 2, or 3 | Options: 🌱 新手上路 (Tier 1) / ⭐ 智能管家 (Tier 2) / 🚀 全能大師 (Tier 3) |
| Bot Token | Text input | Yes | Validated via Telegram API | Has a "驗證" (Validate) button |
| Bot 名稱 (Display Name) | Text input | Yes | Non-empty | Auto-filled from getMe response `first_name` after validation, editable |
| Bot 用戶名 | Read-only text | — | — | Auto-populated from getMe response `username`, shown as `@username` |
| Telegram User ID | Text input | Yes | Numeric string | Include help link: "如何查詢您的 Telegram User ID?" |
| 電郵地址 (Email) | Email input | Yes | Valid email format | Used for order confirmation and Lemon Squeezy matching |

---

## Bot Token Validation Flow

When user clicks "驗證" (Validate) button:

1. Frontend calls Telegram API directly (no backend needed):
   ```
   GET https://api.telegram.org/bot{TOKEN}/getMe
   ```

2. **On success** (`ok: true`, `result.is_bot: true`):
   - Show green checkmark next to token field
   - Auto-fill "Bot 名稱" with `result.first_name`
   - Show "Bot 用戶名" as `@{result.username}`
   - Enable the Submit button

3. **On failure** (network error, `ok: false`):
   - Show red X next to token field
   - Display error: "Token 無效，請檢查後重試"
   - Keep Submit button disabled

---

## Form Submission

**API Endpoint:** `POST https://api.3nexgen.com/api/orders`

**Request body:**
```json
{
  "tier": 2,
  "display_name": "我的AI助手",
  "telegram_user_id": "123456789",
  "email": "user@example.com",
  "bot_token": "1234567890:ABCdefGHI..."
}
```

**Response (201):**
```json
{
  "order": {
    "id": "1001",
    "status": "pending_payment",
    "bot_username": "MyAI_Helper_bot",
    "tier": 2
  }
}
```

**Error responses:**
- `400` — Missing field or invalid bot token
- `409` — Bot token already in use

---

## Post-Submission: Payment Options

After successful order submission, show payment options page:

### Option A: Visa / Mastercard (Lemon Squeezy)

Redirect to Lemon Squeezy checkout with order_id embedded:

```
https://STORE_NAME.lemonsqueezy.com/checkout/buy/VARIANT_ID?checkout[custom_data][order_id]=1001&checkout[email]=user@example.com
```

The variant_id maps to the selected tier (configured in Lemon Squeezy dashboard).

Payment is auto-confirmed via webhook — no manual action needed.

### Option B: FPS / PayMe

Display payment details:

```
銀行: [Bank Name]
FPS 識別碼: [FPS ID]
金額: HK$[amount based on tier]
備註: 訂單編號 1001
```

Instruct customer: "轉帳後請耐心等候，我們會在確認收款後開始設定您的 AI 助手。"

Admin manually confirms via:
```
POST https://api.3nexgen.com/api/confirm/1001
X-API-Key: [CONFIRM_API_KEY]
{"payment_method": "fps"}
```

---

## Telegram User ID Help

Link to a help section explaining how to find your Telegram User ID:

1. 在 Telegram 搜尋 **@userinfobot** 並開啟對話
2. 發送任何訊息
3. Bot 會回覆您的 User ID（一串數字）
4. 複製這串數字到訂單表格

---

## Pricing Display (from CLAUDE.md)

| Tier | Name | 安裝費 (半價優惠) | 月費 |
|------|------|-----------------|------|
| 1 | 🌱 新手上路 | HK$200 | HK$148/月 |
| 2 | ⭐ 智能管家 | HK$400 | HK$248/月 |
| 3 | 🚀 全能大師 | HK$900 | HK$388/月 |
```

- [ ] **Step 2: Commit**

```bash
git add website-lovable/content/order-form-spec.md
git commit -m "docs: add order form technical spec for website integration"
```

---

## Post-Completion Checklist

After all tasks are complete:

1. CF Worker deployed with new schema, order/confirm/VPS endpoints
2. Pi5 worker updated — no bot pool dependency
3. All CF Worker tests pass (Vitest)
4. All Pi5 worker tests pass (pytest)
5. Bot pool files deleted from repo and Pi5
6. Website content markdown files created
7. Manual E2E test: submit order → confirm payment → Pi5 deploys → VPS registered in D1
8. VPS recycling E2E: cancel VPS → submit new order → recycled from pool
