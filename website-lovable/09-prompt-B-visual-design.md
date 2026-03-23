# Prompt B: Visual Design Overhaul — Superhuman-Inspired Premium Aesthetic

> Apply this AFTER Prompt A (content + structure) is complete and stable.
> This prompt changes ONLY visual styling. Do NOT change any text content, section order, page structure, or functionality.
> The site currently uses Tailwind CSS + shadcn/ui + Framer Motion. Keep that stack.

---

## Design Philosophy

**Calm confidence.** Premium minimalism with editorial warmth. The site should feel like a luxury consumer service, not a tech startup. Reference: superhuman.com meets notion.com — aspirational but approachable.

**The single biggest change: switch from dark mode to warm cream light mode.** The current dark theme with coral glow feels like a developer tool. We are selling to non-technical Hong Kong consumers — light = trustworthy, warm, approachable.

---

## Step 1: Update Tailwind Theme Colors

In `tailwind.config.ts` (or wherever the theme is defined), replace the current dark color system:

```
CURRENT (dark)                    →  NEW (warm cream light)
─────────────────────────────────────────────────────────────
background:  hsl(220 25% 7%)     →  #FFFAF5  (warm cream parchment)
foreground:  hsl(30 10% 95%)     →  #2A1A1D  (near-black, warm brown undertone)
card:        hsl(220 20% 10%)    →  #FFF7F0  (slightly warmer cream)
card-fg:     (inherit)           →  #2A1A1D
primary:     hsl(12 60% 58%)     →  #C75B39  (warm terracotta — keep the coral DNA)
primary-fg:  (white)             →  #FFFAF5  (cream)
secondary:   hsl(220 15% 16%)   →  #F5F0EB  (barely-there warm grey)
secondary-fg:(inherit)           →  #6B5E61  (muted warm grey)
muted:       (current)           →  #F5F0EB
muted-fg:    hsl(220 10% 55%)   →  #A89A9D  (warm grey for fine print)
accent:      (current)           →  #F5DDD1  (light coral wash)
accent-fg:   (current)           →  #C75B39
border:      (current)           →  rgba(42, 26, 29, 0.06)  (barely visible warm border)
ring:        (current)           →  #C75B39
```

**Do NOT use:** pure white (#FFFFFF) as background, pure black (#000000) as text, any blue, any neon color, any glow effects.

---

## Step 2: Typography Adjustments

**Keep** Noto Sans TC for Chinese and the existing system font stack. **Add** Inter as the preferred English font.

Key changes to existing text styles:

```
CURRENT                          →  NEW
─────────────────────────────────────────────────────────────
H1: font-bold (700)              →  font-medium (500)
H2: font-bold (700)              →  font-medium (500)
H3: font-semibold (600)          →  font-medium (500)
Body: unchanged                  →  unchanged (400)
```

**Rule:** Express hierarchy through SIZE, not weight. Most text should be weight 400-500. Do NOT use `font-bold` on headings — it looks like a startup pitch deck. We want editorial calm.

Add to headings: `tracking-wide` (letter-spacing: 0.025em) for Chinese readability.

---

## Step 3: Hero Section — Gradient Background

Replace the current dark hero background with a warm gradient:

```css
/* Hero section background */
background: linear-gradient(135deg, #E8D5C4 0%, #F5C6AA 30%, #E6A889 60%, #D4826A 100%);
```

All text inside the hero should be cream (#FFFAF5), not dark.

**Hero CTA button:** Change from solid coral to ghost/outline style:
```css
background: transparent;
border: 1px solid rgba(255, 255, 255, 0.2);
color: #FFFAF5;
border-radius: 12px;
backdrop-filter: blur(4px);
/* hover: background rgba(255,255,255,0.08) */
```

**Tech plugin cards** (the 4 cards at bottom of hero): frosted glass on the gradient:
```css
background: rgba(255, 255, 255, 0.08);
border: 1px solid rgba(255, 255, 255, 0.12);
backdrop-filter: blur(8px);
border-radius: 12px;
```

---

## Step 4: Navigation — Transparent Over Hero

**Over hero gradient:**
- Background: fully transparent (`bg-transparent`)
- Text: cream (#FFFAF5)
- Logo: cream
- Remove the current `backdrop-blur-xl bg-background/80`

**On scroll (past hero section):**
- Background: #FFFAF5 (cream, solid)
- Text: #2A1A1D (dark)
- Logo: dark
- Shadow: `box-shadow: 0 1px 0 rgba(0,0,0,0.06)` (barely visible line, NOT the current heavy blur)
- Transition: `transition: all 0.3s ease`

This means the nav needs scroll-aware state: detect when hero is out of viewport, then swap styles.

---

## Step 5: Card Styling — No Shadows

Replace ALL card styles across the site:

```css
/* REMOVE all box-shadow from cards */
/* REMOVE all glow effects */

/* New base card */
background: #FFF7F0;
border: 1px solid rgba(42, 26, 29, 0.06);
border-radius: 16px;  /* slightly rounder than current 12px */
padding: 24px;
box-shadow: none;

/* Card hover */
border-color: rgba(199, 91, 57, 0.15);  /* subtle terracotta on hover */
transition: border-color 0.2s ease;
```

**Featured pricing card (智能管家):**
```css
border: 2px solid #C75B39;
/* Remove the current scale-105 — use border distinction instead */
/* "⭐ 最受歡迎" badge: position absolute, top: -12px, centered */
```

**Tier-specific accent colors for pricing cards:**
- 🌱 新手上路: muted sage `#A0B4A0` for the tier emoji/label area
- ⭐ 智能管家: terracotta `#C75B39` for border + CTA (this tier POPs)
- 🚀 全能大師: warm bronze `#8B7355` for tier emoji/label area

Only 智能管家 gets a solid CTA button. Other tiers get outlined/ghost CTAs.

---

## Step 6: CTA Buttons — Three Styles

**1. Primary solid** (pricing 智能管家 CTA, final CTA, nav contact):
```
bg-[#C75B39] text-[#FFFAF5] rounded-[10px] px-7 py-3.5 font-medium
hover:bg-[#B04E30] transition-colors duration-200
```

**2. Ghost/outline** (hero CTA, non-featured pricing tiers):
```
bg-transparent border border-white/20 text-[#FFFAF5] rounded-xl px-7 py-3.5
hover:bg-white/[0.08] backdrop-blur-sm transition-all duration-200
```
(On light backgrounds, use `border-[#C75B39]/20 text-[#C75B39]` instead)

**3. Text link** (learn more, anchor links):
```
text-[#C75B39] font-medium hover:opacity-70 transition-opacity
```
Append " →" arrow character to text.

---

## Step 7: Section Spacing — Let It Breathe

Change section vertical padding across ALL content sections (everything below hero):

```
CURRENT                          →  NEW
─────────────────────────────────────────────────────────────
py-16 (64px)                     →  py-20 (80px)
Section heading mb-8 (32px)      →  mb-12 (48px)
Max container: max-w-7xl (1280px)→  max-w-5xl (1024px)  — tighter, more editorial
```

**Alternating subtle backgrounds** for visual rhythm:
- Odd sections: #FFFAF5 (cream)
- Even sections: #FFFFFF (pure white)
- The difference is barely visible — that's intentional

---

## Step 8: FOMO Banner — Keep Dark

The FOMO banner section ("2026 年，AI 智能體正在取代...") is the ONE section that stays dark:

```css
background: #1A1215;  /* very dark warm brown, NOT pure black */
color: #FFFAF5;
padding: 64px 24px;
text-align: center;
```

This creates a dramatic contrast moment between cream sections. No glow effects — just dark background + cream text.

---

## Step 9: "適合你嗎？" Section — Quiet and Warm

```css
/* Single centered card */
background: #FFF7F0;
border-radius: 16px;
padding: 40px;
max-width: 640px;
margin: 0 auto;
border: 1px solid rgba(42, 26, 29, 0.06);

/* ✅ items */
color: #5A8A5A;  /* muted green */

/* ❌ item */
color: #A89A9D;  /* muted grey */
```

No bold, no large text. Quiet, honest aside.

---

## Step 10: Builder Story — Editorial Layout

```css
/* No card background — just text on cream */
max-width: 600px;
margin: 0 auto;
text-align: left;  /* NOT centered — left-aligned like a magazine article */

/* First line */
font-size: 1.125rem;  /* slightly larger lead-in */

/* Rest of text */
font-size: 1rem;
font-weight: 400;
line-height: 1.8;
color: #6B5E61;  /* secondary text */
```

Remove any blockquote styling, quote marks, avatars, or decorative elements. Just clean text.

---

## Step 11: Footer — Dark Warm Anchor

```css
background: #2A1A1D;  /* warm near-black — the only dark area besides FOMO */
color: #FFFAF5;
padding: 48px 0 24px;

/* Links */
color: rgba(255, 250, 245, 0.7);
/* hover: opacity 1.0 */

/* Copyright line */
color: rgba(255, 250, 245, 0.4);
```

---

## Step 12: Floating WhatsApp Button

```css
/* Keep the existing implementation but refine: */
background: #25D366;  /* WhatsApp green — the ONLY green on the site */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

/* This is the ONLY element with a drop shadow. Everything else is flat. */
```

---

## Step 13: Animation Restraint

**Keep** the existing Framer Motion `fadeUp` stagger pattern — it works well.

**Remove or tone down:**
- Any pulsing animations
- Any continuous floating animations
- Any glow/shimmer effects

**Add if missing:**
- Hero tech cards: staggered entrance (0.1s delay between each)
- Auto-rotating mockup: crossfade transition (already in Prompt A)

**Rule:** The site should feel still and confident, not busy. No parallax. No continuous motion.

---

## Step 14: Pricing Page Specific Changes

**Toggle switch (Monthly/Annual):**
- Active state: terracotta `#C75B39` background
- Inactive: cream with border

**Feature comparison table** (below pricing cards):
- Make it **collapsed by default** with a "查看完整功能比較" expand button
- Organize by category: 基本功能 / AI 模型與記憶 / 搜尋與自動化 / 支援
- Use ✓ (terracotta) and — (muted grey) instead of ✅/❌ emoji

**ChatGPT comparison table:**
- Keep existing content
- Restyle to use warm cream card background with subtle border
- Remove any dark/heavy styling

---

## Summary: What Changes

| Element | Current | New |
|---------|---------|-----|
| Background | Dark navy `hsl(220 25% 7%)` | Warm cream `#FFFAF5` |
| Text | Cream on dark | Dark `#2A1A1D` on cream |
| Hero | Dark background | Warm coral gradient |
| Cards | Dark cards with coral glow | Cream cards, subtle border, no shadow |
| Headings | Bold 700 | Medium 500 |
| Buttons | Solid coral everywhere | Ghost on hero, solid only for featured CTA |
| Shadows | On cards | Removed (except WhatsApp float) |
| Nav on hero | Blurred dark glass | Transparent, cream text |
| Nav on scroll | Blurred dark glass | Solid cream, subtle line shadow |
| Spacing | py-16, max-w-7xl | py-20, max-w-5xl (tighter, more editorial) |
| Footer | Dark | Kept dark (warm near-black) |
| FOMO banner | N/A (new section) | Dark contrast moment |
| Overall feel | Tech startup / developer | Premium consumer / editorial |

## What NOT to Change

- All text content, headlines, descriptions, copy — keep exactly as-is from Prompt A
- Section order — keep exactly as defined in Prompt A
- All functionality (routing, toggle, mockup rotation, accordion, hamburger)
- WhatsApp/Telegram links and behavior
- Pricing numbers and tier features
- Framer Motion library usage (just adjust values, don't remove)
- shadcn/ui component usage (restyle, don't rebuild)
