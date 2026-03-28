# ClawHK 蟹助手 — Website Design Blueprint

> **Date:** 2026-03-16
> **Status:** Ready for Lovable Build
> **Purpose:** AI-readable blueprint for Lovable to generate the website. Contains Knowledge File + page-by-page prompts.
> **Website copy language:** 香港書面語 (HK formal written Chinese)
> **Design directives:** English (for AI parsing)

---

## PART A: Lovable Knowledge File

> Copy-paste this entire section into Lovable's Knowledge File. It stays with every prompt.

### Project Identity

- **Brand:** 蟹助手 (ClawHK)
- **Domain:** clawhk.com
- **Tagline:** 擁有你自己的 AI 助手 — 記住你、幫助你、24/7 隨時待命
- **What it is:** Hong Kong's AI assistant installation service. We remotely set up a private AI system (OpenClaw) on customers' VPS or Raspberry Pi 5, with long-term memory, real-time search, auto-recovery watchdogs, and Telegram/WhatsApp access.
- **Target audience:** Non-technical Hong Kong users who want a personal AI assistant but can't set it up themselves.

### Design System

- **Theme:** Dark mode with subtle glow effects (reference: SetupClaw.io aesthetic)
- **Primary color:** Warm coral / terracotta (crab theme) — NOT aggressive red
- **Secondary:** Deep navy / charcoal (text + background)
- **Accent:** White + subtle glow + gradient
- **Avoid:** Pure blue (too corporate), green (too WeChat), purple (too abstract)
- **Fonts:** Noto Sans TC for Chinese headings, system sans-serif for body, monospace for English tech terms
- **Layout:** Mobile-first (HK 80%+ mobile users), centered max-width container, generous whitespace
- **Images:** WebP, lazy-loaded, NO stock photos — only real Telegram screenshots + custom mockups
- **Icons:** Emoji for tier names only (🌱⭐🚀), minimal elsewhere

### Global UI Elements

- **Navigation:** Logo "蟹助手" (with crab icon) + 首頁 / 收費 / 常見問題 / 聯絡我們. Mobile hamburger. Sticky on scroll. Desktop top-right CTA: "WhatsApp 查詢"
- **Floating WhatsApp button:** All pages, bottom-right, green WhatsApp icon → wa.me/{NUMBER}. Always visible on mobile. This is the #1 conversion element for HK market.
- **Footer:** Logo + nav links + payment method icons (FPS / PayMe) + email (small) + © 2026 蟹助手
- **Open Graph:** Each page needs og:title + og:description + og:image (1200x630 branded card)
- **Performance target:** Total < 500KB, FCP < 1.5s, static site on Cloudflare Pages

### Pricing Model (source of truth)

3-tier decoy effect pricing. Tier 1 is intentionally weak to push users toward Tier 2.

| | 🌱 新手上路 | ⭐ 智能管家 | 🚀 全能大師 |
|---|---|---|---|
| **Installation (original)** | HK$400 | HK$800 | HK$1,800 |
| **Installation (launch 50% off)** | **HK$200** | **HK$400** | **HK$900** |
| **Monthly (all-inclusive)** | **HK$148/mo** | **HK$248/mo** | **HK$388/mo** |
| **Annual (15% off)** | HK$1,508/yr | HK$2,528/yr | HK$3,958/yr |

Monthly fee includes: VPS hosting + AI compute + VPN + maintenance + monitoring. No hidden costs.

Launch promo: First 20 customers get 50% off installation fee.

### Tier Features

| Feature | 🌱 新手上路 | ⭐ 智能管家 | 🚀 全能大師 |
|---|---|---|---|
| AI Model | DeepSeek | DeepSeek + GPT-4.1-mini | DeepSeek + GPT-4.1 + Claude |
| Messaging | Telegram only | Telegram + WhatsApp | All platforms |
| Long-term memory | No | Yes | Yes + custom personality |
| Real-time search | No | Yes | Yes + custom config |
| Browser automation | No | No | Yes |
| Auto-recovery | No | Yes (gateway watchdog) | Yes (full watchdog suite) |
| Support | AI chatbot only | AI + 7-day human support | AI + 30-day priority support |
| Daily message limit | 100 | 300 | 1,000 |

### Competitor Positioning

**vs ChatGPT Plus (HK$156/mo):**
蟹助手 智能管家 costs HK$92 more but provides: full long-term memory, unlimited search (incl. Reddit), complete data privacy (runs on your own server), 24/7 Telegram/WhatsApp access, dedicated instance (not shared).

### Design References (learn from, do better than)

- **RunMyClaw.ai:** Learn — Telegram chat mockup, "$1/day" reframing, Before/After comparison, sticky mobile CTA, FAQ accordion. Avoid — fake urgency, no localization, no real screenshots.
- **SetupClaw.io:** Learn — Dark theme + coral accent, 3-tier pricing, "Most Popular" badge, dashboard preview. Avoid — zero social proof, too many use cases, unclear pricing breakdown.

---

## PART B: Page-by-Page Build Prompts

> Feed these to Lovable ONE PAGE AT A TIME. Build order: Pricing → Landing → FAQ → Contact.

---

### PROMPT 1: Pricing Page (收費)

> Build first — this is where social traffic (IG, LIHKG) converts.

**Page URL:** /pricing

**Headline:** 簡單透明收費
**Subtext:** 一次安裝費 + 全包月費。沒有隱藏費用，沒有合約，隨時取消。

#### Launch promo banner (top of page)

> 🔥 開業優惠 — 首 20 位客戶安裝費半價！名額有限，先到先得。

#### 3-tier comparison table (decoy effect design)

Design requirements:
- Tier 2 column should be wider, have coral border/highlight
- Tier 2 has badge: "⭐ 最受歡迎"
- Tier 1 should be muted/grey, intentionally looks insufficient
- Tier 3 has "Premium" label but no special highlight
- **On mobile, show Tier 2 first**

| | 🌱 新手上路 | ⭐ 智能管家 | 🚀 全能大師 |
|---|---|---|---|
| **安裝費** | ~~HK$400~~ **HK$200**（半價） | ~~HK$800~~ **HK$400**（半價） | ~~HK$1,800~~ **HK$900**（半價） |
| **全包月費** | **HK$148/月** | **HK$248/月** | **HK$388/月** |
| **年費（85折）** | HK$1,508/年 | HK$2,528/年 | HK$3,958/年 |
| **適合** | 想試試 AI 助手 | 大部分人選這個 | 需要最完整的體驗 |
| **AI Model** | DeepSeek | DeepSeek + GPT-4.1-mini | DeepSeek + GPT-4.1 + Claude |
| **通訊平台** | Telegram only | Telegram + WhatsApp | 全平台 |
| **🧠 長期記憶** | ❌ | ✅ 它會記住你 | ✅ + 自訂 AI 性格 |
| **🔍 即時搜尋** | ❌ | ✅ 可以上網查資料 | ✅ + 自訂搜尋配置 |
| **🛡️ 自動恢復** | ❌ | ✅ 斷線自動修復 | ✅ 全套 watchdog |
| **🌐 瀏覽器自動化** | ❌ | ❌ | ✅ |
| **售後支援** | AI 客服 | AI + 7 日真人支援 | AI + 30 日優先支援 |
| **每日訊息上限** | 100 條 | 300 條 | 1,000 條 |
| **CTA button style** | Ghost/outline | **Filled primary (coral)** | Outline accent |

**Daily cost reframing (below pricing table):**
> 智能管家 HK$248/月 = 每日 HK$8.3 — 一杯凍檸茶的價錢

#### ChatGPT Plus comparison section

| | ChatGPT Plus | 蟹助手 智能管家 |
|---|---|---|
| **月費** | HK$156 | HK$248 |
| **差價** | — | +HK$92 |
| **長期記憶** | ❌ 有限 | ✅ 完整（記住你所有對話） |
| **即時搜尋** | ⚠️ 有限 | ✅ 無限制（包括 Reddit） |
| **私隱** | ❌ 資料存於 OpenAI | ✅ 資料存於你自己的伺服器 |
| **24/7 Telegram** | ❌ | ✅ |
| **中文支援** | ❌ | ✅ |
| **獨立擁有** | ❌ 共用 | ✅ 你專屬 |

> 多付 HK$92，你得到的是一個真正屬於你、記住你、懂得搜尋、永遠在線的 AI 助手。

#### Monthly fee explanation

**Heading:** 月費包含甚麼？— 全包，不用煩

> 月費已包括 VPS 伺服器、AI 運算費用、VPN、維護及監控 — 你只需要每月繳付一筆費用，其他不用理會。就像手機月費一樣 — 一個計劃包含所有服務。

#### Add-ons (any tier)

| Add-on | 價格 | 說明 |
|---|---|---|
| Pi5 硬件代購 + 安裝 | HK$800 起 | 買好裝好寄到你家 |
| 額外通訊平台 | HK$50/個 | 加 WhatsApp / Discord 等 |
| AI 性格自訂 | HK$100 | 自訂 AI 說話風格 |
| 系統遷移 | HK$300 | VPS 與 Pi5 互轉，資料完整搬遷 |
| 緊急支援 | HK$200/次 | 24 小時內回應 |

#### Payment methods

Show icons: **FPS** | **PayMe** | **銀行轉帳** | **PayPal**（海外）

**Bottom CTA:** 不確定哪個方案適合你？WhatsApp 我們聊聊，免費建議，零壓力。

---

### PROMPT 2: Landing Page (首頁)

**Page URL:** / (homepage)

#### Section 1: Hero

**Headline:**
> 擁有你自己的 AI 助手

**Subheadline:**
> 記住你、幫助你、24/7 隨時待命。不需要懂程式，我們幫你處理好。

**Supporting text:**
> 遠程安裝 | 私人專屬 | 香港本地支援

**CTA:** 了解方案與收費 →
**Secondary CTA:** 或者看看如何運作 ↓

**Visual:** Right side shows a phone frame with Telegram chat mockup (Chinese AI reply). No stock photos.

**Mockup conversation (for design):**
```
👤 User: 今晚想吃日本菜，尖沙咀有甚麼推薦？

🤖 蟹助手: 根據最新搜尋結果，尖沙咀這幾間評價最高：
1. 鮨銀座 Onodera — 高級 omakase，K11 MUSEA
2. 一蘭拉麵 — 24 小時營業，重慶大廈旁邊
3. 牛角 — 放題，平均 HK$200/人

上次你說喜歡吃 omakase，需要我幫你查銀座今晚有沒有位？
```
> Key point: The last line demonstrates **memory** — it remembers the user's past preferences.

---

#### Section 2: Before/After comparison

**Heading:** 自己安裝 vs 找我們

| | 自己安裝 OpenClaw | 找蟹助手 |
|---|---|---|
| 時間 | 3-8 小時（不計 debug） | **30 分鐘遠程裝好** |
| 技術要求 | Docker、VPN、API key、Linux… | **零。懂用 WhatsApp 就行** |
| 長期記憶 | ❌ 自行設定 Qdrant + Mem0 | **✅ 裝好即用** |
| 即時搜尋 | ❌ 自行架設 SearXNG | **✅ 裝好即用** |
| 斷線修復 | ❌ 手動 debug | **✅ Watchdog 自動 24/7** |
| 售後支援 | ❌ 自行上網找答案 | **✅ 中文真人 + AI 支援** |

**Transition:** 你只需要使用，技術的事全部由我們處理。

---

#### Section 3: What You Get — 4 core features

**Heading:** 你的 AI 助手有甚麼不同？

**Card 1 — 🧠 長期記憶**
- Title: 它會記住你
- Copy: 你的偏好、工作內容、之前聊過的事 — 它全部記住，越用越聰明。
- Visual hint: Chat bubble — "上次你說想學 Python，學得怎樣了？"

**Card 2 — 🔍 即時搜尋**
- Title: 懂得上網找資料
- Copy: 即時搜尋最新資訊。天氣、新聞、餐廳推薦、Reddit 討論 — 即問即答。
- Visual hint: Search results with timestamp

**Card 3 — 🛡️ 自動修復**
- Title: 永遠不會停機
- Copy: 斷線時自動重新連接。真正的 24/7，不需要你處理。
- Visual hint: Uptime badge "99.9%"

**Card 4 — 🔒 完全私隱**
- Title: 你的資料只屬於你
- Copy: 運行在你自己的機器上，對話不會被任何公司看到。
- Visual hint: Diagram — ChatGPT: 你 → OpenAI 伺服器 vs 蟹助手: 你 → 你自己的機器

---

#### Section 4: How It Works — 3 steps

**Heading:** 三步完成

| Step | Icon | Title | Description |
|---|---|---|---|
| 1 | 💬 | 選擇方案 | 查看哪個計劃適合你，透過 WhatsApp / Telegram 聯絡我們 |
| 2 | 🔧 | 我們遠程安裝 | 你提供存取權限，我們遠程幫你安裝好。最快 30 分鐘。 |
| 3 | 🚀 | 開始使用 | 在 Telegram 直接與你的 AI 對話，就這麼簡單 |

---

#### Section 5: Use Cases — 6 cards

**Heading:** 它可以幫你做甚麼？

6 cards (2 rows x 3 columns on desktop, stacked on mobile):

| Icon | Title | Example prompt | Tag |
|---|---|---|---|
| 💼 | 每日整理工作 | "幫我歸納今天 10 封 email 的重點" | 效率 |
| 📚 | 溫習考試好幫手 | "我明天考 Marketing，幫我整理 Chapter 5-8 的重點" | 學習 |
| ✍️ | 幫你寫文案、出 post | "幫我寫一段 IG caption，賣手工蠟燭" | 創業 |
| 🍜 | 私人助理隨時待命 | "今晚想吃日本菜，尖沙咀附近有甚麼推薦？" | 生活 |
| 📝 | 寫東西不再頭痛 | "幫我改這段英文 email，要禮貌但 firm" | 寫作 |
| 🧠 | 你的第二個腦 | "我上個月跟你說過想轉行做 UX，你記得嗎？" | 記憶 |

---

#### Section 6: Social Proof

> Phase 0 strategy — no real customers yet:

**Method 1 — Builder story (must have):**
> 「我們是一群香港 IT 人，自己使用 OpenClaw 幾個月，覺得非常好用但太難安裝。所以我們推出了這個服務 — 幫你省下那幾個小時的痛苦。」

**Method 2 — Real Telegram screenshots (must have):**
- Show Chinese AI conversations (memory recall + search results)
- Blur personal information

**Method 3 — Beta user quotes (collect from 3-5 friends after trial):**
- Label as "Early Access 用戶"
- [PLACEHOLDER — to be filled after collecting real feedback]

**Phase 1 additions:**
- Counter: "已幫 XX 位用戶安裝"
- LIHKG positive discussion screenshots

---

#### Section 7: Trust Bar

4 icons + text in a single row:

| Icon | Text |
|---|---|
| 🔒 | 資料儲存在你自己的機器 |
| 💬 | 香港本地支援 |
| 🔓 | 不綁約，隨時取消 |
| 💰 | 收費公開，沒有隱藏費用 |

---

#### Section 8: Final CTA

> 準備好擁有你自己的 AI 助手了嗎？最快今天安裝，今晚就能使用。

- Primary CTA: 查看收費方案 →
- Secondary CTA: WhatsApp 聯絡我們 →

---

### PROMPT 3: FAQ Page (常見問題)

**Page URL:** /faq

**Headline:** 常見問題
**Subtext:** 找不到答案？直接 WhatsApp 問我們。

> Use accordion design (click to expand). 5 categories.

#### 基本概念

**Q: 蟹助手是甚麼？**
A: 我們是 AI 助手安裝服務。幫你安裝好一個專屬的 AI 助手，你透過 Telegram 或 WhatsApp 與它對話 — 就像有一個 24/7 的私人助理。

**Q: 跟 ChatGPT 有甚麼分別？**
A: 三個最大分別：(1) **記住你** — 它會記住你的偏好和之前的對話，不會每次從零開始；(2) **懂得上網搜尋** — 可以即時搜尋最新資訊；(3) **資料在你手** — 對話不會被 OpenAI 或任何公司看到。

**Q: 需要懂寫程式嗎？**
A: 完全不需要。懂用 WhatsApp 就懂用蟹助手。安裝過程全部由我們遠程處理。

**Q: 甚麼是 Raspberry Pi 5？**
A: 一部很小的電腦（大約一張信用卡大小），放在家中 24 小時運行你的 AI。靜音、省電（每月約 HK$10-15 電費）。不想買硬件？可以選用 VPS（雲端伺服器），效果一樣。

#### 私隱與安全

**Q: 對話會被別人看到嗎？**
A: 不會。你的資料儲存在你自己的設備（Pi5 或 VPS），不經過我們的伺服器，我們看不到你的對話。

**Q: 安裝時會看到我的東西嗎？**
A: 安裝過程只進行技術操作（安裝軟件、設定 config）。安裝完成後我們會教你更改密碼，之後我們就沒有存取權限。

**Q: 資料會被 AI 公司拿去訓練嗎？**
A: 我們使用的 AI API（DeepSeek、Azure OpenAI 等）企業條款列明不會使用你的資料做訓練。

#### 收費與付款

**Q: 除了安裝費還有其他費用嗎？**
A: 有全包月費，由 HK$148/月起。已包括 VPS 伺服器、AI 運算、VPN、維護 — 沒有隱藏費用。

**Q: 為甚麼要月費？**
A: AI 助手需要連接 AI 公司的伺服器才能回答你，還需要伺服器 24 小時運行。就像手機需要月費計劃才能上網和打電話 — 一個計劃包含所有服務。

**Q: 可以隨時取消嗎？**
A: 可以，沒有合約、不綁約。取消後 AI 停止運作，但你的資料會保留 7 天供你備份。

**Q: 接受甚麼付款方式？**
A: FPS 轉數快、PayMe、銀行轉帳、PayPal（海外客戶）。暫時不支援信用卡自動扣款。

#### 技術與穩定性

**Q: 會不會經常出問題？**
A: 極少。我們內置 watchdog 系統，AI 斷線會自動重啟，VPN 斷開會自動切換伺服器。真正的 set-and-forget。

**Q: 真的出問題怎麼辦？**
A: 新手上路有 AI 客服支援；智能管家有 7 天真人支援；全能大師有 30 天優先支援。之後可以購買緊急支援（HK$200/次）。

**Q: Pi5 會很吵嗎？耗電嗎？**
A: 靜音（沒有風扇或風扇很小聲），每月電費約 HK$10-15。比一本書還小，放在桌底也可以。

**Q: 搬家 / 換 WiFi 怎麼辦？**
A: Pi5 插回新路由器的網線就行。VPS 完全不受影響 — 它在雲端。

#### 其他

**Q: 你們是誰？**
A: 一群香港 IT 人，自己使用 OpenClaw 幾個月，覺得非常好用但太難安裝。所以推出了這個服務，幫大家省下那幾個小時的痛苦。

**Q: 可以先試再買嗎？**
A: 可以 WhatsApp 預約免費 demo，或者看我們 IG 的示範影片。我們也歡迎你問任何問題 — 先聊聊，零壓力。

**Q: 想升級方案？**
A: 隨時可以升級。遠程加裝新功能，補回差價就行。

---

### PROMPT 4: Contact Page (聯絡我們)

**Page URL:** /contact

**Headline:** 聯絡我們
**Subtext:** 有問題？想了解更多？隨時找我們聊。

#### Contact cards (3 large cards, mobile-friendly)

| Priority | Icon | Platform | Description | Response time |
|---|---|---|---|---|
| 1 | 📱 | **WhatsApp** | 最快回覆，適合查詢和預約 | 通常 2 小時內 |
| 2 | ✈️ | **Telegram** | 技術問題和售後支援 | 通常 2 小時內 |
| 3 | 📷 | **Instagram** | DM 我們或者看示範影片 | 通常 24 小時內 |

> Do NOT use email as primary contact — HK users don't email for this type of service. Email goes in footer only.

#### Tally.so embed form (backup / lead capture)

Form fields:
- 稱呼 (required)
- 聯絡方式 dropdown: WhatsApp / Telegram / IG
- 號碼 / Username (required)
- 有興趣的方案: 新手上路 / 智能管家 / 全能大師 / 未決定
- 想問甚麼？(optional, max 500 characters)

> Backend: Tally.so embed → auto Email + Telegram notification + Google Sheet sync

**CTA:** 不確定自己是否需要？沒關係，先聊聊，免費諮詢，零壓力。

---

## PART C: Lovable Build Strategy

> Based on Lovable official best practices + community research.

### Build Order & Staging

| Stage | Page | Prompt to use | Why this order |
|---|---|---|---|
| 0 | — | Paste PART A into Knowledge File | Project context stays with every prompt |
| 1 | **Pricing** | PROMPT 1 | Social traffic converts here first |
| 2 | **Landing** | PROMPT 2 | Core landing page with hero + features |
| 3 | **FAQ** | PROMPT 3 | Reduces support load from day 1 |
| 4 | **Contact** | PROMPT 4 | Simple, embed Tally form |
| 5 | — | Visual tweaks + polish | Use Visual Edit (free, no credits) |

### Key Rules for Efficient Lovable Usage

1. **One page per prompt** — never build multiple pages at once
2. **Use Plan Mode first** (60-70% of time) — ask "Investigate but don't write code yet" before implementing
3. **Pin stable versions** — after each working page, pin it in version control
4. **Visual Edit for small tweaks** — colors, fonts, spacing, text changes are FREE (no credits)
5. **Max 2 fix attempts per error** — if still broken, revert to last stable version
6. **Draft prompts externally** — write/refine in Claude or ChatGPT first, then paste final version into Lovable
7. **Add guardrails** — explicitly tell Lovable what NOT to modify when editing a page
8. **Repeat context** — AI doesn't remember earlier prompts well; repeat important constraints

### Post-Lovable Workflow

```
Lovable (~80%) → Download ZIP → Claude Code (~20%) → Cloudflare Pages

Claude Code tasks:
├── Fine-tune Chinese copy
├── Embed Tally.so form (if Lovable can't)
├── Add Cloudflare Pages config
├── Verify mobile responsive
└── Add OG meta tags
```

### Future Changes

```
Small changes (copy, prices, FAQ) → Claude Code directly → re-upload to CF Pages
Large changes (layout, new sections) → Back to Lovable → re-download → CC adjustments → upload
```

---

## PART D: Missing Info Checklist

> Items needed before website can launch.

### 🔴 Must have (cannot launch without)

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | **WhatsApp number** | ❌ | wa.me/{number} — use a separate SIM, not personal |
| 2 | **Telegram handle** | ❌ | e.g. @clawhk |
| 3 | **Instagram handle** | ❌ | e.g. @clawhk.hk — need IG business account first |
| 4 | **Domain** | ❌ | clawhk.com — buy on Cloudflare |
| 5 | **Logo** | ❌ | Minimum: text logo "蟹助手" + crab icon. Can use AI-generated. Lovable can use placeholder first. |
| 6 | **Telegram chat screenshots** | ❌ | Real Telegram conversation screenshots (from your own OpenClaw instance). Needed for Hero and Social Proof. |
| 7 | **Tally.so form** | ❌ | Create account + build form + set up Google Sheet sync + Email/Telegram notifications |

### 🟡 Nice to have (can launch without, add later)

| # | Item | Status | Notes |
|---|---|---|---|
| 8 | Beta user quotes | ❌ | Get 3-5 friends to trial for 2 weeks, collect real feedback. Use placeholder for Phase 0. |
| 9 | Memory recall screenshot | ❌ | Show AI remembering past conversations. Capture from own instance. |
| 10 | Search result screenshot | ❌ | Show AI search results (e.g. restaurant recommendations). Capture from own instance. |
| 11 | OG image | ❌ | 1200x630 branded card for social sharing. Can use Canva / AI. |
| 12 | Privacy diagram | ❌ | ChatGPT data flow vs 蟹助手 data flow — simple visual |

### 🟢 Later

| # | Item | Notes |
|---|---|---|
| 13 | Multi-language support | Add i18n (react-i18next) when expanding beyond HK. Phase 0 is Chinese only. |
| 14 | Installation counter | "已幫 XX 位用戶安裝" — add when real data exists |
| 15 | LIHKG screenshots | Add to Social Proof after positive discussions appear |
| 16 | Video demo | IG Reel or short video showing real usage |

---

## Sources

### Design Reference
- [RunMyClaw.ai](https://runmyclaw.ai/) — Telegram mockup, scarcity, "$1/day" reframing, sticky CTA
- [SetupClaw.io](https://setupclaw.io/) — Dark theme + coral accent, 3-tier pricing, dashboard preview
- [Lovable Best Practices](https://docs.lovable.dev/tips-tricks/best-practice) — Official build guide
- [Lovable Prompting Bible](https://lovable.dev/blog/2025-01-16-lovable-prompting-handbook) — Prompt structure guide

### Business Data
- Pricing: [pricing-analysis.md](pricing-analysis.md)
- Full business plan: [openclaw-setup-business-plan-v1.md](openclaw-setup-business-plan-v1.md)
- API costs: [api-pricing-research-2026-03.md](api-pricing-research-2026-03.md)
