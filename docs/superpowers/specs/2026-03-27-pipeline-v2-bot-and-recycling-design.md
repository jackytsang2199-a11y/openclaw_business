# Pipeline V2: Customer-Created Bots & VPS Recycling Design

**Date:** 2026-03-27
**Status:** Draft
**Related specs:**
- `2026-03-26-customer-onboarding-pipeline-design.md` (original pipeline architecture)
- `2026-03-27-contabo-vps-billing-strategy-design.md` (VPS lifecycle, recycling strategy)
- `2026-03-27-customer-backup-strategy-design.md` (backup uses VPS list from recycling endpoints)

---

## 1. Problem

Two architectural issues in the current onboarding pipeline:

**Bot pool is unsustainable.** BotFather enforces a hard limit of ~20 bots per Telegram account, with aggressive rate limiting (~6 bots per 20 hours). The pre-created pool strategy (`NexGenAI_T1043_bot` through `NexGenAI_T1062_bot`) cannot scale beyond 20 customers without additional Telegram accounts. Managing multiple accounts adds operational complexity for minimal benefit.

**VPS recycling has no backend.** The Pi5 worker already has client-side code (`vps_lifecycle.py`, `api_client.py`) that calls VPS recycling endpoints (`GET /api/vps/recyclable`, `POST /api/vps`, `PATCH /api/vps/{id}`), but these endpoints don't exist on the CF Worker. Without them, every customer deployment provisions a fresh VPS, and churned VPSes are wasted (still paying until Contabo terminates them ~4 weeks later).

---

## 2. Solution: Customer-Created Bots

### New order flow

```
Customer creates bot via BotFather (guided by tutorial page)
  ↓
Customer submits order form on 3nexgen.com
  → POST /api/orders { bot_token, tier, telegram_user_id, email, display_name }
  → CF Worker validates bot_token via Telegram getMe API
  → Creates job with status = 'pending_payment'
  → Returns order_id
  ↓
Payment arrives:
  ├─ Visa/Master → Lemon Squeezy checkout (order_id in custom_data)
  │    → webhook auto-fires → matches order_id → pending_payment → ready
  ├─ FPS/PayMe → customer pays, admin confirms manually
  │    → POST /api/confirm/{order_id} → pending_payment → ready
  ↓
Pi5 picks up job (status = ready)
  → Reads bot_token from job data
  → Provisions VPS → deploys → sets webhook → delivers
```

### What changes

| Component | Old (bot pool) | New (customer-created) |
|-----------|---------------|----------------------|
| Order form | No bot field | Customer provides bot_token |
| CF Worker `createJob` | Auto-generates `NexGenAI_T{id}_bot` | Validates token via `getMe`, stores bot_token + bot_username |
| Pi5 deployer | `bot_pool.assign_next()` | Reads bot_token from job |
| On failure | `bot_pool.return_bot()` | No action — bot stays with customer |
| On churn | Return bot to pool, reset name | Delete webhook only — customer keeps bot |
| Scaling | Limited to ~20 bots per Telegram account | Unlimited — each customer creates their own |

### Bot token validation (at order submission)

```
POST /api/orders receives bot_token
  1. Call https://api.telegram.org/bot{token}/getMe
  2. Verify response: ok=true, result.is_bot=true
  3. Extract bot_username from result.username
  4. Check bot_token uniqueness in D1 (prevent duplicate submissions)
  5. Create job with bot_token + bot_username
```

Validation rejects: invalid tokens, non-bot tokens, tokens already in use by another order.

### Files removed

- `pi5-worker/bot_pool.py` — entire module deleted
- `pi5-worker/tests/test_bot_pool.py` — tests deleted
- `pi5-worker/scripts/bot-pool-status.sh` — monitoring script deleted
- `~/bot-pool/` directory on Pi5 — no longer needed

### Files modified

- `pi5-worker/deployer.py` — remove BotPool dependency, read bot_token from job
- `pi5-worker/worker.py` — remove BotPool initialization
- `pi5-worker/config.py` — remove BOT_POOL_DIR, BOT_POOL_LOW_THRESHOLD

---

## 3. Solution: VPS Recycling Endpoints

### New `vps_instances` D1 table

```sql
CREATE TABLE IF NOT EXISTS vps_instances (
  vps_id TEXT PRIMARY KEY,
  contabo_contract_id TEXT,
  contabo_ip TEXT,
  customer_id TEXT,                     -- order_id, nullable (NULL when recyclable)
  status TEXT NOT NULL,                 -- provisioning | active | cancelling | expired
  tier INTEGER,
  reinstall_count INTEGER DEFAULT 0,
  billing_start TEXT,
  cancel_date TEXT,
  cancel_deadline TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### New CF Worker endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET /api/vps/recyclable` | Worker token | Return oldest cancelling VPS |
| `POST /api/vps` | Worker token | Register new VPS instance |
| `PATCH /api/vps/{id}` | Worker token | Update VPS status/customer/tier |
| `GET /api/vps?status=active` | Worker token | List active VPSes (for backup script) |

### How recycling works (unchanged from VPS billing strategy spec)

```
New customer arrives:
  1. Pi5 calls GET /api/vps/recyclable
  2. If cancelling VPS found:
     → Revoke cancellation (Contabo API)
     → OS reinstall (Contabo API)
     → PATCH /api/vps/{id} status=active, customer_id={new_order}
     → Deploy on recycled VPS (skip provisioning)
  3. If no recyclable VPS:
     → Provision fresh VPS (Contabo API)
     → POST /api/vps (register in D1)
     → Deploy normally

Customer churns:
  1. Export data to Pi5 archives
  2. OS reinstall (wipe)
  3. Submit cancellation (Contabo API)
  4. PATCH /api/vps/{id} status=cancelling, customer_id=NULL
  5. VPS enters recycling pool (~4 weeks until Contabo terminates)
```

### Pi5 worker — no changes needed

`api_client.py` already has `get_recyclable_vps()`, `create_vps_instance()`, `update_vps_instance()`, `get_active_vps_list()`. `vps_lifecycle.py` already has `try_recycle()` and `handle_cancel()`. These currently get 404s from the CF Worker (gracefully handled). Once the endpoints are deployed, recycling activates automatically.

---

## 4. D1 Schema Changes

### `jobs` table modifications

| Change | Old | New |
|--------|-----|-----|
| ID format | `T1043` (T-prefix) | `1001` (plain sequential number) |
| ID counter start | 1043 | 1001 |
| New column | — | `bot_token TEXT NOT NULL` |
| Keep column | `bot_username` (auto-generated) | `bot_username` (from getMe validation) |
| New status | — | `pending_payment` before `ready` |
| Remove column | `lemon_squeezy_order_id` | Replaced by matching via `custom_data.order_id` |

### Updated `jobs` schema

```sql
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

CREATE TABLE IF NOT EXISTS id_counter (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT OR IGNORE INTO id_counter (key, value) VALUES ('next_id', 1001);
```

### Migration strategy

No real customers exist yet. Drop and recreate all tables with updated schema via `wrangler d1 execute nexgen-jobs --remote --file=schema.sql`.

---

## 5. CF Worker Route Changes

### Modified endpoints

**`POST /api/orders`** (new — replaces job creation from confirm/webhook)

Public endpoint, no auth token required. Accepts order form submission:

```
Request:  { tier, display_name, telegram_user_id, email, bot_token }
Validate: required fields, tier in [1,2,3], bot_token via getMe
Response: { order: { id, status, bot_username, tier } }
```

Abuse prevention: Cloudflare's built-in rate limiting (configured in wrangler.toml or dashboard) limits requests per IP. The `getMe` validation call also acts as a natural throttle — invalid tokens are rejected before any D1 writes.

**`POST /api/confirm/{orderId}`** (modified)

Admin-only (API key auth). Flips status from `pending_payment` to `ready`:

```
Request:  { payment_method, amount_hkd?, reference? }
Validate: order exists, status is pending_payment
Action:   UPDATE jobs SET status='ready', payment_method=?
Response: { order: { id, status } }
```

**`POST /api/webhook/lemonsqueezy`** (modified)

Webhook auth (HMAC). Matches existing order via `custom_data.order_id`:

```
Webhook payload includes: custom_data.order_id, customer email, variant_id
Action:   Find job by order_id from custom_data
          Verify status is pending_payment
          UPDATE jobs SET status='ready', payment_method='lemon_squeezy'
Response: 200 OK
```

If no matching order found (edge case — someone bypasses the form), log warning and ignore. Payment is not lost (Lemon Squeezy dashboard shows it), admin can investigate.

### New VPS endpoints

All require Worker token auth.

**`GET /api/vps/recyclable`**
```
Query: SELECT * FROM vps_instances WHERE status='cancelling' ORDER BY cancel_date ASC LIMIT 1
Response: { vps: { vps_id, contabo_ip, ... } } or { vps: null }
```

**`POST /api/vps`**
```
Request: { vps_id, contabo_contract_id, contabo_ip, customer_id, status, tier, ... }
Action:  INSERT INTO vps_instances
Response: { vps: { ... } }
```

**`PATCH /api/vps/{vpsId}`**
```
Request: { status?, customer_id?, tier?, reinstall_count?, cancel_date?, cancel_deadline? }
Action:  UPDATE vps_instances SET ... WHERE vps_id = ?
Response: { vps: { ... } }
```

**`GET /api/vps?status=active`**
```
Query: SELECT * FROM vps_instances WHERE status = ?
Response: { vps_list: [ ... ] }
```

---

## 6. Pi5 Worker Changes

### `deployer.py`

Remove `BotPool` from constructor and all references:

```python
# Old
class Deployer:
    def __init__(self, api, pool, notifier, install_dir=None):
        self.pool = pool

# New
class Deployer:
    def __init__(self, api, notifier, install_dir=None):
        # No pool
```

Replace `_assign_bot()`:

```python
# Old: assigns from filesystem pool
def _assign_bot(self, job_id, display_name, telegram_user_id):
    bot = self.pool.assign_next()
    ...

# New: reads from job data
def _get_bot_from_job(self, job):
    bot_token = job.get("bot_token")
    bot_username = job.get("bot_username")
    if not bot_token:
        return None
    return {"token": bot_token, "username": bot_username}
```

Replace `_handle_failure()`:

```python
# Old: returns bot to pool
self.pool.return_bot(bot["username"])

# New: no pool action — bot stays with customer
# Just notify customer + owner (rest unchanged)
```

### `worker.py`

```python
# Old
from bot_pool import BotPool
pool = BotPool(config.BOT_POOL_DIR)
deployer = Deployer(api, pool, notifier)

# New
deployer = Deployer(api, notifier)
```

### `config.py`

Remove:
```python
BOT_POOL_DIR = Path(os.environ.get("BOT_POOL_DIR", str(Path.home() / "bot-pool")))
BOT_POOL_LOW_THRESHOLD = int(os.environ.get("BOT_POOL_LOW_THRESHOLD", "10"))
```

---

## 7. Website Content (Spec Only — Markdown Output)

Two content pages needed for the website, to be delivered as markdown files:

### BotFather Tutorial Page

Step-by-step guide in 香港書面語 with screenshot placeholders:
1. Open Telegram, search @BotFather
2. Send `/newbot`
3. Enter display name
4. Enter username (must end in `_bot`)
5. Copy the token
6. Paste into order form

Include: common issues (username taken, token format), security note (don't share token).

### Order Form Spec

Fields, validation rules, payment flow, and API integration spec for whoever builds the website:
- Service tier dropdown
- Bot token input with "驗證" (validate) button
- Display name (auto-filled from getMe, editable)
- Telegram User ID with help text
- Email
- Submit → API call → show payment options (Lemon Squeezy redirect or FPS/PayMe details)

---

## 8. Testing Strategy

### CF Worker tests (Vitest)

| Test | What |
|------|------|
| Order submission with valid bot token | Mock getMe → job created with pending_payment |
| Order submission with invalid token | Mock getMe failure → 400 error |
| Duplicate bot token rejection | Second order with same token → 409 |
| Payment confirm flips status | pending_payment → ready |
| Confirm on non-existent order | 404 |
| Confirm on already-ready order | 400 (idempotency guard) |
| Lemon Squeezy webhook matches order | custom_data.order_id → pending_payment → ready |
| Lemon Squeezy webhook no match | Log warning, 200 OK (don't reject payment) |
| Get recyclable VPS | Returns oldest cancelling VPS |
| Get recyclable when none exist | Returns null |
| Create VPS instance | Inserts into vps_instances |
| Update VPS instance | Updates specified fields |
| List active VPSes | Filters by status |

### Pi5 worker tests (pytest)

| Test | What |
|------|------|
| Deployer reads bot from job | No pool, token from job dict |
| Deployer handles missing bot_token | Returns failure |
| Deployer failure doesn't touch pool | No return_bot call |
| Worker init without BotPool | Starts cleanly |

### E2E validation (manual, during first Contabo test)

1. Submit test order via `POST /api/orders` with real bot token
2. Confirm payment via `POST /api/confirm/{id}`
3. Pi5 picks up job, deploys to Contabo VPS
4. Verify: bot responds, webhook set, VPS registered in `vps_instances`
5. Cancel: VPS enters recycling pool in D1
6. Submit second order → VPS recycled from pool instead of provisioning fresh

---

## 9. Deployment Order

Changes must be deployed in this order:

1. **CF Worker first** — deploy new schema + endpoints. Old Pi5 worker still works (bot pool still exists, VPS endpoints now respond instead of 404).
2. **Pi5 worker second** — deploy updated deployer/worker/config. Remove bot pool files. Now uses job-based bot tokens and VPS recycling activates.
3. **Website content last** — markdown pages for tutorial and order form spec. Integrated when website is built.

This order ensures no downtime — each step is backwards compatible with the previous state.

---

## 10. Assumptions and Constraints

| Assumption | Impact if wrong |
|---|---|
| Customers can follow BotFather tutorial | Add video tutorial or live support fallback |
| getMe API is fast and reliable for validation | Add timeout + retry; allow submission without validation as fallback |
| Lemon Squeezy supports custom_data in checkout URLs | Verified: yes, via `checkout[custom_data][order_id]=1001` parameter |
| Customers won't share/reuse bot tokens | Unique constraint prevents duplicate submissions |
| Bot token doesn't expire | Telegram bot tokens are permanent unless revoked via BotFather |
| Bot tokens in D1 are secure | D1 is encrypted at rest, accessible only via Worker token auth. Bot tokens are also deployed to customer VPS `.env` — same security level as current pool tokens on Pi5 |

---

## 11. Files Changed Summary

### CF Worker (`onboarding-pipeline/cf-worker/`)

| File | Action |
|------|--------|
| `schema.sql` | Modify — new vps_instances table, updated jobs table |
| `src/lib/types.ts` | Modify — update Job interface, add VpsInstance, add pending_payment status |
| `src/lib/db.ts` | Modify — update createJob, add VPS functions, add order lookup |
| `src/handlers/orders.ts` | Create — order submission + bot validation |
| `src/handlers/vps.ts` | Create — VPS recycling endpoints |
| `src/handlers/confirm.ts` | Modify — payment confirm only, no job creation |
| `src/handlers/webhook.ts` | Modify — match order_id from custom_data |
| `src/handlers/jobs.ts` | Modify — minor (status validation includes pending_payment) |
| `src/index.ts` | Modify — add new routes |

### Pi5 Worker (`onboarding-pipeline/pi5-worker/`)

| File | Action |
|------|--------|
| `bot_pool.py` | Delete |
| `tests/test_bot_pool.py` | Delete |
| `scripts/bot-pool-status.sh` | Delete |
| `deployer.py` | Modify — remove BotPool, read token from job |
| `worker.py` | Modify — remove BotPool init |
| `config.py` | Modify — remove pool config |
| `tests/test_deployer.py` | Modify — update tests |

### Website Content (markdown output only)

| File | Action |
|------|--------|
| `website-lovable/content/botfather-tutorial.md` | Create — 香港書面語 tutorial |
| `website-lovable/content/order-form-spec.md` | Create — form fields, validation, API integration |
