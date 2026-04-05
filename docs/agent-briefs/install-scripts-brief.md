# Install Scripts Brief — OpenClaw VPS Installer

> **Purpose:** Quick-start context for AI agents working on install scripts or QA. Read this BEFORE exploring `openclaw_install/`.

## Overview

14 modular bash scripts that install a full OpenClaw stack on Ubuntu 24.04 VPS. Executed remotely via SSH by the Claude Agent SDK (which follows `openclaw_install/CLAUDE.md` as its playbook).

**Location:** `openclaw_install/scripts/`
**QA Suite:** `openclaw_install/qa/` (5 layers, 28 checks)
**Provisioning:** `openclaw_install/provision/` (Contabo + Hetzner scripts)

## Script Reference

| # | Script | Installs | Tier | Notes |
|---|--------|----------|------|-------|
| 00 | `00-swap-setup.sh` | 2GB swap | All | Skips if cloud-init already created swap |
| 01 | `01-system-update.sh` | apt update/upgrade | All | Uses `DEBIAN_FRONTEND=noninteractive` + `--force-confold` |
| 02 | `02-install-node.sh` | Node.js LTS (v24) via nodesource | All | |
| 03 | `03-install-docker.sh` | Docker CE | All | |
| 04 | `04-install-openclaw.sh` | OpenClaw bot + systemd service + config skeleton | All | Entry point: `dist/index.js` (not `dist/entry.js`) |
| 05 | `05-setup-qdrant.sh` | Qdrant Docker (pinned v1.14.0) | 2+ | Port 6333 |
| 06 | `06-setup-mem0.sh` | Mem0 plugin + sqlite3 rebuild | 2+ | Depends on Qdrant |
| 07 | `07-setup-searxng.sh` | SearXNG Docker + JSON API enable | 2+ | Port 8888, must set `server.limiter: false` |
| 08 | `08-setup-watchdogs.sh` | Gateway watchdog script + systemd | 2+ | Auto-restarts OpenClaw when Telegram API unreachable |
| 09 | `09-security-hardening.sh` | UFW + fail2ban + SSH hardening | All | **CRITICAL:** Uses `ufw allow 22/tcp` not `ufw allow OpenSSH` |
| 10 | `10-configure-env.sh` | Gateway tokens, openclaw.json config, starts services | All | Proxy-only: no real API keys |
| 11 | `11-setup-chromium.sh` | Google Chrome headless + CDP | 3 only | Uses .deb, NOT snap (snap has SingletonLock issues) |
| 12 | `12-setup-acpx.sh` | Claude Code CLI | 3 only | Package: `@anthropic-ai/claude-code` (not `@anthropic/claude-code`) |
| 13 | `13-setup-clawteam.sh` | ClawTeam multi-agent CLI | 3 only | |

## Tier → Script Mapping

```
Tier 1 (基本版 Starter): 00, 01, 02, 03, 04,         08, 09, 10
Tier 2 (專業版 Pro):     00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10
Tier 3 (旗艦版 Elite):   00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13
```

## Execution Model

Scripts run in 3 phases with gate checks between each:

```
Phase 1: 00-03 (base system)
  → GATE: verify node, docker, swap
Phase 2: 04-07 (core services)
  → GATE: QA layers 1-3 (health + ports + API)
Phase 3: 08-13 (extras + config)
  → GATE: QA layers 4-5 (Telegram + full integration)
```

Each script: run once → if fails, retry once → if fails again, HALT.

## QA Suite

**Location:** `openclaw_install/qa/`

| Layer | Script | Checks | What It Tests |
|-------|--------|--------|---------------|
| 1 | `01-health-check.sh` | ~6 | systemd services running (openclaw, qdrant, searxng, watchdog) |
| 2 | `02-port-check.sh` | ~5 | Ports open (6333 Qdrant, 8888 SearXNG, 3000/3001 OpenClaw) |
| 3 | `03-api-check.sh` | ~6 | Bot token valid, Mem0 endpoint responds, SearXNG search works |
| 4 | `04-telegram-test.sh` | ~4 | Telegram message roundtrip via bot |
| 5 | `05-full-integration.sh` | ~7 | All systems together, env vars non-placeholder, end-to-end |

**Total:** 28 checks. All must PASS for deployment to succeed.

**Bash gotcha:** Use `PASS=$((PASS+1))` not `((PASS++))` with `set -e` — the latter exits on 0.

## SSH Patterns

All remote commands use:
```bash
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $SSH_KEY_PATH deploy@$SERVER_IP
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $SSH_KEY_PATH
```

The `deploy` user is created by cloud-init. Root access is NOT used for script execution.

## Provisioning Scripts

**Location:** `openclaw_install/provision/`

| Script | Purpose | Status |
|--------|---------|--------|
| `contabo-auth.sh` | OAuth2 token (5-min expiry) | Tested |
| `contabo-create.sh` | Create VPS, poll for IP (15-min timeout) | Tested |
| `contabo-cancel.sh` | Submit billing cancellation | Tested |
| `contabo-revoke.sh` | Revoke pending cancellation | **Unverified endpoint** |
| `contabo-reinstall.sh` | OS wipe + SSH readiness poll | Tested |
| `hetzner-create.sh` | Create Hetzner VPS (dev/test only) | Tested |
| `destroy-vps.sh` | Destroy VPS by CLIENT_ID | Tested |
| `wait-for-ssh.sh` | Poll SSH readiness after provision | Tested |

## Key Config: `10-configure-env.sh`

This is the most important script — it wires everything together:
- Writes `DEEPSEEK_API_KEY` and `OPENAI_API_KEY` (both set to gateway token)
- Configures `openclaw.json` with vectorStore dimension, collection names
- Sets base URLs to point at CF Worker proxy
- Starts all systemd services

**Status:** Complete — writes `DEEPSEEK_BASE_URL` and `OPENAI_BASE_URL` (from `${AI_GATEWAY_URL}`) to `~/.openclaw/env`

## Known Issues (Fixed)

These were discovered during E2E testing and are already fixed in code:

| Issue | Root Cause | Fix Applied |
|-------|-----------|-------------|
| UFW locks out SSH | `ufw allow OpenSSH` fails silently on Contabo images | Changed to `ufw allow 22/tcp` |
| OpenClaw crashes on start | `gateway.bind: "localhost"` fails | Changed to `"loopback"` |
| Mem0 404 errors | Proxy missing `/v1` in OpenAI base URL | Added `/v1` to `providerBaseUrls` in proxy.ts |
| Qdrant wrong dimension key | `embeddingModelDims` in openclaw.json | Changed to `dimension` |
| apt upgrade hangs | sshd_config conffile prompt kills SSH | Added `DEBIAN_FRONTEND=noninteractive` + `--force-confold` |
| Chrome headless fails | Snap chromium has SingletonLock issues | Switched to Google Chrome .deb install |

## Discovery Run Records

- `openclaw_install/discovery/summary.md` — 12 issues found + fixed during first E2E run
- `openclaw_install/clients/T001/` — First test deployment (Hetzner, destroyed)
- `openclaw_install/clients/T002/` — Second test deployment (Hetzner, destroyed)
