# Contabo Website Design Research — Actionable References for ClawHK

> Comprehensive analysis of contabo.com design patterns, copywriting, visual hierarchy, and UX.
> Use this as a reference when building/refining the ClawHK (蟹助手) website.

---

## Pages Explored

| Page | URL | Key Takeaways |
|------|-----|---------------|
| Homepage | contabo.com/en/ | Hero messaging, section rhythm, trust signals, footer |
| OpenClaw Hosting | contabo.com/en/openclaw-hosting/ | Product page template, feature cards, FAQ, 3-step setup |
| Cloud VPS Listing | contabo.com/en/vps/ | Pricing card design, tier comparison, social proof |
| VPS Checkout | contabo.com/en/vps/cloud-vps-10/ | Configuration flow, order summary, trust badges |
| Pricing Overview | contabo.com/en/pricing/ | Tabbed pricing, comparison tables |
| About Us | contabo.com/en/about-us/ | Brand story, "4 Reasons" value framework, awards |
| Support Experience | contabo.com/en/support-experience/ | Trust-building through specificity |
| n8n Hosting | contabo.com/en/n8n-hosting/ | Reusable app-hosting page template |

---

## 1. Hero Section Patterns

### What Contabo Does Well
- **Single clear value proposition in H1**: "Best-priced VPS and Bare Metal Hosting" — one sentence, no ambiguity
- **3 trust checkmarks below H1**: `✔️ Free Pre-Installed OpenClaw ✔️ Always-On Automation ✔️ Full Data Control` — compact, scannable
- **Sub-headline adds context without repeating H1**: "High-Performance Cloud & Dedicated Hosting with Round-the-Clock Human Support"
- **No gradient hero — clean solid color or subtle pattern**: Homepage uses white/light bg with product cards immediately visible. OpenClaw page uses a subtle blue-tinted dark section.
- **Immediate product visibility**: Pricing cards are visible without scrolling on both homepage and product pages

### ClawHK Reference (字眼 & Structure)
- **Current ClawHK hero is too wordy**. Contabo proves you can say everything in one H1 + 3 checkmarks.
- Adapt pattern for ClawHK:
  - H1: `你的 24 小時 AI 私人助手` (one line, clear)
  - Checkmarks: `✔️ 無需技術知識 ✔️ WhatsApp / Telegram 直接使用 ✔️ 記得你的所有對話`
  - Sub-headline: `由專業團隊為你安裝、設定、維護 — 你只需要講嘢`
- **Show product demo immediately** — Contabo shows pricing cards in hero; ClawHK should show Telegram mockup in hero (already in Prompt C)

---

## 2. Copywriting Patterns — 字眼 (Wording)

### Contabo's Copywriting Formula
Contabo uses a consistent **[Action Verb] + [Benefit] + [Differentiator]** pattern:

| Contabo Copy | Pattern | ClawHK Equivalent |
|---|---|---|
| "AI Assistant that Actually Does Stuff" | Bold claim + colloquial | `真正幫你做嘢嘅 AI 助手` (too Cantonese — use: `真正幫你處理事務的 AI 助手`) |
| "Host Your Own AI Agent" | Ownership emphasis | `擁有你自己的 AI 助手` |
| "Automate everything. Host it yourself." | Two short imperatives | `自動化一切。由你掌控。` |
| "Privacy first. Speed included." | Two-word phrases with period | `私隱至上。速度內含。` |
| "Real people. Real answers." | Repetition for emphasis | `真人支援。真正解決。` |
| "Your data stays yours" | Simple possessive | `你的數據，始終屬於你` |
| "Get Started in Minutes" | Speed promise | `幾分鐘即可開始使用` |
| "Pay one flat monthly fee" | Simplicity | `一個月費，全部包含` |

### Key Copywriting Observations
1. **Short sentences dominate** — Contabo rarely uses sentences over 15 words in headlines/CTAs
2. **"You" language everywhere** — "Your server", "Your data", "Your way" — direct address builds ownership
3. **No jargon in headlines** — Technical terms (VPS, NVMe, vCPU) appear in spec boxes, NOT in emotional copy
4. **Benefit-first, tech-second** — "Save Hours of Work" (benefit) → "with AI & Automated Workflows" (tech)
5. **Period-separated two-word phrases** — A signature pattern: `"Collaboration. Storage. Freedom."` — very punchy

### ClawHK Adaptation Ideas
- Section headings should follow benefit-first pattern:
  - Instead of: `AI 驅動的智能記憶系統` (tech-first)
  - Use: `記得你說過的每一句話` (benefit-first)
- Use the two-word period pattern for taglines:
  - `安裝。使用。忘記技術。`
  - `對話。記憶。行動。`
- Replace generic "了解更多" CTAs with specific action CTAs:
  - `立即開始` / `查看方案` / `免費諮詢`

---

## 3. Section Flow & Visual Rhythm

### Contabo Homepage Section Order (10 sections)
1. **Hero** — H1 + sub-headline + trust checkmarks
2. **Product Cards** — 3 product lines (VPS, VDS, Dedicated) with "from $X/mo" pricing visible
3. **OpenClaw Banner** — Full-width promotional card for new product
4. **Global Map** — "9 Regions, 11 Locations" with interactive map
5. **Awards Strip** — Logo badges row (VPSBenchmarks, HOSTtest)
6. **DevOps Features** — 3 feature cards with icons (Custom Images, API, CLI)
7. **Four Reasons** — "Why We're Cheap" in 4 cards with icons + paragraphs
8. **Support Section** — Awards + "24/7 phone support" with specific claims
9. **Testimonials** — Customer review cards with ratings
10. **FAQ** — Accordion-style expandable

### Visual Rhythm Pattern
- **White → White → Accent Banner → White → Grey → White → Grey → White → White → White**
- Key insight: Contabo does NOT use dark sections on the homepage. Their dark elements are limited to:
  - Navigation bar (dark navy/charcoal)
  - Footer (dark)
  - Occasional accent banners
- **Section separation uses generous whitespace** (`py-20` equivalent) rather than background color changes
- **Alternating grid layouts**: Left text + right image → Right text + left image → Centered cards

### ClawHK Reference
- Our current page has too many dark sections (FOMO + How It Works both dark) — Prompt C already fixes this
- Adopt the "mostly light with strategic accent" approach
- The OpenClaw banner pattern (full-width accent card mid-page) could work for our promo banner
- Consider moving awards/trust signals higher — Contabo puts them at position 5 (above the fold on many screens)

---

## 4. Pricing Page Patterns

### Contabo VPS Pricing Cards
- **6 tiers side-by-side** in a horizontal scroll/grid
- Each card shows: Tier name (Cloud VPS 10/20/30...) → Specs grid → Price → CTA
- **Specs grid format**: CPU | RAM | Storage | Snapshot | Port — in a clean table-like layout within each card
- **"SAVE X%" badges** on longer term options (green pill badges)
- **No "popular" or "recommended" badge on homepage** — but the checkout page uses "Our Recommendation" for upsells
- **Price display**: Large `$3.96` with small `/month` — monthly rate prominent

### Checkout Page Design
- **Step indicator at top**: Configuration → Personal info → Payment → Confirmation (4-step breadcrumb)
- **Sticky order summary sidebar** on the right — always visible while configuring
- **Card-based option groups**: Term length, Region, Storage Type, Image — each in its own white card
- **Visual selection states**: Selected option gets a blue border + checkmark
- **"SAVE 10%/20%" green pills** on discounted options — draws eye to commitment plans
- **"No Setup Fee" green banner** on 6+ month terms — removes objection
- **Latency display by region**: "Asia (Singapore) — 59 ms latency" — specific, technical, trust-building
- **Trust badges at bottom**: "Privacy Protected" + "Secure Checkout" with lock icons

### ClawHK Reference
- Our pricing page should adopt:
  - **Spec grid inside each tier card** — vCPU, RAM, storage clearly laid out (not just bullet lists)
  - **"SAVE" badges** — if we offer multi-month discounts, make savings visually prominent
  - **Sticky order summary** concept — maybe a floating "compare" bar
  - **Trust badges** at the bottom of pricing section
  - **Step-by-step selection** concept for our tier → payment flow (even if simple)

---

## 5. Product Page Template (OpenClaw / n8n pattern)

### Consistent Section Template
Both OpenClaw and n8n pages follow the SAME template:

1. **Hero**: H1 (benefit headline) + 3 checkmarks + pricing tier cards
2. **"What is [Product]?"**: Explanation paragraph
3. **"What Can You Do?"**: 4 feature cards in 2x2 grid with icons
4. **"Get Started in Minutes"**: 3-step numbered process
5. **"Why Self-Host on Contabo?"**: 6 benefit items in grid (icon + short text)
6. **"What Can You Integrate?"**: Logo/icon grid of integrations
7. **Global Map**: Locations section
8. **Social Proof**: "Trusted by Thousands" + testimonials
9. **FAQ**: Accordion
10. **Guides**: Link to blog tutorial
11. **Newsletter + Footer**

### Key Design Elements
- **Feature cards use icon + H3 + paragraph** — consistent card format
- **3-step "Get Started"** always uses: Step 1: Choose → Step 2: Setup → Step 3: Use
- **Integration logos** displayed in a grid — shows ecosystem breadth
- **FAQ on every page** — not just a dedicated FAQ page

### ClawHK Reference
- Our landing page roughly follows this but is less disciplined. Key differences:
  - We should add a dedicated **"What Can You Do?"** section with 4-6 concrete use cases (partially done with use case cards)
  - The **3-step "Get Started"** pattern is EXACTLY what our "How It Works" section should be — simple, numbered, no emoji
  - Add **integration logos** section — WhatsApp, Telegram, OpenClaw, DeepSeek, SearXNG logos in a row
  - Add **FAQ on landing page** (not just /faq route) — at least 3-4 top questions

---

## 6. Trust-Building Patterns

### What Contabo Does
1. **Awards badges**: Multiple third-party award logos (VPSBenchmarks, HOSTtest) prominently displayed
2. **Specific numbers**: "99.996% uptime", "9 Regions, 11 Locations", "24/7" — never vague
3. **"Trusted by Thousands"**: Social proof section with real customer testimonials + star ratings
4. **Support Experience page**: Entire dedicated page for support quality — "Professionals Only", "Rigorous Quality Standards", "Only Real People", "We Focus on Real Answers"
5. **"Real people. Real answers."** repeated as a mantra across multiple pages
6. **Security section**: "Security Is Our Priority" with specific claims about DDoS protection, physical security
7. **Company transparency**: Leadership photos, office locations, company details, history timeline

### ClawHK Reference — Trust Gap
Our website currently lacks most trust signals. Priority additions:
- **Specific numbers**: `"平均回覆時間 < 5 分鐘"`, `"已服務 XX 位客戶"`, `"99.9% 正常運行時間"`
- **"真人支援"** messaging — adapted from "Real people. Real answers." → `真人團隊。真正解答。`
- **Service guarantee**: `"7 日免費試用"` or `"不滿意全額退款"` — Contabo has "No Setup Fee" as objection-removal
- **OpenClaw community proof**: Link to GitHub stars count, active community
- **Founder story**: Even a brief "Why I built this" section (Contabo has full history timeline)
- **Security claims**: `"你的數據存放在你自己的伺服器"`, `"端對端加密"`, `"不經第三方"`

---

## 7. Footer Patterns

### Contabo Footer Structure
- **4 column layout**: Products | Solutions | Locations | Company | Contact & Help
- **Social media icons**: Facebook, LinkedIn, X, YouTube — with hover effects
- **Newsletter signup**: Email input + "Keep in touch" heading
- **Trust badges**: "Privacy Protected" + "Secure Checkout" at very bottom
- **Legal links**: Terms & Conditions, Privacy, Legal Notice, Affiliate Program
- **No "coming soon" text** — everything listed is live

### ClawHK Reference
- Our footer should have:
  - Column 1: 服務方案 (links to pricing tiers)
  - Column 2: 支援 (FAQ, 聯絡我們, 服務時間)
  - Column 3: 關於 (我們的故事, 私隱政策, 服務條款)
  - Social icons: WhatsApp, Telegram, Instagram
  - Trust badge: `安全付款` with payment method icons
  - Remove any "coming soon" text (already in Prompt C)

---

## 8. Navigation Patterns

### Contabo Nav
- **Mega dropdown menus** — organized by category (VPS types → Apps & Panels → Features)
- **"New!" badges** on new products (OpenClaw, n8n, WireGuard, GitLab CE) — green pill badges
- **Top bar announcement**: "Host Your Own AI Agent with OpenClaw — Free 1-Click Setup!" — persistent, clickable
- **Clean hierarchy**: Logo | Product Dropdowns | Pricing | Company | Help | Login | Sign Up
- **CTA buttons**: "Sign Up" in blue, "Login" as text link — clear primary/secondary hierarchy

### ClawHK Reference
- Add a **top announcement bar** for promotions: `限時優惠：安裝費半價！` — full width, primary color bg
- Nav should be simpler (fewer pages): Logo | 首頁 | 方案 | 常見問題 | 聯絡我們 | [立即開始 CTA]
- The "立即開始" CTA button should be visually distinct (filled, not ghost)

---

## 9. Specific Design Elements Worth Adopting

### Card Design
- **White cards with subtle border** — not heavy shadows
- **Spec grids inside cards** — clean table layout for technical specs
- **Hover effects**: Subtle shadow increase on hover (not translate)
- **Blue accent borders** on selected/featured items
- **Icon + title + description** format for feature cards

### Color System
- Contabo uses a **professional blue (#00AAEB) + amber (#FFB400)** dual accent system
- **White dominant** with blue accents — never overwhelming
- **Green for positive signals**: "SAVE", "No Setup Fee", "Free", checkmarks
- **Red/orange sparingly**: Only for original price strikethroughs

### Typography
- **Bold headings, regular body** — no font-extrabold anywhere
- **Heading sizes are consistent** — H1 is always the same size on product pages
- **Body text is always readable** — minimum ~16px, generous line-height
- **Short paragraphs** — rarely more than 3 sentences in a block

### Spacing
- **Generous section padding** — roughly 80-100px between major sections
- **Consistent card padding** — all cards use similar internal spacing
- **Grid gaps are uniform** — card grids use consistent gap sizing

---

## 10. Summary: Top 15 Actionable Items for ClawHK

| # | Contabo Pattern | ClawHK Action | Priority |
|---|----------------|---------------|----------|
| 1 | H1 + 3 checkmarks hero | Simplify hero to single H1 + 3 trust checkmarks | P0 |
| 2 | Benefit-first headlines | Rewrite all section H2s: benefit first, tech second | P0 |
| 3 | Short two-word taglines ("Privacy first. Speed included.") | Create punchy Chinese taglines for each section | P1 |
| 4 | Specific numbers for trust | Add response time, uptime %, customer count stats | P0 |
| 5 | 3-step "Get Started" | Standardize How It Works as numbered 3-step process | P0 (in Prompt C) |
| 6 | Spec grid in pricing cards | Add CPU/RAM/storage grid format to pricing tier cards | P1 |
| 7 | "SAVE X%" badges on plans | Add savings callout if offering multi-month discounts | P2 |
| 8 | Top announcement bar | Add persistent promo bar: `限時優惠：安裝費半價！` | P0 (in Prompt C) |
| 9 | Integration logo grid | Add WhatsApp/Telegram/OpenClaw/DeepSeek logo section | P1 |
| 10 | FAQ on landing page | Add 3-4 top FAQ items on Index page, not just /faq | P1 |
| 11 | "Real people" mantra | Create ClawHK trust mantra: `真人團隊。真正解答。` | P1 |
| 12 | Awards/testimonials | Add customer testimonials or review quotes | P1 |
| 13 | Mostly-light page rhythm | Keep pages predominantly white/cream, minimal dark sections | P0 (in Prompt C) |
| 14 | No "coming soon" text | Remove incomplete feature mentions | P0 (in Prompt C) |
| 15 | Consistent card format | Standardize all cards to icon + title + description format | P1 |

---

## Copywriting Bank — Ready-to-Use Chinese Phrases

Adapted from Contabo patterns for ClawHK use (香港書面語):

### Hero & CTAs
- `你的 24 小時 AI 私人助手`
- `從對話到行動，一步到位`
- `立即開始` / `查看方案` / `免費諮詢`
- `幾分鐘即可開始使用`

### Trust & Support
- `真人團隊。真正解答。`
- `平均回覆時間 5 分鐘內`
- `你的數據，始終屬於你`
- `一個月費，全部包含`
- `不滿意？7 日內全額退款`

### Feature Descriptions
- `記得你說過的每一句話` (Memory)
- `自動搜尋，即時回答` (SearXNG)
- `24 小時不間斷運行` (Always-on)
- `WhatsApp、Telegram 直接使用` (Messaging)
- `無需任何技術知識` (Non-technical)

### Section Headings (Benefit-First)
- `省時間，不是學技術` (instead of "我們的服務")
- `你的助手，能做什麼？` (instead of "功能介紹")
- `三步開始使用` (instead of "如何使用")
- `為什麼選擇蟹助手？` (instead of "我們的優勢")
- `已有客戶這樣說` (instead of "用戶評價")

### Two-Word Tagline Patterns
- `對話。記憶。行動。`
- `安裝。使用。忘記技術。`
- `私隱至上。速度內含。`
- `你的伺服器。你的數據。`
