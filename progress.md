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
| **M0 — Setup + Pre-Phase-0 fixes** | 🟢 Completed (P-3 awaiting user) | 2026-04-28 | — |
| M1 — Phase 0 + 1 (External services + Baseline sync) | 🟡 Phase 1 ready to start | — | ⬜ |
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

## Codex Review Queue

After Phase 1 baseline sync ships, I will dispatch Codex Round 3 to review:
1. Pre-Phase-0 fixes (P-1, P-2, P-4) — did the autonomous decisions hold?
2. Phase 1 baseline sync (commits + deploys) — any regressions visible?

This becomes the **Milestone 1 review**.

---

## Next Steps

1. **You (when free):** Answer Block U-1 (money mechanics, 5 questions). Reply in chat or update progress.md directly.
2. **Me (now):** Proceed with Phase 1 baseline sync — commit 17+ files into logical groups, push to GitHub, build + deploy CF Worker, build + deploy website, SCP latest pi5-worker code, restart Pi5 systemd, run test suites. **Reversible** via `git revert`, `wrangler rollback`, CF Pages rollback button.
3. **Then:** Codex review Milestone 1. Then Phase 2.0 + 2.

---

*Last update: 2026-04-28 19:35 HKT*
