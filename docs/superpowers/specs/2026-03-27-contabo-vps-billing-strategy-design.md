# Contabo VPS Billing & Lifecycle Strategy — Design Spec

> **Date:** 2026-03-27
> **Status:** Draft
> **Scope:** VPS provisioning billing model, churn handling, recycling pool, and cancellation automation
> **Depends on:** Customer Onboarding Pipeline (2026-03-26 spec), Plan A (CF Worker), Plan B (Pi5 Worker)
> **Modifies:** Plan B Tasks 2 (Contabo provisioning), 6 (Deployer), 7 (Main loop); CF Worker D1 schema

---

## 1. Problem Statement

Contabo uses **monthly contract billing** — not hourly like Hetzner/DigitalOcean. This creates three business risks:

1. **No prorated refunds** — a VPS paid for 30 days costs the full month even if deleted on day 2
2. **4-week cancellation notice** — on a 1-month plan, you must cancel by ~day 3 to avoid auto-renewal
3. **Auto-renewal for equal term** — forgetting to cancel means paying for another full month

Without a strategy, every churned customer bleeds at least 1 extra month of VPS cost.

### Why Contabo Despite This

- **Cheapest 8GB VPS** — ~€4.99/mo vs Hetzner CX22 ~€5.39/mo (Hetzner blocked our account scaling)
- **75 VPS limit per account** — confirmed by Contabo support, sufficient for 6+ months of growth
- **API available** — provisioning, cancellation, and (to be verified) revocation all via REST API
- **Cancellation is revocable** — confirmed by Contabo support: can undo cancellation from control panel before scheduled date

---

## 2. Core Strategy: 3-Layer Defense

### Layer 1: Pricing — Push Longer Customer Bundles

Reduce churn frequency by making multi-month bundles the obvious choice.

| Customer Plan | Monthly Price | Discount vs 1-mo | Internal Contabo Plan |
|---|---|---|---|
| 1 month | HK$248/mo | — | 1-month Contabo |
| 3 months | HK$228/mo | 8% off | 1-month Contabo |
| 6 months | HK$208/mo | 16% off | 1-month Contabo |

**Key rule:** Always use 1-month Contabo plans internally regardless of customer commitment length. This keeps the cancellation window manageable and avoids the "6-month auto-renewal" trap.

Customer prepayment for 3/6 months is collected upfront. If they churn mid-bundle, no refund (per existing policy). The remaining months are pure margin since VPS cancellation proceeds immediately.

### Layer 2: Tracking — CF Worker D1 `vps_instances` Table

New D1 table tracks every VPS through its lifecycle:

```sql
CREATE TABLE vps_instances (
  vps_id          TEXT PRIMARY KEY,       -- Contabo instance UUID
  contabo_ip      TEXT NOT NULL,
  customer_id     TEXT,                   -- T1043, NULL if recyclable
  status          TEXT NOT NULL DEFAULT 'provisioning',
    -- provisioning: being created
    -- active: customer using it
    -- cancelling: cancellation submitted, available for recycle
    -- expired: Contabo terminated it (no recycle happened)
  tier            INTEGER NOT NULL,       -- 1, 2, or 3
  contabo_plan_id TEXT,                   -- Contabo plan reference
  billing_start   TEXT NOT NULL,          -- ISO 8601
  billing_end     TEXT,                   -- current period end (NULL = unknown)
  cancel_date     TEXT,                   -- when cancellation was submitted
  cancel_deadline TEXT,                   -- date Contabo will terminate the VPS (last day to revoke)
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Daily cron** (CF Worker scheduled trigger):
- Count VPS by status
- Alert via Telegram if idle (`cancelling`) VPS count > 0 approaching cancel deadline
- Alert if total VPS cost exceeds 10% of monthly revenue
- Summary: "Active: 12, Cancelling: 3 (2 expiring in <7 days), Total cost: €XX"

### Layer 3: Recycling Pool + Auto-Cancel/Revoke

The core innovation — treat VPS as **infrastructure pool**, not per-customer assets.

#### Churn Flow (Auto-Cancel)

```
Customer churns (payment webhook / manual)
    │
    ├─ 1. Wipe customer data on VPS (OS reinstall or script)
    ├─ 2. Submit cancellation via Contabo API
    ├─ 3. Update D1: status → 'cancelling', record cancel_deadline
    ├─ 4. Notify owner via Telegram: "T1043 churned, VPS cancelling, recyclable until {date}"
    │
    └─ VPS enters recyclable pool (still running, cancellation ticking)
```

#### New Customer Flow (Recycle-First)

```
New customer payment confirmed
    │
    ├─ Check D1: any VPS with status = 'cancelling'?
    │
    ├─ YES (recyclable VPS available):
    │   ├─ 1. Revoke cancellation via Contabo API
    │   ├─ 2. OS reinstall via Contabo API
    │   ├─ 3. Update D1: status → 'active', customer_id → new customer, clear cancel fields
    │   ├─ 4. Deploy as normal (same pipeline from OS install step onward)
    │   └─ Cost: €0 extra (VPS was already paid for)
    │
    └─ NO (pool empty):
        ├─ 1. Provision fresh VPS via Contabo API
        ├─ 2. Insert into D1: status → 'provisioning' → 'active'
        ├─ 3. Deploy as normal
        └─ Cost: €4.99/mo new commitment
```

#### Cancellation Automation

**Why automate (not manual):**
At 50 customers with 20% monthly churn = 10 cancellations/month. Manual process (login panel → click cancel → confirm per VPS) is error-prone and a missed cancellation costs a full month's VPS fee. The automation is ~20 lines of code with high ROI.

**Implementation:**
```python
# On churn detection:
async def handle_churn(vps_id: str):
    contabo_api.cancel_vps(vps_id)           # Submit cancellation
    d1.update_vps(vps_id, status='cancelling', cancel_date=now())
    notifier.send(f"VPS {vps_id} cancellation submitted")

# On new customer needing VPS:
async def get_or_create_vps(tier: int) -> VPS:
    recyclable = d1.query("SELECT * FROM vps_instances WHERE status = 'cancelling' ORDER BY cancel_deadline ASC LIMIT 1")
    if recyclable:
        contabo_api.revoke_cancellation(recyclable.vps_id)  # Undo cancel
        contabo_api.reinstall_os(recyclable.vps_id)          # Fresh OS
        d1.update_vps(recyclable.vps_id, status='active', customer_id=new_customer_id)
        return recyclable
    else:
        new_vps = contabo_api.create_vps(tier)
        d1.insert_vps(new_vps)
        return new_vps
```

**Tier matching for recycling:** All tiers (1/2/3) use the same Contabo 8GB VPS spec. Any recycled VPS can serve any tier — the tier difference is in software configuration, not hardware. The deployer installs the correct tier's software stack on the recycled VPS.

**API verification required (P2 test):**
- Cancel via API → confirm works
- Revoke via API → confirm works (fallback: manual panel click)
- If revoke API fails, add manual step notification until automated

---

## 3. VPS Lifecycle State Machine

```
                    provision
                       │
                       v
    ┌──────────── provisioning ────────────┐
    │                  │                    │
    │                  v                    │
    │              active ◄────────┐       │
    │                  │           │       │
    │    churn         │    revoke +       │
    │                  v    recycle        │
    │            cancelling ───────┘       │
    │                  │                    │
    │    no recycle    │                    │
    │    within 4wk    v                    │
    │              expired                  │
    └──────────────────────────────────────┘
```

**State transitions:**
| From | To | Trigger |
|---|---|---|
| — | provisioning | New VPS created via API |
| provisioning | active | Deploy pipeline completes |
| active | cancelling | Customer churns, cancellation submitted |
| cancelling | active | New customer assigned, cancellation revoked, OS reinstalled |
| cancelling | expired | 4-week window passes, Contabo terminates |

---

## 4. Financial Model

### Per-Churn Cost Analysis

| Scenario | Cost | Likelihood |
|---|---|---|
| Churned VPS recycled within days | €0 | High (if growing) |
| Churned VPS recycled within 2 weeks | €0 | Medium |
| Churned VPS expires (no recycle in 4 weeks) | €4.99 (1 month) | Low (if growing) |

**Worst case:** All customers churn same month, no new customers. Cost = N × €4.99 for 1 extra month each. Acceptable because:
- Customer prepayment already collected (especially multi-month bundles)
- 1-month Contabo plans cap the bleed at exactly 1 extra month
- The 4-week cancellation window gives time to find recycling matches

### Break-Even Threshold

Monthly VPS cost per customer: ~€4.99 (~HK$43)
Tier 2 monthly fee: HK$248
VPS cost as % of revenue: **17%**
Idle VPS tolerance: **10% of monthly revenue** before alerting

At 20 active customers (HK$4,960/mo revenue):
- Can sustain ~2 idle VPS (€9.98 = HK$86) before hitting 10% threshold
- At 20% churn (4 customers/month), need to recycle 2+ within 4 weeks to stay under threshold

### Multi-Month Bundle Impact

| Bundle | Customer pays upfront | If churns month 2 | Your net |
|---|---|---|---|
| 1-month | HK$248 | Lost customer, cancel VPS | HK$248 - VPS costs |
| 3-month | HK$684 | Keep HK$684, cancel VPS from month 2 | HK$684 - (2mo VPS) |
| 6-month | HK$1,248 | Keep HK$1,248, cancel VPS from month 2 | HK$1,248 - (2mo VPS) |

Multi-month bundles are pure upside: customer pre-commits, you cancel VPS immediately on churn, keep the difference.

---

## 5. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Contabo API doesn't support cancellation revoke | Can't auto-recycle, must use panel | Test in P2; fallback: Telegram alert + manual panel click |
| Contabo changes billing model | Strategy assumptions break | Monitor Contabo announcements; strategy is conservative (1-month plans) |
| Mass churn event (>30% in one month) | Multiple idle VPS bleeding | Daily cron alerts; manual emergency cancellation batch |
| VPS limit hit (75 max) | Can't provision new customers | Monitor count; consider 2nd Contabo account or Hetzner fallback |
| Recycled VPS has residual customer data | Security/privacy breach | Full OS reinstall via API (not just script wipe) — confirmed as approach |
| Cancellation submitted but customer reactivates | VPS on death timer | Revoke cancellation immediately on reactivation payment |

---

## 6. Integration Points

### Changes to CF Worker (Plan A)

1. **New D1 table:** `vps_instances` (schema in Section 2)
2. **New endpoint:** `GET /api/vps/recyclable` — returns oldest cancelling VPS for recycler
3. **Daily cron handler:** VPS cost monitoring + idle alerts
4. **Churn webhook handler:** On subscription cancellation event from Lemon Squeezy, update job queue AND `vps_instances`

### Changes to Pi5 Worker (Plan B)

1. **Deployer recycling branch:** Before provisioning new VPS, check `/api/vps/recyclable`
   - If available: revoke cancellation → OS reinstall → deploy (same pipeline from SSH step)
   - If empty: provision fresh → deploy
2. **Churn handler:** New job type `churn` in queue
   - Wipe customer data (or OS reinstall)
   - Submit Contabo cancellation
   - Update `vps_instances` via PATCH
3. **Config addition:** No new config — uses existing Contabo API credentials

### Changes to Customer Onboarding Pipeline Spec

1. **Job types expanded:** Add `churn` alongside existing `deploy`, `upgrade`, `downgrade`
2. **D1 schema addition:** `vps_instances` table
3. **Lifecycle section:** Reference this spec for VPS billing details

---

## 7. Implementation Scope

### What to Build Now (Phase 0)

- `vps_instances` D1 table + CF Worker CRUD
- Deployer recycling check (one `if` branch at start of deploy)
- Auto-cancel on churn (Contabo API call + D1 update)
- Auto-revoke on recycle (Contabo API call + D1 update)
- Daily cron alert (VPS count + cost summary)

### What to Defer

- Multi-account Contabo management (not needed until 75 VPS limit approached)
- Hetzner fallback provisioning (blocked by account restriction)
- Advanced analytics dashboard (daily cron Telegram alerts sufficient for now)

---

## 8. Open Items (Verify During P2)

| Item | Test | Fallback |
|---|---|---|
| Cancel VPS via API | `POST /v1/compute/instances/{id}/cancel` | Manual panel |
| Revoke cancellation via API | Look for revoke/undo endpoint in API docs | Manual panel + Telegram alert |
| OS reinstall via API | `POST /v1/compute/instances/{id}/actions/reinstall` | SSH wipe script |
| Time from reinstall to SSH-ready | Measure during P2 test | Add polling/retry in deployer |
