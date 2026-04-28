# E2E Test Progress — NexGen Deployment Pipeline

*Started: 2026-04-11 | Last updated: 2026-04-12 21:30 HKT*

---

## Goal

Full end-to-end test from website payment trigger through VPS recycling to completed deployment. Two runs planned:
- **Run 1:** Tier 2 Pro on VPS 203187256 (job #1002)
- **Run 2:** Tier 3 Elite on VPS 203187278 (new order, Marigold handles independently)

---

## Run 1: Tier 2 Pro — Job #1002

### Order Details
| Field | Value |
|-------|-------|
| Job ID | 1002 |
| Tier | 2 (Pro) |
| Bot | @NexGen_E2E_bot |
| Email | amaztsang@gmail.com |
| VPS | 203187256 (161.97.88.8) |
| Created | 2026-04-11T16:41:20Z |

### Timeline

| Time (HKT) | Event | Status |
|-------------|-------|--------|
| 2026-04-11 ~00:41 | Order submitted via website form → POST /api/orders → D1 job created | DONE |
| 2026-04-11 ~00:42 | Lemon Squeezy checkout completed (test mode) | DONE |
| 2026-04-11 ~00:42 | Pi5 worker detected job → Telegram notification to Jacky | DONE |
| 2026-04-11 ~01:00 | Marigold instructed to deploy → suggested plan → Jacky approved | DONE |
| 2026-04-11 ~01:10 | Deploy attempt 1: FAILED — VPS reinstall failed (multiple bugs) | FAILED |
| 2026-04-11 ~02:00 | Deploy attempt 2: FAILED — cloud-init user creation broken on Contabo | FAILED |
| 2026-04-12 ~20:47 | Deploy attempt 3 (Claude direct): FAILED — `CONTABO_ROOT_PASSWORD_ID` missing from .env | FAILED |
| 2026-04-12 ~20:53 | Deploy attempt 4 (Claude direct): FAILED — wrong python (system instead of venv) | FAILED |
| 2026-04-12 ~20:55 | Deploy attempt 5 (Claude direct): SUCCESS | **DONE** |
| 2026-04-12 ~21:30 | Agent SDK session complete (50 turns, $2.58). Job #1002 status=complete | **DONE** |

### Bugs Found & Fixed

#### Bug 1: Reinstall timeout too short
- **Symptom:** `contabo-reinstall.sh` MAX_ATTEMPTS=20 (10 min), Contabo takes up to 15 min
- **Fix:** Changed MAX_ATTEMPTS to 40 (20 min)
- **File:** `openclaw_install/provision/contabo-reinstall.sh`

#### Bug 2: --vps override ignored by deployer
- **Symptom:** CLI set `job['_override_vps_id']` but `deployer._provision_vps` ignored it
- **Fix:** `_provision_vps` now accepts `job` dict, passes `vps_id` to `try_recycle`
- **File:** `onboarding-pipeline/pi5-worker/deployer.py`

#### Bug 3: Python stdout buffering hides deploy logs
- **Symptom:** When piped to `tee`, Python block-buffers stdout — no visible output until process exits
- **Fix:** Added `flush=True` to all 18 `print()` calls in deployer.py and vps_lifecycle.py
- **Files:** `deployer.py`, `vps_lifecycle.py`

#### Bug 4: Deploy falls through to fresh VPS on recycle failure
- **Symptom:** When `--vps` set and recycle fails, deployer called `contabo-create.sh` creating unwanted billing
- **Fix:** Abort (return None) when override set and recycle fails
- **File:** `deployer.py`

#### Bug 5: Cloud-init failure on Contabo reinstall
- **Symptom:** Contabo PUT reinstall ignores `userData` field; their cloud-init template has broken `bootcmd`
- **Fix:** Added Step 0 to playbook — bootstraps deploy user via root SSH before install scripts
- **File:** `onboarding-pipeline/pi5-worker/playbook.py`

#### Bug 6: Silent failure on SSH timeout
- **Symptom:** `contabo-reinstall.sh` exited 0 even when SSH polling timed out
- **Fix:** Added explicit `exit 1` after timeout
- **File:** `openclaw_install/provision/contabo-reinstall.sh`

#### Bug 7: D1 get_next_job mutates state (read = write)
- **Symptom:** `GET /api/jobs/next` atomically flips `ready→provisioning` — destructive for read-only checks
- **Fix:** Added read-only `GET /api/jobs?status=X` endpoint; rewrote `get_pending_jobs()` to use it
- **Files:** `cf-worker/src/index.ts`, `cf-worker/src/handlers/jobs.ts`, `cf-worker/src/lib/db.ts`, `pi5-worker/api_client.py`

#### Bug 8: No CORS on CF Worker
- **Symptom:** Browser blocked cross-origin POST from 3nexgen.com to api.3nexgen.com
- **Fix:** Added OPTIONS preflight handler + `withCors` wrapper
- **File:** `cf-worker/src/index.ts`

#### Bug 9: Website form didn't create D1 job
- **Symptom:** Onboarding form only saved to sessionStorage, never called /api/orders
- **Fix:** Added `fetch()` to POST /api/orders in `handleSubmit`
- **File:** `website-lovable/src/src/pages/Onboarding.tsx`

#### Bug 10: Pool command had no Contabo live state
- **Symptom:** Marigold couldn't see if VPS cancellation was revoked or not
- **Fix:** Created `contabo_client.py`, merged Contabo API data into pool output
- **Files:** `contabo_client.py`, `nexgen_cli.py`, `formatters.py`

#### Bug 11: CONTABO_ROOT_PASSWORD_ID missing from .env
- **Symptom:** `contabo-reinstall.sh` fails immediately: `Set CONTABO_ROOT_PASSWORD_ID in .env`
- **Fix:** Added `CONTABO_ROOT_PASSWORD_ID=328282` to `~/nexgen-worker/.env`
- **Where:** Pi5 `.env` file

#### Bug 12: CLI invoked with system python, not venv
- **Symptom:** `ModuleNotFoundError: No module named 'anyio'` — system python3 doesn't have deps
- **Fix:** Must use `~/nexgen-worker-env/bin/python3` (matches systemd service)
- **Impact:** Marigold's briefing must reference the correct python path

#### Bug 13: Agent SDK installed extra Tier 3 scripts on Tier 2 deploy
- **Symptom:** Agent ran `11-setup-chromium.sh` (Tier 3 only) during Tier 2 deploy
- **Impact:** Not harmful (extra components unused), but wastes time and resources
- **Root cause:** The uploaded scripts directory includes ALL scripts; agent saw them and ran them
- **Fix:** Added explicit tier-specific script whitelist to playbook prompt: "Only run the scripts listed below... do NOT run scripts that are not listed here"
- **File:** `onboarding-pipeline/pi5-worker/playbook.py`

### Infrastructure Fixes (pre-deploy)
- D1 VPS records cleaned: correct numeric IDs (203187256, 203187278), status=cancelling
- Both VPS cancellations revoked at Contabo panel → `pool` shows ✅ ready
- Duplicate worker processes killed (root systemd + user systemd)
- CF Worker secrets rotated (CONFIRM_API_KEY, WORKER_TOKEN)
- GET /api/jobs/:id route added to CF Worker

---

## Run 2: Tier 3 Elite — TBD

*Will be created as a new order after Run 1 completes. Marigold handles independently.*

| Field | Value |
|-------|-------|
| Job ID | TBD |
| Tier | 3 (Elite) |
| VPS | 203187278 (161.97.82.155) |
| Handler | Marigold (semi-auto) |

---

## Run 1 Results

| Metric | Value |
|--------|-------|
| Final status | **DEPLOYMENT_SUCCESS** |
| Job status in D1 | `complete` |
| VPS | 203187256 → active, customer=1002 |
| Server IP | 161.97.88.8 |
| Agent SDK cost | $2.58 |
| Total attempts | 5 (2 Marigold, 3 Claude direct) |
| Bugs found | 13 |
| Deploy duration (attempt 5) | ~35 min |
| Key observation | Agent installed Tier 3 scripts (chromium) on Tier 2 deploy — needs playbook fix |

---

## Post-Deploy Issues (found after Run 1 success)

### Issue 14: API budget = $0 after deploy — bot unusable
- **Severity:** Critical
- **Symptom:** Dashboard shows customer 1002 budget = $0, spend = $0. Proxy will 429-block all requests immediately.
- **Root cause:** CF Worker `handleCreateUsage` in `usage.ts` drops `monthly_budget_hkd` from request body. Pi5 sends it correctly (deployer.py `TIER_BUDGETS = {1:40, 2:70, 3:100}`), but the handler only passes `customer_id`, `gateway_token`, `tier` to `createApiUsage()`. Budget defaults to `null`.
- **Fix needed:** `usage.ts` ~line 175: add `monthly_budget_hkd: body.monthly_budget_hkd` to params + manually patch 1002 to HK$70
- **File:** `onboarding-pipeline/cf-worker/src/handlers/usage.ts`
- **Fix applied:** Added `monthly_budget_hkd: body.monthly_budget_hkd` to `createApiUsage` params
- **Tests:** 4 CF Worker tests (vitest) + 5 Pi5 tests (pytest) — all pass
- **Deployed:** CF Worker redeployed, customer 1002 patched to HK$70
- **Live verified:** POST /api/usage with budget=70 → stored correctly
- **Status:** FIXED

### Issue 15: Dashboard shows ops noise, not business picture
- **Severity:** Medium
- **Symptom:** Dashboard shows Gateway/Watchdog/Qdrant/SearXNG health, Pi5 disk/mem — infrastructure noise. Missing: customer roster, VPS expiry dates, MRR, cost overview, token allocation vs usage.
- **What to remove:** Pi5 Worker section, per-service health columns (Gateway, Watchdog, Qdrant, SearXNG, Disk, Mem)
- **What to add:** Business Summary (active customers, MRR, total API cost, margin), Customer Overview (ID, name, tier, bot, email, status), VPS Expiry & Billing, Token allocation vs usage with totals
- **File:** `onboarding-pipeline/pi5-worker/dashboard.py`
- **Status:** Diagnosed, not yet fixed

### Issue 16: No email sent to customer after deploy
- **Severity:** High
- **Symptom:** Customer never received "Your AI is ready!" email. Zero email capability exists in the codebase — no SMTP, SendGrid, Resend, nothing. Notification system is Telegram-only.
- **Also:** Order number stored in React state (`orderId`) but never displayed on payment confirmation screen (from final-edit_v2.md Edit 1)
- **Fix needed:** Add email service (e.g. Resend), create ready-notification template, call from deployer.py after DEPLOYMENT_SUCCESS. Show order number on confirmation screen.
- **Files:** `pi5-worker/notifier.py` (new email method), `pi5-worker/deployer.py` (call it), `website-lovable/src/src/pages/Onboarding.tsx` (show order ID)
- **Status:** Not implemented

### Issue 17: Customer bot never notified "ready" (Telegram)
- **Severity:** High
- **Symptom:** Customer's Telegram bot didn't send "Your AI is ready!" message. Two sub-problems:
  - **A)** Bot webhook is empty (`getWebhookInfo` returns `url: ""`). Deployer calls `set_webhook()` but may have failed silently (self-signed cert rejected by Telegram).
  - **B)** `send_customer_message()` in notifier.py swallows all errors — returns `False` without logging. Deployer never checks return value. A 403 (customer hasn't `/start`-ed bot) is invisible.
- **Fix needed:** Add logging to `send_customer_message()` on failure. Check return value in deployer.py. Fix webhook SSL. Add `/start` verification in onboarding flow.
- **Files:** `pi5-worker/notifier.py`, `pi5-worker/deployer.py`
- **Status:** Diagnosed, not yet fixed

### Pending from final-edit_v2.md

| Edit | Description | Status |
|------|-------------|--------|
| Edit 1 | Show order number on payment confirmation screen | Merged into Issue 16 |
| Edit 2 | Briefing plan-era artifacts audit | Partially done (v2.3 fixes pool/venv). Full audit still pending |
| Edit 3 | Marigold Contabo live state visibility | Done — contabo_client.py + pool live state (Bug 10) |

---

## Marigold Handoff Checklist

Before Marigold can handle Run 2 independently:

- [x] Run 1 deployment succeeds end-to-end
- [x] Briefing updated with all fixes (v2.2 deployed)
- [x] `.env` has all required vars (CONTABO_ROOT_PASSWORD_ID confirmed)
- [x] Correct python path documented in briefing: `~/nexgen-worker-env/bin/python3` (v2.3)
- [x] Briefing updated with Bug 13 fix (tier script filtering in playbook.py)
- [x] All tests passing (79/79 on Pi5)
- [x] Issue 14 fixed: budget set correctly on deploy (CF Worker usage.ts)
- [ ] Issue 15 fixed: dashboard redesigned for business view
- [ ] Issue 16 fixed: email notification + order number display
- [ ] Issue 17 fixed: customer bot Telegram notification + webhook
- [ ] New order created for Run 2 (Tier 3)

---

## Test Infrastructure

| Item | Status |
|------|--------|
| Lemon Squeezy | Test mode (no real charges) |
| CF Worker (api.3nexgen.com) | Production, CORS enabled |
| Pi5 worker service | Active (user systemd) |
| VPS 203187256 | **Active** — customer 1002, deployed |
| VPS 203187278 | Recyclable, cancel revoked ✅ (ready for Run 2) |
| Test suite | 79 tests passing (66 original + 13 new) |
