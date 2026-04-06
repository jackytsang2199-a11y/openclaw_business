# Website Changes — Final Plan

> **Status:** 🔄 Planning
> **Updated:** 2026-04-05

---

## Decisions

### D1: Onboarding Flow — Form First, Then Payment ✅

```
Customer → /onboarding (Tally form + inline BotFather 圖文教學) → submit
→ receives Lemon Squeezy payment link → pays
→ LS webhook → CF Worker → D1 job queue → Pi5 deploys → Telegram notification
```

**Code changes:**
- [ ] Pricing CTA buttons → `/onboarding?tier=X` (not LS checkout)
- [ ] Onboarding.tsx: add collapsible BotFather guide above Tally form
- [ ] Onboarding copy: pre-payment language (remove「感謝您的訂購」)
- [ ] Add post-form step:「提交後，您會收到付款連結」

**Outside code:** Update Tally form to include tier selection + payment link delivery.

---

### D2: Replace GPT-4.1 Labels with Token Quotas ✅

Remove all GPT model names. Show monthly token allowance instead.

| Tier | Monthly Quota | Cost to Us | ~Messages/Month |
|------|--------------|------------|----------------|
| 🌱 新手上路 | 5,000,000 tokens | ~HK$15 | ~4,400 |
| ⭐ 智能管家 | 10,000,000 tokens | ~HK$30 | ~8,800 |
| 🚀 全能大師 | 20,000,000 tokens | ~HK$60 | ~17,600 |

> DeepSeek V3.2 blended rate: ~HK$2.62/1M tokens

**Code changes:**
- [ ] Pricing.tsx: replace `aiModel` + `dailyLimit` with `monthlyTokens`
- [ ] Add FAQ explaining tokens vs messages

---

### D3: Remove Daily Message Limits ✅

Remove 100/300/1,000 daily limits. Proxy enforces monthly HKD budget only.

---

## Remaining P-Fixes (5 items)

23 of 30 items from lovable-changes_v2.md already applied. Only these remain:

| # | Change | Action |
|---|--------|--------|
| P5 | Plugin ecosystem H2 | Change「背後的技術」→「同樣是 OpenClaw AI 助手，我們多了什麼？」|
| P9 | Integration strip | Add WhatsApp + Discord with「即將推出」labels |
| P18 | Tier 3 messaging | 「全平台」→「Telegram（更多平台即將推出）」|
| P19 | Technology body text | Remove「獨家」from「加入獨家插件生態」|
| P8+ | All CTA buttons | Link to `/onboarding` per D1 |

---

## N1: BotFather 圖文教學 ✅ READY

Collapsible accordion on `/onboarding`. 5 processed images in `tgbot_guide_image/processed/`. Text separated in `guide-text.json` for i18n.

| Step | Image | Instruction |
|------|-------|-------------|
| 1 | step1-search-botfather.png | 搜尋「BotFather」，認住藍色剔號 |
| 2 | step2-newbot-command.png | 輸入 /newbot，設定名稱和 username |
| 3 | step3-copy-token.png | 複製紅框內的 Bot Token |
| 4a | step4a-search-userinfobot.png | 搜尋 @userinfobot |
| 4b | step4b-userinfobot-reply.png | 複製紅框內的 User ID |

All sensitive info (token, username, user ID) already blurred.

---

## N2: Pricing Strategy ✅ DECIDED

**Approach:** 3 billing cycles. Monthly = expensive decoy. Quarterly = default. Annual = best deal. No separate install fee (baked into monthly premium).

### Tier Names
| Old | New |
|-----|-----|
| 🌱 新手上路 | **基本版 Starter** |
| ⭐ 智能管家 | **專業版 Pro** (推薦) |
| 🚀 全能大師 | **旗艦版 Elite** |

### Pricing

| | 月費 (彈性) | 季度 ⭐ 推薦 | 年費 (最抵) |
|---|------------|-------------|------------|
| **基本版** | $248/mo | $188/mo | $158/mo |
| **專業版** | $398/mo | $298/mo | $248/mo |
| **旗艦版** | $598/mo | $458/mo | $388/mo |

### Marketing Savings (show prominently)

| Tier | 季度 vs 月費 | 年費 vs 月費 |
|------|-------------|-------------|
| 基本版 | 節省 HK$720/年 | 節省 HK$1,080/年 |
| **專業版** | **節省 HK$1,200/年** | **節省 HK$1,800/年** |
| 旗艦版 | 節省 HK$1,680/年 | 節省 HK$2,520/年 |

- Default tab = 季度 on page load
- Monthly tab shows nudge:「選擇季度計劃，每年可節省高達 HK$1,200」
- 年費 tab shows「最抵」badge
- No separate install fee anywhere

Full details: `business/pricing-strategy-v2.md`

---

## N3: Hero Demo Images ⏳ IN PROGRESS

HTML mockups created: `tgbot_guide_image/hero-demo-mockups.html`

**Next:** Open in browser → screenshot → save to `public/demos/`

---

## N4: Landing Page Overhaul (9 items) ✅ DECIDED

### N4.1: Hero — Rewrite Diff Line + Add USPs

**Current (line 216):** 「獨家插件生態，ChatGPT 做不到的它全部做到」
**Problem:** Generic. Doesn't differentiate from other OpenClaw setup services. No mention of key USPs.

**New diff line:** 「已配置全套插件，提供 Telegram ID 即可開始 — 無需 API Key」

**Replace 3 checkmarks** (line 220-231):
| Old | New |
|-----|-----|
| 無需技術知識 | 一鍵安裝，30 分鐘上線 |
| Telegram 直接使用 | 全套插件已預載（記憶 · 搜尋 · 瀏覽器） |
| 記得你的所有對話 | 無需自備 API Key，費用全包 |

**Rationale:** These 3 points hit the core differentiators vs other OpenClaw setups:
1. Speed + zero effort (一鍵)
2. Pre-configured plugins (not vanilla OpenClaw)
3. No API key hassle (proxy architecture — this is unique to NexGen)

**Process line (line 234) update:**
「選擇方案 → 提供 Telegram ID → 最快 30 分鐘自動完成」

**Code:** Index.tsx lines 215-234

---

### N4.2: Fix "Top 50" Duplicate

**Current (line 125):** `{ value: "Top 50", label: "GitHub Global" }`
**Renders as:** "Top 50Top" (screenshot confirms)

**Fix:** Change `label` to just `"全球排名"` to avoid "Top" appearing twice.

**Code:** Index.tsx line 125

---

### N4.3: Use Cases — Emphasize Agent, Not Chatbot

**Current cards (lines 147-154):** All prompts are things any AI chatbot can do (summarize emails, write captions, recommend restaurants).

**New cards — emphasize agent actions:**

| Old Title | Old Prompt | New Title | New Prompt |
|-----------|-----------|-----------|------------|
| 工作更有效率 | 「幫我歸納今天 10 封 email 的重點」 | **自動追蹤競爭對手** | 「A 公司出咗新財報，自動整理重點同上季比較」 |
| 考試更有把握 | 「我明天考 Marketing，幫我整理…」 | **每日自動簡報** | 「每朝 8 點自動整理我追蹤的 5 個 RSS + 新聞源」 |
| 文案一秒完成 | 「幫我寫一段 IG caption…」 | **搶票、訂位、格價** | 「陳奕迅演唱會明天開賣，9:55 自動排隊搶兩張」 |
| 生活瑣事交給 AI | 「今晚想吃日本菜…」 | **瀏覽器自動操作** | 「幫我上 HKTVmall 格價，列出最平的三個選項」 |
| 寫作不再費力 | 「幫我改這段英文 email…」 | **記住你的一切** | 「我上次話想換工，你幫我追蹤咗幾耐？有咩進展？」 |
| 所有對話永遠記得 | 「我上個月跟你說過想轉行…」 | **全網即時搜尋** | 「Reddit 同連登今日有冇人討論 XX 股票？」 |

**Tags update:** 效率 → 自動化 / 學習 → 排程 / 創業 → Agent / 生活 → 瀏覽器 / 寫作 → 記憶 / 記憶 → 搜尋

**Key difference:** Every prompt now describes something **only an agent can do** — not just chatting.

**Code:** Index.tsx lines 147-154

---

### N4.4: Update Price CTA

**Line 440:** 「由 HK$148/月起 — 每日不到 HK$5」
→ 「由 HK$188/月起 — 季度計劃，每年節省高達 HK$1,200」

**Line 612:** 「由 HK$148/月起 — 立即開始」
→ 「由 HK$188/月起 — 立即開始」

**Code:** Index.tsx lines 440, 612

---

### N4.5: Remove Platform Section

**Section 7 (lines 509-527):** 「支援你常用的平台」— only shows Telegram. One platform doesn't need a section.

**Action:** Delete entire section.

**Code:** Index.tsx lines 509-527

---

### N4.6: Remove 「真人團隊。真正解答。」

**Line 606:** Standalone tagline in trust section. Sounds like a customer service company, not a tech product.

**Action:** Delete line 606.

**Code:** Index.tsx line 606

---

### N4.7: FAQ — Remove Pi5 Reference

**Current (FAQ.tsx line 29):** 「支援 Raspberry Pi 5 及任何 Linux VPS。我們也提供硬件代購服務。」

**New:** 「支援任何 Linux VPS。」

**Code:** FAQ.tsx line 29

---

### N4.8: FAQ — Update 收費與付款

Update to match new pricing structure (3 cycles, no install fee, no contract):

| Q | Old Answer | New Answer |
|---|-----------|-----------|
| 有沒有合約？ | 「沒有合約，按月收費…年費方案有 85 折優惠」 | 「沒有合約。月費、季度和年費三種計劃可選。季度及年費計劃享有折扣，隨時取消，不設退款。」 |
| 月費包含甚麼？ | 「月費是全包價…VPS、AI 運算、VPN、維護」 | Keep as-is (still accurate) |
| 接受甚麼付款方式？ | 「Stripe、PayPal 及銀行轉帳」 | 「信用卡、PayMe、FPS、銀行轉帳。」 |

**Code:** FAQ.tsx lines 36-48

---

### N4.9: FAQ — Remove VPS Retention on Cancel

**Current (FAQ.tsx line 84):** 「取消後你仍然擁有已安裝的系統，只是不再享有我們的維護和支援服務。」

**New:** 「你可以隨時取消。服務將於當前計費週期結束後停止，伺服器將會回收。」

**Code:** FAQ.tsx line 84

---

## N5: Audit Findings — Additional Fixes

### N5.1: 「蟹助手」still in Technology.tsx

**Line 74:** 「了解蟹助手如何保護您的數據安全」
**Line 76:** `alt="ChatGPT 與蟹助手數據流比較"`

→ Replace all「蟹助手」with「NexGen」

---

### N5.2: 「甚麼」→「什麼」(cross-site)

「甚麼」is acceptable in HK written Chinese but inconsistent with our 書面語 guidelines. Appears in:
- FAQ.tsx: 4 instances (lines 16, 28, 63, 75)
- Index.tsx: inline FAQ section

→ Replace all「甚麼」with「什麼」

---

### N5.3: Legal Pages — Policy Conflicts

**Terms.tsx line 35:** 「取消後客戶仍保留 VPS 上已安裝的系統。」
→ Change to: 「取消後，服務將於當前計費週期結束後停止，伺服器將會回收。」

**Refund.tsx line 25:** 「48 小時冷靜期…退還安裝費及已收月費」
→ Remove or update. New model: no refund, no separate install fee.

**All legal pages:** Update timestamps from 2026 年 3 月 → 2026 年 4 月

---

### N5.4: FAQ — Old Tier Names

**FAQ.tsx line 76:** 「智能管家和全能大師方案包含自動恢復功能」
→ Change to: 「專業版和旗艦版包含自動恢復功能（Watchdog）」

**FAQ.tsx line 63:** 「全能大師方案的專屬功能」
→ Change to: 「旗艦版的專屬功能」

---

### N5.5: Technology.tsx — Privacy Diagram

**Line 76:** `<img src="/privacy-diagram.svg">` — verify file exists in `public/`.
**Alt text:** References 蟹助手 → NexGen

---

### N5.6: Footer Payment Methods

**Footer.tsx:** Shows「FPS / PayMe / 信用卡」
**FAQ.tsx:** Says「Stripe、PayPal 及銀行轉帳」

→ Align both to: 「信用卡 / PayMe / FPS / 銀行轉帳」

---

### N5.7: Pricing.tsx line 304 — Flow Text

「付款後，系統會引導您填寫設定資料。」
→ Update per D1 (form first): 「提交表格後，您會收到付款連結。付款確認後，我們會在 30 分鐘內完成安裝。」

---

### N5.8: Refund.tsx — Full Rewrite Needed

Current refund page references:
- Install fee refunds (no longer applicable — no separate install fee)
- 48-hour cooling period (conflicts with no-refund policy)
- Monthly fee prorating (we don't do this)

→ Simplify to: All plans prepaid. No refunds. Service stops at end of billing cycle.

---

## Execution Order

```
1. Index.tsx — Hero rewrite + use cases + remove sections (N4.1-N4.6)
2. FAQ.tsx — Pi5, pricing, cancel, tier names (N4.7-N4.9, N5.4)
3. Pricing.tsx — Full rewrite per implementation plan (N2, D2, D3)
4. Technology.tsx — 蟹助手 branding + privacy diagram (N5.1, N5.5)
5. Legal pages — Terms, Privacy, Refund rewrites (N5.3, N5.8)
6. Cross-site — 甚麼→什麼, payment methods alignment, P-fixes (N5.2, N5.6, P5/P9/P18/P19)
7. Onboarding.tsx — Form-first flow + BotFather guide (D1, N1, N5.7)
8. Hero demo images — screenshot from mockups (N3)
9. Lemon Squeezy — create 9 products (3 tiers × 3 cycles)
10. Final review → deploy to Cloudflare Pages
```
