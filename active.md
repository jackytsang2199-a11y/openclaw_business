# NexGen — Project Status

> **Last updated:** 2026-04-06
> **Phase:** Pre-launch (Semi-auto operations ready, website deployed, payment integrated)
> **Mode:** SEMI-AUTO — worker notifies, operator deploys via CLI/Marigold

---

## What's Done

### Business Planning ✅
- [x] 14-section business plan v1
- [x] 3-tier pricing (Starter $248 / Pro $398 / Elite $598)
- [x] API pricing research (7 providers, HK availability)
- [x] Legal analysis (HK restricted region — DeepSeek direct, Azure OpenAI compliant)
- [x] Installation automation strategy (Option C: Hybrid — 80% bash + 20% Agent SDK)

### Onboarding Pipeline ✅
- [x] CF Worker API gateway at `api.3nexgen.com` (19 endpoints)
- [x] Proxy-only architecture — zero real API keys on customer VPS
- [x] Per-client gateway tokens (64-char hex, D1 tracking, HKD cost)
- [x] Budget enforcement: 90% warn header, 100% block (429)
- [x] 3 API streams via proxy: DeepSeek chat + OpenAI embeddings + Mem0 extraction
- [x] Pi5 worker: deployer, api_client, notifier, playbook, vps_lifecycle, backup, restore
- [x] Webhook handler: order_created, subscription_cancelled, subscription_expired, payment_failed
- [x] 66 tests passing (0 failures)
- [x] Claude Agent SDK verified (CLI v2.1.85, OAuth via Max plan)
- [x] Contabo provisioning scripts (create, cancel, revoke-verify, reinstall)
- [x] 8 admin usage endpoints (list, get, update, bulk budgets, reset, revoke, rotate, create)
- [x] Bot management: customer-provided (customer creates own Telegram bot)

### Semi-Auto Operations ✅ (NEW — 2026-04-06)
- [x] worker.py switched to notify-only mode (detects jobs, sends Telegram alert, does NOT deploy)
- [x] Notification dedup: first alert → suppress → 2h reminder → stop
- [x] nexgen_cli.py: 12 subcommands (status, jobs, pool, customer, deploy, cancel, upgrade, downgrade, block, unblock, reset_budget, backup_now)
- [x] formatters.py: human-readable output for jobs, VPS, usage data
- [x] dashboard.py enhanced: pending orders + recyclable pool sections + deadline warnings
- [x] Cancel CLI: finds customer VPS, wipes data, cancels at Contabo, revokes gateway token
- [x] Upgrade/downgrade: changes API budget in D1, reminds to adjust Lemon Squeezy manually
- [x] Block/unblock: emergency budget-to-zero + restore
- [x] ApiClient: 8 new admin methods for CLI operations
- [x] Contabo revoke API verified: DOES NOT WORK — manual panel revoke required
- [x] contabo-revoke.sh updated to verify (not attempt) revocation
- [x] Marigold briefing v2.1 written (comprehensive semi-auto operations guide)

### VPS Installation System ✅
- [x] 14 modular install scripts (00-swap to 13-clawteam)
- [x] 5-layer QA suite (28 checks)
- [x] Discovery run (1 hour, 12 issues found + fixed)
- [x] CLAUDE.md installer playbook
- [x] T001 + T002 test deployments

### Website ✅ (deployed 2026-04-06)
- [x] React + Vite + Tailwind + shadcn/ui
- [x] Deployed to Cloudflare Pages at 3nexgen.com
- [x] 6-language i18n (zh-HK, zh-CN, en, es, ja, ru)
- [x] Lemon Squeezy payment integration (9 checkout links: 3 tiers x 3 billing cycles)
- [x] Telegram contact links removed (email + ticket only)
- [x] Setup time updated: "24 hours" (was "30 minutes")
- [x] BotFather tutorial with images
- [x] OG image, sitemap, robots.txt, SEO meta tags
- [x] Privacy policy, refund policy, terms of service

### Infrastructure ✅
- [x] Domain `3nexgen.com` (Cloudflare)
- [x] CF Worker deployed at `api.3nexgen.com`
- [x] D1 database (jobs, vps_instances, api_usage, usage_history, audit_log, health)
- [x] Pi5 deployment orchestrator (systemd enabled, active since 2026-03-28)
- [x] Dashboard cron (every 15 min)
- [x] Backup cron (daily 4am)
- [x] SSH keys for VPS access

### Documentation ✅
- [x] Semi-auto operations design spec
- [x] Semi-auto operations implementation plan (10 tasks, all completed)
- [x] Pre-launch E2E test plan (8 phases + 7 additional phases)
- [x] Marigold briefing v2.1 (semi-auto operations guide)
- [x] Contabo API guide (section 4.6 updated with revoke verification)
- [x] Pi5 remote management guide
- [x] Customer delivery message template (email only, no TG support bot)

### Contabo VPS Status (Live — verified 2026-04-06)
```
203187256 | 161.97.88.8   | running | cancel=2026-04-27 (21 days left)
203187278 | 161.97.82.155 | running | cancel=2026-04-27 (21 days left)
```
Both VPS are running but scheduled for cancellation. To use for first customer: manually revoke in Contabo panel, then deploy via CLI.

---

## Remaining Tasks

### 🔴 Critical — Before First Customer

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | SCP new code to Pi5 | Not done | worker.py, nexgen_cli.py, formatters.py, dashboard.py, api_client.py, vps_lifecycle.py, contabo-revoke.sh |
| 2 | Restart nexgen-worker on Pi5 | Not done | After SCP, restart systemd service to activate semi-auto mode |
| 3 | Copy Marigold briefing v2.1 to Pi5 | Not done | Paste `docs/pi5-assistant-briefing-v2.md` to Marigold conversation |
| 4 | Test semi-auto flow on Pi5 | Not done | Ask Marigold: "status", "jobs", "pool" — verify CLI works |
| 5 | Lemon Squeezy webhook secret | Not done | Set `LEMONSQUEEZY_WEBHOOK_SECRET` in CF Worker via `wrangler secret put` |
| 6 | Test Lemon Squeezy webhook | Not done | Make test purchase, verify webhook fires, job appears in D1 |
| 7 | Revoke Contabo cancellation on 1 VPS | Not done | Manual: Contabo panel → VPS → "Undo cancellation" (for first customer) |
| 8 | Verify support email works | Not done | Send test to support@3nexgen.com, confirm it arrives |

### 🟡 Important — Before Soft Launch

| # | Task | Status | Notes |
|---|------|--------|-------|
| 9 | Run E2E test plan on Pi5 | Not done | `docs/pre-launch-e2e-test-plan.md` — 8 core + 7 additional phases |
| 10 | Pentest (Shannon/Strix) | Not done | After systems are live — CF Worker auth, proxy, webhook HMAC |
| 11 | First beta customer (friend/family) | Not done | Test full journey: website → pay → deploy → use |
| 12 | Business registration (HK) | Not done | Legal requirement |

### 🟢 Phase 1 — Growth (After First Customers)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 13 | LIHKG soft launch post | Not done | Priority marketing channel |
| 14 | IG business account + Reels | Not done | |
| 15 | Telegram announcement channel | Not done | |
| 16 | OpenClaw skill for Marigold | Not done | Formal nexgen_admin skill (currently using CLI directly) |
| 17 | Confirmation gate (Telegram reply) | Not done | Code-level confirmation for destructive CLI actions |
| 18 | Graduate to full-auto mode | Not done | After 5 successful deploys + 2 weeks stability |

---

## Architecture (Current State)

### Semi-Auto Deployment Flow
```
Customer pays (Lemon Squeezy)
    → Webhook → CF Worker creates job (status: ready)
    → Pi5 worker detects → Telegram notification to owner
    → Owner chats with Marigold → decides action
    → nexgen_cli.py deploy <job> --vps <id>
    → Agent SDK deploys (14 scripts, 3 phases, QA gates)
    → Customer notified: "Your AI is ready!"
```

### Proxy-Only Architecture
```
Customer VPS (zero real API keys)
    ↓ Bearer gateway_token
CF Worker @ api.3nexgen.com
    ├── Auth: D1 token lookup → customer_id
    ├── Cost: Calculate HKD, update D1
    ├── Budget: 90% warn, 100% block (429)
    └── Forward with real API key (Worker secrets)
         ├── /api/ai/deepseek/* → DeepSeek (chat + LLM extract)
         └── /api/ai/openai/*   → OpenAI (embeddings only)
```

### Key Numbers

| Metric | Value |
|--------|-------|
| Pipeline tests | 66 (all passing) |
| Install scripts | 14 (00-13) |
| QA checks | 28 (5 layers) |
| CF Worker endpoints | 19 |
| CLI subcommands | 12 |
| Website languages | 6 |
| Lemon Squeezy products | 9 (3 tiers x 3 cycles) |
| Contabo VPS available | 2 (both cancel=Apr 27, need manual revoke) |
| Startup cost | ~HK$300-400 |
