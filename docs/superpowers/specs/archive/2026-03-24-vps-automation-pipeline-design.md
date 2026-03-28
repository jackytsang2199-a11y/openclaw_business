# VPS Automation Pipeline — Design Spec

> Auto-provision Hetzner VPS + auto-install OpenClaw full stack + QA verification + report generation.

**Date:** 2026-03-24
**Status:** Approved
**Scope:** VPS only (no Pi5). Dual-provider: Hetzner Cloud (Discovery Run) → Contabo (Production). Manual trigger (no payment integration).

> **Note:** This spec supersedes the VPS-related portions of `business/installation-automation-strategy.md`. The older document's multi-platform structure (Pi5/VPS/Mac) is preserved for future use but this spec defines the canonical VPS-only pipeline.

---

## 1. Context

NexGen sells remote OpenClaw installation services to non-technical Hong Kong users. Each customer gets a VPS with a full production stack: OpenClaw + Mem0/Qdrant memory + SearXNG search + watchdogs + security hardening.

This spec defines the automation pipeline that provisions and configures customer VPS instances end-to-end.

### What Exists Already

- `business/installation-automation-strategy.md` — Decided on Option C (hybrid: scripts + AI QA). Defines planned `openclaw_install/` structure, CLAUDE.md playbook concept, and modular script templates. Not yet built.
- `technical/inventory/pi5-setup-inventory.md` — Full inventory of custom stack components (Mem0, Qdrant, SearXNG, watchdogs, VPN, Chromium). Verified working on Pi5.
- `technical/guides/pi5-openclaw-setup-guide.md` — Step-by-step Pi5 setup procedure (reference for VPS adaptation).

### What This Spec Adds

The missing layer: automated VPS provisioning via Hetzner API, plus the concrete Discovery Run process that produces all scripts and QA checks from real experience.

---

## 2. System Overview

### Two Operating Modes

**Mode 1: Discovery Run** — First run. Claude Code executes each step manually on a real VPS, writing scripts and QA checks as it goes. Primary output is the scripts/playbook/notes, not just a working VPS.

**Mode 2: Production Run** — Every subsequent customer. Claude Code follows the CLAUDE.md playbook, runs pre-written scripts sequentially, runs QA suite, generates report. Fast and reproducible.

### Pipeline Phases

```
Phase 0: PROVISION  →  Phase 1: INSTALL  →  Phase 2: QA  →  Phase 3: REPORT
 (Hetzner API)         (SSH + scripts)      (5-layer)       (setup-report.md)
```

### Execution Environment

- **Current:** Claude Code on user's Windows machine (development/testing)
- **Future:** Migrates to a dedicated admin VPS (control plane) for production

---

## 3. Pipeline Architecture

### Phase 0: Provision

1. Read `.env` for `HETZNER_TOKEN`, `SSH_KEY_NAME`
2. Call Hetzner Cloud API `POST /v1/servers`:
   - `server_type`: per tier (see Server Type table below)
   - `image`: `ubuntu-24.04`
   - `location`: `fsn1` (Falkenstein, Germany — see Regional Note below)
   - `ssh_keys`: automation key
   - `user_data`: cloud-init YAML (base setup only)
   - `labels`: `customer={CLIENT_ID}`, `tier={1|2|3}`

**Server Type (unified):**

All tiers use **CX33** — 4 vCPU Intel/AMD, 8GB RAM, 80GB NVMe SSD, 20TB traffic (EU).

| | Current | After Apr 2026 (est.) |
|---|---|---|
| Monthly cost | EUR 5.49 | ~EUR 7.29 |

Rationale: Unified server type simplifies provisioning and avoids per-tier complexity. 8GB RAM comfortably runs the full Tier 3 stack (OpenClaw + Qdrant + SearXNG + Mem0 + Chromium + watchdogs). CX33 is the best CP value for 8GB RAM across all major VPS providers.

**Regional Note:** VPS in EU (Germany/Finland) has European IP addresses, which have zero API regional restrictions for any provider (Azure OpenAI, DeepSeek, Qwen, Zhipu, Kimi, Anthropic). Latency to HK is ~200-250ms, which is acceptable for chat bot use. EU locations also include 20TB traffic (vs 0.5TB in Singapore). Default DC: `fsn1` (Falkenstein, Germany).

3. Cloud-init handles base setup on first boot:
   - Create `deploy` user with sudo + SSH key
   - Disable root password auth
   - Install prerequisites only: `curl`, `git`, `ufw`, `fail2ban`, `ca-certificates`, `gnupg`
   - Set timezone `Asia/Hong_Kong`
   - Enable UFW (allow SSH only initially)
   - Write swap file (2GB for 4GB RAM VPS, 4GB for 2GB RAM VPS)
   - **Do NOT install Docker via cloud-init** — let `03-install-docker.sh` handle Docker CE from official repo for consistency

   Note: cloud-init does NOT install Docker or Node. These are handled by dedicated scripts in Phase 1 for better error handling and debuggability.

4. Poll SSH availability (retry every 10s, timeout 3min)
5. Verify cloud-init completion: check for `/var/lib/cloud/instance/boot-finished` (standard cloud-init signal)
6. Record VPS details: IP, server ID, datacenter

### Phase 1: Install

**Step 1: Deploy scripts to VPS.** Before running any installation script, Claude Code copies the entire `scripts/`, `qa/`, and `configs/` directories to the VPS:

```
scp -o StrictHostKeyChecking=no -r scripts/ qa/ configs/ deploy@{IP}:/home/deploy/openclaw_install/
```

During Discovery Run, scripts are written locally first, then SCP'd to VPS for testing. During Production Run, all scripts are deployed in one batch at the start.

**Step 2: Run installation scripts sequentially:**

| # | Script | What It Does | Discovery Note |
|---|--------|-------------|----------------|
| 00 | `swap-setup.sh` | Create swap file (size based on RAM) | `discovery/00-base-system.md` |
| 01 | `system-update.sh` | apt upgrade, install missing deps | " |
| 02 | `install-node.sh` | Node.js 22+ via nodesource | " |
| 03 | `install-docker.sh` | Install Docker CE from official repo + compose plugin | " |
| 04 | `install-openclaw.sh` | npm install openclaw, configure daemon + gateway + systemd | `discovery/01-openclaw-core.md` |
| 05 | `setup-qdrant.sh` | Docker run Qdrant, create collection | `discovery/02-qdrant.md` |
| 06 | `setup-mem0.sh` | Install Mem0 OSS plugin, configure DeepSeek LLM + OpenAI embeddings | `discovery/03-mem0.md` |
| 07 | `setup-searxng.sh` | Docker run SearXNG, configure settings | `discovery/04-searxng.md` |
| 08 | `setup-watchdogs.sh` | Gateway watchdog + systemd service | `discovery/05-watchdog.md` |
| 09 | `security-hardening.sh` | UFW rules, fail2ban config, SSH hardening | `discovery/06-security.md` |
| 10 | `configure-env.sh` | Apply customer .env, soul.md, start all services | `discovery/10-configure-env.md` |
| 11 | `setup-chromium.sh` | Install Chromium headless, CDP port 9222, systemd service | `discovery/07-chromium.md` |
| 12 | `setup-acpx.sh` | Install Claude Code CLI, verify ACPX plugin loads | `discovery/08-acpx.md` |
| 13 | `setup-clawteam.sh` | Install ClawTeam (Python venv + tmux), skill file | `discovery/09-clawteam.md` |

> **Tier bundling TBD.** Discovery Run installs ALL tools. Which tools are included in which pricing tier is a business decision made after Discovery proves everything works.

Each script follows the design principles from `installation-automation-strategy.md`:
- Idempotent (safe to run twice)
- Exit code 0 = success, non-zero = fail
- Pre-check dependencies before running
- Log output with `[$SCRIPT_NAME]` prefix
- Clear error messages on failure

**SSH execution model:** Each Claude Code bash call is stateless — there are no persistent SSH sessions. All remote commands use the pattern:

```
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i {KEY_PATH} deploy@{IP} 'command here'
```

Or for running scripts:

```
ssh ... deploy@{IP} 'bash /home/deploy/openclaw_install/scripts/01-system-update.sh'
```

On Windows, Claude Code's bash tool uses Git Bash or similar. SSH key path uses forward slashes: `/c/Users/{user}/.ssh/nexgen_automation`.

Script execution rules for Claude Code:
- Run each script via SSH (one command per bash call)
- Check exit code after each
- If fail: read error output, attempt fix, retry once
- If still fail: record in discovery notes, continue to next (Discovery) or halt (Production)

### Phase 2: QA (5 Layers)

QA runs sequentially. Each layer must PASS before proceeding to next.

| Layer | Script | Checks | Fail Means |
|-------|--------|--------|------------|
| 1 | `01-health-check.sh` | systemd services active, Docker containers running | Installation failed or service crashed |
| 2 | `02-port-check.sh` | Ports 6333 (Qdrant), 8888 (SearXNG), 18789 (Gateway) listening; verify 3000 (daemon) is localhost-only | Config error or firewall blocking |
| 3 | `03-api-check.sh` | Qdrant `/healthz`, SearXNG `/search?q=test`, OpenClaw API | Service up but not functioning |
| 4 | `04-telegram-test.sh` | Bot `getMe` succeeds, send test message | Bot token wrong or network issue |
| 5 | `05-full-integration.sh` | Send chat, verify memory stored, verify search works | Component integration broken |

On any FAIL: Claude Code debugs, fixes, re-runs that layer. Max 3 retries per layer before escalating to user.

### Phase 3: Report

Generate `clients/{CLIENT_ID}/setup-report.md`:

```markdown
# Setup Report: {CLIENT_ID}

## VPS Details
- IP: {IP}
- Hetzner Server ID: {ID}
- Server Type: {TYPE}
- Location: Falkenstein, Germany (fsn1)
- Monthly Cost: EUR {X}

## Installation Summary
- Tier: {TIER}
- Start Time: {START}
- End Time: {END}
- Total Duration: {DURATION}

## Service Status
| Service | Status |
|---------|--------|
| OpenClaw Daemon | PASS/FAIL |
| OpenClaw Gateway | PASS/FAIL |
| Qdrant | PASS/FAIL |
| SearXNG | PASS/FAIL |
| Mem0 | PASS/FAIL |
| Gateway Watchdog | PASS/FAIL |
| Telegram Bot | PASS/FAIL |

## QA Results
| Layer | Result | Notes |
|-------|--------|-------|
| Health Check | PASS/FAIL | ... |
| Port Check | PASS/FAIL | ... |
| API Check | PASS/FAIL | ... |
| Telegram Test | PASS/FAIL | ... |
| Integration Test | PASS/FAIL | ... |

## Issues Encountered
| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | ... | ... |

## Customer Delivery
- Telegram Bot: @{BOT_USERNAME}
- Gateway URL: http://{IP}:18789
- Auth Token: (in client .env)
```

---

## 4. Discovery Run Process

The first run is an exploration run. Claude Code does NOT run pre-written scripts (they don't exist yet). Instead:

### For each installation step:

1. **Execute** the commands manually via SSH
2. **Observe** what happens — timing, output, errors
3. **Fix** anything that breaks — record the fix
4. **Write** a script file capturing what worked (with the fix built in)
5. **Write** a QA check for verifying this step
6. **Note** anything surprising in `discovery-notes.md`

### Discovery Run outputs:

| Output File | Contents |
|-------------|----------|
| `provision/hetzner-create.sh` | Working Hetzner API provisioning script |
| `provision/cloud-init.yaml` | Tested cloud-init config |
| `provision/wait-for-ssh.sh` | SSH polling script |
| `scripts/00-*.sh` through `scripts/11-*.sh` | All installation scripts, tested on real VPS |
| `qa/01-*.sh` through `qa/05-*.sh` | All QA scripts, verified against real state |
| `configs/templates/openclaw.json.template` | OpenClaw config with all custom settings (gateway bind, auth, agents, plugins, channels) — discovered during first run |
| `configs/templates/soul.md.default` | Empty soul.md (populated per-customer after setup) |
| `configs/templates/*` | Other config templates extracted from working setup |
| `CLAUDE.md` | Complete playbook with troubleshooting table |
| `discovery/*.md` | Per-tool notes (one file per component), written in real-time during Discovery |
| `discovery/summary.md` | Aggregated timings, costs, resource totals, improvement notes |
| `clients/T001/setup-report.md` | Report from the test run |

### Key Discovery Run Questions

These must be answered during the first run (cannot be fully specified in advance):

1. **OpenClaw config:** Exact `openclaw.json` structure — gateway.bind, auth.mode, agents.defaults, plugins.slots, channels.telegram settings. Reference Pi5 inventory but verify for VPS context.
2. **Mem0 OpenClaw plugin:** How `@mem0/openclaw-mem0` is configured within OpenClaw — connection to Qdrant, DeepSeek as LLM provider, OpenAI embeddings, collection name, auto-capture/recall settings.
3. **Systemd services:** Exact service file content for openclaw-daemon and openclaw-gateway. May differ from Pi5.
4. **Port exposure:** Which ports need UFW allow rules vs localhost-only.

### Success criteria for Discovery Run:

1. Test VPS T001 is fully functional (all QA layers PASS)
2. All scripts written and tested
3. CLAUDE.md playbook complete enough for Production Run
4. A simulated Production Run (destroy T001, re-provision T002, run scripts only) succeeds

---

## 5. Project Structure

```
openclaw_install/
├── CLAUDE.md                        ← Playbook for Claude Code
├── .env.example                     ← Template (HETZNER_TOKEN, DEEPSEEK_API_KEY, OPENAI_API_KEY, etc.)
├── .gitignore                       ← Excludes .env, clients/*/  secrets
├── provision/
│   ├── hetzner-create.sh            ← Create VPS via API
│   ├── cloud-init.yaml              ← Base setup config
│   └── wait-for-ssh.sh              ← Poll until SSH ready
├── scripts/
│   ├── 00-swap-setup.sh
│   ├── 01-system-update.sh
│   ├── 02-install-node.sh
│   ├── 03-install-docker.sh
│   ├── 04-install-openclaw.sh
│   ├── 05-setup-qdrant.sh
│   ├── 06-setup-mem0.sh
│   ├── 07-setup-searxng.sh
│   ├── 08-setup-watchdogs.sh
│   ├── 09-security-hardening.sh
│   ├── 10-configure-env.sh
│   ├── 11-setup-chromium.sh
│   ├── 12-setup-acpx.sh
│   └── 13-setup-clawteam.sh
├── qa/
│   ├── 01-health-check.sh
│   ├── 02-port-check.sh
│   ├── 03-api-check.sh
│   ├── 04-telegram-test.sh
│   └── 05-full-integration.sh
├── configs/
│   └── templates/
│       ├── openclaw.env.template
│       ├── openclaw.json.template       ← All OpenClaw settings (gateway, agents, plugins, channels)
│       ├── docker-compose.yml
│       ├── searxng-settings.yml
│       └── soul.md.default              ← Empty (populated per-customer after setup)
├── clients/
│   └── {CLIENT_ID}/
│       ├── .env
│       ├── soul.md
│       └── setup-report.md
├── discovery/                       ← Per-tool notes (written in real-time during Discovery Run)
│   ├── 00-base-system.md
│   ├── 01-openclaw-core.md
│   ├── 02-qdrant.md
│   ├── 03-mem0.md
│   ├── 04-searxng.md
│   ├── 05-watchdog.md
│   ├── 06-security.md
│   ├── 07-chromium.md
│   ├── 08-acpx.md
│   ├── 09-clawteam.md
│   ├── 10-configure-env.md
│   └── summary.md
└── logs/
    └── {CLIENT_ID}-{DATE}.log
```

---

## 6. Responsibilities

### User Must Do (before first Discovery Run)

| # | Task | Why Can't Automate |
|---|------|--------------------|
| 1 | Create Hetzner Cloud account + project | Browser login, KYC |
| 2 | Generate Hetzner API token | Security — stored locally only |
| 3 | Create SSH keypair for automation | `ssh-keygen` — user keeps private key |
| 4 | Upload SSH public key to Hetzner | Via console or one-time API call |
| 5 | Set up Wise Business account + link to Hetzner | KYC, bank linking |
| 6 | Create Telegram test bot via @BotFather | Requires user's Telegram account |
| 7 | Get DeepSeek API key + OpenAI API key | Account registration, billing |
| 8 | Read Mem0 + OpenClaw plugin reference docs | Needed for Discovery Run configuration |
| 9 | Create `.env` with all secrets | Secrets never in repo |

### Claude Code Does

| # | Task | How |
|---|------|-----|
| 1 | Call Hetzner API to create VPS | `curl` with user's token from `.env` |
| 2 | Wait for VPS boot + SSH ready | Poll loop |
| 3 | SSH into VPS | Using user's keypair |
| 4 | Run installation (Discovery: manual + write scripts / Production: run scripts) | SSH commands |
| 5 | Debug failures | Read logs, diagnose, fix, retry |
| 6 | Run QA suite (5 layers) | SSH + run QA scripts |
| 7 | Generate setup report | Write markdown |
| 8 | Write/update scripts during Discovery | Create files from real experience |
| 9 | Update CLAUDE.md troubleshooting | Add issues + fixes found |

---

## 7. Tier Matrix (VPS only)

**All available tools (tier bundling TBD — Discovery Run installs everything, tier assignment decided later):**

| Component | Script | Notes |
|-----------|--------|-------|
| System + Node + Docker | 00-03 | Base for everything |
| OpenClaw daemon + gateway | 04 | Core service |
| Telegram bot | Part of 10 | Bot token in client .env |
| Qdrant + Mem0 (vector memory) | 05-06 | DeepSeek LLM + OpenAI embeddings |
| SearXNG (self-hosted search) | 07 | Docker, no API keys needed |
| Gateway Watchdog | 08 | Auto-restart on Telegram API failure |
| Security hardening (UFW, fail2ban, SSH) | 09 | Levels TBD per tier |
| Configure env + start services | 10 | Injects client-specific values |
| Chromium headless (browser automation, CDP :9222) | 11 | ~870MB RAM |
| ACPX + Claude Code CLI (code agent) | 12 | Bundled plugin + npm global |
| ClawTeam (multi-agent swarms, venv + tmux) | 13 | Python venv, on-demand |

> **Stack Reference:** Full config details, systemd services, and commands for all components are documented in `technical/guides/openclaw-stack-reference.md` (verified Pi5 dump, 2026-03-25). See the Pi5 vs VPS Adaptation Guide in the implementation plan for what to change.

---

## 8. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| VPS provider (Discovery) | Hetzner Cloud | Best API quality, fast provisioning (~30s), excellent docs — ideal for script development |
| VPS provider (Production) | Contabo | €4.50/mo VPS S (4 vCPU, 8GB RAM) — 38% cheaper than Hetzner. API-relay workload tolerates CPU overselling. Explicit reseller permission. Singapore + Tokyo DCs |
| Server type | CX33 (4 vCPU, 8GB RAM) for all tiers | Best CP value for 8GB; unified simplifies automation |
| OS | Ubuntu 24.04 LTS | Most supported, long-term stable |
| Datacenter | Falkenstein, Germany (`fsn1`) | EU = no API restrictions, 20TB traffic, ~200ms to HK (acceptable for chat) |
| Primary chat LLM | DeepSeek-Chat V3.2 ($0.28/$0.42 per 1M tokens) | Cheapest quality LLM, no HK restrictions, cache hits $0.028/1M |
| Mem0 memory extraction LLM | DeepSeek-Chat (same key as primary) | Same provider = one key, officially supported by Mem0 |
| Mem0 embedding model | OpenAI `text-embedding-3-small` ($0.02/1M tokens) | Only option for quality 1536-dim embeddings; DeepSeek has no embedder |
| Base setup method | cloud-init | Deterministic, runs before SSH available |
| Installation method | Modular bash scripts via SSH | Testable, idempotent, debuggable |
| Orchestration | Claude Code (CLAUDE.md playbook) | Handles edge cases, AI debugging, flexible |
| QA method | 5-layer bash scripts | Layered diagnosis, automated, reusable for monitoring |
| Config management | `.env` files per client | Simple, proven, easy to template |
| Secret storage | Local `.env` only, never in git | Security |
| PostgreSQL | Not needed | Mem0 uses Qdrant + SQLite; no PG dependency for our stack |
| LiteLLM | Removed from scope | DeepSeek only for production; no multi-model routing needed |

---

## 8b. Dual-Provider Strategy (Hetzner → Contabo)

**Discovery Run:** Hetzner Cloud (CX33, €5.49→7.29/mo)
- Fast provisioning (~30s), best-in-class API docs, official Python SDK
- Ideal for iterating on scripts — fast feedback loop
- Default 5-server soft limit (request increase via support after first deployment)

**Production:** Contabo VPS S (4 vCPU, 8GB RAM, €4.50/mo)
- 38% cheaper than Hetzner (HK$24/customer/month savings)
- API-relay workload (OpenClaw → DeepSeek API) tolerates CPU overselling — VPS is mostly idle waiting for API responses
- Explicit reseller permission, proven bulk deployment (crypto node operators run hundreds)
- Singapore + Tokyo DCs (~30-50ms to HK)
- Provisioning slower (5-15 min vs 30s) — acceptable for one-time-per-customer setup

**Porting effort (est. 2-3 hours):**
- Replace `hetzner-create.sh` with `contabo-create.sh` (different REST API, OAuth2 auth)
- Replace `destroy-vps.sh` with Contabo API equivalent
- `cloud-init.yaml` — Contabo supports cloud-init, minimal changes expected
- `wait-for-ssh.sh` — increase timeout from 3min to 15min for Contabo provisioning speed
- All installation scripts (`scripts/00-13`) — **zero changes** (they run on Ubuntu via SSH, provider-agnostic)
- All QA scripts — **zero changes** (same reason)

**Fallback:** If Contabo performance is unacceptable for a specific customer (e.g., heavy Chromium use), deploy that customer on Hetzner at higher cost. Both provisioning scripts coexist.

---

## 9. Future Migration Path

| Phase | Where Pipeline Runs | Trigger |
|-------|-------------------|---------|
| Now (Discovery) | User's Windows machine via Claude Code → Hetzner | Manual: "Deploy customer X" |
| Next (Production) | User's Windows machine via Claude Code → Contabo | Manual: port scripts to Contabo API, then deploy |
| Later | Admin VPS + Claude Code CLI headless → Contabo | Manual: `claude -p "Deploy customer X"` |
| Future | Admin VPS + n8n + Stripe webhook → Contabo | Automatic: payment confirmed |

The pipeline is designed so that scripts and QA checks work identically regardless of where they run. Only the trigger and orchestration layer changes.

---

## 10. Secret Management

### Secret Types

| Secret | Shared or Per-Customer | Who Creates | How Delivered to Customer |
|--------|----------------------|-------------|--------------------------|
| Hetzner API token | Shared (operator only) | User (one time) | Never shared — operator's infra key |
| SSH automation key | Shared (operator only) | User (one time) | Never shared |
| DeepSeek API key | Shared (all customers use operator's key) | User (one time) | Never shared — baked into VPS .env. Used for both main chat LLM and Mem0 memory extraction |
| OpenAI API key | Shared (for Mem0 embeddings only) | User (one time) | Never shared — `text-embedding-3-small` at $0.02/1M tokens |
| Telegram bot token | Per-customer unique | User creates each via @BotFather | Included in setup report |
| OpenClaw auth token | Per-customer unique | Auto-generated by `10-configure-env.sh` (e.g. `openssl rand -hex 32`) | Included in setup report (for admin access) |

### Key Security Implications

- **Shared API keys across customers:** If one VPS is compromised, the attacker gets the operator's DeepSeek + OpenAI keys. Mitigation: monitor usage per VPS via DeepSeek dashboard. Future: rotate keys if anomalous usage detected. DeepSeek has no per-deployment rate limits, so usage monitoring is important.
- **Operator's Hetzner token must never leave the local machine.** It can create/destroy any VPS in the project.
- **Per-customer bot tokens** are low risk — each token only controls one Telegram bot.

### Backup Strategy (Future)

Not in MVP scope. Customer memories in Qdrant are at risk if VPS dies. Future mitigation:
- Qdrant native snapshots: `curl -X POST http://localhost:6333/collections/{name}/snapshots`
- Weekly snapshot + SCP to admin machine or object storage
- Low priority for early phase — few memories, Contabo uptime is adequate for chat bots

### Secret Rotation

Not automated in MVP. Procedure if compromised:
1. Revoke the compromised key at the provider
2. Generate new key
3. SSH into affected VPS(es), update `.env`, restart services
4. Record incident in client setup log

---

## 11. Rollback and Cleanup

### Destroying a VPS

```bash
# By server ID
curl -X DELETE https://api.hetzner.cloud/v1/servers/{SERVER_ID} \
  -H "Authorization: Bearer $HETZNER_TOKEN"

# Or via CLI
hcloud server delete {SERVER_NAME}
```

### When to Destroy

| Scenario | Action |
|----------|--------|
| Discovery Run completed, T001 no longer needed | Destroy to stop billing |
| Production Run failed, cannot fix | Destroy and re-provision fresh (faster than debugging partial state) |
| Customer churns / cancels | Destroy VPS, archive client config |

### Cost Awareness

**Hetzner (Discovery):** Bills hourly. A forgotten CX33 costs ~EUR 0.009/hr (~EUR 5.49/mo, ~EUR 7.29/mo after Apr 2026). Discovery Run (T001 + T002 validation): expect ~EUR 0.05-0.20 total if destroyed within a few hours.

**Contabo (Production):** Bills monthly. VPS S at €4.50/mo. No hourly billing — budget for full month per customer VPS. Cancel via support ticket or API.

### Partial Install Cleanup

If a Production Run fails mid-install, prefer **destroy and re-provision** over debugging partial state. The full pipeline (provision + install) takes 10-20 minutes — faster than manually untangling a broken half-install.

---

## 12. Future: Post-Deployment Monitoring

Not in MVP scope. Acknowledged gap for future phases:

- **Option A:** Cron job on admin VPS runs QA `01-health-check.sh` against each customer VPS every hour
- **Option B:** Each customer VPS pushes a health ping to a central endpoint (e.g. UptimeRobot, or a simple webhook)
- **Option C:** n8n workflow polls VPS health and alerts via Telegram if any service is down

To be designed when customer count exceeds 10.

---

## 13. Discovery Run File Workflow

During Discovery Run, Claude Code writes files **locally** on the Windows machine in the `openclaw_install/` directory. Scripts are tested by SCP'ing them to the VPS and running them remotely.

### Flow per script:

```
1. Claude Code runs commands manually on VPS via SSH (exploratory)
2. Claude Code writes the script LOCALLY: openclaw_install/scripts/XX-name.sh
3. Claude Code SCPs the script to VPS: scp scripts/XX-name.sh deploy@{IP}:/home/deploy/openclaw_install/scripts/
4. Claude Code runs the script on VPS via SSH to verify it works
5. If script fails: edit locally, re-SCP, re-run
6. Once passing: move to next step
```

### At end of Discovery Run:

1. All files committed to git locally
2. Destroy T001
3. Re-provision T002 (validation run): deploy all scripts from repo, run them, run full QA
4. If T002 passes: Discovery Run is complete, scripts are production-ready
5. Destroy T002
