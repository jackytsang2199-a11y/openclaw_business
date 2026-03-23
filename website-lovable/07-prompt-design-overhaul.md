# Prompt: Full Design Overhaul — Superhuman-Inspired Premium Aesthetic

> Apply this prompt AFTER all pages are functionally built. This is a pure design/visual layer change.
> Do NOT change content, section order, or functionality — only change how it looks and feels.

---

## Design Philosophy

Redesign the entire site following this principle: **Calm confidence.** Not shouty, not feature-cramming. Premium minimalism with editorial warmth. The site should feel like a luxury consumer service, not a tech startup. Think Superhuman meets Notion — aspirational but approachable.

**Reference sites (study these for tone):**
- superhuman.com — gradient hero, ghost CTA, warm cream tones, restrained typography
- notion.com — approachable illustrations, clear pricing hierarchy
- amie.so — joyful pastel warmth, rounded elements
- arc.net — lifestyle-over-specs messaging
- lemonsqueezy.com — mascot-driven brand personality

---

## Color Palette — REPLACE current dark theme

**IMPORTANT: Switch from dark mode to light mode.** The current dark theme with coral glow feels like a developer tool. We are selling to non-technical Hong Kong consumers — light = trustworthy, warm, approachable.

```
Background:         #FFFAF5  (warm cream/parchment, NOT pure white — copied from Superhuman's warm off-white approach)
Surface/Cards:      #FFF7F0  (slightly warmer cream for card backgrounds)
Primary text:       #2A1A1D  (near-black with warm brown undertone, NOT pure black)
Secondary text:     #6B5E61  (muted warm grey for descriptions)
Muted text:         #A89A9D  (for tech names, fine print)

Hero gradient:      linear-gradient(135deg, #E8D5C4 0%, #F5C6AA 30%, #E6A889 60%, #D4826A 100%)
                    (warm coral-to-terracotta gradient — keeps the crab theme but softer, more Superhuman-gradient-style)

Primary accent:     #C75B39  (warm terracotta — CTA buttons, links, highlights)
Primary hover:      #B04E30  (darker terracotta on hover)
Accent light:       #F5DDD1  (light coral wash — for badges, subtle highlights)

Tier colors (pricing):
  🌱 新手上路:      #A0B4A0  (muted sage green — intentionally dull)
  ⭐ 智能管家:      #C75B39  (terracotta — primary accent, this tier should POP)
  🚀 全能大師:      #8B7355  (warm bronze/gold — premium but not flashy)

Success:            #5A8A5A  (muted green)
```

**Do NOT use:** pure blue, neon, saturated red, pure black backgrounds, dark mode.

---

## Typography

```
Chinese headings:   "Noto Sans TC", system-ui, sans-serif
                    Weight: 500 (medium, NOT bold 700 — Superhuman uses 400-500 for headings)
                    Letter-spacing: 0.02em (slightly open for Chinese readability)

English / body:     "Inter", system-ui, -apple-system, sans-serif
                    Weight: 400 (regular)

Tech terms:         "JetBrains Mono", "SF Mono", monospace
                    Weight: 400, size: 0.85em
                    Color: muted text color (#A89A9D)

H1 hero:            clamp(2.5rem, 5vw, 4rem), weight 500, line-height 1.2
H2 sections:        clamp(1.75rem, 3.5vw, 2.5rem), weight 500, line-height 1.3
H3 cards:           clamp(1.25rem, 2vw, 1.5rem), weight 500
Body:               1rem (16px), weight 400, line-height 1.7
Small/captions:     0.875rem, weight 400, color secondary text
```

**Key rule:** Express hierarchy through SIZE, not weight. Most text is weight 400-500. Never use bold 700 for headings — it looks like a startup pitch deck. We want editorial calm.

---

## Hero Section — Gradient Style (Replace Dark Hero)

```
┌─────────────────────────────────────────────────────────┐
│  [warm coral-to-terracotta gradient background]          │
│                                                          │
│  (nav: transparent over gradient, cream text)            │
│                                                          │
│           最強 AI 智能體                                  │
│    ChatGPT 做不到的，它全部做到。                          │
│                                                          │
│    [ 立即開始 → ]  ← ghost button: transparent bg,       │
│                      1px solid rgba(255,255,255,0.2),    │
│                      border-radius: 12px,                │
│                      cream text, padding: 12px 24px      │
│                                                          │
│    提供 Telegram ID → 付款 → 最快 30 分鐘內上線           │
│    (small, cream text, weight 400, opacity 0.8)          │
│                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ 永久記憶 │ │ 全網搜尋 │ │ 自動修復 │ │ 代你上網 │       │
│  │Mem0+Qdrant│ │ SearXNG │ │Watchdog │ │Chromium │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                          │
│  Tech cards: background rgba(255,255,255,0.08),          │
│  border: 1px solid rgba(255,255,255,0.12),               │
│  backdrop-filter: blur(8px),                             │
│  border-radius: 12px                                     │
│  Benefit text: cream, 1rem, weight 500                   │
│  Tech name: cream, 0.75rem, weight 400, opacity 0.5      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Below hero (on cream background):** the Telegram mockup with auto-rotating demos. This is now on the light cream background, NOT inside the gradient.

---

## Navigation — Superhuman Style

```
Desktop:
┌──────────────────────────────────────────────────────────┐
│ 🦀 蟹助手    首頁  收費  常見問題  聯絡我們    [WA] [TG]  │
└──────────────────────────────────────────────────────────┘

- Over hero gradient: fully transparent background, cream text
- On scroll (past hero): white background with subtle shadow (box-shadow: 0 1px 0 rgba(0,0,0,0.06))
- Text links: weight 400, 14px, no underline, hover opacity 0.7
- WA + TG icons: in a single pill container, border: 1px solid rgba(current-text-color, 0.2), border-radius: 8px
- Transition: background-color 0.3s ease
- NO announcement bar (keep it clean)
```

**Mobile:**
```
- Hamburger menu (right side)
- Logo left: 🦀 蟹助手
- Slide-out panel from right with warm cream background
- WA + TG icons at bottom of mobile menu
```

---

## Card Design (Used Across All Sections)

```css
/* Base card */
background: #FFF7F0;
border: 1px solid rgba(42, 26, 29, 0.06);
border-radius: 16px;
padding: 24px;
box-shadow: none;  /* NO shadows — Superhuman avoids them */
transition: border-color 0.2s ease;

/* Card hover */
border-color: rgba(199, 91, 57, 0.15);  /* subtle terracotta border on hover */

/* Featured card (智能管家 tier) */
border: 2px solid #C75B39;
position: relative;
/* "⭐ 最受歡迎" badge floats ABOVE the card, not inside */
```

**No shadows anywhere.** Use border color and background color to create depth, like Superhuman.

---

## CTA Buttons — Three Styles

**1. Primary solid (pricing CTAs, final CTA):**
```css
background: #C75B39;
color: #FFFAF5;
border: none;
border-radius: 10px;
padding: 14px 28px;
font-size: 1rem;
font-weight: 500;
transition: background 0.2s ease;
/* hover: background #B04E30 */
```

**2. Ghost/outline (hero CTA, over gradient):**
```css
background: transparent;
color: #FFFAF5;
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 12px;
padding: 14px 28px;
font-size: 1rem;
font-weight: 400;
backdrop-filter: blur(4px);
/* hover: background rgba(255,255,255,0.08) */
```

**3. Secondary text link (learn more, anchor links):**
```css
color: #C75B39;
text-decoration: none;
font-weight: 500;
/* hover: opacity 0.7 */
/* Append → arrow character */
```

---

## Pricing Page — Superhuman Card Layout

```
[Annual / Monthly toggle — pill switch, terracotta active state]

┌──────────┐  ┌──────────────┐  ┌──────────┐
│ 🌱 新手上路 │  │ ⭐ 最受歡迎     │  │ 🚀 全能大師 │
│           │  │ ⭐ 智能管家     │  │            │
│ HK$148/月 │  │ HK$248/月     │  │  HK$388/月  │
│           │  │               │  │            │
│ 適合：     │  │ 適合：         │  │  適合：     │
│ 想試水溫   │  │ 日常工作+生活  │  │  重度用家    │
│           │  │               │  │            │
│ [了解更多] │  │ [立即開始 →]   │  │  [了解更多]  │
│ (outlined) │  │ (solid terra) │  │  (outlined) │
└──────────┘  └──────────────┘  └──────────┘
                    ↑
              Card has 2px terracotta border
              "⭐ 最受歡迎" badge ABOVE card (floating label)
              CTA is solid terracotta (only this tier)
              Other tiers: outlined/ghost CTA

Sage green    Terracotta      Bronze
(intentionally (POPS)          (premium but
 dull)                         understated)
```

**Below cards:** Collapsible feature comparison table (like Superhuman's). Organized by category:
- 基本功能
- AI 模型與記憶
- 搜尋與自動化
- 支援

Use checkmarks (✓) and dashes (—) in muted color. The table should be COLLAPSED by default — only curious users expand it.

**Mobile pricing:** Show one tier at a time with swipe/tabs. 智能管家 pre-selected.

---

## Section Styling (For All Content Sections Below Hero)

```css
/* Each section */
padding: 80px 0;  /* generous vertical spacing — let it breathe */
max-width: 1080px;
margin: 0 auto;

/* Section headings */
text-align: center;
margin-bottom: 48px;

/* Alternating subtle backgrounds (optional, very subtle) */
/* Odd sections: #FFFAF5 (cream) */
/* Even sections: #FFFFFF (pure white) */
/* Difference is barely visible — that's the point */
```

---

## "適合你嗎？" Section — Warm, Not Clinical

```
Background: #FFF7F0 (warm cream card)
Border-radius: 16px
Padding: 40px
Max-width: 640px, centered

✅ items: color #5A8A5A (muted green), weight 400
❌ item:  color #A89A9D (muted grey), weight 400

No bold, no large text. This section should feel like a quiet, honest aside.
```

---

## Builder Story Section

```
Layout: Left-aligned text block, max-width 600px
        NO card background — just text on cream

Font: 1rem, weight 400, line-height 1.8, color secondary text
      First line slightly larger (1.125rem) as a lead-in

No quote marks. No avatar. No decorative elements.
Just text. Like a magazine article opening paragraph.
```

---

## Floating WhatsApp Button

```css
position: fixed;
bottom: 24px;
right: 24px;
width: 56px;
height: 56px;
background: #25D366;  /* WhatsApp green — the ONLY green on the site */
border-radius: 50%;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);  /* exception: shadow here for visibility */
z-index: 999;

/* This is the ONLY element with a drop shadow. Everything else is flat. */
```

---

## Footer

```
Background: #2A1A1D (warm near-black — the only dark area on the site)
Color: #FFFAF5 (cream)
Padding: 48px 0 24px

Layout:
  Left: 🦀 蟹助手 logo + one-line description
  Center: Nav links (cream text, opacity 0.7, hover 1.0)
  Right: FPS / PayMe icons + email

Bottom bar: © 2026 蟹助手 | 香港製造
            Color: rgba(255,250,245, 0.4)
```

---

## Animation & Motion (Minimal)

```
- Page load: content fades in with translateY(12px) → translateY(0), opacity 0→1, duration 0.5s, ease-out
- Scroll: sections animate in once (IntersectionObserver), same fade-up pattern
- Hero tech cards: staggered entrance (delay 0.1s between each)
- Telegram mockup: auto-rotate every 6 seconds, crossfade transition
- Hover states: 0.2s ease transitions on buttons and cards

NO parallax. NO floating animations. NO pulsing. NO continuous motion.
The site should feel still and confident, not busy.
```

---

## Summary of Key Changes From Current Design

| Current | New |
|---------|-----|
| Dark mode background | Warm cream (#FFFAF5) light mode |
| Coral glow effects | Soft terracotta accents, no glow |
| Heavy card shadows | No shadows (border-only depth) |
| Bold 700 headings | Medium 500 headings (editorial calm) |
| Neon/tech feel | Warm premium consumer feel |
| Feature-dense layout | Generous whitespace, let it breathe |
| Aggressive CTAs | Ghost buttons + one solid CTA per section |
| Dark cards with borders | Cream cards with subtle 1px borders |

**The overall shift: from "tech startup selling to developers" to "premium consumer service you can trust."**

---

## What NOT to Change

- All text content (headlines, descriptions, copy) — keep exactly as-is
- Section order (as defined in lovable-changes.md item 11)
- Functionality (auto-rotating mockup, pricing toggle, mobile hamburger)
- WhatsApp/Telegram integration
- Pricing numbers and tier features
