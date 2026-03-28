# Plan A: CF Worker + D1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a Cloudflare Worker at `api.3nexgen.com` that receives payment webhooks, exposes a REST API for Pi5 worker polling, and monitors Pi5 health — backed by Cloudflare D1 for job state.

**Architecture:** A single Cloudflare Worker handles all HTTP endpoints: Lemon Squeezy webhook (HMAC-verified), manual payment confirmation (API-key-protected), Pi5 job polling (worker-token-protected), and Pi5 health ping. Cloudflare D1 (edge SQLite) stores job queue state. The Worker also checks Pi5 health on each request and sends Telegram alerts if Pi5 goes offline.

**Tech Stack:** TypeScript, Cloudflare Workers, Cloudflare D1, Wrangler CLI, Vitest (testing)

**Spec:** `docs/superpowers/specs/2026-03-26-customer-onboarding-pipeline-design.md`

**Depends on:** Nothing — this is the foundation. Plans B and C depend on this.

---

## Pre-work (before Task 1)

These must be completed before starting implementation:

- [ ] **P1: Install Wrangler CLI**

```bash
npm install -g wrangler
wrangler --version
# Expected: wrangler 3.x.x
```

- [ ] **P2: Authenticate Wrangler with Cloudflare**

```bash
wrangler login
# Opens browser, authorize with Cloudflare account that owns 3nexgen.com
```

- [ ] **P3: Note your Telegram bot token and chat ID**

You need these for the Pi5 offline alert. Use your personal OpenClaw bot token and your Telegram user ID (340067089).

- [ ] **P4: Generate secrets**

Generate these values — you'll need them in Task 8 (deploy):

```bash
# Worker token (Pi5 uses this to authenticate with CF Worker)
openssl rand -hex 32
# Save this — it goes into both CF Worker secrets AND Pi5 .env

# Manual confirm API key (you use this to confirm FPS/PayMe payments)
openssl rand -hex 32
# Save this — you'll use it when calling /api/confirm
```

---

## File Structure

```
onboarding-pipeline/
  cf-worker/
    package.json
    tsconfig.json
    wrangler.toml              — Cloudflare config (D1 binding, routes, env)
    vitest.config.ts           — Test config
    schema.sql                 — D1 schema (applied via wrangler)
    src/
      index.ts                 — Worker entry: request router
      handlers/
        webhook.ts             — POST /api/webhook/lemonsqueezy
        confirm.ts             — POST /api/confirm
        jobs.ts                — GET /api/jobs/next, PATCH /api/jobs/:id
        health.ts              — POST /api/health
      lib/
        db.ts                  — D1 query helpers (createJob, getNextJob, etc.)
        hmac.ts                — Lemon Squeezy HMAC signature verification
        auth.ts                — Worker token + API key verification
        alerts.ts              — Telegram alert sender (Pi5 offline, etc.)
        types.ts               — Shared TypeScript types
    test/
      webhook.test.ts
      confirm.test.ts
      jobs.test.ts
      health.test.ts
      db.test.ts
```

All files live under `f:\openclaw_setup_business\onboarding-pipeline\cf-worker\`.

---

### Task 1: Project Scaffold

**Files:**
- Create: `onboarding-pipeline/cf-worker/package.json`
- Create: `onboarding-pipeline/cf-worker/tsconfig.json`
- Create: `onboarding-pipeline/cf-worker/wrangler.toml`
- Create: `onboarding-pipeline/cf-worker/vitest.config.ts`

- [ ] **Step 1: Create project directory and package.json**

```bash
mkdir -p onboarding-pipeline/cf-worker
cd onboarding-pipeline/cf-worker
```

Create `package.json`:
```json
{
  "name": "nexgen-cf-worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:init": "wrangler d1 execute nexgen-jobs --local --file=schema.sql",
    "db:init:remote": "wrangler d1 execute nexgen-jobs --remote --file=schema.sql"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.6.0",
    "@cloudflare/workers-types": "^4.20250320.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0",
    "wrangler": "^3.100.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

- [ ] **Step 3: Create wrangler.toml**

```toml
name = "nexgen-api"
main = "src/index.ts"
compatibility_date = "2025-03-01"

# Custom domain: api.3nexgen.com (configured in Cloudflare DNS)
routes = [
  { pattern = "api.3nexgen.com/*", zone_name = "3nexgen.com" }
]

# D1 database binding
[[d1_databases]]
binding = "DB"
database_name = "nexgen-jobs"
database_id = "REPLACE_AFTER_CREATION"

# Environment variables (non-secret defaults)
[vars]
VARIANT_TIER_MAP = '{"placeholder_variant_1":1,"placeholder_variant_2":2,"placeholder_variant_3":3}'
OWNER_TELEGRAM_CHAT_ID = "340067089"

# Secrets (set via `wrangler secret put`):
# LEMONSQUEEZY_WEBHOOK_SECRET — HMAC signing secret from Lemon Squeezy
# WORKER_TOKEN              — Pi5 authenticates with this
# CONFIRM_API_KEY           — You authenticate manual confirms with this
# OWNER_TELEGRAM_BOT_TOKEN  — Your personal bot token (for alerts)
```

**Note:** `database_id` will be replaced after creating the D1 database in Task 2.

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          d1Databases: ["DB"],
          bindings: {
            LEMONSQUEEZY_WEBHOOK_SECRET: "test-webhook-secret",
            WORKER_TOKEN: "test-worker-token",
            CONFIRM_API_KEY: "test-confirm-key",
            OWNER_TELEGRAM_BOT_TOKEN: "test-bot-token",
            OWNER_TELEGRAM_CHAT_ID: "340067089",
            VARIANT_TIER_MAP: '{"var_tier1":1,"var_tier2":2,"var_tier3":3}',
          },
        },
      },
    },
  },
});
```

- [ ] **Step 5: Install dependencies**

```bash
cd onboarding-pipeline/cf-worker
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Create directory structure**

```bash
mkdir -p src/handlers src/lib test
```

- [ ] **Step 7: Commit**

```bash
git add onboarding-pipeline/cf-worker/
git commit -m "feat(plan-a): scaffold CF Worker project with wrangler + vitest"
```

---

### Task 2: D1 Schema + Query Helpers

**Files:**
- Create: `onboarding-pipeline/cf-worker/schema.sql`
- Create: `onboarding-pipeline/cf-worker/src/lib/types.ts`
- Create: `onboarding-pipeline/cf-worker/src/lib/db.ts`
- Create: `onboarding-pipeline/cf-worker/test/db.test.ts`

- [ ] **Step 1: Write the D1 schema**

Create `schema.sql`:
```sql
-- Job queue for customer onboarding pipeline
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,                          -- T1043
  status TEXT NOT NULL DEFAULT 'ready',         -- ready | provisioning | installing | qa | complete | failed | stale
  job_type TEXT NOT NULL DEFAULT 'deploy',      -- deploy | upgrade | downgrade | cancel | delete | reactivate
  tier INTEGER NOT NULL,                        -- 1, 2, 3
  target_tier INTEGER,                          -- for upgrade/downgrade jobs
  display_name TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  payment_method TEXT,                          -- lemon_squeezy | fps | payme
  lemon_squeezy_order_id TEXT UNIQUE,           -- webhook deduplication
  bot_username TEXT,                            -- NexGenAI_T1043_bot
  server_ip TEXT,
  error_log TEXT,
  re_queue_count INTEGER DEFAULT 0,             -- stale job re-queue tracker (max 2)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Auto-incrementing ID counter starting at 1043
CREATE TABLE IF NOT EXISTS id_counter (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT OR IGNORE INTO id_counter (key, value) VALUES ('next_id', 1043);

-- Pi5 health tracking
CREATE TABLE IF NOT EXISTS health (
  worker_id TEXT PRIMARY KEY DEFAULT 'pi5',
  last_ping TEXT NOT NULL,
  alerted INTEGER DEFAULT 0                     -- 1 if offline alert already sent
);
```

- [ ] **Step 2: Write shared types**

Create `src/lib/types.ts`:
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
  lemon_squeezy_order_id: string | null;
  bot_username: string | null;
  server_ip: string | null;
  error_log: string | null;
  re_queue_count: number;
  created_at: string;
  updated_at: string;
}

export type JobStatus = "ready" | "provisioning" | "installing" | "qa" | "complete" | "failed" | "stale";
export type JobType = "deploy" | "upgrade" | "downgrade" | "cancel" | "delete" | "reactivate";
export type PaymentMethod = "lemon_squeezy" | "fps" | "payme";
```

- [ ] **Step 3: Write the failing test for db helpers**

Create `test/db.test.ts`:
```typescript
import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { createJob, getNextJob, updateJobStatus, getJobById, getNextId } from "../src/lib/db";

describe("D1 query helpers", () => {
  beforeEach(async () => {
    // Reset database before each test
    await env.DB.exec(`DELETE FROM jobs`);
    await env.DB.exec(`DELETE FROM id_counter`);
    await env.DB.exec(`INSERT INTO id_counter (key, value) VALUES ('next_id', 1043)`);
  });

  it("getNextId returns 1043 and increments to 1044", async () => {
    const id = await getNextId(env.DB);
    expect(id).toBe("T1043");
    const id2 = await getNextId(env.DB);
    expect(id2).toBe("T1044");
  });

  it("createJob inserts a job and returns it", async () => {
    const job = await createJob(env.DB, {
      tier: 2,
      display_name: "Test Bot",
      telegram_user_id: "123456",
      email: "test@test.com",
      payment_method: "lemon_squeezy",
      lemon_squeezy_order_id: "order_abc",
    });
    expect(job.id).toBe("T1043");
    expect(job.status).toBe("ready");
    expect(job.tier).toBe(2);
    expect(job.bot_username).toBe("NexGenAI_T1043_bot");
  });

  it("createJob rejects duplicate lemon_squeezy_order_id", async () => {
    await createJob(env.DB, {
      tier: 2,
      display_name: "Bot 1",
      telegram_user_id: "123",
      email: "a@b.com",
      payment_method: "lemon_squeezy",
      lemon_squeezy_order_id: "order_dup",
    });
    await expect(
      createJob(env.DB, {
        tier: 2,
        display_name: "Bot 2",
        telegram_user_id: "456",
        email: "c@d.com",
        payment_method: "lemon_squeezy",
        lemon_squeezy_order_id: "order_dup",
      })
    ).rejects.toThrow();
  });

  it("getNextJob returns oldest ready job", async () => {
    await createJob(env.DB, {
      tier: 1,
      display_name: "First",
      telegram_user_id: "111",
      email: "a@b.com",
      payment_method: "fps",
    });
    await createJob(env.DB, {
      tier: 2,
      display_name: "Second",
      telegram_user_id: "222",
      email: "c@d.com",
      payment_method: "lemon_squeezy",
      lemon_squeezy_order_id: "order_2",
    });
    const job = await getNextJob(env.DB);
    expect(job).not.toBeNull();
    expect(job!.display_name).toBe("First");
    expect(job!.status).toBe("provisioning"); // atomically claimed
  });

  it("getNextJob returns null when no ready jobs", async () => {
    const job = await getNextJob(env.DB);
    expect(job).toBeNull();
  });

  it("updateJobStatus changes status and updated_at", async () => {
    const job = await createJob(env.DB, {
      tier: 2,
      display_name: "Test",
      telegram_user_id: "123",
      email: "a@b.com",
      payment_method: "fps",
    });
    const updated = await updateJobStatus(env.DB, job.id, "installing", { server_ip: "1.2.3.4" });
    expect(updated.status).toBe("installing");
    expect(updated.server_ip).toBe("1.2.3.4");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd onboarding-pipeline/cf-worker
npm run db:init
npm run test
```

Expected: FAIL — modules `../src/lib/db` not found.

- [ ] **Step 5: Implement db.ts**

Create `src/lib/db.ts`:
```typescript
import { Job } from "./types";

interface CreateJobParams {
  tier: number;
  display_name: string;
  telegram_user_id: string;
  email: string;
  payment_method: string;
  lemon_squeezy_order_id?: string;
}

export async function getNextId(db: D1Database): Promise<string> {
  const row = await db
    .prepare("UPDATE id_counter SET value = value + 1 WHERE key = 'next_id' RETURNING value - 1 AS current")
    .first<{ current: number }>();
  if (!row) throw new Error("id_counter not initialized");
  return `T${row.current}`;
}

export async function createJob(db: D1Database, params: CreateJobParams): Promise<Job> {
  const id = await getNextId(db);
  const now = new Date().toISOString();
  const botUsername = `NexGenAI_${id}_bot`;

  await db
    .prepare(
      `INSERT INTO jobs (id, status, job_type, tier, display_name, telegram_user_id, email, payment_method, lemon_squeezy_order_id, bot_username, created_at, updated_at)
       VALUES (?, 'ready', 'deploy', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, params.tier, params.display_name, params.telegram_user_id, params.email, params.payment_method, params.lemon_squeezy_order_id ?? null, botUsername, now, now)
    .run();

  return (await getJobById(db, id))!;
}

export async function getNextJob(db: D1Database): Promise<Job | null> {
  // Atomically claim the oldest ready job by updating status to provisioning
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
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm run test
```

Expected: All 5 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add onboarding-pipeline/cf-worker/schema.sql onboarding-pipeline/cf-worker/src/lib/
git commit -m "feat(plan-a): D1 schema + query helpers with tests"
```

---

### Task 3: Auth + HMAC Helpers

**Files:**
- Create: `onboarding-pipeline/cf-worker/src/lib/hmac.ts`
- Create: `onboarding-pipeline/cf-worker/src/lib/auth.ts`

- [ ] **Step 1: Implement HMAC verification**

Create `src/lib/hmac.ts`:
```typescript
export async function verifyLemonSqueezySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time comparison
  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
```

- [ ] **Step 2: Implement auth helpers**

Create `src/lib/auth.ts`:
```typescript
import { Env } from "./types";

export function verifyWorkerToken(request: Request, env: Env): boolean {
  const token = request.headers.get("X-Worker-Token");
  return token === env.WORKER_TOKEN;
}

export function verifyConfirmApiKey(request: Request, env: Env): boolean {
  const key = request.headers.get("X-API-Key");
  return key === env.CONFIRM_API_KEY;
}

export function unauthorized(message: string = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

export function json(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/lib/hmac.ts onboarding-pipeline/cf-worker/src/lib/auth.ts
git commit -m "feat(plan-a): HMAC verification + auth helpers"
```

---

### Task 4: Lemon Squeezy Webhook Handler

**Files:**
- Create: `onboarding-pipeline/cf-worker/src/handlers/webhook.ts`
- Create: `onboarding-pipeline/cf-worker/test/webhook.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/webhook.test.ts`:
```typescript
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index";

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
    await env.DB.exec("INSERT INTO id_counter (key, value) VALUES ('next_id', 1043)");
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

  it("creates job on valid order_created webhook", async () => {
    const payload = {
      meta: {
        event_name: "order_created",
        custom_data: {
          display_name: "My AI",
          telegram_user_id: "340067089",
        },
      },
      data: {
        id: "order_12345",
        attributes: {
          first_order_item: {
            variant_id: "var_tier2",
          },
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
    expect(res.status).toBe(201);
    const data = await res.json() as { job: { id: string; tier: number; status: string } };
    expect(data.job.id).toBe("T1043");
    expect(data.job.tier).toBe(2);
    expect(data.job.status).toBe("ready");
  });

  it("rejects duplicate order_id", async () => {
    const payload = {
      meta: {
        event_name: "order_created",
        custom_data: { display_name: "Bot", telegram_user_id: "123" },
      },
      data: {
        id: "order_dup",
        attributes: { first_order_item: { variant_id: "var_tier1" } },
      },
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
    expect(res2.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test
```

Expected: FAIL — `../src/index` has no default export yet.

- [ ] **Step 3: Implement webhook handler**

Create `src/handlers/webhook.ts`:
```typescript
import { Env } from "../lib/types";
import { verifyLemonSqueezySignature } from "../lib/hmac";
import { createJob } from "../lib/db";
import { unauthorized, badRequest, json } from "../lib/auth";

interface LemonSqueezyWebhook {
  meta: {
    event_name: string;
    custom_data?: {
      display_name?: string;
      telegram_user_id?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      first_order_item?: {
        variant_id?: string;
      };
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

  const customData = payload.meta.custom_data;
  if (!customData?.display_name || !customData?.telegram_user_id) {
    return badRequest("Missing custom_data: display_name and telegram_user_id required");
  }

  // Derive tier from variant_id (server-side, never trust client metadata)
  const variantId = payload.data.attributes.first_order_item?.variant_id;
  if (!variantId) {
    return badRequest("Missing variant_id in order data");
  }

  const tierMap: Record<string, number> = JSON.parse(env.VARIANT_TIER_MAP);
  const tier = tierMap[variantId];
  if (!tier) {
    return badRequest(`Unknown variant_id: ${variantId}`);
  }

  try {
    const job = await createJob(env.DB, {
      tier,
      display_name: customData.display_name,
      telegram_user_id: customData.telegram_user_id,
      email: "", // Lemon Squeezy provides email in attributes — extract if available
      payment_method: "lemon_squeezy",
      lemon_squeezy_order_id: payload.data.id,
    });
    return json({ job }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UNIQUE constraint")) {
      return json({ error: "Duplicate order — already processed" }, 409);
    }
    throw err;
  }
}
```

- [ ] **Step 4: Create minimal router (src/index.ts)**

Create `src/index.ts`:
```typescript
import { Env } from "./lib/types";
import { handleWebhook } from "./handlers/webhook";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Route: Lemon Squeezy webhook
    if (method === "POST" && path === "/api/webhook/lemonsqueezy") {
      return handleWebhook(request, env);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

- [ ] **Step 5: Initialize local D1 and run tests**

```bash
npm run db:init
npm run test
```

Expected: All webhook tests PASS, all db tests PASS.

- [ ] **Step 6: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/ onboarding-pipeline/cf-worker/test/
git commit -m "feat(plan-a): Lemon Squeezy webhook handler with HMAC + dedup"
```

---

### Task 5: Manual Confirm Handler (FPS/PayMe)

**Files:**
- Create: `onboarding-pipeline/cf-worker/src/handlers/confirm.ts`
- Create: `onboarding-pipeline/cf-worker/test/confirm.test.ts`
- Modify: `onboarding-pipeline/cf-worker/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `test/confirm.test.ts`:
```typescript
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index";

describe("POST /api/confirm", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM jobs");
    await env.DB.exec("DELETE FROM id_counter");
    await env.DB.exec("INSERT INTO id_counter (key, value) VALUES ('next_id', 1043)");
  });

  it("rejects without API key", async () => {
    const req = new Request("https://api.3nexgen.com/api/confirm", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(401);
  });

  it("creates job with valid confirm request", async () => {
    const body = {
      tier: 2,
      display_name: "FPS Customer Bot",
      telegram_user_id: "999888",
      email: "fps@test.com",
      payment_method: "fps",
      amount_hkd: 400,
      reference: "FPS-20260326-001",
    };
    const req = new Request("https://api.3nexgen.com/api/confirm", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "test-confirm-key",
      },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(201);
    const data = await res.json() as { job: { id: string; tier: number; payment_method: string } };
    expect(data.job.id).toBe("T1043");
    expect(data.job.tier).toBe(2);
    expect(data.job.payment_method).toBe("fps");
  });

  it("rejects missing required fields", async () => {
    const body = { tier: 2, display_name: "Test" }; // missing telegram_user_id, email, etc.
    const req = new Request("https://api.3nexgen.com/api/confirm", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "test-confirm-key",
      },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test
```

Expected: FAIL — `/api/confirm` returns 404.

- [ ] **Step 3: Implement confirm handler**

Create `src/handlers/confirm.ts`:
```typescript
import { Env } from "../lib/types";
import { verifyConfirmApiKey, unauthorized, badRequest, json } from "../lib/auth";
import { createJob } from "../lib/db";

interface ConfirmRequest {
  tier: number;
  display_name: string;
  telegram_user_id: string;
  email: string;
  payment_method: string;
  amount_hkd: number;
  reference: string;
}

export async function handleConfirm(request: Request, env: Env): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) {
    return unauthorized("Invalid API key");
  }

  let body: ConfirmRequest;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  // Validate required fields
  const required = ["tier", "display_name", "telegram_user_id", "email", "payment_method", "amount_hkd", "reference"] as const;
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return badRequest(`Missing required field: ${field}`);
    }
  }

  if (![1, 2, 3].includes(body.tier)) {
    return badRequest("tier must be 1, 2, or 3");
  }
  if (!["fps", "payme"].includes(body.payment_method)) {
    return badRequest("payment_method must be fps or payme");
  }

  const job = await createJob(env.DB, {
    tier: body.tier,
    display_name: body.display_name,
    telegram_user_id: body.telegram_user_id,
    email: body.email,
    payment_method: body.payment_method,
  });

  return json({ job, confirm: { amount_hkd: body.amount_hkd, reference: body.reference } }, 201);
}
```

- [ ] **Step 4: Add route to index.ts**

Add to `src/index.ts` after the webhook route:
```typescript
import { handleConfirm } from "./handlers/confirm";

// Inside fetch():
    // Route: Manual confirm (FPS/PayMe)
    if (method === "POST" && path === "/api/confirm") {
      return handleConfirm(request, env);
    }
```

- [ ] **Step 5: Run tests**

```bash
npm run test
```

Expected: All tests PASS (webhook + confirm + db).

- [ ] **Step 6: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/ onboarding-pipeline/cf-worker/test/
git commit -m "feat(plan-a): manual confirm handler for FPS/PayMe with validation"
```

---

### Task 6: Pi5 Job Polling Endpoints

**Files:**
- Create: `onboarding-pipeline/cf-worker/src/handlers/jobs.ts`
- Create: `onboarding-pipeline/cf-worker/test/jobs.test.ts`
- Modify: `onboarding-pipeline/cf-worker/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `test/jobs.test.ts`:
```typescript
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
    // Seed a job directly
    await env.DB.prepare(
      `INSERT INTO jobs (id, status, job_type, tier, display_name, telegram_user_id, email, payment_method, bot_username, created_at, updated_at)
       VALUES ('T1043', 'ready', 'deploy', 2, 'Test Bot', '123', 'a@b.com', 'fps', 'NexGenAI_T1043_bot', '2026-03-26T00:00:00Z', '2026-03-26T00:00:00Z')`
    ).run();

    const req = new Request("https://api.3nexgen.com/api/jobs/next", {
      headers: workerHeaders,
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as { job: { id: string; status: string } };
    expect(data.job.id).toBe("T1043");
    expect(data.job.status).toBe("provisioning");
  });
});

describe("PATCH /api/jobs/:id", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM jobs");
    await env.DB.prepare(
      `INSERT INTO jobs (id, status, job_type, tier, display_name, telegram_user_id, email, payment_method, bot_username, created_at, updated_at)
       VALUES ('T1043', 'provisioning', 'deploy', 2, 'Test', '123', 'a@b.com', 'fps', 'NexGenAI_T1043_bot', '2026-03-26T00:00:00Z', '2026-03-26T00:00:00Z')`
    ).run();
  });

  it("updates job status", async () => {
    const req = new Request("https://api.3nexgen.com/api/jobs/T1043", {
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
    const req = new Request("https://api.3nexgen.com/api/jobs/T9999", {
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test
```

Expected: FAIL — routes not found (404).

- [ ] **Step 3: Implement jobs handler**

Create `src/handlers/jobs.ts`:
```typescript
import { Env } from "../lib/types";
import { verifyWorkerToken, unauthorized, badRequest, json } from "../lib/auth";
import { getNextJob, getJobById, updateJobStatus } from "../lib/db";

export async function handleGetNextJob(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  const job = await getNextJob(env.DB);
  return json({ job });
}

export async function handleUpdateJob(request: Request, env: Env, jobId: string): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  const existing = await getJobById(env.DB, jobId);
  if (!existing) {
    return json({ error: "Job not found" }, 404);
  }

  let body: { status?: string; server_ip?: string; error_log?: string; re_queue_count?: number };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.status) {
    return badRequest("status is required");
  }

  const validStatuses = ["ready", "provisioning", "installing", "qa", "complete", "failed", "stale"];
  if (!validStatuses.includes(body.status)) {
    return badRequest(`Invalid status: ${body.status}`);
  }

  const job = await updateJobStatus(env.DB, jobId, body.status, {
    server_ip: body.server_ip,
    error_log: body.error_log,
    re_queue_count: body.re_queue_count,
  });

  return json({ job });
}
```

- [ ] **Step 4: Add routes to index.ts**

Update `src/index.ts` to add job routes:
```typescript
import { handleGetNextJob, handleUpdateJob } from "./handlers/jobs";

// Inside fetch(), add after confirm route:

    // Route: Pi5 polls for next job
    if (method === "GET" && path === "/api/jobs/next") {
      return handleGetNextJob(request, env);
    }

    // Route: Pi5 updates job status
    const jobMatch = path.match(/^\/api\/jobs\/(T\d+)$/);
    if (method === "PATCH" && jobMatch) {
      return handleUpdateJob(request, env, jobMatch[1]);
    }
```

- [ ] **Step 5: Run tests**

```bash
npm run test
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/ onboarding-pipeline/cf-worker/test/
git commit -m "feat(plan-a): Pi5 job polling endpoints (get next + update status)"
```

---

### Task 7: Health Ping + Offline Alert

**Files:**
- Create: `onboarding-pipeline/cf-worker/src/handlers/health.ts`
- Create: `onboarding-pipeline/cf-worker/src/lib/alerts.ts`
- Create: `onboarding-pipeline/cf-worker/test/health.test.ts`
- Modify: `onboarding-pipeline/cf-worker/src/index.ts`

- [ ] **Step 1: Implement Telegram alert sender**

Create `src/lib/alerts.ts`:
```typescript
export async function sendTelegramAlert(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }),
  });
  return res.ok;
}
```

- [ ] **Step 2: Write the failing test**

Create `test/health.test.ts`:
```typescript
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
```

- [ ] **Step 3: Implement health handler**

Create `src/handlers/health.ts`:
```typescript
import { Env } from "../lib/types";
import { verifyWorkerToken, unauthorized, json } from "../lib/auth";
import { updateHealth, getHealth, markAlerted } from "../lib/db";
import { sendTelegramAlert } from "../lib/alerts";

export async function handleHealthPing(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  await updateHealth(env.DB);
  return json({ ok: true });
}

// Called on every incoming request to check if Pi5 is offline
// This is a lightweight check — reads one row from D1
export async function checkPi5Health(env: Env, ctx: ExecutionContext): Promise<void> {
  const health = await getHealth(env.DB);
  if (!health) return; // No health record yet — Pi5 hasn't pinged yet

  const lastPing = new Date(health.last_ping).getTime();
  const now = Date.now();
  const fifteenMin = 15 * 60 * 1000;

  if (now - lastPing > fifteenMin && !health.alerted) {
    // Pi5 is offline — send alert (non-blocking via waitUntil)
    ctx.waitUntil(
      sendTelegramAlert(
        env.OWNER_TELEGRAM_BOT_TOKEN,
        env.OWNER_TELEGRAM_CHAT_ID,
        "Pi5 offline — no health pings for 15+ minutes. CF Queue is holding orders."
      ).then(() => markAlerted(env.DB))
    );
  }
}
```

- [ ] **Step 4: Add route and health check to index.ts**

Update `src/index.ts`:
```typescript
import { handleHealthPing, checkPi5Health } from "./handlers/health";

// Inside fetch(), add at the TOP (before all routes):
    // Background: check Pi5 health on every request
    ctx.waitUntil(checkPi5Health(env, ctx));

// Add route after job routes:
    // Route: Pi5 health ping
    if (method === "POST" && path === "/api/health") {
      return handleHealthPing(request, env);
    }
```

- [ ] **Step 5: Run tests**

```bash
npm run test
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/ onboarding-pipeline/cf-worker/test/
git commit -m "feat(plan-a): health ping + Pi5 offline alert via Telegram"
```

---

### Task 8: Final Router + Deploy

**Files:**
- Modify: `onboarding-pipeline/cf-worker/src/index.ts` (final cleanup)

- [ ] **Step 1: Verify final index.ts is complete**

The final `src/index.ts` should look like this:
```typescript
import { Env } from "./lib/types";
import { handleWebhook } from "./handlers/webhook";
import { handleConfirm } from "./handlers/confirm";
import { handleGetNextJob, handleUpdateJob } from "./handlers/jobs";
import { handleHealthPing, checkPi5Health } from "./handlers/health";
import { json } from "./lib/auth";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Background: check Pi5 health on every request
    ctx.waitUntil(checkPi5Health(env, ctx));

    // Route: Lemon Squeezy webhook
    if (method === "POST" && path === "/api/webhook/lemonsqueezy") {
      return handleWebhook(request, env);
    }

    // Route: Manual confirm (FPS/PayMe)
    if (method === "POST" && path === "/api/confirm") {
      return handleConfirm(request, env);
    }

    // Route: Pi5 polls for next job
    if (method === "GET" && path === "/api/jobs/next") {
      return handleGetNextJob(request, env);
    }

    // Route: Pi5 updates job status
    const jobMatch = path.match(/^\/api\/jobs\/(T\d+)$/);
    if (method === "PATCH" && jobMatch) {
      return handleUpdateJob(request, env, jobMatch[1]);
    }

    // Route: Pi5 health ping
    if (method === "POST" && path === "/api/health") {
      return handleHealthPing(request, env);
    }

    // Catch-all
    return json({ error: "Not found", endpoints: [
      "POST /api/webhook/lemonsqueezy",
      "POST /api/confirm",
      "GET  /api/jobs/next",
      "PATCH /api/jobs/:id",
      "POST /api/health",
    ]}, 404);
  },
};
```

- [ ] **Step 2: Run all tests one final time**

```bash
cd onboarding-pipeline/cf-worker
npm run test
```

Expected: All tests PASS (webhook: 3, confirm: 3, jobs: 4, health: 2, db: 5 = ~17 tests).

- [ ] **Step 3: Create D1 database on Cloudflare**

```bash
wrangler d1 create nexgen-jobs
```

Expected output:
```
Created D1 database 'nexgen-jobs'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` and update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "nexgen-jobs"
database_id = "PASTE_ACTUAL_ID_HERE"
```

- [ ] **Step 4: Apply schema to remote D1**

```bash
npm run db:init:remote
```

Expected: Schema applied successfully.

- [ ] **Step 5: Set secrets**

```bash
wrangler secret put LEMONSQUEEZY_WEBHOOK_SECRET
# Paste your Lemon Squeezy webhook signing secret

wrangler secret put WORKER_TOKEN
# Paste the token generated in pre-work P4

wrangler secret put CONFIRM_API_KEY
# Paste the API key generated in pre-work P4

wrangler secret put OWNER_TELEGRAM_BOT_TOKEN
# Paste your personal OpenClaw bot token
```

- [ ] **Step 6: Configure DNS (Cloudflare dashboard)**

In Cloudflare dashboard for `3nexgen.com`:
1. Add DNS record: `AAAA api 100::` (proxied) — this is a placeholder; Workers route handles it
2. Or use: `CNAME api 3nexgen.com` (proxied)

The Workers route in `wrangler.toml` intercepts all `api.3nexgen.com/*` traffic.

- [ ] **Step 7: Deploy**

```bash
wrangler deploy
```

Expected:
```
Published nexgen-api (x.xx sec)
  https://nexgen-api.YOUR_SUBDOMAIN.workers.dev
  api.3nexgen.com/*
```

- [ ] **Step 8: Smoke test deployed Worker**

```bash
# Should return 404 with endpoint list
curl https://api.3nexgen.com/

# Should return 401 (no worker token)
curl https://api.3nexgen.com/api/jobs/next

# Should return 200 with null job (valid token, no jobs in queue)
curl -H "X-Worker-Token: YOUR_TOKEN" https://api.3nexgen.com/api/jobs/next
```

Expected: `{"job":null}`

- [ ] **Step 9: Commit**

```bash
git add onboarding-pipeline/cf-worker/
git commit -m "feat(plan-a): complete CF Worker — deployed to api.3nexgen.com"
```

---

## Post-completion

Plan A is complete when:
1. All 17+ tests pass locally
2. Worker is deployed to `api.3nexgen.com`
3. Smoke tests pass against live endpoint
4. D1 schema initialized with `next_id = 1043`

**Plan B depends on this.** The Pi5 worker polls the endpoints created here.
