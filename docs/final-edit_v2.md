# Final Edit v2 — Pending Website Edits

Collected edit requests that are **not yet executed**. Each entry describes the change, location, and rationale.

---

## Edit 1: Show order number on payment confirmation screen

**Status:** Pending
**Page:** Onboarding — `submitted=true` confirmation screen ("資料已確認")
**Component:** `website-lovable/src/src/pages/Onboarding.tsx` (the `if (submitted)` branch around line 192)

### Current behavior
After form submission the screen shows:
- ✓ icon
- "資料已確認" title
- Selected plan label (e.g. 專業版 — 季度 HK$298/月)
- Payment method buttons

There is **no order number displayed**. The order ID is already stored in React state (`orderId` from `setOrderId(newOrderId)`) and in sessionStorage, but it is never rendered in the UI.

### Required change
Display the order number prominently on the confirmation screen so users can:
1. Reference it in support tickets
2. Verify their order was created before paying
3. Trust that the form submission did something backend-side

Suggested copy (zh-HK):
```
你的訂單號碼：#1002
請保留此號碼以便跟進
```

### Files to edit
- `website-lovable/src/src/pages/Onboarding.tsx` — add `{orderId && <p>...</p>}` block inside the `if (submitted)` return
- `website-lovable/src/public/locales/{lang}/onboarding.json` — add i18n keys `payment.orderNumber` and `payment.orderNumberHint` for all 6 languages (zh-HK, zh-CN, en, es, ja, ru)

### Rationale
Discovered during 2026-04-11 E2E test prep: user submitted the form successfully but had no visible confirmation that a D1 job was created, causing uncertainty before clicking "Pay with Card". The order number is the only indicator that the backend call succeeded.

### Action
**DO NOT execute yet.** Add to the batch for next website deploy cycle.

---

## Edit 2: Marigold briefing has plan-era artifacts, needs production cleanup

**Status:** Pending
**File:** `docs/pi5-assistant-briefing-v2.md` (also synced to `jacky999@192.168.1.30:~/clawd/memory/pi5-assistant-briefing-v2.md`)

### Observed issue
During the 2026-04-11 semi-auto E2E test, Marigold was asked to handle a new order #1002. She correctly followed the flow (read-only check → suggest VPS → wait for approval) but her suggestion included:

> "但要先去 Contabo panel 撤銷取消。
> 👉 https://my.contabo.com/compute
> 撤銷咗之後話我知，我幫你 run deploy 指令。"

This instruction is **unconditional**. It tells Jacky to always click "Undo cancellation" in the Contabo panel before every deploy. In reality:

1. The target VPS may **already be revoked** (as was the case in this test — Jacky had done it earlier during setup, cancelDate was already `null` at Contabo).
2. `contabo-revoke.sh` already verifies the current state and succeeds immediately if `cancelDate=null` — the script does NOT attempt a new revoke.
3. Marigold has no instruction to **verify Contabo's live state first** before asking Jacky to do manual work.

The result: Marigold asks Jacky to do unnecessary clicks, and the briefing reads as if "manual revoke" is a hard prerequisite rather than a conditional one.

### Root cause
Lines 147-161 of the briefing (the "Recycling Flow — MANUAL REVOKE REQUIRED" section) are written as a general rule without a verification-first step. They were drafted before `contabo-revoke.sh` was updated to the verify-only pattern (2026-04-06), and the briefing wasn't re-aligned.

### Required changes
Rewrite the recycling flow section to:

1. **Always verify Contabo state first** — Marigold should know how to query the Contabo API (via `contabo-auth.sh` then curl to `/v1/compute/instances/{id}`) and check `cancelDate`.
2. **Conditional manual revoke** — only ask Jacky to click "Undo cancellation" if `cancelDate` is non-null.
3. **Document the script's actual behavior** — `contabo-revoke.sh` is a *verifier*, not a revoker. The briefing should say so explicitly so Marigold doesn't misrepresent what will happen.
4. **Review the whole briefing** for any other plan-era language that no longer matches production behavior (the briefing was written alongside the design spec and may contain other drift).

### How to find other drift
SSH into Pi5, diff `~/clawd/memory/pi5-assistant-briefing-v2.md` against the actual codebase behavior:
- `grep -n 'manual\|revoke\|notify-only\|do NOT' docs/pi5-assistant-briefing-v2.md` — find every assertion about system behavior
- For each, verify against the live code in `onboarding-pipeline/pi5-worker/` and `onboarding-pipeline/cf-worker/src/`
- Note divergences, fix in the briefing, SCP to Pi5

### Files to edit
- `docs/pi5-assistant-briefing-v2.md` (primary)
- Pi5 copy at `~/clawd/memory/pi5-assistant-briefing-v2.md` (sync via scp after local edit)
- Optionally: add a note to `active.md` about briefing drift as a class of bug to watch for

### Rationale
Discovered 2026-04-11 semi-auto E2E test. This is a briefing-quality issue, not a code bug — the pipeline worked correctly, but Marigold's suggestion to Jacky was based on outdated mental model. In production, unnecessary manual steps erode trust in the operator workflow and waste Jacky's time.

### Action
**DO NOT execute yet.** Do the full briefing audit after the E2E test completes, in one pass, to avoid stop-start mid-deployment.

---

## Edit 3: Marigold cannot see Contabo live state — blind VPS selection

**Status:** Pending
**File:** `docs/pi5-assistant-briefing-v2.md` + optionally `onboarding-pipeline/pi5-worker/dashboard.py`

### Observed issue
During 2026-04-12 E2E retry, Marigold was asked to pick a VPS for deploy. Her response:

> "兩個喺本地 DB 都係 cancelling，冇分別。我唔知邊個真係撤銷咗。"

She's right — she has **no visibility** into Contabo's live state. The D1 database only tracks what the pipeline has written, not what Contabo's API reports. Both VPS showed `cancelling` in D1 even though both had their cancellations revoked hours earlier.

Marigold has the *tools* on disk to query Contabo (`~/openclaw_install/provision/contabo-auth.sh` + curl), but the briefing never teaches her how to use them for pre-deploy checks.

### What Marigold can see today

| Tool | Shows | Blind spots |
|------|-------|-------------|
| `nexgen_cli.py pool` | D1 cancelling VPS: ID, IP, deadline, reinstalls | No Contabo live state |
| `nexgen_cli.py status` | Dashboard + SSH probes of **active** VPS only | Doesn't probe cancelling VPS |
| `cat ~/nexgen-dashboard.md` | Same as status, 15-min cache | Stale |

### What Marigold SHOULD be able to see

| Info | Source | Why it matters |
|------|--------|----------------|
| Contabo `cancelDate` (null = revoked, non-null = still cancelled) | Contabo API GET | Knows which VPS is ready to recycle without guessing |
| Contabo `status` (running/stopped/reinstalling) | Contabo API GET | Knows if a VPS is mid-reinstall or offline |
| SSH reachability of cancelling VPS | SSH probe | Knows if `deploy@` user exists and is accessible |
| Cloud-init status | SSH → `cloud-init status` | Detects failed provisioning (no deploy user, etc.) |

### Required changes — two options

**Option A (minimal): Briefing-only fix**
Add a "VPS Pre-flight Check" section to the briefing that teaches Marigold how to query Contabo live state:

```bash
# Query all VPS live state from Contabo
cd ~/openclaw_install/provision && \
TOKEN=$(bash contabo-auth.sh) && \
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "x-request-id: $(python3 -c 'import uuid; print(uuid.uuid4())')" \
  'https://api.contabo.com/v1/compute/instances?size=20' | \
python3 -c 'import json,sys; d=json.load(sys.stdin); \
[print(i["instanceId"], i.get("ipConfig",{}).get("v4",{}).get("ip","?"), \
i["status"], "cancel="+str(i.get("cancelDate"))) for i in d.get("data",[])]'
```

Briefing tells Marigold: "Before recommending a VPS for deploy, run this command and report the live Contabo state to Jacky."

**Option B (better UX): Add Contabo live query to `nexgen_cli.py pool`**
Enhance the `pool` command to query Contabo API alongside D1, showing both:
```
Recyclable Pool:
  203187256 | 161.97.88.8   | D1:cancelling | Contabo:running, cancel=None ✅ ready
  203187278 | 161.97.82.155 | D1:cancelling | Contabo:running, cancel=2026-04-27 ⚠️ not revoked
```

This gives Marigold accurate info without needing to memorize curl commands. Requires: Contabo auth in Pi5 .env (already present), new method in api_client or direct curl in CLI.

### Recommendation
Option B is worth the 30 min of code. In production with 20 VPS, Marigold querying Contabo via raw curl on every pool check is error-prone and slow. A single `nexgen_cli.py pool` that shows live state is operator-friendly.

### Files to edit
- `onboarding-pipeline/pi5-worker/nexgen_cli.py` — enhance `handle_pool` with Contabo query
- `onboarding-pipeline/pi5-worker/api_client.py` or new `contabo_client.py` — Contabo API wrapper
- `docs/pi5-assistant-briefing-v2.md` — add pre-deploy check section regardless of code changes
- Pi5 copy synced via scp

### Action
**DO NOT execute yet.** Add to the batch after E2E test completes.
