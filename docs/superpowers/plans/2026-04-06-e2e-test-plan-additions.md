# Pre-Launch E2E Test Plan — Additional Phases

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 missing test phases to the existing pre-launch E2E test plan (`docs/pre-launch-e2e-test-plan.md`) covering budget enforcement, webhook HMAC validation, dashboard health, VPS expiry, deployment failure, concurrent jobs, and integrate them as T1.5 / T2.0 / T5b / T7b / T9 / T10 / T11.

**Architecture:** These are curl-based and Python-based E2E tests that run against the live CF Worker (`api.3nexgen.com`) and Pi5 worker. They follow the same pattern as the existing T1-T8 phases — manual commands with expected output, run from Pi5.

**Tech Stack:** bash/curl (CF Worker tests), Python 3 (Pi5 worker tests), existing test infrastructure in `onboarding-pipeline/pi5-worker/tests/`

---

## File Structure

- **Modify:** `docs/pre-launch-e2e-test-plan.md` — insert 7 new phases into the existing plan

No new files needed. All additions go into the existing test plan document.

---

## Task 1: Add Phase T1.5 — Dashboard Health Validation

**Files:**
- Modify: `docs/pre-launch-e2e-test-plan.md` (insert after Phase T1, before Phase T2)

The dashboard (`onboarding-pipeline/pi5-worker/dashboard.py`) runs every 15 min via cron and outputs `~/nexgen-dashboard.md`. The final state section references it but no phase actually tests it.

- [ ] **Step 1: Insert Phase T1.5 after the T1 section (after the `---` separator following T1's pass criteria)**

Insert this content into `docs/pre-launch-e2e-test-plan.md` after the Phase T1 block:

```markdown
### Phase T1.5: Dashboard Health Validation
**Goal:** Verify the dashboard script generates a valid health report
**Method:** Run dashboard.py manually, inspect output
**Duration:** 5 min

​```bash
# T1.5.1 — Run dashboard manually
cd ~/nexgen-worker
~/nexgen-worker-env/bin/python3 dashboard.py

# T1.5.2 — Verify output file exists and is recent
ls -la ~/nexgen-dashboard.md
# Expected: file exists, modified within last minute

# T1.5.3 — Check dashboard content has all sections
grep -c '##' ~/nexgen-dashboard.md
# Expected: >= 5 sections (Worker, VPS, Usage, Backup, Warnings)

# T1.5.4 — Verify VPS health checks ran (SSH to active VPS)
grep -E 'GW|WD|QD|SX' ~/nexgen-dashboard.md
# Expected: service status rows for each active VPS
# GW=openclaw-gateway, WD=watchdog, QD=Qdrant, SX=SearXNG

# T1.5.5 — Verify warnings section exists
grep -A5 'Warnings' ~/nexgen-dashboard.md
# Expected: either "All OK" or specific warnings (disk < 5GB, backup > 7 days)

# T1.5.6 — Verify cron is scheduled
crontab -l | grep dashboard
# Expected: */15 * * * * ~/nexgen-worker/scripts/nexgen-dashboard-cron.sh
​```

**Pass criteria:** Dashboard generates valid markdown with all sections, VPS health data present, cron active
```

- [ ] **Step 2: Verify the insertion doesn't break surrounding sections**

Read back the file around the insertion point to confirm T1 → T1.5 → T2 flow is intact.

- [ ] **Step 3: Commit**

```bash
git add docs/pre-launch-e2e-test-plan.md
git commit -m "test(e2e): add T1.5 — dashboard health validation phase"
```

---

## Task 2: Add Phase T2.0 — Webhook HMAC Validation

**Files:**
- Modify: `docs/pre-launch-e2e-test-plan.md` (insert before Phase T2)

This tests the real Lemon Squeezy webhook path (`POST /api/webhook/lemonsqueezy`) with HMAC-SHA256 signature validation. The existing T2 only uses the admin `/api/confirm` shortcut — the actual payment path through HMAC is untested.

**HMAC details** (from `cf-worker/src/lib/hmac.ts`):
- Algorithm: HMAC-SHA256
- Input: raw request body
- Secret: `LEMONSQUEEZY_WEBHOOK_SECRET` (CF Worker env var)
- Output: lowercase hex string
- Comparison: constant-time XOR

**Webhook handler** (from `cf-worker/src/handlers/webhook.ts`):
- Only processes `event_name === "order_created"`
- Requires `meta.custom_data.order_id` matching a D1 job
- Changes job status from `pending_payment` → `ready`
- Idempotent: second call returns `{ ok: true, already_confirmed: true }`

- [ ] **Step 1: Insert Phase T2.0 before the existing Phase T2**

Insert this content into `docs/pre-launch-e2e-test-plan.md` before Phase T2:

```markdown
### Phase T2.0: Webhook HMAC Payment Flow
**Goal:** Validate the real Lemon Squeezy webhook path with HMAC signature
**Method:** Create a pending_payment order, then send a signed webhook to confirm it
**Duration:** 10 min
**Prerequisite:** You need the LEMONSQUEEZY_WEBHOOK_SECRET from CF Worker secrets

​```bash
# Setup: get secrets
TOKEN=$(grep WORKER_TOKEN ~/nexgen-worker/.env | cut -d= -f2)
CONFIRM=$(grep CONFIRM_API_KEY ~/nexgen-worker/.env | cut -d= -f2)
# Get webhook secret from wrangler or your secrets store:
WEBHOOK_SECRET="your-lemonsqueezy-webhook-secret-here"

# T2.0.1 — Create a pending_payment order first
curl -sf -X POST https://api.3nexgen.com/api/orders \
  -H "X-Worker-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "E2E_HMAC_TEST",
    "tier": 2,
    "display_name": "HMAC Test",
    "telegram_user_id": "340067089",
    "email": "test@test.com",
    "bot_token": "FAKE_BOT_TOKEN_HMAC_TEST",
    "bot_username": "hmac_test_bot"
  }'
# Expected: 200 OK, job created with status "pending_payment"

# T2.0.2 — Send webhook with INVALID signature (should fail)
BODY='{"meta":{"event_name":"order_created","custom_data":{"order_id":"E2E_HMAC_TEST"}},"data":{"id":"ls_123","attributes":{}}}'
curl -sf -w "\nHTTP %{http_code}\n" -X POST https://api.3nexgen.com/api/webhook/lemonsqueezy \
  -H "Content-Type: application/json" \
  -H "X-Signature: deadbeef_invalid_signature" \
  -d "$BODY"
# Expected: HTTP 401 — "Unauthorized"

# T2.0.3 — Generate valid HMAC-SHA256 signature and send
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $NF}')
echo "Computed signature: $SIGNATURE"

curl -sf -w "\nHTTP %{http_code}\n" -X POST https://api.3nexgen.com/api/webhook/lemonsqueezy \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -d "$BODY"
# Expected: HTTP 200 — {"ok":true,"order_id":"E2E_HMAC_TEST","status":"ready"}

# T2.0.4 — Verify job status changed to "ready"
curl -sf https://api.3nexgen.com/api/jobs/E2E_HMAC_TEST -H "X-Worker-Token: $TOKEN"
# Expected: status = "ready" (no longer "pending_payment")

# T2.0.5 — Test idempotency: send same webhook again
curl -sf -w "\nHTTP %{http_code}\n" -X POST https://api.3nexgen.com/api/webhook/lemonsqueezy \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -d "$BODY"
# Expected: HTTP 200 — {"ok":true,"already_confirmed":true}

# T2.0.6 — Test non-order_created event (should be ignored)
BODY2='{"meta":{"event_name":"subscription_updated","custom_data":{"order_id":"E2E_HMAC_TEST"}},"data":{"id":"ls_456","attributes":{}}}'
SIG2=$(echo -n "$BODY2" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $NF}')
curl -sf -w "\nHTTP %{http_code}\n" -X POST https://api.3nexgen.com/api/webhook/lemonsqueezy \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG2" \
  -d "$BODY2"
# Expected: HTTP 200 — {"ignored":true,"event":"subscription_updated"}

# T2.0.7 — Cleanup: cancel the test job so Pi5 doesn't pick it up
curl -sf -X PATCH https://api.3nexgen.com/api/jobs/E2E_HMAC_TEST \
  -H "X-Worker-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "failed", "error_log": "E2E test cleanup"}'
​```

**Pass criteria:** Invalid sig → 401, valid sig → order confirmed, idempotent replay safe, non-order events ignored
```

- [ ] **Step 2: Commit**

```bash
git add docs/pre-launch-e2e-test-plan.md
git commit -m "test(e2e): add T2.0 — webhook HMAC payment flow validation"
```

---

## Task 3: Add Phase T5b — Budget Enforcement (90% Warn, 100% Block)

**Files:**
- Modify: `docs/pre-launch-e2e-test-plan.md` (insert after Phase T5)

This is the **highest priority gap**. The proxy tracks cost but the existing T5 only verifies basic cost tracking — it never tests what happens when a customer hits their budget limit. The enforcement logic (from `cf-worker/src/handlers/proxy.ts` lines 85-89, 172-186):
- At 90% spend: sets `warned_at`, adds `X-Budget-Warning: true` response header
- At 100% spend: sets `blocked_at`, returns HTTP 429 with Chinese error message

**Budget tiers** (from `deployer.py`): Tier 1 = HKD 40, Tier 2 = HKD 70, Tier 3 = HKD 100.

- [ ] **Step 1: Insert Phase T5b after Phase T5**

```markdown
### Phase T5b: Budget Enforcement — Warn at 90%, Block at 100%
**Goal:** Verify the proxy warns at 90% budget and blocks at 100%
**Method:** Create a test usage record with a TINY budget (HKD 0.01), send requests until blocked
**Duration:** 10 min

​```bash
TOKEN=$(grep WORKER_TOKEN ~/nexgen-worker/.env | cut -d= -f2)
CONFIRM=$(grep CONFIRM_API_KEY ~/nexgen-worker/.env | cut -d= -f2)

# T5b.1 — Create test usage record with tiny budget (HKD 0.01)
# This way a single DeepSeek request (~HKD 0.001-0.01) will hit the limit fast
curl -sf -X POST https://api.3nexgen.com/api/usage \
  -H "X-Worker-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "E2E_BUDGET_TEST",
    "gateway_token": "e2ebudget00000000000000000000000000000000000000000000000000budget",
    "tier": 1,
    "monthly_budget_hkd": 0.01
  }'
# Expected: 200 OK

# T5b.2 — Send first request (should succeed, likely triggers 90% warning immediately)
RESPONSE=$(curl -sf -D /tmp/e2e_headers.txt -X POST \
  https://api.3nexgen.com/api/ai/deepseek/chat/completions \
  -H "Authorization: Bearer e2ebudget00000000000000000000000000000000000000000000000000budget" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Say OK"}],
    "max_tokens": 5
  }')
echo "Response: $RESPONSE"
echo "Headers:"
cat /tmp/e2e_headers.txt

# Check for warning header
grep -i "X-Budget-Warning" /tmp/e2e_headers.txt
# Expected: X-Budget-Warning: true (if spend >= 90% of HKD 0.01)

# T5b.3 — Check usage shows spend
curl -sf "https://api.3nexgen.com/api/usage/E2E_BUDGET_TEST" \
  -H "X-Confirm-Api-Key: $CONFIRM"
# Expected: current_spend_hkd > 0, warned_at may be set

# T5b.4 — Send second request (should be BLOCKED — budget exceeded)
BLOCK_RESPONSE=$(curl -sf -w "\nHTTP %{http_code}\n" -X POST \
  https://api.3nexgen.com/api/ai/deepseek/chat/completions \
  -H "Authorization: Bearer e2ebudget00000000000000000000000000000000000000000000000000budget" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Say OK"}],
    "max_tokens": 5
  }')
echo "$BLOCK_RESPONSE"
# Expected: HTTP 429
# Body: {"error":"API 每月用量已達上限。如需升級服務，請瀏覽我們的網站 3nexgen.com 或聯絡 @NexGenAI_Support_bot 查詢。用量將於下月 1 號自動重置。"}

# T5b.5 — Verify blocked_at is set in usage record
curl -sf "https://api.3nexgen.com/api/usage/E2E_BUDGET_TEST" \
  -H "X-Confirm-Api-Key: $CONFIRM"
# Expected: blocked_at is NOT null, blocked: true

# T5b.6 — Test admin budget increase unblocks
curl -sf -X PATCH "https://api.3nexgen.com/api/usage/E2E_BUDGET_TEST" \
  -H "X-Confirm-Api-Key: $CONFIRM" \
  -H "Content-Type: application/json" \
  -d '{"monthly_budget_hkd": 100.0}'
# Expected: 200 OK

# T5b.7 — Verify request succeeds again after budget increase
curl -sf -w "\nHTTP %{http_code}\n" -X POST \
  https://api.3nexgen.com/api/ai/deepseek/chat/completions \
  -H "Authorization: Bearer e2ebudget00000000000000000000000000000000000000000000000000budget" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Say OK"}],
    "max_tokens": 5
  }'
# Expected: HTTP 200 — DeepSeek response (no longer blocked)

# T5b.8 — Cleanup
curl -sf -X POST "https://api.3nexgen.com/api/usage/E2E_BUDGET_TEST/revoke" \
  -H "X-Confirm-Api-Key: $CONFIRM"
rm -f /tmp/e2e_headers.txt
​```

**Pass criteria:** First request triggers warning header, second request returns 429, budget increase unblocks, cleanup succeeds
```

- [ ] **Step 2: Commit**

```bash
git add docs/pre-launch-e2e-test-plan.md
git commit -m "test(e2e): add T5b — budget enforcement warn/block validation"
```

---

## Task 4: Add Phase T7b — Deployment Failure Handling

**Files:**
- Modify: `docs/pre-launch-e2e-test-plan.md` (insert after Phase T7)

The existing T7 only tests the happy path. This tests what happens when deployment fails. From `deployer.py`: missing bot_token → `failed` status with error_log; VPS provision failure → `failed` + customer notification; no retry logic exists — operator must manually re-queue.

- [ ] **Step 1: Insert Phase T7b after Phase T7**

```markdown
### Phase T7b: Deployment Failure Handling
**Goal:** Verify failed deployments are handled gracefully — correct status, error logged, no orphaned resources
**Method:** Create a job with invalid data that will fail during deployment
**Duration:** 10 min

​```bash
TOKEN=$(grep WORKER_TOKEN ~/nexgen-worker/.env | cut -d= -f2)
CONFIRM=$(grep CONFIRM_API_KEY ~/nexgen-worker/.env | cut -d= -f2)

# ⚠️ IMPORTANT: Stop the Pi5 worker FIRST so it doesn't pick up the job mid-test
systemctl --user stop nexgen-worker

# T7b.1 — Create a job with invalid bot_token (empty string)
curl -sf -X POST https://api.3nexgen.com/api/confirm/E2E_FAIL_TEST \
  -H "X-Confirm-Api-Key: $CONFIRM" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": 2,
    "telegram_user_id": "340067089",
    "bot_token": "",
    "bot_username": "fail_test_bot"
  }'

# T7b.2 — Manually invoke the deployer on this job (not via worker loop)
cd ~/nexgen-worker
~/nexgen-worker-env/bin/python3 -c "
import sys; sys.path.insert(0, '.')
from deployer import Deployer
from api_client import ApiClient
from config import *

api = ApiClient(WORKER_API_URL, WORKER_TOKEN)
deployer = Deployer(api)

# Fetch the job
import requests
resp = requests.get(f'{WORKER_API_URL}/api/jobs/E2E_FAIL_TEST',
                    headers={'X-Worker-Token': WORKER_TOKEN})
job = resp.json().get('job')
if job:
    print(f'Job status before: {job[\"status\"]}')
    deployer.deploy(job)
else:
    print('Job not found — check confirm endpoint')
"
# Expected: Deploy fails with "Missing bot_token" or similar
# Job status should be "failed" with error_log populated

# T7b.3 — Verify job status is "failed" with error logged
curl -sf https://api.3nexgen.com/api/jobs/E2E_FAIL_TEST -H "X-Worker-Token: $TOKEN"
# Expected: {"job":{"id":"E2E_FAIL_TEST","status":"failed","error_log":"..."}}

# T7b.4 — Verify no orphaned VPS was created
curl -sf 'https://api.3nexgen.com/api/vps?status=provisioning' -H "X-Worker-Token: $TOKEN"
# Expected: no VPS with customer_id = "E2E_FAIL_TEST"

# T7b.5 — Cleanup & restart worker
curl -sf -X PATCH https://api.3nexgen.com/api/jobs/E2E_FAIL_TEST \
  -H "X-Worker-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "failed", "error_log": "E2E test cleanup"}'

systemctl --user start nexgen-worker
systemctl --user is-active nexgen-worker
# Expected: active
​```

**Pass criteria:** Failed deployment → job status "failed" with error_log, no orphaned VPS, worker restarts cleanly
```

- [ ] **Step 2: Commit**

```bash
git add docs/pre-launch-e2e-test-plan.md
git commit -m "test(e2e): add T7b — deployment failure handling validation"
```

---

## Task 5: Add Phase T9 — Concurrent Job Queuing

**Files:**
- Modify: `docs/pre-launch-e2e-test-plan.md` (insert after Phase T8)

The Pi5 worker is intentionally synchronous (`worker.py` line 3 comment). This test validates that when 2 jobs are queued simultaneously, they are processed sequentially — no race conditions, no skipped jobs.

- [ ] **Step 1: Insert Phase T9 after Phase T8**

```markdown
### Phase T9: Concurrent Job Queuing
**Goal:** Verify multiple queued jobs are processed sequentially without races
**Method:** Insert 2 jobs simultaneously, observe worker processes them one at a time
**Duration:** 10 min

​```bash
TOKEN=$(grep WORKER_TOKEN ~/nexgen-worker/.env | cut -d= -f2)
CONFIRM=$(grep CONFIRM_API_KEY ~/nexgen-worker/.env | cut -d= -f2)

# ⚠️ Stop worker first
systemctl --user stop nexgen-worker

# T9.1 — Create 2 jobs in rapid succession
curl -sf -X POST https://api.3nexgen.com/api/confirm/E2E_QUEUE_A \
  -H "X-Confirm-Api-Key: $CONFIRM" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": 1,
    "telegram_user_id": "340067089",
    "bot_token": "FAKE_TOKEN_QUEUE_A",
    "bot_username": "queue_a_bot"
  }'

curl -sf -X POST https://api.3nexgen.com/api/confirm/E2E_QUEUE_B \
  -H "X-Confirm-Api-Key: $CONFIRM" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": 1,
    "telegram_user_id": "340067089",
    "bot_token": "FAKE_TOKEN_QUEUE_B",
    "bot_username": "queue_b_bot"
  }'

# T9.2 — Verify both jobs are "ready"
curl -sf https://api.3nexgen.com/api/jobs/E2E_QUEUE_A -H "X-Worker-Token: $TOKEN"
curl -sf https://api.3nexgen.com/api/jobs/E2E_QUEUE_B -H "X-Worker-Token: $TOKEN"
# Expected: both status = "ready"

# T9.3 — Get next job (should return only ONE — oldest first)
curl -sf https://api.3nexgen.com/api/jobs/next -H "X-Worker-Token: $TOKEN"
# Expected: returns E2E_QUEUE_A (created first)
# NOT both jobs — only one at a time

# T9.4 — Simulate first job completes
curl -sf -X PATCH https://api.3nexgen.com/api/jobs/E2E_QUEUE_A \
  -H "X-Worker-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "complete"}'

# T9.5 — Get next job again (should now return second job)
curl -sf https://api.3nexgen.com/api/jobs/next -H "X-Worker-Token: $TOKEN"
# Expected: returns E2E_QUEUE_B

# T9.6 — Cleanup both jobs
curl -sf -X PATCH https://api.3nexgen.com/api/jobs/E2E_QUEUE_B \
  -H "X-Worker-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "failed", "error_log": "E2E test cleanup"}'

# T9.7 — Restart worker
systemctl --user start nexgen-worker
systemctl --user is-active nexgen-worker
# Expected: active, no pending jobs
​```

**Pass criteria:** `/api/jobs/next` returns one job at a time, FIFO order, second job only available after first completes
```

- [ ] **Step 2: Commit**

```bash
git add docs/pre-launch-e2e-test-plan.md
git commit -m "test(e2e): add T9 — concurrent job queuing validation"
```

---

## Task 6: Add Phase T10 — VPS Status Lifecycle & Expiry Tracking

**Files:**
- Modify: `docs/pre-launch-e2e-test-plan.md` (insert after Phase T9)

This tests querying VPS across all statuses and documents the **expiry gap**: `cancel_deadline` is tracked in D1 but nothing auto-transitions VPS to `expired` status after the deadline. This phase validates current behavior and flags the gap.

- [ ] **Step 1: Insert Phase T10 after Phase T9**

```markdown
### Phase T10: VPS Status Lifecycle & Expiry Tracking
**Goal:** Verify all VPS statuses are queryable and document expiry behavior
**Method:** Query each VPS status filter, check cancel_deadline handling
**Duration:** 5 min

​```bash
TOKEN=$(grep WORKER_TOKEN ~/nexgen-worker/.env | cut -d= -f2)

# T10.1 — Query each VPS status
echo "=== Active VPS ==="
curl -sf 'https://api.3nexgen.com/api/vps?status=active' -H "X-Worker-Token: $TOKEN"

echo "=== Cancelling VPS ==="
curl -sf 'https://api.3nexgen.com/api/vps?status=cancelling' -H "X-Worker-Token: $TOKEN"

echo "=== Provisioning VPS ==="
curl -sf 'https://api.3nexgen.com/api/vps?status=provisioning' -H "X-Worker-Token: $TOKEN"

echo "=== Expired VPS ==="
curl -sf 'https://api.3nexgen.com/api/vps?status=expired' -H "X-Worker-Token: $TOKEN"
# Expected: each returns {"vps_list":[...]} (may be empty for some statuses)

# T10.2 — Verify recyclable endpoint returns cancelling VPS
curl -sf https://api.3nexgen.com/api/vps/recyclable -H "X-Worker-Token: $TOKEN"
# Expected: oldest cancelling VPS (by cancel_date ASC) or null

# T10.3 — Check cancel_deadline on cancelling VPS
# Parse the cancelling VPS response for cancel_deadline field
curl -sf 'https://api.3nexgen.com/api/vps?status=cancelling' -H "X-Worker-Token: $TOKEN" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for vps in data.get('vps_list', []):
    print(f'VPS {vps[\"vps_id\"]}: cancel_deadline={vps.get(\"cancel_deadline\", \"NOT SET\")}')
    print(f'  status={vps[\"status\"]}, cancel_date={vps.get(\"cancel_date\", \"N/A\")}')
"
# Expected: cancel_deadline shows when VPS can be recycled
# NOTE: current system does NOT auto-expire VPS after deadline —
#   this is a known gap. Recycling is triggered on-demand by try_recycle()
#   when a new customer needs a VPS, not by a scheduled expiry check.

# T10.4 — Consolidated inventory view (all statuses)
echo "=== Full VPS Inventory ==="
for STATUS in active cancelling provisioning expired; do
  COUNT=$(curl -sf "https://api.3nexgen.com/api/vps?status=$STATUS" \
    -H "X-Worker-Token: $TOKEN" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(len(data.get('vps_list', [])))
" 2>/dev/null)
  echo "  $STATUS: $COUNT"
done
# Expected: matches known Contabo inventory
​```

**⚠️ Known gap — VPS expiry is NOT automated:**
The D1 schema has `cancel_deadline` and `expired` status, but no code transitions VPS from `cancelling` → `expired` after the deadline passes. Current behavior:
- VPS stays `cancelling` indefinitely until `try_recycle()` picks it up for a new customer
- Contabo handles actual deletion independently
- **Recommendation:** Add a daily cron or worker check that marks VPS as `expired` when `cancel_deadline < NOW()`, to keep D1 status in sync with Contabo reality

**Pass criteria:** All 4 status filters return valid responses, recyclable endpoint works, cancel_deadline is populated on cancelling VPS
```

- [ ] **Step 2: Commit**

```bash
git add docs/pre-launch-e2e-test-plan.md
git commit -m "test(e2e): add T10 — VPS status lifecycle and expiry tracking"
```

---

## Task 7: Add Phase T11 — Full Pipeline Smoke Summary & Update Phase Numbering

**Files:**
- Modify: `docs/pre-launch-e2e-test-plan.md` (update intro, add T11 summary, update cleanup)

This final task adds a summary checklist at the end that ties all phases together, updates the duration estimate, and ensures the cleanup phase (T8) also covers the new test phases' artifacts.

- [ ] **Step 1: Update the intro section's duration and phase count**

In the header section, change:

```
> **Duration:** ~2-3 hours
```

to:

```
> **Duration:** ~3-4 hours (8 original + 7 additional phases)
```

- [ ] **Step 2: Update T8 cleanup to include new test artifacts**

In Phase T8, add these cleanup commands after T8.2:

```bash
# T8.2b — Clean up HMAC test job
curl -sf -X PATCH https://api.3nexgen.com/api/jobs/E2E_HMAC_TEST \
  -H "X-Worker-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "failed", "error_log": "E2E cleanup"}' 2>/dev/null

# T8.2c — Clean up budget test usage
curl -sf -X POST "https://api.3nexgen.com/api/usage/E2E_BUDGET_TEST/revoke" \
  -H "X-Confirm-Api-Key: $CONFIRM" 2>/dev/null

# T8.2d — Clean up failure test job
curl -sf -X PATCH https://api.3nexgen.com/api/jobs/E2E_FAIL_TEST \
  -H "X-Worker-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "failed", "error_log": "E2E cleanup"}' 2>/dev/null

# T8.2e — Clean up queue test jobs
for JOB in E2E_QUEUE_A E2E_QUEUE_B; do
  curl -sf -X PATCH "https://api.3nexgen.com/api/jobs/$JOB" \
    -H "X-Worker-Token: $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status": "failed", "error_log": "E2E cleanup"}' 2>/dev/null
done

# T8.2f — Remove temp header files
rm -f /tmp/e2e_headers.txt
```

- [ ] **Step 3: Insert Phase T11 — Final Smoke Summary at the end (before "Expected Final State")**

```markdown
### Phase T11: Full Pipeline Smoke Summary
**Goal:** Run a quick end-to-end smoke check across all subsystems after all tests
**Duration:** 5 min

​```bash
TOKEN=$(grep WORKER_TOKEN ~/nexgen-worker/.env | cut -d= -f2)
CONFIRM=$(grep CONFIRM_API_KEY ~/nexgen-worker/.env | cut -d= -f2)

echo "╔══════════════════════════════════════════════╗"
echo "║     NexGen Pre-Launch Smoke Summary          ║"
echo "╠══════════════════════════════════════════════╣"

# 1. CF Worker
CF=$(curl -sf -X POST https://api.3nexgen.com/api/health \
  -H "X-Worker-Token: $TOKEN" -H "Content-Type: application/json" -d '{}' \
  && echo "✓ PASS" || echo "✗ FAIL")
echo "║ CF Worker Health:        $CF"

# 2. Pi5 Worker
PI5=$(systemctl --user is-active nexgen-worker 2>/dev/null \
  && echo "✓ PASS" || echo "✗ FAIL")
echo "║ Pi5 Worker:              $PI5"

# 3. Job Queue (empty)
JOBS=$(curl -sf https://api.3nexgen.com/api/jobs/next \
  -H "X-Worker-Token: $TOKEN" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('✓ PASS (empty)' if d.get('job') is None else '✗ FAIL (job pending!)')
")
echo "║ Job Queue:               $JOBS"

# 4. Dashboard
DASH=$(test -f ~/nexgen-dashboard.md && echo "✓ PASS" || echo "✗ FAIL")
echo "║ Dashboard:               $DASH"

# 5. Recyclable Pool
POOL=$(curl -sf https://api.3nexgen.com/api/vps/recyclable \
  -H "X-Worker-Token: $TOKEN" | python3 -c "
import json,sys; d=json.load(sys.stdin)
r = d.get('vps')
print(f'✓ {r[\"vps_id\"]}' if r else '○ empty pool')
")
echo "║ Recyclable Pool:         $POOL"

# 6. Telegram
TG=$(~/nexgen-worker-env/bin/python3 -c "
import sys; sys.path.insert(0, '.')
from config import *; from notifier import Notifier
n = Notifier(OWNER_TELEGRAM_BOT_TOKEN, OWNER_TELEGRAM_CHAT_ID)
print('✓ PASS' if n.send('[Smoke] Pre-launch check OK') else '✗ FAIL')
" 2>/dev/null)
echo "║ Telegram Notify:         $TG"

echo "╠══════════════════════════════════════════════╣"
echo "║ Test completed at: $(date -u '+%Y-%m-%d %H:%M UTC')     ║"
echo "╚══════════════════════════════════════════════╝"
​```

**Pass criteria:** All 6 checks show ✓ PASS. System is ready for production.
```

- [ ] **Step 4: Commit**

```bash
git add docs/pre-launch-e2e-test-plan.md
git commit -m "test(e2e): add T11 smoke summary, update cleanup and duration"
```

---

## Expected Test Output — Complete Phase Matrix

When all 15 phases are run, the expected results are:

| Phase | Test | Expected Result | Duration |
|-------|------|----------------|----------|
| **T1** | CF Worker endpoints | 7/7 endpoints respond correctly | 5 min |
| **T1.5** | Dashboard health | Markdown generated, all sections present, cron active | 5 min |
| **T2.0** | Webhook HMAC | Invalid sig → 401, valid sig → order confirmed, idempotent replay safe | 10 min |
| **T2** | Job creation + pickup | Pi5 picks up job within 30s | 10 min |
| **T3** | VPS recycling | cancel → recycle → active → cancel cycle completes | 20-30 min |
| **T4** | Backup & restore | clawd.tar.gz + meta downloaded, size > 0 | 10 min |
| **T5** | AI proxy cost tracking | DeepSeek request proxied, HKD cost tracked | 10 min |
| **T5b** | Budget enforcement | Warning header at 90%, HTTP 429 block at 100%, budget increase unblocks | 10 min |
| **T6** | Telegram notifications | Owner + customer messages delivered | 5 min |
| **T7** | Full Agent SDK deploy | DEPLOYMENT_SUCCESS, OpenClaw running, QA passes | 30-60 min |
| **T7b** | Deployment failure | Job → "failed" with error_log, no orphaned VPS | 10 min |
| **T8** | Cleanup | All test artifacts removed, system clean | 10 min |
| **T9** | Concurrent job queue | FIFO ordering, one job at a time, no race conditions | 10 min |
| **T10** | VPS status lifecycle | All 4 statuses queryable, cancel_deadline populated, expiry gap documented | 5 min |
| **T11** | Smoke summary | 6/6 subsystem checks pass, Telegram confirmation sent | 5 min |

**Total estimated duration: ~3-4 hours**

**Critical path items** (must pass for launch):
1. T2.0 (HMAC) — real payment path works
2. T5b (budget enforcement) — revenue protection
3. T7 (full deploy) — core product works
4. T11 (smoke) — everything green
