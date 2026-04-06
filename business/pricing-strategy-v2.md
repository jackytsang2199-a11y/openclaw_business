# NexGen Pricing Strategy v2

> **Date:** 2026-04-04
> **Status:** Draft for review
> **Replaces:** pricing-analysis.md (v1 pricing)
> **Objective:** Higher prices, 4 billing cycles, push 2-month minimum, decoy-effect optimized

---

## 1. New Tier Names

The current names (新手上路, 智能管家, 全能大師) feel informal and emoji-dependent. The new names follow the pattern used by professional HK SaaS products: a strong Chinese name paired with an English subtitle, conveying clear progression in capability.

| Tier | New Name | English Subtitle | Rationale |
|------|----------|------------------|-----------|
| Tier 1 (Decoy) | **基本版** | Starter | Clean, immediately understood. Deliberately plain — signals "this is the bare minimum." No aspirational language. |
| Tier 2 (Hero) | **專業版** | Pro | The most universally recognized upgrade name in HK tech. Connotes competence, reliability, and serious usage. |
| Tier 3 (Premium) | **旗艦版** | Elite | 旗艦 (flagship) is widely used in HK for top-tier products (phones, cars, plans). Signals "the best we offer" without being flippant. |

**Why these work:**
- They mirror naming patterns HK users already know: 基本/專業/旗艦 appears on HSBC, HKT, CMHK, and most local subscription services.
- No emoji dependency — the names carry weight on their own.
- Clear hierarchy: basic < professional < flagship.
- English subtitles (Starter / Pro / Elite) work for any bilingual marketing materials.

---

## 2. Pricing Table — 4 Billing Cycles

### Design Principles
1. **Monthly is the decoy** — priced high enough to feel punishing, making 2-month the obvious choice.
2. **2-month is the anchor** — this is the minimum viable plan (matches Contabo's 2-month lock-in). Moderate discount makes it feel like the smart, low-commitment option.
3. **6-month rewards commitment** — meaningful savings for customers willing to plan ahead.
4. **Annual is the best deal** — highest total savings, lowest monthly equivalent. Attracts power users and reduces churn.

### Price Increases vs Current

The current pricing undersells the value (Tier 2 at HK$248/mo has 73% margin but positions below ChatGPT Plus + VPS cost). New pricing increases monthly rates by 20-30% and uses billing cycle discounts to steer customers toward longer commitments.

---

### 基本版 Starter

| Billing Cycle | Monthly Equiv. | Total Payment | vs Monthly | Annual Savings |
|---------------|---------------|---------------|------------|---------------|
| **月費 (彈性)** | **HK$248/月** | HK$248 | -- | -- |
| **季度 (推薦)** | **HK$188/月** | **HK$564** | 76折 | **節省 HK$720/年** |
| **年費 (最抵)** | **HK$158/月** | **HK$1,896** | 64折 | **節省 HK$1,080/年** |

**Cost basis:** ~HK$65/mo | **Margin at quarterly:** HK$123/mo (65%) | **Margin at annual:** HK$93/mo (59%)

---

### 專業版 Pro — 推薦

| Billing Cycle | Monthly Equiv. | Total Payment | vs Monthly | Annual Savings |
|---------------|---------------|---------------|------------|---------------|
| **月費 (彈性)** | **HK$398/月** | HK$398 | -- | -- |
| **季度 (推薦)** | **HK$298/月** | **HK$894** | 75折 | **節省 HK$1,200/年** |
| **年費 (最抵)** | **HK$248/月** | **HK$2,976** | 62折 | **節省 HK$1,800/年** |

**Cost basis:** ~HK$70/mo | **Margin at quarterly:** HK$228/mo (77%) | **Margin at annual:** HK$178/mo (72%)

---

### 旗艦版 Elite

| Billing Cycle | Monthly Equiv. | Total Payment | vs Monthly | Annual Savings |
|---------------|---------------|---------------|------------|---------------|
| **月費 (彈性)** | **HK$598/月** | HK$598 | -- | -- |
| **季度 (推薦)** | **HK$458/月** | **HK$1,374** | 77折 | **節省 HK$1,680/年** |
| **年費 (最抵)** | **HK$388/月** | **HK$4,656** | 65折 | **節省 HK$2,520/年** |

**Cost basis:** ~HK$95/mo | **Margin at quarterly:** HK$363/mo (79%) | **Margin at annual:** HK$293/mo (76%)

---

### Price Summary

| Tier | v1 Monthly | v2 Monthly | v2 Quarterly | v2 Annual | Monthly→Quarterly Gap |
|------|-----------|-----------|-------------|-----------|----------------------|
| 基本版 | HK$148 | **HK$248** | **HK$188** | **HK$158** | -24% (HK$60/mo) |
| 專業版 | HK$248 | **HK$398** | **HK$298** | **HK$248** | -25% (HK$100/mo) |
| 旗艦版 | HK$388 | **HK$598** | **HK$458** | **HK$388** | -23% (HK$140/mo) |

### No Separate Install Fee

Install cost is baked into the monthly premium. No install fee line item anywhere.
- Monthly customers pay the premium rate — covers our amortized install cost + flexibility.
- Quarterly/annual customers pay the real price — install cost absorbed by longer commitment.
- **If monthly customer cancels after 1 month:** 專業版 collected $398, VPS cost = $124 (2-month Contabo lock). Profit = $274. Still healthy.

### Marketing Savings Display

Show annualized savings prominently on each card — these are the numbers that make customers think twice:

| Tier | Quarterly vs Monthly | Annual vs Monthly |
|------|---------------------|------------------|
| 基本版 | 節省 HK$720/年 | 節省 HK$1,080/年 |
| 專業版 | **節省 HK$1,200/年** | **節省 HK$1,800/年** |
| 旗艦版 | 節省 HK$1,680/年 | 節省 HK$2,520/年 |

**Copy for billing cycle tabs:**
- 月費 (彈性)：「靈活彈性，隨時取消」
- 季度 (推薦)：「每年節省高達 HK$1,680 — 大部分客戶選擇此計劃」
- 年費 (最抵)：「最低月費 + 全年最佳價值 — 每年節省高達 HK$2,520」

**Nudge copy on monthly tab:**
> 「選擇季度計劃，每年可節省高達 HK$1,200 — 立即切換」(with clickable link to switch tab)

---

## 3. Installation Fee Strategy

### Rule: 免安裝費 for All Plans Except Monthly

| Billing Cycle | 安裝費 | Rationale |
|---------------|--------|-----------|
| **月費 (彈性)** | Full price (基本 $400 / 專業 $800 / 旗艦 $1,600) | Commitment signal — monthly is the flexible/expensive option |
| **雙月優惠** | **免安裝費** | Minimum viable commitment = free install |
| **半年計劃** | **免安裝費** | Reward longer commitment |
| **年費計劃** | **免安裝費** | Best deal overall |

**Display:** Each pricing card should prominently show「✅ 免安裝費」for 2-month+ plans. For monthly, show the install fee with a note:「選擇雙月或以上計劃即可免安裝費」— nudging them toward longer plans.

**No refunds, no deposits.** All plans prepaid. Service stops at end of billing cycle upon cancellation.

---

## 4. Visual Pricing Page Layout Recommendations

### Layout Structure (Top to Bottom)

```
[1] BILLING CYCLE SELECTOR — Horizontal tabs, 4 options
    月費(彈性) | 雙月優惠 | 半年計劃 | 年費計劃
    - Default selection: 雙月優惠 (pre-selected on page load)
    - 年費計劃 tab shows a small badge: "最抵"
    - 月費(彈性) has NO badge — let it feel plain

[2] THREE TIER CARDS — Side by side on desktop, stacked on mobile
    - Starter: Standard card, slightly muted background
    - Pro: ELEVATED card — scaled up 105%, primary border,
           "推薦" badge at top, solid CTA button
    - Elite: Premium card — subtle gold/accent border, "旗艦" badge

[3] PRICE DISPLAY — Each card shows:
    - Monthly equivalent: large bold number (e.g., "HK$278/月")
    - Total payment: smaller text below (e.g., "雙月合計 HK$556")
    - Savings vs monthly: green highlight (e.g., "節省 HK$40")
    - Install fee: show with strikethrough IF annual plan selected
      ("安裝費 HK$800" vs "安裝費 ~~HK$800~~ 免費")

[4] FEATURE COMPARISON — Below the cards
    - Compact table showing all features across tiers
    - Green checkmarks vs grey dashes
    - Highlight the features that differentiate Tier 2 from Tier 1:
      記憶, 搜尋, 自動恢復 — these should have brief
      explanatory tooltips

[5] SOCIAL PROOF / VALUE ANCHOR — Below comparison
    - "ChatGPT Plus 月費 HK$156 — 但沒有記憶、沒有搜尋、沒有專屬伺服器"
    - Frame NexGen Pro at HK$278/月 as "比 ChatGPT Plus 多 HK$122，
      但多了整台專屬伺服器 + 長期記憶 + 即時搜尋"
```

### Key Visual Principles

**Default to 2-month billing.** When the page loads, the "雙月優惠" tab is pre-selected. The customer sees the 2-month prices first. If they click "月費(彈性)" they see higher numbers. This makes 2-month feel like "the normal price" and monthly feel like "the expensive option."

**Pro card dominance.** The middle card (Pro) should be visually dominant:
- 5-10% larger than Starter and Elite cards
- Primary color border (not just a thin line)
- "推薦" badge in primary color
- Solid, high-contrast CTA button (other tiers use outline buttons)
- On mobile, Pro card appears FIRST (use CSS order)

**Savings callout.** For every billing cycle longer than monthly, show a green tag with the absolute savings amount (e.g., "節省 HK$720"). Absolute numbers work better than percentages for amounts under HK$2,000 — the brain processes "save $720" faster than "save 20%."

**Install fee reveal.** Only show installation fee details AFTER the customer clicks a CTA. This prevents sticker shock from seeing "monthly price + install fee" simultaneously. Alternatively, show the install fee in smaller text below the main price, and make it visually disappear (strikethrough + "免費") when annual is selected.

---

## 5. Marketing Copy for Each Tier

### 基本版 Starter

**Tagline:** 「初次體驗 AI 助手的最簡單方式」

**Description (for pricing page):**

> 在 Telegram 上擁有一位隨時待命的 AI 助手。適合想試用 AI 聊天功能、偶爾提問或翻譯的用戶。基礎配置，即開即用。

**Pain solved:** "I'm curious about AI assistants but don't want to deal with technical setup or big commitments."

---

### 專業版 Pro

**Tagline:** 「記住你的一切，隨時上網查資料 — 真正的專屬 AI」

**Description (for pricing page):**

> AI 不再只是問答機器。專業版配備長期記憶系統，對話越多，它越了解你的需求和偏好。內建即時搜尋引擎，可查詢最新資訊。斷線自動恢復，全天候穩定運行。絕大多數用戶選擇此方案。

**Pain solved:** "ChatGPT forgets everything every conversation. I want an AI that actually knows me and can search the internet."

---

### 旗艦版 Elite

**Tagline:** 「不只是對話 — 讓 AI 替你動手操作」

**Description (for pricing page):**

> 在專業版所有功能之上，新增瀏覽器自動化能力。AI 可自動格價、填寫表格、預訂服務，完成需要操作網頁的任務。支援自訂 AI 性格，打造真正屬於你的數碼助理。適合需要 AI 主動執行任務的專業用戶。

**Pain solved:** "I don't just want an AI that talks — I want one that can actually DO things on the web for me."

---

### Supplementary Copy Elements

**For the billing cycle selector area:**

> 月費(彈性)：「靈活彈性，隨時取消」
> 雙月優惠：「承諾兩個月，即享折扣」
> 半年計劃：「安裝費半價 + 月費折扣」
> 年費計劃：「免安裝費 + 最低月費 — 全年最佳價值」

**For the CTA button (Pro tier):**

> 「選擇專業版」 (solid button, primary color)

**For the CTA button (other tiers):**

> 「選擇基本版」 / 「選擇旗艦版」 (outline button)

---

## 6. Market Comparison — Value Framing

### vs ChatGPT Plus (HK$156/月)

| Feature | ChatGPT Plus | NexGen 專業版 |
|---------|-------------|--------------|
| 月費 | HK$156 | HK$278 (雙月計劃) |
| 專屬伺服器 | 共用 | 獨立 VPS，資料完全屬於你 |
| 長期記憶 | 有限（官方 Memory 功能受限） | 完整 Mem0 向量記憶，記住所有對話 |
| 即時搜尋 | 有限（僅限 Bing） | SearXNG 多引擎搜尋，包括 Reddit |
| 使用渠道 | 網頁 / App | Telegram 隨時傳訊，無需開 App |
| 資料私隱 | OpenAI 伺服器 (美國) | 你自己的伺服器 (日本) |
| 香港直接付款 | 需要海外信用卡 | 直接付款，無需繞道 |
| 自動恢復 | N/A | Gateway Watchdog 斷線自動修復 |

**Framing copy (for website):**

> 「每月多 HK$122，你得到的不只是聊天 — 而是一台完全屬於你的 AI 伺服器，具備長期記憶、即時搜尋、Telegram 隨時對話，資料永遠留在你手中。」

### vs ChatGPT Pro (HK$1,560/月)

> 「ChatGPT Pro 月費高達 HK$1,560。NexGen 旗艦版僅需 HK$368/月（年費計劃），同時具備專屬伺服器、長期記憶、網頁搜尋及瀏覽器自動化 — 功能更多，費用不到四分之一。」

### vs Self-Setup (DIY)

> 「自行架設需要：租用 VPS（HK$62/月）、申請 API 帳號、安裝 Docker、配置 Mem0 + Qdrant + SearXNG、設定 Telegram Bot、維護系統穩定性。預計需要 8-15 小時技術工作。NexGen 全部代勞，開箱即用。」

### vs Other OpenClaw Installation Services

There are no major competitors offering managed OpenClaw installation in HK with Cantonese support. The closest comparable is SetupClaw (international, English only) at approximately HK$230-380/month without memory, search, or managed hosting. NexGen's custom stack (Mem0 + SearXNG + Watchdog + proxy architecture) is a genuine differentiator with no direct equivalent in the HK market.

---

## 7. Summary — Revenue Model at Scale

### Per-Customer Annual Revenue (at 2-month billing — the target minimum)

| Tier | Monthly Equiv. | Annual Revenue | Annual Cost | Annual Profit | Margin |
|------|---------------|---------------|-------------|--------------|--------|
| 基本版 | HK$178 | HK$2,136 | HK$780 | HK$1,356 | 63% |
| 專業版 | HK$278 | HK$3,336 | HK$840 | HK$2,496 | 75% |
| 旗艦版 | HK$438 | HK$5,256 | HK$1,140 | HK$4,116 | 78% |

### Scale Projections (assuming 70% Pro, 15% Starter, 15% Elite mix)

| Customers | Monthly Revenue | Monthly Profit | Annual Revenue |
|-----------|----------------|---------------|----------------|
| 10 | HK$2,880 | HK$2,110 | HK$34,560 |
| 30 | HK$8,640 | HK$6,330 | HK$103,680 |
| 100 | HK$28,800 | HK$21,100 | HK$345,600 |
| 300 | HK$86,400 | HK$63,300 | HK$1,036,800 |

### Blended ARPU (Average Revenue Per User)

At target mix (70/15/15): **HK$288/mo** (2-month billing)

---

## 8. Decoy Effect Analysis

### Why Tier 1 (基本版) Is an Effective Decoy

The decoy effect works when one option is asymmetrically dominated — meaning it is clearly inferior in a way that makes another option look better by comparison.

| Dimension | 基本版 HK$178/月 | 專業版 HK$278/月 | Delta |
|-----------|-----------------|-----------------|-------|
| Price difference | -- | +HK$100/月 | |
| Memory | No | Yes | Massive upgrade |
| Search | No | Yes | Massive upgrade |
| Auto-recovery | No | Yes | Reliability |
| Token allowance | 5M | 10M (2x) | 2x capacity |
| Support | AI only | AI + 7-day human | Safety net |

**The key insight:** For just HK$100 more per month (roughly HK$3.3/day), the customer gets memory, search, auto-recovery, double the token allowance, and human support. The value jump from Tier 1 to Tier 2 is enormous relative to the price increase, making Tier 1 feel like a poor deal.

Meanwhile, the jump from Tier 2 to Tier 3 costs HK$160 more but primarily adds browser automation and custom personality — nice-to-have features rather than must-haves. This makes Tier 2 feel like the rational "sweet spot."

### Expected Tier Distribution

Based on the decoy structure: ~15% Starter, ~70% Pro, ~15% Elite

---

## 9. Implementation Notes

### Lemon Squeezy Product Setup

Create 12 products (3 tiers x 4 billing cycles):

| Product | Price | Interval |
|---------|-------|----------|
| starter-monthly | HK$188 | Monthly |
| starter-bimonthly | HK$356 | Every 2 months |
| starter-semiannual | HK$1,008 | Every 6 months |
| starter-annual | HK$1,896 | Yearly |
| pro-monthly | HK$298 | Monthly |
| pro-bimonthly | HK$556 | Every 2 months |
| pro-semiannual | HK$1,548 | Every 6 months |
| pro-annual | HK$2,856 | Yearly |
| elite-monthly | HK$468 | Monthly |
| elite-bimonthly | HK$876 | Every 2 months |
| elite-semiannual | HK$2,388 | Every 6 months |
| elite-annual | HK$4,416 | Yearly |

Plus 6 one-time installation fee products (3 tiers x 2 price points: full and half-price for semi-annual).

Annual plans: installation fee = HK$0 (waived), no separate product needed.

### No Refund Policy

All plans are prepaid. No refunds, no deposits, no partial credits. This should be stated clearly in Terms of Service:

> 「所有方案均為預付制。付款後不設退款。如需取消，服務將於當前計費週期結束後停止，不會自動續期。」

### Contabo 2-Month Minimum Alignment

Since Contabo requires a 2-month minimum VPS commitment, the billing structure naturally aligns:
- Monthly plan customers: NexGen absorbs the risk of early cancellation (the monthly premium covers this).
- 2-month and longer: Direct alignment with Contabo billing. No waste.

---

## 10. Competitive Positioning Summary

```
                    Price (HK$/月)
                    |
    HK$1,560 ──────|──── ChatGPT Pro
                    |
                    |
                    |
     HK$468 ───────|──── NexGen 旗艦版 (monthly)
     HK$368 ───────|──── NexGen 旗艦版 (annual)
                    |
     HK$298 ───────|──── NexGen 專業版 (monthly)
     HK$278 ───────|──── NexGen 專業版 (2-month) ← TARGET
     HK$238 ───────|──── NexGen 專業版 (annual)
                    |
     HK$188 ───────|──── NexGen 基本版 (monthly)
     HK$158 ───────|──── NexGen 基本版 (annual)
     HK$156 ───────|──── ChatGPT Plus
                    |
                    |    But ChatGPT Plus has:
                    |    - No dedicated server
                    |    - No long-term memory
                    |    - No web search (real-time)
                    |    - No Telegram integration
                    |    - No data sovereignty
                    |    - Requires overseas payment
```

**Key message:** NexGen 專業版 sits just above ChatGPT Plus in price but delivers a fundamentally different product — a fully managed, private AI server with memory, search, and messaging integration. The price delta is small; the value delta is enormous.

---

## Sources

- [ChatGPT Plans and Pricing](https://chatgpt.com/pricing/)
- [ChatGPT Plus Hong Kong Payment Guide](https://pinzhanghao.com/tutorials/chatgpt-plus-payment-hong-kong/)
- [ChatGPT Pricing 2026: Free vs Plus vs Pro](https://userjot.com/blog/chatgpt-pricing-2025-plus-pro-team-costs)
- [Tiered Pricing Model Guide](https://dodopayments.com/blogs/tiered-pricing-model-guide-guide)
