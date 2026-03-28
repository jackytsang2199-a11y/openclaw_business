# Prompt E1: Rebrand, Color Palette & Structure

> Apply AFTER Prompts A-D.
> This prompt rebrands the site, applies a new color palette, removes sections, and restructures pages.
> It does NOT rewrite copy — that comes in Prompt E2.

---

## 1. Rebranding — NexGen (SITE-WIDE)

Replace ALL instances of the old brand across every file:

| Find | Replace with |
|------|-------------|
| `蟹助手` | `NexGen` |
| `ClawHK` | `NexGen` |
| `clawhk` | `nexgen` |
| `🦀` emoji (everywhere) | Remove entirely, no replacement emoji |
| `clawhk.com` | `nexgen.com` |

Specific locations to check:
- **Navbar** (`Navbar.tsx`): `🦀 蟹助手` → `NexGen`
- **Footer** (`Footer.tsx`): `蟹助手 ClawHK` → `NexGen`, copyright → `© 2026 NexGen. All rights reserved.`
- **Telegram mockup** (`Index.tsx` hero): chat header `🦀 蟹助手` → `NexGen`
- **Pricing comparison table** (`Pricing.tsx`): `蟹助手 智能管家` → `NexGen 智能管家`
- **All meta/title tags** if any reference the old name
- **Social URLs**: `t.me/clawhk` → `t.me/nexgenai`, `instagram.com/clawhk` → remove entirely

Do NOT add a Chinese name. `NexGen` is the brand everywhere, English only.

---

## 2. Color Palette Overhaul — 60/30/10 (SITE-WIDE)

The brand is changing from warm boutique to professional tech. Apply the 60/30/10 rule strictly.

### 2A. New CSS Variables

Replace the existing `:root` CSS variables in `index.css`:

```css
:root {
  /* 60% — Clean, neutral light surfaces */
  --background: 0 0% 98%;
  --foreground: 222 47% 11%;

  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;

  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;

  --secondary: 210 20% 96%;
  --secondary-foreground: 215 16% 47%;

  --muted: 210 20% 96%;
  --muted-foreground: 215 16% 47%;

  --section-alt: 210 15% 95%;

  /* 30% — Dark slate for hero, dark sections, footer */
  --dark-surface: 222 47% 6%;
  --dark-surface-elevated: 222 40% 10%;
  --dark-section: 222 47% 8%;
  --dark-section-foreground: 210 40% 96%;

  /* 10% — Single accent: blue */
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  --primary-light: 217 91% 95%;
  --ring: 217 91% 60%;

  --accent: 217 91% 95%;
  --accent-foreground: 217 91% 50%;

  --success: 142 60% 40%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  --border: 222 47% 11% / 0.08;
  --input: 222 47% 11% / 0.08;

  --radius: 1rem;

  /* Hero gradient — dark slate */
  --hero-gradient: linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #020617 100%);

  /* Accent system — for tag badges only */
  --accent-teal: 172 50% 42%;
  --accent-teal-light: 172 40% 94%;
  --accent-amber: 36 90% 52%;
  --accent-amber-light: 36 60% 94%;

  /* Sidebar (keep functional) */
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 215 16% 47%;
  --sidebar-primary: 217 91% 60%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 210 20% 96%;
  --sidebar-accent-foreground: 215 16% 47%;
  --sidebar-border: 222 47% 11% / 0.06;
  --sidebar-ring: 217 91% 60%;

  --whatsapp: 142 70% 45%;
}
```

### 2B. Hero Gradient

In `Index.tsx`, change the hero section's inline `background` style:
```
OLD: linear-gradient(135deg, #C49A7E 0%, #B87A5E 30%, #A35D40 60%, #7A2E1A 100%)
NEW: linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #020617 100%)
```

### 2C. Dark Sections

Replace any hardcoded brown-toned dark backgrounds:
- `#1A1215` → `hsl(var(--dark-surface))`
- `#2A1A1D` → `hsl(var(--dark-surface))`
- Footer, FOMO (being removed), Before/After, Final CTA — all should use the new slate dark tokens.

### 2D. Plugin Cards in Hero

Remove individual colored gradients from plugin cards. Replace with uniform glass:
```
All plugin cards: className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 text-center space-y-2 hover:border-white/25 card-hover"
```

### 2E. Design Intent

| Layer | % | Color | Used For |
|-------|---|-------|----------|
| **Dominant** | 60% | White #FAFAFA + light grey | Backgrounds, cards, section-alt |
| **Secondary** | 30% | Dark slate #0F172A | Hero, dark sections, footer, text |
| **Accent** | 10% | Blue #3B82F6 | CTAs, links, active states — ONE color |

---

## 3. Remove FOMO Strip (Index.tsx)

Delete the entire section:
```
2026 年，AI 智能體正在取代傳統聊天機器人。
你還在用受限的 ChatGPT 嗎？
```
Remove completely — no empty container.

---

## 4. Remove Video Demo Section (Index.tsx)

Delete the entire section:
```
這不是普通聊天機器人 — 是真正幫你做事的 AI 智能體。
搜尋資料、整理日程、處理文件...
```
Remove completely.

---

## 5. Remove Qualifier Section (Index.tsx)

Delete the entire `適合你嗎？` section with its 4 qualifier items. Remove completely.

---

## 6. Remove All Instagram (SITE-WIDE)

- **Contact.tsx**: Remove the Instagram contact card. Keep only WhatsApp + Telegram. Change grid from `sm:grid-cols-3` to `sm:grid-cols-2`.
- **Footer.tsx**: Remove the Instagram SVG icon and link.
- **Any constants**: Remove `INSTAGRAM_URL`.

---

## 7. Remove Contact Business Hours (Contact.tsx)

Delete the line: `服務時間：每日 10:00-22:00（包括週末及公眾假期）`

---

## 8. Simplify Pricing Page Structure (Pricing.tsx)

Remove these sections entirely:
- ChatGPT comparison table (the `comparisonRows` data and all rendering)
- Monthly fee explanation box (`月費包含甚麼？— 全包，不用煩`)
- Add-ons table (`附加服務`)
- Payment methods section
- Daily cost reframe line (`智能管家 HK$248/月 = 每日 HK$8.3...`)

Keep:
- Promo banner
- Page heading + annual/monthly toggle
- 3 pricing tier cards
- Bottom CTA

---

## 9. Integration Logo Strip — Modify (Index.tsx)

- **Keep:** WhatsApp, Telegram
- **Discord:** Keep icon but add below the name:
```jsx
<span className="text-[10px] text-muted-foreground/60">即將推出</span>
```
- **Slack:** Remove entirely

---

## 10. Navbar Fix (Navbar.tsx)

- Replace `🦀 蟹助手` with `NexGen` (no emoji).
- The navbar on homepage appears grey/dark while other pages are white. Verify the `overHero` transparent logic works correctly with the new dark slate hero gradient. The navbar should be transparent over the hero, and solid `bg-background` on other pages.

---

## 11. Stat Strip Fix (Index.tsx)

Fix typo: the `Top 50` stat label currently renders as "Top 50Top GitHub Global". Fix so it displays correctly as `Top 50 GitHub Global`.

---

## 12. Landing Page Section Order (After Removals)

After removing FOMO strip, video demo, and qualifier, ensure sections appear in this order:

```
1.  Hero
2.  Stat Strip
3.  Plugin Ecosystem + Tech Stack
4.  Use Cases
4.5 Mid-page CTA strip
5.  Before/After comparison (dark section)
6.  How It Works
7.  Integration Logo Strip
8.  Inline FAQ
9.  Story + Trust + Final CTA
```

---

## Summary

| # | Change | Scope |
|---|--------|-------|
| 1 | Rebrand to NexGen | Site-wide |
| 2 | Color palette: 60/30/10 (white + slate + blue) | Site-wide (CSS, components) |
| 3 | Remove FOMO strip | Index.tsx |
| 4 | Remove video demo section | Index.tsx |
| 5 | Remove qualifier section | Index.tsx |
| 6 | Remove all Instagram | Site-wide |
| 7 | Remove business hours | Contact.tsx |
| 8 | Simplify pricing page | Pricing.tsx |
| 9 | Integration logos modify | Index.tsx |
| 10 | Navbar fix + rebrand | Navbar.tsx |
| 11 | Stat strip typo fix | Index.tsx |
| 12 | Section reorder | Index.tsx |
