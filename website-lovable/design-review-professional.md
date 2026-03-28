# ClawHK Website -- Professional Design Review

> Reviewed by: UI/UX Design Agent | Date: 2026-03-23
> Scope: Full-site audit of ClawHK (localhost:8080) vs Contabo OpenClaw Hosting reference
> Stack: React + Vite + Tailwind CSS + shadcn/ui + Framer Motion

---

## Executive Summary

ClawHK's current website demonstrates competent structural thinking -- the information architecture is sound, the copywriting is persuasive and well-localized, and the warm coral brand identity is distinctive in a market dominated by cold blues and blacks. However, the execution suffers from three systemic issues that undermine conversion: (1) insufficient visual hierarchy and contrast between sections, creating a "wall of beige" effect; (2) the hero section fails to communicate the product's value within 3 seconds because it leads with abstract claims rather than a concrete demonstration; and (3) the pricing page, despite strong copywriting, lacks the visual polish and trust signals that justify asking non-technical consumers for HK$148-388/month. The site is roughly 60% of where it needs to be for launch -- the bones are excellent, but the skin needs significant refinement.

---

## Section-by-Section Analysis

### Landing Page (Index.tsx)

#### Section 1: Hero + Plugin Cards

**Current state:**
- Full-width gradient background: `linear-gradient(135deg, #E8D5C4 0%, #F5C6AA 30%, #E6A889 60%, #D4826A 100%)`
- Left column: H1 ("最強 AI 智能體"), subtitle, micro-copy, two CTAs
- Right column: Auto-rotating Telegram chat mockup (hidden on mobile via `hidden lg:block`)
- Below: 4 plugin cards in a 2x4 grid with glassmorphism

**Design problems:**

1. **Hero headline lacks punch.** `text-4xl md:text-6xl text-white` on a medium-warm gradient produces low contrast. The white text on `#E6A889` (the middle range) has an estimated contrast ratio of ~2.8:1 -- below WCAG AA (4.5:1). The hero gradient is too uniform in lightness; it reads as "pleasant" rather than "commanding."

2. **No product screenshot or visual proof.** The Telegram mockup is clever but purely constructed from code -- no actual screenshot or photo of the product in use. Non-technical consumers need to SEE a real interface. The mockup is also hidden entirely on mobile (`hidden lg:block`), meaning mobile visitors get zero visual demonstration.

3. **Plugin cards blend into the hero.** The `bg-white/[0.1] backdrop-blur-md border-white/15` glassmorphism is too subtle. These cards communicate the core technical moat but they look like footnotes. They need stronger presence.

4. **CTA button contrast.** The primary CTA uses `bg-primary text-primary-foreground` which resolves to `hsl(14 55% 50%)` on `hsl(28 100% 98%)` -- approximately a warm coral on cream. On the hero gradient, this coral-on-coral creates insufficient contrast. The CTA does not visually "pop."

5. **Typography weight.** H1 is `font-extrabold` but the Chinese characters in Noto Sans TC at extrabold can appear very dense and hard to read at large sizes. Consider `font-bold` with a slightly larger size instead.

6. **Spacing.** `py-20 md:py-32` is generous but the gap between the hero text and the plugin cards (`mt-16`) creates an ambiguous relationship -- are the cards part of the hero or a separate section?

**How Contabo handles this:**
- Dark hero background (`#0a0a0b`) with high-contrast white text and a large product illustration
- Clear H1: "Self-Hosted OpenClaw: The AI Assistant that Acts for You"
- Three checkmark value props inline: "Free Pre-Installed / Always-On / Full Data Control"
- Trustpilot widget immediately below the hero
- No gradient ambiguity -- solid dark background ensures text legibility

**Recommendations:**
- Darken the hero gradient. Replace the current range with something like `linear-gradient(135deg, #C49A7E 0%, #B87A5E 40%, #A35D40 70%, #7A3F2A 100%)` to push contrast above 4.5:1 for white text.
- Add a visible Telegram mockup on mobile. Either show a smaller version or use a static screenshot.
- Increase plugin card opacity: change `bg-white/[0.1]` to `bg-white/[0.2]` and `border-white/15` to `border-white/25`.
- Make the primary CTA white with coral text on the hero: `bg-white text-primary hover:bg-white/90` for maximum contrast.
- Add a secondary visual -- even a simple illustration or icon set showing Telegram + Memory + Search would help.

---

#### Section 2: FOMO Banner

**Current state:**
- Dark background `bg-[#1A1215]`, three centered text blocks
- "2026 年，AI 智能體正在取代傳統聊天機器人..."
- "全球已有超過 200 萬人每週使用開源 AI 智能體。"
- "你還在用受限的 ChatGPT 嗎？" in `text-primary`

**Design problems:**

1. **Transition shock.** Going from the warm pastel hero directly to `#1A1215` (near-black with a slight warm tint) is jarring. There is no visual transition or separator.

2. **Section feels empty.** Three lines of centered text in `py-20` with `max-w-3xl` creates excessive whitespace. The dark section looks like a footer or error state at first glance.

3. **The FOMO message is too abstract.** "200 萬人每週使用" -- users do not know what OpenClaw is yet. This stat has no anchor.

**How Contabo handles this:**
- Contabo does NOT use fear-based messaging. Instead, they immediately follow the hero with a Trustpilot social proof widget, then product cards. The tone is confident, not anxious.

**Recommendations:**
- Either remove this section or merge it with Section 3 (Repositioning Bridge) into a single, more substantive section.
- If kept, add a subtle visual element -- perhaps a thin top border in primary color, or animated counter for the stats.
- Change background to `bg-[#1E1518]` for a slightly warmer dark, and add `border-t border-primary/10` for transition.
- Consider replacing with a social proof bar (testimonials, logos, or user count) instead of abstract FOMO copy.

---

#### Section 3: Repositioning Bridge

**Current state:**
- `bg-background` (white-cream), centered text
- "這不是普通聊天機器人 -- 是真正幫你做事的 AI 智能體。"
- Subtitle: "搜尋資料、整理日程、處理文件..."

**Design problems:**

1. **This section is structurally redundant.** It says the same thing as the hero subtitle. The hero already says "ChatGPT 做不到的，它全部做到。" and this adds "這不是普通聊天機器人" -- same message, different words.

2. **Visual weight is wrong.** Using `text-xl md:text-2xl font-bold` for what is essentially a bridge statement gives it the visual weight of a section header, but it has no supporting content below it. It reads as an orphan.

3. **Background matches Section 5 (Use Cases).** Both use `bg-background`, creating a sense that sections are running together. The alternating background pattern (cream / dark / cream / tan / cream / tan / dark / cream / tan) is too complex and inconsistent.

**Recommendations:**
- Delete this section entirely. Merge its messaging into the hero subtitle or into the Section 4 header.
- If preserved, reduce to a single-line accent: a thin banner with `py-8` instead of `py-20`, using `text-base text-muted-foreground` with an icon.

---

#### Section 4: Credibility + Tech Stack

**Current state:**
- Alt background `hsl(25 30% 93%)` -- a noticeably darker cream
- Three sub-layers: Platform stats (4 stat cards), Plugin ecosystem description, 6 tech stack cards
- Stat cards show GitHub numbers (200,000+ stars, 35,000+ forks, 2M+ weekly, Top 50)

**Design problems:**

1. **Too many sub-sections crammed into one section.** Layer A (stats), Layer B (plugin claim), and Layer C (tech cards) all share the same background, making it read as one overwhelming block. The visual rhythm is: heading -> cards -> heading -> paragraph -> heading -> cards. This is exhausting.

2. **Stats are unverified.** "200,000+ GitHub Stars" for "OpenClaw" -- these numbers are presented without a link or logo. For non-technical users, GitHub stars mean nothing. For technical users who might fact-check, there is no link.

3. **Tech stack cards link to `/technology`.** The cards use `<Link to="/technology">` which is appropriate, but the cards are visually identical to the stat cards above them. Different content types should have different visual treatments.

4. **The claim "經過數月研究、調試與深度整合" is text-only.** There is no visual proof -- no architecture diagram, no before/after, no certification badge.

5. **"由資深工程團隊打造 / 10+ 年系統架構經驗 / 企業級部署標準"** -- these credibility claims are buried in `text-sm text-muted-foreground`. If they matter enough to include, they deserve more visual prominence.

**How Contabo handles this:**
- Contabo uses dedicated sections for each concept, with clear H2 headings and accompanying illustrations.
- "What is OpenClaw?" gets its own image-left/text-right layout with a custom SVG illustration.
- "What Can You Do?" gets a 4-card grid with custom icons, each with a short paragraph.
- Trust numbers ("Trusted by thousands") get their own section near the bottom.

**Recommendations:**
- Split into 2-3 distinct sections. Stat bar as a compact horizontal strip. Tech stack as a dedicated section with proper icons.
- For the stat bar, use a simpler inline format: a single row of 4 stats without cards, just `text-2xl font-bold` numbers with `text-xs` labels, no border/bg treatment. Place this directly after the hero.
- Give tech stack cards actual icons (the Lucide icons used in the plugin cards on the hero would work). Add `h-10 w-10` icons above each card's name.
- Add the OpenClaw logo (or a link to their GitHub) next to the credibility claim.
- Replace the vague "由資深工程團隊打造" with something verifiable: "3 位工程師 / 10+ 年經驗" with small avatar placeholders.

---

#### Section 5: Use Cases (6 cards)

**Current state:**
- `bg-background`, 3-column grid of 6 cards
- Each card: Lucide icon + tag badge + title + italic prompt example
- Tags: 效率, 學習, 創業, 生活, 寫作, 記憶

**Design problems:**

1. **Cards are visually flat.** `border-border bg-card shadow-sm` with `rounded-2xl` -- the border is barely visible (`350 22% 14% / 0.08` = ~8% opacity). The cards appear to float without grounding.

2. **Icon + tag layout is reversed.** The icon is on the left and the tag is on the right (`justify-between`), but the eye naturally reads left-to-right expecting the tag to be the label for the icon. Instead, the icon labels the content and the tag categorizes it. Consider putting both on the same side or removing the tags entirely.

3. **Italic prompt text is hard to scan.** `text-sm text-muted-foreground italic` with Chinese characters in italics is not a strong typographic choice. Chinese does not have a natural italic tradition; the synthesized italic looks awkward with Noto Sans TC.

4. **No visual differentiation between card types.** All 6 cards look identical. The tags (效率, 學習, 創業, etc.) are the only differentiator, but they are tiny (`text-[10px]`).

**How Contabo handles this:**
- "What Can You Do?" uses larger custom SVG icons (not generic Lucide icons) in a 4-column grid with centered layout. Each card has a bold title and a full-sentence description. No tags.

**Recommendations:**
- Remove italics from prompt text. Use regular weight: `text-sm text-muted-foreground leading-relaxed`.
- Increase card border visibility: change border to `border-border/50` or use `shadow-md` instead of `shadow-sm`.
- Consider adding a subtle left-border accent in primary color for each card: `border-l-2 border-l-primary/30`.
- Make the tag colors correspond to categories: 效率 = blue, 學習 = green, 創業 = amber, etc.
- On mobile, switch to 1 column (currently `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` which is fine).

---

#### Section 6: Qualifier ("適合你嗎？")

**Current state:**
- Alt background `hsl(25 30% 93%)`, centered card with check/dash list
- 3 positive qualifiers ("fit: true") and 1 negative ("fit: false")

**Design problems:**

1. **The negative qualifier undermines the CTA.** "本身已懂 Docker / Linux 自己安裝 -- 可能不需要我們" actively encourages a segment to leave. While honest, it should be phrased more carefully to retain the visitor: "懂技術的朋友也可以省時間讓我們處理" would be better.

2. **Visual treatment is too subtle.** The green `text-[#5A8A5A]` is a muted sage -- appropriate for sophistication but too quiet for a conversion-oriented element. The negative item uses `text-muted-foreground` which is nearly invisible.

3. **The card sits alone** in `max-w-xl mx-auto` with no supporting elements. It looks orphaned.

**Recommendations:**
- Reframe the negative qualifier positively. Keep the honesty but redirect: "本身已懂技術？你可以自己安裝，或者讓我們幫你省時間。"
- Increase the check color: `text-emerald-600` instead of `text-[#5A8A5A]`.
- Add a subtle CTA at the bottom of the card: "還不確定？WhatsApp 我們聊聊" as a text link.

---

#### Section 7: Before/After Comparison Table

**Current state:**
- `bg-background`, comparison table with 6 rows
- Columns: label / DIY / ClawHK
- ClawHK column emphasizes checkmarks and benefits

**Design problems:**

1. **Tables on mobile are problematic.** The `overflow-x-auto` wrapper handles horizontal scroll, but the table content is dense enough that mobile users will need to scroll horizontally, which is a friction point.

2. **The "自己安裝" column should look worse.** Currently both columns have similar visual weight. The DIY column should be visually de-emphasized (grayed out, smaller text) while the ClawHK column should be highlighted (subtle primary background, bolder text).

3. **No header row styling.** The `<thead>` row has no background color, making it hard to distinguish from body rows.

**How Contabo handles this:**
- Contabo does not use comparison tables. They use descriptive sections with image+text layouts. However, comparison tables are common in B2C SaaS and can be effective when styled properly.

**Recommendations:**
- Add a subtle background to the ClawHK column: apply `bg-primary/5` to each `<td>` in the third column.
- Style the header row with `bg-muted` and add `py-4` for more breathing room.
- On mobile, consider converting to a stacked card format instead of a table: each row becomes a mini-card showing "DIY: 3-8 hours" vs "Us: 30 minutes."
- Add `rounded-xl overflow-hidden border border-border` around the entire table for visual containment.

---

#### Section 8: How It Works (3 Steps)

**Current state:**
- Dark background `bg-[#1A1215]`, 3-column grid with emoji + step number + title + description

**Design problems:**

1. **Emoji icons are inconsistent with the rest of the design.** The site uses Lucide icons everywhere else, but this section uses emoji (💬, 🔧, 🚀). This creates a visual disconnect.

2. **Step indicators are weak.** `text-sm text-white/40` for "Step 1" is nearly invisible. The step numbers should be the primary visual anchor for this section.

3. **No connecting line or arrow between steps.** The 3-column layout implies parallel items, not sequential steps. A horizontal line, arrow, or numbered progression would communicate the sequential nature.

4. **Second dark section on the page.** This is the second `bg-[#1A1215]` section (after the FOMO banner). Two dark bands on a predominantly light page create an inconsistent rhythm.

**Recommendations:**
- Replace emoji with numbered circles: `h-12 w-12 rounded-full bg-primary text-white text-lg font-bold flex items-center justify-center` containing "1", "2", "3".
- Add a connecting line on desktop: a thin `border-t border-white/10` line between the three columns at the circle level.
- Consider changing to a light background to reduce the number of dark sections. Use the alt cream background instead.
- Make step numbers prominent: `text-2xl font-bold text-primary` or use large outlined numbers.

---

#### Section 9: Our Story

**Current state:**
- `bg-background`, single paragraph of text at `max-w-[600px]`
- Text size `text-lg` with `leading-[1.8]`

**Design problems:**

1. **Single wall of text.** One long paragraph with no visual breaks, no pull quote, no image. This is the team's story -- the most human section -- but it reads like a legal disclaimer.

2. **No faces.** For a consumer service that asks people to trust strangers with remote access to their systems, showing team photos (or at minimum, avatars) would dramatically increase trust.

3. **Line height is good** (`leading-[1.8]`) but the `max-w-[600px]` creates very short lines for Chinese text, which reads better in wider columns than English.

**Recommendations:**
- Break into 2-3 shorter paragraphs with subheadings or pull quotes.
- Add team member cards (even with placeholder avatars) showing name + years of experience.
- Widen to `max-w-2xl` (672px) which better suits Chinese text line lengths.
- Add a subtle background image or pattern to differentiate from other cream sections.

---

#### Section 10: Final CTA

**Current state:**
- Alt background, trust bar (4 items with emoji), H2, pricing anchor, two CTAs

**Design problems:**

1. **Trust bar is under-designed.** Four emoji + text items in a 2x2 / 4-column grid. No icons, no visual weight. These are actually strong trust signals (data on your machine, HK support, no contract, no hidden fees) but they look like metadata.

2. **The pricing anchor "由 HK$148/月 起" is buried.** This is a strong conversion element (daily cost framing: "每日不到 HK$5") but it is in `text-sm text-muted-foreground` -- the smallest, lightest text in the section.

3. **CTA buttons are identical to the hero CTAs.** This is fine for consistency but the final CTA should feel slightly more urgent -- perhaps with a subtle urgency element like "限時半價安裝" near the button.

**Recommendations:**
- Redesign trust bar as pill badges with icons: `bg-white rounded-full px-4 py-2 shadow-sm border border-border flex items-center gap-2`.
- Move pricing anchor above the CTA and increase size: `text-lg text-foreground font-semibold`.
- Add urgency: include the promo banner text ("首 20 位客戶安裝費半價") as a badge near the CTA.

---

### Pricing Page (Pricing.tsx)

#### Promo Banner

**Current state:**
- `bg-accent/50 border-b border-border`, centered text with fire emoji
- "開業優惠 -- 首 20 位客戶安裝費半價！名額有限，先到先得。"

**Design problems:**

1. **Banner is too subtle.** `bg-accent/50` resolves to approximately `hsl(15 55% 89% / 0.5)` -- a barely-tinted cream. For an urgency banner, this needs to visually scream. Compare with Contabo's cyan banner (`--bg: #00aaeb`).

2. **No countdown or scarcity indicator.** "首 20 位" -- how many are left? Adding "已有 X 位客戶" or a progress bar would increase urgency.

**Recommendations:**
- Change to a bold background: `bg-primary text-white` or `bg-gradient-to-r from-primary to-[#C05030] text-white`.
- Add remaining spots counter: "剩餘 X 個名額" (even if manually updated).
- Make the banner sticky on scroll or at minimum more visually prominent.

---

#### Pricing Cards (3 Tiers)

**Current state:**
- 3-column grid on desktop, with mobile reorder (popular tier first)
- Popular tier (智能管家): `border-primary border-2 bg-card shadow-lg` with "最受歡迎" badge
- Decoy tier (新手上路): `border-border bg-muted shadow-sm`
- Premium tier (全能大師): `border-[#8B7355]/30 bg-card shadow-sm` with "Premium" badge

**Design problems:**

1. **The decoy tier looks too similar to the popular tier.** The decoy effect only works if the decoy is clearly inferior. Currently, the 新手上路 card has nearly the same visual weight as 智能管家 -- just a slightly different border and muted background. The visual hierarchy should make 智能管家 obviously the best choice.

2. **Price typography is too uniform.** All three tiers use `text-3xl font-bold` for the price. The popular tier's price should be larger or bolder. Contabo uses `60px font-weight: 800` for their prices -- massive and impossible to miss.

3. **Feature list typography.** The AI model name is `text-xs` (`<span className="text-xs">{tier.features.aiModel}</span>`) while other features are default `text-sm`. This inconsistency makes the most important differentiator (the AI model) the hardest to read.

4. **Install fee presentation.** The strikethrough + half-price pattern (`<span className="line-through mr-1">HK$400</span> <span className="text-primary font-bold">HK$200</span>`) is standard but cramped. It is all on one line in `text-sm`.

5. **The "X" icons for missing features** (`<X className="h-4 w-4 text-muted-foreground/50">`) in the decoy tier are so faint they are almost invisible. If the goal is to make the decoy look bad, the missing features should be clearly crossed out, not subtly dimmed.

6. **Annual pricing toggle** uses custom buttons instead of shadcn/ui Toggle or Switch component. The pills (`px-4 py-2 rounded-2xl`) are fine but the active state (`bg-primary`) and inactive state (`border border-border`) have very different sizes due to border presence, creating a visual "jump" on toggle.

**How Contabo handles this:**
- 4 pricing tiers in a horizontal grid with massive price numbers (60px)
- Product name above the price ("Cloud VPS 10 / OpenClaw Personal Use")
- Spec list below: "4 vCPU Cores / 8 GB RAM / 75 GB NVMe"
- Single CTA button per card
- No complex feature comparison in the card -- just key specs

**Recommendations:**
- Scale up the popular tier. Add `md:scale-105 md:-my-2` to make it physically larger than siblings.
- Increase price font size for the popular tier: `text-4xl md:text-5xl` vs `text-3xl` for others.
- Fix the AI model font size: all feature items should be consistently `text-sm`.
- Make missing features more visible in the decoy: use `text-muted-foreground line-through` instead of just dimming.
- Add an annual savings badge: "省 15%" next to the annual toggle.
- Standardize toggle sizing: both states should use `border border-transparent` (active) and `border border-border` (inactive) to prevent layout shift.

---

#### ChatGPT Comparison Table

**Current state:**
- Centered H2 + table comparing ChatGPT Plus vs 蟹助手
- 8 rows covering price, memory, privacy, etc.

**Design problems:**

1. **Good concept, weak execution.** The comparison is the strongest selling argument on the page but it is visually indistinguishable from the add-ons table below it. It needs its own visual treatment.

2. **The "差價" row (+HK$92) draws attention to cost.** While the copy below reframes it positively, the raw number in the table makes ClawHK look expensive. Consider removing this row and letting the copy below handle the reframe.

3. **No visual emphasis on the "wins."** The ClawHK column shows checkmarks as plain text characters (✅/❌ emoji), not styled components. These should be proper icon components with color coding.

**Recommendations:**
- Wrap the comparison table in a `rounded-2xl border-2 border-primary/20 bg-card p-8 shadow-md` container.
- Remove the "差價" row -- let the bottom copy handle pricing justification.
- Replace emoji checkmarks with styled Lucide `<Check>` and `<X>` icons matching the pricing cards.
- Add a subtle green background (`bg-emerald-50`) to ClawHK column cells and a subtle red/gray (`bg-muted`) to the ChatGPT column.

---

#### Monthly Fee Explanation Box

**Current state:**
- `rounded-2xl border bg-card p-8 shadow-sm`, centered text explaining what the monthly fee includes

**Design problems:**

1. **Good content, weak visual.** This is actually crucial information (the fee is all-inclusive) but it looks like every other card on the page. It deserves a distinctive treatment.

**Recommendations:**
- Add an icon or illustration at the top (a shield or package icon).
- Change to `bg-primary/5 border-primary/15` to visually distinguish it from other cards.
- Add a bulleted breakdown: VPS, AI computation, VPN, maintenance as individual line items with checkmarks.

---

#### Add-ons Table + Payment Methods

**Current state:**
- Standard table for 5 add-on services
- Payment methods as pill badges in a centered row

**Design problems:**

1. **The add-ons table is functional but visually flat.** No differentiation between high-value add-ons (Pi5 hardware at HK$800+) and low-value ones (HK$50 for extra platform).

2. **Payment method pills** (`bg-secondary text-secondary-foreground px-4 py-2 rounded-2xl`) are appropriately understated for a supporting element.

3. **"信用卡 / Visa / Mastercard 自動扣款即將推出"** -- this "coming soon" text could undermine trust. Either commit to a launch date or remove it.

**Recommendations:**
- Convert add-ons from a table to a card grid (2-3 columns) with price highlighted.
- Remove the credit card "coming soon" text until it is ready.

---

#### Bottom CTA

**Current state:**
- Rounded card with `bg-accent/30 border-border`, heading, description, CTA button

**Design problems:**

1. **Identical to the FAQ and Contact page CTAs.** All three pages end with the same visual block. This creates a sense of copy-paste rather than intentional design.

2. **The CTA text "立即 WhatsApp 查詢" appears at least 4 times on this page.** Button fatigue -- the user may become blind to it.

**Recommendations:**
- Differentiate the pricing page CTA by adding the promo urgency: "安裝費半價優惠即將結束" above the button.
- Use a more distinctive visual treatment: full-width band with `bg-primary text-white py-16` instead of a contained card.

---

### FAQ Page (FAQ.tsx)

**Current state:**
- Clean accordion layout with 4 categories, 3-4 questions each
- Uses shadcn/ui Accordion component
- Category headings as H2 with accordion items below

**Design problems:**

1. **Category headings are weak.** `text-xl mb-4` with no visual differentiator. They look like regular text, not section dividers.

2. **All accordion items look identical regardless of category.** `rounded-2xl border bg-card px-6 shadow-sm` -- fine for a homogeneous list, but with 4 categories each containing 3-4 items, some visual distinction would help scanning.

3. **No search or filter.** With 14 FAQ items, this is borderline for needing search. Not critical now but should be planned.

4. **Answer text length varies wildly.** Some answers are one sentence, others are multi-sentence. Longer answers should be broken into shorter paragraphs.

**How Contabo handles this:**
- Contabo uses a dedicated help center (help.contabo.com) rather than an on-page FAQ. Their product pages include inline explanations rather than Q&A format.

**Recommendations:**
- Add category icons or colored left borders. E.g., "基本問題" gets a blue left border, "收費與付款" gets green, etc.
- Increase category heading weight: `text-xl font-bold flex items-center gap-2` with a small icon.
- Add an anchor link to each category so the "WhatsApp 問我們" link at the top can deep-link.
- Consider expanding the most-asked question by default (`defaultValue` prop on Accordion).

---

### Contact Page (Contact.tsx)

**Current state:**
- H1 + subtitle, 3 contact cards (WhatsApp, Telegram, Instagram), quick note, bottom CTA
- Cards show emoji, platform name, description, response time

**Design problems:**

1. **This is the thinnest page on the site.** Three cards and two text blocks -- it feels underdeveloped. For a service where the entire conversion funnel goes through WhatsApp/Telegram, this page should be much more substantial.

2. **No business hours.** "通常 2 小時內" is the only response time indicator. Users need to know: are you available at 2 AM? Weekends?

3. **No physical location or legal identity.** Hong Kong consumers may want to know: is this a registered business? Where are you based? For a HK$388/month subscription, some legal presence is reassuring.

4. **The Instagram card** uses a camera emoji instead of the Instagram logo. For platform-specific links, actual logos (or at minimum, Lucide's `Instagram` icon) would be more recognizable.

5. **Contact cards use emoji headers** (📱, ✈️, 📷) which are visually inconsistent with the Lucide-icon-based design system used everywhere else.

6. **The "quick contact note"** ("直接用 WhatsApp 或 Telegram 聯絡我們最快！") adds no information -- it repeats what the cards already show. It is a wasted element.

**Recommendations:**
- Add business hours: "服務時間: 週一至週五 10:00-22:00 / 週末 12:00-20:00" (or whatever is accurate).
- Add a brief legal/business identity: "ClawHK / 蟹助手 | 香港註冊 | 服務條款" (even placeholder links).
- Replace emoji with Lucide icons (`<MessageCircle>`, `<Send>`, `<Camera>`) or better yet, actual platform SVG icons.
- Remove the "quick contact note" -- it adds no value.
- Add a simple FAQ teaser: "常見問題：查看 FAQ 頁面了解更多" with a link.
- Consider adding a simple form for non-urgent inquiries (email collection for follow-up).

---

### Navigation (Navbar.tsx)

**Current state:**
- Sticky header with scroll-aware styling (transparent on hero, solid on scroll)
- Logo: crab emoji + "蟹助手"
- Desktop: 5 nav links + WhatsApp/Telegram icon pill
- Mobile: hamburger menu with Sheet component

**Design problems:**

1. **The scroll transition is well-implemented.** The `overHero` state handling is clean. No issues.

2. **The icon pill CTA** (WhatsApp + Telegram combined) is clever but unusual. Users may not immediately understand what the two icons represent without labels. The divider `w-px h-5` between them is extremely thin.

3. **Nav link active state** uses `font-bold` which causes a layout shift on hover/click because bold text is wider than normal text. This is a common issue.

4. **Missing page: `/technology`** is in the nav links but was not in the original 4-page spec. It exists as a page though, which is good.

5. **Logo has no hover state.** The brand link should have a subtle hover effect.

**Recommendations:**
- Fix layout shift: use `font-semibold` for both active and inactive states, differentiate with color only.
- Add `aria-current="page"` to the active link for accessibility.
- Consider adding a "立即開始" primary CTA button on desktop alongside the icon pill, visible after scrolling past the hero.
- Add a subtle hover scale to the logo: `hover:scale-[1.02] transition-transform`.

---

### Footer (Footer.tsx)

**Current state:**
- Dark background `bg-[#2A1A1D]` with `text-[#FFFAF5]`
- 3-column grid: brand info, navigation links, payment methods + email
- Copyright line

**Design problems:**

1. **The footer is functional but bare.** For a consumer-facing service, the footer should include: business registration, terms of service, privacy policy, and social media links.

2. **Payment methods are only showing FPS and PayMe** -- the pricing page lists 4 methods. These should match.

3. **Color `#2A1A1D`** is a warm dark brown/plum. It works well with the brand but the text color `#FFFAF5` at 70% opacity (`#FFFAF5]/70`) may be below WCAG contrast requirements against this background.

4. **No social links.** The contact page shows Instagram exists, but the footer has no social media icons.

**Recommendations:**
- Add social media icons (WhatsApp, Telegram, Instagram) in the footer.
- Add placeholder links for: 服務條款 | 私隱政策 | 退款政策.
- Verify contrast ratio: `#FFFAF5` at 70% opacity on `#2A1A1D` -- ensure it meets 4.5:1.
- Match payment methods with the pricing page: add PayPal and bank transfer.
- Consider making the footer 4-column on desktop: Brand | Nav | Services | Legal.

---

## Cross-Cutting Issues

### Color System Analysis

The current color system is built around HSL variables with a warm coral primary:

| Token | HSL Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--primary` | `14 55% 50%` | `#C05535` | CTAs, highlights, links |
| `--background` | `28 100% 98%` | `#FFFCF5` | Page background |
| `--card` | `25 100% 97%` | `#FFF8F0` | Card surfaces |
| `--muted` | `25 15% 91%` | `#E9E6E2` | Disabled/secondary surfaces |
| `--foreground` | `350 22% 14%` | `#2B1F22` | Primary text |
| `--section-alt` | `25 30% 93%` | `#F0E8DF` | Alternating section bg |

**Problems:**

1. **Insufficient contrast between `--background`, `--card`, and `--section-alt`.** The difference between `#FFFCF5`, `#FFF8F0`, and `#F0E8DF` is barely perceptible on most monitors. Cards on `bg-background` look like they are floating on the same surface.

2. **Primary color `#C05535` has limited utility.** It works for buttons and links but fails as a background (too dark) or as a text accent (not enough contrast on dark sections). The system needs a `--primary-light` token for backgrounds (e.g., `hsl(14 55% 92%)` = `#F5E0D8`).

3. **Dark section colors are hardcoded.** `#1A1215` (FOMO + How It Works) and `#2A1A1D` (footer) are inline/component-level, not design tokens. They should be formalized in the CSS variables.

4. **No success/warning/info colors defined.** The system only has `--destructive`. For feature lists (check/x), comparison tables, and status indicators, the site uses arbitrary colors (`text-[#5A8A5A]`, `text-purple-400`, `text-blue-400`, etc.).

**Recommendations:**
- Increase contrast between surface levels. Set `--card` to `25 60% 96%` and `--section-alt` to `25 30% 90%`.
- Add tokens: `--primary-light: 14 55% 93%`, `--success: 142 60% 40%`, `--dark-surface: 350 20% 10%`, `--dark-surface-elevated: 350 18% 14%`.
- Migrate all hardcoded colors to CSS variables.

### Typography Scale Analysis

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| H1 | Noto Sans TC | `text-3xl` / `text-4xl` / `text-5xl` / `text-6xl` (varies) | `font-extrabold` | `1.3` |
| H2 | Noto Sans TC | `text-2xl` / `text-3xl` / `text-4xl` (varies) | `font-bold` | `1.3` |
| H3 | Noto Sans TC | `text-xl` / `text-2xl` (varies) | `font-semibold` | default |
| Body | Inter / Noto Sans TC | `text-sm` / `text-base` / `text-lg` (varies) | normal | varies |
| Small | Inter | `text-xs` / `text-[10px]` | varies | varies |

**Problems:**

1. **No consistent type scale.** H1 ranges from `text-3xl` to `text-6xl` across pages. H2 ranges from `text-xl` to `text-4xl`. This inconsistency means the visual hierarchy changes from page to page.

2. **Body text size varies without clear logic.** Some sections use `text-sm`, others `text-base`, others `text-lg`. There is no rule for when each is appropriate.

3. **Chinese text at `text-sm` (14px) can be hard to read** for the target demographic (30-50 age range). The minimum comfortable reading size for Chinese on screens is 16px (`text-base`).

4. **`font-extrabold` (800) for Chinese headings** is very heavy with Noto Sans TC and can affect legibility at large sizes.

**Recommendations:**
- Standardize: H1 = `text-4xl md:text-5xl`, H2 = `text-2xl md:text-3xl`, H3 = `text-xl md:text-2xl`.
- Set minimum body text to `text-base` (16px) for all Chinese content. Use `text-sm` only for English labels, metadata, and captions.
- Change H1 weight to `font-bold` (700) instead of `font-extrabold` (800) for better Chinese legibility.
- Create explicit text style classes: `.text-body`, `.text-body-sm`, `.text-caption`, `.text-label`.

### Spacing/Rhythm Analysis

| Pattern | Value | Notes |
|---------|-------|-------|
| Section padding | `py-20` (80px) | Consistent, good |
| Container max-width | `1200px` | Set in Tailwind config, appropriate |
| Container padding | `1.5rem` (24px) | Adequate for mobile |
| Card padding | `p-6` to `p-10` | Varies without clear reason |
| Card border radius | `rounded-2xl` (16px) | Consistent, brand-appropriate |
| Section gap between items | `space-y-4` to `space-y-16` | Highly variable |
| Grid gap | `gap-4` to `gap-8` | Variable |

**Problems:**

1. **Card padding varies from `p-5` to `p-10`.** Plugin cards use `p-5`, tech stack cards use `p-6`, qualifier card uses `p-10`, monthly fee box uses `p-8`. This creates inconsistent visual density.

2. **`space-y` values have no system.** Section content gaps range from `space-y-2` to `space-y-16` without a discernible rhythm.

3. **Max-width varies per section.** Content widths include `max-w-3xl`, `max-w-4xl`, `max-w-5xl`, `max-w-xl`, `max-w-2xl`, and `max-w-[600px]`. This creates a subtle "wiggling" effect as the user scrolls -- content blocks are different widths on each screen.

**Recommendations:**
- Standardize card padding: `p-6` for compact cards, `p-8` for feature cards. Remove `p-5` and `p-10`.
- Adopt a spacing scale: section heading to content = `space-y-8`, content items = `space-y-4` or `space-y-6`, sections = `py-20`.
- Standardize content max-width: `max-w-4xl` for all standard content sections, `max-w-5xl` for grids, `max-w-3xl` for focused text blocks.

### Mobile Responsiveness Concerns

1. **Hero mockup is invisible on mobile.** `hidden lg:block` means ~60% of visitors see no product demonstration.
2. **Pricing cards reorder on mobile** (popular first) which is good.
3. **Tables require horizontal scroll on mobile** (before/after, ChatGPT comparison, add-ons).
4. **Container padding `1.5rem`** is adequate but tight on very small screens (320px).
5. **WhatsApp float button** at `bottom-6 right-6` with `h-14 w-14` is well-sized for mobile but may overlap with page content on short screens.

### Accessibility Issues

1. **Color contrast failures:** white text on mid-tone hero gradient, `text-muted-foreground/50` for disabled features, `text-white/40` for step numbers.
2. **No skip-to-content link.** The layout (`Layout.tsx`) goes directly from Navbar to `<main>` with no skip link.
3. **Emoji as semantic content.** Tier names use emoji (🌱, ⭐, 🚀) as visual indicators without text alternatives. Screen readers will read these as "seedling," "star," "rocket" which does not convey the tier intent.
4. **No focus-visible styles defined.** The default browser focus ring is likely suppressed by Tailwind's reset but no custom focus styles are visible.
5. **Sheet mobile menu** has a `sr-only` title, which is good.
6. **No `lang` attribute changes** for English terms in Chinese content. Mixed-language content should ideally use `<span lang="en">` for English terms.

### Animation/Interaction Quality

1. **Framer Motion is used consistently** with `fadeUp` and `stagger` variants. The easing `[0.16, 1, 0.3, 1]` is a good spring-like cubic bezier.
2. **`whileInView` is used for Section 4** but not for Sections 5, 6, 7, 9, 10. This creates an inconsistency where some sections animate on scroll and others are static.
3. **The Telegram mockup auto-rotation** (6-second interval) has no pause on hover or focus. This is an accessibility concern -- auto-playing content should be pausable.
4. **No micro-interactions** on cards. Hover states use `hover:border-primary/30 hover:shadow-md transition-all` which is appropriate but vanilla. No lift, no subtle color change, no icon animation.
5. **Page transitions are absent.** Navigating between pages causes a hard cut. Consider adding `AnimatePresence` around the `<Outlet>` in Layout.

---

## Contabo Design Patterns Worth Adopting

### 1. Structured Product Cards with Dominant Price

Contabo's pricing cards use a 60px bold price as the visual anchor, with the product tier name above and specs below. ClawHK should similarly make the price the most prominent element in each tier card, rather than equally weighting it with feature lists.

### 2. Image + Text Section Pairs

Contabo alternates between `imageLeft` and `imageRight` layouts for explanatory sections ("What is OpenClaw?", "Get Started in Minutes"). This creates visual rhythm and prevents the "wall of text" problem. ClawHK should adopt this for the "Our Story" section and potentially for the tech stack explanations.

### 3. Section-Level Visual Separation

Contabo uses clear section IDs, distinct background treatments, and consistent header patterns (`<h2>` + subtitle). Each section is self-contained. ClawHK's sections often bleed into each other due to similar backgrounds and inconsistent heading hierarchy.

### 4. Integration Showcase with Tabs

Contabo's tabbed integration section (Messaging / AI Providers / Productivity / etc.) is an efficient way to show breadth without overwhelming. ClawHK could adapt this for use cases -- tab by category instead of showing all 6 cards at once.

### 5. Trust Signals at the Top

Contabo places Trustpilot social proof immediately after the hero. ClawHK should similarly place its strongest trust signals (data privacy, HK-based support, no contract) in a prominent position near the top, not buried in the final CTA section.

### 6. Clean Dark Hero

Contabo's `#0a0a0b` hero with white text and a large illustration is visually striking and legible. While ClawHK's warm gradient is a strong brand differentiator, the execution needs to ensure comparable legibility.

---

## Detailed Recommendations -- Lovable Prompt Ready

### P0: Critical (Must fix before launch)

**P0-1: Hero text contrast**
```
On the Index page hero section, darken the background gradient for better text legibility.
Change the inline style from:
  background: linear-gradient(135deg, #E8D5C4 0%, #F5C6AA 30%, #E6A889 60%, #D4826A 100%)
To:
  background: linear-gradient(135deg, #C49A7E 0%, #B87A5E 40%, #A35D40 70%, #8B3D28 100%)

Also change the primary CTA button on the hero from coral to white:
  className="bg-white text-[#A35D40] hover:bg-white/90 rounded-2xl text-base px-7 py-3.5 shadow-lg font-semibold"
```

**P0-2: Mobile hero -- show product mockup**
```
On the Index page, the Telegram chat mockup is hidden on mobile (hidden lg:block).
Remove 'hidden lg:block' and replace with responsive sizing.
On mobile, show a smaller version of the mockup below the hero text:
  className="block lg:block mt-8 lg:mt-0 max-w-xs mx-auto lg:max-w-sm lg:mx-0"
Scale down the mockup container on mobile with 'scale-90 lg:scale-100'.
```

**P0-3: Pricing card visual hierarchy**
```
On the Pricing page, make the popular tier (智能管家) visually dominant:
1. Add md:scale-105 md:-my-4 to the popular tier's outer div
2. Increase the popular tier's price size from text-3xl to text-4xl md:text-5xl
3. Change the decoy tier (新手上路) background from bg-muted to bg-muted/70
4. For X icons on missing features, change text-muted-foreground/50 to text-muted-foreground and add line-through to the label text
```

**P0-4: Body text minimum size**
```
Across all pages, ensure no Chinese body text is smaller than text-base (16px).
Current violations:
- Pricing.tsx feature list items at text-sm and text-xs
- Index.tsx use case card prompts at text-sm
- FAQ answer text at text-muted-foreground (inherits text-sm from parent)
- Contact.tsx description text at text-sm

Change all Chinese body copy from text-sm to text-base.
Keep text-sm only for English labels, metadata tags, and technical specifications.
```

**P0-5: Promo banner visibility**
```
On the Pricing page, change the promo banner from subtle to bold:
  Old: className="bg-accent/50 border-b border-border"
  New: className="bg-primary text-white border-b border-primary/80"

Change the text styling:
  Old: className="text-sm font-bold text-primary"
  New: className="text-sm font-bold text-white"
```

### P1: Important (Fix before marketing push)

**P1-1: Consolidate landing page sections**
```
On Index page:
1. Delete Section 3 (Repositioning Bridge) entirely -- it's redundant with the hero.
2. Move the trust bar (Section 10's trust items) to directly below the hero plugin cards as a horizontal strip.
3. Merge Section 2 (FOMO) and Section 4 (Credibility) into a single section with a stat bar format.
```

**P1-2: Standardize surface contrast**
```
In index.css, update the CSS variables:
  --card: 25 60% 96%;        /* was: 25 100% 97% -- more visible against background */
  --section-alt: 25 30% 90%; /* was: 25 30% 93% -- stronger alternating contrast */

Add new tokens:
  --dark-surface: 350 20% 8%;
  --dark-surface-elevated: 350 18% 12%;
  --success: 142 60% 40%;
  --primary-light: 14 55% 93%;
```

**P1-3: Fix typography scale consistency**
```
Standardize heading sizes across all pages:
  H1: text-3xl md:text-5xl (page titles)
  H2: text-2xl md:text-3xl (section headings)
  H3: text-xl (sub-sections, card titles)

Currently inconsistent:
  Index H1: text-4xl md:text-6xl  ->  change to text-3xl md:text-5xl
  Index H2: varies between text-2xl and text-3xl md:text-4xl  ->  standardize to text-2xl md:text-3xl
  Pricing H1: text-3xl md:text-5xl  ->  keep as is
  FAQ H1: text-3xl md:text-5xl  ->  keep as is
  Contact H1: text-3xl md:text-5xl  ->  keep as is
```

**P1-4: How It Works section redesign**
```
On Index page Section 8 (How It Works):
1. Replace emoji (💬, 🔧, 🚀) with numbered circles:
   <div className="h-12 w-12 rounded-full bg-primary text-white text-lg font-bold flex items-center justify-center mx-auto">1</div>
2. Add connecting line on desktop:
   Between the 3 columns, add a horizontal dashed line using a pseudo-element or a decorative div with border-t-2 border-dashed border-white/20
3. Change background from bg-[#1A1215] to the section-alt cream color to reduce the number of dark sections. Use dark text instead.
```

**P1-5: Contact page substance**
```
On the Contact page:
1. Add business hours below the contact cards:
   <p className="text-center text-muted-foreground">服務時間: 每日 10:00-22:00 (包括週末及公眾假期)</p>
2. Replace emoji icons with Lucide components:
   WhatsApp: <MessageCircle className="h-8 w-8 text-[#25D366]" />
   Telegram: <Send className="h-8 w-8 text-[#26A5E4]" />
   Instagram: <Camera className="h-8 w-8 text-[#E4405F]" />
3. Remove the redundant "直接用 WhatsApp 或 Telegram 聯絡我們最快！" paragraph.
4. Add footer-style legal links: 服務條款 | 私隱政策
```

**P1-6: Footer enhancements**
```
On Footer.tsx:
1. Add social media icons row (WhatsApp, Telegram, Instagram) below the brand description
2. Add placeholder legal links: 服務條款 | 私隱政策 | 退款政策
3. Match payment methods with Pricing page: add "銀行轉帳" and "PayPal" to the pills
4. Check text contrast: #FFFAF5 at 70% on #2A1A1D -- if below 4.5:1, increase to 80%
```

### P2: Nice to Have (Post-launch polish)

**P2-1: Scroll-triggered animations**
```
Add whileInView animations to all Index page sections (currently only Section 4 has it).
Use the existing fadeUp variant with viewport={{ once: true, margin: "-80px" }}.
Apply to: Section 5 (Use Cases), Section 6 (Qualifier), Section 7 (Before/After),
Section 9 (Our Story), Section 10 (Final CTA).
```

**P2-2: Pricing comparison table styling**
```
On the Pricing page ChatGPT comparison table:
1. Wrap in: className="rounded-2xl border-2 border-primary/20 overflow-hidden"
2. Add bg-primary/5 to the ClawHK column cells
3. Add bg-muted/50 to the ChatGPT column cells
4. Remove the "差價" row
5. Replace emoji ✅/❌ with Lucide Check/X components with color coding
```

**P2-3: Telegram mockup accessibility**
```
On the Index page Telegram mockup:
1. Add a pause button to the auto-rotation: onClick={() => clearInterval(timer)}
2. Add aria-live="polite" to the mockup container so screen readers announce changes
3. Add tabIndex={0} and keyboard navigation for the dot indicators
```

**P2-4: Card micro-interactions**
```
Add subtle hover lift to all interactive cards across the site:
  hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200
Currently only border and shadow change on hover. Adding Y-translation creates a more tactile feel.
```

**P2-5: Add skip-to-content link**
```
In Layout.tsx, add before the Navbar:
  <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
    跳到主要內容
  </a>
And add id="main-content" to the <main> element.
```

---

## Design Direction Suggestions

### Direction A: "Warm Professional" (Recommended)

Keep the warm coral brand identity but push it toward the mature, premium end. Think Apple HK meets a boutique concierge service.

- **Hero:** Deeper gradient (terracotta-to-chocolate range), large product screenshot, minimal text
- **Cards:** White with subtle shadow depth, generous padding, no borders (shadow-only containment)
- **Typography:** Thinner heading weights (font-semibold instead of extrabold), more whitespace
- **Color palette expansion:** Add a deep navy (`#1A2332`) for dark sections instead of the current warm plum, creating temperature contrast
- **Photography:** Real device photos (Pi5, phone with Telegram open) rather than code-constructed mockups
- **Target feel:** "This costs money, and it's worth every dollar"

This direction suits the 30-50 age range non-technical audience because it communicates quality without trying to look "techy." It says: "we handle the complexity, you enjoy the result."

### Direction B: "Friendly Local"

Lean harder into the Hong Kong identity. Make the brand feel like a trusted neighborhood shop that happens to sell cutting-edge technology.

- **Hero:** Photograph of Hong Kong skyline or MTR scene (blurred) as background, warm overlay
- **Cards:** Rounded, colorful, with category-specific accent colors (each use case gets its own color)
- **Typography:** Rounder typeface consideration (Noto Sans TC works but a rounded variant or SF Pro Rounded equivalent would soften the feel)
- **Color palette:** Warmer, with more variety -- add a teal accent for technology sections, keep coral for CTAs
- **Illustrations:** Hand-drawn or line-art style showing daily scenarios (ordering food, booking tickets, studying)
- **Language tone:** Slightly more casual in microcopy (while maintaining formal written Chinese standards)
- **Target feel:** "Your friendly AI helper, made in Hong Kong"

This direction maximizes approachability but risks looking less professional. Best for LIHKG/Instagram marketing channels where the audience expects personality.

### Direction C: "Tech-Forward Clean"

Move closer to Contabo's clean enterprise aesthetic but maintain the warm brand colors. This would position ClawHK as a serious technology company rather than a local service shop.

- **Hero:** Dark background (`#0F0A08` -- warm black), large type, animated terminal or chat interface
- **Cards:** Dark mode default, with borders instead of shadows, monospace tech labels
- **Typography:** More systematic -- strict type scale, consistent weights, tighter line heights
- **Color palette:** Coral as accent only (buttons, links), neutral gray system for surfaces
- **Layout:** More structured grid with consistent column widths, less organic spacing variation
- **Content:** More technical detail, architecture diagrams, spec sheets
- **Target feel:** "Enterprise-grade technology, personally yours"

This direction would appeal to the subset of users who want to understand what they are buying, but may alienate the truly non-technical audience. Best if the business strategy shifts toward prosumers and small businesses.

---

## Summary of Priority Actions

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | Hero text contrast fix | 10 min | High -- legibility |
| P0 | Mobile product mockup | 30 min | High -- conversion |
| P0 | Pricing card hierarchy | 30 min | High -- revenue |
| P0 | Body text size minimum | 20 min | High -- readability |
| P0 | Promo banner bold treatment | 5 min | Medium -- urgency |
| P1 | Consolidate landing sections | 1 hr | High -- flow |
| P1 | Surface contrast tokens | 20 min | Medium -- polish |
| P1 | Typography standardization | 30 min | Medium -- consistency |
| P1 | How It Works redesign | 45 min | Medium -- clarity |
| P1 | Contact page substance | 30 min | Medium -- trust |
| P1 | Footer enhancements | 20 min | Low -- trust |
| P2 | Scroll animations | 20 min | Low -- polish |
| P2 | Comparison table styling | 30 min | Low -- conversion |
| P2 | Accessibility fixes | 45 min | Medium -- compliance |
| P2 | Card micro-interactions | 15 min | Low -- delight |

Total estimated effort for P0 items: ~1.5 hours
Total estimated effort for all items: ~6-7 hours

---

*This review was conducted through source code analysis and structural comparison with the Contabo reference site. A live browser session would enable additional findings around performance, animation smoothness, and responsive edge cases. Recommend scheduling a follow-up review after P0 items are implemented.*
