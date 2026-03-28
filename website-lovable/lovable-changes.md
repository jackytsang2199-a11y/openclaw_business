# Lovable Change Log — Final Agreed Changes

> Track all agreed changes for consolidated Lovable prompt.
> Research: See [research-summary.md](research-summary.md) for full findings.
> Reviews: See agent reviews from UX expert, HK consumer, and copywriter.

---

## Agreed Changes

### 1. Nav CTA — WhatsApp + Telegram Icons
- Single button area with WhatsApp icon + Telegram icon (not two separate buttons)
- Clean, no text clutter — just recognizable icons side by side

### 2. Hero Headline + Gradient Fix
```
最強 AI 智能體                            ← main headline (bold, not extrabold — see below)
ChatGPT 做不到的，它全部做到。             ← sub-headline
搜尋資料、整理日程、處理文件 — 全部在 Telegram 完成。  ← merged from deleted Section 5

提供 Telegram ID → 付款 → 最快 30 分鐘內上線   ← process line
```

**NEW (2026-03-23 design review) — Hero gradient contrast fix:**
Current gradient has ~2.8:1 contrast ratio for white text (fails WCAG AA 4.5:1).
```
Old: linear-gradient(135deg, #E8D5C4 0%, #F5C6AA 30%, #E6A889 60%, #D4826A 100%)
New: linear-gradient(135deg, #C49A7E 0%, #B87A5E 40%, #A35D40 70%, #8B3D28 100%)
```
- Primary CTA on hero: change from coral to **white button** — `bg-white text-[#A35D40]` for max contrast
- H1 weight: change `font-extrabold` (800) to `font-bold` (700) — Chinese characters at extrabold are too dense
- **Show Telegram mockup on mobile** — remove `hidden lg:block`, show scaled-down version below hero text

### 3. Hero — Tech Plugin Cards (benefit-first, tech name small)
Floating cards below hero with glow effects. **Benefit in big text, tech name tiny underneath:**
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  永久記憶      │  │  全網搜尋     │  │  自動修復     │  │  代你上網     │
│  Mem0+Qdrant  │  │   SearXNG    │  │   Watchdog   │  │  Chromium    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```
- Dark cards with subtle coral border/glow
- Chinese benefit = big readable text (what users care about)
- English tech name = small grey text underneath (credibility for tech-curious)
- Floating animation or subtle pulse effect

### 4. Telegram Mockup — Auto-Rotating (ONLY impressive demos)
Only show things ChatGPT CANNOT do. Remove basic stuff (exchange rates, report writing).

**Case 1 — Browser + Buying (with memory):**
```
👤 上次我說想去看陳奕迅，幫我買演唱會飛
🤖 記得！你之前提過想坐 $680 價位 🎤
   正在瀏覽 Ticketmaster...
   ✅ 4月12日 紅館 — $680 山頂位 有票
   ✅ 4月13日 紅館 — $680 已售罄
   要我直接幫你下單 4月12日的嗎？
```

**Case 2 — Browser + Booking:**
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

(Each case shows memory + at least one other capability. ~6 seconds per case, swipeable dots on mobile.)

### 5. Repositioning Bridge — DELETED (was REVISED, now MERGED INTO HERO)
> ~~**這不是普通聊天機器人 — 是真正幫你做事的 AI 智能體。**~~

**Decision (2026-03-23 design review):** This section is redundant with the hero subtitle ("ChatGPT 做不到的，它全部做到。"). Two sections saying "not a chatbot" wastes scroll depth. Delete entirely.

**Merge into hero subtitle instead:**
```
ChatGPT 做不到的，它全部做到。
搜尋資料、整理日程、處理文件 — 全部在 Telegram 完成。
```
The key phrase "全部在 Telegram 完成" is preserved as a second line in the hero, grounding the experience in a familiar interface without needing a separate section.

### 6. Feature Cards (old badge-style) — DELETED
Removed. Tech plugin cards + use cases + rotating mockup already communicate everything.

> **Clarification (2026-03-23):** This refers to the old "feature badges" section (text pills like "永久記憶", "全網搜尋"). The **Use Case cards** (6 scenario cards: 每日智能工作、個人知識助手 etc.) are a DIFFERENT section and are KEPT — see Section 15 item 5.

### 7. NEW: Price Anchor on Landing Page
Add one line near Final CTA section:
> **由 HK$148/月起 — 每日不到 HK$5**

Visitors shouldn't need to click to pricing page to know the ballpark cost.

### 8. NEW: "適合你嗎？" Qualifier Section (after Use Cases)
Honest qualifier that builds trust by showing who should NOT buy:

> **適合你嗎？**
> ✅ 想要 AI 助手但不懂技術 — 適合
> ✅ 重視私隱，不想資料交給 OpenAI — 適合
> ✅ 想要 AI 幫你做事，不只是聊天 — 適合
> ✅ 本身已懂技術？你可以自己安裝，或者讓我們幫你省時間。
>
> **Updated (2026-03-23 design review):** Changed negative qualifier from "❌ 可能不需要我們" (actively pushes visitors away) to positive reframe that retains honesty but redirects to conversion. Use `text-muted-foreground` styling for this last item to visually de-emphasize, but keep the check mark green.

### 9. NEW: Builder Story Rewrite (with specifics)
Replace generic "一群香港 IT 人" with specific, personality-driven story:

> 我們是三個在香港做 IT 超過十年的工程師。半年前自己裝了 OpenClaw，用過之後再也回不去 ChatGPT。但安裝過程極其複雜 — Linux 指令、伺服器設定、VPN 配置、記憶系統串接 — 非技術人員根本無法完成。所以我們把整個安裝過程產品化，讓任何人都能用到這套系統。

(Adjust team size and years to match reality.)

### 10. Trust Signals
- ✅ "WhatsApp 2 小時內回覆" — add to contact page
- ❌ No refund guarantee
- ❌ No user counter
- ❌ No "限量接單"
- Keep existing "首 20 位客戶安裝費半價" promo only

### 11. NEW: FOMO Banner — SLIM STRIP (after hero)
**Updated (2026-03-23 design review):** Changed from full `py-20` section to slim `py-8` banner strip. A full dark section creates transition shock from the warm hero. Slim strip preserves urgency without wasting scroll depth.

```
┌─────────────────────────────────────────────────────────────────────┐
│  2026 年，AI 智能體正在取代傳統聊天機器人。全球超過 200 萬人每週使用。│
│  你還在用受限的 ChatGPT 嗎？                                        │
└─────────────────────────────────────────────────────────────────────┘
```
Design:
- `py-8` not `py-20` — compact urgency strip, not a full section
- `bg-[#1E1518]` (slightly warmer dark) with `border-t border-primary/10` for smooth transition
- Single-line on desktop, two lines on mobile
- `text-base` centered, no heavy glow animation

### 12. Credibility + Tech Stack — SPLIT INTO 12A + 12B (was single merged section)

**Updated (2026-03-23 design review):** The original 3-layer merged section was too dense — heading → cards → heading → paragraph → heading → cards is exhausting. Split into two distinct sections with breathing room.

#### 12A. Compact Stat Strip (directly after FOMO banner)
A single horizontal row, no cards — just bold numbers with small labels. Like a social proof bar.
```
基於全球排名第一的開源 AI 智能體平台打造

200,000+ GitHub Stars  ·  35,000+ Forks  ·  2M+ Weekly Users  ·  Top 50 GitHub Global
```
Design:
- `bg-section-alt`, `py-12` — not a full section, more like a credibility strip
- Numbers in `text-2xl font-bold`, labels in `text-xs text-muted-foreground`
- Single inline row on desktop, 2x2 grid on mobile
- Add small "OpenClaw 開源社區" label so stats aren't mistaken for ClawHK's own numbers
- Optional: link "OpenClaw" text to their GitHub repo for verification

#### 12B. Our Plugin Ecosystem + Tech Stack Cards (separate section)
```
我們不只是安裝 — 我們打造了一整套獨家插件生態系統
經過數月研究與深度整合，遠超原版 OpenClaw
```
Team tagline: "3 位工程師 · X 年經驗" (with small avatar placeholders — more verifiable than "由資深工程團隊打造")
(Verify team size and experience years — adjust to reality.)

**Tech Stack Cards (link to /technology page):**
```
┌─────────────────────────────────────────────────────────────────────┐
│                 採用頂級開源技術深度整合                               │
│                                                                     │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│   │    OpenClaw      │  │   Mem0 + Qdrant │  │     SearXNG     │   │
│   │  #1 AI 智能體    │  │  向量級永久記憶   │  │ 突破 AI 搜尋封鎖 │   │
│   │   了解更多 →     │  │   了解更多 →     │  │   了解更多 →    │   │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                     │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│   │   WireGuard      │  │    Chromium     │  │     Docker      │   │
│   │  軍事級 VPN 隧道 │  │  AI 代你操作瀏覽器│  │  容器化一鍵部署  │   │
│   │   了解更多 →     │  │   了解更多 →     │  │   了解更多 →    │   │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
All "了解更多 →" links go to **/technology** page (see item 14).

### 13. NEW: Video Demo Slot (after Use Cases)
Placeholder for a looping video/GIF of real Telegram conversation:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    👀 看看實際使用效果                                │
│                                                                     │
│              ┌─────────────────────────────┐                        │
│              │                             │                        │
│              │   [VIDEO / GIF PLACEHOLDER] │                        │
│              │   15-30 second loop of      │                        │
│              │   real Telegram conversation │                        │
│              │                             │                        │
│              └─────────────────────────────┘                        │
│                                                                     │
│              真實對話截圖 · 非模擬畫面                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
- Phase 0: Show static Telegram screenshots (from your own instance)
- Phase 1: Replace with 15-30s looping screen recording GIF
- Design: Phone frame mockup, centered, with "真實對話" badge for authenticity
- Video content to be discussed further

### 14. NEW: /technology Page (5th page)
New page linked from tech stack cards. Each tech gets a section with:
- Explosive headline
- 2-3 sentence description
- Why it matters vs ChatGPT
- Visual: icon or small diagram

**Page URL:** /technology
**Nav:** Add "技術" to nav between 常見問題 and 聯絡我們

**Content:**

**Page headline:** 我們的獨家技術生態系統
**Subtext:** 經過數月研究與深度整合，每個組件都經過嚴格測試。這不是原版 OpenClaw — 這是完整的 AI 生態系統。

| # | Tech | Explosive Headline | Description |
|---|---|---|---|
| 1 | **OpenClaw** | 全球第一開源 AI 智能體框架 | 200,000+ GitHub Stars，全球 200 萬人每週使用。我們基於此平台深度定製，加入獨家插件生態，打造遠超原版的完整系統。 |
| 2 | **Mem0 + Qdrant** | 向量級永久記憶 — AI 最強大腦 | 不是 ChatGPT 那種 100 條記憶上限。基於 Qdrant 向量資料庫 + Mem0 記憶引擎，你說過的每一句話，它永遠記得。三個月前提過的偏好？它記得。越用越聰明，越用越了解你。 |
| 3 | **SearXNG** | 突破 AI 搜尋封鎖 — 全網搜尋引擎 | ChatGPT 的搜尋被大量網站封鎖 — Reddit、論壇、部分新聞網站都搜不到。SearXNG 是自架元搜尋引擎，**bypass 所有 AI 搜尋封鎖**，即時搜尋全網資訊。ChatGPT 搜不到的，它搜得到。 |
| 4 | **WireGuard** | 軍事級 VPN 隧道 — 永不中斷 | 新一代 VPN 協議，加密強度媲美軍事級。內建多伺服器自動切換（東京 → 新加坡），VPN 斷線時 Watchdog 自動重連，確保 AI 服務 24/7 不中斷。你完全不需要處理。 |
| 5 | **Chromium Headless** | AI 代你操作瀏覽器 — 不只聊天，真正做事 | 無頭瀏覽器自動化引擎。AI 直接操作瀏覽器幫你填表、格價、訂位、搶票、查評價。不只是回答問題 — 是真正動手幫你完成任務。（🚀 全能大師 專屬功能） |
| 6 | **Docker** | 容器化一鍵部署 — 企業級標準 | 整套系統以 Docker 容器化部署。環境完全隔離，安全穩定，一鍵啟動。需要遷移？打包整個系統搬到新伺服器，資料完整保留。這是企業用的部署標準。 |

**Bottom CTA:** 想了解更多？→ 查看收費方案 | WhatsApp 聯絡我們

### 15. Section Reorder (Landing Page — FINAL v5)
**Updated (2026-03-24 Contabo research):** 10 → 12 sections. Added Integration Logo Strip and Inline FAQ based on Contabo product page template analysis. See [contabo-design-research.md](contabo-design-research.md).

1. **Hero** (H1 + 3 checkmarks + tech plugin cards + auto-rotating mockup visible on ALL devices — see item #17)
2. **FOMO slim strip** (`py-8` urgency banner, not full section)
3. **Stat strip** (compact OpenClaw community numbers — clearly labelled as open-source stats)
4. **Plugin Ecosystem + Tech Stack** (team tagline + 6 tech cards → /technology)
5. **Use Cases** (6 cards — benefit-first headings per item #18, improved styling: no italic Chinese, color-coded tags, left accent borders)
5.5. **Mid-page CTA strip** (`py-8`, single line: `由 HK$148/月起 — 立即開始` button. Early exit ramp for convinced visitors. 12 sections is long — this prevents losing conversions.)
6. **Video Demo slot** (placeholder for real Telegram recording)
7. **"適合你嗎？" qualifier** (all positive framing — see updated item #8)
8. **Before/After comparison** (self-install vs us — highlight ClawHK column with `bg-primary/5`)
9. **How It Works** (3 steps — **LIGHT background** `bg-section-alt`, not dark. Numbered circles replace emoji. Connecting line between steps on desktop.)
10. **Integration Logo Strip** (NEW — see item #20. Visual proof of ecosystem breadth.)
11. **Inline FAQ** (NEW — see item #21. 4 top questions from /faq, accordion style, reduces bounce.)
12. **Social Proof + Final CTA** (revised builder story + trust mantra `真人團隊。真正解答。` + trust bar as pill badges + price anchor: 由 HK$148/月起 in `text-lg font-semibold`)

### 16. Nav Update
Add /technology page to navigation:
```
首頁 / 收費 / 技術 / 常見問題 / 聯絡我們
```
(5 pages total, up from 4)

---

## Contabo-Inspired Additions (2026-03-24)

> Source: [contabo-design-research.md](contabo-design-research.md) — comprehensive analysis of 8 Contabo pages.
> These are NEW content/structure changes identified from competitive research. Design/visual fixes remain in the "Design Review Fixes" section above.

### 17. Hero: 3 Checkmarks Below H1

Contabo pattern: every product page opens with H1 + 3 compact trust checkmarks. Currently our hero has headline + sub-headline + process line — too much text competing for attention.

**Replace sub-headline context line with 3 checkmarks (fewer text layers, more scannable):**
```
最強 AI 智能體                                        ← H1
ChatGPT 做不到的，它全部做到。                          ← sub-headline

✔️ 無需技術知識  ✔️ Telegram / WhatsApp 直接使用  ✔️ 記得你的所有對話    ← NEW (replaces context line)

提供 Telegram ID → 付款 → 最快 30 分鐘內上線           ← process line
```
> **Why remove the context line** (`搜尋資料、整理日程、處理文件 — 全部在 Telegram 完成`): The checkmarks already communicate "what it does" more scannably. 7 text layers in hero is too many — Contabo proves H1 + sub + checkmarks + CTA is enough. The tech plugin cards (#3) and mockup (#4) handle the visual "what it does" role.
Design:
- Checkmarks in a single row on desktop, stacked on mobile
- `text-base text-white/90` — slightly muted vs H1 but still readable
- Green checkmark icons (Lucide `Check` in circle) not emoji
- Compact — max one line on desktop

### 18. Benefit-First Section Headings (Copywriting Refresh)

Contabo never leads with tech jargon in headings — always benefit first. Rewrite ALL section H2s across the site.

| Current Heading | Benefit-First Rewrite |
|---|---|
| `它可以幫你做甚麼？` (Use Cases) | `你的助手，能做什麼？` |
| `三步完成` (How It Works) | `三步開始使用` |
| `適合你嗎？` | Keep — already benefit-framed |
| `我們的故事` (Builder Story) | `我們為什麼做這件事` |
| `自己安裝 vs 找我們` (Comparison) | `省時間，不是學技術` |
| `採用頂級開源技術深度整合` (Tech Stack) | `背後的技術` |
| Pricing page H1 | `選擇最適合你的方案` |
| FAQ page H1 | `有問題？` (short, with subtitle: `我們已經準備好答案`) |
| Contact page H1 | `隨時聯絡我們` |

Also adopt the **two-word tagline pattern** for sub-headings where appropriate:
- `對話。記憶。行動。` — below hero or stat strip
- `安裝。使用。忘記技術。` — below How It Works heading
- `你的伺服器。你的數據。` — below security/privacy mention

### 19. Pricing Card Spec Grids

Contabo pricing cards show specs in a **clean horizontal grid** (CPU | RAM | Storage | Port), not bullet lists. Our current pricing cards list features as text bullets — less scannable.

**Change pricing card layout from bullet list to spec grid:**
```
┌─────────────────────────────────────┐
│  ⭐ 智能管家                         │
│                                     │
│  ┌────────┬────────┬────────┐       │
│  │  VPS   │  記憶   │  搜尋  │       │
│  │  4 核   │  ✓     │  ✓    │       │
│  │  8GB   │ Mem0   │ SearXNG│       │
│  └────────┴────────┴────────┘       │
│                                     │
│  HK$248/月                          │
│  安裝費 HK$800 → HK$400             │
│                                     │
│  [立即開始]                          │
└─────────────────────────────────────┘
```
Design:
- Spec grid: 3 columns (VPS | 記憶 | 搜尋) with icons above labels
- Feature availability shown with Lucide Check/X icons (green/grey)
- Grid replaces current feature bullet list — same info, more scannable
- 智能管家 card: `md:scale-105` (already in Prompt C P0)

### 20. Integration Logo Strip (NEW section)

Contabo has a dedicated "What Can You Integrate?" logo grid on every product page. We mention WhatsApp/Telegram in text but never show logos — visual proof of ecosystem breadth.

**Add after How It Works (section 10 in v5 reorder):**
```
支援你常用的平台

[WhatsApp logo]  [Telegram logo]  [Discord logo]  [Slack logo]  [OpenClaw logo]  [DeepSeek logo]
```
Design:
- Single row of greyscale logos, color on hover
- `py-12 bg-white` — lightweight visual break, not a heavy section
- Logos at ~40px height, uniform, with `grayscale hover:grayscale-0 transition`
- Caption: `支援你常用的平台` in `text-sm text-muted-foreground` centered above
- On mobile: 2 rows of 3

### 21. Inline FAQ on Landing Page (NEW section)

Contabo puts FAQ on EVERY product page — not just a dedicated route. This catches visitors who scroll to the bottom with objections but won't navigate to /faq.

**Add 4 top questions from /faq page as accordion, before Final CTA (section 11 in v5 reorder):**
```
常見問題

▸ 我完全不懂技術，適合使用嗎？
  適合！整個安裝、設定、維護過程由我們處理...

▸ 月費包含什麼？
  一個月費包含 VPS 伺服器、API 使用費、VPN、維護...

▸ 跟 ChatGPT Plus 有什麼分別？
  ChatGPT Plus 是聊天機器人，我們安裝的是 AI 智能體...

▸ 如何開始使用？
  提供你的 Telegram ID，選擇方案付款，我們最快 30 分鐘內完成安裝...

[查看所有常見問題 →]  ← link to /faq
```
Design:
- `bg-section-alt py-16` — light alternating background
- Accordion style matching /faq page component (reuse existing FAQ accordion component)
- "查看所有常見問題 →" link at bottom
- Only 4 questions — enough to handle top objections, not enough to make /faq redundant

### 22. Trust Mantra + CTA Copywriting Refresh

Contabo repeats "Real people. Real answers." as a mantra across multiple pages. We need our own equivalent woven throughout the site.

**Trust mantra:** `真人團隊。真正解答。`

Places to insert:
- Social Proof section (section 12) — as a heading or sub-heading
- Contact page — below the page title
- Footer — as a tagline next to the logo
- WhatsApp/Telegram links — as tooltip or small text underneath

**CTA button text refresh** (replace generic "了解更多"):
| Current | New |
|---|---|
| `了解更多` (generic) | `查看方案` (pricing) / `立即開始` (hero) / `免費諮詢` (contact) |
| `聯絡我們` (vague) | `WhatsApp 聯絡我們` (specific channel) |
| Hero primary CTA | `立即開始` |
| Pricing card CTA | `選擇此方案` |
| Final section CTA | `由 HK$148/月起 — 立即開始` |

---

## Future Ideas (not in this prompt, do later)

| Idea | Description | When |
|---|---|---|
| Memory Timeline | Scrolling demo showing AI getting smarter over 60 days | After launch, when have real data |
| Time-personalized CTA | "現在是晚上 8 點，今晚裝好明朝返工用" | Claude Code phase (few lines of JS) |
| Telegram channel for leads | "想先觀望？加入頻道" — captures interested non-buyers | After launch |
| Mobile pricing: tabbed layout | One tier at a time instead of 3-column table, 智能管家 pre-selected | Claude Code phase |
| Real demo video | 30-sec screen recording of actual Telegram conversation | When OpenClaw instance is running |
| Competitor comparison table | Add Poe / Perplexity / Claude.ai row | After launch |
| **Lemon Squeezy Checkout** | Embed Visa/MC checkout on pricing page. Lemon Squeezy = MoR, 唔需要 BR。支援 recurring 月費自動扣款 | **Phase 1 — Soft Launch** |

---

## Rejected

- ~~軍事級私隱（數據零外洩）~~ — removed from badges
- ~~東京機票 mockup~~ — replaced with auto-rotating demos
- ~~Exchange rate + report writing mockup~~ — too basic, ChatGPT already does this
- ~~Visa/Master "coming soon"~~ — Phase 1 用 Lemon Squeezy 實現，見 business plan §8
- ~~全球最強~~ — too bold
- ~~Question hook headline~~ — removed, keep hero clean
- ~~Feature badges as text pills~~ — replaced with floating tech cards
- ~~Feature cards section~~ — redundant, deleted
- ~~7 日退款保證~~ — removed
- ~~"像真人一樣操作電腦"~~ — overpromises, replaced with grounded copy
- ~~Tech jargon as primary text~~ — flipped to benefit-first, tech name small

---

## Prompt Drafting — COMPLETED

Two sequential prompts created. Apply in order:

### Prompt A: Content + Structure → [08-prompt-A-content-structure.md](08-prompt-A-content-structure.md)
- All 16 agreed changes from this document
- Landing page reorder to final 11-section flow
- 5 new sections + /technology page
- Nav, content, and bug fixes
- **Does NOT change visual styling**

### Prompt B: Visual Design Overhaul → [09-prompt-B-visual-design.md](09-prompt-B-visual-design.md)
- Dark mode → warm cream light mode (Superhuman-inspired)
- New color palette, typography, card styling
- Hero gradient, ghost CTAs, no shadows
- **Does NOT change content or structure**

### Superseded file
- [07-prompt-design-overhaul.md](07-prompt-design-overhaul.md) — earlier draft, superseded by 09. Keep for reference only.

### Prompt C: Design Review Fixes → [10-prompt-C-design-review-fixes.md](10-prompt-C-design-review-fixes.md)
- 17 visual-only fixes from professional UI audit
- CSS tokens, contrast, typography, spacing
- **Does NOT change content or structure**

### Prompt D: Contabo-Inspired Additions → [11-prompt-D-contabo-inspired.md](11-prompt-D-contabo-inspired.md)
- Items #17-22 from "Contabo-Inspired Additions" section
- Hero checkmarks, benefit-first headings, spec grids, integration logos, inline FAQ, trust mantra
- Mid-page CTA strip (early conversion exit ramp)
- Section reorder v5 (10 → 12 sections)
- **Content + structure changes, NOT visual styling**

### Execution order
```
1. Apply Prompt A → verify all content/sections correct
2. Apply Prompt B → verify visual overhaul looks right
3. Apply Prompt C → verify design fixes look right
4. Apply Prompt D → verify Contabo-inspired additions
5. Manual polish if needed
```

---

## Design Review Fixes — Merged from Professional Audit (2026-03-23)

> Source: [design-review-professional.md](design-review-professional.md) — full detailed analysis
> These are additional implementation-level fixes identified by the UI designer agent.

### P0 — Must Fix Before Launch

| Fix | Detail |
|-----|--------|
| **Hero gradient contrast** | See item #2 above — new hex values provided |
| **Mobile hero mockup** | Remove `hidden lg:block` from Telegram mockup, show scaled version on mobile |
| **Pricing card hierarchy** | Add `md:scale-105 md:-my-4` to 智能管家 card. Increase its price to `text-4xl md:text-5xl`. Make decoy X marks visible: `text-muted-foreground line-through` |
| **Chinese body text min 16px** | Change all Chinese `text-sm` to `text-base` across all pages. Keep `text-sm` only for English labels/metadata |
| **Promo banner bold** | Change from `bg-accent/50` to `bg-primary text-white` — current banner is invisible |

### P1 — Fix Before Marketing Push

| Fix | Detail |
|-----|--------|
| **Surface contrast tokens** | `--card: 25 60% 96%` (was 25 100% 97%). `--section-alt: 25 30% 90%` (was 93%). Add `--success: 142 60% 40%`, `--primary-light: 14 55% 93%` |
| **Typography standardization** | H1: `text-3xl md:text-5xl font-bold`. H2: `text-2xl md:text-3xl`. H3: `text-xl`. No more `font-extrabold` for Chinese |
| **Spacing standardization** | Card padding: `p-6` (compact) or `p-8` (feature). Kill `p-5` and `p-10`. Content max-width: `max-w-4xl` standard, `max-w-5xl` for grids |
| **How It Works redesign** | Light bg, numbered circles (not emoji), connecting line between steps on desktop |
| **Contact page substance** | Add business hours, replace emoji with Lucide icons, remove redundant "WhatsApp 最快" text, add legal links |
| **Footer enhancements** | Add social icons, legal placeholder links, match payment methods with pricing page, verify text contrast |
| **Nav active state fix** | Use `font-semibold` for both active/inactive (prevent layout shift from bold). Differentiate with color only |
| **ChatGPT comparison table** | Wrap in `rounded-2xl border-2 border-primary/20`. Add `bg-emerald-50` to ClawHK column, `bg-muted/50` to ChatGPT. Remove "差價" row. Replace emoji with Lucide Check/X |

### P2 — Post-Launch Polish

| Fix | Detail |
|-----|--------|
| **Scroll animations** | Add `whileInView` + `fadeUp` to all Index sections (currently only Section 4 has it) |
| **Card micro-interactions** | Add `hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200` to all interactive cards |
| **Telegram mockup accessibility** | Add pause button, `aria-live="polite"`, keyboard navigation for dots |
| **Skip-to-content link** | Add `<a href="#main-content">跳到主要內容</a>` in Layout.tsx before Navbar |
| **Page transitions** | Add `AnimatePresence` around `<Outlet>` in Layout for smooth page navigation |

### Design Direction — Recommended: "Warm Professional"

Keep warm coral identity but push toward mature premium. Think Apple HK meets boutique concierge.
- Deeper gradient (terracotta-to-chocolate), large product screenshot, minimal text
- White cards with shadow-only containment (no borders), generous padding
- `font-bold` not `font-extrabold` for headings, more whitespace
- Deep navy `#1A2332` for dark sections (temperature contrast vs warm plum)
- Real device photos (Pi5, phone with Telegram) instead of pure code mockups
- Target feel: "This costs money, and it's worth every dollar"

---

## Live Website Design Review (2026-03-23)

> Reviewed live dev server at localhost:8080 — all 4 pages (Index, Pricing, FAQ, Contact).
> Reference benchmark: [Contabo OpenClaw Hosting](https://contabo.com/en/openclaw-hosting/)

### Overall Aesthetic Rating: 6.5/10

The foundation is solid — warm coral palette is distinctive, layout is logical, content structure works for target audience. But it currently looks like a **Lovable template with content filled in** rather than a polished brand experience.

### What Works Well

| Area | Notes |
|------|-------|
| **Color palette** | Warm coral/terracotta gradient on hero is distinctive, avoids generic blue SaaS look |
| **Chat mockup** | Auto-rotating Telegram demos immediately communicate "chat-based AI assistant" |
| **Feature icon cards** | 永久記憶、全網搜尋 etc. — clean, scannable layout |
| **自己安裝 vs 找我們 table** | Very effective for non-technical target audience, smart sales tactic |
| **Three-step flow** | 選擇方案 → 我們遠程安裝 → 開始使用 — clear onboarding visualization |
| **Pricing decoy structure** | Three tiers with 智能管家 highlighted works as intended |

### Critical Design Issues

#### 1. Sections 之間完全冇分隔 — 頁面缺乏節奏感
- Sections blend into each other with no visual breaks. White section → white section → white section.
- **Contabo 做得好嘅地方:** Alternating white/light-blue backgrounds, clear section headers with subtitle text, generous spacing between sections.
- **建議:** Alternate background colors (white → cream → white), add subtle dividers or increased padding between sections.

#### 2. Hero 太逼 + 文字對比度不足
- "ChatGPT 做不到的，它全部做到。" grey subtext has poor contrast against the warm gradient.
- Chat mockup competes with headline for visual attention — both are crammed together.
- **建議:** More breathing room between headline and mockup. Increase subtext contrast.

#### 3. Typography 層級不清
- Section headings ("它可以幫你做甚麼？", "適合你嗎？", "三步完成") all look roughly the same size/weight.
- No visual rhythm telling the user "this is a new major section."
- **Contabo 做得好嘅地方:** Clear H2 with smaller subtitle underneath, consistent heading hierarchy throughout.
- **建議:** Establish 3-level heading scale. H2 for section titles (larger), subtitle text below, body text.

#### 4. "我們的故事" 深色 section 突兀
- Only dark-background section on entire page. Appears abruptly. Dense wall of text.
- **建議:** Either make it lighter to match flow, or add a visual element (photo, illustration) to break up text.

#### 5. 功能卡片 ("它可以幫你做甚麼？") 缺乏視覺衝擊
- 6 cards are text-heavy with small emoji icons. All identical — no visual differentiation.
- **Contabo 做得好嘅地方:** Each feature card has a distinct colored icon, clear heading, short description.
- **建議:** Larger icons, subtle color coding per card, hover effects.

#### 6. Stats bar (200,000+ / 35,000+ / 2M+ / Top 50) 可能誤導
- These are OpenClaw community stats, not ClawHK stats. First-time visitors may think ClawHK has 200K users.
- **Contabo 做得好嘅地方:** Their stats (190 Countries, 225,000+ Customers, 450,000+ Servers) are clearly their own.
- **建議:** Either clearly label as "OpenClaw 開源社區數據" or remove entirely.

#### 7. FAQ 頁面太平淡
- Flat list of accordion items with minimal styling. Categories (基本問題/收費與付款/功能與服務) visually weak.
- **Contabo 做得好嘅地方:** FAQ has clear category headers, clean accordion with icons.
- **建議:** Card-style grouping per category, icons, side navigation.

#### 8. Contact 頁面太空
- Three contact cards (WhatsApp, Telegram, Instagram) sit in huge white void. Page feels incomplete.
- **建議:** Add operating hours, response time expectations ("WhatsApp 2 小時內回覆"), mini-FAQ.

#### 9. Pricing comparison table 唔夠搶眼
- ChatGPT Plus comparison table styling is plain. Checkmarks and X marks hard to scan.
- **建議:** Color-coded green checks / red X, bolder row alternation, highlight "winner" column.

#### 10. Footer 缺少信任元素
- "PayMe" and "FPS" are text-only — logos would significantly boost trust.
- **建議:** Add payment method logos/icons.

### vs Contabo — Key Lessons

| Contabo 做得好 | ClawHK 缺少 |
|---------------|------------|
| Alternating section backgrounds (white/blue) | All-white sections blur together |
| Clear pricing cards with hover states | Pricing cards functional but flat |
| Distinct icon style per feature | Generic/inconsistent icons |
| "Trusted by Thousands" with real stats | Stats attribution unclear |
| Step-by-step setup guide with numbered steps | Steps exist but visually weaker |
| Integration logos (WhatsApp, Telegram, Slack) | Only text mentions |
| World map for global presence | No visual trust elements |
| Consistent typography scale | Flat heading hierarchy |

### Priority Fixes (Impact vs Effort)

| Priority | Fix | Impact | Effort |
|----------|-----|--------|--------|
| P0 | Alternating section backgrounds + spacing | High | Low |
| P0 | Typography hierarchy (heading scale) | High | Low |
| P1 | Hero breathing room + contrast fix | High | Medium |
| P1 | Feature cards visual redesign | Medium | Medium |
| P1 | Stats attribution or removal | Medium | Low |
| P2 | FAQ category styling | Medium | Medium |
| P2 | Contact page content expansion | Medium | Low |
| P2 | Footer payment logos | Low | Low |
| P3 | Pricing comparison color-coding | Low | Low |
