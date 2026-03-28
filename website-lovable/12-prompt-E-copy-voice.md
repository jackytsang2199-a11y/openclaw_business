# Prompt E: Copy, Voice & Content Overhaul

> Apply AFTER Prompts A-D.
> This prompt rewrites copy, restructures content, rebrands the site, removes/adds sections, AND applies a new color palette.

---

## Voice & Tone

Apply this voice across ALL copy changes in this prompt:
- **Direct, confident, warm.** Like a tech-savvy friend explaining to a non-technical person.
- **Language:** 香港書面語. No Cantonese slang (嘅、咩、唔、佢). English for tech terms only.
- **Short sentences.** One idea per sentence.
- **Benefits before features.**
- **No generic AI hype** ("革命性", "劃時代").

---

## 1. Rebranding — NexGen (SITE-WIDE)

Replace ALL instances of the old brand across every file:

| Find | Replace with |
|------|-------------|
| `蟹助手` | `NexGen` |
| `ClawHK` | `NexGen` |
| `clawhk` | `nexgen` |
| `🦀` emoji (everywhere — navbar, footer, mockup header, etc.) | Remove entirely, no replacement emoji |
| `clawhk.com` | `nexgen.com` |

Specific locations to check:
- **Navbar** (`Navbar.tsx`): `🦀 蟹助手` → `NexGen`
- **Footer** (`Footer.tsx`): `蟹助手 ClawHK` → `NexGen`, copyright → `© 2026 NexGen. All rights reserved.`
- **Telegram mockup** (`Index.tsx` hero): chat header `🦀 蟹助手` → `NexGen`
- **Pricing comparison table** (`Pricing.tsx`): `蟹助手 智能管家` → `NexGen 智能管家`
- **All meta/title tags** if any reference the old name
- **Social URLs**: `t.me/clawhk` → `t.me/nexgen` (or update to actual), `instagram.com/clawhk` → remove (see section 11)

Do NOT add a Chinese name. `NexGen` is the brand everywhere, English only.

---

## 2. Hero — REWRITE (Index.tsx)

Replace the entire hero text stack. Keep the layout structure (left text + right mockup), plugin cards below, and CTA buttons.

**New text stack (top to bottom):**

1. **Category label** (new element — small text above H1):
```jsx
<p className="text-sm text-white/60 uppercase tracking-wider font-medium">Self-Hosted OpenClaw</p>
```

2. **H1** — replace current `最強 AI 智能體`:
```
專屬於你的全配版 AI 智能體
```

3. **Diff line** — replace current sub-headline `ChatGPT 做不到的，它全部做到。`:
```
獨家插件生態，ChatGPT 做不到的它全部做到
```
Style this as `text-lg md:text-xl text-white/80` (slightly smaller than H1, slightly brighter than the old sub-headline).

4. **3 checkmarks** — keep as-is (`無需技術知識` / `Telegram / WhatsApp 直接使用` / `記得你的所有對話`)

5. **Process line** — keep as-is (`提供 Telegram ID → 付款 → 最快 30 分鐘內上線`)

6. **CTA buttons** — keep as-is (`立即開始` / `了解更多`)

---

## 3. Hero Telegram Mockup — REWRITE Demo Cases (Index.tsx)

Replace ALL 3 demo conversation cases. Key change: **the AI speaks first** in every conversation (proactive, not reactive).

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
    { role: "user", text: "好，順便查埋住宿" },
  ],
}
```
Note: the second message's `查埋` should be written as `查一下` (書面語).

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

The mockup rendering logic will need to handle AI messages appearing first (currently it assumes user speaks first). Adjust the bubble layout so AI messages appear on the left and user messages on the right, regardless of order.

---

## 4. Remove FOMO Strip (Index.tsx)

Delete the entire FOMO slim strip section:
```
2026 年，AI 智能體正在取代傳統聊天機器人。
你還在用受限的 ChatGPT 嗎？
```
Remove the section completely — do not leave an empty container.

---

## 5. Stat Strip — Fix (Index.tsx)

Two changes:

1. **Fix typo** in stats data: the label `Top 50` currently displays as "Top 50Top GitHub Global" (the word "Top" repeats). Fix to just `Top 50 GitHub Global`.

2. **Add attribution** below the stats grid:
```jsx
<p className="text-xs text-muted-foreground mt-4">— OpenClaw 開源項目數據</p>
```

---

## 6. Plugin Ecosystem + Tech Stack — REWRITE (Index.tsx)

### 6A. New heading
Replace: `我們不只是安裝 — 我們打造了一整套獨家插件生態系統`
With: `同樣是 OpenClaw AI 助手，我們多了什麼？`

### 6B. Replace team tagline
Remove the entire block:
```
由資深工程團隊打造 · 服務覆蓋全球
10+ 年系統架構經驗 · 企業級部署標準
```

Replace with infrastructure description:
```
你的 AI 系統託管於最近的數據中心，確保低延遲、高速回應。所有節點均提供無限流量、DDoS 防護，以及穩定的 AI 運算表現。服務覆蓋全球。
```

### 6C. Keep tagline
Keep `對話。記憶。行動。` as-is.

### 6D. Update tech cards
Replace the current 6 tech stack cards with these 7 items. Keep the same card layout and link to `/technology`:

| Name | Description |
|------|-------------|
| Mem0 OSS | 基於 OpenAI text-embedding-3-small 自動記憶所有對話與偏好 |
| Qdrant | 高維向量語義索引，毫秒級記憶檢索 |
| SearXNG | 突破 AI 搜尋封鎖，聚合 70+ 搜尋源 |
| Chromium Headless | AI 直接操作瀏覽器 — 填表、格價、訂位、搶票 |
| ACPX Runtime | Agent Communication Protocol 即時通訊層 |
| ClawTeam | venv 隔離 + tmux 3.5a 多進程，智能體分工並行 |
| Gateway Watchdog | 24/7 連線監控，斷線自動重連，多節點故障轉移 |

After the 7 cards, add a line:
```jsx
<p className="text-center text-sm text-muted-foreground mt-4">以及更多持續更新的功能 — <Link to="/technology" className="text-primary hover:underline">查看完整技術架構 →</Link></p>
```

---

## 7. Use Case Card Titles — REWRITE (Index.tsx)

Replace card titles only. Keep icons, prompts, and tags unchanged.

| Old Title | New Title |
|-----------|-----------|
| `每日整理工作` | `工作更有效率` |
| `溫習考試好幫手` | `考試更有把握` |
| `幫你寫文案、出 post` | `文案一秒完成` |
| `私人助理隨時待命` | `生活瑣事交給 AI` |
| `寫東西不再頭痛` | `寫作不再費力` |
| `你的第二個腦` | `所有對話永遠記得` |

---

## 8. Remove Video Demo Section (Index.tsx)

Delete the entire section:
```
這不是普通聊天機器人 — 是真正幫你做事的 AI 智能體。
搜尋資料、整理日程、處理文件 — 從回答問題到動手執行，全部在 Telegram 完成。
```
Remove completely.

---

## 9. Remove Qualifier Section (Index.tsx)

Delete the entire `適合你嗎？` section with its 4 qualifier items. Remove completely.

---

## 10. Integration Logo Strip — MODIFY (Index.tsx)

- **Keep:** WhatsApp, Telegram
- **Modify:** Discord — keep the icon but add a small label below the name:
```jsx
<span className="text-[10px] text-muted-foreground/60">即將推出</span>
```
- **Remove:** Slack entirely

---

## 11. Remove All Instagram (SITE-WIDE)

Remove Instagram from everywhere:
- **Contact.tsx**: Remove the Instagram contact card (keep only WhatsApp + Telegram). Change grid from `sm:grid-cols-3` to `sm:grid-cols-2`.
- **Footer.tsx**: Remove the Instagram SVG icon and link.
- **Navbar.tsx**: Remove if referenced.
- **Any social URL constants**: Remove `INSTAGRAM_URL`.

---

## 12. Builder Story — REWRITE (Index.tsx)

In section 12 (Story + Trust + Final CTA), replace the blockquote story text.

**Remove:**
```
我們是三個在香港做 IT 超過十年的工程師。半年前自己裝了 OpenClaw，用過之後再也回不去 ChatGPT。但安裝過程極其複雜 — Linux 指令、伺服器設定、VPN 配置、記憶系統串接 — 非技術人員根本無法完成。所以我們把整個安裝過程產品化，讓任何人都能用到這套系統。
```

**Replace with:**
```
原版 OpenClaw 是個好開始，但遠遠不夠。記憶只有基本功能，搜尋受限，斷線了？自己 debug。這不是真正的 AI 智能體。真正的 AI 智能體，應該擁有完整的長期記憶、替你搜尋全網、幫你操作瀏覽器、永遠在線不中斷。所以我們重新打造了它。但即使是全配版，安裝過程依然極其複雜 — Linux 指令、伺服器設定、VPN 配置、記憶系統串接 — 非技術人員根本無法完成。所以我們把整個過程產品化，讓任何人都能用到這套系統。
```

Also: **remove the `italic` className** from the blockquote. Chinese text should not be italicized.

---

## 13. Final CTA — REWRITE (Index.tsx)

In section 12, update the final CTA:

| Element | Old | New |
|---------|-----|-----|
| Heading | `準備好擁有你自己的 AI 助手了嗎？` | `今天安裝，今晚開始使用` |
| Sub-text | `最快今天安裝，今晚就能使用。` | `即時遠程安裝，最快 30 分鐘完成` |
| CTA button | `由 HK$148/月起 — 立即開始` | Keep as-is |

---

## 14. Pricing Page — SIMPLIFY (Pricing.tsx)

### 14A. Remove these sections entirely:
- ChatGPT comparison table (the entire `comparisonRows` section and rendering)
- Monthly fee explanation box (`月費包含甚麼？`)
- Add-ons table (`附加服務`)
- Payment methods section
- Daily cost reframe line (`智能管家 HK$248/月 = 每日 HK$8.3...`)

### 14B. Add "What is OpenClaw?" section
Add this as a new section between the page header and the pricing cards:

```jsx
<section className="max-w-4xl mx-auto mb-16">
  <h2 className="text-2xl md:text-3xl text-center mb-4">什麼是 OpenClaw？</h2>
  <p className="text-center text-lg text-muted-foreground mb-2">你的專屬 AI，不只聊天，還能動手做事。</p>
  <div className="max-w-3xl mx-auto space-y-4 text-base text-muted-foreground leading-relaxed mb-12">
    <p>OpenClaw 是一個安裝在你自己伺服器上的 AI 智能體，透過 WhatsApp、Telegram 等通訊軟件與你對話。它不是雲端共用服務 — 運行在你自己的機器上，資料完全屬於你。</p>
    <p>OpenClaw 不只是聊天。它能搜尋全網資訊、管理檔案、排行程、操作瀏覽器，在你休息時自動完成任務。整個項目開源，社區持續開發新功能。你可以選擇使用 Claude、GPT 或本地模型 — 資料永遠留在你的伺服器上。</p>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {[
      { title: "自動化日常", desc: "設定提醒、排行程、管理日程，用對話指令完成日常瑣事" },
      { title: "研究與資料", desc: "搜尋全網、整理資料、生成報告，你專注其他事" },
      { title: "智能整合", desc: "連接 50+ 工具與平台，自動執行工作流程" },
      { title: "瀏覽器自動化", desc: "格價、訂位、填表、搶票，AI 替你操作瀏覽器" },
    ].map((item) => (
      <div key={item.title} className="rounded-2xl border border-border bg-card p-6 text-center space-y-2 shadow-sm">
        <h3 className="text-lg font-semibold">{item.title}</h3>
        <p className="text-sm text-muted-foreground">{item.desc}</p>
      </div>
    ))}
  </div>
</section>
```

### 14C. Update brand references
- Comparison table header (if any remains): `蟹助手` → `NexGen`
- All CTA text referencing old brand

### 14D. New Pricing page structure (top to bottom):
1. Promo banner
2. Page heading + toggle
3. "What is OpenClaw?" section (NEW)
4. Pricing tier cards (3 cards)
5. Bottom CTA

---

## 15. FAQ — MINOR FIX (FAQ.tsx)

In the `支援甚麼設備？` answer, change:
```
支援 Raspberry Pi 5、任何 Linux VPS（如 DigitalOcean、Vultr）
```
To:
```
支援 Raspberry Pi 5 及任何 Linux VPS
```

---

## 16. Contact Page — MODIFY (Contact.tsx)

- **Remove** the Instagram contact card entirely. Keep only WhatsApp and Telegram.
- **Change grid** from `sm:grid-cols-3` to `sm:grid-cols-2` (or center the 2 cards).
- **Remove** business hours line (`服務時間：每日 10:00-22:00...`).
- **Update** all brand references from 蟹助手/ClawHK to NexGen.

---

## 17. Technology Page — MODIFY (Technology.tsx)

### 17A. Heading changes:
| Old | New |
|-----|-----|
| `我們的獨家技術生態系統` | `我們的技術生態系統` |
| Docker headline: `容器化一鍵部署 — 企業級標準` | `容器化一鍵部署 — 穩定可靠` |

### 17B. Docker body change:
Replace `這是企業用的部署標準。` with `你的系統獨立運行，需要搬遷時一鍵打包，資料完整保留。`

### 17C. Add new tech items:
Add these to the existing tech sections list (keep current items, add these new ones):

| Name | Headline | Body |
|------|----------|------|
| ACPX Runtime | ACP 協議運行環境 | Agent Communication Protocol 即時通訊層，支援多智能體間的即時訊息傳遞與任務分配。 |
| ClawTeam | 多智能體協作框架 | 基於 venv 隔離環境 + tmux 3.5a 多進程管理，多個 AI 智能體分工並行，同時處理複雜任務。 |
| Gateway Watchdog | 自動恢復守護進程 | 24/7 連線監控系統，自動偵測斷線並重新連接，支援多節點故障轉移，確保服務永不中斷。 |

---

## 18. Navbar — FIX (Navbar.tsx)

- Replace `🦀 蟹助手` with `NexGen` (no emoji).
- **Fix inconsistent background:** The navbar on the homepage has a grey/dark transparent background while other pages show white. Make the behavior consistent: transparent over the hero gradient on homepage, solid `bg-background` on all other pages (this may already be the intent — verify the `overHero` logic works correctly and the grey appearance is just the backdrop-blur on the gradient).

---

## 19. Landing Page Final Section Order

After all removals and changes, the Index.tsx sections should appear in this order:

```
1.  Hero (category label + H1 + diff + checkmarks + proactive mockup + plugin cards)
2.  Stat Strip (OpenClaw stats + attribution text)
3.  Plugin Ecosystem + Tech (new H2 + infra desc + 7 tech cards + "more" link)
4.  Use Cases (6 cards with benefit-first titles)
4.5 Mid-page CTA strip
5.  Before/After comparison (dark section)
6.  How It Works (3 steps)
7.  Integration Logo Strip (WA + TG + Discord coming soon)
8.  Inline FAQ (4 questions)
9.  Story + Trust + Final CTA (new story + new CTA heading/sub)
```

---

## 20. Color Palette Overhaul — 60/30/10 (SITE-WIDE)

The brand is changing from 蟹助手 (warm, boutique) to NexGen (tech, professional). The color palette must reflect this shift. Apply the 60/30/10 rule strictly.

### 20A. New CSS Variables

Replace the existing `:root` CSS variables in `index.css` with:

```css
:root {
  /* 60% — Clean, neutral light surfaces */
  --background: 0 0% 98%;           /* #FAFAFA — clean white */
  --foreground: 222 47% 11%;         /* slate-900 — dark text */

  --card: 0 0% 100%;                 /* pure white cards */
  --card-foreground: 222 47% 11%;

  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;

  --secondary: 210 20% 96%;          /* light grey */
  --secondary-foreground: 215 16% 47%;

  --muted: 210 20% 96%;
  --muted-foreground: 215 16% 47%;

  --section-alt: 210 15% 95%;        /* alternating section bg */

  /* 30% — Dark slate for hero, dark sections, footer */
  --dark-surface: 222 47% 6%;        /* near-black slate */
  --dark-surface-elevated: 222 40% 10%;
  --dark-section: 222 47% 8%;
  --dark-section-foreground: 210 40% 96%;

  /* 10% — Single accent color for ALL interactive elements */
  --primary: 217 91% 60%;            /* #3B82F6 — blue-500 */
  --primary-foreground: 0 0% 100%;   /* white on blue */
  --primary-light: 217 91% 95%;      /* light blue tint */
  --ring: 217 91% 60%;

  --accent: 217 91% 95%;             /* light blue tint for accent backgrounds */
  --accent-foreground: 217 91% 50%;

  --success: 142 60% 40%;            /* keep green for checkmarks */
  --destructive: 0 72% 51%;          /* keep red for errors */
  --destructive-foreground: 0 0% 100%;

  --border: 222 47% 11% / 0.08;
  --input: 222 47% 11% / 0.08;

  --radius: 1rem;

  /* Hero gradient — dark slate, not coral */
  --hero-gradient: linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #020617 100%);

  /* Accent system — simplified */
  --accent-teal: 172 50% 42%;        /* keep for tag badges only */
  --accent-teal-light: 172 40% 94%;
  --accent-amber: 36 90% 52%;        /* keep for tag badges only */
  --accent-amber-light: 36 60% 94%;
}
```

### 20B. Update Hero Gradient

In `Index.tsx`, change the hero section's inline `background` style:
```
OLD: linear-gradient(135deg, #C49A7E 0%, #B87A5E 30%, #A35D40 60%, #7A2E1A 100%)
NEW: linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #020617 100%)
```

This is a dark slate gradient. White text on dark slate = high contrast, professional, tech-forward.

### 20C. Update Hero CTA Button

The primary CTA was white-on-coral. Now it should be blue-on-dark:
```
Primary CTA: className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl text-base px-8 py-4 shadow-xl font-bold btn-press"
```
(This should work automatically once `--primary` is updated to blue.)

The secondary ghost CTA keeps `border-white/30 text-white/80 hover:bg-white/10`.

### 20D. Update Dark Sections

All dark sections (Before/After, Final CTA, footer) should use the new slate tones instead of brown:
- Replace any hardcoded `#1A1215`, `#2A1A1D` with `hsl(var(--dark-surface))` or `hsl(var(--dark-section))`
- Footer background: change from `bg-[hsl(var(--dark-surface))]` — this will automatically pick up the new slate value

### 20E. Update Tailwind Config

In `tailwind.config.ts`, no structural changes needed — the existing token references (`hsl(var(--primary))` etc.) will automatically pick up the new values. Just verify all custom color tokens are still mapped.

### 20F. Plugin Cards in Hero

The plugin cards currently use colored gradients (`from-purple-500/20`, `from-accent-teal/20`, etc.). On a dark slate hero, these should become more subtle:
```
All plugin cards: bg-white/[0.06] border-white/10 backdrop-blur-xl
```
Remove the individual colored gradients — on a dark slate hero, a uniform glass effect is cleaner.

### 20G. Tag Badge Colors

Keep the existing tag color coding for use case cards (blue, green, amber, rose, purple, cyan) — these are small badges and add helpful visual distinction. They count as part of the 10% accent budget since they're small.

### Design Intent Summary

| Layer | % | Color | Used For |
|-------|---|-------|----------|
| **Dominant** | 60% | White `#FAFAFA` + light grey `#F5F5F5` | Backgrounds, cards, section-alt |
| **Secondary** | 30% | Dark slate `#0F172A` | Hero, dark sections, footer, text |
| **Accent** | 10% | Blue `#3B82F6` | CTAs, links, active states, highlights — ONE color only |

---

## Summary of ALL Changes

| # | Change | Scope |
|---|--------|-------|
| 1 | Rebrand to NexGen | Site-wide |
| 2 | Hero rewrite | Index.tsx |
| 3 | Telegram mockup — proactive demos | Index.tsx |
| 4 | Remove FOMO strip | Index.tsx |
| 5 | Stat strip fix + attribution | Index.tsx |
| 6 | Plugin ecosystem rewrite + 7 tech cards | Index.tsx |
| 7 | Use case title rewrite | Index.tsx |
| 8 | Remove video demo section | Index.tsx |
| 9 | Remove qualifier section | Index.tsx |
| 10 | Integration logos — modify | Index.tsx |
| 11 | Remove all Instagram | Site-wide |
| 12 | Builder story rewrite | Index.tsx |
| 13 | Final CTA rewrite | Index.tsx |
| 14 | Pricing page simplify + "What is OpenClaw?" | Pricing.tsx |
| 15 | FAQ device support fix | FAQ.tsx |
| 16 | Contact page modify | Contact.tsx |
| 17 | Technology page modify + new tech | Technology.tsx |
| 18 | Navbar fix + rebrand | Navbar.tsx |
| 19 | Section reorder | Index.tsx |
| 20 | Color palette overhaul — 60/30/10 (warm coral → dark slate + blue accent) | Site-wide (index.css, tailwind.config.ts, all components) |
