# Semi-Auto Operations System Design

> **Date:** 2026-04-06
> **Status:** Approved
> **Purpose:** Convert NexGen from full-auto deployment to semi-auto with AI-assisted control via Telegram

---

## Problem

The full automation pipeline (payment -> provision -> deploy -> deliver) is built and working, but launching with zero production traffic means edge cases will surface unsupervised. A single operator (Jacky) needs to stay in the loop for the first 10-20 customers while keeping the convenience of phone-only management.

**Constraint:** No opening PC and SSH-ing into Pi5. Marigold (personal OpenClaw on Pi5) serves as the control interface via Telegram.

---

## Architecture

### Current (Full Auto)

```
Lemon Squeezy -> webhook -> CF Worker D1 (status: ready)
                                |
                    Pi5 worker polls -> auto-deploys -> delivers
```

### New (Semi Auto)

```
Lemon Squeezy -> webhook -> CF Worker D1 (status: ready)
                                |
                    Pi5 worker polls -> notifies owner via Telegram -> STOPS
                                |
              Owner chats with Marigold on Telegram:
                "有新單，幫我睇下用邊個 VPS"
                                |
              Marigold reads dashboard, suggests action
                                |
              Owner: "OK deploy 佢"
                                |
              Marigold calls nexgen_admin tool -> confirmation gate
                                |
              Owner: "confirm 1003" -> executes with live progress
```

### Visual Flow

```
TRIGGER: Customer Pays
=======================

  Customer --> 3nexgen.com/pricing --> Lemon Squeezy checkout --> Paid!
                                              |
                                              v
                                  +------------------------+
                                  |  CF Worker             |
                                  |  POST /api/webhook     |
                                  |  -> Create job in D1   |
                                  |  -> status: "ready"    |
                                  +----------+-------------+
                                             |

NOTIFICATION: Pi5 Worker Detects Job
====================================
                                             |
                                             v
                                  +------------------------+
                                  |  worker.py (Pi5)       |
                                  |  polls every 30s       |
                                  |  -> Job found!         |
                                  |  -> DO NOT deploy      |
                                  |  -> Send Telegram via  |
                                  |     Owner Bot          |
                                  +----------+-------------+
                                             |
                                             v
                              +-----------------------------+
                              |  Owner's Phone (Telegram)   |
                              |                             |
                              |  New order #1003            |
                              |  Tier: Pro                  |
                              |  Customer: @user123_bot     |
                              |  Waiting for your command.  |
                              +-----------------------------+
                                             |

DECISION: Chat with Marigold
==============================
                                             |
  Owner: "有新單，幫我睇下情況"              |
                              v              |
                   +---------------------+
                   |  Marigold (AI)      |
                   |  calls: jobs()      |  <- READ, no confirm
                   |  calls: pool()      |  <- READ, no confirm
                   |  calls: status()    |  <- READ, no confirm
                   +----------+----------+
                              |
                              v
  Marigold: "依家有一張新單 #1003, Tier 2 Pro.
             VPS 203187256 (161.97.88.8) idle, 到期 Apr 27.
             建議 recycle 呢個 VPS 嚟 deploy."
                              |
  Owner: "OK deploy 佢"      |
                              |

CONFIRMATION: Code-Level Gate (NOT AI)
=======================================
                              |
                              v
                   +-------------------------------+
                   |  CONFIRMATION GATE            |
                   |  (Python code, not AI)        |
                   |                               |
                   |  Job: #1003 (Tier 2 Pro)      |
                   |  VPS: 203187256               |
                   |  IP: 161.97.88.8              |
                   |  Action: recycle -> deploy     |
                   |                               |
                   |  Reply "confirm 1003"         |
                   |  Reply "cancel" to abort      |
                   |  (10 min timeout)             |
                   +-------------------------------+
                              |
  Owner: "confirm 1003"      |
              |               |
              v               |

EXECUTION: Deploy with Live Progress
======================================
              |
              v
  +----------------------------------------------+
  |  deployer.deploy(job)                        |
  |                                              |
  |  Progress updates to Telegram:               |
  |                                              |
  |  [0 min]  Recycling VPS 203187256...         |
  |  [5 min]  OS reinstalled, SSH ready          |
  |  [6 min]  Agent SDK session started          |
  |  [12 min] Phase 1 (base): PASS              |
  |  [20 min] Phase 2 (core): PASS              |
  |  [30 min] Phase 3 (extras): PASS            |
  |  [32 min] QA: 28/28 passed                  |
  |  [33 min] Gateway token registered           |
  |  [33 min] Webhook set, customer notified     |
  |  [33 min] Deploy #1003 COMPLETE              |
  |                                              |
  |  On failure:                                 |
  |  [20 min] Phase 2 FAILED: Qdrant won't start |
  |           Error saved. Ask me for logs.      |
  +----------------------------------------------+
              |

RESULT: Verify
===============
              |
              v
  Owner: "check 下個 VPS"
  Marigold: [calls health("161.97.88.8")]
  Marigold: "全部正常: Gateway running, Watchdog running,
             Qdrant healthy, SearXNG running,
             Disk 35G free, Memory 1.2G free"
```

---

## What Changes vs What Stays

| Component | Change | Detail |
|-----------|--------|--------|
| `worker.py` | **Modify** | Notify-only mode: on new job, send Telegram alert, don't deploy |
| `dashboard.py` | **Enhance** | Add pending orders + recyclable pool sections |
| `nexgen_admin` skill | **New** | OpenClaw skill for Marigold with read/write operations |
| `nexgen_cli.py` | **New** | CLI entry point (called by the skill, also usable via SSH) |
| `confirmations.py` | **New** | Confirmation gate logic (string match, timeout) |
| `formatters.py` | **New** | Format API data into readable messages |
| CF Worker webhook handler | **Enhance** | Handle subscription_cancelled, subscription_expired, payment_failed |
| deployer.py | **Modify** | Accept optional vps_id param; remove @NexGenAI_Support_bot references |
| proxy.ts | **Modify** | Remove @NexGenAI_Support_bot from budget block message |
| delivery-message.md | **Modify** | Remove Telegram support contact |
| Website (all languages) | **Modify** | Remove Telegram contact elements, keep email + ticket only |
| CF Worker proxy | No change | Cost tracking, budget enforcement, gateway tokens |
| `vps_lifecycle.py` | No change | Called by nexgen_admin instead of worker.py |
| `notifier.py` | No change | Used by both worker.py and deployer.py |
| Backup cron | No change | Runs weekly automatically |
| Dashboard cron | No change | Runs every 15 min |
| Health pings | No change | worker.py still sends health pings |

---

## Security Model: Smart Brain, Dumb Hands

Marigold already runs as `jacky999` on Pi5 with full bash access. The nexgen_admin tool doesn't increase the attack surface -- it **restricts** it by channeling operations through validated functions instead of raw bash.

### Principle

- AI can **read anything** freely (dashboard, logs, status, usage)
- AI can only **write through predefined functions** (deploy, cancel, upgrade, etc.)
- **Destructive writes require explicit confirmation** -- handled by code, not by AI
- Confirmation is a **string match in Python** -- immune to prompt injection

### Threat Mitigations

| Threat | Mitigation |
|--------|-----------|
| Telegram account stolen | 2FA on Telegram (prerequisite) |
| AI hallucination calls deploy | Confirmation gate blocks until "confirm {job_id}" typed |
| AI calls deploy with wrong params | Confirmation shows exact params before execution |
| Prompt injection in customer data | AI can suggest wrong action, but confirmation shows real params |
| AI tries raw bash to bypass | Acceptable risk (same as current). Skill is the easier/natural path |

### Confirmation Flow (Code-Level Gate)

```python
# This is CODE, not AI. The AI calls the function, the CODE handles confirmation.

def confirm_deploy(job_id, vps_id):
    # 1. Fetch real data from API (not from AI's suggestion)
    job = api.get_job(job_id)
    vps = api.get_vps(vps_id)

    # 2. Show REAL params to owner (code-generated, not AI-generated)
    notifier.send(f"""
        CONFIRM DEPLOY
        Job: {job['id']} (Tier {job['tier']})
        VPS: {vps['vps_id']} ({vps['contabo_ip']})
        Action: recycle -> reinstall -> deploy
        Reply "confirm {job_id}" to proceed
    """)

    # 3. Wait for owner reply (10 min timeout)
    reply = wait_for_telegram_reply(timeout=600)

    # 4. String match -- not AI interpretation
    if reply.strip() == f"confirm {job_id}":
        return True  # proceed
    return False  # abort
```

---

## Telegram Bot Architecture

### Three Bots (No Support Bot)

| Bot | Purpose | Who Sees It |
|-----|---------|-------------|
| `@NexGenAI_test_bot` | Owner notifications (alerts, deploy status) | Jacky only |
| Marigold (personal OpenClaw) | AI assistant -- manage NexGen via conversation | Jacky only |
| Customer's own bot | Customer's AI assistant (created via BotFather) | Customer only |

**No customer-facing support bot.** Support is via email (`support@3nexgen.com`) and ticket system only.

### Notification Flow

```
Owner Bot (@NexGenAI_test_bot):
  - Pushes alerts proactively (new order, deploy result, failures)
  - One-way: bot -> Jacky (no AI, just notifications)

Marigold (personal OpenClaw):
  - Reactive: only responds when Jacky messages her
  - Has nexgen_admin skill for reading status + triggering actions
  - Two-way AI conversation

Typical interaction:
  1. Owner Bot pushes: "New order #1003, Tier 2"
  2. Jacky opens Marigold chat: "有新單，幫我處理"
  3. Marigold reads dashboard, suggests, Jacky confirms
```

### Notification Deduplication

Worker polls every 30s. Without dedup, a `ready` job triggers notifications every 30s.

- **First detection:** Send full notification
- **Subsequent polls:** Skip (track notified job IDs in memory set)
- **After 2 hours:** Send ONE reminder: "Order #1003 still pending (2h ago)"
- **After reminder:** No more notifications for this job

---

## nexgen_admin Tool -- Function Specification

### READ Operations (No Confirmation Needed)

| Function | Purpose | Implementation |
|----------|---------|----------------|
| `status` | Full system dashboard | Calls `dashboard.py generate()`, returns markdown |
| `jobs` | Pending/active/failed jobs | `GET /api/jobs/next` + query active/failed |
| `pool` | Recyclable VPS + full inventory | `GET /api/vps/recyclable` + all statuses |
| `customer(id)` | Single customer detail | `GET /api/usage/{id}` + VPS lookup |
| `health(vps_ip)` | SSH health check on one VPS | SSH to `deploy@{ip}`, check 6 services |
| `logs(job_id)` | Deploy/error logs for a job | `GET /api/jobs/{id}` extract error_log |
| `backups` | Backup status per customer | Scan `~/backups/active/*/backup-meta.json` |
| `costs` | Monthly cost summary | `GET /api/usage` (admin) sum all spend |
| `contabo` | Real Contabo VPS inventory | Contabo API list, compare with D1 |
| `morning_report` | Summary report (all of the above combined) | Narrative summary in Chinese |

### WRITE Operations (Confirmation Required)

| Function | Purpose | Confirmation Shows |
|----------|---------|-------------------|
| `deploy(job_id, vps_id)` | Deploy pending order onto VPS | Job tier/customer, VPS IP, action plan |
| `cancel(customer_id)` | Wipe VPS + cancel at Contabo + revoke token | Customer name, VPS IP, data deletion warning |
| `upgrade(customer_id, new_tier)` | Increase API budget | Current -> new tier, budget change, LS reminder |
| `downgrade(customer_id, new_tier)` | Reduce API budget (keep plugins) | Current -> new tier, budget reduction, LS reminder |
| `rotate_token(customer_id)` | Generate new gateway token | Customer ID, old token masked, immediate effect |
| `reset_budget(customer_id)` | Reset monthly spend to 0 | Customer, current spend being zeroed |
| `block(customer_id)` | Emergency block API access | Customer ID, effect (all requests -> 429) |
| `unblock(customer_id)` | Restore API access | Customer ID, tier, budget restored |
| `provision_new` | Create fresh VPS from Contabo | Cost, region, specs |
| `backup_now(customer_id)` | Trigger immediate backup | Customer, VPS IP, destination |

### MONITOR Operations

| Function | Purpose | Trigger |
|----------|---------|---------|
| `watch_deploy(job_id)` | Stream deploy progress to Telegram | Auto-starts after confirm deploy |
| `morning_report` | Narrative summary of everything | On-demand ("報告") |

---

## Upgrade / Downgrade Design

### Tier Budget Map

| Tier | Name | Subscription | API Budget HKD | Token Allocation (marketing) |
|------|------|-------------|----------------|------------------------------|
| 1 | Starter | HK$248/mo | HK$40 | 5M tokens/mo |
| 2 | Pro | HK$398/mo | HK$70 | 10M tokens/mo |
| 3 | Elite | HK$598/mo | HK$100 | 20M tokens/mo |

### Upgrade Flow

1. `nexgen_admin("upgrade", customer_id, new_tier)` -> updates `monthly_budget_hkd` in D1
2. Marigold reminds: "記住去 Lemon Squeezy dashboard 改 subscription price"
3. Operator manually adjusts in LS dashboard (change subscription variant)
4. No VPS changes needed -- all plugins already installed at highest tier

### Downgrade Flow

1. `nexgen_admin("downgrade", customer_id, new_tier)` -> reduces `monthly_budget_hkd` in D1
2. Marigold reminds: "記住去 Lemon Squeezy dashboard 改 subscription price"
3. Operator manually adjusts in LS dashboard
4. **No plugin removal** -- Mem0, SearXNG, watchdog stay installed
5. Budget cap is the control -- proxy blocks at 100% budget regardless of installed features
6. This is simpler and reversible vs SSH-ing in to uninstall services

### Why Not Auto-Adjust Lemon Squeezy?

LS subscription changes require their Merchant API with OAuth. For <20 customers, manual adjustment in LS dashboard (2 clicks) is faster than building API integration. Automate later if volume demands it.

---

## Customer Lifecycle -- All Exit Scenarios

### Scenario A: Customer Actively Cancels (via Lemon Squeezy)

```
Client clicks "Cancel Subscription" on LS
    |
    v
LS webhook: "subscription_cancelled"
    |
    v
CF Worker: create cancel job in D1 (status: ready, job_type: cancel)
    |
    v
Owner Bot: "Customer #1001 cancelled subscription."
    |
    v
Owner chats Marigold: "cancel 1001"
    |
    v
Confirmation gate -> owner confirms -> vps_lifecycle.handle_cancel()
    -> VPS wiped -> Contabo cancelled -> Token revoked -> VPS enters pool
```

### Scenario B: Customer Stops Paying (payment fails)

```
LS payment fails (card expired, insufficient funds)
    |
    v
LS webhook: "subscription_payment_failed"
    |
    v
CF Worker: notify owner (DO NOT auto-cancel -- LS retries 3x over 2 weeks)
    |
    v
Owner Bot: "Customer #1001 payment failed. LS will retry."
    |
    v
If retries succeed -> nothing to do
If retries all fail -> LS sends "subscription_expired" -> same as Scenario A
```

### Scenario C: Emergency Block (abuse, ToS violation)

```
Owner: "block 1001"
    |
    v
Marigold: nexgen_admin("block", "1001")
    |
    v
Confirmation -> budget set to 0 -> proxy returns 429 on all requests
(VPS stays running -- owner decides later whether to cancel)
```

### CF Worker Webhook Additions Needed

| Event | Current | New |
|-------|---------|-----|
| `order_created` | Creates job (ready) | No change |
| `subscription_cancelled` | **IGNORED** | Create cancel job |
| `subscription_expired` | **IGNORED** | Create cancel job |
| `subscription_payment_failed` | **IGNORED** | Notify owner |
| `subscription_updated` | **IGNORED** | Notify owner |

---

## Remove @NexGenAI_Support_bot References

Support is email + ticket only. All Telegram support contact references must be removed.

### Code Changes

| File | Current | New |
|------|---------|-----|
| `deployer.py:66` | "contact @NexGenAI_Support_bot or support@3nexgen.com" | "contact support@3nexgen.com" |
| `deployer.py:329` | "Contact @NexGenAI_Support_bot for updates." | "Contact support@3nexgen.com for updates." |
| `proxy.ts:87` | "聯絡 @NexGenAI_Support_bot 查詢" | "發電郵至 support@3nexgen.com 查詢" |
| `templates/delivery-message.md:33` | "Telegram: @NexGenAI_Support_bot" | Remove line entirely |

### Website Changes (All 6 Languages: zh-HK, zh-CN, en, es, ja, ru)

| File | Change |
|------|--------|
| `constants.ts:1` | Remove `TELEGRAM_URL` constant entirely |
| Contact page locale files | Remove any Telegram contact card/link |
| Footer locale files | Remove Telegram icon/link if present |
| Any `t.me/` references | Remove |

Keep: email (`support@3nexgen.com`), ticket system.

### Website Copy Update

All languages: change setup time expectation to "24 hours":
- zh-HK: "24 小時內完成設定"
- en: "Setup within 24 hours"
- (other languages: equivalent translation)

---

## worker.py Changes

### Current Behavior

```python
if job_type == "deploy":
    deployer.deploy(job)
elif job_type == "cancel":
    lifecycle.handle_cancel(job)
```

### New Behavior

```python
# Track which jobs we've already notified about
_notified_jobs = set()
_notified_times = {}  # job_id -> first_notified timestamp

# In the polling loop:
job = api.get_next_job()
if job:
    job_id = job["id"]

    if job_id not in _notified_jobs:
        # First time seeing this job -- notify owner
        notifier.send(
            f"New order #{job_id}\n"
            f"Tier: {job['tier']} | Bot: {job.get('bot_username', 'N/A')}\n"
            f"Waiting for your command."
        )
        _notified_jobs.add(job_id)
        _notified_times[job_id] = time.time()

    elif time.time() - _notified_times[job_id] > 7200:  # 2 hours
        # Send ONE reminder
        notifier.send(f"Reminder: Order #{job_id} still pending ({_age(job_id)})")
        _notified_times[job_id] = time.time()  # reset so no more reminders

    # DO NOT process -- wait for nexgen_admin to trigger
```

Worker continues: polling (detect new jobs), health pings, backup cron monitoring. Just doesn't auto-deploy.

---

## dashboard.py Enhancements

### New Section: Pending Orders (before VPS section)

```markdown
## Pending Orders
| Job ID | Tier | Customer | Bot | Created | Age |
|--------|------|----------|-----|---------|-----|
| 1003   | 2    | test@... | @customer_bot | 2026-04-06 | 2h |
```

### New Section: Recyclable Pool (after VPS section)

```markdown
## Recyclable Pool
| VPS ID | IP | Cancel Date | Deadline | Reinstalls |
|--------|-----|------------|----------|------------|
| 203187256 | 161.97.88.8 | 2026-03-27 | 2026-04-27 | 0 |
```

---

## OpenClaw Skill Structure

Delivered as an OpenClaw skill at `~/clawd/skills/nexgen/` on Pi5.

```
~/clawd/skills/nexgen/
+-- skill.json          # Skill manifest
+-- nexgen_admin.py     # Main tool implementation (calls nexgen_cli.py)
+-- README.md           # Skill documentation
```

The skill calls `nexgen_cli.py` in `~/nexgen-worker/` which contains the actual logic. This separation means the CLI is also usable via SSH if needed.

### How Marigold Uses It

```
User: "有冇新單？"
Marigold: [calls nexgen_admin("jobs")]
Marigold: "有一張新單 #1003，Tier 2 Pro，@user123_bot，2 小時前。
           有一個 VPS 可以 recycle (203187256, 161.97.88.8)。
           建議 recycle 呢個 VPS 嚟 deploy。你想我開始嗎？"

User: "好，deploy 佢"
Marigold: [calls nexgen_admin("deploy", job_id="1003", vps_id="203187256")]
-> Confirmation message appears (code-generated, not AI-generated)
User: "confirm 1003"
-> Deploy starts, progress updates flow to Telegram
```

---

## Customer Onboarding Message

Sent from customer's own bot (not from NexGen bots). Standard template:

```
Your AI is ready! Start chatting now.
```

Simple, universal, no tier-specific text needed at launch.

---

## Graduation Path: Semi-Auto -> Full Auto

| Milestone | What You've Validated |
|-----------|----------------------|
| 5 successful deploys | Playbook works across configs |
| 1 VPS recycle | Recycling pipeline reliable |
| 1 budget enforcement trigger | Cost protection works |
| 1 customer cancellation | Cancel flow end-to-end |
| 2 weeks zero failed deploys | System stable |

**To switch:** Revert `worker.py` to auto-deploy mode (restore original deploy call). nexgen_admin skill stays useful for monitoring and manual operations.

---

## Deliverables

### Files to Create

| File | Purpose |
|------|---------|
| `pi5-worker/nexgen_cli.py` | CLI entry point with subcommands (status, deploy, cancel, etc.) |
| `pi5-worker/confirmations.py` | Confirmation gate logic (Telegram reply, timeout, string match) |
| `pi5-worker/formatters.py` | Format API data into readable messages |
| `pi5-worker/tests/test_nexgen_cli.py` | CLI unit tests |
| `pi5-worker/tests/test_confirmations.py` | Confirmation gate tests |
| `pi5-worker/tests/test_formatters.py` | Formatter tests |
| `pi5-worker/tests/test_upgrade_downgrade.py` | Tier change tests |
| `~/clawd/skills/nexgen/*` | OpenClaw skill files (deployed to Pi5 via SCP) |
| `docs/pi5-assistant-briefing-v2.md` | Updated Marigold briefing for semi-auto mode |

### Files to Modify

| File | Change |
|------|--------|
| `pi5-worker/worker.py` | Notify-only mode + notification dedup + 2h reminder |
| `pi5-worker/dashboard.py` | Add pending orders + recyclable pool sections |
| `pi5-worker/deployer.py` | Accept optional vps_id; remove @NexGenAI_Support_bot |
| `cf-worker/src/handlers/proxy.ts` | Remove @NexGenAI_Support_bot from budget block msg |
| `cf-worker/src/handlers/webhook.ts` | Handle subscription_cancelled, expired, payment_failed |
| `templates/delivery-message.md` | Remove Telegram support line |
| `website-lovable/src/src/lib/constants.ts` | Remove TELEGRAM_URL |
| Website locale files (6 languages) | Remove Telegram contact, add 24h setup copy |

### Out of Scope (Post-Launch)

- Lemon Squeezy API for automatic subscription changes
- Customer self-service usage dashboard
- Auto-expiry enforcement (VPS cancelling -> expired after deadline)
- Multi-operator support
- AI-powered support bot
