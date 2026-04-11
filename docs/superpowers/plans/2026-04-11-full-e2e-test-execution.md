# Full E2E Test Execution Runbook

> **For operator:** This is an execution runbook, not a code plan. Each step is a concrete action with exact commands and expected output. Check the box when a step passes. Stop and debug on any unexpected output — do not push through failures.

**Goal:** Execute the full pipeline E2E test twice (Tier 2 → Tier 3) per [the design spec](../specs/2026-04-11-full-e2e-test-plan-design.md), validating website → recycle → deploy → live chat → teardown.

**Architecture:** Semi-auto — Jacky drives manual steps; Marigold on Pi5 executes all `nexgen_cli.py` commands; Claude (this session) walks Jacky through each step, verifies outputs, and gates phase transitions.

**Tech Stack:** Lemon Squeezy (test mode), Cloudflare Worker + D1, Pi5 systemd worker, Contabo API, Claude Agent SDK, DeepSeek + OpenAI via proxy.

---

## How to Use This Runbook

- **🧑 MANUAL** — Jacky acts (website, Telegram, SSH)
- **💬 MARIGOLD** — Jacky pastes the quoted command to Marigold on Pi5; Marigold runs it and returns output
- **🤖 AUTO** — System runs autonomously; Jacky watches the log tail for expected lines
- **✅ VERIFY** — Jacky pastes output here; Claude compares to expected and declares PASS/FAIL

**Log tail command (keep open in a Pi5 tmux window the whole time):**
```bash
journalctl --user -u nexgen-worker -f
```

**Abort rule:** If any step's output does not match expected, STOP. Ask Claude to diagnose. Do not retry or advance.

---

## Phase 0 — Prerequisites (one-time, ~15 min)

### P1: Create second test bot

- [ ] **🧑 MANUAL:** Open Telegram → `@BotFather` → `/newbot` → name `NexGen E2E Test` → username `NexGenE2E_bot` (or similar unique name)
- [ ] **🧑 MANUAL:** Save the bot token — you'll need it in Run 2 Phase A
- [ ] **✅ VERIFY:** Paste the bot username here (not token)

### P2: Confirm webhook secret is test-mode

- [ ] **🧑 MANUAL:** Open LS dashboard → Settings → Webhooks → find the webhook pointing to `https://api.3nexgen.com/api/webhook/lemonsqueezy` → note its signing secret is the **test-mode** secret (LS separates test/live secrets)
- [ ] **💬 MARIGOLD:** "List CF Worker secrets: `cd ~/nexgen-cf-worker && wrangler secret list`"
- [ ] **✅ VERIFY:** `LEMONSQUEEZY_WEBHOOK_SECRET` is present. If unsure it matches test-mode, set it: `echo "<test_secret>" | wrangler secret put LEMONSQUEEZY_WEBHOOK_SECRET`

### P3: SCP latest code to Pi5

- [ ] **🧑 MANUAL (from PC):** Run from `f:\openclaw_setup_business\onboarding-pipeline\pi5-worker`:
  ```bash
  scp worker.py nexgen_cli.py formatters.py dashboard.py api_client.py vps_lifecycle.py deployer.py playbook.py pi5@<pi5_host>:~/nexgen-worker/
  scp ../../openclaw_install/provision/contabo-revoke.sh pi5@<pi5_host>:~/nexgen-worker/scripts/
  ```
- [ ] **✅ VERIFY:** All scp commands exit 0

### P4: Restart Pi5 worker

- [ ] **💬 MARIGOLD:** "Restart worker: `systemctl --user restart nexgen-worker && sleep 3 && systemctl --user is-active nexgen-worker`"
- [ ] **✅ VERIFY:** Output is `active`

### P5: Pre-flight status

- [ ] **💬 MARIGOLD:** "Show status: `cd ~/nexgen-worker && python nexgen_cli.py status`"
- [ ] **✅ VERIFY:** Worker healthy. Both VPS `203187256` and `203187278` present with `status=cancelling`. Zero pending jobs.

### P6: Open log tail window

- [ ] **💬 MARIGOLD:** "Open a tmux window and tail the worker log: `journalctl --user -u nexgen-worker -f`. Keep this visible for the entire test."
- [ ] **✅ VERIFY:** Log stream visible, last line is a heartbeat or idle poll

### P7: Verify support email

- [ ] **🧑 MANUAL:** Send a test email to `support@3nexgen.com` from your personal mail
- [ ] **✅ VERIFY:** Arrives in the support inbox within 2 min

### P8: Open LS dashboard

- [ ] **🧑 MANUAL:** Keep LS dashboard → Orders + Webhook deliveries tabs open in browser
- [ ] **✅ VERIFY:** Tabs loaded

**Phase 0 gate:** All P1-P8 checked. If any failed, stop and fix before Run 1.

---

## Run 1 — Tier 2 (Pro) on VPS 203187256 / 161.97.88.8

Bot: `@NexGenAI_test_bot` | Budget: HKD 70/mo | Billing: Quarterly

### Phase 1A — Payment trigger (5 min)

- [ ] **🧑 MANUAL 1A.1:** Open `https://3nexgen.com/pricing` → click 專業版 Pro → Quarterly → "立即開始"
  - **Expected:** URL becomes `/onboarding?plan=pro&billing=quarterly`

- [ ] **🧑 MANUAL 1A.2:** Fill Onboarding form:
  - Email: your real email (for order receipt)
  - Telegram bot token: `@NexGenAI_test_bot`'s token
  - Telegram user ID: `340067089` (Jacky's)
  - Bot name: `NexGenAI_test_bot`
  - **Expected:** No red validation errors

- [ ] **🧑 MANUAL 1A.3:** Click "Pay with Card" → LS checkout opens → enter:
  - Card: `4242 4242 4242 4242`
  - Expiry: any future date (e.g., `12/30`)
  - CVC: any 3 digits
  - Name: anything
  - → Submit
  - **Expected:** LS returns success page, redirects back to 3nexgen.com

- [ ] **✅ VERIFY 1A.4:** LS dashboard → Orders → new test order visible, status `paid`, flagged as test

### Phase 1B — Webhook → Job queue (2 min)

- [ ] **🤖 AUTO 1B.1:** LS fires `order_created` webhook to `/api/webhook/lemonsqueezy`
  - **Watch for in LS dashboard → Webhook deliveries:** latest delivery returns **200 OK** within 5s

- [ ] **✅ VERIFY 1B.2:** Webhook delivery = 200 OK. If 401, webhook secret is wrong (fix P2 and retry Phase 1A from step 1A.3 via "Resend payment email" in LS)

- [ ] **💬 MARIGOLD 1B.3:** "Check pending jobs: `python nexgen_cli.py jobs`"
  - **Expected:** One job returned. Fields include `status=ready`, `tier=2`, `bot_username=NexGenAI_test_bot`, a numeric order ID (save this as `JOB1`)

- [ ] **🧑 MANUAL 1B.4:** Check owner Telegram chat
  - **Expected:** Message from `@NexGenAI_test_bot` like "New deploy #<JOB1>\nTier: 2 | Bot: @NexGenAI_test_bot\nWaiting for your command"

- [ ] **✅ VERIFY 1B.5:** Paste the job ID and Telegram notification text. Claude confirms PASS.

### Phase 1C — Recycle + deploy (45-60 min)

- [ ] **💬 MARIGOLD 1C.1:** "Deploy job `<JOB1>` onto VPS 203187256 specifically. Please confirm this is destructive (will wipe the VPS). Command: `python nexgen_cli.py deploy <JOB1> --vps 203187256`"
  - **Expected:** Marigold asks Jacky for confirmation, Jacky confirms, command runs

- [ ] **🤖 AUTO 1C.2:** Watch log tail for:
  ```
  [deployer] Starting deployment for job <JOB1>
  [lifecycle] Checking recycling pool...
  [lifecycle] Found recyclable VPS 203187256 (161.97.88.8)
  ```
  - **Expected:** All three lines appear within 30s
  - If empty pool error → stop, check D1 `vps_instances` state

- [ ] **🤖 AUTO 1C.3:** Watch for:
  ```
  [lifecycle] Running contabo-revoke.sh for 203187256
  [lifecycle] Revoke succeeded
  ```
  - **Expected:** Within 2 min
  - On failure → stop, manually revoke in Contabo panel, re-run 1C.1

- [ ] **🤖 AUTO 1C.4:** Watch for:
  ```
  [lifecycle] Running contabo-reinstall.sh for 203187256
  [lifecycle] Waiting for SSH on 161.97.88.8...
  [lifecycle] SSH ready on 161.97.88.8
  ```
  - **Expected:** SSH ready within ~15 min

- [ ] **🤖 AUTO 1C.5:** Watch for:
  ```
  [deployer] Gateway token registered for customer <JOB1>
  [deployer] Starting Agent SDK session (model=sonnet, max_turns=50)
  ```

- [ ] **🤖 AUTO 1C.6:** Phase 1 (scripts 00-03 — swap, system update, Node, Docker). Watch for:
  ```
  [agent] Running 00-swap-setup.sh
  [agent] Running 01-system-update.sh
  [agent] Running 02-install-node.sh
  [agent] Running 03-install-docker.sh
  [agent] Phase 1 gate check: PASS
  ```
  - **Expected:** ~8-12 min. If gate check fails → STOP.

- [ ] **🤖 AUTO 1C.7:** Phase 2 (scripts 04-07 — OpenClaw, Qdrant, Mem0, SearXNG). Watch for:
  ```
  [agent] Running 04-install-openclaw.sh
  [agent] Running 05-setup-qdrant.sh
  [agent] Running 06-setup-mem0.sh
  [agent] Running 07-setup-searxng.sh
  [agent] Phase 2 QA gate: health-check PASS, port-check PASS, api-check PASS
  ```
  - **Expected:** ~10-15 min

- [ ] **🤖 AUTO 1C.8:** Phase 3 (scripts 08-10 — watchdogs, hardening, env config). Watch for:
  ```
  [agent] Running 08-setup-watchdogs.sh
  [agent] Running 09-security-hardening.sh
  [agent] Running 10-configure-env.sh
  [agent] Phase 3 QA gate: telegram-test PASS, full-integration PASS
  [agent] Final QA: 28/28 PASS
  ```

- [ ] **🤖 AUTO 1C.9:** Watch for exactly:
  ```
  DEPLOYMENT_SUCCESS
  ```
  - **Expected:** This literal string appears. If `DEPLOYMENT_FAILED: <reason>` → stop, investigate.

- [ ] **🤖 AUTO 1C.10:** Watch for:
  ```
  [deployer] Setting Telegram webhook on customer bot
  [deployer] Sending customer ready message
  [deployer] Job <JOB1>: COMPLETE
  ```

- [ ] **🧑 MANUAL 1C.11:** Check `@NexGenAI_test_bot` in Telegram → should have received the "Your AI assistant is ready!" message from the deployer

- [ ] **✅ VERIFY 1C.12:** Paste the last 30 lines of log + confirm customer ready message received

### Phase 1D — Smoke verify (5 min)

- [ ] **🧑 MANUAL 1D.1 (from Pi5 or PC):** SSH into deployed VPS:
  ```bash
  ssh -i ~/.ssh/nexgen_automation -o StrictHostKeyChecking=no deploy@161.97.88.8
  ```
  - **Expected:** Login success, prompt shows `deploy@nexgen-<something>`

- [ ] **🧑 MANUAL 1D.2 (on the VPS):** Run verification block:
  ```bash
  systemctl --user is-active openclaw
  docker ps --format '{{.Names}}: {{.Status}}'
  curl -s http://localhost:6333/collections | head -20
  bash ~/qa/05-full-integration.sh
  ```
  - **Expected:**
    - `active`
    - At least two containers: `qdrant` up, `searxng` up
    - JSON response from Qdrant listing collections
    - QA script exits 0 with `PASS: 28` or similar

- [ ] **✅ VERIFY 1D.3:** Paste all four command outputs. Claude confirms all PASS.

- [ ] **💬 MARIGOLD 1D.4:** "Show final job + VPS state: `python nexgen_cli.py status && python nexgen_cli.py pool`"
  - **Expected:** Job `<JOB1>` `status=complete`, VPS 203187256 `status=active`, `customer_id=<JOB1>`, `reinstall_count=1`

### Phase 1E — Live conversation + cost tracking (10 min)

- [ ] **🧑 MANUAL 1E.1:** Open Telegram → `@NexGenAI_test_bot` → `/start`
  - **Expected:** Bot replies with welcome message (from OpenClaw)

- [ ] **🧑 MANUAL 1E.2:** Send: `你好，用繁體中文介紹下你自己，簡短啲`
  - **Expected:** Coherent Chinese response within 10s (DeepSeek via proxy)

- [ ] **🧑 MANUAL 1E.3:** Send: `請記住我最鍾意食咖喱魚蛋`
  - **Expected:** Acknowledgment ("好嘅，我記住咗" or similar)

- [ ] **🧑 MANUAL 1E.4:** Send: `我最鍾意食咩？` (Mem0 read test)
  - **Expected:** Response mentions 咖喱魚蛋. **If not → Mem0 is broken.**

- [ ] **🧑 MANUAL 1E.5:** Send: `幫我搜尋一下香港今日天氣` (SearXNG test)
  - **Expected:** Response includes actual recent weather info (not a generic "I cannot access the internet" reply). **If generic → SearXNG is broken.**

- [ ] **💬 MARIGOLD 1E.6:** "Show customer usage: `python nexgen_cli.py customer <JOB1>`"
  - **Expected:** `current_spend_hkd > 0`, `total_tokens_in > 0`, `total_tokens_out > 0`, `monthly_budget_hkd = 70`, `blocked_at = null`

- [ ] **✅ VERIFY 1E.7:** Paste the customer usage output. Claude confirms cost tracking PASS.

### Phase 1F — Budget-block sanity (5 min, optional but recommended)

- [ ] **💬 MARIGOLD 1F.1:** "Block customer `<JOB1>`: `python nexgen_cli.py block <JOB1>`" (confirm destructive)
  - **Expected:** `monthly_budget_hkd` set to 0, `blocked_at` timestamp set

- [ ] **🧑 MANUAL 1F.2:** Send any message to `@NexGenAI_test_bot`
  - **Expected:** Bot either replies with an error message, or silently fails. CF Worker log should show `429 Budget exceeded`.

- [ ] **💬 MARIGOLD 1F.3:** "Unblock: `python nexgen_cli.py unblock <JOB1>`"
  - **Expected:** Budget restored to 70, `blocked_at = null`

- [ ] **🧑 MANUAL 1F.4:** Send another message to bot
  - **Expected:** Normal response again

- [ ] **✅ VERIFY 1F.5:** Block→unblock→chat cycle confirmed working

### Phase 1G — Teardown (10 min)

- [ ] **💬 MARIGOLD 1G.1:** "Cancel customer `<JOB1>`: `python nexgen_cli.py cancel <JOB1>`" (confirm destructive — this wipes VPS data and cancels the Contabo instance)
  - **Expected:** Marigold confirms, runs command. Log shows:
    ```
    [cancel] Wiping VPS data on 161.97.88.8
    [cancel] Running contabo-cancel.sh for 203187256
    [cancel] Revoking gateway token for <JOB1>
    [cancel] Customer <JOB1> cancelled
    ```

- [ ] **💬 MARIGOLD 1G.2:** "Verify clean: `python nexgen_cli.py status && python nexgen_cli.py pool`"
  - **Expected:** Zero active jobs. VPS 203187256 `status=cancelling` again, `customer_id=null`, `cancel_deadline` set to ~30 days out

- [ ] **✅ VERIFY 1G.3:** System matches baseline. **Run 1 complete.**

### Run 1 Gate

- [ ] Phases 1A-1G all checked
- [ ] No abort triggered
- [ ] VPS 203187256 back in recycling pool
- [ ] D1 clean

**Proceed to Run 2 only after this gate passes.**

---

## Run 2 — Tier 3 (Elite) on VPS 203187278 / 161.97.82.155

Bot: `@NexGenE2E_bot` (from P1) | Budget: HKD 100/mo | Billing: Quarterly

**Run 2 is identical to Run 1 except:**

- Different bot + bot token (from P1)
- `--vps 203187278` in the deploy command
- Tier 3 includes scripts 11 (Chrome headless), 12 (Claude Code CLI), 13 (ClawTeam)
- Phase 2D adds Tier 3 smoke checks
- Phase 2E adds Tier 3 feature tests

### Phase 2A — Payment trigger (5 min)

- [ ] **🧑 MANUAL 2A.1:** `https://3nexgen.com/pricing` → 旗艦版 Elite → Quarterly → "立即開始"
- [ ] **🧑 MANUAL 2A.2:** Fill Onboarding form with `@NexGenE2E_bot`'s token, Jacky's user ID, bot name `NexGenE2E_bot`
- [ ] **🧑 MANUAL 2A.3:** Pay with test card `4242 4242 4242 4242`
- [ ] **✅ VERIFY 2A.4:** New test order visible in LS dashboard

### Phase 2B — Webhook → Job queue (2 min)

- [ ] **🤖 AUTO 2B.1:** Webhook fires → 200 OK
- [ ] **💬 MARIGOLD 2B.2:** "Check jobs: `python nexgen_cli.py jobs`"
  - **Expected:** One job, `tier=3`, `bot_username=NexGenE2E_bot`. Save order ID as `JOB2`.
- [ ] **🧑 MANUAL 2B.3:** Owner Telegram notification received (from `@NexGenAI_test_bot`)
- [ ] **✅ VERIFY 2B.4:** Paste job ID + notification

### Phase 2C — Recycle + deploy (60-75 min, longer due to Tier 3)

- [ ] **💬 MARIGOLD 2C.1:** "Deploy: `python nexgen_cli.py deploy <JOB2> --vps 203187278`" (confirm destructive)
- [ ] **🤖 AUTO 2C.2:** Watch for recycle log lines on VPS 203187278 (same as 1C.2-1C.4)
- [ ] **🤖 AUTO 2C.3:** Phase 1 (scripts 00-03) — same as 1C.6
- [ ] **🤖 AUTO 2C.4:** Phase 2 (scripts 04-07) — same as 1C.7
- [ ] **🤖 AUTO 2C.5:** Phase 3 (scripts 08-13 — **now includes Tier 3 extras**). Watch for:
  ```
  [agent] Running 08-setup-watchdogs.sh
  [agent] Running 09-security-hardening.sh
  [agent] Running 10-configure-env.sh
  [agent] Running 11-setup-chromium.sh
  [agent] Running 12-setup-acpx.sh
  [agent] Running 13-setup-clawteam.sh
  [agent] Phase 3 QA gate: PASS
  [agent] Final QA: 28/28 PASS
  ```
  - **Expected:** Scripts 11-13 run (they did NOT run in Run 1). If any of these scripts error out, STOP — this is the first real test of those scripts.

- [ ] **🤖 AUTO 2C.6:** Watch for `DEPLOYMENT_SUCCESS`
- [ ] **🤖 AUTO 2C.7:** Customer ready message sent
- [ ] **✅ VERIFY 2C.8:** Paste log tail + confirm customer received ready message

### Phase 2D — Smoke verify + Tier 3 checks (8 min)

- [ ] **🧑 MANUAL 2D.1:** SSH to `deploy@161.97.82.155`

- [ ] **🧑 MANUAL 2D.2 (on VPS):** Run base verification:
  ```bash
  systemctl --user is-active openclaw
  docker ps --format '{{.Names}}: {{.Status}}'
  curl -s http://localhost:6333/collections | head -20
  bash ~/qa/05-full-integration.sh
  ```
  - **Expected:** Same as 1D.2 — all PASS

- [ ] **🧑 MANUAL 2D.3 (on VPS):** Run **Tier 3** verification:
  ```bash
  google-chrome --version
  which claude
  which clawteam
  ls -la ~/.openclaw/tools/
  ```
  - **Expected:**
    - Chrome version like `Google Chrome 131.0.x` (NOT `command not found`)
    - `/home/deploy/.openclaw/tools/claude` or similar
    - `/home/deploy/.openclaw/tools/clawteam` or similar
    - `~/.openclaw/tools/` contains both binaries

- [ ] **✅ VERIFY 2D.4:** Paste all outputs. Claude confirms Tier 3 extras present.

### Phase 2E — Live conversation + Tier 3 features (12 min)

- [ ] **🧑 MANUAL 2E.1:** Open Telegram → `@NexGenE2E_bot` → `/start`
- [ ] **🧑 MANUAL 2E.2:** Basic chat test: `你好，簡短介紹自己`
  - **Expected:** Coherent Chinese response

- [ ] **🧑 MANUAL 2E.3:** Mem0 test: `記住我屋企有隻叫Luna嘅貓`, then `我屋企有咩動物？`
  - **Expected:** Second response mentions Luna

- [ ] **🧑 MANUAL 2E.4:** SearXNG test: `搜尋2026年香港最新科技新聞`
  - **Expected:** Real search results in response

- [ ] **🧑 MANUAL 2E.5:** **Chrome headless test (Tier 3 only):** `用瀏覽器打開 https://example.com 然後話我知個標題係咩`
  - **Expected:** Response includes "Example Domain" (the actual page title fetched via Chromium). If it says "I cannot browse" → Chrome integration broken.

- [ ] **🧑 MANUAL 2E.6:** **ClawTeam multi-agent test (Tier 3 only):** `用多代理幫我做研究：搜尋香港最近嘅天氣預報，然後總結未來三日嘅溫度變化`
  - **Expected:** Multi-step response showing search + summarization. If it says "I only have one agent" → ClawTeam integration broken.

- [ ] **💬 MARIGOLD 2E.7:** "Show usage: `python nexgen_cli.py customer <JOB2>`"
  - **Expected:** `current_spend_hkd > 0` (likely higher than Run 1 due to Tier 3 features), `monthly_budget_hkd = 100`

- [ ] **✅ VERIFY 2E.8:** All Tier 3 features confirmed working + cost tracked

### Phase 2F — Budget-block sanity (5 min, optional)

- [ ] **💬 MARIGOLD 2F.1:** `python nexgen_cli.py block <JOB2>`
- [ ] **🧑 MANUAL 2F.2:** Send chat → expect 429 / error
- [ ] **💬 MARIGOLD 2F.3:** `python nexgen_cli.py unblock <JOB2>`
- [ ] **🧑 MANUAL 2F.4:** Send chat → expect normal
- [ ] **✅ VERIFY 2F.5:** Cycle works

### Phase 2G — Teardown (10 min)

- [ ] **💬 MARIGOLD 2G.1:** "Cancel: `python nexgen_cli.py cancel <JOB2>`" (confirm destructive)
- [ ] **💬 MARIGOLD 2G.2:** "Status: `python nexgen_cli.py status && python nexgen_cli.py pool`"
  - **Expected:** Both VPS `cancelling`, both `reinstall_count=1`, zero active jobs
- [ ] **✅ VERIFY 2G.3:** System matches baseline. **Run 2 complete.**

---

## Final Verification (after both runs, 10 min)

- [ ] **F1 💬 MARIGOLD:** `python nexgen_cli.py status`
  - **Expected:** Worker active, 0 jobs, 0 active VPS, 2 cancelling

- [ ] **F2 💬 MARIGOLD:** `python nexgen_cli.py pool`
  - **Expected:** Both 203187256 and 203187278 `status=cancelling`, `reinstall_count=1` each, `cancel_deadline` ~30 days out

- [ ] **F3 🧑 MANUAL:** CF Worker dashboard → Logs → last 3 hours
  - **Expected:** No 5xx, no unhandled exceptions

- [ ] **F4 🧑 MANUAL:** LS dashboard → Webhook deliveries → last 3 hours
  - **Expected:** All deliveries 200 OK

- [ ] **F5 💬 MARIGOLD:** "Query D1 jobs: `wrangler d1 execute nexgen-db --command 'SELECT id, status, tier FROM jobs ORDER BY created_at DESC LIMIT 5'`"
  - **Expected:** Both test jobs in terminal state (complete or cancelled)

- [ ] **F6 💬 MARIGOLD:** "Query D1 usage: `wrangler d1 execute nexgen-db --command 'SELECT customer_id, monthly_budget_hkd, blocked_at FROM api_usage ORDER BY created_at DESC LIMIT 5'`"
  - **Expected:** Both test gateway tokens have `blocked_at` set (revoked during cancel)

- [ ] **F7 💬 MARIGOLD:** "Check worker log for errors: `journalctl --user -u nexgen-worker --since '3 hours ago' | grep -iE 'error|exception|traceback'`"
  - **Expected:** Empty or only expected/logged errors

---

## Exit Criteria

All of these must be true to declare the pipeline production-ready:

- [ ] Both Run 1 and Run 2 completed all phases without manual rollback
- [ ] Both live Telegram conversations returned valid AI responses
- [ ] Both `current_spend_hkd > 0` confirmed in D1 during Phase E
- [ ] Tier 3 scripts 11, 12, 13 all ran successfully
- [ ] Chrome headless test (2E.5) and ClawTeam test (2E.6) both returned feature-correct responses
- [ ] Final verification F1-F7 all PASS
- [ ] Both VPS back in recycling pool at final state
- [ ] D1 clean, no orphaned records

**If any criterion fails:** Document the gap in [active.md](../../../active.md) under "Remaining Tasks" and do NOT launch to real customers until resolved.

**If all criteria pass:** Update [active.md](../../../active.md): mark task #9 (E2E test) complete, move to task #10-12 (pentest, first beta customer, business registration).

---

## Post-Test Cleanup

- [ ] **🧑 MANUAL:** LS dashboard → refund both test orders (test mode, no money moved, but keeps the order list clean)
- [ ] **🧑 MANUAL:** Delete `@NexGenE2E_bot` via BotFather if not needed for future tests (or keep for repeat runs)
- [ ] **💬 MARIGOLD:** Remove any leftover test artifacts: `rm -rf ~/nexgen-worker/clients/<JOB1> ~/nexgen-worker/clients/<JOB2>` (if those directories exist)
- [ ] **🧑 MANUAL:** Commit any config changes made during the test (e.g., webhook secret update)

---

## Estimated Timeline

| Phase | Duration |
|---|---|
| Phase 0 (Prereqs) | ~15 min |
| Run 1 (Phases 1A-1G) | ~90 min |
| Run 2 (Phases 2A-2G) | ~105 min |
| Final Verification | ~10 min |
| Post-Test Cleanup | ~5 min |
| **Total** | **~3.5 hours** |

Budget 4 hours including buffer for debugging.

---

## Self-Review Notes

- Spec coverage: every phase in the design spec has a corresponding task block ✓
- No placeholders: every command is concrete, every expected output is specified ✓
- Type consistency: `JOB1`/`JOB2` placeholders used consistently; `203187256`/`203187278` VPS IDs match design spec ✓
- Tier 3 coverage: scripts 11-13 explicitly tested in 2C.5 + 2D.3 + 2E.5-6 ✓
