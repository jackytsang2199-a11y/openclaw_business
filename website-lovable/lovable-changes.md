# Lovable Change Log — Final Agreed Changes

> Track all agreed changes for consolidated Lovable prompt.
> Research: See [research-summary.md](research-summary.md) for full findings.
> Reviews: See agent reviews from UX expert, HK consumer, and copywriter.

---

## ✅ Agreed Changes

### 1. Nav CTA — WhatsApp + Telegram Icons
- Single button area with WhatsApp icon + Telegram icon (not two separate buttons)
- Clean, no text clutter — just recognizable icons side by side

### 2. Hero Headline
```
最強 AI 智能體                            ← main headline (big, bold)
ChatGPT 做不到的，它全部做到。             ← sub-headline

提供 Telegram ID → 付款 → 最快 30 分鐘內上線   ← process line
```

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

### 5. Repositioning Bridge (REVISED — removed overclaim)
> **這不是普通聊天機器人 — 是真正幫你做事的 AI 智能體。**
> 搜尋資料、整理日程、處理文件 — 從回答問題到動手執行，全部在 Telegram 完成。

(Removed "像真人一樣操作電腦" — overpromises. Added "全部在 Telegram 完成" — grounds experience in familiar interface.)

### 6. Feature Cards — DELETED
Removed. Tech plugin cards + use cases + rotating mockup already communicate everything.

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
> ❌ 本身已懂 Docker / Linux 自己安裝 — 可能不需要我們

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

### 11. NEW: FOMO Banner (after hero)
Full-width, dramatic dark section with subtle red/coral glow:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   2026 年，AI 智能體正在取代傳統聊天機器人及大量傳統文書工作。          │
│   全球已有超過 200 萬人每週使用開源 AI 智能體。                       │
│   你還在用受限的 ChatGPT 嗎？                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
Design: Cinematic feel, large text, centered, with subtle text glow or gradient animation.

### 12. NEW: Credibility + Tech Stack (MERGED — was items 12+13+14)
Single powerful section with 3 layers. Flows from foundation → our value → tech details.

**Layer A — Platform Foundation + Stats:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│        基於全球排名第一的開源 AI 智能體平台打造                        │
│        BUILT ON THE #1 OPEN-SOURCE AI AGENT                        │
│                                                                     │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                  │
│   │200,000+│  │35,000+ │  │  2M+   │  │ Top 50 │                  │
│   │GitHub ⭐│  │  Forks │  │ Weekly │  │ GitHub │                  │
│   │        │  │        │  │ Users  │  │ Global │                  │
│   └────────┘  └────────┘  └────────┘  └────────┘                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Layer B — Exclusive Plugin Ecosystem (our differentiator):**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   我們不只是安裝 — 我們打造了一整套獨家插件生態系統                     │
│   經過數月研究、調試與深度整合，遠超原版 OpenClaw                      │
│                                                                     │
│   EXCLUSIVE PLUGIN ECOSYSTEM · EXTENSIVELY TESTED                  │
│                                                                     │
│   由資深工程團隊打造 · 服務覆蓋全球                                   │
│   10+ 年系統架構經驗 · 企業級部署標準                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
(Verify team experience years — adjust to reality.)

**Layer C — Tech Stack Cards (link to /technology page):**
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
- 🟡 Video content to be discussed further

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

### 15. Section Reorder (Landing Page — FINAL v3)
Merged from 13 → 11 sections for tighter mobile experience:

1. **Hero** (headline + tech plugin cards + auto-rotating mockup)
2. **FOMO banner** ("2026年，AI 智能體正在取代...")
3. **Repositioning bridge** ("這不是普通聊天機器人...")
4. **Credibility + Tech Stack** (MERGED: OpenClaw stats + plugin ecosystem + team tagline + 6 tech cards → /technology)
5. **Use Cases** (6 cards — emotional sell)
6. **Video Demo slot** (placeholder for real Telegram recording)
7. **"適合你嗎？" qualifier**
8. **Before/After comparison** (self-install vs us)
9. **How It Works** (simplified 3-step flow)
10. **Social Proof** (revised builder story + screenshot placeholders)
11. **Final CTA** (with trust bar merged in + price anchor: 由 HK$148/月起)

### 16. Nav Update
Add /technology page to navigation:
```
首頁 / 收費 / 技術 / 常見問題 / 聯絡我們
```
(5 pages total, up from 4)

---

## 🔮 Future Ideas (not in this prompt, do later)

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

## ❌ Rejected

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

### Execution order
```
1. Apply Prompt A → verify all content/sections correct
2. Apply Prompt B → verify visual overhaul looks right
3. Manual polish if needed
```
