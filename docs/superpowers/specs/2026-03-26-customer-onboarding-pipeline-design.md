# Customer Onboarding Pipeline — Design Spec

> **Date:** 2026-03-26
> **Status:** Draft — pending review
> **Scope:** Sub-project B — Full customer lifecycle automation (order → deploy → ongoing management)
> **Depends on:** Sub-project A (Contabo provisioning) for production deploys

---

## 1. Overview

An end-to-end automated pipeline that takes a customer from payment to a working OpenClaw Telegram bot, with zero manual intervention for new deployments. The system also handles post-deployment lifecycle (upgrades, downgrades, cancellation, data deletion) with a phased automation approach.

### Design Principles

- **Zero manual work for new deploys** — payment confirmed to working bot, fully automated
- **Tier as parameter** — tier-to-feature mapping lives in config, not code. Updated as pricing finalizes.
- **Same queue for all job types** — deploys, upgrades, cancellations all flow through CF D1
- **Phased lifecycle automation** — Phase 0: only deploys automated. Manual actions automated incrementally as patterns are proven.
- **AI is the operator** — Claude Agent SDK follows CLAUDE.md playbook, runs QA, debugs failures

---

## 2. System Architecture

```
                    Customer
                       |
          +------------+------------+
          |                         |
    Lemon Squeezy             FPS / PayMe
    (auto webhook)            (manual confirm)
          |                         |
          v                         v
+--------------------------------------------------+
|  Cloudflare Edge                                  |
|  CF Worker: api.3nexgen.com                       |
|  - Validates Lemon Squeezy webhook (HMAC)         |
|  - /api/confirm endpoint (manual trigger, secret) |
|  - Writes job to CF D1                            |
|  - Auto-reply proxy during provisioning           |
|  - Pi5 health ping monitor (5 min interval)       |
+--------------------------------------------------+
                       |
                  CF D1 (SQLite)
                  Job queue + state
                       |
                       v
+--------------------------------------------------+
|  Pi5 (home)                                       |
|                                                   |
|  [Worker] polls D1 every 30s                      |
|  - Picks oldest 'ready' job                       |
|  - Runs Claude Agent SDK session                  |
|  - Executes job (deploy/upgrade/cancel/etc)       |
|  - Updates job status in D1                       |
|  - Sends status to your personal OpenClaw         |
|                                                   |
|  [Your OpenClaw] monitoring layer                 |
|  - Receives deployment notifications              |
|  - You can query: "T1043 status?"                 |
|  - You can query: "today's orders?"               |
|                                                   |
|  Phase 2+: add Contabo VPS as 2nd worker          |
+--------------------------------------------------+
                       |
                  Contabo VPS
                  (Germany, cheapest)
                  Customer's OpenClaw stack
```

### Component Responsibilities

| Component | Responsibility | Secrets it holds |
|---|---|---|
| **CF Worker** | Webhook receiver, job queue, auto-reply proxy, health monitor | Lemon Squeezy webhook secret, manual confirm API key |
| **CF D1** | Job state, customer metadata (tier, display name, telegram ID, email) | No secrets — no API keys, no bot tokens |
| **Pi5 Worker** | Job execution via Agent SDK, SSH into customer VPSes | Contabo API creds, SSH keys, DeepSeek/OpenAI keys, all bot tokens |
| **Pi5 OpenClaw** | Your personal AI + business monitoring dashboard | Its own config only |
| **NexGenAI_Support_bot** | FAQ, customer intent detection, action confirmation, escalation | Its own bot token |

---

## 3. Customer Order Flow

### New Customer

```
1. Customer visits 3nexgen.com/pricing
2. Picks tier (1/2/3)
3. Fills form:
   - Display name for bot (1-64 chars, e.g. "My AI Assistant")
   - Telegram user ID (numeric)
   - Email
4. Picks payment method:
   - Lemon Squeezy → checkout with metadata (display_name, telegram_id, tier)
   - FPS/PayMe → payment instructions shown, customer pays manually
5. Payment confirmed:
   - Lemon Squeezy: webhook auto-fires → CF Worker creates job
   - FPS/PayMe: you confirm via /api/confirm → CF Worker creates job
6. T-number assigned (T1043, T1044, ...) — only on confirmed payment
7. Pipeline deploys automatically
```

### Form Validation

- Display name: 1-64 characters (Telegram limit)
- Telegram user ID: numeric format
- Email: standard validation
- Tier: 1, 2, or 3

### ID Assignment

- IDs are sequential: T1043, T1044, T1045...
- Starting number: T1043
- Assigned only on payment confirmation — no wasted numbers
- One ID for everything: order, bot username, client folder, VPS label
- No payment = no record created

---

## 4. Naming Convention

| Entity | Format | Example |
|---|---|---|
| Customer ID | `T{sequential}` | T1043 |
| Bot username | `NexGenAI_T{ID}_bot` | NexGenAI_T1043_bot |
| Bot display name | Customer's choice | "My AI Assistant" |
| VPS hostname | `nexgen-T{ID}` | nexgen-T1043 |
| Client folder | `clients/T{ID}/` | clients/T1043/ |
| Support bot | `NexGenAI_Support_bot` | — |
| CF Worker | `api.3nexgen.com` | — |
| Support email | `support@3nexgen.com` | — |

---

## 5. Job Schema (CF D1)

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,           -- T1043
  status TEXT NOT NULL,          -- pending | ready | provisioning | installing | qa | complete | failed | stale
  job_type TEXT NOT NULL,        -- deploy | upgrade | downgrade | cancel | delete | reactivate
  tier INTEGER NOT NULL,         -- 1, 2, 3
  target_tier INTEGER,           -- for upgrade/downgrade jobs
  display_name TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  payment_method TEXT,           -- lemon_squeezy | fps | payme
  payment_confirmed INTEGER DEFAULT 0,
  bot_username TEXT,             -- NexGenAI_T1043_bot
  bot_token TEXT,                -- NOT stored here — Pi5 only
  server_ip TEXT,
  error_log TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**Security note:** Bot tokens and API keys are NEVER stored in CF D1. Only non-sensitive metadata. All secrets live on Pi5 in `clients/T{ID}/` folders.

---

## 6. Tier Configuration

Tier details are **unfinalised** — AI models, features, and pricing are pending cost testing. The system treats tier as a parameter.

### tier-config.yaml

```yaml
# Edit as pricing finalizes — no code changes needed
tier_1:
  scripts: [00, 01, 02, 03, 04, 09, 10]
  # ai_model: TBD
  # daily_message_limit: TBD
  # features: TBD

tier_2:
  scripts: [00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10]

tier_3:
  scripts: [00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13]
```

The agent reads this file at deploy time to decide which scripts to run. The existing `10-configure-env.sh` handles tier-based feature gating on the VPS.

---

## 7. Deployment Pipeline (Agent Flow)

The Claude Agent SDK session follows the CLAUDE.md playbook:

```
Job picked up (status: ready → provisioning)
|
+-- Step 1: Create Telegram Bot
|   - BotFather API: /newbot
|   - Username: NexGenAI_T1043_bot
|   - Display name: customer's choice
|   - Extract bot token → store in Pi5 clients/T1043/
|
+-- Step 2: Provision Contabo VPS
|   - Run contabo-create.sh T1043 {TIER}
|   - Wait for SSH ready (poll, max 15 min)
|   - Store server IP in job + clients/T1043/server-info.env
|   - Status: provisioning → installing
|
+-- Step 3: Deploy and Install
|   - Upload scripts via SCP
|   - Create client.env with bot token + API keys
|   - Read tier-config.yaml → get script list for tier
|   - Phase 1 scripts (00-03) → GATE CHECK (node, docker, swap)
|   - Phase 2 scripts (04-07) → GATE CHECK (QA layers 1-3)
|   - Phase 3 scripts (08-13) → GATE CHECK (QA layers 4-5)
|   - Status: installing → qa
|
+-- Step 4: Final QA
|   - Verify all checks pass (28/28 for Tier 2+)
|   - Generate setup-report.md
|   - Status: qa → complete
|
+-- Step 5: Customer Delivery
|   - Send Telegram message via customer's new bot:
|     "Your AI assistant is ready! Start chatting now."
|   - Send email with getting-started guide
|   - Notify your OpenClaw: "T1043 complete"
|
+-- On Failure (any step):
    - Agent retries up to 3 times per script
    - If unrecoverable: status → failed
    - Notify your OpenClaw: "T1043 failed — {error}"
    - You investigate manually
```

### Customer Communication During Provisioning

- **Step 1 completes (~1 min):** Bot sends customer: "Setting up your AI assistant, please wait approximately 15 minutes..."
- **Customer messages during setup:** CF Worker auto-replies: "Setting up now, you'll be notified when ready. For other questions, contact @NexGenAI_Support_bot or support@3nexgen.com"
- **Step 5:** Bot sends "Ready!" message — first real interaction with their AI

---

## 8. Payment and Billing

### Payment Methods

| Method | One-time install | Monthly recurring | Automation |
|---|---|---|---|
| **Lemon Squeezy (Visa/MC)** | Yes | Yes (mandatory from month 2) | Full — webhook triggers pipeline |
| **FPS** | Yes (first payment only) | No — must switch to card | Manual confirm → pipeline |
| **PayMe** | Yes (first payment only) | No — must switch to card | Manual confirm → pipeline |

### Why card-only for recurring

FPS/PayMe have no webhook/auto-charge capability. Manual monthly payment collection doesn't scale. Strategy: accept FPS/PayMe to reduce friction for first purchase (important for HK market), require card subscription for month 2 onward.

### Lemon Squeezy Metadata

Checkout session includes custom metadata:
```json
{
  "display_name": "My AI",
  "telegram_user_id": "340067089",
  "tier": 2
}
```

Webhook delivers this metadata back on payment success → CF Worker creates job with all details.

### FPS/PayMe Lifecycle

| Event | Automation |
|---|---|
| Approaching expiry (day 25/30) | Bot sends reminder with FPS QR code |
| Expired (day 30) | Enter 7-day grace period, daily reminders |
| Switch to card | Bot sends Lemon Squeezy subscription link |
| Card subscription active | Mark as auto-billing, stop reminders |

---

## 9. Tier Management

### Upgrade (e.g. Tier 1 → Tier 2)

SSH into existing VPS, run enable scripts for missing features. No re-deploy.

### Downgrade (e.g. Tier 2 → Tier 1)

SSH into existing VPS, disable features via config. Docker containers stay installed but unused.

### Required Scripts

| Script | Purpose |
|---|---|
| `tier-change.sh {CLIENT_ID} {FROM} {TO}` | Orchestrator — calls enable/disable scripts as needed |
| `enable-mem0.sh` / `disable-mem0.sh` | Enable/disable Mem0 plugin in openclaw.json |
| `enable-searxng.sh` / `disable-searxng.sh` | Enable/disable SearXNG URL in config |
| `enable-watchdog.sh` / `disable-watchdog.sh` | Start/stop gateway watchdog service |
| `enable-chromium.sh` / `disable-chromium.sh` | Start/stop Chrome headless service |
| `enable-acpx.sh` / `disable-acpx.sh` | Enable/disable Claude Code CLI |
| `enable-clawteam.sh` / `disable-clawteam.sh` | Enable/disable ClawTeam |
| `update-ai-model.sh {MODEL_CONFIG}` | Switch AI model in config |
| `update-message-limit.sh {DAILY_LIMIT}` | Update daily message cap |

All scripts are config-level changes (edit file + restart service). No uninstalling.

### Phased Automation

| Phase | Automated | Manual |
|---|---|---|
| **Phase 0 (launch)** | New deploys, FAQ bot, payment reminders | Upgrade, downgrade, cancel, delete, reactivate |
| **Phase 1 (10+ customers)** | + Upgrade/downgrade | Cancel, delete, reactivate |
| **Phase 2 (50+ customers)** | + Cancel, delete, reactivate | Only escalations |

Each manual action becomes a "Discovery Run" — do it manually, document, script, then automate.

---

## 10. Customer Churn Handling

### Timeline

```
Payment fails (or customer requests cancel)
  Day 1-7:  Grace period — bot works but sends daily payment reminder
  Day 7:    Bot asks: "Keep data 90 days for reactivation, or delete now?"
  Day 8:    Stop OpenClaw service. Snapshot VPS.
  Day 8:    Destroy VPS (stop paying for it immediately).
  Day 8-97: Snapshot preserved (if customer chose 90 days).
  Day 98:   Auto-delete snapshot.

Customer requests immediate deletion at any point:
  → Delete snapshot immediately. Confirm via email.
```

### Reactivation

Customer returns within 90 days:
- Restore snapshot to new Contabo VPS
- All data intact (Mem0 memories, chat history, personality)
- Same bot username (NexGenAI_T1043_bot) still works — just update webhook URL
- Charge new install fee + resume subscription

### Contabo Snapshots — Needs Validation

Before committing to snapshot strategy, test:
- Snapshot creation time
- Restore time
- Storage size and cost (Contabo free tier limits)
- Data integrity: Qdrant vectors, Mem0 DB, bot token validity

**Fallback:** If snapshots unreliable, export Qdrant vectors + Mem0 SQLite before destroy, re-import on reactivation.

---

## 11. Support Bot (NexGenAI_Support_bot)

A permanent OpenClaw instance handling all customer support. Runs on NexGen infrastructure (Hetzner or Contabo).

### Capabilities

| Input | Response |
|---|---|
| FAQ ("how much?", "how to start?") | Direct answer from knowledge base |
| Action request ("I want to upgrade") | Confirm tier + price → create job in CF D1 (Phase 1+) |
| Cancel request | Explain grace period → create cancel job (Phase 2+) |
| Data deletion request | Confirm → create delete job (Phase 2+) |
| Complex/unclear question | Forward to your personal Telegram |
| Angry customer | Forward to your personal Telegram immediately |

### Phase 0 Scope

FAQ answers only. All action requests forwarded to your Telegram for manual handling.

---

## 12. Queue and Concurrency

### Job Lifecycle

```
Payment confirmed → status: ready
Worker picks up   → status: provisioning (atomic update, prevents double-pick)
Scripts running   → status: installing
QA running        → status: qa
All passed        → status: complete
Any failure       → status: failed
```

### Concurrency Model

| Phase | Workers | Throughput |
|---|---|---|
| **Phase 0-1** | Pi5 only (sequential) | ~3 deploys/hour |
| **Phase 2+** | Pi5 + Contabo VPS worker | ~6 deploys/hour |

Multiple workers poll independently. D1 atomic status update prevents double-pick.

### Failure Recovery

| Scenario | Handling |
|---|---|
| Script failure | Agent retries 3x (per CLAUDE.md playbook) |
| Agent SDK crash | Job stays 'provisioning' >45 min → worker marks 'stale' → re-queues |
| Contabo API down | Agent waits 5 min, retries 3x, then fails job |
| Pi5 offline | CF Queue holds orders. Pi5 processes backlog on recovery. |

### Stale Job Cleanup

Worker checks on each poll: any job in `provisioning` or `installing` for >45 minutes → mark as `stale` → re-queue (max 2 re-queues, then `failed`).

---

## 13. Monitoring

### Pi5 Health Ping

- Pi5 pings CF Worker every 5 minutes
- CF Worker tracks last ping timestamp
- 3 missed pings (15 min) → CF Worker emails you: "Pi5 offline"
- Phase 2+: auto-failover to backup VPS worker

### Deployment Notifications (via your personal Telegram)

| Event | Message |
|---|---|
| New order | "New order T1043 — Tier 2 — awaiting payment" |
| Payment confirmed | "T1043 paid — starting deploy" |
| Gate check pass | "T1043 Phase 1 gate passed" |
| Gate check fail | "T1043 Phase 2 gate failed — agent debugging..." |
| Deploy complete | "T1043 deploy complete — 28/28 QA passed" |
| Deploy failed | "T1043 failed — script 07 failed 3x — manual intervention needed" |
| Pi5 offline | Email alert (CF Worker sends) |

### Queryable Status

You can ask your personal OpenClaw:
- "T1043 status?" → current status + timeline
- "Today's orders?" → list from D1
- "Any failures?" → list failed jobs

---

## 14. Security

| Concern | Mitigation |
|---|---|
| Fake webhooks | Verify Lemon Squeezy HMAC signature |
| Manual trigger abuse | `/api/confirm` requires secret API key |
| Customer data in D1 | Only metadata (tier, name, telegram ID, email). No API keys, no bot tokens. |
| API keys | Stored on Pi5 `.env` only. Never sent to CF. |
| Contabo credentials | On Pi5 only |
| Bot tokens | Generated per-deploy, stored in Pi5 `clients/` folder only |
| SSH access to customer VPS | Pi5 holds SSH key, used only during deployment |
| Pi5 physical security | Home device — acceptable for Phase 0-1 |

---

## 15. Testing Strategy

### Test Sequence

1. **CF Worker + D1** — test locally with fake webhook payloads
2. **Pi5 worker + Agent SDK** — test against Hetzner VPS (cheap, fast, proven)
3. **Full pipeline** — Lemon Squeezy sandbox → CF Worker → Pi5 → Hetzner VPS
4. **Contabo validation** — one real end-to-end run on Contabo
5. **Go live**

### Test Resources

- Lemon Squeezy sandbox mode (free fake webhooks)
- Hetzner VPS for iteration (~EUR 0.01/hour, destroy after)
- Real Telegram bots (delete via BotFather `/deletebot` after testing)
- Your own Telegram ID as test "customer"

---

## 16. Production Infrastructure

### Contabo VPS (Customer Deployments)

- **Location:** Germany (cheapest, latency negligible for API-relay workload)
- **Validation:** Contabo API must support: create VPS, inject SSH key, destroy VPS, create/restore/delete snapshots
- **Fallback:** If Contabo API insufficient, use Hetzner (proven) for production

### Required Accounts and Services

| Service | Purpose | Status |
|---|---|---|
| Contabo | Customer VPS hosting | Needs account + API validation |
| Cloudflare | Domain, Pages, Workers, D1 | Have domain (3nexgen.com) |
| Lemon Squeezy | Payment processing | Needs account setup |
| Telegram BotFather | Bot creation | Available |
| DeepSeek | LLM API | Have key |
| OpenAI | Embedding API | Have key |

---

## 17. Scope Boundaries

### In Scope (this spec)

- CF Worker (webhook receiver + job queue + auto-reply proxy + health monitor)
- CF D1 schema and job management
- Pi5 worker (queue polling + Agent SDK integration)
- Contabo provisioning script (port from Hetzner)
- Telegram bot creation automation
- Tier enable/disable scripts
- Customer delivery messaging
- NexGenAI_Support_bot (Phase 0: FAQ only)
- Monitoring and alerting
- Testing pipeline

### Out of Scope

- Website form implementation (separate — React/Lovable work)
- Lemon Squeezy product/subscription configuration
- Tier pricing finalisation
- AI model cost testing
- Pi5 hardware setup (already running)
- Marketing and customer acquisition
