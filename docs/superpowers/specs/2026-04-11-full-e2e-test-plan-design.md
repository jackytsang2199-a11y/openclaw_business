# Full E2E Test Plan — Website → Recycle → Deploy → Live Chat → Teardown

> **Date:** 2026-04-11
> **Status:** Design — approved for execution
> **Mode:** Semi-auto (Jacky ↔ Marigold on Pi5)
> **Duration:** ~2.5 hours (two runs)
> **Outcome:** Full production pipeline validated end-to-end on two independent customers/VPS/tiers

---

## Purpose

Final pre-launch validation of the NexGen pipeline. Every prior E2E test has exercised a subset (webhook only, recycling only, Agent SDK only). This plan chains **everything** together, twice, across two tiers and two VPS, using real Lemon Squeezy test-mode payments as the trigger.

Scope: website click → LS test payment → HMAC webhook → D1 job → Pi5 notify → Marigold-executed recycling → Agent SDK deploy → gateway token → customer delivery → **live Telegram conversation with real DeepSeek response** → cost tracked in D1 → full teardown.

Out of scope: load/concurrency testing, penetration testing, real-card charges.

---

## Roles & Semi-Auto Protocol

**Jacky (human operator, the user)**
- Performs all website clicks, LS checkout, smoke SSH checks, live Telegram chat
- Messages **Marigold on Pi5** to trigger CLI actions (deploy, cancel, status, etc.)
- Confirms each phase before moving to the next

**Marigold (Claude instance running on Pi5)**
- Executes `nexgen_cli.py` subcommands on Pi5
- Destructive actions require Jacky's explicit confirmation
- Monitors `journalctl --user -u nexgen-worker -f` during Agent SDK runs

**Claude on this session (spec author / execution guide)**
- Walks Jacky through each step, one at a time, when the plan is executed
- Provides exact commands Jacky pastes to Marigold
- Verifies pasted outputs match expected values
- Does NOT run any CLI itself — everything goes through Jacky → Marigold

**Pi5 worker (`worker.py`)**
- Polls CF Worker every 30s for new jobs
- On new job: sends Telegram notification to Jacky via owner bot, **does not auto-deploy**

---

## Prerequisites (one-time setup, complete before Run 1)

| # | Task | Owner | Verify |
|---|---|---|---|
| P1 | Create second test bot via BotFather (e.g. `@NexGenE2E_bot`) → save token + username | Jacky | Token in hand |
| P2 | Confirm CF Worker `LEMONSQUEEZY_WEBHOOK_SECRET` matches LS **test-mode** webhook signing secret | Jacky | `wrangler secret list` |
| P3 | SCP latest code to Pi5: `worker.py`, `nexgen_cli.py`, `formatters.py`, `dashboard.py`, `api_client.py`, `vps_lifecycle.py`, `contabo-revoke.sh` | Jacky (from PC) | `scp` exit 0 |
| P4 | Restart Pi5 worker: `systemctl --user restart nexgen-worker` | Marigold | `systemctl --user is-active nexgen-worker` → `active` |
| P5 | Pre-flight status: `python nexgen_cli.py status` | Marigold | Worker healthy, both VPS `cancelling`, jobs empty |
| P6 | Open live log tail: `journalctl --user -u nexgen-worker -f` in Pi5 tmux window | Marigold | Stream live |
| P7 | Verify test support email `support@3nexgen.com` receives mail | Jacky | Test message arrives |
| P8 | Lemon Squeezy dashboard open in browser tab (to watch webhook deliveries) | Jacky | Dashboard reachable |

**Abort if any P-step fails.** Do not proceed until all are green.

---

## Test Matrix

| Run | Tier | VPS | Bot | Billing | Purpose |
|---|---|---|---|---|---|
| **Run 1** | 2 (Pro) | `203187256` / `161.97.88.8` | `@NexGenAI_test_bot` | Quarterly | Baseline — core stack (Mem0 + Qdrant + SearXNG + watchdog) |
| **Run 2** | 3 (Elite) | `203187278` / `161.97.82.155` | `@NexGenE2E_bot` (new) | Quarterly | Exercises Tier 3 scripts 11-13 (Chrome headless, Claude Code CLI, ClawTeam) — never E2E-tested in a customer flow |

Both runs exercise recycling (revoke + reinstall), so both VPS get `reinstall_count += 1`.

---

## Notation

- 🧑 **MANUAL** — Jacky performs this step directly (website, Telegram, SSH)
- 🤖 **AUTO** — CF Worker / Pi5 worker / deployer / Agent SDK runs; Jacky only watches logs
- 💬 **MARIGOLD** — Jacky messages Marigold on Pi5 with the command; Marigold executes
- ✅ **VERIFY** — Jacky confirms expected output before continuing

---

## Run 1 — Tier 2 on 161.97.88.8 (`@NexGenAI_test_bot`)

### Phase A — Payment trigger (5 min)

| # | Actor | Step | Expected |
|---|---|---|---|
| 1.1 | 🧑 MANUAL | Open `https://3nexgen.com/pricing` → pick 專業版 Pro → Quarterly → click "立即開始" | Redirected to `/onboarding?plan=pro&billing=quarterly` |
| 1.2 | 🧑 MANUAL | Fill form: email, `@NexGenAI_test_bot` token, Jacky's TG user ID `340067089`, bot name | Form validates, no red errors |
| 1.3 | 🧑 MANUAL | Click "Pay with Card" → LS checkout opens → enter test card `4242 4242 4242 4242`, any future expiry, any CVC → submit | LS returns success page |
| 1.4 | ✅ VERIFY | LS dashboard → Orders → new test order visible with status "paid" | Test order exists |

### Phase B — Webhook → Job queue (2 min)

| # | Actor | Step | Expected |
|---|---|---|---|
| 1.5 | 🤖 AUTO | LS fires `order_created` webhook → CF Worker `/api/webhook/lemonsqueezy` → HMAC-SHA256 validation → `confirmPayment()` → D1 job `status=ready` | Webhook 200 OK in LS dashboard |
| 1.6 | ✅ VERIFY | LS dashboard → Webhook deliveries → latest delivery shows 200 | 200 OK |
| 1.7 | 💬 MARIGOLD | "Check if job is queued: `python nexgen_cli.py jobs`" | Returns 1 job, `status=ready`, `tier=2`, correct bot_username |
| 1.8 | 🧑 MANUAL | Check owner Telegram chat for notification from `@NexGenAI_test_bot` | Receives: "New deploy #\<id\>\nTier: 2 \| Bot: @NexGenAI_test_bot\nWaiting for your command" |

**Abort if:** Webhook returns 401 (HMAC secret mismatch — fix P2 and retry) or job missing from queue (check worker logs).

### Phase C — Recycle + deploy (45-60 min)

| # | Actor | Step | Expected |
|---|---|---|---|
| 1.9 | 💬 MARIGOLD | "Deploy job \<id\> to VPS 203187256 (161.97.88.8): `python nexgen_cli.py deploy <id> --vps 203187256`" | Marigold confirms destructive action, runs command |
| 1.10 | 🤖 AUTO | `try_recycle()` logs: "Found recyclable VPS 203187256" | Log line visible |
| 1.11 | 🤖 AUTO | `contabo-revoke.sh` called → Contabo API `PATCH /compute/instances/203187256` with `cancellationDate: null` | Exit 0, log: "Revoke succeeded" |
| 1.12 | 🤖 AUTO | `contabo-reinstall.sh` called → Contabo API `POST /compute/instances/203187256/reinstall` (Ubuntu 24.04) | Exit 0, ~15 min wait |
| 1.13 | 🤖 AUTO | `wait-for-ssh.sh` polls until SSH ready | Log: "SSH ready on 161.97.88.8" |
| 1.14 | 🤖 AUTO | D1 `vps_instances` updated: `status=active`, `customer_id=<job>`, `reinstall_count += 1`, `billing_start` reset | — |
| 1.15 | 🤖 AUTO | Deployer generates 64-char gateway token → `POST /api/usage` → D1 `api_usage` row created | Log: "Gateway token registered" |
| 1.16 | 🤖 AUTO | Agent SDK session starts (Claude Sonnet, bypassPermissions, max 50 turns) | Log: "Agent session started" |
| 1.17 | 🤖 AUTO | **Phase 1** (scripts 00-03): swap, system update, Node, Docker | Gate check: `node --version && docker --version && swapon` → PASS |
| 1.18 | 🤖 AUTO | **Phase 2** (scripts 04-07): OpenClaw, Qdrant, Mem0, SearXNG | QA gate: health + port + api checks PASS |
| 1.19 | 🤖 AUTO | **Phase 3** (scripts 08-10): watchdogs, hardening, env config | QA gate: telegram + full-integration PASS (28/28 total) |
| 1.20 | 🤖 AUTO | Agent outputs `DEPLOYMENT_SUCCESS` | Log line exactly |
| 1.21 | 🤖 AUTO | Deployer sets TG webhook on customer bot → sends "Your AI assistant is ready!" → job `status=complete` | Customer message received in Telegram |

**While waiting (Phase C takes ~45-60 min):** Jacky watches the live journalctl tail. I (this session) will give Jacky a checklist of expected log lines to look for at each phase boundary, so we can catch hangs early rather than staring at the log.

**Abort if:** Agent SDK hits max turns, any gate check fails, `contabo-revoke.sh` fails (manual panel revoke needed). Do not push past a failed gate.

### Phase D — Smoke verify (5 min)

| # | Actor | Step | Expected |
|---|---|---|---|
| 1.22 | 🧑 MANUAL | SSH in: `ssh -i ~/.ssh/nexgen_automation deploy@161.97.88.8` | Login success |
| 1.23 | 🧑 MANUAL | Run verification block:<br>`systemctl --user is-active openclaw`<br>`docker ps --format '{{.Names}}: {{.Status}}'`<br>`curl -s http://localhost:6333/collections`<br>`bash ~/qa/05-full-integration.sh` | openclaw=active, qdrant+searxng running, collections respond, QA 28/28 PASS |
| 1.24 | 💬 MARIGOLD | "Show final job + VPS state: `python nexgen_cli.py status` and `python nexgen_cli.py pool`" | Job complete, VPS active with customer_id set |

### Phase E — Live conversation + cost tracking (10 min)

| # | Actor | Step | Expected |
|---|---|---|---|
| 1.25 | 🧑 MANUAL | Open Telegram → chat with `@NexGenAI_test_bot` → send `/start` | Bot replies with welcome |
| 1.26 | 🧑 MANUAL | Send: `你好，介紹下自己，用繁體中文` | Coherent Chinese response within 10s |
| 1.27 | 🧑 MANUAL | Send: `記住我最鍾意食咖喱魚蛋` (tests Mem0 write) | Acknowledged response |
| 1.28 | 🧑 MANUAL | Send: `我最鍾意食咩？` (tests Mem0 read — Tier 2 feature) | Response mentions 咖喱魚蛋 |
| 1.29 | 🧑 MANUAL | Send: `搜尋一下香港今日天氣` (tests SearXNG — Tier 2 feature) | Response includes recent weather info |
| 1.30 | 💬 MARIGOLD | "Show customer usage: `python nexgen_cli.py customer <job_id>`" | `current_spend_hkd > 0`, `total_tokens_in > 0`, `total_tokens_out > 0` |
| 1.31 | ✅ VERIFY | Proxy cost tracking confirmed in D1 | — |

**Abort if:** Bot doesn't reply (check systemd webhook + `/webhook` endpoint), Mem0 or SearXNG fails (Tier 2 features broken), or `current_spend_hkd` stays 0 (proxy or token registration bug).

### Phase F — Optional budget-block sanity (5 min)

| # | Actor | Step | Expected |
|---|---|---|---|
| 1.32 | 💬 MARIGOLD | "Block customer: `python nexgen_cli.py block <customer_id>`" | `monthly_budget_hkd = 0`, `blocked_at` set |
| 1.33 | 🧑 MANUAL | Send another Telegram message to bot | Bot either errors gracefully OR CF Worker returns 429 (check log) |
| 1.34 | 💬 MARIGOLD | "Unblock: `python nexgen_cli.py unblock <customer_id>`" | Budget restored, `blocked_at` cleared |
| 1.35 | 🧑 MANUAL | Send another message | Bot responds normally |

### Phase G — Teardown (10 min)

| # | Actor | Step | Expected |
|---|---|---|---|
| 1.36 | 💬 MARIGOLD | "Cancel customer: `python nexgen_cli.py cancel <customer_id>`" (confirm destructive) | Wipes VPS data, `contabo-cancel.sh`, revokes gateway token |
| 1.37 | 🤖 AUTO | D1 `vps_instances` → `status=cancelling`, `customer_id=NULL`, `cancel_date=NOW()`, `cancel_deadline=+30d` | — |
| 1.38 | 💬 MARIGOLD | "Verify clean: `python nexgen_cli.py status`" | No active jobs, 203187256 back in `cancelling` |
| 1.39 | ✅ VERIFY | Run 1 complete, system matches baseline | Ready for Run 2 |

---

## Run 2 — Tier 3 on 161.97.82.155 (`@NexGenE2E_bot`)

**Identical structure to Run 1**, with these differences:

- **Bot:** `@NexGenE2E_bot` (created in P1)
- **VPS flag:** `--vps 203187278`
- **Tier:** 3 (Elite)
- **Phase C additions:** Phase 3 now includes scripts 11 (Chrome headless), 12 (Claude Code CLI), 13 (ClawTeam). Watch for `DEPLOYMENT_SUCCESS` only after all three run.
- **Phase D additions:**
  - `google-chrome --version` on VPS → returns version
  - `which claude` → returns path
  - `which clawteam` → returns path
- **Phase E additions:** Live conversation tests should exercise Tier 3 features:
  - `用 chromium 打開 https://example.com 並截圖` (Chrome headless)
  - `運行一個多代理任務：搜尋新聞然後總結` (ClawTeam multi-agent)
- **Before starting Run 2:** `python nexgen_cli.py status` must show 203187256 back in `cancelling`, no active jobs, no orphan D1 rows.

---

## Final Verification (after Run 2 teardown)

| # | Check | Expected |
|---|---|---|
| F1 | `python nexgen_cli.py status` | Worker healthy, 0 active jobs, 0 pending jobs |
| F2 | `python nexgen_cli.py pool` | Both VPS `cancelling`, `reinstall_count=1` each |
| F3 | CF Worker Cloudflare dashboard → last hour logs | No 5xx, no unhandled errors |
| F4 | LS dashboard → Webhook deliveries → last hour | All 200 OK |
| F5 | D1 `jobs` table via `wrangler d1 execute` | Both test jobs `status=cancelled` or similar terminal state |
| F6 | D1 `api_usage` table | Both gateway tokens have `blocked_at` set (revoked) |
| F7 | Pi5 journalctl → full run | No ERROR or exception traces |

---

## Abort & Rollback

**At any 🤖 AUTO step failure:**
1. Stop — do not advance
2. Capture relevant log chunk (`journalctl --user -u nexgen-worker --since "5 min ago"`)
3. Investigate root cause (don't retry blindly)
4. Fix → restart worker → re-queue job via `/api/confirm/<new_id>` if webhook cannot be replayed

**Rollback strategy per phase:**
- **Phase A-B failure:** No VPS touched. Delete test job from D1, refund LS test order (no real money).
- **Phase C failure (mid-deploy):** VPS is in inconsistent state. Run `contabo-reinstall.sh` manually to wipe, set D1 `status=cancelling`, leave in pool.
- **Phase D-E failure (deploy succeeded but smoke/live fails):** Deploy is half-broken. Do NOT hand to customer. Run Phase G teardown immediately.
- **Phase G failure:** Manual cleanup via Contabo panel + `wrangler d1 execute` to fix D1 by hand.

---

## Execution Protocol — How This Plan Will Be Run

When Jacky says "let's start E2E":

1. Claude (this session) walks through prerequisites P1-P8 one at a time, waits for Jacky's confirmation on each before advancing.
2. Claude presents each step of Run 1 one at a time:
   - 🧑 MANUAL → Claude gives exact instruction, Jacky acts, pastes output
   - 💬 MARIGOLD → Claude gives exact command to paste to Marigold, Jacky relays, pastes Marigold's response back
   - 🤖 AUTO → Claude tells Jacky what log line to watch for, Jacky confirms when seen
   - ✅ VERIFY → Claude compares Jacky's pasted output to expected, explicitly says PASS or FAIL
3. At each phase boundary (A→B, B→C, etc.) Claude summarizes: `Phase X: PASS. Continue to Phase Y?`
4. Unexpected output → Claude stops, asks Jacky to investigate before continuing. No pushing through failures.
5. After Run 1 Phase G: explicit "Run 1 complete. Ready for Run 2?" checkpoint.
6. Run 2 follows the same protocol.
7. Final verification block → declare system production-ready or list remaining issues.

---

## Exit Criteria

The pipeline is production-ready for first paying customer when:

- [ ] Both runs complete Phase G with no manual rollback
- [ ] Both live Telegram conversations received valid AI responses
- [ ] Both `current_spend_hkd > 0` confirmed in D1
- [ ] Tier 3 scripts (11-13) verified present and functional
- [ ] Final verification F1-F7 all green
- [ ] No unhandled errors in Pi5 or CF Worker logs
- [ ] Both VPS back in recycling pool, D1 clean

If any criterion fails, document the gap in `active.md` and do not launch to real customers until fixed.

---

## References

- Pipeline code: `onboarding-pipeline/cf-worker/src/`, `onboarding-pipeline/pi5-worker/`
- Install scripts: `openclaw_install/scripts/00-13-*.sh`
- Previous E2E plans: [docs/pre-launch-e2e-test-plan.md](../../pre-launch-e2e-test-plan.md), [docs/superpowers/plans/2026-04-06-e2e-test-plan-additions.md](../plans/2026-04-06-e2e-test-plan-additions.md)
- Semi-auto operations guide: `docs/pi5-assistant-briefing-v2.md`
- Contabo API guide: `onboarding-pipeline/contabo-api-guide.md`
- Active status: [active.md](../../../active.md)
