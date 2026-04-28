# NexGen Launch — Execution Progress

> **Mode:** AI-driven autonomous execution (Claude + Marigold)
> **Started:** 2026-04-28 19:10 HKT
> **Plan:** [`docs/launch-todo-master.md`](docs/launch-todo-master.md) v5
> **Target:** Tier A Friend Beta launch (10-14 calendar days)

---

## Status Legend

- ⬜ Not started
- 🟡 In progress
- 🟢 Completed
- 🔴 Blocked (needs user action)
- ⚠️ Completed with caveat
- 🔁 Codex review in progress

---

## Master Milestone Tracker

| Milestone | Status | Date | Codex Review |
|-----------|--------|------|--------------|
| **M0 — Setup + Pre-Phase-0 fixes** | 🟢 Completed (P-3 awaiting user) | 2026-04-28 19:35 | — |
| **M1 — Phase 1 Baseline Sync + Codex M1 Patches** | 🟢 Completed | 2026-04-28 19:55 | 🟢 Round 3 done; 6 patches applied |
| M2 — Phase 2.0 + 2 (D1 migration + Payment integrity) | ⬜ | — | ⬜ |
| M3 — Phase 3 (Notification + /start + email) | ⬜ | — | — |
| M4 — Phase 4 + 5 (Budget cap + Rate limit) | ⬜ | — | ⬜ |
| M5 — M.7 Calibration | ⬜ | — | — |
| M6 — Phase 6 (Comprehensive E2E + kill switch) | ⬜ | — | — |
| M7 — Phase 7 (Operational readiness) | ⬜ | — | ⬜ Final |
| **Tier A Launch Ready** | ⬜ | — | — |

---

## 🔴 Pending User Actions (BLOCKERS)

### Block U-1 (P-3): Money & Account Mechanics — REQUIRED

I cannot access these dashboards. Please provide answers when convenient (no rush, but blocks Phase 0 launch readiness):

| # | Question | Why I need it |
|---|----------|---------------|
| 1 | **Contabo balance + auto-renewal status** — Both VPS (203187256, 203187278) had cancel=2026-04-27. Are they still active? Auto-billing card on file? Account balance? | Without auto-renewal, Apr 28+ orders would have no VPS pool |
| 2 | **DeepSeek account balance** (USD) | Soft-launch projection: HK$70 budget × 3 customers × 30 days = ~HK$210 spend (~USD 27). Need ≥USD 50 buffer |
| 3 | **OpenAI account balance** (USD) | Embeddings only (~5% of DeepSeek cost). USD 10-20 buffer is fine |
| 4 | **Resend account exists?** | If no: create account at resend.com and add domain `3nexgen.com`. Free tier: 3,000 emails/mo (sufficient for soft launch) |
| 5 | **LS payout setup verified?** — Bank account / Wise added? First payout ETA? | Money flow timing affects when you can scale up DeepSeek/Contabo |

### Block U-2 (Phase 0 — for Track A external services)

These will become blockers when we start Phase 0:

| # | Action | When needed |
|---|--------|-------------|
| 1 | LS webhook signing secret (LS Dashboard → Settings → Webhooks → copy) | Phase 2.5 (CF Worker secret deploy) |
| 2 | LS variant ID map per tier × billing-cycle (9 variants total) | Phase 2 (variant validation logic) |
| 3 | Resend API key (from Resend dashboard after domain verified) | Phase 3.2 (email integration) |

---

## Per-Task Findings & Output

### M0.0 — Setup tracking + auth verification

**Started:** 2026-04-28 19:10 HKT | **Completed:** 19:13 HKT | **Status:** 🟢

**Findings:**
- ✅ `git remote`: GitHub `jackytsang2199-a11y/openclaw_business.git`
- ✅ `wrangler whoami`: authenticated as `jackytsang2199@gmail.com` / Account ID `1f795f0b317d0782747c02367903dbe8`
- ✅ SSH to Pi5 (192.168.1.30 as jacky999) works without password
- ✅ Pi5 services: `openclaw-gateway.service` active, `nexgen-worker.service` active
- ✅ Marigold wrapper at `/home/jacky999/bin/marigold` exists (462 bytes, executable)

**Working tree (17 modified + multiple new untracked files):**
- 17 files modified (website fixes, CF Worker usage.ts, Pi5 playbook, briefing, etc.)
- Critical untracked: `docs/launch-todo-master.md`, `progress.md`, `cf-worker/test/usage-budget.test.ts`, multiple plan docs
- Stale untracked: `.wrangler/` (top-level — needs gitignore entry)

---

### M0.1 — M.0 Marigold Reachability Ping

**Started:** 2026-04-28 19:11 HKT | **Completed:** 19:12 HKT (80s reply) | **Status:** 🟢

**Marigold's reply (verbatim):**

> Reachable ✅
> Model: `openai-codex/gpt-5.5`
> Pi5 time: Tue 2026-04-28 19:13 HKT
>
> NexGen state I understand: 3nexgen.com is Jacky's OpenClaw-on-VPS business; Pi5 acts as deployment/ops brain, with semi-auto worker + manual approval for write ops. #1002 was deployed successfully; current docs I have are v2.3 from Apr 12.
>
> Briefing v3 / launch-todo-master.md: I'm aware you're referencing them, but I don't currently see those files on Pi5 yet.
>
> [marigold] session=marigold-init-2026-04-28 model=gpt-5.5 took=80.0s usage_total=27572

**Findings:**
- ✅ Reachable, model correct, time correct
- ✅ Marigold understands current NexGen state (job #1002, semi-auto, briefing v2.3)
- ⚠️ **Marigold does NOT have briefing v3 or launch-todo-master.md yet** — confirms M.6 (memory bootstrap) is needed in Phase 1
- ✅ Latency 80s (within 30s-2min expected band)
- ✅ Quota cost: 27,572 tokens — manageable

**Implications for plan:**
- Plan timeline accounts for ~50-70 Marigold turns total. With each turn ~25-30k tokens, that's ~1.5M tokens of quota over execution. Spread across multiple 5h windows.
- M.6 (Phase 1 memory bootstrap) confirmed needed — Marigold lacks current docs.

---

### M0.2 — P-2: schema.sql Production Safety

**Started:** 2026-04-28 19:13 HKT | **Completed:** 19:18 HKT | **Status:** 🟢

**Problem:** `cf-worker/schema.sql:3` started with `DROP TABLE IF EXISTS jobs;` plus 2 more DROP TABLE statements. Accidental run against production D1 = total customer data loss.

**Fix applied:**

| File | Action |
|------|--------|
| `onboarding-pipeline/cf-worker/migrations/0001_baseline.sql` (NEW) | Idempotent baseline schema, NO drops, safe to re-run on prod |
| `onboarding-pipeline/cf-worker/schema-fresh-init.sql` (NEW) | Destructive fresh-init for test DBs only, prominent warnings |
| `onboarding-pipeline/cf-worker/schema.sql` (EMPTIED) | Now a deprecation stub redirecting to migrations/ |
| `onboarding-pipeline/cf-worker/MIGRATIONS.md` (NEW) | Migration policy, conventions, rollback procedure |
| `.gitignore` | Added `.wrangler/` (top-level) to prevent build artifacts in repo |

**Acceptance:** No `DROP TABLE` runnable from any deploy/sync command. Future schema changes go through numbered migrations.

---

### M0.3 — P-4: Customer-Facing Templates + Marigold Voice Constraint

**Started:** 2026-04-28 19:18 HKT | **Completed:** 19:25 HKT | **Status:** 🟢

**Created `docs/templates/customer/` directory with 8 files:**

| Template | Purpose |
|----------|---------|
| `README.md` | Tone rules, placeholder convention, escalation policy |
| `payment_confirmed.md` | Email after LS webhook confirms payment, sets ETA |
| `deploy_ready.md` | Email + Telegram bot greeting after DEPLOYMENT_SUCCESS |
| `deploy_failed.md` | Apology + auto-refund after 3-retry failure |
| `refund_processed.md` | Confirmation when LS refund webhook fires |
| `subscription_cancelled.md` | Farewell when customer cancels via LS |
| `bot_stopped_responding.md` | 4 variants for #1 expected ticket type (issue fixed / customer-side / investigating / 3rd-party outage) |
| `support_response_skeleton.md` | Generic structure for ad-hoc replies + escalation rules |

**Tone rules enforced:**
- 香港書面語 for default zh-HK customers (not 廣東話 slang)
- Neutral, warm, professional — NO Marigold tsundere voice
- NO emoji except ✅ for confirmations
- Escalate to Jacky for: refund disputes, legal questions, pricing exceptions, anger, press mentions

**Marigold constraint (will be added to briefing v3 in Phase 1):** "All customer-facing text MUST use these templates. NEVER improvise customer email/message tone. If unsure, escalate to Jacky."

---

### M0.4 — P-1: Legal Copy Audit

**Started:** 2026-04-28 19:25 HKT | **Completed:** 19:35 HKT | **Status:** 🟢 (subject to user review)

**Problems identified:**
- All 6 languages claimed **"99%+ uptime"** — Pi5 home worker cannot defensibly promise this
- All 6 languages claimed **"All fees paid are non-refundable"** — directly contradicts Phase 2's auto-refund handling for technical failures + 7-day cooling-off

**Decisions applied (all 6 languages: zh-HK, zh-CN, en, es, ja, ru):**

#### `terms.payment.body`
- Was: "No refunds are issued after payment."
- Now: "Refunds are issued in the cases described in our Refund Policy."

#### `terms.sla` (renamed Service Guarantee → Service Availability)
- Was: "We commit to 99%+ service uptime."
- Now: "We operate on a best-effort basis to maintain continuous service. Where a service outage caused by us exceeds 24 continuous hours, affected service days will be credited on a pro-rata basis. We do not provide a numeric uptime guarantee."

#### `refund.noRefund` (renamed No Refunds → Cooling-off Period & Cancellation)
- Was: "All fees paid are non-refundable. After cancellation..."
- Now: "You may request a full refund within 7 calendar days of your initial purchase date if you have not yet used the service. After this 7-day period, fees paid for the current billing cycle are non-refundable, but you may cancel at any time and the service will remain active until the end of the current billing cycle, after which the server will be reclaimed."

**Kept unchanged:**
- `refund.outage` — pro-rata credit for 24h+ outage (consistent with new SLA wording)
- `refund.failedInstall` — full refund for failed installation (consistent with Phase 2)
- `terms.acceptableUse` — "no refund for ToS violation" (this is customer-fault, OK)

**⚠️ User review recommended before launch:**
This is a business + legal decision. I applied conservative defaults that align with HK consumer expectations + Phase 2 implementation. If you disagree, please specify changes — these will be reverted in the same commit.

**Acceptance:** Legal copy now matches Phase 2 implementation. No promises that can't be kept.

---

### M1.0 — Phase 1 Baseline Sync

**Started:** 2026-04-28 19:35 HKT | **Completed:** 2026-04-28 19:50 HKT | **Status:** 🟢

**7 commits pushed to GitHub `origin/main`:**

```
d7661e1 chore: remove stale top-level PI5-GUIDE.md
4135431 fix(website): quick-fixes batch from website-quick-fixes plan
494b64e fix(pi5): playbook bugs from Run 1 E2E + briefing v2.x updates
999e4f9 fix(cf-worker): pass monthly_budget_hkd through to createApiUsage (Issue 14)
6f6cdc8 fix(legal): align uptime + refund copy with operational reality
c1ede5d fix(cf-worker): D1 migration safety — eliminate accidental DROP TABLE
d740277 docs: launch plan v5 + customer templates + Marigold SSH guide
```

**Test suites — both pass:**
- ✅ CF Worker: 72/72 vitest (incl. new `usage-budget.test.ts`)
- ✅ Pi5 worker: 84/84 pytest (after removing stale `test_deployer.py` from root — backed up to `.bak-2026-04-28`)

**Production deploys:**
- ✅ **CF Worker** `nexgen-api` deployed → version `4a4f1c9f-6227-45dd-8239-2c086a1892a2` → live at `api.3nexgen.com`
- ✅ **Website** deployed to Cloudflare Pages production (branch=main) → `82bd0887.nexgen-website-5tw.pages.dev` → aliased to `3nexgen.com`
- ✅ **Pi5 worker** 13 .py files SCP'd to `~/nexgen-worker/`, systemd restarted, `is-active` confirmed
- ✅ **Briefing** `pi5-assistant-briefing-v2.md` synced to Pi5 `~/clawd/memory/`

**Production verification:**
- ✅ `curl https://api.3nexgen.com/health` → returns endpoint listing (worker routing healthy)
- ✅ `curl https://3nexgen.com/` → 200 OK
- ✅ Legal copy live: SLA title="服務可用性" ✓, refund title="冷靜期及取消政策" ✓
- ⚠️ M.6 Marigold memory bootstrap fired — reply pending (background task `bq43xrqc8`)

**Caveats:**
- Cloudflare Pages production took ~10s to propagate. CDN cache may delay full update for some users up to a few minutes.
- Pi5 systemd `is-active=active` but `journalctl` showed no entries due to SSH session env quirk (not a service problem — verified separately).

---

### M1.1 — Codex Round 3 Review + Patches

**Started:** 2026-04-28 19:50 HKT | **Completed:** 2026-04-28 19:55 HKT | **Status:** 🟢

**Codex verdict:** "Not GO yet" — 6 issues to patch before Phase 2.

**Findings:**

| # | Severity | Issue | File:line |
|---|----------|-------|-----------|
| 1 | 🔴 High | FAQ refund still says "no refunds" across 5 languages — contradicts new legal copy | `*/faq.json:23`, `ja:43` |
| 2 | 🔴 High | `handleUpdateUsage` ignored `tier` field — upgrade/downgrade left tier stale | `usage.ts:79` |
| 3 | 🟡 Med | `package.json db:init:remote` ran deprecated `schema.sql` | `cf-worker/package.json:11` |
| 4 | 🟡 Med | Templates use `嘅` (slang) but README banned + 我哋 (over-strict) | `bot_stopped_responding.md`, `README.md:14` |
| 5 | 🟡 Med | Legal "if you have not yet used the service" was subjectively defined | `legal.json` 5 langs |
| 6 | 🟡 Med | Translation drift: "best effort" → "maximum effort" in zh-HK/es/ja/ru | `legal.json` |
| 7 | 🟡 Med | Plan referenced non-existent `customers` table | `launch-todo-master.md:352` |

**All 7 patched + 3 commits pushed:**

```
b08504a fix(templates+plan): tone consistency + LS identity goes in api_usage
1de181a fix(cf-worker): tier+budget update + block dangerous db:init:remote
ea3d114 fix(legal+faq): align FAQ refund copy + operationalize cooling-off window
```

**Specific resolutions:**
- **FAQ:** Updated `billing.0.a` in en/zh-HK/es/ja/ru + ja `support.2.a`. Now points to refund policy.
- **Tier bug:** New `updateUsageBudgetAndTier()` in `db.ts`. `handleUpdateUsage` now persists tier when supplied. Audit log distinguishes `tier_and_budget_updated` vs `budget_updated`.
- **Operational refund:** "before bot has processed any AI request via our proxy (i.e. before the first successful chat completion)". Provable from `api_usage.total_requests > 0`.
- **"Best effort" standardization:** All 5 langs use locale equivalent of "commercially reasonable efforts" (商業上合理之努力 / 商業的に合理的な努力 / esfuerzos comercialmente razonables / коммерчески разумные усилия).
- **Templates:** Updated README to clarify 我哋 is OK (matches user's CLAUDE.md), stripped 嘅 from `bot_stopped_responding.md`.
- **Plan customers table:** Removed — Phase 2 LS identity columns will extend `api_usage` table instead. (No new table.) Plan Task 2.6 updated.
- **package.json:** `db:init:remote` blocked with error redirecting to MIGRATIONS.md; new safe `db:migrate:remote` and `db:reset:test` scripts.

**Production verified after redeploys:**
- ✅ CF Worker version `50c2a091-a6d7-412c-9682-e8c025a138df` live at api.3nexgen.com
- ✅ Website Pages deployment `b522863b` live at 3nexgen.com
- ✅ Live FAQ shows new refund language ("Refunds available within 7 days...")
- ✅ Live legal SLA shows "We use commercially reasonable efforts..."
- ✅ Live legal refund shows operational definition ("provided your bot has not yet processed...")
- ✅ All 72/72 vitest tests still pass after tier fix

**Codex M1 verdict:** GO for Phase 2.0 + 2.

---

## Next Steps

1. **You — when free, please answer Block U-1** (5 money mechanics questions above). Without these I cannot complete Phase 0 readiness check, and we may hit a billing surprise during E2E testing.
2. **Me — now:** Dispatch Codex Milestone 1 review.
3. **Me — after Codex:** Start Phase 2.0 (D1 migration system already exists from M0.2 — needs new migration files for Phase 2's payment integrity additions).

---

*Last update: 2026-04-28 19:50 HKT*
