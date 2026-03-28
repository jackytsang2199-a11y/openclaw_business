# Lovable Changes v2 — Copy, Voice & Content (Agreed Decisions)

> All items below have been discussed and agreed.
> This is the master reference for creating the Lovable prompt.

---

## Branding

| Old | New |
|-----|-----|
| 蟹助手 / ClawHK / 🦀 | **NexGen** |
| Domain: clawhk.com | **nexgen.com** |
| All emoji crab references | Removed |
| Chinese brand name | None — English only everywhere |

Replace ALL instances of 蟹助手, ClawHK, 🦀 across every page, navbar, footer, copyright, meta tags.

---

## Voice & Tone Brief

**Target voice:** Direct, confident, warm. Like a tech-savvy friend explaining to a non-technical person.
**Language:** 香港書面語. No Cantonese slang. English for tech terms only.
**Rules:**
- Short sentences. One idea per sentence.
- Benefits before features.
- No generic AI hype ("革命性", "劃時代")
- Avoid repeating the same selling point more than twice across the entire site
- Numbers should be specific and honest

---

## INDEX.TSX — Landing Page

### Section 1: Hero — REWRITE

**New hero stack:**
1. **Category label:** `Self-Hosted OpenClaw`
2. **H1:** `專屬於你的全配版 AI 智能體`
3. **Diff line:** `獨家插件生態，ChatGPT 做不到的它全部做到`
4. **3 checkmarks:** `無需技術知識` / `Telegram / WhatsApp 直接使用` / `記得你的所有對話` (keep)
5. **Process line:** `提供 Telegram ID → 付款 → 最快 30 分鐘內上線` (keep)
6. **CTAs:** `立即開始` / `了解更多` (keep)

Remove the old H1 (`最強 AI 智能體`) and old sub-headline (`ChatGPT 做不到的，它全部做到。`).

### Section 1: Hero — Telegram Mockup Demos — REWRITE

Replace all 3 demo cases. Key change: **AI speaks first** (proactive, not reactive).

**Demo 1 — Proactive reminder + ticket buying:**
- AI: `你之前提過想看陳奕迅演唱會 — 明天早上 10 點開賣。需要我自動排隊搶票嗎？$680 山頂位，跟你上次說的預算一樣。`
- User: `好，幫我搶兩張`
- AI: `收到。明天 9:55 自動進入排隊系統，搶到後即時通知你。`

**Demo 2 — Proactive travel info:**
- AI: `你下個月的神樂滑雪場行程 — 今天有 3 成地區未開放。我已整理了最新雪道地圖給你參考。`
- AI: `[附圖：雪道開放狀況]`
- AI: `目前開放的中級雪道有 5 條，推薦大會場和 Sunshine Course。需要我幫你查最新積雪狀況嗎？`

**Demo 3 — Proactive work tracking:**
- AI: `你追蹤的 3 間競爭對手中，A 公司剛發佈了 Q4 財報。我已用你慣用的「摘要 → 數據 → 分析」格式整理好，要看嗎？`
- User: `好，傳過來`
- AI: `已整理完成。重點：營收按年增長 12%，但毛利率下跌 3%。完整報告已發送。`

### Section 2: FOMO Strip — REMOVE

Delete entirely.

### Section 3: Stat Strip — MINOR FIX

- Fix typo: `Top 50` label should not repeat "Top" (currently shows "Top 50Top GitHub Global")
- Add attribution below stats: `— OpenClaw 開源項目數據`

### Section 4: Plugin Ecosystem + Tech Stack — REWRITE

**H2:** `同樣是 OpenClaw AI 助手，我們多了什麼？`

**Remove old team tagline** (`由資深工程團隊打造 · 服務覆蓋全球...`).

**Replace with Contabo-style infra description:**
`你的 AI 系統託管於最近的數據中心，確保低延遲、高速回應。所有節點均提供無限流量、DDoS 防護，以及穩定的 AI 運算表現。服務覆蓋全球。`

**Keep:** `對話。記憶。行動。` tagline.

**Tech cards (背後的技術):** Update to match the 7 tech items below, plus add text like `以及更多持續更新的技能...` or a link to Technology page.

| Tech | Name | Description |
|------|------|-------------|
| Mem0 OSS | 長期記憶引擎 | 基於 OpenAI text-embedding-3-small 自動記憶所有對話與偏好 |
| Qdrant | 向量記憶資料庫 | 高維向量語義索引，毫秒級記憶檢索 |
| SearXNG | 自架元搜尋引擎 | 突破 AI 搜尋封鎖，聚合 70+ 搜尋源 |
| Chromium Headless | 無頭瀏覽器引擎 | AI 直接操作瀏覽器 — 填表、格價、訂位、搶票 |
| ACPX Runtime | ACP 協議運行環境 | Agent Communication Protocol 即時通訊層 |
| ClawTeam | 多智能體協作框架 | venv 隔離 + tmux 3.5a 多進程，智能體分工並行 |
| Gateway Watchdog | 自動恢復守護進程 | 24/7 連線監控，斷線自動重連，多節點故障轉移 |

### Section 5: Use Cases — TITLE REWRITE

Keep H2 `你的助手，能做什麼？` and prompts. Change card titles only:

| Old | New |
|-----|-----|
| `每日整理工作` | `工作更有效率` |
| `溫習考試好幫手` | `考試更有把握` |
| `幫你寫文案、出 post` | `文案一秒完成` |
| `私人助理隨時待命` | `生活瑣事交給 AI` |
| `寫東西不再頭痛` | `寫作不再費力` |
| `你的第二個腦` | `所有對話永遠記得` |

### Section 5.5: Mid-page CTA Strip — KEEP

No changes.

### Section 6: Before/After — KEEP

No copy changes.

### Section 7: Video Demo Statement — REMOVE

Delete entirely.

### Section 8: Qualifier (適合你嗎？) — REMOVE

Delete entirely.

### Section 9: How It Works — KEEP

No changes.

### Section 10: Integration Logo Strip — MODIFY

- Keep: WhatsApp, Telegram
- Discord: keep but add `即將推出` label
- Slack: remove

### Section 11: Inline FAQ — KEEP

No changes.

### Section 12: Story + Trust + Final CTA — REWRITE

**Keep H2:** `我們為什麼做這件事`

**Replace story text with:**
`原版 OpenClaw 是個好開始，但遠遠不夠。記憶只有基本功能，搜尋受限，斷線了？自己 debug。這不是真正的 AI 智能體。真正的 AI 智能體，應該擁有完整的長期記憶、替你搜尋全網、幫你操作瀏覽器、永遠在線不中斷。所以我們重新打造了它。但即使是全配版，安裝過程依然極其複雜 — Linux 指令、伺服器設定、VPN 配置、記憶系統串接 — 非技術人員根本無法完成。所以我們把整個過程產品化，讓任何人都能用到這套系統。`

Remove italic styling on the blockquote.

**Final CTA:**
- Heading: `今天安裝，今晚開始使用` (was `準備好擁有你自己的 AI 助手了嗎？`)
- Sub: `即時遠程安裝，最快 30 分鐘完成` (was `最快今天安裝，今晚就能使用。`)
- CTA button: `由 HK$148/月起 — 立即開始` (keep)

---

## Landing Page Section Order (Final)

After removing FOMO strip, Video Demo, and Qualifier:

```
1.  Hero (category + H1 + diff + checkmarks + mockup)
2.  Stat Strip (OpenClaw stats + attribution)
3.  Plugin Ecosystem + Tech Stack (new H2 + infra desc + 7 tech cards)
4.  Use Cases (6 cards with new titles)
4.5 Mid-page CTA strip
5.  Before/After comparison table (dark section)
6.  How It Works (3 steps)
7.  Integration Logo Strip (WA + TG + Discord coming soon)
8.  Inline FAQ (4 questions)
9.  Story + Trust + Final CTA
```

---

## PRICING.TSX — SIMPLIFY

**Remove these sections entirely:**
- ChatGPT comparison table
- Monthly fee explanation box
- Add-ons table
- Payment methods section
- Daily cost reframe (🍋 line)

**Keep:**
- Promo banner
- H1 + sub
- Pricing cards (3 tiers)
- Bottom CTA

**Add new section: "What is OpenClaw?"**

**Heading:** `什麼是 OpenClaw？`
**Sub:** `你的專屬 AI，不只聊天，還能動手做事。`

**Body:**
`OpenClaw 是一個安裝在你自己伺服器上的 AI 智能體，透過 WhatsApp、Telegram 等通訊軟件與你對話。它不是雲端共用服務 — 運行在你自己的機器上，資料完全屬於你。`

`OpenClaw 不只是聊天。它能搜尋全網資訊、管理檔案、排行程、操作瀏覽器，在你休息時自動完成任務。整個項目開源，社區持續開發新功能。你可以選擇使用 Claude、GPT 或本地模型 — 資料永遠留在你的伺服器上。`

**4 feature cards:**
- **自動化日常** — 設定提醒、排行程、管理日程，用對話指令完成日常瑣事
- **研究與資料** — 搜尋全網、整理資料、生成報告，你專注其他事
- **智能整合** — 連接 50+ 工具與平台，自動執行工作流程
- **瀏覽器自動化** — 格價、訂位、填表、搶票，AI 替你操作瀏覽器

**New Pricing page structure:**
1. Promo banner
2. "What is OpenClaw?" section
3. Pricing cards
4. Bottom CTA

---

## FAQ.TSX — MINOR FIX

- Device support answer: replace `DigitalOcean、Vultr` with generic `任何 Linux VPS`
- Remove all Instagram references

---

## CONTACT.TSX — MODIFY

- Remove business hours line
- Remove Instagram contact card (keep WhatsApp + Telegram only)
- Update all NexGen branding

---

## TECHNOLOGY.TSX — MODIFY

| Old | New |
|-----|-----|
| H1: `我們的獨家技術生態系統` | `我們的技術生態系統` |
| Docker headline: `容器化一鍵部署 — 企業級標準` | `容器化一鍵部署 — 穩定可靠` |
| Docker body: `這是企業用的部署標準` | `你的系統獨立運行，需要搬遷時一鍵打包，資料完整保留。` |

Add the 7 tech items (Mem0 OSS, Qdrant, SearXNG, Chromium Headless, ACPX Runtime, ClawTeam, Gateway Watchdog) with their technical descriptions. Keep WireGuard as-is.

---

## NAVBAR — FIX

- Fix: homepage navbar is grey, other pages are white/transparent. Make consistent across all pages.
- Replace 🦀 蟹助手 with `NexGen`

---

## FOOTER — MODIFY

- Replace 蟹助手 ClawHK with `NexGen`
- Remove 🦀 emoji
- Remove Instagram icon and link
- Copyright: `(c) 2026 NexGen. All rights reserved.`
- Keep `真人團隊。真正解答。`

---

## CROSS-SITE

- **Remove all Instagram** references (contact cards, footer icons, any links)
- **Replace all 蟹助手 / ClawHK / 🦀** with `NexGen`
- **Stats attribution:** Add `— OpenClaw 開源項目數據` under stat displays

---

## Prompt Status

| Prompt | File | Status |
|--------|------|--------|
| E (combined, reference only) | `12-prompt-E-copy-voice.md` | Superseded by E1+E2 |
| **E1: Rebrand + Color + Structure** | `12-prompt-E1-rebrand-structure.md` | Ready for Lovable |
| **E2: Copy Rewrite** | `12-prompt-E2-copy-rewrite.md` | Apply after E1 |
