# Prompt A: Content + Structure Overhaul

> Apply this prompt to the EXISTING site. This changes content, sections, and page structure.
> Do NOT change colors, fonts, or visual styling — that comes in Prompt B.
> Keep the current dark theme, coral accents, and all existing CSS exactly as-is.

---

## Overview of Changes

This prompt does 4 things:
1. **Rewrites** the landing page hero and adds missing sections
2. **Reorders** landing page sections to the final 11-section flow
3. **Adds** a new /technology page (5th page)
4. **Fixes** nav, content bugs, and placeholder issues

---

## PART 1: Navigation Changes (All Pages)

### 1A. Nav CTA — Replace text button with icon pair

Replace the current "WhatsApp 查詢" text button in the top-right with:
- A single pill-shaped container holding **WhatsApp icon + Telegram icon** side by side
- No text labels — just the two recognizable icons
- Same hover/click behavior as current WhatsApp button
- WhatsApp links to `wa.me/85200000000` (existing)
- Telegram links to `t.me/clawhk` (existing)

### 1B. Nav Links — Add "技術" page

Change nav links from:
```
首頁 / 收費 / 常見問題 / 聯絡我們
```
To:
```
首頁 / 收費 / 技術 / 常見問題 / 聯絡我們
```

"技術" links to `/technology` (new page built in Part 3).

Update both desktop nav AND mobile hamburger menu AND footer nav.

---

## PART 2: Landing Page Overhaul

**IMPORTANT:** The final landing page has exactly 11 sections in this order. Some sections already exist (reuse them), some are NEW (build them), one is DELETED.

### Section 1: Hero (REWRITE)

Replace the current hero entirely. New structure:

**Left column:**
```
最強 AI 智能體                                    ← H1, big
ChatGPT 做不到的，它全部做到。                      ← H2, subheadline

提供 Telegram ID → 付款 → 最快 30 分鐘內上線        ← small process line, muted text

[立即開始 →]     [了解更多 ↓]                       ← primary + secondary CTA
```

Remove the old headline "擁有你自己的 AI 助手" and subheadline "記住你、幫助你、24/7 隨時待命".
Remove the old eyebrow text "遠程安裝 · 私人專屬 · 香港本地支援".

**Right column:** Auto-rotating Telegram mockup (see Section 1B below).

**Below the two columns (full width):** 4 Tech Plugin Cards (see Section 1A below).

#### Section 1A: Tech Plugin Cards (NEW)

4 floating cards in a row below the hero columns. Each card shows:
- **Chinese benefit** in large readable text (this is what users care about)
- **English tech name** in small muted text underneath (credibility for tech-curious)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  永久記憶      │  │  全網搜尋     │  │  自動修復     │  │  代你上網     │
│  Mem0+Qdrant  │  │   SearXNG    │  │   Watchdog   │  │  Chromium    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

Design: Dark cards matching current card style, with subtle coral border/glow. On mobile: 2x2 grid.

#### Section 1B: Auto-Rotating Telegram Mockup (REWRITE)

Replace the current static restaurant mockup with 3 auto-rotating demo cases. Each case rotates every 6 seconds with a crossfade transition. Show swipeable dots on mobile.

**IMPORTANT: Only show things ChatGPT CANNOT do.** Each demo must show memory + at least one other capability.

**Case 1 — Browser + Memory (concert tickets):**
```
👤 上次我說想去看陳奕迅，幫我買演唱會飛
🤖 記得！你之前提過想坐 $680 價位 🎤
   正在瀏覽 Ticketmaster...
   ✅ 4月12日 紅館 — $680 山頂位 有票
   ✅ 4月13日 紅館 — $680 已售罄
   要我直接幫你下單 4月12日的嗎？
```

**Case 2 — Browser + Booking (restaurant):**
```
👤 幫我去 OpenRice 訂今晚 8 點旺角日本菜
🤖 已在 OpenRice 搜尋... 推薦 3 間有位：
   🍣 鮨銀座 — 評分 4.8 — 今晚 8 點有位
   🍜 牛角 — 評分 4.2 — 需等 15 分鐘
   要我幫你預訂鮨銀座嗎？
```

**Case 3 — Search + Memory (work scenario):**
```
👤 幫我搜尋競爭對手上季財報，整理成我慣用的格式
🤖 記得你喜歡用「摘要 → 數據 → 分析」三段格式 📊
   正在搜尋最新財報數據...
   ✅ 已找到 3 間競爭對手的 Q4 報告
   整理中，約 2 分鐘後完成。
```

---

### Section 2: FOMO Banner (NEW — build from scratch)

Full-width dark section with cinematic feel. Large centered text, subtle coral text glow or gradient animation:

```
2026 年，AI 智能體正在取代傳統聊天機器人及大量傳統文書工作。
全球已有超過 200 萬人每週使用開源 AI 智能體。
你還在用受限的 ChatGPT 嗎？
```

Design: dramatic dark background (darker than page bg), large serif-like or bold text, centered. Short section — just text, no cards or images.

---

### Section 3: Repositioning Bridge (NEW — build from scratch)

Single centered text block, no cards or decorations:

> **這不是普通聊天機器人 — 是真正幫你做事的 AI 智能體。**
> 搜尋資料、整理日程、處理文件 — 從回答問題到動手執行，全部在 Telegram 完成。

First line is bold/large. Second line is regular weight, slightly smaller. Centered, generous padding above and below.

---

### Section 4: Credibility + Tech Stack (NEW — build from scratch)

This is a powerful 3-layer section. Build all 3 layers as one continuous section.

**Layer A — Platform Foundation + Stats:**

Centered heading:
```
基於全球排名第一的開源 AI 智能體平台打造
BUILT ON THE #1 OPEN-SOURCE AI AGENT
```
(English tagline in smaller muted text below Chinese heading)

Below: 4 stat cards in a row:
```
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│200,000+│  │35,000+ │  │  2M+   │  │ Top 50 │
│GitHub ⭐│  │  Forks │  │ Weekly │  │ GitHub │
│        │  │        │  │ Users  │  │ Global │
└────────┘  └────────┘  └────────┘  └────────┘
```

**Layer B — Plugin Ecosystem:**

```
我們不只是安裝 — 我們打造了一整套獨家插件生態系統
經過數月研究、調試與深度整合，遠超原版 OpenClaw

EXCLUSIVE PLUGIN ECOSYSTEM · EXTENSIVELY TESTED

由資深工程團隊打造 · 服務覆蓋全球
10+ 年系統架構經驗 · 企業級部署標準
```
(Verify team experience years — adjust to reality.)

**Layer C — 6 Tech Stack Cards:**

Heading: `採用頂級開源技術深度整合`

6 cards in 3x2 grid. Each card has: tech name, one-line Chinese description, "了解更多 →" link to /technology page.

```
OpenClaw          │  Mem0 + Qdrant      │  SearXNG
#1 AI 智能體       │  向量級永久記憶       │  突破 AI 搜尋封鎖
了解更多 →         │  了解更多 →          │  了解更多 →
───────────────────┼─────────────────────┼──────────────────
WireGuard          │  Chromium           │  Docker
軍事級 VPN 隧道    │  AI 代你操作瀏覽器    │  容器化一鍵部署
了解更多 →         │  了解更多 →          │  了解更多 →
```

All "了解更多 →" links navigate to `/technology`.

---

### Section 5: Use Cases (KEEP — already exists, correct position)

Keep the existing "它可以幫你做甚麼？" section with 6 cards exactly as-is. No changes needed.

---

### Section 6: Video Demo Slot (NEW — build from scratch)

Placeholder section for a future video. For now, show a static Telegram screenshot placeholder:

```
👀 看看實際使用效果

┌─────────────────────────────┐
│                             │
│   [Phone frame mockup]      │
│   Show placeholder text:    │
│   "真實對話截圖即將推出"      │
│                             │
└─────────────────────────────┘

真實對話截圖 · 非模擬畫面
```

Design: Centered phone frame with a dashed border placeholder inside. "真實對話" badge below for authenticity. This will be replaced with a real screenshot/video later.

---

### Section 7: "適合你嗎？" Qualifier (NEW — build from scratch)

Honest qualifier section that builds trust by showing who should NOT buy:

Heading: **適合你嗎？**

```
✅ 想要 AI 助手但不懂技術 — 適合
✅ 重視私隱，不想資料交給 OpenAI — 適合
✅ 想要 AI 幫你做事，不只是聊天 — 適合
❌ 本身已懂 Docker / Linux 自己安裝 — 可能不需要我們
```

Design: Single centered card with padding. ✅ items in green-ish text, ❌ item in muted grey. Quiet, honest tone — no bold headlines.

---

### Section 8: Before/After Comparison (MOVE — already exists)

Move the existing "自己安裝 vs 找我們" comparison table from its current position (section 2) to here (section 8). No content changes needed.

---

### Section 9: How It Works (MOVE — already exists)

Move the existing "三步完成" section from its current position (section 4) to here (section 9). No content changes needed.

---

### Section 10: Social Proof (MOVE + REWRITE content)

Move the existing "我們的故事" section here (from current section 6).

**Replace the builder story text.** Change from:
> 「我們是一群香港 IT 人，自己使用 OpenClaw 幾個月，覺得非常好用但太難安裝。所以我們推出了這個服務 — 幫你省下那幾個小時的痛苦。」

To:
> 我們是三個在香港做 IT 超過十年的工程師。半年前自己裝了 OpenClaw，用過之後再也回不去 ChatGPT。但安裝過程極其複雜 — Linux 指令、伺服器設定、VPN 配置、記憶系統串接 — 非技術人員根本無法完成。所以我們把整個安裝過程產品化，讓任何人都能用到這套系統。

(Adjust team size and years to match reality.)

Keep the "Early Access 用戶評價" placeholder below, but remove the visible dashed border box — just show a text note "用戶評價即將推出" in muted text. Don't show an empty box.

---

### Section 11: Final CTA (MERGE Trust Bar into CTA)

Merge the current Trust Bar (4 icons) INTO the Final CTA section. They become one section:

```
[Trust bar icons in a row: 🔒 資料在你機器 | 💬 香港支援 | 🔓 不綁約 | 💰 無隱藏費用]

準備好擁有你自己的 AI 助手了嗎？
最快今天安裝，今晚就能使用。

由 HK$148/月起 — 每日不到 HK$5          ← NEW price anchor line

[查看收費方案 →]  [WhatsApp 聯絡我們]
```

The price anchor "由 HK$148/月起 — 每日不到 HK$5" is the key addition here.

---

### DELETE: Feature Cards Section

Remove the existing "你的 AI 助手有甚麼不同？" section with 4 cards (記住你 / 上網找資料 / 不會停機 / 私隱). This is redundant — the tech plugin cards + use cases + credibility section now cover everything.

---

## PART 3: New /technology Page

Create a new page at `/technology`.

**Page headline:** 我們的獨家技術生態系統
**Subtext:** 經過數月研究與深度整合，每個組件都經過嚴格測試。這不是原版 OpenClaw — 這是完整的 AI 生態系統。

6 technology sections, each with a bold headline, 2-3 sentence description, and why it matters:

**1. OpenClaw — 全球第一開源 AI 智能體框架**
200,000+ GitHub Stars，全球 200 萬人每週使用。我們基於此平台深度定製，加入獨家插件生態，打造遠超原版的完整系統。

**2. Mem0 + Qdrant — 向量級永久記憶 — AI 最強大腦**
不是 ChatGPT 那種 100 條記憶上限。基於 Qdrant 向量資料庫 + Mem0 記憶引擎，你說過的每一句話，它永遠記得。三個月前提過的偏好？它記得。越用越聰明，越用越了解你。

**3. SearXNG — 突破 AI 搜尋封鎖 — 全網搜尋引擎**
ChatGPT 的搜尋被大量網站封鎖 — Reddit、論壇、部分新聞網站都搜不到。SearXNG 是自架元搜尋引擎，bypass 所有 AI 搜尋封鎖，即時搜尋全網資訊。ChatGPT 搜不到的，它搜得到。

**4. WireGuard — 軍事級 VPN 隧道 — 永不中斷**
新一代 VPN 協議，加密強度媲美軍事級。內建多伺服器自動切換（東京 → 新加坡），VPN 斷線時 Watchdog 自動重連，確保 AI 服務 24/7 不中斷。你完全不需要處理。

**5. Chromium Headless — AI 代你操作瀏覽器 — 不只聊天，真正做事**
無頭瀏覽器自動化引擎。AI 直接操作瀏覽器幫你填表、格價、訂位、搶票、查評價。不只是回答問題 — 是真正動手幫你完成任務。（🚀 全能大師 專屬功能）

**6. Docker — 容器化一鍵部署 — 企業級標準**
整套系統以 Docker 容器化部署。環境完全隔離，安全穩定，一鍵啟動。需要遷移？打包整個系統搬到新伺服器，資料完整保留。這是企業用的部署標準。

**Bottom CTA:**
> 想了解更多？→ 查看收費方案 | WhatsApp 聯絡我們

Use the same page layout style as the FAQ page — clean heading + content sections.

---

## PART 4: Bug Fixes & Content Corrections

### 4A. Pricing Page — Remove "Claude" from Tier 3

In the pricing page, Tier 3 (全能大師) currently lists AI models as "DeepSeek + GPT-4.1 + Claude".

**Remove "Claude"** — change to "DeepSeek + GPT-4.1".

Reason: Claude API is restricted in Hong Kong. Do not advertise it.

Also update the Knowledge File (00-knowledge-file.md) tier features table to match.

### 4B. Pricing Page — Fix mobile tier order

The code defines `mobileOrder = [1, 0, 2]` to show Tier 2 (智能管家) first on mobile, but it's not actually applied to the card rendering. Fix this so mobile users see 智能管家 first.

### 4C. FAQ Page — Update builder story

Change the answer to "你們是誰？" from:
> 一群香港 IT 人，自己使用 OpenClaw 幾個月，覺得非常好用但太難安裝。所以推出了這個服務，幫大家省下那幾個小時的痛苦。

To match the new builder story:
> 我們是三個在香港做 IT 超過十年的工程師。半年前自己裝了 OpenClaw，用過之後再也回不去 ChatGPT。但安裝過程極其複雜 — Linux 指令、伺服器設定、VPN 配置、記憶系統串接 — 非技術人員根本無法完成。所以我們把整個安裝過程產品化，讓任何人都能用到這套系統。

### 4D. Contact Page — Replace empty Tally.so placeholder

The current contact page has a visible empty dashed-border box labeled "Tally.so 表單嵌入位置". This looks broken/unfinished.

Replace it with a simple inline form (name, contact method dropdown, message) that submits to nothing for now — or just remove the empty box and add a line:
> 直接用 WhatsApp 或 Telegram 聯絡我們最快！

### 4E. Footer — Add 技術 link

Add "技術" to the footer nav links, matching the new navbar order.

### 4F. Pricing Page — Add Checkout Placeholder (for Phase 1 Lemon Squeezy)

Each pricing tier's CTA button currently links to WhatsApp. **Keep that behavior for now**, but structure the buttons so they can easily be swapped to a Lemon Squeezy checkout embed later:

- Each tier CTA should have a `data-tier` attribute (`starter`, `smart`, `master`) and a `data-price-id` attribute (leave empty string for now)
- Add a small muted line below the payment methods section:
  > 信用卡 / Visa / Mastercard 自動扣款即將推出

This prepares for Phase 1 integration without building anything now.

---

## What NOT to Change

- **All visual styling** (colors, fonts, shadows, animations, dark theme) — unchanged, saved for Prompt B
- **Pricing page structure** (tiers, comparison table, add-ons) — unchanged except Claude removal
- **FAQ page structure** — unchanged except builder story fix
- **Contact page structure** — unchanged except Tally.so fix
- **Floating WhatsApp button** — unchanged
