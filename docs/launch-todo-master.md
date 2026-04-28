# NexGen Launch — Master TODO (AI-Driven Execution) v5

> **Created:** 2026-04-28 | **Last updated:** 2026-04-28 (post-Codex Round 2)
> **Design:** Claude (PC) + Marigold (Pi5) execute, user verifies each phase
> **Goal:** **Friend-beta launch (1-3 trusted customers, manual intervention OK) in 7-10 focused days. Paid-strangers launch only after friend-beta soak passes.**
>
> **⚠️ Honest assessment (Codex Round 2):** This plan is launch-ready for **friend beta with manual intervention only**. Public paid-strangers launch needs additional hardening (Phase 9+) — production-grade migration tooling, kill switch, legal copy fixes, subscription identity model, capacity tests.
>
> **Codex reviews integrated:**
> - Round 1: 4 P0 gaps (payment integrity, refund handling, token cap, /start gate via sendMessage)
> - Round 2: 6 critical structural issues — legal copy mismatch, D1 migration unsafe, missing kill switch, subscription identity model, customer-facing tsundere risk, calibration answer-key gap

---

## 🔴 Pre-Phase-0 Critical Fixes (must happen before ANY paid customer)

These were missed in v1-v4 and surfaced in Codex Round 2. They block launch entirely.

### P-1: Legal Copy Audit & Fix (1h, USER decision needed)

| Field | Value |
|-------|-------|
| Owner | User decides + Claude implements |
| Issue | `website-lovable/src/public/locales/{lang}/legal.json` claims **"99%+ uptime"** (line 18) and **"All fees paid are non-refundable"** (line 14, 94) — both directly contradict the Pi5 reality + Phase 2 refund handling. Public legal copy is binding. |
| Decisions needed | (a) Uptime promise: drop entirely, or downgrade to "best effort" / 95% / soft commitment? (b) Refund policy: align to "7-day cooling off + technical-failure full refund" (matches Phase 2 implementation + likely HK consumer expectation), OR remove Phase 2's auto-refund handling and stay non-refundable. |
| Files | `website-lovable/src/public/locales/{zh-HK,zh-CN,en,es,ja,ru}/legal.json` (terms, refund), `Refund.tsx` |
| Acceptance | Public legal copy matches actual operational behavior. No promises we can't keep. |

### P-2: schema.sql Production Safety (30min)

| Field | Value |
|-------|-------|
| Owner | Claude |
| Issue | `cf-worker/schema.sql:3` starts with `DROP TABLE IF EXISTS jobs;`. If accidentally applied to prod D1, all customer data lost. |
| Fix | (a) Move `DROP TABLE` lines to `cf-worker/schema-fresh-init.sql` (test setup only, never run on prod). (b) Add CI check / pre-commit hook that warns if `DROP TABLE` is in any file matched by deploy automation. (c) Document in CLAUDE.md that ad-hoc schema changes go through `cf-worker/migrations/NNNN_name.sql`. |
| Acceptance | No `DROP TABLE` runnable from any deploy/sync command |

### P-3: Money & Account Mechanics Check (15min, USER)

| Field | Value |
|-------|-------|
| Owner | User |
| Items | (a) **Contabo** — 2 VPS scheduled cancel 2026-04-27. After that, auto-billing renewal? Set credit card on file? (b) **DeepSeek** — current account balance? Topped up for 30 days projected use? (c) **OpenAI** — same. (d) **Resend** — free tier limit (3000 emails/month) sufficient for soft launch? (e) **LS payouts** — when does money hit your bank? (Typically 7-14 days after first sale.) |
| Acceptance | Documented amounts + dates. Top-ups done if any are low. |

### P-4: Marigold Customer-Facing Voice Constraint (NEW from Codex 4.4)

| Field | Value |
|-------|-------|
| Owner | Claude (constraint), Marigold (briefing update) |
| Issue | Marigold is tsundere-personality (intentional for owner banter). **NEVER applicable to customer-facing text** — emails, bot messages, support replies. |
| Constraint | Add to briefing v3: "All customer-facing text uses neutral templates from `~/clawd/templates/customer/*.md`. Marigold MUST NOT improvise customer email/message tone. If asked to draft customer text, point to template; if no template exists, escalate to user." |
| Files | New `~/clawd/templates/customer/` directory with: deploy_ready.md, payment_confirmed.md, deploy_failed.md, refund_processed.md, support_response_skeleton.md |
| Acceptance | M.7 calibration includes test: "draft a refund apology email" → Marigold replies "I'd use the template at... want me to fill it in?" not improvises |

---

## Codex Critical Adds (NEW P0 — these were missing)

| # | Gap | Why Critical |
|---|-----|--------------|
| **C1** | **Payment integrity validation** — webhook trusts `custom_data.order_id` without validating variant/amount/currency/test-vs-live mode/idempotency | Day-1 refund disaster: a stale checkout, wrong variant, or test-mode payment marks production job ready |
| **C2** | **Failed renewal / refund / chargeback handling** — currently only logs `subscription_payment_failed` | Customer cancels / chargebacks → VPS keeps running → unbounded cost to you |
| **C3** | **Token / budget hard cap is P0, NOT P1** — manual monitoring is not a real control; current check is post-hoc, race-prone | Runaway client (loop bug, abuse) burns HK$50+ in seconds before block fires |
| **C4** | **`/start` verification via `sendMessage` probe, NOT `getUpdates`** — `getUpdates` would steal updates from the deployed bot's long-poller | Original plan would create a Telegram polling conflict — bot would intermittently miss customer messages |

---

## Telegram Notification Architecture Decision (Codex-driven)

**Original plan:** Both webhook AND long-polling. **Verdict from Codex: WRONG — pick ONE.**

**New approach:**
- **Customer's bot uses LONG POLLING ONLY** (running on customer VPS)
- **Pi5 deletes any pre-existing webhook** before deploy (`deleteWebhook` call in deployer)
- **Pi5 sends "ready" via direct `sendMessage`** (no webhook needed — it has the bot token)
- **CF Worker `/start` gate uses `sendMessage` probe** to `telegram_user_id` (returns 403 if customer hasn't `/start`-ed)

This eliminates the self-signed cert problem entirely AND avoids polling conflicts.

---

## Execution Model

| Owner | Role |
|-------|------|
| **Claude (PC)** | Code edits, tests, git, CF Worker deploy, website deploy, **briefing updates**, **direct Marigold conversation via SSH** |
| **Marigold (Pi5)** | All operational work: SCP, systemd, deploys, dashboard, customer cancellation, refund handling, daily monitoring |
| **User (你)** | Provide credentials, verify acceptance tests, approve Marigold's suggestions before destructive actions |

**Verification rule:** No phase advances until user runs the acceptance test and confirms ✅ in chat.

### NEW: Claude can talk to Marigold directly via SSH

Per `Pi5/Pi5_remote_management.md`, Claude can converse with Marigold over SSH:

```bash
ssh jacky999@192.168.1.30 "~/bin/marigold 'your message' [session-id]"
```

**Implications for this plan:**

- **Task M.7 (Calibration Test) becomes executable BY CLAUDE** — Claude asks the 15 scenarios, parses Marigold's answers, scores them. User reviews the transcript. No more delegation gap.
- **Each Phase's M.4 briefing update can be tested live** — after SCP'ing new briefing, Claude asks Marigold a few targeted questions to confirm she absorbed the changes.
- **Phase 6 (E2E test) Marigold tasks are testable via SSH conversation** — Claude can role-play as user-asking-for-deploy and observe Marigold's autonomous behavior.

### Quota constraint

Each Marigold SSH call eats from your ChatGPT Plus 5h window (shared with your Telegram chats with her). Each turn takes 30s-2min.

**Budget rule for this plan:**
- Phase 1 + M.6 bootstrap: ~3 Marigold turns
- Each phase's M.4 verification: ~3 Marigold turns × 5 phases = 15 turns
- M.7 Calibration: 15 scenarios × ~1 turn each = 15 turns
- Phase 6 deploy coordination: ~10-20 turns over multiple sessions
- **Total budget: ~50-70 Marigold turns over execution.** Spread across multiple 5h windows.

**Batching rule:** Group questions per SSH session. Don't tight-loop.

---

## Marigold Readiness Track (NEW — runs parallel to Phases 2-7)

**Critical principle:** Marigold's `pi5-assistant-briefing-v*.md` MUST stay in sync with code changes. Stale briefing = wrong decisions on real customers.

### How it works

For **every Phase from 2 onwards**, AFTER code is shipped:

1. **Claude updates `docs/pi5-assistant-briefing-v3.md`** — adds new section reflecting the change
2. **Claude updates `nexgen_cli.py`** — exposes any new state/operations Marigold needs
3. **Marigold (via SCP) gets new briefing** — synced to `~/clawd/memory/pi5-assistant-briefing-v3.md`
4. **User runs Marigold calibration test** — see Task M.7 below
5. Phase passes only when Marigold demonstrates understanding

### Per-phase Marigold deliverables

| Phase | New code | Briefing v3 section to add | New CLI exposure |
|-------|----------|---------------------------|------------------|
| 2 | Payment integrity, refund handling, grace policy | "Payment Lifecycle Decisions" — when LS event triggers what; when to alert user vs auto-handle | `nexgen_cli.py customer status` shows `payment_failed_at`, grace day count, refund history |
| 3 | Long-polling only, no webhook, /start gate, email | "Customer Notification Flow" — explains why no webhook, how `/start` gate works, how to verify email delivery | `nexgen_cli.py deploy` no longer asks about webhook URL; new `nexgen_cli.py customer email-resend <id>` |
| 4 | Atomic budget reservation, blocked_at | "Budget & Token Cap Logic" — explains pre-reservation, when customer gets 429, how to manually unblock | `nexgen_cli.py customer budget` shows reserved + actual spend, `unblock` command works on `blocked_at` flag |
| 5 | Rate limit | "Public Endpoint Hardening" — what 429s look like in logs, what to do if real customer is rate-limited | `nexgen_cli.py audit rate-limits` shows recent throttles |
| 6 | (this IS the Marigold test) | n/a — but use Phase 6 results to spot any briefing gaps | n/a |
| 7 | Refund SOP, disaster recovery, customer onboarding | "Operational Runbooks" — links to all SOPs Marigold should reference | `nexgen_cli.py refund <customer> --confirm-with-user` |

### Task M.1 — Briefing v3 base structure (1h, parallel with Phase 1)

| Field | Value |
|-------|-------|
| Owner | Claude |
| File | `docs/pi5-assistant-briefing-v3.md` (new file, supersedes v2.3) |
| Content | Start with v2.3 as base; add placeholder sections for each Phase 2-7 deliverable; mark them "TBD - filled when Phase X ships" |
| Why now | Establishes structure so updates per phase are append-only, not rewrite |

### Task M.2 — Marigold's daily routine playbook (1h, in Phase 7)

| Field | Value |
|-------|-------|
| Owner | Claude |
| File | `docs/pi5-assistant-daily-routine.md` (synced to Pi5 `~/clawd/memory/`) |
| Content | (1) Morning: dashboard scan, alert ack, overnight deploy review. (2) On new order Telegram: SUGGEST → wait approval → EXECUTE. (3) On budget warning: alert user with options. (4) On deploy fail: 3-attempt rule then escalate. (5) On Pi5 health red flag: SOS to user. (6) End of day: backup status check + summary message. (7) SLA targets: deploy <45min, response to user <5min during awake hours. |
| When to wake user | (a) Any deploy fail after 3 attempts. (b) Any LS payment integrity rejection. (c) Any customer at 100% budget. (d) Any Contabo/CF/DeepSeek outage detected. (e) Any chargeback event. (f) Anything Marigold doesn't recognize. |

### Task M.3 — Marigold escalation matrix (30min, in Phase 7)

| Trigger | Marigold autonomous? | User approval needed? |
|---------|---------------------|----------------------|
| New paid order, recyclable VPS available | ❌ | ✅ Suggest VPS, wait approval |
| Deploy retry on transient failure (1st time) | ✅ | ❌ |
| Deploy retry (2nd time) | ❌ | ✅ Alert user, ask continue |
| Customer at 80% budget | ❌ | ✅ Alert + suggest action |
| Customer at 100% budget (block) | ✅ Auto-block | ❌ Inform user post-action |
| Refund webhook received | ❌ | ✅ Verify in support ledger first |
| LS payment integrity reject | ❌ | ✅ NEVER auto-process |
| Daily backup (success) | ✅ | ❌ |
| Backup fail | ❌ | ✅ Alert immediately |
| Customer cancel via subscription_cancelled | ✅ Schedule grace period | ❌ Inform user |
| Customer cancel manual via support | ❌ | ✅ User triggers via CLI |
| Pi5 disk >85% / mem >90% | ❌ | ✅ Alert user, suggest cleanup |
| Multi-customer parallel deploy (Contabo rate limit) | ❌ | ✅ Sequence and alert if delays |

### Task M.4 — Briefing v3 update per phase (15-30min each, in each phase)

After Phase 2/3/4/5/7 ships:
1. Claude appends the corresponding "to-be-filled" section in `briefing-v3.md`
2. Concrete examples + commands + decision tree
3. SCP to Pi5 `~/clawd/memory/`
4. User runs M.7 calibration test on the new section

### Task M.5 — `nexgen_cli.py` extensions (in each phase)

Each phase that introduces new state must expose it via CLI before Marigold can manage it. Code changes batched with Phase work, not standalone.

### Task M.6 — Marigold working memory bootstrap (30min, in Phase 1)

| Field | Value |
|-------|-------|
| Owner | Claude (SSH talks to Marigold, asks her to verify) |
| What | Verify Pi5 `~/clawd/memory/` has: (a) latest briefing. (b) tier prices reference. (c) command cheatsheet. (d) escalation matrix. (e) refund/disaster runbooks (after Phase 7) |
| Method | Claude SSH-asks Marigold: `~/bin/marigold 'list files in ~/clawd/memory/ that pertain to NexGen operations, and tell me your understanding of each'` |
| Acceptance | Marigold can answer: "what's tier 2 monthly price?", "what command lists customers at >80% budget?" without asking user |

### Task M.0 — Marigold reachability test (5min, FIRST thing in Phase 1)

| Field | Value |
|-------|-------|
| Owner | Claude |
| What | Confirm SSH→Marigold pipeline works before any other plan execution |
| Method | `ssh jacky999@192.168.1.30 "~/bin/marigold 'Hello Marigold, this is Claude on Jacky\\'s PC. Confirm you receive this and tell me what session-id you are using. Also: what is your model and approximately what time is it on Pi5?' marigold-test-init"` |
| Pass | Reply received within 3 minutes, shows model=gpt-5.5 (or current), session-id echoed, current Pi5 time roughly correct |
| Fail action | Investigate per troubleshooting table in `Pi5/Pi5_remote_management.md` before proceeding |

### Task M.7.0 — Calibration Answer Key (NEW from Codex Round 2, 30min, BEFORE M.7)

| Field | Value |
|-------|-------|
| Owner | Claude (writes) + User (reviews & approves) |
| Issue | Codex 4.2: Without an answer key written BEFORE Marigold is asked, both Claude and Marigold could share the same wrong assumption — calibration becomes self-validating |
| File | `docs/marigold-calibration-answer-key.md` (new file, kept private — NOT SCP'd to Pi5 before M.7) |
| Content | For each of the 15 M.7 questions: expected correct answer + 2-3 wrong-answer patterns to watch for + hard-fail conditions (e.g. "if she suggests auto-processing payment integrity reject, fail entire calibration") |
| User approval | User reads the answer key BEFORE M.7 runs. If user disagrees with an expected answer, fix it now (better to find disagreement here than mid-launch) |
| Acceptance | Signed-off answer key exists on PC, NOT on Pi5 |

### Task M.7 — Marigold Calibration Test (CRITICAL pre-Phase-6 gate, 1h)

**Run AFTER Phases 2-5 ship + briefing v3 updated + M.7.0 answer key approved, BEFORE Phase 6 starts.**

| Field | Value |
|-------|-------|
| Owner | **Claude executes via SSH; User reviews transcript** |
| What | Claude asks Marigold 15 scenario questions via SSH wrapper; saves answers to a transcript file; scores each answer; flags weak spots |
| Method | `ssh jacky999@192.168.1.30 "~/bin/marigold '<question>' calibration-test"` per question, batched within one 5h ChatGPT window |
| Sample questions | (1) "新order #2001 嚟咗 Tier 2，pool有1個recyclable，下一步點?" (2) "客戶喺 80% budget，點處理?" (3) "LS送嚟一個webhook variant_id=999唔match，點?" (4) "客戶投訴refund，你check咩，做咩?" (5) "Pi5 disk 90%，做咩?" (6) "Telegram bot send `/start` deploys後3分鐘冇reply，可能咩問題?" (7) "我（user）今日unavailable 8小時，邊啲嘢你可以autonomous?" (8) "Customer A `current_spend` 突然spike HK$30 in 1 min，做咩?" (9) "新order但Resend domain DNS未verify，點?" (10) "客戶嘅bot token format睇落wrong，點check?" (11) "Run 2 deploy 失敗第3次，點?" (12) "Backup hash mismatch，點?" (13) "DeepSeek outage 30 min, 客戶投訴, 點解釋?" (14) "Customer 投訴想轉Tier，點?" (15) "你而家覺得邊度唔confident, 我可以teach你?" |
| Output | `docs/marigold-calibration-YYYY-MM-DD.md` with question + answer + score + comments |
| Pass criteria | 13/15 correct + identifies 1+ knowledge gap honestly |
| Failure → action | Claude updates briefing v3 with the missing scenarios, SCP to Pi5, re-asks failed questions |

**Why this matters:** Run 1 needed 5 attempts because Marigold was operating from outdated mental model. Calibration test catches this BEFORE real customer.

### Task M.8 — Marigold's audit log + memory (30min, ongoing)

| Field | Value |
|-------|-------|
| Owner | Claude |
| What | Marigold writes a daily summary to `~/clawd/memory/daily-log/YYYY-MM-DD.md`: orders handled, customers contacted, decisions made, escalations to user. Reviewable by user + Marigold can grep her own history. |
| Why | Without this, Marigold has no continuity day-to-day. Each session starts cold. |

---

## Phase 0 — External Service Setup (PARALLEL, START FIRST) (~30min user effort, then 24-48h DNS wait)

**Why first:** Resend domain DNS can take 24-48h to propagate. **Start while doing Phase 1 code work.**

| # | Task | Owner | What |
|---|------|-------|------|
| 0.A | Sign up Resend, add `3nexgen.com` domain | User | Get API key, add DKIM/SPF DNS records to Cloudflare |
| 0.B | Get Lemon Squeezy production webhook signing secret | User | LS Dashboard → Settings → Webhooks |
| 0.C | Document current LS variant IDs per tier | User+Claude | Map `variant_id → tier × billing_cycle × HKD price` (will be used in C1 fix) |
| 0.D | Test `support@3nexgen.com` mail receive | User | Send test from another email, confirm arrival |
| 0.E | Test owner Telegram alert channel | User | Pi5 worker should already alert; confirm `@NexGenAI_test_bot` reaches you |

**🟢 Phase 0 acceptance:** All 5 items confirmed. Codex says these block everything else.

---

## Phase 1 — Baseline Sync (1 hour)

| # | Task | Owner | Files / Acceptance |
|---|------|-------|--------------------|
| 1.1 | Commit all 17 uncommitted changes | Claude | `git status` clean |
| 1.2 | Deploy CF Worker | Claude | `wrangler deploy`; `/health` returns 200 |
| 1.3 | Deploy website | Claude | New OG image visible on share preview |
| 1.4 | SCP latest pi5-worker code, restart systemd | Marigold | Service active, no errors in journalctl |
| 1.5 | Run full Pi5 + CF Worker test suites | Both | All pass |

**🟢 Phase 1 acceptance:**
- Visit https://3nexgen.com (new OG)
- `curl https://api.3nexgen.com/health` → 200
- SSH Pi5 → `systemctl --user status nexgen-worker` → active

---

## Phase 2.0 — D1 Migration Safety (NEW from Codex Round 2) (~2 hours)

**Must come before Phase 2 schema changes.**

| Field | Value |
|-------|-------|
| Owner | Claude |
| Files | New `cf-worker/migrations/` directory + `cf-worker/scripts/run-migration.ts` |
| Steps | (1) Create `0001_baseline.sql` matching current prod D1 schema. (2) Establish numbered migration convention: `NNNN_description.sql` with up + down sections. (3) Test against fresh DB, against partial-state DB, run twice (idempotency). (4) Backup prod D1 via `wrangler d1 export` before any migration. (5) Document rollback procedure. |
| Subsequent Phase 2.x changes | Each adds a new `NNNN_*.sql` file. Phase 2.4 adds `webhook_events` table; Phase 2.6 adds subscription identity columns; Phase 4.2 adds `reserved_spend_hkd` + `reservation_id` columns. |
| Acceptance | Can apply, rollback, re-apply migrations against test D1 without data loss |

---

## Phase 2 — Payment Integrity (P0, expanded from Codex Round 2) (~8 hours)

This is the #1 financial-risk fix. Without this, day-1 disaster.

### Task 2.1: Variant/amount/mode validation in webhook

| Field | Value |
|-------|-------|
| Owner | Claude |
| Files | `cf-worker/src/handlers/webhook.ts`, new `cf-worker/src/lib/lemonsqueezy-variants.ts` |
| What | (a) Hardcode mapping `{variant_id: {tier, billing_cycle, hkd_amount}}`; (b) On `order_created`, verify webhook's `variant_id`, `total`, `currency`, `test_mode` flag matches expected; (c) Reject + alert owner on mismatch |
| Tests | 6 vitest cases: correct match, wrong variant, wrong amount, wrong currency, test-mode in prod, missing variant |

### Task 2.2: Webhook idempotency

| Field | Value |
|-------|-------|
| Owner | Claude |
| Files | `cf-worker/src/handlers/webhook.ts`, D1 schema add `webhook_events` table |
| What | Store `event_id` (LS provides one) in D1 with UNIQUE constraint. Re-delivery returns 200 without reprocessing. |
| Tests | Same event delivered 3 times → only first creates job |

### Task 2.3: Failed renewal grace policy

| Field | Value |
|-------|-------|
| Owner | Claude |
| Files | `cf-worker/src/handlers/webhook.ts`, new D1 column `payment_failed_at` |
| Policy | Day 0: alert owner + email customer. Day 3: budget→0 (proxy returns 429). Day 7: schedule VPS cancel. Recovery payment: clear `payment_failed_at`, restore budget. |
| Tests | Simulate 3 failed payments; verify state transitions |

### Task 2.4: Refund/chargeback handling

| Field | Value |
|-------|-------|
| Owner | Claude |
| Files | `cf-worker/src/handlers/webhook.ts` |
| What | Handle LS events `subscription_payment_refunded`, `order_refunded`. Action: budget→0, schedule VPS cancel within 24h, alert owner. |

### Task 2.5: Set Lemon Squeezy webhook secret

| Field | Value |
|-------|-------|
| Owner | Claude (deploy) + User (provides secret from 0.B) |
| What | `wrangler secret put LEMONSQUEEZY_WEBHOOK_SECRET` |

### Task 2.6: LS Subscription Identity Map (NEW from Codex Round 2; refined Round 3)

**Critical fix:** v4 plan still relied on `custom_data.order_id` for lifecycle events. Real LS subscription events reference `subscription_id`, not order_id.

**Architecture decision (Codex Round 3):** Current schema has no `customers` table — customer state is split across `jobs` (one row per order) and `api_usage` (one row per active service). Rather than introduce a new table, **extend `api_usage`** with LS identity columns. `api_usage.customer_id` (already a UUID-ish) becomes the canonical link.

| Field | Value |
|-------|-------|
| Owner | Claude |
| Files | `cf-worker/migrations/0003_subscription_identity.sql`, `cf-worker/src/handlers/webhook.ts` |
| Schema | Add columns to existing **`api_usage`** table: `ls_order_id`, `ls_subscription_id`, `ls_customer_id`, `ls_variant_id`, `ls_status`, `ls_renews_at`, `ls_ends_at`. (No new table.) |
| Logic | (a) On `order_created`: store all 7 fields when `api_usage` row is created (or upsert if customer pre-exists). (b) On any subsequent event (renewal/cancel/refund/expire/failed): lookup `api_usage` by `ls_subscription_id` first, fallback to `customer_id` via `jobs` join, fallback to email. (c) Store every event in `webhook_events` for audit. |
| Test | Use 5+ real captured LS payloads (download from LS dashboard's webhook history) — not hand-mocks |
| Acceptance | Subscription cancel test: cancel referencing only `subscription_id` (no custom_data) → correct customer marked cancelled |

### Task 2.7: Webhook Tests with Real LS Payloads (NEW from Codex Round 2)

| Field | Value |
|-------|-------|
| Owner | Claude (writes), User (provides payloads) |
| Steps | (1) User goes to LS dashboard webhook history → exports actual JSON payloads for: order_created, subscription_payment_success (renewal), subscription_payment_failed, subscription_cancelled, subscription_expired, refund. (2) Save under `cf-worker/test/fixtures/ls-payloads/`. (3) Write vitest contract tests using real payloads, not hand-shaped mocks. (4) Add edge cases: missing `custom_data`, duplicate concurrent delivery, malformed signature. |
| Acceptance | All real-payload tests pass |

**🟢 Phase 2 acceptance:**
- LS Dashboard → send test webhook → 200 from CF Worker
- Manually trigger refund event in test mode → customer's budget drops to 0, alert arrives
- Re-deliver same event → no duplicate job

---

## Phase 3 — Customer Notification (P0) (~6 hours)

### Task 3.1: Display Order ID on confirmation screen (30 min)

Same as before — `Onboarding.tsx` shows `{orderId}` after CheckCircle2.

### Task 3.2: Resend email integration (3-4h, **depends on 0.A DNS ready**)

| Field | Value |
|-------|-------|
| Owner | Claude |
| Files | New `pi5-worker/email_client.py`, modify `notifier.py` (`send_customer_email`), modify `deployer.py` (call after success) |
| Templates | zh-HK template: order #, bot @username, "搜 @{username} 喺 Telegram, click /start", support@, deploy timestamp |

### Task 3.3: `/start` gate via `sendMessage` probe (CHANGED from Codex C4) (2h)

| Field | Value |
|-------|-------|
| Owner | Claude |
| Files | `cf-worker/src/handlers/orders.ts`, `Onboarding.tsx` |
| What | New endpoint `POST /api/orders/:id/verify-start`. CF Worker calls Telegram `sendMessage(chat_id=user_id, text="✅ 已連接，請繼續付款")` using customer's bot token. **403 → not started, return error to UI.** **200 → success, allow payment.** |
| Why not getUpdates | Codex: would conflict with deployed bot's long-poller, steal updates |
| UX | "請喺 Telegram 同你嘅 bot send `/start`，然後 click 下面驗證" |

### Task 3.4: Single Telegram delivery mode — long polling only (CHANGED from Codex) (2h)

| Field | Value |
|-------|-------|
| Owner | Claude + Marigold |
| Files | `pi5-worker/deployer.py:62-96` (DELETE webhook setup), `pi5-worker/notifier.py:64-87` (add status/body logging), VPS bot side (verify polling enabled) |
| What | (a) Remove `set_webhook` calls. (b) Add `deleteWebhook(drop_pending_updates=False)` BEFORE starting bot service on VPS. (c) Bot uses long polling only (already configured). (d) Pi5 sends "ready" message via direct `sendMessage` (no webhook needed). (e) Log all Telegram API failures with status_code + response body. (f) Deployer checks return value; on failure mark job `complete_with_warning` |

**🟢 Phase 3 acceptance (full deploy dry-run):**
1. Submit form (test order)
2. Try to proceed without `/start` → blocked with clear message
3. `/start` your bot → verify gate passes
4. (Skip payment in dry-run) — manually mark job ready
5. Marigold deploys
6. After success: email arrives, bot replies to `/start`, Pi5 sends "ready" message

---

## Phase 4 — Token / Budget Hard Cap (PROMOTED to P0 from Codex C3) (~5 hours)

**Codex verdict:** Manual monitoring isn't a real control. Even for soft launch, you need at least the easy wins.

### Task 4.1: Read `blocked_at` flag in proxy (30 min)

| Field | Value |
|-------|-------|
| Owner | Claude |
| Files | `cf-worker/src/handlers/proxy.ts:84-89` |
| What | Before forwarding: `if (usage.blocked_at !== null) return 429` |

### Task 4.2: Atomic budget reservation (replaces simple max_tokens injection) (3h)

**Codex critique:** `max_tokens` injection alone doesn't solve concurrent requests, embeddings, or input-token cost.

| Field | Value |
|-------|-------|
| Owner | Claude |
| Files | `cf-worker/src/handlers/proxy.ts`, `cf-worker/src/lib/db.ts` |
| What | (a) Pre-reserve estimated cost (atomic D1 UPDATE) BEFORE forwarding. (b) On response, settle actual cost (refund overestimate, charge underestimate). (c) Cap reservation at remaining budget. (d) For embeddings, estimate from input length. (e) Inject `max_tokens` for chat as belt-and-suspenders. |
| Algorithm | `reserve = min(estimated_cost(req), remaining_budget); if (reserve <= 0) → 429; forward; settle on response` |

### Task 4.3: Owner alert on budget anomaly (1h)

| Field | Value |
|-------|-------|
| Owner | Claude |
| What | If single request reserves >HK$5 OR daily spend >tier × 2: Telegram alert to owner |

**🟢 Phase 4 acceptance:**
- Set test customer budget HK$0.10
- Send 5 parallel requests via proxy → no overspend, max 1 succeeds
- Set `blocked_at`, send 1 request → 429 immediate
- Embeddings request with budget 0 → 429

---

## Phase 5 — Public Endpoint Hardening (P1 for friend-beta, P0 before LIHKG) (~3 hours)

### Task 5.1: Rate limit `POST /api/orders` (REVISED from Codex)

| Field | Value |
|-------|-------|
| Owner | Claude |
| File | `cf-worker/src/handlers/orders.ts`, `wrangler.toml` |
| Approach | **CF Workers Rate Limiting binding only supports `period: 10` or `60` seconds** (Codex). So: `60s` window, `10` requests/IP. For hourly enforcement, additionally store IP+timestamp in KV. Acceptable as abuse dampening only — not fraud-grade. |
| Notes | IP rate limiting is coarse (shared IPs from carriers). Do NOT use as security gate. |

### Task 5.2: Order tracking page (optional)

Skip if time-pressed. Email is sufficient.

---

## Phase 6 — Comprehensive Pre-Launch E2E Test (HARD launch gate) (~2-3 days)

**Codex verdict:** Run 1 needed 5 attempts + Claude direct intervention. **Must succeed Marigold-only before accepting paid strangers.**

This phase reuses the 8-phase test plan from `docs/pre-launch-e2e-test-plan.md` (T1-T8) but adds **9 new gap-fillers** discovered in this review.

### Task 6.1 — Tier 3 Elite Run 2 (Marigold autonomous)

| Field | Value |
|-------|-------|
| Owner | Marigold (no Claude intervention) + User (observe) |
| What | Create new test order Tier 3 Elite via website. Marigold handles full deploy independently. |
| Acceptance | Job complete in D1, no Claude direct involvement, no manual interventions |

### Task 6.2 — Real LS Production Payment Test (G1, was in v1) (30min)

| Field | Value |
|-------|-------|
| Owner | User (pays) + Marigold (deploys) |
| Steps | (a) Set Tier 1 product price in LS to HK$1 temporarily. (b) Buy from your own card via real production checkout. (c) Verify webhook fires from real LS (not test mode). (d) Verify Phase 2 integrity check passes: variant ID matches, amount = HK$1, mode = live. (e) Marigold deploys. (f) Reset price to HK$248. |
| Acceptance | Real money flows end-to-end. Variant validation works on production webhook. |

### Task 6.3 — Bot Functional Test Post-Deploy (G2, NEW) (1h)

**Critical: Run 1 only verified deployment_success — never verified the AI actually works.**

| Field | Value |
|-------|-------|
| Owner | User (acts as customer) |
| What | After Task 6.1's deploy completes, test the bot end-to-end as a real customer would: |
| Tier 1 tests | (a) `/start` → bot greets. (b) Send "你好" → DeepSeek replies. (c) Check spend in dashboard increases. |
| Tier 2 adds | (d) Tell bot "我鍾意飲咖啡" → confirm Mem0 saved. (e) Restart conversation, ask "我鍾意飲咩？" → bot recalls. (f) Search query "today's HK weather" → SearXNG returns results. (g) Watchdog test: simulate Telegram outage, verify auto-restart. |
| Tier 3 adds | (h) Multi-agent: ask bot to "search and summarize" — verify ACPx delegates. (i) Browser test: ask bot to "open weather.gov.hk" — verify chromium loads. |
| Acceptance | All 9 functional checks pass for the deployed tier |

### Task 6.4 — Subscription Lifecycle E2E (G3, NEW) (1.5h)

**Tests Phase 2's new payment integrity code with real LS events.**

| Field | Value |
|-------|-------|
| Owner | User (LS dashboard) + Claude (verifies state) |
| Test 1 — Cancel | (a) From LS dashboard, cancel the test subscription. (b) Verify CF Worker logs receipt of `subscription_cancelled`. (c) Verify D1 customer state updated. (d) Verify VPS scheduled for cancellation per grace policy (not immediate). |
| Test 2 — Expire | (a) Wait or simulate `subscription_expired`. (b) Verify VPS cancellation actually happens. (c) Verify customer's gateway token revoked (proxy returns 401). |
| Test 3 — Refund | (a) Issue refund from LS dashboard. (b) Verify `subscription_payment_refunded` handler fires. (c) Verify customer's budget set to 0 (proxy returns 429). (d) Verify owner alert sent. |
| Test 4 — Renewal | (a) Trigger renewal payment in LS test mode. (b) Verify `subscription_payment_success` extends customer's billing period. (c) Verify NO new VPS deploy triggered (it's a renewal, not new order). |
| Test 5 — Failed renewal | (a) Simulate `subscription_payment_failed`. (b) Verify Day-0 owner alert + customer email. (c) Force forward time / manually advance state to simulate Day-3 → verify budget→0. (d) Day-7 → verify VPS cancel scheduled. |
| Acceptance | All 5 lifecycle paths produce correct state transitions |

### Task 6.5 — Failure Scenario Tests (G4, NEW) (1.5h)

| Field | Value |
|-------|-------|
| Owner | Claude (writes test scripts) + Marigold (executes) |
| Test 1 — Invalid bot token | Submit form with `123:invalidtoken` → orders.ts validateBotToken returns 400, UI shows clear error |
| Test 2 — Wrong telegram_user_id | Submit with valid bot token but wrong user_id → /start gate (Task 3.3) returns 403, blocks payment |
| Test 3 — Customer already has webhook | Submit bot that already has a webhook URL → deployer's `deleteWebhook` clears it, polling works |
| Test 4 — Deploy mid-failure | Kill Pi5 worker mid-deploy (during Phase 2 of install scripts) → restart worker → does it resume or mark failed cleanly? |
| Test 5 — Pi5 reboot during deploy | Same as 4 but reboot Pi5 → systemd recovery, idempotent state recovery |
| Test 6 — Contabo API timeout | Inject timeout in contabo_client → deployer marks job `provision_failed`, alerts owner, doesn't burn VPS |
| Test 7 — DeepSeek API outage | Mock DeepSeek 503 in proxy → returns 503 to customer with helpful message, doesn't bill them |
| Acceptance | All 7 scenarios fail gracefully with clear error states; no orphan VPS, no double-billing |

### Task 6.6 — 6-Language + Mobile Website QA (G5, NEW) (1h)

| Field | Value |
|-------|-------|
| Owner | User (manual UX) + Claude (sets up Playwright if user wants automation) |
| Mobile devices | Test on: (a) iPhone Safari (most HK users). (b) Android Chrome. (c) Desktop Chrome. |
| Languages | For each, walk through: home → pricing → onboarding form → payment redirect — in zh-HK, zh-CN, en, es, ja, ru |
| Specific checks | Form labels translated, error messages translated, LS checkout works, language switcher, footer links, OG image renders |
| Acceptance | 18 combinations (3 devices × 6 langs) all complete checkout flow without UX bugs |

### Task 6.7 — Email Deliverability Test (G6, NEW) (30min)

| Field | Value |
|-------|-------|
| Owner | User (receives emails) |
| Tests | Send confirmation email to: (a) Gmail. (b) Outlook/Hotmail. (c) Yahoo. (d) Apple iCloud. (e) Custom domain (your own). |
| Verify | All 5 land in INBOX (not spam/promotions). DKIM/SPF/DMARC pass via mail-tester.com (target score ≥9/10) |
| If failing | Adjust DNS, content, sending IP reputation. May need warmup period. |
| Acceptance | mail-tester.com score ≥9/10, all 5 inboxes receive the test email |

### Task 6.8 — Backup + Restore Drill (Codex C5, kept) (1h)

| Field | Value |
|-------|-------|
| Owner | Marigold |
| What | (a) Run scheduled backup of customer 1002. (b) Verify backup files exist on Pi5. (c) Provision a fresh VPS. (d) Restore from backup. (e) Verify Mem0 memories intact, bot responds same way |
| Acceptance | Restored bot recalls all prior memory and behaves identical to original |

### Task 6.9.5 — Launch-Day Drill (NEW from Codex Round 2) (1h)

**Codex 1.4: There's no kill switch defined.** This task creates and tests one.

| Field | Value |
|-------|-------|
| Owner | Claude + User |
| Components to build first | (a) `cf-worker` env var `ORDERS_DISABLED=false`. When `true`, `POST /api/orders` returns `503 {"error": "暫時休業，請稍後再試"}`. (b) `wrangler.toml` documents how to flip it via `wrangler kv put` or env update. (c) Website-side: `OrdersDisabled.tsx` component shown when API returns 503. (d) Maintenance page link from footer. |
| Drill scenarios | (1) Morning smoke test runbook: 5-min checklist (hit /health, hit /api/jobs/next as worker, check Pi5 systemctl, verify Telegram bot can `/start`). (2) Disable orders mid-day → verify website shows maintenance + checkout fails gracefully. (3) Re-enable + verify HK$1 test order flows through. (4) Rollback test: `wrangler rollback` Worker, `cf pages` previous deployment. |
| Files | `cf-worker/src/handlers/orders.ts`, `website-lovable/src/src/components/OrdersDisabled.tsx`, `docs/operational/launch-day-runbook.md` |
| Acceptance | Kill switch works in <60s, rollback works in <5min, both tested on production |

### Task 6.10 — Multi-Customer Isolation Test (was 6.9) (30min)

| Field | Value |
|-------|-------|
| Owner | Marigold + User (verify) |
| What | Deploy 2 test customers in parallel. Verify: (a) gateway tokens are different. (b) Customer A's spend doesn't affect Customer B's budget. (c) Customer A's bot can't access Customer B's Mem0/Qdrant data. (d) Both VPS are separate Contabo instances. |
| Acceptance | Zero cross-contamination |

**🟢 Phase 6 acceptance (the FINAL TEST):** All 9 sub-tasks pass. This is the launch gate.

---

## Phase 7 — Operational Readiness (~4 hours)

### Task 7.1: Support ledger

| Field | Value |
|-------|-------|
| Owner | User (sets up) |
| What | Google Sheet with columns: order_id, customer_email, bot_username, payment_status, deploy_status, last_contact, resolution |
| Why | Codex: "support@3nexgen.com is not enough for launch" |

### Task 7.2: Pi5 outage fallback message

| Field | Value |
|-------|-------|
| Owner | Claude |
| Files | `cf-worker/src/handlers/webhook.ts` (right after `order_created` confirmed) |
| What | Send immediate email "Payment received, setup starting, ETA 30 min. If you don't hear from us in 24h, reply to this email." |

### Task 7.3: Owner-visible "deploy delayed" state

| Field | Value |
|-------|-------|
| Owner | Claude |
| What | If deploy takes >45 min, Pi5 alerts owner. If Pi5 unreachable for >10 min during business hours, CF Worker cron pings → alert |

### Task 7.0: Customer-Facing Templates (NEW from Codex 4.4, MUST come before Phase 6)

| Field | Value |
|-------|-------|
| Owner | Claude + User (tone review) |
| Files | `~/clawd/templates/customer/` on Pi5 (synced from `docs/templates/customer/` in repo) |
| Templates | (a) `deploy_ready.md` — "你嘅 AI 已經準備好" email + bot welcome message. (b) `payment_confirmed.md` — receipt + ETA. (c) `deploy_failed.md` — apology + refund auto-issued. (d) `refund_processed.md` — confirmation. (e) `support_response_skeleton.md` — neutral helper for ad-hoc replies. (f) `bot_stopped_responding.md` — most-likely-ticket reply with troubleshooting steps. (g) `subscription_cancelled.md` — farewell + data deletion confirmation. |
| Constraint | Every customer-facing message routes through these. Marigold's tsundere voice forbidden. |
| Tone | Neutral, warm, professional 香港書面語. English versions for en-locale customers. |

### Task 7.1.5: "Bot Stopped Responding" Incident Playbook (NEW from Codex 5.2, MUST come before Phase 6)

**This will be the #1 customer ticket type. Must have playbook before any paid customer.**

| Field | Value |
|-------|-------|
| Owner | Claude (writes) + Marigold (reads, can execute) |
| File | `docs/operational/bot-stopped-responding.md` |
| Checklist (in order) | (1) Telegram bot token still valid? (Telegram `getMe`). (2) Customer accidentally blocked the bot? (Check via dashboard — last receive timestamp). (3) Long polling process running on VPS? (`systemctl --user status openclaw`). (4) Proxy auth working? (Check D1 usage record + last request). (5) Customer at 100% budget / blocked? (`nexgen_cli.py customer status`). (6) DeepSeek API outage? (Status page + recent error rate). (7) VPS disk/memory? (SSH probe). (8) Mem0/Qdrant healthy? (curl localhost:6333 from VPS). |
| Outcome paths | Each step → fix or escalate to user. End with template `bot_stopped_responding.md` reply to customer. |
| Acceptance | Marigold can walk through this playbook end-to-end during M.7 calibration |

### Task 7.4: Customer Onboarding Documentation (G7, NEW)

| Field | Value |
|-------|-------|
| Owner | Claude (writes) + User (review tone) |
| Files | New page `website-lovable/src/src/pages/GettingStarted.tsx` (link from email + bot-guide) |
| Content | After deploy completes, customer needs to know: (1) How to find your bot in Telegram (search @{username}). (2) Send `/start` to begin. (3) Try first message: "你好" / "Hello". (4) For Tier 2+: how to use memory ("記住我...") and search ("search for..."). (5) Where to view usage / pause / cancel. (6) How to contact support. (7) Refund policy summary + link. |
| Languages | At minimum zh-HK + en. Auto-translate via existing i18n flow for the 4 others. |
| Email integration | Resend template (Task 3.2) links to this page directly |

### Task 7.5: First-Week Soft-Launch Monitoring Playbook (G8, NEW)

| Field | Value |
|-------|-------|
| Owner | Claude (writes runbook) |
| File | `docs/soft-launch-monitoring-playbook.md` |
| Daily checks (5 min/day for 7 days) | (a) Dashboard: any new orders? Any failed deploys? (b) D1 query: any customers at >80% budget? (c) Telegram: any owner alerts un-acknowledged? (d) Email: any support@ unread? (e) Pi5 health: `systemctl --user status nexgen-worker` |
| Weekly check | API cost vs MRR margin, deploy success rate, customer retention |
| Red flags | Any deploy >45min, any 5xx from CF Worker, any customer at 100% budget, any chargeback event, any negative LIHKG mention |
| Escalation | What to do for each red flag — clear steps, not just "investigate" |

### Task 7.6: Refund Operational Flow (G9 part 1, NEW)

| Field | Value |
|-------|-------|
| Owner | Claude (writes SOP) |
| File | `docs/operational/refund-flow.md` |
| Process | (1) Customer requests refund via support@. (2) User logs in support ledger. (3) Decide approve/reject per refund policy (within 7 days = approve). (4) Issue refund in LS dashboard. (5) LS webhook fires `subscription_payment_refunded` → CF Worker auto-handles VPS cancel + budget-zero (per Task 2.4). (6) User confirms in ledger + sends apology/farewell email to customer. |
| Verify automation works | Refund test in Task 6.4 Test 3 covers the technical side; this doc covers the human side |

### Task 7.7: Disaster Recovery Runbook (G9 part 2, NEW)

| Field | Value |
|-------|-------|
| Owner | Claude (writes runbook) |
| File | `docs/operational/disaster-recovery.md` |
| Scenarios covered | (1) **Pi5 SD card fails** — boot replacement Pi5 from latest backup, restore systemd config, change SSH keys, resume. ETA 4h. (2) **Pi5 home internet outage >30min** — CF Worker queues jobs, Pi5 picks up when back. Customer auto-emailed delay. (3) **CF Worker outage** — Cloudflare status page, customers see static error, no new orders. Email queue retries. (4) **Contabo API outage** — manual VPS provisioning via panel, deploy via Pi5 SSH directly. (5) **DeepSeek API outage** — proxy returns 503 with customer-facing message, no charges. (6) **OpenAI embeddings outage** — Mem0 falls back to local embedding (or warns customer Tier 2+ memory paused). (7) **Customer VPS hacked** — playbook: snapshot, isolate, notify customer, offer reinstall. |
| Practice | At least scenario 1 (Pi5 SD failure) should be drilled before launch |

---

## Phase 8 — Soft Launch (Beta) (post-P0)

### Task 8.1: Beta customer recruitment (1-3 friends)
- Free or HK$50 token (loss is intentional — gathering feedback)
- Direct WhatsApp / Signal channel for them (not Telegram — bot-only there)
- Set expectation: "you may hit bugs, please report"

### Task 8.2: Monitor 7 days
- Daily dashboard check
- Watch budget burn
- Watch deploy success rate
- Collect UX feedback

### Task 8.3: HK Business Registration (parallel)
- Required before public LIHKG marketing
- HK$2,150 / 1 year

---

## Phase 9 — Public Launch (after 7-day soft launch with ≥1 successful customer)

| Task | Owner | Notes |
|------|-------|-------|
| Pentest (Strix) | Claude | After P0 + soft launch — security review on production |
| Tier token allocation enforcement | Claude | Add `monthly_tokens_used` D1 column, enforce 5M/10M/20M caps |
| LIHKG soft launch post | User | First public conversion test |
| IG account + first reel | User | Demo bot |
| Dashboard business view (Issue 15) | Claude | Internal polish |
| Marigold briefing v3 audit | Claude | Cleanup plan-era artifacts |
| SSR/SSG (SEO) | Claude | Before serious marketing push |

---

## Risk Register (Codex-augmented)

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Resend domain DNS slow (24-48h) | High | Start in Phase 0 immediately |
| LS variant IDs change between test/prod | Medium | Lock IDs in code review during Task 2.1 |
| Marigold misreads new briefing | High | Run 2 is hard gate (Phase 6) |
| Concurrent budget race | Medium | Atomic reservation (Task 4.2) |
| Telegram getUpdates conflict | Eliminated | Switched to sendMessage probe (Task 3.3) |
| Pi5 home internet outage mid-deploy | Medium | Phase 7 fallback email + delayed state |
| Customer chargeback | Medium | Phase 2 refund handling + clear ToS |
| Backup never restored = silent loss | High | Phase 6.5 restore drill |
| 3-5 day timeline unrealistic | High | Codex: revised to 5-7 days |

---

## Out of Scope for Soft Launch

- SSR/SSG → only matters when marketing starts
- Dashboard business view → internal tool
- ~40 unused shadcn components → bloat, not bug
- prefers-reduced-motion → accessibility, not blocker
- Self-host fonts → perf polish

---

## Estimated Total Effort (v4 — Codex + 9 gaps + Marigold readiness)

| Phase | Hours | Cumulative | Notes |
|-------|-------|------------|-------|
| 0 (parallel) | 30min user + 24h wait | — | Resend DNS propagation |
| 1 | 1h + 0.5h M.6 | 1.5h | Baseline + Marigold memory bootstrap |
| 2 (Payment Integrity) | 6h + 0.5h briefing | 8h | + M.4 briefing update |
| 3 (Notification + /start) | 6h + 0.5h briefing | 14.5h | + M.4 briefing update |
| 4 (Budget cap) | 5h + 0.5h briefing | 20h | + M.4 briefing update |
| 5 (Rate limit) | 3h + 0.5h briefing | 23.5h | + M.4 briefing update |
| **5.5 — Marigold Calibration (M.7)** | **1h** | **24.5h** | **CRITICAL pre-Phase-6 gate** |
| **6 (Comprehensive E2E — 9 sub-tasks)** | **12-15h over 2-3 days** | **~38h** | **The "final test"** |
| 7 (Operational + docs + M.2/M.3) | 4h + 1.5h Marigold playbook | 43h | Runbooks + Marigold daily routine |
| M.8 (audit log) | 0.5h | 43.5h | Ongoing |

**Realistic timeline: 10-14 calendar days** (was 7-10; Codex Round 2 added critical pre-Phase-0 fixes + migration safety + identity model + answer key + kill switch + customer templates + incident playbooks).

**Calendar vs person-days:** With 4-6 focused hours/day, this is 10-14 calendar days. With weekend sprint mode (8h/day), 7-10 calendar days.

### Two launch tiers (Codex Round 2 reframe — no more risky "minimum viable")

**Tier A — Friend Beta Launch (7-10 days):** Pre-Phase-0 fixes + Phases 1-7 + M.7 calibration. Suitable for 1-3 trusted customers who tolerate manual intervention and bugs. **NOT suitable for paid strangers.**

**Tier B — Public Paid Launch (Tier A + 5-7 more days):**
- Phase 9 capacity tests (queue + ETA + Contabo rate limit handling)
- Pentest (Strix)
- HK BR registration
- 7-day soft-launch soak with ≥1 successful customer
- LIHKG/IG marketing launch

**No cut line below Tier A.** Codex Round 2 explicitly rejected the previous "minimum viable" cut: skipping refund testing, multi-customer isolation, or disaster recovery is unacceptable for any paid customer.

---

## How AI Drives This

1. **User says:** "Start Phase X" or "Run Task X.Y"
2. **Claude (or Marigold):** executes, runs internal tests, reports
3. **User:** runs the user acceptance test (provided in each phase)
4. **On ✅:** advance. **On failure:** debug → retry
5. **User does NO coding** — only:
   - Provides credentials (Resend, LS secret, Contabo logins) in Phase 0
   - Confirms via clicks/browser/Telegram in acceptance tests
   - Approves phase transitions

---

## Critical Cut Lines (when forced to descope)

If timeline slips, descope in this order (keep top, drop bottom):

1. ✅ **Cannot drop:** Phase 2 (payment integrity), Phase 3.1+3.3+3.4 (start gate, notification reliability), Phase 4.1+4.2 (budget cap), Phase 6 (Run 2), Phase 7.1 (support ledger)
2. ⚠️ **Can defer with risk:** Phase 5 (rate limit) — accept abuse risk for friend-beta only
3. ⚠️ **Can defer:** Phase 3.2 (email) — replace with manual owner email for first 1-2 customers
4. 🟢 **Defer freely:** Phase 4.3 (anomaly alert), Phase 7.2-7.3 (delayed state UX), tier token enforcement
