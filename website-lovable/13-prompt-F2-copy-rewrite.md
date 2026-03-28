# Prompt F2: Copy & Content Rewrite

> Apply AFTER Prompt F1 (rebrand, structure, removals).
> This prompt rewrites all copy, adds new content, and updates text across the site.
> Do NOT change colors, layout structure, or remove sections — F1 already handled that.

---

## Voice & Tone

Apply this voice across ALL copy:
- **Direct, confident, warm.** Like a tech-savvy friend explaining to a non-technical person.
- **Language:** 香港書面語. No Cantonese slang (嘅、咩、唔、佢). English for tech terms only.
- **Short sentences.** One idea per sentence.
- **Benefits before features.**

---

## 1. Hero Text — REWRITE (Index.tsx)

Replace the entire hero text stack. Keep the layout (left text + right mockup + plugin cards below).

**New text stack (top to bottom):**

1. **Category label** (NEW — small text above H1):
```jsx
<p className="text-sm text-white/60 uppercase tracking-wider font-medium">Self-Hosted OpenClaw</p>
```

2. **H1** — replace current heading:
```
專屬於你的全配版 AI 智能體
```

3. **Diff line** — replace sub-headline:
```
獨家插件生態，ChatGPT 做不到的它全部做到
```
Style: `text-lg md:text-xl text-white/80`

4. **Process line** — keep as-is
5. **CTAs** — keep as-is

---

## 2. Telegram Mockup Demos — REWRITE (Index.tsx)

Replace ALL 3 demo conversations. Key change: **AI speaks first** (proactive, not waiting for user commands).

**Demo 1 — Proactive concert tickets:**
```js
{
  title: "主動提醒 + 搶票",
  messages: [
    { role: "ai", text: "你之前提過想看陳奕迅演唱會 — 明天早上 10 點開賣。需要我自動排隊搶票嗎？$680 山頂位，跟你上次說的預算一樣。" },
    { role: "user", text: "好，幫我搶兩張" },
    { role: "ai", text: "收到。明天 9:55 自動進入排隊系統，搶到後即時通知你。" },
  ],
}
```

**Demo 2 — Proactive travel info:**
```js
{
  title: "主動整理 + 旅行",
  messages: [
    { role: "ai", text: "你下個月的神樂滑雪場行程 — 今天有 3 成地區未開放。我已整理了最新雪道地圖給你參考。" },
    { role: "ai", text: "目前開放的中級雪道有 5 條，推薦大會場和 Sunshine Course。需要我幫你查最新積雪狀況嗎？" },
    { role: "user", text: "好，順便查一下住宿" },
  ],
}
```

**Demo 3 — Proactive work tracking:**
```js
{
  title: "主動追蹤 + 報告",
  messages: [
    { role: "ai", text: "你追蹤的 3 間競爭對手中，A 公司剛發佈了 Q4 財報。我已用你慣用的「摘要 → 數據 → 分析」格式整理好，要看嗎？" },
    { role: "user", text: "好，傳過來" },
    { role: "ai", text: "已整理完成。重點：營收按年增長 12%，但毛利率下跌 3%。完整報告已發送。" },
  ],
}
```

**Important:** The mockup rendering logic needs to handle AI messages appearing first and multiple AI messages in a row. Adjust bubble layout so:
- AI messages → left-aligned bubbles
- User messages → right-aligned bubbles
- Support any message order (AI can be first, multiple AI messages in sequence)

---

## 3. Stat Strip — Add Attribution (Index.tsx)

Add below the stats grid:
```jsx
<p className="text-xs text-muted-foreground mt-4">— OpenClaw 開源項目數據</p>
```

---

## 4. Plugin Ecosystem Section — REWRITE (Index.tsx)

### 4A. New heading
Replace: `我們不只是安裝 — 我們打造了一整套獨家插件生態系統`
With: `同樣是 OpenClaw AI 助手，我們多了什麼？`

### 4B. Replace team tagline
Remove:
```
由資深工程團隊打造 · 服務覆蓋全球
10+ 年系統架構經驗 · 企業級部署標準
```

Replace with:
```
你的 AI 系統託管於最近的數據中心，確保低延遲、高速回應。所有節點均提供無限流量、DDoS 防護，以及穩定的 AI 運算表現。服務覆蓋全球。
```

### 4C. Keep existing taglines
Keep `Exclusive Plugin Ecosystem · Extensively Tested` and `對話。記憶。行動。` if present.

### 4D. Update tech cards
Replace the current cards (which should now be 5 after WireGuard removal in F1) with these **7 cards**. Keep same card layout and link to `/technology`:

| Name | Description |
|------|-------------|
| Mem0 OSS | 基於 OpenAI text-embedding-3-small 自動記憶所有對話與偏好 |
| Qdrant | 高維向量語義索引，毫秒級記憶檢索 |
| SearXNG | 突破 AI 搜尋封鎖，聚合 70+ 搜尋源 |
| Chromium Headless | AI 直接操作瀏覽器 — 填表、格價、訂位、搶票 |
| ACPX Runtime | Agent Communication Protocol 即時通訊層 |
| ClawTeam | venv 隔離 + tmux 3.5a 多進程，智能體分工並行 |
| Gateway Watchdog | 24/7 連線監控，斷線自動重連，多節點故障轉移 |

After the cards, add:
```jsx
<p className="text-center text-sm text-muted-foreground mt-4">
  以及更多持續更新的功能 — <Link to="/technology" className="text-primary hover:underline">查看完整技術架構 →</Link>
</p>
```

---

## 5. Use Case Card Titles — REWRITE (Index.tsx)

Replace titles only. Keep icons, prompts, and tags unchanged.

| Old | New |
|-----|-----|
| `每日整理工作` | `工作更有效率` |
| `溫習考試好幫手` | `考試更有把握` |
| `幫你寫文案、出 post` | `文案一秒完成` |
| `私人助理隨時待命` | `生活瑣事交給 AI` |
| `寫東西不再頭痛` | `寫作不再費力` |
| `你的第二個腦` | `所有對話永遠記得` |

---

## 6. Builder Story — REWRITE (Index.tsx)

Replace the story section text entirely.

**Remove:**
```
我們是三個在香港做 IT 超過十年的工程師。半年前自己裝了 OpenClaw，用過之後再也回不去 ChatGPT。但安裝過程極其複雜 — Linux 指令、伺服器設定、VPN 配置、記憶系統串接 — 非技術人員根本無法完成。所以我們把整個安裝過程產品化，讓任何人都能用到這套系統。
```

**Replace with:**
```
原版 OpenClaw 是個好開始，但遠遠不夠。記憶只有基本功能，搜尋受限，斷線了？自己 debug。這不是真正的 AI 智能體。真正的 AI 智能體，應該擁有完整的長期記憶、替你搜尋全網、幫你操作瀏覽器、永遠在線不中斷。所以我們重新打造了它。但即使是全配版，安裝過程依然極其複雜 — Linux 指令、伺服器設定、VPN 配置、記憶系統串接 — 非技術人員根本無法完成。所以我們把整個過程產品化，讓任何人都能用到這套系統。
```

Also: **remove `italic` className** from the text if present. Chinese text should not be italicized.

---

## 7. Final CTA — REWRITE (Index.tsx)

| Element | Old | New |
|---------|-----|-----|
| Heading | `準備好擁有你自己的 AI 助手了嗎？` | `今天安裝，今晚開始使用` |
| Sub | `最快今天安裝，今晚就能使用。` | `即時遠程安裝，最快 30 分鐘完成` |

---

## 8. Pricing — Add "What is OpenClaw?" Section (Pricing.tsx)

Add this section between the page header (with toggle) and the pricing tier cards.

**Heading:** `什麼是 OpenClaw？`
**Sub:** `你的專屬 AI，不只聊天，還能動手做事。`

**Body (two paragraphs):**
```
OpenClaw 是一個安裝在你自己伺服器上的 AI 智能體，透過 WhatsApp、Telegram 等通訊軟件與你對話。它不是雲端共用服務 — 運行在你自己的機器上，資料完全屬於你。
```
```
OpenClaw 不只是聊天。它能搜尋全網資訊、管理檔案、排行程、操作瀏覽器，在你休息時自動完成任務。整個項目開源，社區持續開發新功能。你可以選擇使用 Claude、GPT 或本地模型 — 資料永遠留在你的伺服器上。
```

**4 feature cards below (sm:grid-cols-2 lg:grid-cols-4 gap-5):**

| Icon | Title | Description |
|------|-------|-------------|
| Calendar | 自動化日常 | 設定提醒、排行程、管理日程，用對話指令完成日常瑣事 |
| Search | 研究與資料 | 搜尋全網、整理資料、生成報告，你專注其他事 |
| Plug | 智能整合 | 連接 50+ 工具與平台，自動執行工作流程 |
| Eye | 瀏覽器自動化 | 格價、訂位、填表、搶票，AI 替你操作瀏覽器 |

---

## 9. Technology Page — Copy Updates (Technology.tsx)

### 9A. Page heading
Change: `我們的獨家技術生態系統` → `我們的技術生態系統`

### 9B. Docker entry
- Headline: `容器化一鍵部署 — 企業級標準` → `容器化一鍵部署 — 穩定可靠`
- Body: Replace `這是企業用的部署標準。` with `你的系統獨立運行，需要搬遷時一鍵打包，資料完整保留。`

### 9C. Add 3 new tech sections
Add these to the tech list (WireGuard was removed in F1):

**ACPX Runtime:**
- Name: `ACPX`
- Headline: `ACP 協議運行環境`
- Body: `Agent Communication Protocol 即時通訊層，支援多智能體間的即時訊息傳遞與任務分配。`

**ClawTeam:**
- Name: `ClawTeam`
- Headline: `多智能體協作框架`
- Body: `基於 venv 隔離環境 + tmux 3.5a 多進程管理，多個 AI 智能體分工並行，同時處理複雜任務。`

**Gateway Watchdog:**
- Name: `Gateway Watchdog`
- Headline: `自動恢復守護進程`
- Body: `24/7 連線監控系統，自動偵測斷線並重新連接，支援多節點故障轉移，確保服務永不中斷。`

---

## 10. FAQ Fix (FAQ.tsx)

Device support answer — change:
```
支援 Raspberry Pi 5、任何 Linux VPS（如 DigitalOcean、Vultr）
```
To:
```
支援 Raspberry Pi 5 及任何 Linux VPS
```

(Payment FAQ fix is handled in F1 Item 11.)

---

## Summary

| # | Change | Scope |
|---|--------|-------|
| 1 | Hero text rewrite (category + H1 + diff) | Index.tsx |
| 2 | Telegram mockup — proactive AI-first demos | Index.tsx |
| 3 | Stat strip attribution | Index.tsx |
| 4 | Plugin ecosystem rewrite + 7 tech cards | Index.tsx |
| 5 | Use case card titles | Index.tsx |
| 6 | Builder story rewrite | Index.tsx |
| 7 | Final CTA rewrite | Index.tsx |
| 8 | Pricing "What is OpenClaw?" section | Pricing.tsx |
| 9 | Technology page copy + 3 new tech entries | Technology.tsx |
| 10 | FAQ device support fix | FAQ.tsx |
