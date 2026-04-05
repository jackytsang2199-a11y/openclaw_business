# Pre-Launch E2E Test Plan

> **Date:** 2026-04-05
> **Purpose:** Validate the entire NexGen pipeline end-to-end before accepting real customers
> **Duration:** ~2-3 hours
> **Outcome:** All tests pass, test data cleaned up, system ready for production

---

## Current State (Verified)

```
Contabo Instances:
  203187256 | 161.97.88.8    | running | cancel=2026-04-27
  203187278 | 161.97.82.155  | running | cancel=2026-04-27

D1 Records:
  VPS: vmi3187278 | 161.97.82.155 | active | customer_id=1001 | tier=2

Pi5 Worker: active (running since 2026-03-28, 8+ days)
CF Worker: api.3nexgen.com (responding in ~0.5s)
```

**Important:** Both Contabo VPS have `cancel=2026-04-27` — they are already scheduled for cancellation. They CAN be revoked (un-cancelled) and recycled.

---

## Visual Pipeline — Full Customer Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CUSTOMER JOURNEY                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ① WEBSITE                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐                  │
│  │ Pricing  │───>│Onboarding│───>│ Lemon Squeezy│                  │
│  │  Page    │    │  Form    │    │  Checkout    │                  │
│  │ /pricing │    │/onboarding│   │ (payment)    │                  │
│  └──────────┘    └──────────┘    └──────┬───────┘                  │
│                                         │                           │
│  ② PAYMENT WEBHOOK                      │                           │
│  ┌──────────────────────────────────────▼────────┐                  │
│  │ CF Worker: POST /api/webhook/lemonsqueezy     │                  │
│  │   → Validate HMAC signature                   │                  │
│  │   → Extract customer data                     │                  │
│  │   → Create job in D1 (status: "ready")        │                  │
│  └──────────────────────────────┬────────────────┘                  │
│                                 │                                   │
│  ③ PI5 WORKER PICKS UP JOB     │                                   │
│  ┌──────────────────────────────▼────────────────┐                  │
│  │ Pi5: GET /api/jobs/next (every 30s)           │                  │
│  │   → Job found! Extract tier, bot token, etc.  │                  │
│  └──────────────────────────────┬────────────────┘                  │
│                                 │                                   │
│  ④ VPS PROVISIONING             │                                   │
│  ┌──────────────────────────────▼────────────────┐                  │
│  │ Check recycling pool first:                   │                  │
│  │   → GET /api/vps/recyclable                   │                  │
│  │   → If found: revoke cancel + reinstall OS    │                  │
│  │   → If empty: Contabo API → create new VPS    │                  │
│  │   → Wait for SSH ready (~5 min)               │                  │
│  └──────────────────────────────┬────────────────┘                  │
│                                 │                                   │
│  ⑤ AGENT SDK DEPLOYMENT         │                                   │
│  ┌──────────────────────────────▼────────────────┐                  │
│  │ Claude Agent SDK session (Sonnet, max 50 turns)│                  │
│  │   → Reads openclaw_install/CLAUDE.md playbook │                  │
│  │   → Uploads scripts via SCP                   │                  │
│  │   → Runs 14 install scripts in 3 phases       │                  │
│  │   → Phase 1: 00-03 (base) → gate check        │                  │
│  │   → Phase 2: 04-07 (core) → gate check        │                  │
│  │   → Phase 3: 08-13 (extras) → gate check      │                  │
│  │   → 5-layer QA suite (28 checks)              │                  │
│  │   → Output: DEPLOYMENT_SUCCESS or FAILED       │                  │
│  └──────────────────────────────┬────────────────┘                  │
│                                 │                                   │
│  ⑥ GATEWAY TOKEN REGISTRATION   │                                   │
│  ┌──────────────────────────────▼────────────────┐                  │
│  │ Pi5: POST /api/usage                          │                  │
│  │   → Generate 64-char gateway token            │                  │
│  │   → Register in D1 with tier budget           │                  │
│  │   → VPS uses token as "API key" for proxy     │                  │
│  └──────────────────────────────┬────────────────┘                  │
│                                 │                                   │
│  ⑦ CUSTOMER DELIVERY            │                                   │
│  ┌──────────────────────────────▼────────────────┐                  │
│  │ Pi5:                                          │                  │
│  │   → Set Telegram webhook on customer's VPS    │                  │
│  │   → Send customer "Your AI is ready!"         │                  │
│  │   → Update job status → "complete"            │                  │
│  │   → Notify owner via Telegram                 │                  │
│  └──────────────────────────────────────────────┘                  │
│                                                                     │
│  ⑧ ONGOING OPERATIONS                                               │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐            │
│  │ API Proxy     │  │ Weekly Backup │  │ VPS Recycling│            │
│  │ Cost tracking │  │ mem0 + qdrant │  │ Cancel/Revoke│            │
│  │ Budget enforce│  │ to Pi5 local  │  │ Reinstall    │            │
│  └───────────────┘  └───────────────┘  └──────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Test Plan — 8 Phases

### Phase T1: CF Worker Endpoint Validation
**Goal:** Verify all API endpoints respond correctly
**Method:** curl from Pi5
**Duration:** 5 min

```bash
# Run on Pi5
cd ~/nexgen-worker
TOKEN=$(grep WORKER_TOKEN .env | cut -d= -f2)
CONFIRM=$(grep CONFIRM_API_KEY .env | cut -d= -f2)

# T1.1 — Health ping
curl -sf -X POST https://api.3nexgen.com/api/health \
  -H "X-Worker-Token: $TOKEN" -H "Content-Type: application/json" -d '{}'
# Expected: {"ok":true}

# T1.2 — Jobs (no pending)
curl -sf https://api.3nexgen.com/api/jobs/next -H "X-Worker-Token: $TOKEN"
# Expected: {"job":null}

# T1.3 — VPS list
curl -sf 'https://api.3nexgen.com/api/vps?status=active' -H "X-Worker-Token: $TOKEN"
# Expected: {"vps_list":[...vmi3187278...]}

# T1.4 — Recyclable pool
curl -sf https://api.3nexgen.com/api/vps/recyclable -H "X-Worker-Token: $TOKEN"
# Expected: null or a VPS object

# T1.5 — Usage list (admin)
curl -sf https://api.3nexgen.com/api/usage -H "X-Confirm-Api-Key: $CONFIRM"
# Expected: {"usage":[...]}

# T1.6 — AI proxy (auth required)
curl -sf -X POST https://api.3nexgen.com/api/ai/deepseek/chat/completions \
  -H "Authorization: Bearer fake-token" -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"hi"}]}'
# Expected: 401 "Invalid authentication token"

# T1.7 — 404 catch-all
curl -sf https://api.3nexgen.com/api/nonexistent
# Expected: {"error":"Not found","endpoints":[...]}
```

**Pass criteria:** All 7 endpoints return expected responses

---

### Phase T2: Manual Job Creation + Worker Pickup
**Goal:** Verify Pi5 worker picks up and processes a job
**Method:** Manually insert a test job via CF Worker admin endpoint, watch Pi5 logs
**Duration:** 10 min

```bash
# T2.1 — Create a test job (simulate payment confirmation)
# On Pi5 or PC:
curl -sf -X POST https://api.3nexgen.com/api/confirm/99999 \
  -H "X-Confirm-Api-Key: $CONFIRM" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": 2,
    "telegram_user_id": "340067089",
    "bot_token": "YOUR_TEST_BOT_TOKEN",
    "bot_username": "NexGenAI_test_bot",
    "email": "test@test.com"
  }'
# Expected: Job created in D1 with status "ready"

# T2.2 — Watch Pi5 logs for job pickup
# On Pi5:
journalctl --user -u nexgen-worker.service -f
# OR:
systemctl --user status nexgen-worker.service
# Expected: "[worker] Job found: 99999"

# T2.3 — After pickup, check job status changed
curl -sf https://api.3nexgen.com/api/jobs/99999 -H "X-Worker-Token: $TOKEN"
# Expected: status changed from "ready" to "provisioning" or "installing"
```

**⚠️ WARNING:** This will trigger a REAL VPS provision on Contabo. To avoid costs:
- Option A: Use one of the 2 existing VPS (already paid until Apr 27)
- Option B: Cancel the test job QUICKLY before provision completes
- Option C: Create the job with a fake/invalid tier to test pickup without provisioning

**Recommended:** Option A — create the job pointing to existing VPS 161.97.82.155

**Pass criteria:** Pi5 picks up job within 30 seconds

---

### Phase T3: VPS Recycling Flow
**Goal:** Test cancel → recycle → reinstall pipeline
**Method:** Use one of the 2 existing VPS (both have cancel=2026-04-27)
**Duration:** 20-30 min

```bash
# T3.1 — Run E2E dry-run (connectivity only)
cd ~/nexgen-worker
~/nexgen-worker-env/bin/python3 tests/test_e2e_vps_lifecycle.py --dry-run

# T3.2 — Test revoke (un-cancel) a VPS
# This uses VPS 203187256 (161.97.88.8) — the spare one
~/nexgen-worker-env/bin/python3 tests/test_e2e_vps_lifecycle.py \
  --vps-id 203187256 --job-id E2E_RECYCLE_TEST --test recycle

# Interactive prompts will ask for confirmation before:
#   - Revoking Contabo cancellation
#   - Reinstalling OS
#   - Updating D1 record

# T3.3 — Verify VPS is now "active" in D1
curl -sf 'https://api.3nexgen.com/api/vps?status=active' -H "X-Worker-Token: $TOKEN"
# Expected: 2 active VPS (vmi3187278 + 203187256 recycled)

# T3.4 — Re-cancel the test VPS (clean up)
~/nexgen-worker-env/bin/python3 tests/test_e2e_vps_lifecycle.py \
  --vps-id 203187256 --job-id E2E_RECYCLE_TEST --test cancel
```

**Pass criteria:** VPS cycles through cancel → recycle → active → cancel

---

### Phase T4: Backup & Restore
**Goal:** Test backup pulls data from VPS to Pi5
**Method:** Use existing VPS 161.97.82.155 (Tier 2 with OpenClaw installed)
**Duration:** 10 min

```bash
# T4.1 — Run E2E dry-run (SSH only)
cd ~/nexgen-worker
~/nexgen-worker-env/bin/python3 tests/test_e2e_backup_restore.py \
  --dry-run --vps-ip 161.97.82.155

# T4.2 — Full backup test
~/nexgen-worker-env/bin/python3 tests/test_e2e_backup_restore.py \
  --vps-ip 161.97.82.155 --customer-id E2E_BACKUP_TEST --tier 2

# Expected checks:
#   - SSH connectivity: PASS
#   - clawd.tar.gz downloaded: PASS (size > 0)
#   - mem0.db downloaded: PASS or "not present" (acceptable)
#   - Qdrant snapshot: PASS or "not present" (acceptable)
#   - backup-meta.json valid: PASS
#   - VPS /tmp cleanup: PASS
#   - No false anomaly alert: PASS

# T4.3 — Verify backup files
ls -la /tmp/e2e_backup_*/active/E2E_BACKUP_TEST/
# Expected: clawd.tar.gz + backup-meta.json (+ mem0.db, qdrant if available)
```

**Pass criteria:** All backup checks pass, files exist with size > 0

---

### Phase T5: AI Proxy Cost Tracking
**Goal:** Verify the proxy correctly forwards API requests and tracks costs
**Method:** Create a test gateway token, send requests through proxy
**Duration:** 10 min

```bash
# T5.1 — Create test usage record with gateway token
curl -sf -X POST https://api.3nexgen.com/api/usage \
  -H "X-Worker-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "E2E_PROXY_TEST",
    "gateway_token": "e2etest000000000000000000000000000000000000000000000000000000test",
    "tier": 2,
    "monthly_budget_hkd": 10.0
  }'
# Expected: 200 OK

# T5.2 — Send a chat request through proxy
curl -sf -X POST https://api.3nexgen.com/api/ai/deepseek/chat/completions \
  -H "Authorization: Bearer e2etest000000000000000000000000000000000000000000000000000000test" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Say hello in 5 words"}],
    "max_tokens": 20
  }'
# Expected: DeepSeek response with usage tokens

# T5.3 — Check cost was tracked
curl -sf "https://api.3nexgen.com/api/usage/E2E_PROXY_TEST" \
  -H "X-Confirm-Api-Key: $CONFIRM"
# Expected: current_spend_hkd > 0, total_tokens_in > 0

# T5.4 — Clean up test usage record
curl -sf -X POST "https://api.3nexgen.com/api/usage/E2E_PROXY_TEST/revoke" \
  -H "X-Confirm-Api-Key: $CONFIRM"
```

**Pass criteria:** Proxy forwards request, cost tracked in HKD, cleanup succeeds

---

### Phase T6: Telegram Notifications
**Goal:** Verify all notification paths work
**Method:** Test from Pi5
**Duration:** 5 min

```bash
# T6.1 — Owner notification (already verified)
cd ~/nexgen-worker
~/nexgen-worker-env/bin/python3 -c "
import sys; sys.path.insert(0, '.')
from config import *
from notifier import Notifier
n = Notifier(OWNER_TELEGRAM_BOT_TOKEN, OWNER_TELEGRAM_CHAT_ID)
print('Owner notify:', n.send('[E2E Test] Owner notification test'))
"

# T6.2 — Customer notification (uses test bot)
~/nexgen-worker-env/bin/python3 -c "
from notifier import Notifier
# Use the same test bot to send to yourself
Notifier.send_customer_message(
    'YOUR_TEST_BOT_TOKEN',
    '340067089',
    'Your AI assistant is ready! Start chatting now.'
)
print('Customer message sent')
"

# T6.3 — Webhook set test (dry-run — use a fake URL)
~/nexgen-worker-env/bin/python3 -c "
from notifier import Notifier
# This will fail gracefully (invalid URL) but tests the code path
try:
    Notifier.set_webhook('YOUR_TEST_BOT_TOKEN', 'https://0.0.0.0:18789/webhook')
    print('Webhook set attempted')
except Exception as e:
    print(f'Expected error: {e}')
"
```

**Pass criteria:** Owner receives message, customer message sent

---

### Phase T7: Full Deployment (Agent SDK)
**Goal:** Test a complete deployment on an existing VPS
**Method:** Use VPS 161.97.88.8 (the spare) or 161.97.82.155
**Duration:** 30-60 min (Agent SDK session)
**⚠️ CAUTION:** This will reinstall the VPS OS and deploy OpenClaw

```bash
# T7.1 — Prepare: ensure VPS is SSH-accessible
ssh -i ~/.ssh/nexgen_automation -o StrictHostKeyChecking=no deploy@161.97.88.8 "echo OK"

# T7.2 — Create a deployment job manually
# Option A: Use the confirm endpoint
curl -sf -X POST https://api.3nexgen.com/api/confirm/E2E_DEPLOY_TEST \
  -H "X-Confirm-Api-Key: $CONFIRM" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": 2,
    "telegram_user_id": "340067089",
    "bot_token": "YOUR_TEST_BOT_TOKEN",
    "bot_username": "NexGenAI_test_bot"
  }'

# T7.3 — Watch Pi5 logs for the full deployment
journalctl --user -u nexgen-worker.service -f
# OR: tail the worker process output

# Expected flow (watch for these log lines):
#   [worker] Job found: E2E_DEPLOY_TEST
#   [deploy] Checking recycling pool...
#   [deploy] Provisioning VPS...
#   [agent] Starting Agent SDK session...
#   [agent] Running Phase 1: base system...
#   [agent] Gate check 1: PASS
#   [agent] Running Phase 2: core services...
#   [agent] Gate check 2: PASS
#   [agent] Running Phase 3: extras + config...
#   [agent] Gate check 3: PASS
#   [agent] DEPLOYMENT_SUCCESS
#   [deployer] Setting webhook...
#   [deployer] Notifying customer...
#   [deployer] Job E2E_DEPLOY_TEST: COMPLETE

# T7.4 — Verify deployment
ssh -i ~/.ssh/nexgen_automation deploy@161.97.88.8 "
  systemctl --user is-active openclaw && echo 'OpenClaw: running' || echo 'OpenClaw: not running'
  docker ps --format '{{.Names}}: {{.Status}}' 2>/dev/null
  curl -s http://localhost:6333/collections 2>/dev/null | head -50
"

# T7.5 — Test the AI proxy works for this customer's gateway token
# (The deployer registers a gateway token automatically)
# Check the latest usage record:
curl -sf "https://api.3nexgen.com/api/usage/E2E_DEPLOY_TEST" \
  -H "X-Confirm-Api-Key: $CONFIRM"
```

**Pass criteria:** Agent SDK completes, DEPLOYMENT_SUCCESS, OpenClaw running, QA passes

---

### Phase T8: Cleanup
**Goal:** Remove all test data, leave system clean for production
**Duration:** 10 min

```bash
# T8.1 — Clean up test jobs from D1
# (May need wrangler D1 direct access or admin endpoint)
# Jobs to remove: 99999, E2E_RECYCLE_TEST, E2E_DEPLOY_TEST

# T8.2 — Clean up test usage records
curl -sf -X POST "https://api.3nexgen.com/api/usage/E2E_PROXY_TEST/revoke" \
  -H "X-Confirm-Api-Key: $CONFIRM" 2>/dev/null
curl -sf -X POST "https://api.3nexgen.com/api/usage/E2E_DEPLOY_TEST/revoke" \
  -H "X-Confirm-Api-Key: $CONFIRM" 2>/dev/null

# T8.3 — Re-cancel the recycled VPS (if T3 revoked it)
# VPS 203187256 should go back to cancel state
# Use Contabo panel or provision script

# T8.4 — Clean test backup files
rm -rf /tmp/e2e_backup_*

# T8.5 — Verify clean state
echo "=== Final State Check ==="
TOKEN=$(grep WORKER_TOKEN ~/nexgen-worker/.env | cut -d= -f2)

echo "Jobs:" && curl -sf https://api.3nexgen.com/api/jobs/next \
  -H "X-Worker-Token: $TOKEN"
# Expected: {"job":null}

echo "VPS:" && curl -sf 'https://api.3nexgen.com/api/vps?status=active' \
  -H "X-Worker-Token: $TOKEN"
# Expected: Original VPS only (vmi3187278)

echo "Recyclable:" && curl -sf https://api.3nexgen.com/api/vps/recyclable \
  -H "X-Worker-Token: $TOKEN"
# Expected: null or the 2 cancelled VPS

echo "Worker:" && systemctl --user is-active nexgen-worker
# Expected: active
```

**Pass criteria:** No test artifacts remain, system matches pre-test state

---

## Expected Final State (Post-Cleanup, Ready for Production)

```
Contabo:
  203187256 | 161.97.88.8   | running | cancel=2026-04-27 (recyclable)
  203187278 | 161.97.82.155 | running | cancel=2026-04-27 (recyclable)

D1:
  Jobs: empty (no pending/active)
  VPS: 2 records, both "cancelling" status (recyclable pool)
  Usage: no test records

Pi5:
  nexgen-worker: active (running)
  Backups: daily cron running
  Dashboard: cron running every 15 min
  Telegram: owner bot working

CF Worker:
  All endpoints responding
  Secrets configured
  D1 clean
```

---

## PI5-GUIDE.md Update Needed

The following items in PI5-GUIDE.md are **stale** and need updating:

1. **Line 99:** "service is currently loaded but not enabled" → service IS enabled and running since 2026-03-28
2. **Lines 299-301:** Old tier names (新手上路/智能管家/全能大師) and prices ($148/$248/$388) → new names (基本版/專業版/旗艦版) and prices ($248/$398/$598)
3. **Line 339:** Model "Claude Sonnet 4.6" → verify current model name

---

## Checklist — What Pi5 Assistant Needs to Know

Tell your Pi5 assistant (Claude on Pi5) these key points:

1. **Read PI5-GUIDE.md** for the full operations reference
2. **Tier names changed:** 基本版 Starter ($248/mo), 專業版 Pro ($398/mo), 旗艦版 Elite ($598/mo)
3. **No install fees** — subscription only
4. **Telegram bot works** — owner notifications verified (was broken, now fixed after /start)
5. **2 VPS in recycling pool** — both cancel=2026-04-27, can be revoked for new customers
6. **E2E test scripts exist** — `tests/test_e2e_vps_lifecycle.py` and `test_e2e_backup_restore.py`
7. **Auth headers:**
   - Pi5 → CF Worker: `X-Worker-Token`
   - Admin endpoints: `X-Confirm-Api-Key`
   - Customer proxy: `Authorization: Bearer {gateway_token}`
