# Per-Client API Gateway & Cost Control Design

**Date:** 2026-03-28
**Status:** Draft
**Related specs:**
- `2026-03-27-pipeline-v2-bot-and-recycling-design.md` (deployment pipeline)
- `2026-03-27-contabo-vps-billing-strategy-design.md` (VPS lifecycle)

---

## 1. Problem

Currently, every customer VPS receives the same master DeepSeek and OpenAI API keys. This creates two issues:

**No cost control.** A customer can send unlimited API requests. Since the monthly fee is all-inclusive, a single heavy user could consume more API cost than their entire subscription fee. There is no mechanism to enforce limits.

**No visibility.** There is no way to see how much each customer costs in API usage. Without this data, pricing decisions are guesswork.

**No key isolation.** If any customer's VPS is compromised, the attacker gets the master API key — affecting all customers. Revoking the key requires redeploying to every VPS.

---

## 2. Solution: Centralized API Proxy

Route all customer API traffic through a Cloudflare AI Gateway, fronted by a CF Worker that enforces per-client cost limits.

### Architecture

```
Customer VPS (OpenClaw)
  → CF Worker (rate limiter + cost tracker)
    → CF AI Gateway (BYOK — injects real API key)
      → DeepSeek API / OpenAI API
      ← response with token counts
    ← CF Worker reads tokens, updates D1 spend
  ← response to customer (with budget warning header if applicable)
```

### What lives where

| Component | Responsibility |
|---|---|
| **CF AI Gateway** | Key storage (BYOK via Secrets Store), request forwarding, caching, fallback routing |
| **CF Worker** | Per-client authentication, cost tracking, budget enforcement, admin API |
| **D1** | `api_usage` table (per-client monthly spend), `audit_log` table |
| **Customer VPS** | Gateway token + gateway URL only. No real API keys. |
| **Pi5** | Deployment orchestration only. No involvement in day-to-day API traffic. |

### Why this architecture

- **Reliability:** Customer API traffic goes through Cloudflare's edge (99.9%+ uptime), not through the Pi5's home network. If the Pi5 goes down, existing customers keep working.
- **Security:** Real API keys exist only in Cloudflare Secrets Store. Customer VPS never has them.
- **Cost:** Cloudflare AI Gateway is free (100K logs/month). No extra servers needed.
- **Control:** CF Worker has full programmatic control over every request — per-client limits, logging, blocking.

---

## 3. Customer Authentication & Security

### Per-customer gateway tokens

Each customer gets a unique 64-character hex token (256-bit, generated via `secrets.token_hex(32)`). This token is the customer's sole credential for API access.

```
Customer VPS sends:
  POST https://api.3nexgen.com/api/ai/deepseek/chat/completions
  Header: Authorization: Bearer {gateway_token}

CF Worker then forwards to AI Gateway:
  POST https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/deepseek/chat/completions
  Header: cf-aig-authorization: Bearer {secrets_store_key}
  Header: cf-aig-metadata: {"customer_id": "1001"}   ← set by Worker, NOT by customer
```

The customer VPS never communicates with the AI Gateway directly. All traffic goes through the CF Worker at `api.3nexgen.com`, which authenticates the customer, checks budget, then forwards to the AI Gateway.

### Token → identity mapping

The CF Worker maps `gateway_token → customer_id` server-side via D1 lookup. The customer cannot choose or fake their identity. The Worker:

1. Extracts token from `Authorization: Bearer` header
2. Looks up token in `api_usage` table → gets `customer_id`, `tier`, budget, spend
3. If token not found → `401 Unauthorized`
4. Sets `cf-aig-metadata` header with customer_id (for AI Gateway logging)
5. Customer-supplied metadata headers are stripped/ignored

### Threat model

| Threat | Defence |
|---|---|
| Fake another customer's ID | Token IS the identity — mapped server-side. Customer can't choose their ID. |
| Steal another customer's token | Tokens are unique per customer. Revoke one token without affecting others. |
| Bypass proxy to hit API directly | Real API key only in CF Secrets Store. Never on any VPS. Impossible to bypass. |
| Header injection | Worker ignores customer-supplied metadata. Derives customer_id from token lookup only. |
| Brute-force tokens | 256-bit tokens. Rate limiting: 5 failed auth per minute per IP → 10 min block. |
| Replay/share token | One token per customer. Unusual volume from one token → investigate. Token rotation available. |
| Compromised VPS | Attacker gets only that customer's gateway token, which can only hit the proxy. Cannot access admin endpoints, other customers' data, or real API keys. |

### Auth separation

| Endpoint type | Auth method | Access |
|---|---|---|
| AI Gateway proxy (customer traffic) | `gateway_token` per customer | Customer VPS only |
| Admin read (`GET /api/usage`) | `CONFIRM_API_KEY` header | Operator only |
| Admin write (`PATCH`, `POST`, `DELETE`) | `CONFIRM_API_KEY` header | Operator only |

Gateway tokens cannot access admin endpoints. Admin keys cannot access the proxy route. Routes are checked first, then the correct auth is applied.

---

## 4. Cost Tracking & Budget Enforcement

### How it works

Every API request passes through the CF Worker. On the response path, the Worker:

1. Reads `prompt_tokens` and `completion_tokens` from the API response `usage` field
2. Calculates cost: `(prompt_tokens × input_rate) + (completion_tokens × output_rate)`
3. Updates the customer's running total in D1
4. Checks against budget thresholds

### Provider rates (configurable in Worker env vars)

```
DEEPSEEK_INPUT_RATE_PER_TOKEN=0.000001    # USD per token (example — update with real rates)
DEEPSEEK_OUTPUT_RATE_PER_TOKEN=0.000002
OPENAI_INPUT_RATE_PER_TOKEN=0.000003
OPENAI_OUTPUT_RATE_PER_TOKEN=0.000006
USD_TO_HKD=7.8
```

Rates are stored as Worker environment variables, updated when providers change pricing.

### Budget enforcement

Each customer has a `monthly_budget_hkd` value (configurable per customer or per tier).

| Spend level | Action |
|---|---|
| < 90% of budget | Pass through normally |
| 90% - 99% of budget | Pass through + set `X-Budget-Warning: true` response header |
| >= 100% of budget | Reject with `429` and body: `{"error": "Monthly usage limit reached. Your limit resets on the 1st of next month."}` |
| Budget is NULL | Pass through, track usage without enforcing limits (for pre-pricing data collection) |

When the 90% threshold is crossed, `warned_at` is set. OpenClaw on the VPS reads the `X-Budget-Warning` header and shows the customer: "You have used 90% of your monthly usage limit."

When the 100% threshold is crossed, `blocked_at` is set.

All messages in English.

### Monthly reset

When the first request of a new month arrives for a customer, the Worker:

1. Logs the previous month's totals (customer_id, month, spend, requests, tokens)
2. Resets `current_spend_hkd` to 0
3. Clears `warned_at` and `blocked_at`
4. Updates `current_month` to the new month

### Budget values

Budget values are TBD until real cost testing is complete. Until set, the proxy tracks all usage without enforcing limits. This provides the data needed to make informed pricing decisions.

---

## 5. CF Worker Request Flow

### Proxy route (customer API traffic)

```
POST /api/ai/{provider}/chat/completions

1. Extract gateway_token from Authorization: Bearer header
2. If no token → 401 "Missing authentication token"
3. Look up token in D1 api_usage table
4. If not found → 401 "Invalid authentication token"
5. Check if current_month matches today's month
   → If not, reset monthly counters (log old values first)
6. If monthly_budget_hkd is NULL → skip enforcement (track only, no limit)
   If monthly_budget_hkd is not NULL:
   a. If current_spend_hkd >= monthly_budget_hkd → 429 "Monthly usage limit reached"
7. Set cf-aig-metadata header: {"customer_id": customer_id, "tier": tier}
8. Forward request to CF AI Gateway
9. Read response usage: prompt_tokens, completion_tokens
10. Calculate cost in HKD
11. UPDATE api_usage:
    current_spend_hkd += cost
    total_requests += 1
    total_tokens_in += prompt_tokens
    total_tokens_out += completion_tokens
    updated_at = now
12. If current_spend_hkd >= 90% of budget AND warned_at is NULL:
    SET warned_at = now
    Add X-Budget-Warning: true to response
13. If current_spend_hkd >= 100% of budget AND blocked_at is NULL:
    SET blocked_at = now
14. Return response to customer
```

### Auth failure rate limiting

```
Track failed auth attempts per IP in D1 or KV:
- Key: "auth_fail:{ip}"
- Value: count
- TTL: 60 seconds

If count >= 5 → reject with 429 for 10 minutes
```

---

## 6. Data Model

### `api_usage` table (new, in existing D1 database)

```sql
CREATE TABLE api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  gateway_token TEXT NOT NULL UNIQUE,
  tier INTEGER NOT NULL,
  monthly_budget_hkd REAL,            -- NULL until pricing decided
  current_month TEXT NOT NULL,         -- '2026-04' format
  current_spend_hkd REAL DEFAULT 0,
  warned_at TEXT,
  blocked_at TEXT,
  total_requests INTEGER DEFAULT 0,
  total_tokens_in INTEGER DEFAULT 0,
  total_tokens_out INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### `usage_history` table (monthly snapshots)

```sql
CREATE TABLE usage_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  month TEXT NOT NULL,                 -- '2026-04' format
  spend_hkd REAL NOT NULL,
  requests INTEGER NOT NULL,
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  budget_hkd REAL,
  created_at TEXT NOT NULL
);
```

Written during monthly reset — preserves historical data for pricing analysis.

### `audit_log` table (admin action history)

```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,                -- token_revoked | budget_updated | spend_reset | token_rotated
  customer_id TEXT NOT NULL,
  details TEXT,                        -- JSON with before/after values
  actor_ip TEXT,
  created_at TEXT NOT NULL
);
```

### Relationship to existing tables

```
jobs.id ←→ api_usage.customer_id
jobs.id ←→ vps_instances.customer_id
```

No changes to `jobs` or `vps_instances` tables.

---

## 7. Admin Endpoints

All admin endpoints require `CONFIRM_API_KEY` in the `X-API-Key` header (reuses existing auth pattern from payment confirmations).

### View usage

**`GET /api/usage`** — List all customers with current month spend

```
Response: {
  usage: [
    {
      customer_id: "1001",
      tier: 2,
      current_month: "2026-04",
      current_spend_hkd: 5.23,
      monthly_budget_hkd: 16.00,    -- or null
      percent_used: 32.7,            -- or null if no budget
      total_requests: 847,
      warned: false,
      blocked: false
    },
    ...
  ]
}
```

**`GET /api/usage/{customer_id}`** — Single customer detail

```
Response: {
  usage: {
    customer_id: "1001",
    tier: 2,
    gateway_token: "a1b2c3...last4only",  -- masked, show last 4 chars only
    current_month: "2026-04",
    current_spend_hkd: 5.23,
    monthly_budget_hkd: 16.00,
    percent_used: 32.7,
    total_requests: 847,
    total_tokens_in: 234500,
    total_tokens_out: 89200,
    warned_at: null,
    blocked_at: null,
    created_at: "2026-03-28T10:00:00Z",
    updated_at: "2026-04-15T14:30:00Z"
  }
}
```

### Manage limits

**`PATCH /api/usage/{customer_id}`** — Update budget for one customer

```
Request:  { monthly_budget_hkd: 20.00 }
Action:   UPDATE api_usage SET monthly_budget_hkd = 20.00
Audit:    { action: "budget_updated", details: { before: 16.00, after: 20.00 } }
Response: { usage: { ... } }
```

**`POST /api/usage/budgets`** — Bulk update budgets by tier

```
Request:  { tier: 2, monthly_budget_hkd: 16.00 }
Action:   UPDATE api_usage SET monthly_budget_hkd = 16.00 WHERE tier = 2
Audit:    One entry per affected customer
Response: { updated: 12 }
```

### Emergency actions

**`POST /api/usage/{customer_id}/reset`** — Reset monthly spend to 0

```
Action:   Log current values to usage_history, reset spend/warned/blocked
Audit:    { action: "spend_reset", details: { previous_spend: 15.23 } }
Response: { usage: { ... } }
```

**`POST /api/usage/{customer_id}/revoke`** — Revoke gateway token immediately

```
Action:   SET gateway_token = NULL (or delete row). Token stops working instantly.
Audit:    { action: "token_revoked", details: { token_last4: "f037" } }
Response: { message: "Token revoked. Customer API access disabled." }
```

**`POST /api/usage/{customer_id}/rotate`** — Generate new token, old one stops working

```
Action:   Generate new 64-char hex token, update gateway_token in D1
Audit:    { action: "token_rotated", details: { old_last4: "f037", new_last4: "b2e1" } }
Response: { new_token: "full-64-char-hex" }
Note:     Requires updating the customer's VPS config (manually or via Pi5 SSH)
```

---

## 8. Integration with Deployment Pipeline

### Changes to customer VPS config

| Before (Pipeline V2) | After (with API Gateway) |
|---|---|
| `DEEPSEEK_API_KEY=sk-real-key` | Removed — not on VPS |
| `OPENAI_API_KEY=sk-real-key` | Removed — not on VPS |
| (nothing) | `AI_GATEWAY_URL=https://api.3nexgen.com/api/ai` |
| (nothing) | `AI_GATEWAY_TOKEN=64-char-hex-unique-per-customer` |

### Changes to Pi5 deployer

During customer deployment, after VPS provisioning:

1. Generate gateway token: `secrets.token_hex(32)`
2. Call CF Worker API: `POST /api/usage` with `{ customer_id, gateway_token, tier }`
3. Write `AI_GATEWAY_URL` and `AI_GATEWAY_TOKEN` to `client.env` (instead of real API keys)
4. Deploy as normal — OpenClaw config points to gateway URL

### Changes to Pi5 config

```python
# Remove
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# Add
AI_GATEWAY_URL = os.environ.get("AI_GATEWAY_URL")
```

The Pi5 no longer needs real API keys at all. It only needs the gateway URL to pass to customer configs.

### Changes to OpenClaw VPS configuration

OpenClaw's `openclaw.json` on the customer VPS must be configured to route API calls through the gateway instead of directly to providers. The install script (`10-configure-env.sh`) writes the gateway URL and token into the OpenClaw config.

The exact OpenClaw config change depends on how OpenClaw resolves API endpoints — this needs testing during implementation to confirm the config format.

---

## 9. CF AI Gateway Setup

### One-time setup (Cloudflare Dashboard or API)

1. Create AI Gateway named `nexgen-api-proxy` in Cloudflare dashboard
2. Enable authentication (Authenticated Gateway mode)
3. Store real API keys in Secrets Store:
   - `DEEPSEEK_API_KEY` → your DeepSeek key
   - `OPENAI_API_KEY` → your OpenAI key
4. Configure BYOK: gateway uses Secrets Store keys when forwarding to providers

### Gateway features to enable

- **Caching:** Identical requests return cached responses (saves money). Set TTL per provider.
- **Fallback routing:** If DeepSeek is down, fall back to OpenAI (configurable per gateway).
- **Logging:** Enable request logging with custom metadata (customer_id tag per request).

---

## 10. Files Changed Summary

### CF Worker (`onboarding-pipeline/cf-worker/`)

| File | Action |
|---|---|
| `schema.sql` | Modify — add `api_usage`, `usage_history`, `audit_log` tables |
| `src/lib/types.ts` | Modify — add `ApiUsage`, `UsageHistory`, `AuditLog` interfaces |
| `src/lib/db.ts` | Modify — add usage CRUD functions, monthly reset, audit logging |
| `src/handlers/proxy.ts` | Create — AI Gateway proxy with auth, cost tracking, budget enforcement |
| `src/handlers/usage.ts` | Create — admin usage endpoints (view, update, reset, revoke, rotate) |
| `src/index.ts` | Modify — add proxy and usage routes |
| `wrangler.toml` | Modify — add AI Gateway binding, rate config env vars |
| `test/proxy.test.ts` | Create — proxy auth, cost tracking, budget enforcement tests |
| `test/usage.test.ts` | Create — admin endpoint tests |
| `test/setup.ts` | Modify — add new tables to test schema |

### Pi5 Worker (`onboarding-pipeline/pi5-worker/`)

| File | Action |
|---|---|
| `config.py` | Modify — remove `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, add `AI_GATEWAY_URL` |
| `deployer.py` | Modify — generate gateway token, call usage API, write gateway config to client.env |
| `.env.example` | Modify — swap API keys for gateway URL |
| `tests/test_deployer.py` | Modify — update tests for gateway token flow |

### OpenClaw Install Scripts (`openclaw_install/`)

| File | Action |
|---|---|
| `scripts/10-configure-env.sh` | Modify — write gateway URL + token instead of raw API keys |
| `configs/templates/openclaw.env.template` | Modify — replace API key placeholders with gateway placeholders |

---

## 11. Testing Strategy

### CF Worker tests (Vitest)

| Test | What |
|---|---|
| Proxy authenticates valid token | Token lookup → pass through |
| Proxy rejects invalid token | 401 response |
| Proxy rejects missing token | 401 response |
| Cost tracking updates D1 | After response, spend/tokens/requests incremented |
| 90% warning sets header | X-Budget-Warning: true when threshold crossed |
| 100% block returns 429 | Request rejected when budget exceeded |
| NULL budget allows unlimited | No enforcement, but usage still tracked |
| Monthly reset on new month | Counters reset, old values logged to usage_history |
| Auth rate limiting | 5 failures → 10 min block |
| Admin list usage | Returns all customers with spend data |
| Admin update budget | Updates monthly_budget_hkd, writes audit log |
| Admin bulk update by tier | Updates all customers of a tier |
| Admin reset spend | Resets to 0, logs old values |
| Admin revoke token | Token stops working immediately |
| Admin rotate token | New token works, old token rejected |
| Admin endpoints reject gateway tokens | Gateway token → 401 on admin routes |
| Gateway token masked in admin response | Only last 4 chars shown |

### Pi5 worker tests (pytest)

| Test | What |
|---|---|
| Deployer generates gateway token | 64-char hex, unique per call |
| Deployer calls usage API | POST /api/usage with correct payload |
| Client env contains gateway config | AI_GATEWAY_URL + AI_GATEWAY_TOKEN, no raw API keys |
| Deployer handles usage API failure | Retries or fails gracefully |

### E2E validation (manual)

1. Deploy test customer with gateway token
2. Send message via OpenClaw → verify it routes through AI Gateway
3. Check D1: usage incremented, cost calculated
4. Send messages until 90% → verify warning header
5. Send messages until 100% → verify 429 block
6. Admin reset → verify customer unblocked
7. Admin revoke → verify customer immediately blocked
8. Admin rotate → verify old token rejected, new token works

---

## 12. Assumptions and Constraints

| Assumption | Impact if wrong |
|---|---|
| CF AI Gateway supports BYOK with per-request key injection | Fall back to CF Worker injecting key manually before forwarding |
| DeepSeek API response includes `usage.prompt_tokens` and `usage.completion_tokens` | Parse response body instead of headers; add try/catch for missing fields |
| OpenClaw can be configured to use a custom API endpoint URL | May need a local reverse proxy on the VPS that rewrites URLs |
| CF AI Gateway free tier (100K logs/month) is sufficient at launch | Upgrade to Workers Paid ($5/mo) for 1M logs when needed |
| D1 write latency is acceptable for per-request cost updates | If too slow, batch updates via Durable Objects or KV cache |
| One gateway token per customer is sufficient | Could extend to multiple tokens per customer if needed (e.g., multiple devices) |

---

## 13. Deployment Order

1. **CF AI Gateway setup** — create gateway, store API keys in Secrets Store, enable auth
2. **CF Worker update** — deploy new proxy handler, usage endpoints, schema migration
3. **Pi5 Worker update** — deploy updated deployer with gateway token generation
4. **New customers only** — new deployments get gateway config. Existing customers (if any) keep working with direct keys until migrated.

This order ensures backwards compatibility — existing infrastructure keeps working at each step.
