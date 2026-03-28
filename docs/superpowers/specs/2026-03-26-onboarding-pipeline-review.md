# Design Spec Review: Customer Onboarding Pipeline

## Review Round 2 — Post-Fix Verification

Re-reviewed the updated spec against all 25 original findings + your assessment notes.

---

## Fix Verification — What was fixed correctly

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| 1 | Worker API unauthenticated | **FIXED** | Line 50: "All Pi5 endpoints require X-Worker-Token header" |
| 2 | Qdrant/SearXNG bind 0.0.0.0 | **Correctly deferred** | Your assessment: install script bug, not spec. Agreed — fix in 05/07 scripts. |
| 3 | Lemon Squeezy tier tamper | **FIXED** | Line 384: "Tier is derived server-side from `variant_id` — never trust client metadata". Lines 394-397: VARIANT_TIER_MAP in Worker env vars. |
| 4 | Webhook deduplication | **FIXED** | Line 183: `lemon_squeezy_order_id TEXT UNIQUE` in schema. |
| 5 | Churn archive API keys | **FIXED** | Lines 474-481: Only archives Qdrant, Mem0, openclaw.json, soul.md. Explicit comment: "client.env and .env are NOT archived". |
| 6 | Retry count contradiction | **FIXED** | Line 334: "Agent retries once per script (2 attempts total, per CLAUDE.md playbook)". Line 553 also aligned. |
| 7 | Bot pool vs .env model | **Correctly deferred** | Your assessment: spec is the newer model, CLAUDE.md playbook needs updating. Agreed. |
| 9 | Bot assigned before VPS — no compensation | **FIXED** | Lines 336-339: On failure, bot returned to pool, display name reset, customer messaged, your OpenClaw notified. |
| 10 | No customer communication on failure | **FIXED** | Line 337: Customer gets "We're experiencing a delay" message with support contact info. |
| 11 | SSH StrictHostKeyChecking | **Correctly deferred** | Your assessment: negligible risk for Phase 0-1 on brand-new VPSes. Agreed — defer to Phase 2. |
| 12 | Schema gaps (re_queue_count, stale, CF Queue) | **PARTIALLY FIXED** | Line 186: `re_queue_count INTEGER DEFAULT 0` added. See remaining issues below. |
| 13 | Gate checks not tier-aware | **FIXED** | Lines 316-318: "Gate checks skip Qdrant/SearXNG/Mem0 checks for Tier 1. Agent reads tier-config.yaml to determine applicable QA checks." |
| 16 | FPS confirm lacks payment reference | **FIXED** | Lines 43-44: `/api/confirm` now requires `{id, amount_hkd, payment_method, reference}`. |
| 21 | HK timezone absent | **FIXED** | Line 200: "All timestamps stored in UTC. Churn events evaluated in Asia/Hong_Kong timezone. Customer-facing messages display HKT." |
| 22 | Stale threshold vs Contabo fraud check | **FIXED** | Line 547 note + Line 698: "Place first order manually to clear fraud check before go-live." |

---

## Remaining Issues — Still in the spec

### Still present from Round 1

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 12a | `stale` missing from job lifecycle diagram | **NOT FIXED** | Lines 530-536 show: ready → provisioning → installing → qa → complete → failed. No `stale` state transition shown. The stale cleanup is described in prose (line 562) but the lifecycle diagram doesn't include it. |
| 12b | "CF Queue" terminology error | **NOT FIXED** | Line 557: "CF Queue holds orders" and Line 700: "CF Queue holds orders." Should be "CF D1" — there is no CF Queue component in this architecture. |
| 14 | Chromium naming conflict | **NOT FIXED** | Line 240: script named `11-setup-chromium.sh`, Line 240: description says "Google Chrome headless". Pick one — either rename the script to `11-setup-chrome.sh` or change description to "Chromium headless". |
| 15 | Brand name mismatch (ClawHK vs NexGen) | **Deferred** | Separate task per your assessment. Root CLAUDE.md still says "ClawHK / 蟹助手". |
| 18 | Reactivation doesn't verify bot exists | **NOT ADDRESSED** | Section 11 line 492 assumes "Same bot username still works". If bot was deleted via BotFather during 90-day archive, setWebhook will fail. Add: "Verify bot exists via getMe. If deleted, assign new bot from pool." |
| 20 | `target_tier` field — your assessment says it IS used | **DOCUMENTATION GAP** | You're right that upgrade/downgrade jobs need it. But Section 10 never references the D1 field. The upgrade flow (line 417) says "SSH into existing VPS, run enable scripts" — it reads {FROM} and {TO} from... where? Should explicitly state: "Read `tier` and `target_tier` from D1 job record." |

### New issue found in Round 2

| # | Issue | Location |
|---|-------|----------|
| 26 | **Deploy failed notification says "3x"** | Line 589: `"T1043 failed — script 07 failed 3x"` but retry policy is 2 attempts total (line 334). Notification template contradicts the fix for issue #6. Should say "2x" or "failed after retry". |

---

## Deferred tasks tracker (not spec fixes)

These were correctly identified as separate tasks. Tracking here for completeness:

| Task | Owner doc | Status |
|------|-----------|--------|
| Fix Docker bind addresses in install scripts (05, 07) | Install scripts | Not started |
| Update root CLAUDE.md branding to NexGen | CLAUDE.md | Not started |
| Update CLAUDE.md playbook for bot-pool model | CLAUDE.md playbook | Not started |
| Drop VPN from VPS tiers in business plan | Business plan | Not started |
| First Contabo order — manual pre-work | Pre-work checklist | Not started |
| SSH host key pinning | Phase 2 | Deferred |
| Bot pool as API (multi-worker) | Phase 2 | Deferred |
| WhatsApp removal from business plan | Business plan | Not started |

---

## Verdict

**15 of 25 issues fixed or correctly deferred.** The critical security issues (#1, #3, #4, #5) and the operational gaps (#9, #10, #13) are all resolved. The spec is in good shape for implementation planning.

**6 items need quick fixes before the spec is final:**

1. Add `stale` transitions to the job lifecycle diagram (Section 13)
2. Replace "CF Queue" with "CF D1" on lines 557 and 700
3. Fix Chromium/Chrome naming inconsistency (line 240)
4. Add bot existence check to reactivation flow (Section 11)
5. Document `target_tier` usage in Section 10 upgrade/downgrade flow
6. Fix "3x" → "2x" in deploy failed notification template (line 589)

All 6 are minor — 10 minutes of editing. No architectural changes needed.
