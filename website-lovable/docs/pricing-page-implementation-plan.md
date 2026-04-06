# Pricing Page Redesign — Implementation Plan

> **Date:** 2026-04-05 (updated)
> **Source:** `business/pricing-strategy-v2.md`
> **Target file:** `website-lovable/src/src/pages/Pricing.tsx`
> **Status:** Plan only — no code changes yet

---

## 1. Current State

**File:** `Pricing.tsx` (325 lines)

- `tiers` array (lines 9-82): 3 tiers with old names, prices, Lemon Squeezy URLs, GPT model refs, daily limits
- State: `isAnnual` boolean toggle (line 92)
- UI: promo banner → 2-button toggle → What is OpenClaw → 3 tier cards → bottom CTA
- CTA buttons: external `<a>` to Lemon Squeezy checkout

**Index.tsx cross-refs:** Lines 440 and 612 reference old「由 HK$148/月起」

---

## 2. New Data Structure

### Tier object shape

```
{
  id: "starter" | "pro" | "elite",
  name: "基本版" | "專業版" | "旗艦版",
  subtitle: "Starter" | "Pro" | "Elite",
  tagline: string,          // 1-line marketing copy
  description: string,      // 2-3 line description
  recommended: boolean,     // true for Pro only
  pricing: {
    monthly:   { perMonth: number, total: number },
    quarterly: { perMonth: number, total: number },
    annual:    { perMonth: number, total: number },
  },
  monthlyTokens: "5M" | "10M" | "20M",
  specs: { vps: string, memory: boolean, search: boolean },
  features: {
    messaging: string,
    memory:   { has: boolean, label: string },
    search:   { has: boolean, label: string },
    recovery: { has: boolean, label: string },
    browser:  { has: boolean, label: string },
    support:  string,
  },
}
```

### Pricing values

| Tier | monthly | quarterly | annual |
|------|---------|-----------|--------|
| 基本版 | $248 / $248 | $188 / $564 | $158 / $1,896 |
| 專業版 | $398 / $398 | $298 / $894 | $248 / $2,976 |
| 旗艦版 | $598 / $598 | $458 / $1,374 | $388 / $4,656 |

### State change

Replace `isAnnual: boolean` → `billingCycle: "monthly" | "quarterly" | "annual"` default `"quarterly"`

### Billing cycle metadata

```
const billingCycles = [
  { key: "monthly",   label: "月費 (彈性)",  badge: null },
  { key: "quarterly", label: "季度 (推薦)",  badge: null },
  { key: "annual",    label: "年費 (最抵)",  badge: "最抵" },
];
```

### Savings calculation

`savings = (pricing.monthly.perMonth × cycleMonths) - pricing[cycle].total`

Annualized for display: `annualSavings = (pricing.monthly.perMonth - pricing[cycle].perMonth) × 12`

---

## 3. Section-by-Section Changes

### 3.1 Promo Banner (lines 97-101) — REMOVE
Old「首 20 位客戶安裝費半價」no longer applies. No separate install fee.

### 3.2 Header + Toggle (lines 103-134) — MODIFY
- Keep title「選擇最適合你的方案」
- Update subtitle to:「全包月費，沒有隱藏費用，沒有合約。」
- Replace 2-button toggle with **3-tab selector**, default = 季度
- 年費 tab gets「最抵」badge

### 3.3 What is OpenClaw (lines 136-161) — KEEP AS-IS

### 3.4 Tier Cards (lines 163-299) — MAJOR REWRITE

**Keep:**
- 3-column desktop / stacked mobile grid
- Pro card dominant: `md:scale-105`, primary border, `shadow-xl`
- Pro first on mobile

**Card header changes:**
- Remove emoji
- Show: `基本版 Starter` (name + subtitle)
- Show tagline below name

**Price display changes:**
- Hero number: `HK$XXX/月` (monthly equivalent for selected cycle)
- Below: total payment for cycle (「季度合計 HK$894」)
- Green savings badge for non-monthly: 「每年節省 HK$1,200」
- No install fee line (baked into monthly premium)

**Monthly tab nudge:**
- When monthly selected, show below price: 「選擇季度計劃，每年可節省高達 HK$1,200」with clickable link to switch tab

**Feature list changes:**
- REMOVE `aiModel` line (lines 248-251)
- REMOVE `dailyLimit` line (lines 278-279)
- ADD `monthlyTokens` line: 「每月 10,000,000 tokens」
- Change Tier 3 messaging to 「Telegram（更多平台即將推出）」

**CTA button changes:**
- `<a href={LS checkout}>` → `<Link to="/onboarding?tier=pro&plan=quarterly">`
- Label: 「選擇專業版」(per tier name)
- Pro = solid primary button, others = outline

### 3.5 Add Payment Methods Line
Below CTA buttons (shared): 「付款方式：信用卡 / PayMe / FPS / 銀行轉帳」

### 3.6 Bottom CTA (lines 307-318) — KEEP AS-IS

---

## 4. Deletion Checklist

| Remove | Lines | Reason |
|--------|-------|--------|
| Promo banner | 97-101 | No separate install fee |
| `emoji` in tiers | 11, 36, 60 | Names stand alone |
| `installOriginal` / `installPromo` | 13-14, 38-39, 62-63 | No install fee |
| `checkoutMonthly` / `checkoutAnnual` | 17-18, 41-42, 65-66 | → `/onboarding` |
| `features.aiModel` | 25, 48, 72 | No GPT refs |
| `features.dailyLimit` | 31, 56, 79 | → `monthlyTokens` |
| `annual` field | 15, 40, 64 | → `pricing` object |
| `popular` / `premium` | 22-23, 44-45, 69-70 | → `recommended` |
| Lemon Squeezy `<a>` | 292-295 | → `<Link>` |
| `isAnnual` state | 92 | → `billingCycle` |
| 2-button toggle | 116-132 | → 3-tab selector |

---

## 5. Cross-File Changes

### Index.tsx
- Line 440: 「由 HK$148/月起」→「由 HK$188/月起」(quarterly base price)
- Line 612: same update
- All CTA buttons linking to `/pricing` or LS checkout → `/onboarding`

---

## 6. Implementation Order

1. Define types (`BillingCycle`, tier interface)
2. Replace `tiers` data with new structure (3 cycles)
3. Replace `isAnnual` → `billingCycle` state (default `"quarterly"`)
4. Replace toggle → 3-tab selector with badges
5. Remove promo banner
6. Update card headers (remove emoji, add subtitle + tagline)
7. Rewrite price display (monthly equiv, total, annual savings, nudge)
8. Update feature list (remove aiModel/dailyLimit, add monthlyTokens)
9. Replace CTA buttons (`<Link to="/onboarding?tier=X&plan=Y">`)
10. Add payment methods line
11. Update Index.tsx price references
12. Visual QA — all 3 tabs, desktop + mobile

---

## 7. Verification

- [ ] Default tab = 季度 on page load
- [ ] Switching tabs updates all 3 cards
- [ ] Savings correct for all 9 combinations (3 tiers × 3 cycles)
- [ ] Monthly tab shows nudge to switch to quarterly
- [ ] CTA links: `/onboarding?tier=starter&plan=quarterly` etc.
- [ ] Pro card visually dominant across all tabs
- [ ] Mobile: Pro card first, tabs fit
- [ ] No remaining GPT refs, daily limits, old prices, LS URLs
- [ ] Index.tsx price refs updated
