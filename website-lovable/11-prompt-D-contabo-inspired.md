# Prompt D: Contabo-Inspired Content & Structure Additions

> Apply AFTER Prompt A (content/structure), Prompt B (visual overhaul), and Prompt C (design fixes).
> This prompt adds new content sections, rewrites headings for benefit-first copy, and reorders the landing page to v5 (12 sections).
> It does NOT change the color palette, typography scale, or CSS tokens — those are handled by Prompts B and C.

---

## Instructions

Apply ALL changes below in a single pass. Changes are grouped by area. Some changes modify existing sections, others add entirely new sections. Follow the section reorder at the end — it defines the final landing page flow.

---

## 1. Hero — Replace Context Line with 3 Checkmarks

In `Index.tsx`, find the hero section. The current hero has multiple text layers (headline, sub-headline, context line, process line). Remove the context line and replace it with 3 checkmarks.

**Remove this line** (or similar — it was merged from old Section 5):
```
搜尋資料、整理日程、處理文件 — 全部在 Telegram 完成。
```

**Add in its place — 3 checkmarks in a single row:**
```jsx
<div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-4">
  <span className="flex items-center gap-2 text-base text-white/90">
    <Check className="h-5 w-5 text-emerald-400" /> 無需技術知識
  </span>
  <span className="flex items-center gap-2 text-base text-white/90">
    <Check className="h-5 w-5 text-emerald-400" /> Telegram / WhatsApp 直接使用
  </span>
  <span className="flex items-center gap-2 text-base text-white/90">
    <Check className="h-5 w-5 text-emerald-400" /> 記得你的所有對話
  </span>
</div>
```

Import `Check` from `lucide-react` if not already imported.

The final hero text stack should be:
1. H1: `最強 AI 智能體`
2. Sub-headline: `ChatGPT 做不到的，它全部做到。`
3. **3 checkmarks** (new — replaces context line)
4. Process line: `提供 Telegram ID → 付款 → 最快 30 分鐘內上線`
5. CTA buttons

---

## 2. Benefit-First Section Headings — Rewrite All H2s

Replace ALL section headings across the entire site with benefit-first copy. Do NOT change body content — only H2 headings and any sub-headings directly below them.

### Landing page (Index.tsx) heading rewrites:

| Current Heading (find this text) | New Heading |
|---|---|
| `它可以幫你做甚麼？` (Use Cases section) | `你的助手，能做什麼？` |
| `三步完成` (How It Works section) | `三步開始使用` |
| `我們的故事` or similar (Builder Story section) | `我們為什麼做這件事` |
| `自己安裝 vs 找我們` or similar (Comparison section) | `省時間，不是學技術` |
| `採用頂級開源技術深度整合` or similar (Tech Stack section) | `背後的技術` |

Keep `適合你嗎？` as-is — it's already benefit-framed.

### Other pages:

| Page | Current H1 | New H1 |
|---|---|---|
| **Pricing.tsx** | Find the main page heading | `選擇最適合你的方案` |
| **FAQ.tsx** | Find the main page heading | `有問題？` with a subtitle below: `<p className="text-lg text-muted-foreground mt-2">我們已經準備好答案</p>` |
| **Contact.tsx** | Find the main page heading | `隨時聯絡我們` |

### Add two-word taglines where appropriate:

Add these as `<p className="text-base text-muted-foreground mt-2">` below their respective section headings:

- Below the stat strip or plugin ecosystem heading: `對話。記憶。行動。`
- Below How It Works heading: `安裝。使用。忘記技術。`
- Below any privacy/security mention: `你的伺服器。你的數據。`

---

## 3. Pricing Cards — Spec Grid Layout

In `Pricing.tsx`, change the pricing card feature display from bullet lists to a visual spec grid.

For each pricing tier card, replace the current feature bullet list with a spec grid:

```jsx
<div className="grid grid-cols-3 gap-2 text-center py-4 border-y border-border/50">
  <div className="flex flex-col items-center gap-1">
    <Server className="h-5 w-5 text-muted-foreground" />
    <span className="text-xs text-muted-foreground">VPS</span>
    <span className="text-sm font-semibold">4 核 / 8GB</span>
  </div>
  <div className="flex flex-col items-center gap-1">
    <Brain className="h-5 w-5 text-muted-foreground" />
    <span className="text-xs text-muted-foreground">記憶</span>
    {/* Use Check or X icon based on tier */}
    <Check className="h-5 w-5 text-emerald-600" />
  </div>
  <div className="flex flex-col items-center gap-1">
    <Search className="h-5 w-5 text-muted-foreground" />
    <span className="text-xs text-muted-foreground">搜尋</span>
    {/* Use Check or X icon based on tier */}
    <Check className="h-5 w-5 text-emerald-600" />
  </div>
</div>
```

Import `Server`, `Brain`, `Search` from `lucide-react`.

**Spec grid values per tier:**

| Spec | 🌱 新手上路 | ⭐ 智能管家 | 🚀 全能大師 |
|------|-----------|-----------|-----------|
| VPS | 4 核 / 8GB | 4 核 / 8GB | 4 核 / 8GB |
| 記憶 (Mem0) | `<X className="h-5 w-5 text-muted-foreground/50" />` | `<Check className="h-5 w-5 text-emerald-600" />` | `<Check className="h-5 w-5 text-emerald-600" />` |
| 搜尋 (SearXNG) | `<X className="h-5 w-5 text-muted-foreground/50" />` | `<Check className="h-5 w-5 text-emerald-600" />` | `<Check className="h-5 w-5 text-emerald-600" />` |

Keep the existing feature list BELOW the spec grid for additional features (browser automation, custom personality, etc.) — the spec grid is a visual summary at the top of each card, not a replacement for all features.

Also update CTA button text on each card:
- All cards: change `了解更多` or similar to `選擇此方案`

---

## 4. Integration Logo Strip — NEW Section

Add a new lightweight section showing supported platform logos. This goes after the "How It Works" section (position 10 in the final reorder below).

Create this as a new section in `Index.tsx`:

```jsx
{/* Integration Logo Strip */}
<section className="py-12 bg-white">
  <div className="max-w-4xl mx-auto px-4 text-center">
    <p className="text-sm text-muted-foreground mb-8">支援你常用的平台</p>
    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
      {[
        { name: "WhatsApp", icon: MessageCircle, color: "hover:text-[#25D366]" },
        { name: "Telegram", icon: Send, color: "hover:text-[#26A5E4]" },
        { name: "Discord", icon: MessageSquare, color: "hover:text-[#5865F2]" },
        { name: "Slack", icon: Hash, color: "hover:text-[#E01E5A]" },
      ].map((platform) => (
        <div key={platform.name} className="flex flex-col items-center gap-2 text-muted-foreground/40 hover:text-foreground transition-all duration-300 group">
          <platform.icon className={`h-8 w-8 transition-colors duration-300 ${platform.color}`} />
          <span className="text-xs font-medium">{platform.name}</span>
        </div>
      ))}
    </div>
  </div>
</section>
```

Import `MessageCircle`, `Send`, `MessageSquare`, `Hash` from `lucide-react` if not already imported.

Design notes:
- Icons start muted/grey, color on hover
- Single row on desktop, 2x2 on mobile (the `flex-wrap` handles this)
- Lightweight visual break — `py-12` not `py-20`

---

## 5. Inline FAQ on Landing Page — NEW Section

Add 4 frequently asked questions as an accordion section on the landing page, before the Final CTA (position 11 in the final reorder below).

Add this section in `Index.tsx`:

```jsx
{/* Inline FAQ */}
<section className="py-16 bg-section-alt">
  <div className="max-w-3xl mx-auto px-4">
    <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">常見問題</h2>
    <Accordion type="single" collapsible className="space-y-3">
      <AccordionItem value="faq-1" className="bg-card rounded-xl px-6 border-none shadow-sm">
        <AccordionTrigger className="text-base font-medium hover:no-underline">
          我完全不懂技術，適合使用嗎？
        </AccordionTrigger>
        <AccordionContent className="text-base text-muted-foreground">
          完全適合！整個安裝、設定、維護過程由我們的工程團隊處理。你只需要提供 Telegram ID，選擇方案並付款，最快 30 分鐘內即可開始使用。日後有任何問題，WhatsApp 聯絡我們即可。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="faq-2" className="bg-card rounded-xl px-6 border-none shadow-sm">
        <AccordionTrigger className="text-base font-medium hover:no-underline">
          月費包含什麼？
        </AccordionTrigger>
        <AccordionContent className="text-base text-muted-foreground">
          月費已包含 VPS 伺服器、AI 模型 API 使用費、VPN 服務、系統維護及更新。無隱藏收費，無額外費用。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="faq-3" className="bg-card rounded-xl px-6 border-none shadow-sm">
        <AccordionTrigger className="text-base font-medium hover:no-underline">
          跟 ChatGPT Plus 有什麼分別？
        </AccordionTrigger>
        <AccordionContent className="text-base text-muted-foreground">
          ChatGPT Plus 是聊天機器人，我們安裝的是 AI 智能體。智能體可以記住所有對話、搜尋全網資訊、操作瀏覽器幫你做事 — 不只是回答問題，是真正動手幫你完成任務。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="faq-4" className="bg-card rounded-xl px-6 border-none shadow-sm">
        <AccordionTrigger className="text-base font-medium hover:no-underline">
          如何開始使用？
        </AccordionTrigger>
        <AccordionContent className="text-base text-muted-foreground">
          提供你的 Telegram ID，選擇方案並付款，我們最快 30 分鐘內完成安裝。完成後你會收到通知，直接在 Telegram 開始使用。
        </AccordionContent>
      </AccordionItem>
    </Accordion>
    <div className="text-center mt-6">
      <a href="/faq" className="text-sm text-primary hover:underline">
        查看所有常見問題 →
      </a>
    </div>
  </div>
</section>
```

Make sure `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` are imported from your UI components (they should already exist if the FAQ page uses them).

---

## 6. Trust Mantra + CTA Copywriting Refresh

### 6A. Insert trust mantra `真人團隊。真正解答。`

Add this phrase in the following locations:

1. **Social Proof / Final CTA section** (Index.tsx) — as a sub-heading or prominent text line:
   ```jsx
   <p className="text-lg font-semibold text-primary">真人團隊。真正解答。</p>
   ```

2. **Contact page** (Contact.tsx) — below the page title:
   ```jsx
   <p className="text-base text-muted-foreground mt-2">真人團隊。真正解答。</p>
   ```

3. **Footer** — as a tagline next to or below the brand name/logo:
   ```jsx
   <p className="text-sm text-white/70">真人團隊。真正解答。</p>
   ```

### 6B. CTA button text refresh

Find and replace these CTA button texts across ALL pages:

| Find (current text) | Replace with |
|---|---|
| Generic `了解更多` buttons that link to pricing | `查看方案` |
| Generic `了解更多` buttons that link to other pages | `了解更多 →` (add arrow) |
| Hero primary CTA button | `立即開始` |
| Each pricing card CTA button | `選擇此方案` |
| Final CTA section button on landing page | `由 HK$148/月起 — 立即開始` |
| Generic `聯絡我們` buttons | `WhatsApp 聯絡我們` |

---

## 7. Mid-Page CTA Strip — NEW

Add a slim CTA strip between the Use Cases section and the Video Demo section (position 5.5 in the reorder). This is an early exit ramp for visitors already convinced — a 12-section page is long and you'll lose conversions without it.

```jsx
{/* Mid-page CTA Strip */}
<section className="py-8 bg-primary/5 border-y border-primary/10">
  <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4">
    <p className="text-base font-semibold text-foreground">由 HK$148/月起 — 每日不到 HK$5</p>
    <a href="/pricing">
      <Button className="bg-primary text-white hover:bg-primary/90 rounded-xl px-6">
        立即開始
      </Button>
    </a>
  </div>
</section>
```

---

## 8. Landing Page Section Reorder — FINAL v5

Rearrange the sections in `Index.tsx` to this exact order. This is the definitive section flow:

```
1.  Hero (H1 + 3 checkmarks + tech plugin cards + auto-rotating mockup)
2.  FOMO slim strip (py-8 urgency banner)
3.  Stat strip (compact OpenClaw community numbers)
4.  Plugin Ecosystem + Tech Stack (team tagline + 6 tech cards)
5.  Use Cases (6 cards with benefit-first headings, color-coded tags)
5.5 Mid-page CTA strip (NEW — early exit ramp)
6.  Video Demo slot (placeholder)
7.  "適合你嗎？" qualifier
8.  Before/After comparison table
9.  How It Works (3 steps, light background)
10. Integration Logo Strip (NEW — supported platforms)
11. Inline FAQ (NEW — 4 questions accordion)
12. Social Proof + Final CTA (builder story + trust mantra + price anchor)
```

If any sections are currently in a different order, move them to match this flow. The section numbering above is logical — just ensure they appear in this top-to-bottom sequence in the JSX.

---

## Summary of ALL Changes in This Prompt

| # | Change | What It Does |
|---|--------|-------------|
| 1 | Hero 3 checkmarks | Replaces context line with scannable trust signals |
| 2 | Benefit-first H2s | All headings rewritten for benefit-first copy |
| 3 | Pricing spec grids | Visual VPS/記憶/搜尋 grid replaces bullet lists |
| 4 | Integration logo strip | Visual proof of platform support |
| 5 | Inline FAQ | Catches objections before final CTA |
| 6 | Trust mantra + CTA refresh | Consistent voice + specific action buttons |
| 7 | Mid-page CTA strip | Early conversion exit ramp |
| 8 | Section reorder v5 | Final 12-section landing page flow |
