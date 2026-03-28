# Prompt C: Design Review Visual Fixes

> Apply AFTER Prompt A (content/structure) and Prompt B (visual overhaul).
> This prompt fixes specific design and aesthetic issues identified in the professional design audit.
> It does NOT change content or page structure — only visual styling, contrast, spacing, and polish.

---

## Instructions

Apply ALL changes below in a single pass. Changes are grouped by priority. Do not skip any P0 items. P1 and P2 are also included — apply them all.

---

## 1. CSS Variables — Fix Surface Contrast + Add Missing Tokens

In `index.css`, update the `:root` CSS variables. The current surfaces (`--background`, `--card`, `--section-alt`) are too similar — cards look like they're floating on the same surface. Fix:

```css
:root {
  /* CHANGE these existing values */
  --card: 25 60% 96%;              /* was: 25 100% 97% — more visible against background */
  --section-alt: 25 30% 90%;       /* was: 25 30% 93% — stronger alternating contrast */

  /* ADD these new tokens */
  --primary-light: 14 55% 93%;     /* for subtle primary-tinted backgrounds */
  --success: 142 60% 40%;          /* for checkmarks, positive indicators */
  --dark-surface: 350 20% 8%;      /* formalized dark bg (was hardcoded #1A1215) */
  --dark-surface-elevated: 350 18% 12%;  /* dark cards/elevated elements */
}
```

Also in `tailwind.config.ts`, add the new color tokens:
```
"primary-light": "hsl(var(--primary-light))",
"success": "hsl(var(--success))",
"dark-surface": "hsl(var(--dark-surface))",
```

---

## 2. Hero Gradient — Fix Text Contrast (WCAG AA Failure)

The current hero gradient produces ~2.8:1 contrast ratio for white text. WCAG AA requires 4.5:1. Darken the gradient.

In `Index.tsx`, find the hero section's inline `background` style and change:
```
OLD: linear-gradient(135deg, #E8D5C4 0%, #F5C6AA 30%, #E6A889 60%, #D4826A 100%)
NEW: linear-gradient(135deg, #C49A7E 0%, #B87A5E 40%, #A35D40 70%, #8B3D28 100%)
```

Also update `--hero-gradient` in `index.css` to match.

Change the primary CTA button on the hero from coral-on-coral to white for maximum contrast:
```
OLD: className using bg-primary text-primary-foreground
NEW: className="bg-white text-[#A35D40] hover:bg-white/90 rounded-2xl text-base px-7 py-3.5 shadow-lg font-semibold"
```

The secondary "了解更多" ghost CTA should use white border:
```
className="border-white/60 text-white hover:bg-white/10"
```

---

## 3. Hero — Show Telegram Mockup on Mobile

The Telegram chat mockup currently uses `hidden lg:block`, which hides it on mobile. Over 60% of visitors see zero product demonstration. Fix:

Remove `hidden lg:block` from the mockup container. Replace with responsive sizing:
```
className="block mt-8 lg:mt-0 max-w-xs mx-auto lg:max-w-sm lg:mx-0 scale-90 lg:scale-100"
```

On mobile, the mockup should appear below the hero text and CTAs, before the plugin cards.

---

## 4. Typography — Standardize Heading Scale

Currently headings vary wildly across pages (H1 ranges from `text-3xl` to `text-6xl`, H2 from `text-xl` to `text-4xl`). Standardize:

In `index.css`, change the base h1 rule:
```css
h1 {
  @apply font-bold;  /* was font-extrabold — too dense for Chinese at large sizes */
  line-height: 1.3;
}
```

Apply these consistent sizes across ALL pages:
- **H1 (page titles):** `text-3xl md:text-5xl font-bold`
- **H2 (section headings):** `text-2xl md:text-3xl font-bold`
- **H3 (sub-sections, card titles):** `text-xl font-semibold`

Specific fixes needed:
- `Index.tsx` hero H1: change from `text-4xl md:text-6xl font-extrabold` → `text-3xl md:text-5xl font-bold`
- `Index.tsx` section H2s: standardize all to `text-2xl md:text-3xl` (some currently use `text-3xl md:text-4xl`)
- All pages: ensure no H2 is larger than `text-3xl` on desktop

---

## 5. Chinese Body Text — Minimum 16px

Multiple sections use `text-sm` (14px) for Chinese body copy. For the target demographic (30-50 age range), minimum comfortable reading size for Chinese on screens is 16px.

**Change all Chinese body text from `text-sm` to `text-base` across ALL pages.** Keep `text-sm` ONLY for:
- English labels and metadata
- Technical specification text (model names like "DeepSeek V3")
- Tag badges and captions

Specific files to check:
- `Pricing.tsx`: feature list items, comparison table cells
- `Index.tsx`: use case card descriptions, qualifier items
- `FAQ.tsx`: accordion answer text
- `Contact.tsx`: card description text

---

## 6. Pricing Page — Fix Card Visual Hierarchy

The decoy effect is not working because all three tier cards have similar visual weight. The popular tier (智能管家) must be visually dominant.

Changes to the popular tier (智能管家) card:
- Add `md:scale-105 md:-my-4` to make it physically larger than siblings
- Increase price font size from `text-3xl` to `text-4xl md:text-5xl`
- Ensure its border is `border-primary border-2` (keep existing)
- Its shadow should be `shadow-xl` (not `shadow-lg`)

Changes to the decoy tier (新手上路) card:
- Background: change `bg-muted` to `bg-muted/70` (slightly more faded)
- For missing features with X icons: change from `text-muted-foreground/50` to `text-muted-foreground` AND add `line-through` to the label text so missing features are clearly crossed out, not just dimmed

Changes to premium tier (全能大師):
- Keep current styling but ensure its price is `text-3xl` (smaller than popular tier's `text-4xl`)

---

## 7. Pricing Page — Promo Banner Must Be Bold

The current promo banner uses `bg-accent/50` which is nearly invisible against the cream background. This is supposed to be the most urgent element.

Change:
```
OLD: className="bg-accent/50 border-b border-border"
     text: className="text-sm font-bold text-primary"
NEW: className="bg-primary text-white py-3"
     text: className="text-sm font-bold text-white"
```

---

## 8. Pricing Page — ChatGPT Comparison Table

Good content, weak visual execution. Fix:

- Wrap the entire table in: `className="rounded-2xl border-2 border-primary/20 overflow-hidden shadow-sm"`
- Add `bg-emerald-50` (or `bg-success/10` if using the new token) to ALL cells in the ClawHK/蟹助手 column
- Add `bg-muted/50` to ALL cells in the ChatGPT Plus column
- Add `bg-muted py-4` to the header row for visual separation
- Remove the "差價" (+HK$92) row entirely — it draws attention to cost. Let the copy below handle the price justification.
- Replace emoji ✅/❌ with Lucide `<Check>` and `<X>` components:
  - Check: `<Check className="h-4 w-4 text-emerald-600" />`
  - X: `<X className="h-4 w-4 text-destructive" />`

---

## 9. Landing Page — How It Works Section (Light Background)

Currently uses `bg-[#1A1215]` dark background. This is the second dark section on the page (after FOMO) and breaks visual rhythm. Change to light.

- Background: change from `bg-[#1A1215]` to `bg-section-alt` (cream)
- All text: change from `text-white` to `text-foreground` / `text-muted-foreground`
- Replace emoji icons (💬, 🔧, 🚀) with numbered circles:
```jsx
<div className="h-12 w-12 rounded-full bg-primary text-white text-lg font-bold flex items-center justify-center mx-auto">1</div>
```
- Add connecting line on desktop between the 3 columns: a horizontal dashed border at the circle level using `border-t-2 border-dashed border-primary/20`
- Step label ("Step 1" etc.): change from `text-sm text-white/40` to `text-sm text-muted-foreground font-medium`

---

## 10. Landing Page — Spacing Standardization

Card padding varies from `p-5` to `p-10` across the page with no system. Standardize:

- **Compact cards** (plugin cards, stat items, tech stack cards): `p-6`
- **Feature/content cards** (use cases, qualifier, monthly fee box): `p-8`
- Remove any `p-5` or `p-10` usage

Content max-width standardization:
- Standard content sections: `max-w-4xl mx-auto`
- Grid sections (cards, tech stack): `max-w-5xl mx-auto`
- Focused text blocks (our story, qualifier): `max-w-2xl mx-auto`
- Remove `max-w-[600px]` — use `max-w-2xl` (672px) instead, which suits Chinese text line lengths better

Section content gaps:
- Section heading to content: `space-y-8`
- Between content items: `space-y-4` or `space-y-6`
- Between sections: `py-20` (keep as is — already consistent)

---

## 11. Use Case Cards — Improve Visual Impact

The 6 use case cards are flat and identical. Fix:

- Remove `italic` from Chinese prompt text. Chinese does not have a natural italic tradition; synthesized italic looks awkward with Noto Sans TC. Use: `text-base text-muted-foreground leading-relaxed` (note: `text-base` not `text-sm`)
- Increase card border visibility: change border to `border-border/50` or use `shadow-md` instead of `shadow-sm`
- Add a subtle left accent border: `border-l-2 border-l-primary/30`
- Make tag colors correspond to categories:
  - 效率 → blue (`bg-blue-100 text-blue-700`)
  - 學習 → green (`bg-emerald-100 text-emerald-700`)
  - 創業 → amber (`bg-amber-100 text-amber-700`)
  - 生活 → rose (`bg-rose-100 text-rose-700`)
  - 寫作 → purple (`bg-purple-100 text-purple-700`)
  - 記憶 → cyan (`bg-cyan-100 text-cyan-700`)
- Add hover lift: `hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`

---

## 12. Contact Page — Fill Empty Space

The page feels incomplete with three cards in a white void. Add substance:

- Replace emoji icons (📱, ✈️, 📷) with Lucide icons with brand colors:
  - WhatsApp: `<MessageCircle className="h-8 w-8 text-[#25D366]" />`
  - Telegram: `<Send className="h-8 w-8 text-[#26A5E4]" />`
  - Instagram: `<Camera className="h-8 w-8 text-[#E4405F]" />`
- Add business hours below the contact cards:
  ```
  服務時間：每日 10:00-22:00（包括週末及公眾假期）
  ```
  Style: `text-center text-muted-foreground mt-8`
- Remove the redundant paragraph "直接用 WhatsApp 或 Telegram 聯絡我們最快！" — it repeats what the cards already show
- Add a mini FAQ teaser below: "其他問題？查看[常見問題](/faq)了解更多" with a link

---

## 13. Footer — Enhancements

- Add social media icon row (WhatsApp, Telegram, Instagram) below the brand description, using Lucide icons at `h-5 w-5` with `hover:text-white transition-colors`
- Add placeholder legal links: `服務條款 | 私隱政策 | 退款政策` — these can be `#` links for now
- Match payment methods with Pricing page: add "銀行轉帳" to the payment pills if not present
- Check footer text contrast: `#FFFAF5` at 70% opacity on `#2A1A1D`. If below 4.5:1, increase to 80% or 90% opacity.
- Remove the "信用卡 / Visa / Mastercard 自動扣款即將推出" text until it's actually ready — "coming soon" text undermines trust

---

## 14. Navigation — Fix Active State Layout Shift

Currently the nav active state uses `font-bold` which is wider than normal weight, causing layout shift when switching pages.

- Change both active and inactive nav links to `font-semibold`
- Differentiate active state with color only: active = `text-primary`, inactive = `text-foreground/70`
- Add `aria-current="page"` to the active nav link for accessibility

---

## 15. Scroll Animations — Apply Consistently

Currently only one section on the Index page uses `whileInView` Framer Motion animations. Apply the existing `fadeUp` variant to ALL sections:

Add to each section's container:
```jsx
<motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
```

Apply to: Use Cases, Qualifier, Before/After, How It Works, Our Story, Final CTA sections.

---

## 16. Card Micro-Interactions

Add subtle hover lift to ALL interactive cards across the entire site:
```
hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200
```

Apply to: plugin cards, tech stack cards, use case cards, pricing tier cards, contact cards, FAQ accordion items.

---

## 17. Accessibility Quick Fixes

1. **Skip-to-content link** — In `Layout.tsx`, add before the Navbar:
```jsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
  跳到主要內容
</a>
```
And add `id="main-content"` to the `<main>` element.

2. **Telegram mockup pause** — Add a small pause/play button to the auto-rotating Telegram demo. Add `aria-live="polite"` to the mockup container.

3. **Focus styles** — Ensure all interactive elements have visible focus-ring styles. Add to `index.css`:
```css
*:focus-visible {
  @apply ring-2 ring-primary ring-offset-2 ring-offset-background outline-none;
}
```

---

## Summary of ALL Changes

| # | Change | What It Fixes |
|---|--------|--------------|
| 1 | CSS variable updates | Cards invisible against background |
| 2 | Hero gradient darkening | White text fails WCAG contrast |
| 3 | Mobile hero mockup | 60% of visitors see no product demo |
| 4 | Typography scale | Inconsistent heading sizes across pages |
| 5 | Chinese text min 16px | Body text too small for target age group |
| 6 | Pricing card hierarchy | Decoy effect not working visually |
| 7 | Promo banner bold | Urgency banner is invisible |
| 8 | Comparison table styling | Strongest selling argument looks plain |
| 9 | How It Works light bg | Too many dark sections break rhythm |
| 10 | Spacing standardization | Inconsistent padding and max-widths |
| 11 | Use case cards styling | Cards flat, identical, italic Chinese |
| 12 | Contact page substance | Page feels empty and incomplete |
| 13 | Footer enhancements | Missing social links, legal links, trust |
| 14 | Nav active state fix | Layout shift on page navigation |
| 15 | Scroll animations | Inconsistent — some sections animate, others don't |
| 16 | Card hover effects | No tactile interaction feedback |
| 17 | Accessibility fixes | Skip link, focus styles, mockup pause |
