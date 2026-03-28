# Customer Onboarding Pipeline — Design Spec

> **Date:** 2026-03-26
> **Status:** Reviewed — fixes applied
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
- **Pi5 stays LAN-only** — Pi5 makes outbound HTTPS requests only. No incoming connections, no port forwarding, no public IP exposure.

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
|                                                   |
|  Inbound endpoints:                               |
|  - POST /api/webhook/lemonsqueezy (HMAC verified) |
|  - POST /api/confirm (secret API key required)    |
|    Requires: {id, amount_hkd, payment_method,    |
|    reference} to prevent accidental double-confirm |
|                                                   |
|  Pi5 polling endpoints (outbound from Pi5):       |
|  - GET  /api/jobs/next (returns oldest ready job) |
|  - PATCH /api/jobs/:id (update job status)        |
|  - POST /api/health (Pi5 alive ping)              |
|  All Pi5 endpoints require X-Worker-Token header  |
|                                                   |
|  Internal: reads/writes CF D1                     |
|  Health monitor: tracks Pi5 ping, alerts on miss  |
+--------------------------------------------------+
                       |
                  CF D1 (SQLite)
                  Job queue + state
                       |
          Pi5 polls via OUTBOUND HTTPS
          (no incoming connections needed)
                       |
+--------------------------------------------------+
|  Pi5 (home, LAN-only, behind NAT)                |
|                                                   |
|  [Worker] polls api.3nexgen.com every 30s         |
|  - GET /api/jobs/next → picks oldest ready job    |
|  - Runs Claude Agent SDK session                  |
|  - PATCH /api/jobs/:id → updates status           |
|  - POST /api/health → heartbeat every 5 min       |
|  - Sends status to your personal OpenClaw         |
|                                                   |
|  [Your OpenClaw] monitoring layer                 |
|  - Receives deployment notifications              |
|  - You can query: "T1043 status?"                 |
|  - You can query: "today's orders?"               |
|                                                   |
|  [Bot Pool] pre-created Telegram bots             |
|  - Stored in Pi5 bot-pool/ folder                 |
|  - Assigned to customers on deploy                |
|                                                   |
|  [Data Archive] churned customer exports          |
|  - Stored in Pi5 archives/ folder                 |
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
| **CF Worker** | Webhook receiver, REST API for Pi5, health monitor | Lemon Squeezy webhook secret, manual confirm API key |
| **CF D1** | Job state, customer metadata (tier, display name, telegram ID, email) | No secrets — no API keys, no bot tokens |
| **Pi5 Worker** | Job execution via Agent SDK, SSH into customer VPSes | Contabo API creds, SSH keys, DeepSeek/OpenAI keys, all bot tokens |
| **Pi5 OpenClaw** | Your personal AI + business monitoring dashboard | Its own config only |
| **Pi5 Bot Pool** | Pre-created Telegram bots ready for assignment | Bot tokens |
| **Pi5 Data Archive** | Churned customer data exports (Qdrant + Mem0 + config) | Customer data |
| **NexGenAI_Support_bot** | FAQ, customer intent detection, action confirmation, escalation | Its own bot token |

### Pi5 Network Security

Pi5 remains 100% LAN-only. All communication is outbound:
- Polls `api.3nexgen.com` (CF Worker) via HTTPS — same as browsing a website
- SSHes into Contabo customer VPSes — outbound TCP
- Calls Telegram API — outbound HTTPS
- Calls DeepSeek/OpenAI APIs — outbound HTTPS

No incoming connections. No port forwarding. No DDNS. No public IP.

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
  status TEXT NOT NULL,          -- ready | provisioning | installing | qa | complete | failed | stale
  job_type TEXT NOT NULL,        -- deploy | upgrade | downgrade | cancel | delete | reactivate
  tier INTEGER NOT NULL,         -- 1, 2, 3
  target_tier INTEGER,           -- for upgrade/downgrade jobs
  display_name TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  payment_method TEXT,           -- lemon_squeezy | fps | payme
  bot_username TEXT,             -- NexGenAI_T1043_bot
  lemon_squeezy_order_id TEXT UNIQUE,  -- webhook deduplication
  server_ip TEXT,
  error_log TEXT,
  re_queue_count INTEGER DEFAULT 0,   -- stale job re-queue tracker (max 2)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE id_counter (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
-- Initialize: INSERT INTO id_counter VALUES ('next_id', 1043);
```

**Security note:** Bot tokens and API keys are NEVER stored in CF D1. Only non-sensitive metadata. All secrets live on Pi5 in `clients/T{ID}/` folders.

**Timezone note:** All timestamps stored in UTC. Churn events (grace period day count, auto-delete schedules) evaluated in `Asia/Hong_Kong` timezone. Customer-facing messages display HKT.

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

### Script Reference

| Script | Installs | Tier |
|---|---|---|
| 00-swap-setup.sh | Swap (skips if cloud-init did it) | All |
| 01-system-update.sh | apt update/upgrade | All |
| 02-install-node.sh | Node.js LTS | All |
| 03-install-docker.sh | Docker CE | All |
| 04-install-openclaw.sh | OpenClaw + systemd + config | All |
| 05-setup-qdrant.sh | Qdrant (Docker) | Tier 2+ |
| 06-setup-mem0.sh | Mem0 plugin | Tier 2+ |
| 07-setup-searxng.sh | SearXNG (Docker) | Tier 2+ |
| 08-setup-watchdogs.sh | Gateway watchdog | Tier 2+ |
| 09-security-hardening.sh | UFW + SSH + fail2ban | All |
| 10-configure-env.sh | Inject keys, start services | All |
| 11-setup-chromium.sh | Google Chrome headless | Tier 3 |
| 12-setup-acpx.sh | Claude Code CLI | Tier 3 |
| 13-setup-clawteam.sh | ClawTeam multi-agent | Tier 3 |

The agent reads tier-config.yaml at deploy time to decide which scripts to run. The existing `10-configure-env.sh` handles tier-based feature gating on the VPS.

---

## 7. Telegram Bot Pool

### Why a pool?

BotFather has **no programmatic API**. Bot creation requires interactive chat (`/newbot` → name → username → token). This cannot be fully automated.

### Solution: Pre-created bot pool

Manually create bots in batches of 20-50 via BotFather conversation:
- `NexGenAI_T1043_bot` through `NexGenAI_T1092_bot`
- Store each bot's token in Pi5 `bot-pool/` folder

### Pool Structure (Pi5)

```
bot-pool/
  available/
    NexGenAI_T1043_bot.token    # contains: 8686035660:AAH0k...
    NexGenAI_T1044_bot.token
    NexGenAI_T1045_bot.token
    ...
  assigned/
    NexGenAI_T1043_bot.token    # moved here after assignment
```

### Pool Operations

| Operation | How |
|---|---|
| **Assign bot** | Move oldest file from `available/` to `assigned/`. Read token. |
| **Check pool level** | Count files in `available/`. Alert if < 10 remaining. |
| **Replenish** | Manual batch creation via BotFather. Add token files. |
| **Set display name** | After assignment, call Telegram Bot API: `setMyName` with customer's chosen name |

### Pool Monitoring

Pi5 worker checks pool level on each deploy. If `available/` count < 10:
- Notify your OpenClaw: "Bot pool low — X bots remaining. Replenish soon."
- Pipeline continues as long as >= 1 bot available.
- If pool empty: job status → `failed`, error: "No bots available. Replenish pool."

---

## 8. Deployment Pipeline (Agent Flow)

The Claude Agent SDK session follows the CLAUDE.md playbook:

```
Job picked up (status: ready → provisioning)
|
+-- Step 1: Assign Telegram Bot from Pool
|   - Pick next available bot from bot-pool/available/
|   - Move to bot-pool/assigned/
|   - Set display name via Telegram Bot API (setMyName)
|   - Store token in clients/T1043/bot.token
|   - Send customer first message: "Setting up, please wait ~15 minutes..."
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
|   - Phase 2 scripts (04-08) → GATE CHECK (QA layers 1-3, tier-aware)
|   -   NOTE: Gate checks skip Qdrant/SearXNG/Mem0 checks for Tier 1
|   -   Agent reads tier-config.yaml to determine applicable QA checks
|   - Phase 3 scripts (09-13) → GATE CHECK (QA layers 4-5, tier-aware)
|   - Status: installing → qa
|
+-- Step 4: Final QA
|   - Verify all checks pass (28/28 for Tier 2+)
|   - Generate setup-report.md
|   - Status: qa → complete
|
+-- Step 5: Set Webhook and Deliver
|   - Set Telegram webhook URL pointing to customer's VPS
|   - Send customer message via their bot:
|     "Your AI assistant is ready! Start chatting now."
|   - Notify your OpenClaw: "T1043 complete"
|
+-- On Failure (any step):
    - Agent retries once per script (2 attempts total, per CLAUDE.md playbook)
    - If second attempt fails: status → failed
    - Return bot to bot-pool/available/ and reset display name via API
    - Send customer message: "We're experiencing a delay. Our team is looking into it. Contact @NexGenAI_Support_bot or support@3nexgen.com"
    - Notify your OpenClaw: "T1043 failed — {error}"
    - You investigate manually
```

### Telegram Webhook Setup (Step 5)

After OpenClaw is installed and running on the customer VPS:

```bash
# OpenClaw listens on localhost — gateway exposes it
# Telegram webhook connects directly to VPS public IP
curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -d "url=https://{VPS_IP}:{PORT}/webhook" \
  -d "certificate=@/path/to/self-signed-cert.pem"
```

OpenClaw's gateway handles TLS with a self-signed certificate. Telegram supports self-signed certs when provided via the `certificate` parameter in `setWebhook`. No domain or Let's Encrypt needed per-customer VPS.

**Note:** If OpenClaw already handles webhook setup internally, this step may be redundant. Verify during testing.

### Customer Communication During Provisioning

- **Step 1 (~1 min):** Bot sends customer: "Setting up your AI assistant, please wait approximately 15 minutes..."
- **Customer messages during 15 min wait:** No reply — bot is not yet connected to OpenClaw. The "please wait" message sets expectations.
- **Step 5:** Bot sends "Ready!" message — first real interaction with their AI

Auto-reply during provisioning was considered but rejected: it would require sharing bot tokens with CF Worker, contradicting the security model. The 15-minute silence with a clear "please wait" message is acceptable.

---

## 9. Payment and Billing

### Payment Methods

| Method | One-time install | Monthly recurring | Automation |
|---|---|---|---|
| **Lemon Squeezy (Visa/MC)** | Yes | Yes (mandatory from month 2) | Full — webhook triggers pipeline |
| **FPS** | Yes (first payment only) | No — must switch to card | Manual confirm → pipeline |
| **PayMe** | Yes (first payment only) | No — must switch to card | Manual confirm → pipeline |

### Why card-only for recurring

FPS/PayMe have no webhook/auto-charge capability. Manual monthly payment collection doesn't scale. Strategy: accept FPS/PayMe to reduce friction for first purchase (important for HK market), require card subscription for month 2 onward.

### Lemon Squeezy Integration

Each tier is a separate Lemon Squeezy product variant. Tier is derived server-side from `variant_id` — never trust client metadata for tier selection.

Checkout session includes custom metadata:
```json
{
  "display_name": "My AI",
  "telegram_user_id": "340067089"
}
```

CF Worker maps `variant_id` → tier (configured in Worker env vars):
```
VARIANT_TIER_MAP={"var_abc123":1,"var_def456":2,"var_ghi789":3}
```

Webhook delivers variant_id + metadata → CF Worker resolves tier from variant_id → creates job.

### FPS/PayMe Lifecycle

| Event | Automation |
|---|---|
| Approaching expiry (day 25/30) | Bot sends reminder with FPS QR code |
| Expired (day 30) | Enter 7-day grace period, daily reminders |
| Customer refuses card switch | Enter grace period → churn flow if no payment |
| Switch to card | Bot sends Lemon Squeezy subscription link |
| Card subscription active | Mark as auto-billing, stop reminders |

---

## 10. Tier Management

### Upgrade (e.g. Tier 1 → Tier 2)

SSH into existing VPS, run enable scripts for missing features. No re-deploy.

### Downgrade (e.g. Tier 2 → Tier 1)

SSH into existing VPS, disable features via config. Docker containers stay installed but unused. Customer loses access to disabled features (no memory, no search, etc).

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

High-risk actions (upgrade/delete touching live customer VPSes) are done manually first. Each manual action becomes a "Discovery Run" — do it manually, document, script, then automate.

---

## 11. Customer Churn Handling

### Timeline

```
Payment fails (or customer requests cancel)
  Day 1-7:  Grace period — bot works but sends daily payment reminder
  Day 7:    Bot asks: "Keep data 90 days for reactivation, or delete now?"
  Day 8:    Stop OpenClaw service.
  Day 8:    Export customer data to Pi5 (see Data Export below).
  Day 8:    Destroy VPS (stop paying for it immediately).
  Day 8-97: Data archive preserved on Pi5 (if customer chose 90 days).
  Day 98:   Auto-delete archive.

Customer requests immediate deletion at any point:
  → Delete archive immediately. Confirm via Telegram.
```

### Data Export (replaces Contabo snapshots)

Contabo snapshots auto-delete after 30 days — unsuitable for 90-day retention. Instead, export only what matters:

```bash
# Before destroying VPS, agent exports customer data ONLY (no API keys):
scp deploy@{VPS_IP}:~/qdrant-storage/    → Pi5 archives/T1043/qdrant/
scp deploy@{VPS_IP}:~/mem0.db            → Pi5 archives/T1043/mem0.db
scp deploy@{VPS_IP}:~/openclaw.json      → Pi5 archives/T1043/openclaw.json
scp deploy@{VPS_IP}:~/soul.md            → Pi5 archives/T1043/soul.md
# NOTE: client.env and .env are NOT archived — they contain shared API keys
# (DeepSeek, OpenAI) that the customer does not own. Bot token is already
# stored in Pi5 bot-pool/assigned/ folder.
```

**Total size per customer: ~50-200MB** (mostly Qdrant vectors). Pi5 with a 256GB+ NVMe can hold hundreds of customer archives.

### Reactivation

Customer returns within 90 days:
- Provision new Contabo VPS
- Run install scripts (fresh OS)
- Import archived data (Qdrant vectors, Mem0 DB, config, soul.md)
- Same bot username (NexGenAI_T1043_bot) still works — update webhook URL
- Charge new install fee + resume subscription

### Customer Data Choice

Bot message on Day 7:
> "Your service will be paused tomorrow. Would you like us to keep your AI's memories for 90 days (you can reactivate anytime), or delete everything now?"

Customer replies "keep" or "delete". Default to 90-day retention if no response.

---

## 12. Support Bot (NexGenAI_Support_bot)

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

## 13. Queue and Concurrency

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
| **Phase 0-1** | Pi5 only (sequential) | ~1-2 deploys/hour (Contabo provisioning takes 5-15 min) |
| **Phase 2+** | Pi5 + Contabo VPS worker | ~3-4 deploys/hour |

Multiple workers poll independently. D1 atomic status update prevents double-pick.

Note: Contabo first-time orders may take longer due to fraud verification. Subsequent orders provision faster.

### Failure Recovery

| Scenario | Handling |
|---|---|
| Script failure | Agent retries once (2 attempts total, per CLAUDE.md playbook) |
| Agent SDK crash | Job stays 'provisioning' >45 min → worker marks 'stale' |
| Stale job recovery | **Check Contabo API for existing VPS with label `nexgen-T{ID}` before re-provisioning.** Reuse if found, destroy + re-provision if broken. Prevents orphaned VPSes. |
| Contabo API down | Agent waits 5 min, retries 3x, then fails job |
| Pi5 offline | CF Queue holds orders. Pi5 processes backlog on recovery. |
| Failed deploy (VPS exists) | VPS kept running for manual investigation. You decide: debug and fix, or destroy and re-provision. |

### Stale Job Cleanup

Worker checks on each poll: any job in `provisioning` or `installing` for >45 minutes → check for orphaned VPS → mark as `stale` → increment `re_queue_count` → re-queue to `ready`. If `re_queue_count` >= 2 → mark as `failed`, notify your OpenClaw.

---

## 14. Monitoring

### Pi5 Health Ping

- Pi5 POSTs to `api.3nexgen.com/api/health` every 5 minutes
- CF Worker tracks last ping timestamp in D1
- 3 missed pings (15 min) → CF Worker sends Telegram message to your personal bot: "Pi5 offline"
- Phase 2+: auto-failover to backup VPS worker

### Bot Pool Monitoring

- Pi5 checks pool level on each deploy
- If available bots < 10 → notify your OpenClaw: "Bot pool low — X bots remaining"
- If pool empty → job fails with clear error

### Deployment Notifications (via your personal Telegram)

| Event | Message |
|---|---|
| New order | "New order T1043 — Tier 2 — deploying" |
| Gate check pass | "T1043 Phase 1 gate passed" |
| Gate check fail | "T1043 Phase 2 gate failed — agent debugging..." |
| Deploy complete | "T1043 deploy complete — 28/28 QA passed" |
| Deploy failed | "T1043 failed — script 07 failed 3x — manual intervention needed" |
| Pi5 offline | "Pi5 offline — no pings for 15 min" |
| Bot pool low | "Bot pool low — 5 bots remaining. Replenish soon." |

### Queryable Status

You can ask your personal OpenClaw:
- "T1043 status?" → current status + timeline
- "Today's orders?" → list from D1
- "Any failures?" → list failed jobs

---

## 15. Security

| Concern | Mitigation |
|---|---|
| Fake webhooks | Verify Lemon Squeezy HMAC signature |
| Manual trigger abuse | `/api/confirm` requires secret API key + rate limit (10 req/min) |
| Customer data in D1 | Only metadata (tier, name, telegram ID, email). No API keys, no bot tokens. |
| API keys | Stored on Pi5 `.env` only. Never sent to CF. |
| Contabo credentials | On Pi5 only |
| Bot tokens | Pre-created, stored in Pi5 `bot-pool/` and `clients/` folders only |
| SSH access to customer VPS | Pi5 holds SSH key, used only during deployment |
| Pi5 network exposure | LAN-only. Outbound HTTPS only. No incoming connections. |
| Pi5 physical security | Home device — acceptable for Phase 0-1 |
| Churned customer data | Archived on Pi5 with auto-delete schedule. Customer can request immediate deletion. |
| Contabo account compromise | Single account owns all customer VPSes — known risk, acceptable for Phase 0-1. Document as operational risk. |
| Duplicate Telegram user ID | Allowed — one customer can have multiple bots (different tiers or use cases). No uniqueness constraint on telegram_user_id. |

---

## 16. Testing Strategy

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

## 17. Production Infrastructure

### Contabo VPS (Customer Deployments)

- **Location:** Germany (cheapest, latency negligible for API-relay workload)
- **Validation:** Contabo API must support: create VPS, inject SSH key, destroy VPS
- **Fallback:** If Contabo API insufficient, use Hetzner (proven) for production

### Required Accounts and Services

| Service | Purpose | Status |
|---|---|---|
| Contabo | Customer VPS hosting | Needs account + API validation |
| Cloudflare | Domain, Pages, Workers, D1 | Have domain (3nexgen.com) |
| Lemon Squeezy | Payment processing | Needs account setup |
| Telegram BotFather | Bot creation (manual batches) | Available |
| DeepSeek | LLM API | Have key |
| OpenAI | Embedding API | Have key |

### Communication Channels

Phase 0: Telegram-only for all customer communication (delivery, reminders, support). Email deferred to Phase 1+ when volume justifies adding a transactional email provider (Resend, Postmark, or similar).

---

## 18. Scope Boundaries

### In Scope (this spec)

- CF Worker (webhook receiver + REST API for Pi5 + health monitor)
- CF D1 schema and job management
- Pi5 worker (queue polling + Agent SDK integration)
- Contabo provisioning script (port from Hetzner)
- Telegram bot pool management
- Telegram webhook setup for customer VPSes
- Tier enable/disable scripts
- Customer delivery messaging
- Customer data export and archive (churn handling)
- NexGenAI_Support_bot (Phase 0: FAQ only)
- Monitoring, alerting, and pool management
- Testing pipeline

### Out of Scope

- Website form implementation (separate — React/Lovable work)
- Lemon Squeezy product/subscription configuration
- Tier pricing finalisation
- AI model cost testing
- Pi5 hardware setup (already running)
- Marketing and customer acquisition

---

## 19. Known Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Contabo API insufficient | Can't automate provisioning | Fallback to Hetzner (proven). Test in pre-work. |
| Contabo first-order fraud check | Hours-long delay for first VPS | Place first order manually to clear fraud check before go-live |
| Single Contabo account | Account issue kills all customer VPSes | Acceptable Phase 0-1. Consider second account at scale. |
| Pi5 failure | No new deploys until fixed | CF Queue holds orders. Health ping alerts you. Add VPS worker in Phase 2. |
| Bot pool exhaustion | Deploy fails | Pool monitoring with early warning. Replenish in batches. |
| OpenClaw webhook setup varies by version | Step 5 may need adjustment | Verify during Hetzner test runs. Document in CLAUDE.md playbook. |
