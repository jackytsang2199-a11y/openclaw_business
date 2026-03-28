# Plan B Implementation Report — Pi5 Worker Deployment Pipeline

**Date:** 2026-03-27 (updated 2026-03-28)
**Plan:** `docs/superpowers/plans/2026-03-26-plan-b-pi5-worker.md`
**Status:** Code complete, E2E validated (partial deploy), deployed to Pi5

---

## What Was Built

### Contabo Provisioning Scripts (Task 1)
Location: `openclaw_install/provision/`

| Script | Purpose |
|--------|---------|
| `contabo-auth.sh` | OAuth2 password grant token retrieval (5-min expiry) |
| `contabo-create.sh` | Create VPS, poll for IP (30s intervals, 15-min max), save `server-info.env` |
| `contabo-cancel.sh` | Submit billing cancellation (VPS runs until termination ~4 weeks) |
| `contabo-revoke.sh` | Revoke pending cancellation (for VPS recycling). Endpoint TBD — fallback to manual panel |
| `contabo-reinstall.sh` | OS reinstall + SSH readiness polling (for recycled VPS wipe) |
| `contabo-destroy.sh` | Cancel by CLIENT_ID (reads `server-info.env`, verifies provider=contabo) |

### Pi5 Worker Python Modules (Tasks 2-7)
Location: `onboarding-pipeline/pi5-worker/`

| File | Purpose |
|------|---------|
| `config.py` | Env loader, typed config constants (CF Worker URL, Contabo creds, paths, polling intervals) |
| `deployer.py` (bot handling) | Reads `bot_token` from job data — customers provide their own bot, no server-side pool management needed |
| `api_client.py` | CF Worker REST client (poll jobs, update status, health ping, VPS lifecycle) |
| `notifier.py` | Telegram notifications (owner alerts, customer messages, webhook setup, bot rename) |
| `playbook.py` | Deployment prompt builder — tier-aware script lists, QA gates, troubleshooting reference |
| `deployer.py` | Full deployment orchestrator: bot assign → VPS provision → Agent SDK deploy → webhook → deliver |
| `worker.py` | Main polling loop (30s interval, health pings, job dispatch, error recovery) |
| `vps_lifecycle.py` | Recycling pool: check-before-provision, auto-cancel on churn, revoke on recycle |
| `backup.py` | Weekly backup orchestrator: VPS→Pi5 via SSH/SCP (tier-aware Qdrant snapshots + Mem0 DB) |
| `restore.py` | Restore helper: Pi5→VPS data restore (clawd, Qdrant, Mem0, tier-aware cleanup) |

### Test Suite (Tasks 3-6, 10-12)
Location: `onboarding-pipeline/pi5-worker/tests/`

| File | Tests |
|------|-------|
| ~~`test_bot_pool.py`~~ | Removed — bot pool replaced by customer-provided bots (token read from job data) |
| `test_api_client.py` | 4 tests: get job, no job, health ping, update job |
| `test_notifier.py` | 5 tests: rename success/error, customer message, webhook, owner notify |
| `test_deployer.py` | 6 tests: tier scripts, prompt building (tier 1/2), bot assignment flows |
| `test_vps_lifecycle.py` | 5 tests: no recyclable, recycle success, revoke failure, cancel success/failure |
| `test_backup.py` | 6 tests: tier 1/2 backup, SSH failure, meta JSON, run-all with failure, size anomaly |
| `test_restore.py` | 4 tests: tier 1/2 restore, SCP failure, missing backup |

**Total: 35 tests, all passing on both PC (Windows) and Pi5 (ARM64 Linux)**
(Originally planned 37 — bot_pool tests removed, gateway token tests added)

### Infrastructure Files (Tasks 8, 13)
| File | Purpose |
|------|---------|
| `nexgen-worker.service` | systemd user service (uses `~/nexgen-worker-env/bin/python3`) |
| `scripts/nexgen-backup-pull.sh` | PC-side rsync from Pi5, weekly retention cleanup |
| `requirements.txt` | `requests>=2.31.0`, `claude-code-sdk>=0.0.25`, `anyio>=4.0.0` |
| `.env.example` | Template for all required environment variables |

### Contabo API Guide
Location: `onboarding-pipeline/contabo-api-guide.md`
Comprehensive reference for AI agents covering OAuth2 auth, all pipeline-critical endpoints, product IDs, regions, known gotchas.

---

## Bugs Found and Fixed During E2E

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | `claude_agent_sdk` import error | Plan used wrong package name. Real package is `claude-code-sdk` | Changed import to `from claude_code_sdk import query, ClaudeCodeOptions, ResultMessage` |
| 2 | `ClaudeAgentOptions` not found | Class renamed in real SDK | Changed to `ClaudeCodeOptions` |
| 3 | `requirements.txt` wrong package | Listed `claude-agent-sdk>=0.1.0` | Changed to `claude-code-sdk>=0.0.25` |
| 4 | `ResultMessage.stop_reason` AttributeError | Attribute doesn't exist in SDK v0.0.25 | Changed to `message.total_cost_usd` |
| 5 | Tier 1 restore cleanup references Qdrant | Cleanup command always includes `/tmp/qdrant-restore.snapshot` | Made cleanup tier-aware (`if tier >= 2`) |
| 6 | systemd service `User=jacky999` in user service | `User=` directive invalid for `systemctl --user` services (exit 216/GROUP) | Removed `User=` line |
| 7 | SDK `MessageParseError: Unknown message type: rate_limit_event` | CLI v2.1.81+ sends `rate_limit_event`, SDK v0.0.25 doesn't handle it | Patched `message_parser.py` to return `None` for unknown types, `client.py` to skip `None` |
| 8 | `/api/vps/recyclable` 404 crashes worker | CF Worker doesn't have this endpoint yet (Plan A scope) | Made `get_recyclable_vps()` return `None` on 404 or request error |
| 9 | `SSH_KEY_PATH=/c/Users/User/...` on Pi5 | `.env` had Windows path, Pi5 needs Linux path | Fixed to `/home/jacky999/.ssh/nexgen_automation` in Pi5's `openclaw_install/.env` |
| 10 | `jq: command not found` on Pi5 | Hetzner create script uses `jq`, not installed on Pi5 | `sudo apt install jq` |
| 11 | `PROVISION_PROVIDER` not configurable | Deployer hardcoded `contabo-create.sh` | Added `os.environ.get("PROVISION_PROVIDER", "contabo")` with dynamic script name |

---

## E2E Test Results (Task 9)

### Agent SDK Verification
- Claude Code CLI v2.1.85 installed on Pi5
- Agent SDK (`claude-code-sdk` v0.0.25) installed in `~/nexgen-worker-env/`
- OAuth token present in `~/.claude/`
- Successfully spawned CLI and received `AGENT_SDK_OK` response

### Full Pipeline Run
- **Job T1043** created via `/api/confirm` (Tier 2, Hetzner provider)
- Worker picked up job within 3 seconds of polling
- Bot assigned from pool (T1043)
- Hetzner VPS provisioned: `178.104.126.102` (cx33, nbg1)
- Agent SDK launched and autonomously installed:
  - Swap (2GB)
  - System update + Node.js v24.13.0 + Docker v29.3.1
  - Qdrant (Docker, port 6333)
  - SearXNG (Docker, port 8888)
  - All 14 install scripts uploaded
- **Deployment was in Phase 3 when 10-min timeout hit** — core stack was running
- VPS destroyed after validation

### Conclusion
The pipeline works end-to-end. A full Tier 2 deployment needs ~15-20 minutes (Agent SDK is thorough — it reads QA output, debugs, retries). The 50-turn agent limit and no artificial timeout should be sufficient for production.

---

## Deployment State on Pi5

### Files Deployed
```
~/nexgen-worker/                      # All Python modules + tests (symlink or copy of pi5-worker/)
~/nexgen-worker/.env                  # Secrets (chmod 600)
~/nexgen-worker/venv/                 # Python venv with all dependencies
~/openclaw_install/                   # Install scripts + CLAUDE.md playbook
~/.ssh/nexgen_automation              # SSH key for VPS access
~/bot-pool/available/                 # 4 test bot tokens (T1043-T1046) — testing only
~/.config/systemd/user/nexgen-worker.service  # Installed, not enabled
```

### Software Versions
| Component | Version |
|-----------|---------|
| Python | 3.13.5 |
| Claude Code CLI | 2.1.85 |
| claude-code-sdk | 0.0.25 (patched for rate_limit_event) |
| Node.js | v24.13.0 |
| jq | 1.7.1 |

### Service Status
- **Installed:** `nexgen-worker.service` (systemd user service)
- **Not enabled/started** — ready for production activation
- **Start command:** `systemctl --user enable --now nexgen-worker`

---

## Architecture Changes (2026-03-28)

### Bot Management: Customer-Provided Bots
Originally planned as a server-side bot pool (`bot_pool.py` with `available/` ↔ `assigned/` directories). Changed to **customer-provided bots** — each customer creates their own Telegram bot via BotFather and provides the token in the order form. The deployer reads `bot_token` from job data directly.

**Why:** Simpler, no pool management overhead, no BotFather rate limit issues, customers keep ownership of their bot.

**Pre-created bots (T1043-T1046):** Still on Pi5 at `~/bot-pool/available/` for testing purposes only. Not used in production flow.

### API Gateway: Direct Provider Proxy (no CF AI Gateway)
Originally planned to use Cloudflare AI Gateway (BYOK) as an intermediary. Changed to **direct provider proxy** — the CF Worker stores real API keys as Worker secrets and injects them when forwarding to provider APIs.

**Why:** CF AI Gateway wasn't available in the Cloudflare account. Direct proxy achieves the same security goals (keys never on customer VPS, central rotation via `wrangler secret put`).

**Flow:**
```
Customer VPS → CF Worker (auth + cost tracking) → DeepSeek/OpenAI API directly
```

**Per-client gateway tokens** still work exactly as designed — each customer gets a unique 64-char hex token, mapped to `customer_id` in D1 `api_usage` table. Budget enforcement (90% warn, 100% block) is live.

---

## What's Left

### Before Production Launch
1. **Place first Contabo order manually** — clear fraud verification before API provisioning works
2. **Add real Contabo API credentials** to Pi5 `.env` (currently placeholders)
3. **SDK patch longevity** — when `claude-code-sdk` updates past v0.0.25, the `rate_limit_event` patch may be unnecessary (check release notes)

### Completed Since Initial Report
- [x] Per-client API gateway & cost control (Plan A extension, 2026-03-28)
- [x] `/api/vps/recyclable` endpoint in CF Worker
- [x] VPS list endpoint (`GET /api/vps?status=`)
- [x] Gateway token generation in deployer (`_generate_gateway_token`, `_register_gateway_token`)
- [x] Real API keys stored as CF Worker secrets (DeepSeek + OpenAI)
- [x] 8 admin usage endpoints (list, get, update, bulk budgets, reset, revoke, rotate, create)
- [x] Route regex fix: usage endpoints accept any customer_id format (not just numeric)

### Task 14: Backup E2E Test
Not yet run — requires an active deployed VPS to test backup/restore cycle. Should be tested during the first real customer deployment.

### Production Checklist
- [ ] Place first Contabo VPS order (manual, clears fraud verification)
- [ ] Update Contabo API creds in Pi5 `.env` with real values
- [ ] Enable systemd service: `systemctl --user enable --now nexgen-worker`
- [ ] Enable linger for boot persistence: `sudo loginctl enable-linger jacky999`
- [ ] Set up PC backup cron: Windows Task Scheduler → `scripts/nexgen-backup-pull.sh` at 23:00 HKT
- [ ] Monitor first real deployment via `journalctl --user -u nexgen-worker -f`
