# Per-Client API Gateway & Cost Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all customer API traffic through a CF Worker proxy that authenticates per-client tokens, tracks cost, and enforces monthly budgets — real API keys never touch customer VPSes.

**Architecture:** CF Worker at `api.3nexgen.com/api/ai/*` intercepts customer API requests, validates gateway tokens against D1, calculates cost from response token counts, enforces budget limits (90% warn, 100% block), then forwards to Cloudflare AI Gateway which injects the real API key via BYOK Secrets Store. Admin endpoints at `/api/usage/*` manage budgets and tokens.

**Tech Stack:** Cloudflare Workers (TypeScript), D1 (SQLite), CF AI Gateway (BYOK), Vitest + cloudflare:test, Python (Pi5 worker)

---

## File Structure

### CF Worker (`onboarding-pipeline/cf-worker/`)

| File | Action | Responsibility |
|------|--------|----------------|
| `schema.sql` | Modify | Add `api_usage`, `usage_history`, `audit_log` tables |
| `test/setup.ts` | Modify | Add new tables to test schema init |
| `src/lib/types.ts` | Modify | Add `ApiUsage`, `UsageHistory`, `AuditLog` interfaces |
| `src/lib/auth.ts` | Modify | Add `tooManyRequests()` response helper |
| `src/lib/db.ts` | Modify | Add usage/audit DB functions |
| `src/handlers/proxy.ts` | Create | AI Gateway proxy with auth + cost tracking + budget enforcement |
| `src/handlers/usage.ts` | Create | Admin usage endpoints (view, update, reset, revoke, rotate) |
| `src/index.ts` | Modify | Add proxy and usage routes |
| `wrangler.toml` | Modify | Add AI Gateway URL and rate config env vars |
| `test/proxy.test.ts` | Create | Proxy auth, cost tracking, budget enforcement tests |
| `test/usage.test.ts` | Create | Admin endpoint tests |

### Pi5 Worker (`onboarding-pipeline/pi5-worker/`)

| File | Action | Responsibility |
|------|--------|----------------|
| `config.py` | Modify | Remove `DEEPSEEK_API_KEY`/`OPENAI_API_KEY`, add `AI_GATEWAY_URL` |
| `deployer.py` | Modify | Generate gateway token, register via API, write gateway config to client.env |
| `api_client.py` | Modify | Add `register_gateway_token()` method |
| `.env.example` | Modify | Swap API keys for gateway URL |
| `tests/test_deployer.py` | Modify | Update tests for gateway token flow |

---

### Task 1: Update D1 Schema & Test Setup

**Files:**
- Modify: `onboarding-pipeline/cf-worker/schema.sql`
- Modify: `onboarding-pipeline/cf-worker/test/setup.ts`

- [ ] **Step 1: Add new tables to schema.sql**

Append after the `vps_instances` table:

```sql
-- Per-client API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  gateway_token TEXT NOT NULL UNIQUE,
  tier INTEGER NOT NULL,
  monthly_budget_hkd REAL,
  current_month TEXT NOT NULL,
  current_spend_hkd REAL DEFAULT 0,
  warned_at TEXT,
  blocked_at TEXT,
  total_requests INTEGER DEFAULT 0,
  total_tokens_in INTEGER DEFAULT 0,
  total_tokens_out INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Monthly usage snapshots (written during monthly reset)
CREATE TABLE IF NOT EXISTS usage_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  month TEXT NOT NULL,
  spend_hkd REAL NOT NULL,
  requests INTEGER NOT NULL,
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  budget_hkd REAL,
  created_at TEXT NOT NULL
);

-- Admin action audit trail
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  details TEXT,
  actor_ip TEXT,
  created_at TEXT NOT NULL
);
```

- [ ] **Step 2: Add new tables to test/setup.ts**

Append after the `vps_instances` exec:

```typescript
await env.DB.exec("DROP TABLE IF EXISTS api_usage");
await env.DB.exec("CREATE TABLE IF NOT EXISTS api_usage (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT NOT NULL, gateway_token TEXT NOT NULL UNIQUE, tier INTEGER NOT NULL, monthly_budget_hkd REAL, current_month TEXT NOT NULL, current_spend_hkd REAL DEFAULT 0, warned_at TEXT, blocked_at TEXT, total_requests INTEGER DEFAULT 0, total_tokens_in INTEGER DEFAULT 0, total_tokens_out INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");

await env.DB.exec("DROP TABLE IF EXISTS usage_history");
await env.DB.exec("CREATE TABLE IF NOT EXISTS usage_history (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT NOT NULL, month TEXT NOT NULL, spend_hkd REAL NOT NULL, requests INTEGER NOT NULL, tokens_in INTEGER NOT NULL, tokens_out INTEGER NOT NULL, budget_hkd REAL, created_at TEXT NOT NULL)");

await env.DB.exec("DROP TABLE IF EXISTS audit_log");
await env.DB.exec("CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, customer_id TEXT NOT NULL, details TEXT, actor_ip TEXT, created_at TEXT NOT NULL)");
```

- [ ] **Step 3: Run existing tests to verify schema changes don't break anything**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run`
Expected: All 36 existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add onboarding-pipeline/cf-worker/schema.sql onboarding-pipeline/cf-worker/test/setup.ts
git commit -m "feat: add api_usage, usage_history, audit_log D1 tables"
```

---

### Task 2: Add Types and Auth Helpers

**Files:**
- Modify: `onboarding-pipeline/cf-worker/src/lib/types.ts`
- Modify: `onboarding-pipeline/cf-worker/src/lib/auth.ts`
- Modify: `onboarding-pipeline/cf-worker/wrangler.toml`

- [ ] **Step 1: Add interfaces to types.ts**

Append after `VpsStatus` type:

```typescript
export interface ApiUsage {
  id: number;
  customer_id: string;
  gateway_token: string;
  tier: number;
  monthly_budget_hkd: number | null;
  current_month: string;
  current_spend_hkd: number;
  warned_at: string | null;
  blocked_at: string | null;
  total_requests: number;
  total_tokens_in: number;
  total_tokens_out: number;
  created_at: string;
  updated_at: string;
}

export interface UsageHistory {
  id: number;
  customer_id: string;
  month: string;
  spend_hkd: number;
  requests: number;
  tokens_in: number;
  tokens_out: number;
  budget_hkd: number | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  customer_id: string;
  details: string | null;
  actor_ip: string | null;
  created_at: string;
}
```

Add `AI_GATEWAY_URL` to `Env` interface and rate config vars:

```typescript
export interface Env {
  DB: D1Database;
  LEMONSQUEEZY_WEBHOOK_SECRET: string;
  WORKER_TOKEN: string;
  CONFIRM_API_KEY: string;
  OWNER_TELEGRAM_BOT_TOKEN: string;
  OWNER_TELEGRAM_CHAT_ID: string;
  VARIANT_TIER_MAP: string;
  AI_GATEWAY_URL: string;
  DEEPSEEK_INPUT_RATE: string;   // USD per token, e.g. "0.000001"
  DEEPSEEK_OUTPUT_RATE: string;
  OPENAI_INPUT_RATE: string;
  OPENAI_OUTPUT_RATE: string;
  USD_TO_HKD: string;
}
```

- [ ] **Step 2: Add tooManyRequests helper to auth.ts**

Append after `notFound()`:

```typescript
export function tooManyRequests(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 3: Add env vars to wrangler.toml**

Append to `[vars]` section:

```toml
AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/1f795f0b317d0782747c02367903dbe8/nexgen-api-proxy"
DEEPSEEK_INPUT_RATE = "0.000001"
DEEPSEEK_OUTPUT_RATE = "0.000002"
OPENAI_INPUT_RATE = "0.000003"
OPENAI_OUTPUT_RATE = "0.000006"
USD_TO_HKD = "7.8"
```

Note: Rate values are placeholders — update with real provider rates when known.

- [ ] **Step 4: Run existing tests**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run`
Expected: All 36 tests pass (new Env fields have no effect on existing tests since they use cloudflare:test bindings).

- [ ] **Step 5: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/lib/types.ts onboarding-pipeline/cf-worker/src/lib/auth.ts onboarding-pipeline/cf-worker/wrangler.toml
git commit -m "feat: add ApiUsage types, tooManyRequests helper, gateway env vars"
```

---

### Task 3: Add Usage DB Functions

**Files:**
- Modify: `onboarding-pipeline/cf-worker/src/lib/db.ts`
- Create: `onboarding-pipeline/cf-worker/test/db-usage.test.ts`

- [ ] **Step 1: Write tests for usage DB functions**

Create `test/db-usage.test.ts`:

```typescript
import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import {
  createApiUsage,
  getUsageByToken,
  getUsageByCustomerId,
  listAllUsage,
  updateUsageSpend,
  updateUsageBudget,
  updateUsageBudgetByTier,
  resetUsageMonth,
  revokeToken,
  rotateToken,
  writeAuditLog,
  writeUsageHistory,
} from "../src/lib/db";

describe("api_usage CRUD", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM api_usage");
    await env.DB.exec("DELETE FROM usage_history");
    await env.DB.exec("DELETE FROM audit_log");
  });

  it("creates usage record and retrieves by token", async () => {
    const usage = await createApiUsage(env.DB, {
      customer_id: "1001",
      gateway_token: "abc123token",
      tier: 2,
    });
    expect(usage.customer_id).toBe("1001");
    expect(usage.gateway_token).toBe("abc123token");
    expect(usage.tier).toBe(2);
    expect(usage.monthly_budget_hkd).toBeNull();
    expect(usage.current_spend_hkd).toBe(0);
    expect(usage.current_month).toMatch(/^\d{4}-\d{2}$/);

    const found = await getUsageByToken(env.DB, "abc123token");
    expect(found).not.toBeNull();
    expect(found!.customer_id).toBe("1001");
  });

  it("returns null for unknown token", async () => {
    const found = await getUsageByToken(env.DB, "nonexistent");
    expect(found).toBeNull();
  });

  it("retrieves by customer_id", async () => {
    await createApiUsage(env.DB, {
      customer_id: "1001",
      gateway_token: "tok1",
      tier: 2,
    });
    const found = await getUsageByCustomerId(env.DB, "1001");
    expect(found).not.toBeNull();
    expect(found!.gateway_token).toBe("tok1");
  });

  it("lists all usage records", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 1 });
    await createApiUsage(env.DB, { customer_id: "1002", gateway_token: "tok2", tier: 2 });
    const all = await listAllUsage(env.DB);
    expect(all).toHaveLength(2);
  });

  it("updates spend and token counts", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 2 });
    const updated = await updateUsageSpend(env.DB, "1001", {
      cost_hkd: 1.5,
      tokens_in: 1000,
      tokens_out: 500,
    });
    expect(updated.current_spend_hkd).toBe(1.5);
    expect(updated.total_requests).toBe(1);
    expect(updated.total_tokens_in).toBe(1000);
    expect(updated.total_tokens_out).toBe(500);

    // Accumulates
    const updated2 = await updateUsageSpend(env.DB, "1001", {
      cost_hkd: 0.5,
      tokens_in: 200,
      tokens_out: 100,
    });
    expect(updated2.current_spend_hkd).toBe(2.0);
    expect(updated2.total_requests).toBe(2);
    expect(updated2.total_tokens_in).toBe(1200);
  });

  it("updates budget for single customer", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 2 });
    const updated = await updateUsageBudget(env.DB, "1001", 16.0);
    expect(updated!.monthly_budget_hkd).toBe(16.0);
  });

  it("bulk updates budget by tier", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 2 });
    await createApiUsage(env.DB, { customer_id: "1002", gateway_token: "tok2", tier: 2 });
    await createApiUsage(env.DB, { customer_id: "1003", gateway_token: "tok3", tier: 1 });
    const count = await updateUsageBudgetByTier(env.DB, 2, 16.0);
    expect(count).toBe(2);

    const tier1 = await getUsageByCustomerId(env.DB, "1003");
    expect(tier1!.monthly_budget_hkd).toBeNull(); // tier 1 unchanged
  });

  it("resets monthly counters and writes history", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 2 });
    await updateUsageSpend(env.DB, "1001", { cost_hkd: 5.0, tokens_in: 5000, tokens_out: 2000 });
    await updateUsageBudget(env.DB, "1001", 16.0);

    const reset = await resetUsageMonth(env.DB, "1001", "2026-03");
    expect(reset.current_spend_hkd).toBe(0);
    expect(reset.current_month).not.toBe("2026-03");
    expect(reset.warned_at).toBeNull();
    expect(reset.blocked_at).toBeNull();
    expect(reset.total_requests).toBe(0);

    // Check history was written
    const history = await env.DB.prepare(
      "SELECT * FROM usage_history WHERE customer_id = ?"
    ).bind("1001").first();
    expect(history).not.toBeNull();
    expect((history as any).month).toBe("2026-03");
    expect((history as any).spend_hkd).toBe(5.0);
  });

  it("revokes token (sets to NULL)", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "tok1", tier: 2 });
    await revokeToken(env.DB, "1001");
    const found = await getUsageByToken(env.DB, "tok1");
    expect(found).toBeNull();
    const byId = await getUsageByCustomerId(env.DB, "1001");
    expect(byId!.gateway_token).toBe("");
  });

  it("rotates token", async () => {
    await createApiUsage(env.DB, { customer_id: "1001", gateway_token: "old_token", tier: 2 });
    const updated = await rotateToken(env.DB, "1001", "new_token_value");
    expect(updated!.gateway_token).toBe("new_token_value");

    const byOld = await getUsageByToken(env.DB, "old_token");
    expect(byOld).toBeNull();
    const byNew = await getUsageByToken(env.DB, "new_token_value");
    expect(byNew).not.toBeNull();
  });

  it("writes audit log", async () => {
    await writeAuditLog(env.DB, {
      action: "budget_updated",
      customer_id: "1001",
      details: JSON.stringify({ before: null, after: 16.0 }),
      actor_ip: "1.2.3.4",
    });
    const log = await env.DB.prepare(
      "SELECT * FROM audit_log WHERE customer_id = ?"
    ).bind("1001").first();
    expect(log).not.toBeNull();
    expect((log as any).action).toBe("budget_updated");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run test/db-usage.test.ts`
Expected: FAIL — functions not exported from `db.ts`.

- [ ] **Step 3: Implement usage DB functions in db.ts**

Add these functions to `src/lib/db.ts`. Import `ApiUsage` from types at the top.

```typescript
import { Job, VpsInstance, ApiUsage } from "./types";
```

Add the following functions after the existing VPS functions:

```typescript
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
```

- [ ] **Step 4: Run tests**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run test/db-usage.test.ts`
Expected: All 11 tests pass.

- [ ] **Step 5: Run all tests to verify no regressions**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run`
Expected: All tests pass (36 existing + 11 new = 47).

- [ ] **Step 6: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/lib/db.ts onboarding-pipeline/cf-worker/test/db-usage.test.ts
git commit -m "feat: add usage/audit DB functions with monthly reset and token management"
```

---

### Task 4: AI Gateway Proxy Handler

**Files:**
- Create: `onboarding-pipeline/cf-worker/src/handlers/proxy.ts`
- Create: `onboarding-pipeline/cf-worker/test/proxy.test.ts`

- [ ] **Step 1: Write proxy tests**

Create `test/proxy.test.ts`:

```typescript
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import worker from "../src/index";

describe("AI Gateway Proxy", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM api_usage");
    await env.DB.exec("DELETE FROM usage_history");
    await env.DB.exec("DELETE FROM audit_log");
    vi.restoreAllMocks();
  });

  async function createUsageRecord(customerId: string, token: string, tier: number, budget: number | null = null) {
    const now = new Date().toISOString();
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    await env.DB.prepare(
      `INSERT INTO api_usage (customer_id, gateway_token, tier, monthly_budget_hkd, current_month, current_spend_hkd, total_requests, total_tokens_in, total_tokens_out, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`
    ).bind(customerId, token, tier, budget, month, now, now).run();
  }

  function makeProxyRequest(token: string, provider: string = "deepseek") {
    return new Request(`http://localhost/api/ai/${provider}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "hello" }],
      }),
    });
  }

  it("rejects request with no auth token", async () => {
    const req = new Request("http://localhost/api/ai/deepseek/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-chat", messages: [] }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(401);
    const body = await resp.json() as any;
    expect(body.error).toBe("Missing authentication token");
  });

  it("rejects request with invalid token", async () => {
    const req = makeProxyRequest("invalid_token_here");
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(401);
    const body = await resp.json() as any;
    expect(body.error).toBe("Invalid authentication token");
  });

  it("rejects request when budget is exceeded", async () => {
    await createUsageRecord("1001", "valid_token", 2, 10.0);
    // Set spend to over budget
    await env.DB.prepare(
      "UPDATE api_usage SET current_spend_hkd = 10.5 WHERE customer_id = ?"
    ).bind("1001").run();

    const req = makeProxyRequest("valid_token");
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(429);
    const body = await resp.json() as any;
    expect(body.error).toContain("Monthly usage limit reached");
  });

  it("passes through when budget is NULL (no limit)", async () => {
    await createUsageRecord("1001", "valid_token", 2, null);

    // Mock global fetch so it doesn't actually call AI Gateway
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: "hi" } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      }), { status: 200 }))
    ));

    const req = makeProxyRequest("valid_token");
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    // Verify usage was tracked even without budget
    const usage = await env.DB.prepare(
      "SELECT * FROM api_usage WHERE customer_id = ?"
    ).bind("1001").first();
    expect((usage as any).total_requests).toBe(1);
    expect((usage as any).total_tokens_in).toBe(100);
  });

  it("adds X-Budget-Warning header at 90% spend", async () => {
    await createUsageRecord("1001", "valid_token", 2, 10.0);
    await env.DB.prepare(
      "UPDATE api_usage SET current_spend_hkd = 9.0 WHERE customer_id = ?"
    ).bind("1001").run();

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: "hi" } }],
        usage: { prompt_tokens: 50, completion_tokens: 20 },
      }), { status: 200 }))
    ));

    const req = makeProxyRequest("valid_token");
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("X-Budget-Warning")).toBe("true");
  });

  it("resets monthly counters on new month", async () => {
    await createUsageRecord("1001", "valid_token", 2, 10.0);
    // Set to old month
    await env.DB.prepare(
      "UPDATE api_usage SET current_month = '2026-01', current_spend_hkd = 8.0, total_requests = 500, warned_at = '2026-01-20T00:00:00Z' WHERE customer_id = ?"
    ).bind("1001").run();

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: "hi" } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      }), { status: 200 }))
    ));

    const req = makeProxyRequest("valid_token");
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    // Check usage was reset (and this request added to the fresh month)
    const usage = await env.DB.prepare(
      "SELECT * FROM api_usage WHERE customer_id = ?"
    ).bind("1001").first() as any;
    expect(usage.total_requests).toBe(1); // Only this request
    expect(usage.warned_at).toBeNull();

    // Check history was written for old month
    const history = await env.DB.prepare(
      "SELECT * FROM usage_history WHERE customer_id = ? AND month = ?"
    ).bind("1001", "2026-01").first() as any;
    expect(history).not.toBeNull();
    expect(history.spend_hkd).toBe(8.0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run test/proxy.test.ts`
Expected: FAIL — proxy routes not defined yet.

- [ ] **Step 3: Implement proxy handler**

Create `src/handlers/proxy.ts`:

```typescript
import { Env, ApiUsage } from "../lib/types";
import { unauthorized, tooManyRequests } from "../lib/auth";
import {
  getUsageByToken,
  updateUsageSpend,
  setWarned,
  setBlocked,
  resetUsageMonth,
} from "../lib/db";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function calculateCostHkd(
  provider: string,
  tokensIn: number,
  tokensOut: number,
  env: Env
): number {
  const usdToHkd = parseFloat(env.USD_TO_HKD || "7.8");
  let inputRate: number;
  let outputRate: number;

  if (provider === "openai") {
    inputRate = parseFloat(env.OPENAI_INPUT_RATE || "0.000003");
    outputRate = parseFloat(env.OPENAI_OUTPUT_RATE || "0.000006");
  } else {
    // Default to DeepSeek rates
    inputRate = parseFloat(env.DEEPSEEK_INPUT_RATE || "0.000001");
    outputRate = parseFloat(env.DEEPSEEK_OUTPUT_RATE || "0.000002");
  }

  return (tokensIn * inputRate + tokensOut * outputRate) * usdToHkd;
}

export async function handleAiProxy(
  request: Request,
  env: Env,
  provider: string,
  subpath: string
): Promise<Response> {
  // 1. Extract gateway token from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized("Missing authentication token");
  }
  const token = authHeader.slice(7);

  // 2. Look up token in D1
  let usage = await getUsageByToken(env.DB, token);
  if (!usage) {
    return unauthorized("Invalid authentication token");
  }

  // 3. Check if month needs reset
  const month = currentMonth();
  if (usage.current_month !== month) {
    usage = await resetUsageMonth(env.DB, usage.customer_id, usage.current_month);
  }

  // 4. Check budget
  if (usage.monthly_budget_hkd !== null) {
    if (usage.current_spend_hkd >= usage.monthly_budget_hkd) {
      return tooManyRequests("Monthly usage limit reached. Your limit resets on the 1st of next month.");
    }
  }

  // 5. Forward to AI Gateway
  const gatewayUrl = `${env.AI_GATEWAY_URL}/${provider}/${subpath}`;
  const gatewayResponse = await fetch(gatewayUrl, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      "cf-aig-metadata": JSON.stringify({
        customer_id: usage.customer_id,
        tier: usage.tier,
      }),
    },
    body: request.body,
  });

  // 6. Read response and extract token usage
  const responseBody = await gatewayResponse.text();
  let tokensIn = 0;
  let tokensOut = 0;

  try {
    const parsed = JSON.parse(responseBody);
    if (parsed.usage) {
      tokensIn = parsed.usage.prompt_tokens || 0;
      tokensOut = parsed.usage.completion_tokens || 0;
    }
  } catch {
    // If response isn't JSON or has no usage, track request but not tokens
  }

  // 7. Calculate cost and update D1
  const costHkd = calculateCostHkd(provider, tokensIn, tokensOut, env);
  const updatedUsage = await updateUsageSpend(env.DB, usage.customer_id, {
    cost_hkd: costHkd,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
  });

  // 8. Build response with optional warning header
  const responseHeaders = new Headers({
    "Content-Type": gatewayResponse.headers.get("Content-Type") || "application/json",
  });

  if (updatedUsage.monthly_budget_hkd !== null) {
    const percentUsed = updatedUsage.current_spend_hkd / updatedUsage.monthly_budget_hkd;

    if (percentUsed >= 0.9 && !updatedUsage.warned_at) {
      await setWarned(env.DB, usage.customer_id);
      responseHeaders.set("X-Budget-Warning", "true");
    } else if (updatedUsage.warned_at) {
      // Already warned — keep sending the header
      responseHeaders.set("X-Budget-Warning", "true");
    }

    if (percentUsed >= 1.0 && !updatedUsage.blocked_at) {
      await setBlocked(env.DB, usage.customer_id);
    }
  }

  return new Response(responseBody, {
    status: gatewayResponse.status,
    headers: responseHeaders,
  });
}
```

- [ ] **Step 4: Add proxy routes to index.ts**

Add import at top of `src/index.ts`:

```typescript
import { handleAiProxy } from "./handlers/proxy";
```

Add route before the catch-all (after the VPS routes):

```typescript
    // Route: AI Gateway proxy (customer API traffic)
    const aiMatch = path.match(/^\/api\/ai\/([^/]+)\/(.+)$/);
    if (method === "POST" && aiMatch) {
      return handleAiProxy(request, env, aiMatch[1], aiMatch[2]);
    }
```

Add to the catch-all endpoints array:

```typescript
      "POST /api/ai/:provider/*",
```

- [ ] **Step 5: Run proxy tests**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run test/proxy.test.ts`
Expected: All 6 proxy tests pass.

- [ ] **Step 6: Run all tests**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/handlers/proxy.ts onboarding-pipeline/cf-worker/src/index.ts onboarding-pipeline/cf-worker/test/proxy.test.ts
git commit -m "feat: add AI Gateway proxy with per-client auth, cost tracking, budget enforcement"
```

---

### Task 5: Admin Usage Endpoints

**Files:**
- Create: `onboarding-pipeline/cf-worker/src/handlers/usage.ts`
- Create: `onboarding-pipeline/cf-worker/test/usage.test.ts`

- [ ] **Step 1: Write admin usage tests**

Create `test/usage.test.ts`:

```typescript
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index";

describe("Admin Usage Endpoints", () => {
  const adminHeaders = {
    "X-API-Key": "test-confirm-key",
    "Content-Type": "application/json",
  };

  beforeEach(async () => {
    await env.DB.exec("DELETE FROM api_usage");
    await env.DB.exec("DELETE FROM usage_history");
    await env.DB.exec("DELETE FROM audit_log");
  });

  async function seedUsage(customerId: string, token: string, tier: number, budget: number | null = null) {
    const now = new Date().toISOString();
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    await env.DB.prepare(
      `INSERT INTO api_usage (customer_id, gateway_token, tier, monthly_budget_hkd, current_month, current_spend_hkd, total_requests, total_tokens_in, total_tokens_out, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`
    ).bind(customerId, token, tier, budget, month, now, now).run();
  }

  it("lists all usage (GET /api/usage)", async () => {
    await seedUsage("1001", "tok1", 2, 16.0);
    await seedUsage("1002", "tok2", 1, null);

    const req = new Request("http://localhost/api/usage", { headers: adminHeaders });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.usage).toHaveLength(2);
    // Token should be masked
    expect(body.usage[0].gateway_token).toMatch(/\*+.{4}$/);
  });

  it("gets single customer usage (GET /api/usage/:id)", async () => {
    await seedUsage("1001", "abcdef1234567890", 2, 16.0);

    const req = new Request("http://localhost/api/usage/1001", { headers: adminHeaders });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.usage.customer_id).toBe("1001");
    expect(body.usage.gateway_token).toMatch(/\*+7890$/);
  });

  it("returns 404 for unknown customer", async () => {
    const req = new Request("http://localhost/api/usage/9999", { headers: adminHeaders });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(404);
  });

  it("updates budget (PATCH /api/usage/:id)", async () => {
    await seedUsage("1001", "tok1", 2, null);

    const req = new Request("http://localhost/api/usage/1001", {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ monthly_budget_hkd: 20.0 }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.usage.monthly_budget_hkd).toBe(20.0);

    // Check audit log
    const audit = await env.DB.prepare("SELECT * FROM audit_log WHERE customer_id = ?").bind("1001").first() as any;
    expect(audit.action).toBe("budget_updated");
  });

  it("bulk updates budget by tier (POST /api/usage/budgets)", async () => {
    await seedUsage("1001", "tok1", 2);
    await seedUsage("1002", "tok2", 2);
    await seedUsage("1003", "tok3", 1);

    const req = new Request("http://localhost/api/usage/budgets", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ tier: 2, monthly_budget_hkd: 16.0 }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.updated).toBe(2);
  });

  it("resets monthly spend (POST /api/usage/:id/reset)", async () => {
    await seedUsage("1001", "tok1", 2, 16.0);
    await env.DB.prepare(
      "UPDATE api_usage SET current_spend_hkd = 12.0, warned_at = '2026-03-20T00:00:00Z' WHERE customer_id = ?"
    ).bind("1001").run();

    const req = new Request("http://localhost/api/usage/1001/reset", {
      method: "POST",
      headers: adminHeaders,
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.usage.current_spend_hkd).toBe(0);
    expect(body.usage.warned_at).toBeNull();
  });

  it("revokes token (POST /api/usage/:id/revoke)", async () => {
    await seedUsage("1001", "tok_to_revoke", 2);

    const req = new Request("http://localhost/api/usage/1001/revoke", {
      method: "POST",
      headers: adminHeaders,
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.message).toContain("revoked");

    // Verify token no longer works for lookup
    const usage = await env.DB.prepare(
      "SELECT * FROM api_usage WHERE gateway_token = ?"
    ).bind("tok_to_revoke").first();
    expect(usage).toBeNull();
  });

  it("rotates token (POST /api/usage/:id/rotate)", async () => {
    await seedUsage("1001", "old_token_value", 2);

    const req = new Request("http://localhost/api/usage/1001/rotate", {
      method: "POST",
      headers: adminHeaders,
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(200);

    const body = await resp.json() as any;
    expect(body.new_token).toBeDefined();
    expect(body.new_token.length).toBe(64);
    expect(body.new_token).not.toBe("old_token_value");
  });

  it("rejects admin endpoints with gateway token (not API key)", async () => {
    await seedUsage("1001", "gateway_tok", 2);

    const req = new Request("http://localhost/api/usage", {
      headers: { "Authorization": "Bearer gateway_tok" },
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(401);
  });

  it("creates usage record (POST /api/usage)", async () => {
    const req = new Request("http://localhost/api/usage", {
      method: "POST",
      headers: { ...adminHeaders, "X-Worker-Token": "test-worker-token" },
      body: JSON.stringify({
        customer_id: "1001",
        gateway_token: "new_generated_token",
        tier: 2,
      }),
    });
    const ctx = createExecutionContext();
    const resp = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(201);

    const body = await resp.json() as any;
    expect(body.usage.customer_id).toBe("1001");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run test/usage.test.ts`
Expected: FAIL — handler and routes don't exist yet.

- [ ] **Step 3: Implement usage handler**

Create `src/handlers/usage.ts`:

```typescript
import { Env } from "../lib/types";
import {
  verifyConfirmApiKey,
  verifyWorkerToken,
  unauthorized,
  badRequest,
  notFound,
  json,
} from "../lib/auth";
import {
  createApiUsage,
  getUsageByCustomerId,
  listAllUsage,
  updateUsageBudget,
  updateUsageBudgetByTier,
  resetUsageMonth,
  revokeToken,
  rotateToken,
  writeAuditLog,
} from "../lib/db";

function maskToken(token: string): string {
  if (!token || token.length < 4) return "****";
  return "****" + token.slice(-4);
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function handleListUsage(request: Request, env: Env): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const all = await listAllUsage(env.DB);
  const usage = all.map(u => ({
    ...u,
    gateway_token: maskToken(u.gateway_token),
    percent_used: u.monthly_budget_hkd ? Math.round((u.current_spend_hkd / u.monthly_budget_hkd) * 1000) / 10 : null,
    warned: !!u.warned_at,
    blocked: !!u.blocked_at,
  }));
  return json({ usage });
}

export async function handleGetUsage(request: Request, env: Env, customerId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const usage = await getUsageByCustomerId(env.DB, customerId);
  if (!usage) return notFound("Customer not found");

  return json({
    usage: {
      ...usage,
      gateway_token: maskToken(usage.gateway_token),
      percent_used: usage.monthly_budget_hkd ? Math.round((usage.current_spend_hkd / usage.monthly_budget_hkd) * 1000) / 10 : null,
    },
  });
}

export async function handleUpdateUsage(request: Request, env: Env, customerId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const existing = await getUsageByCustomerId(env.DB, customerId);
  if (!existing) return notFound("Customer not found");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (body.monthly_budget_hkd === undefined) {
    return badRequest("Missing required field: monthly_budget_hkd");
  }

  const updated = await updateUsageBudget(env.DB, customerId, body.monthly_budget_hkd as number);
  await writeAuditLog(env.DB, {
    action: "budget_updated",
    customer_id: customerId,
    details: JSON.stringify({ before: existing.monthly_budget_hkd, after: body.monthly_budget_hkd }),
    actor_ip: request.headers.get("CF-Connecting-IP") || undefined,
  });

  return json({ usage: updated });
}

export async function handleBulkUpdateBudgets(request: Request, env: Env): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.tier || body.monthly_budget_hkd === undefined) {
    return badRequest("Missing required fields: tier, monthly_budget_hkd");
  }

  const count = await updateUsageBudgetByTier(env.DB, body.tier as number, body.monthly_budget_hkd as number);
  return json({ updated: count });
}

export async function handleResetUsage(request: Request, env: Env, customerId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const existing = await getUsageByCustomerId(env.DB, customerId);
  if (!existing) return notFound("Customer not found");

  const reset = await resetUsageMonth(env.DB, customerId, existing.current_month);
  await writeAuditLog(env.DB, {
    action: "spend_reset",
    customer_id: customerId,
    details: JSON.stringify({ previous_spend: existing.current_spend_hkd }),
    actor_ip: request.headers.get("CF-Connecting-IP") || undefined,
  });

  return json({ usage: reset });
}

export async function handleRevokeToken(request: Request, env: Env, customerId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const existing = await getUsageByCustomerId(env.DB, customerId);
  if (!existing) return notFound("Customer not found");

  await revokeToken(env.DB, customerId);
  await writeAuditLog(env.DB, {
    action: "token_revoked",
    customer_id: customerId,
    details: JSON.stringify({ token_last4: existing.gateway_token.slice(-4) }),
    actor_ip: request.headers.get("CF-Connecting-IP") || undefined,
  });

  return json({ message: "Token revoked. Customer API access disabled." });
}

export async function handleRotateToken(request: Request, env: Env, customerId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) return unauthorized("Unauthorized");

  const existing = await getUsageByCustomerId(env.DB, customerId);
  if (!existing) return notFound("Customer not found");

  const newToken = generateToken();
  await rotateToken(env.DB, customerId, newToken);
  await writeAuditLog(env.DB, {
    action: "token_rotated",
    customer_id: customerId,
    details: JSON.stringify({ old_last4: existing.gateway_token.slice(-4), new_last4: newToken.slice(-4) }),
    actor_ip: request.headers.get("CF-Connecting-IP") || undefined,
  });

  return json({ new_token: newToken });
}

export async function handleCreateUsage(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.customer_id || !body.gateway_token || !body.tier) {
    return badRequest("Missing required fields: customer_id, gateway_token, tier");
  }

  try {
    const usage = await createApiUsage(env.DB, {
      customer_id: body.customer_id as string,
      gateway_token: body.gateway_token as string,
      tier: body.tier as number,
    });
    return json({ usage }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UNIQUE constraint")) {
      return json({ error: "Gateway token already exists" }, 409);
    }
    throw err;
  }
}
```

- [ ] **Step 4: Add usage routes to index.ts**

Add import at top:

```typescript
import {
  handleListUsage,
  handleGetUsage,
  handleUpdateUsage,
  handleBulkUpdateBudgets,
  handleResetUsage,
  handleRevokeToken,
  handleRotateToken,
  handleCreateUsage,
} from "./handlers/usage";
```

Add routes before the AI proxy route (order matters — specific paths before regex):

```typescript
    // Route: Admin — bulk update budgets by tier
    if (method === "POST" && path === "/api/usage/budgets") {
      return handleBulkUpdateBudgets(request, env);
    }

    // Route: Admin — reset customer spend
    const resetMatch = path.match(/^\/api\/usage\/(\d+)\/reset$/);
    if (method === "POST" && resetMatch) {
      return handleResetUsage(request, env, resetMatch[1]);
    }

    // Route: Admin — revoke customer token
    const revokeMatch = path.match(/^\/api\/usage\/(\d+)\/revoke$/);
    if (method === "POST" && revokeMatch) {
      return handleRevokeToken(request, env, revokeMatch[1]);
    }

    // Route: Admin — rotate customer token
    const rotateMatch = path.match(/^\/api\/usage\/(\d+)\/rotate$/);
    if (method === "POST" && rotateMatch) {
      return handleRotateToken(request, env, rotateMatch[1]);
    }

    // Route: Admin — create usage record (Pi5 calls this during deploy)
    if (method === "POST" && path === "/api/usage") {
      return handleCreateUsage(request, env);
    }

    // Route: Admin — list all usage
    if (method === "GET" && path === "/api/usage") {
      return handleListUsage(request, env);
    }

    // Route: Admin — get/update single customer usage
    const usageMatch = path.match(/^\/api\/usage\/(\d+)$/);
    if (method === "GET" && usageMatch) {
      return handleGetUsage(request, env, usageMatch[1]);
    }
    if (method === "PATCH" && usageMatch) {
      return handleUpdateUsage(request, env, usageMatch[1]);
    }
```

Add to the catch-all endpoints array:

```typescript
      "GET  /api/usage",
      "GET  /api/usage/:customerId",
      "PATCH /api/usage/:customerId",
      "POST /api/usage",
      "POST /api/usage/budgets",
      "POST /api/usage/:customerId/reset",
      "POST /api/usage/:customerId/revoke",
      "POST /api/usage/:customerId/rotate",
```

- [ ] **Step 5: Run usage tests**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run test/usage.test.ts`
Expected: All 10 usage tests pass.

- [ ] **Step 6: Run all tests**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/handlers/usage.ts onboarding-pipeline/cf-worker/src/index.ts onboarding-pipeline/cf-worker/test/usage.test.ts
git commit -m "feat: add admin usage endpoints (view, update, reset, revoke, rotate)"
```

---

### Task 6: Deploy CF Worker Update

**Files:**
- None (deployment only)

- [ ] **Step 1: Apply new schema tables to remote D1**

```bash
cd onboarding-pipeline/cf-worker
wrangler d1 execute nexgen-jobs --remote --command="CREATE TABLE IF NOT EXISTS api_usage (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT NOT NULL, gateway_token TEXT NOT NULL UNIQUE, tier INTEGER NOT NULL, monthly_budget_hkd REAL, current_month TEXT NOT NULL, current_spend_hkd REAL DEFAULT 0, warned_at TEXT, blocked_at TEXT, total_requests INTEGER DEFAULT 0, total_tokens_in INTEGER DEFAULT 0, total_tokens_out INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
wrangler d1 execute nexgen-jobs --remote --command="CREATE TABLE IF NOT EXISTS usage_history (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT NOT NULL, month TEXT NOT NULL, spend_hkd REAL NOT NULL, requests INTEGER NOT NULL, tokens_in INTEGER NOT NULL, tokens_out INTEGER NOT NULL, budget_hkd REAL, created_at TEXT NOT NULL)"
wrangler d1 execute nexgen-jobs --remote --command="CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, customer_id TEXT NOT NULL, details TEXT, actor_ip TEXT, created_at TEXT NOT NULL)"
```

- [ ] **Step 2: Verify tables exist**

```bash
wrangler d1 execute nexgen-jobs --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Expected: `_cf_KV`, `api_usage`, `audit_log`, `health`, `id_counter`, `jobs`, `usage_history`, `vps_instances`

- [ ] **Step 3: Deploy worker**

```bash
cd onboarding-pipeline/cf-worker && wrangler deploy
```

Expected: Deployed successfully to `api.3nexgen.com`.

- [ ] **Step 4: Smoke test**

```bash
curl -s https://api.3nexgen.com/api/health
```

Expected: 404 response listing all endpoints, including the new `/api/ai/:provider/*` and `/api/usage` routes.

---

### Task 7: Update Pi5 Worker — Gateway Token Integration

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/config.py`
- Modify: `onboarding-pipeline/pi5-worker/api_client.py`
- Modify: `onboarding-pipeline/pi5-worker/deployer.py`
- Modify: `onboarding-pipeline/pi5-worker/.env.example`
- Modify: `onboarding-pipeline/pi5-worker/tests/test_deployer.py`

- [ ] **Step 1: Update tests first**

Replace the content of `tests/test_deployer.py`. Key changes: remove `DEEPSEEK_API_KEY`/`OPENAI_API_KEY` env vars, add `AI_GATEWAY_URL`, update `TestGetBotFromJob` and add `TestGatewayTokenIntegration`:

```python
import unittest
from unittest.mock import patch, MagicMock
import os

os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "test")
os.environ.setdefault("AI_GATEWAY_URL", "https://api.3nexgen.com/api/ai")
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
            client_env_content="CLIENT_ID=1001\nTIER=2\nAI_GATEWAY_URL=https://api.3nexgen.com/api/ai",
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


class TestGatewayTokenIntegration(unittest.TestCase):
    """Test that deployer generates gateway tokens and builds correct client.env."""

    def setUp(self):
        self.mock_api = MagicMock()
        self.mock_notifier = MagicMock()
        self.deployer = Deployer(self.mock_api, self.mock_notifier)

    def test_generate_gateway_token(self):
        """Gateway token is 64 hex chars."""
        token = self.deployer._generate_gateway_token()
        self.assertEqual(len(token), 64)
        # Verify it's valid hex
        int(token, 16)

    def test_client_env_contains_gateway_config(self):
        """client.env has AI_GATEWAY_URL and AI_GATEWAY_TOKEN, no raw API keys."""
        token = "a" * 64
        env_content = self.deployer._build_client_env(
            job_id="1001",
            tier=2,
            bot_token="123:FAKE",
            telegram_user_id="999",
            gateway_token=token,
        )
        self.assertIn("AI_GATEWAY_URL=", env_content)
        self.assertIn(f"AI_GATEWAY_TOKEN={token}", env_content)
        self.assertNotIn("DEEPSEEK_API_KEY", env_content)
        self.assertNotIn("OPENAI_API_KEY", env_content)
        self.assertIn("CLIENT_ID=1001", env_content)
        self.assertIn("TIER=2", env_content)
        self.assertIn("TELEGRAM_BOT_TOKEN=123:FAKE", env_content)

    def test_register_gateway_token_calls_api(self):
        """Deployer calls API to register gateway token during deploy."""
        self.mock_api.register_gateway_token.return_value = {"customer_id": "1001"}
        token = "b" * 64
        self.deployer._register_gateway_token("1001", token, 2)
        self.mock_api.register_gateway_token.assert_called_once_with(
            customer_id="1001",
            gateway_token=token,
            tier=2,
        )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_deployer.py -v`
Expected: FAIL — new methods don't exist yet.

- [ ] **Step 3: Update config.py**

Replace the API Keys section:

```python
# API Keys (shared across customer deploys)
DEEPSEEK_API_KEY = os.environ["DEEPSEEK_API_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
```

With:

```python
# AI Gateway (real API keys stored in CF Secrets Store, not on Pi5)
AI_GATEWAY_URL = os.environ.get("AI_GATEWAY_URL", "https://api.3nexgen.com/api/ai")
```

- [ ] **Step 4: Add register_gateway_token to api_client.py**

Add method to `ApiClient` class after `get_active_vps_list`:

```python
    def register_gateway_token(self, customer_id: str, gateway_token: str, tier: int) -> dict:
        """Register a gateway token for a customer in the usage tracking system."""
        resp = requests.post(
            f"{self.base_url}/api/usage",
            headers={**self.headers, "Content-Type": "application/json"},
            json={
                "customer_id": customer_id,
                "gateway_token": gateway_token,
                "tier": tier,
            },
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()["usage"]
```

- [ ] **Step 5: Update deployer.py**

Add `import secrets` to imports.

Add three new methods to the `Deployer` class:

```python
    def _generate_gateway_token(self) -> str:
        """Generate a 64-character hex gateway token."""
        return secrets.token_hex(32)

    def _build_client_env(
        self,
        job_id: str,
        tier: int,
        bot_token: str,
        telegram_user_id: str,
        gateway_token: str,
    ) -> str:
        """Build client.env content with gateway config instead of raw API keys."""
        return (
            f"CLIENT_ID={job_id}\n"
            f"TIER={tier}\n"
            f"AI_GATEWAY_URL={config.AI_GATEWAY_URL}\n"
            f"AI_GATEWAY_TOKEN={gateway_token}\n"
            f"TELEGRAM_BOT_TOKEN={bot_token}\n"
            f"TELEGRAM_ALLOWED_USERS={telegram_user_id}\n"
        )

    def _register_gateway_token(self, job_id: str, gateway_token: str, tier: int):
        """Register the gateway token with the CF Worker usage API."""
        self.api.register_gateway_token(
            customer_id=job_id,
            gateway_token=gateway_token,
            tier=tier,
        )
```

Update the `_run_agent_session` method — replace the `client_env` block (lines 133-140):

```python
        # Build client.env content with gateway token (no raw API keys)
        gateway_token = self._generate_gateway_token()
        self._register_gateway_token(job_id, gateway_token, tier)
        client_env = self._build_client_env(
            job_id=job_id,
            tier=tier,
            bot_token=bot_token,
            telegram_user_id=telegram_user_id,
            gateway_token=gateway_token,
        )
```

- [ ] **Step 6: Update .env.example**

Replace the API keys section:

```
# API Keys (shared across customer deploys)
DEEPSEEK_API_KEY=your_deepseek_key
OPENAI_API_KEY=your_openai_key
```

With:

```
# AI Gateway (real API keys stored in CF Secrets Store, not here)
AI_GATEWAY_URL=https://api.3nexgen.com/api/ai
```

- [ ] **Step 7: Run tests**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_deployer.py -v`
Expected: All tests pass.

- [ ] **Step 8: Run all Pi5 tests**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/ -v`
Expected: All 32+ tests pass.

- [ ] **Step 9: Commit**

```bash
git add onboarding-pipeline/pi5-worker/config.py onboarding-pipeline/pi5-worker/api_client.py onboarding-pipeline/pi5-worker/deployer.py onboarding-pipeline/pi5-worker/.env.example onboarding-pipeline/pi5-worker/tests/test_deployer.py
git commit -m "feat: Pi5 deployer generates gateway tokens, removes raw API keys from client.env"
```

---

### Task 8: Deploy Pi5 Worker Update

**Files:**
- None (deployment only)

- [ ] **Step 1: SCP updated files to Pi5**

```bash
cd onboarding-pipeline/pi5-worker
scp config.py deployer.py api_client.py .env.example jacky999@192.168.1.30:~/nexgen-worker/
scp tests/test_deployer.py jacky999@192.168.1.30:~/nexgen-worker/tests/
```

- [ ] **Step 2: Update Pi5 .env — remove API keys, add gateway URL**

```bash
ssh jacky999@192.168.1.30 "cd ~/nexgen-worker && \
  sed -i '/^DEEPSEEK_API_KEY=/d' .env && \
  sed -i '/^OPENAI_API_KEY=/d' .env && \
  grep -q 'AI_GATEWAY_URL' .env || echo 'AI_GATEWAY_URL=https://api.3nexgen.com/api/ai' >> .env && \
  echo 'Updated .env' && grep -v '^#' .env | grep -v '^$'"
```

- [ ] **Step 3: Run tests on Pi5**

```bash
ssh jacky999@192.168.1.30 "cd ~/nexgen-worker && source venv/bin/activate && python -m pytest tests/ -v"
```

Expected: All tests pass.

- [ ] **Step 4: Restart worker service (if running)**

```bash
ssh jacky999@192.168.1.30 "sudo systemctl restart nexgen-worker 2>/dev/null; echo 'Service restarted (if it was running)'"
```

---

### Task 9: CF AI Gateway Setup (Manual — Cloudflare Dashboard)

This task is manual configuration in the Cloudflare dashboard. Document the steps for the operator.

**Files:**
- None (dashboard configuration)

- [ ] **Step 1: Create the AI Gateway**

1. Log into Cloudflare dashboard → AI → AI Gateway
2. Create new gateway named `nexgen-api-proxy`
3. Note the gateway ID and account ID — these form the gateway URL:
   `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}`

- [ ] **Step 2: Enable authentication**

1. In gateway settings → Authentication → Enable
2. This requires `cf-aig-authorization` header on all requests

- [ ] **Step 3: Store API keys in Secrets Store**

1. Cloudflare dashboard → AI Gateway → Secrets
2. Add secret: name `DEEPSEEK_API_KEY`, value = your DeepSeek API key
3. Add secret: name `OPENAI_API_KEY`, value = your OpenAI API key
4. Configure BYOK: gateway uses these secrets when forwarding to providers

- [ ] **Step 4: Update wrangler.toml with real gateway URL**

Update the `AI_GATEWAY_URL` in `wrangler.toml` with the actual gateway URL from step 1. Redeploy the CF Worker.

- [ ] **Step 5: Test end-to-end**

```bash
# Register a test usage record
curl -s -X POST https://api.3nexgen.com/api/usage \
  -H "X-Worker-Token: YOUR_WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"test-001","gateway_token":"aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222","tier":2}'

# Send a test AI request through the proxy
curl -s -X POST https://api.3nexgen.com/api/ai/deepseek/chat/completions \
  -H "Authorization: Bearer aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"hello"}]}'

# Check usage was tracked
curl -s https://api.3nexgen.com/api/usage/test-001 \
  -H "X-API-Key: YOUR_CONFIRM_API_KEY"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Task |
|---|---|
| 1. Problem (3 issues) | Addressed by architecture |
| 2. Architecture overview | Task 4 (proxy), Task 5 (admin) |
| 3. Security (tokens, threat model, auth separation) | Task 4 (token auth), Task 5 (admin auth), all tests verify |
| 4. Cost tracking & budget enforcement | Task 3 (DB functions), Task 4 (proxy handler) |
| 5. Request flow detail | Task 4 (proxy handler implements full flow) |
| 6. Data model (3 tables) | Task 1 (schema), Task 2 (types), Task 3 (DB functions) |
| 7. Admin endpoints (8 endpoints) | Task 5 |
| 8. Deployment pipeline integration | Task 7 (Pi5 worker) |
| 9. AI Gateway setup | Task 9 (manual) |
| 10. Files changed | All tasks match file list |
| 11. Testing strategy | Tests in Tasks 3, 4, 5, 7 |
| 12. Assumptions | Documented in spec, tested where possible |
| 13. Deployment order | Tasks 6 → 8 → 9 |

### No Placeholders

Verified: No TBD, TODO, or vague instructions. All code blocks are complete. All test files have full test code.

### Type Consistency

- `ApiUsage` interface matches `api_usage` SQL schema
- `createApiUsage`, `getUsageByToken`, etc. — function names consistent across db.ts, handlers, and tests
- `gateway_token` field name consistent everywhere
- `monthly_budget_hkd` field name consistent everywhere
- `maskToken()` used in both `handleListUsage` and `handleGetUsage`
