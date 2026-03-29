# Website Improvement Plan — 3NexGen / 蟹助手

> **Generated:** 2026-03-30
> **Source:** 3-agent review team (UX researcher, frontend developer, UI designer)
> **Scope:** `website-lovable/src/` — React + Vite + Tailwind + shadcn/ui
> **Status:** Pre-launch review. Site is ~70% complete.

---

## Executive Summary

The website has strong copy (F2 spec largely implemented correctly), good mobile-responsive layout, and tasteful animations. However, it is **fundamentally missing conversion infrastructure** — there is no checkout flow, no order form, wrong pricing, and placeholder contact info. These 5 issues must be fixed before any launch or marketing spend.

---

## Phase 1: Critical Fixes (Before Launch)

These block the ability to accept a single customer.

### 1.1 Fix All Pricing Values (Wrong Currency Scale)

**Problem:** Pricing.tsx shows USD-like values — install HK$25/50/115, monthly HK$19/32/49. Business plan specifies HK$200/400/900 (install) and HK$148/248/388 (monthly). The mid-page CTA says "由 HK$19/月起".

**Files:** `pages/Pricing.tsx`, `pages/Index.tsx` (lines ~444, ~615)

**Fix:**
```
Tier 1: installOriginal 400, installPromo 200, monthly 148, annual 1508
Tier 2: installOriginal 800, installPromo 400, monthly 248, annual 2528
Tier 3: installOriginal 1800, installPromo 900, monthly 388, annual 3958
```
Update Index.tsx mid-page CTA: "由 HK$148/月起 — 每日不到 HK$5"

**Complexity:** Small | **Impact:** Critical

---

### 1.2 Add Lemon Squeezy Checkout Integration

**Problem:** Every "選擇此方案" button links to `wa.me/85200000000`. There is zero payment/checkout code. The pipeline expects `POST /api/webhook/lemonsqueezy` but the website has no integration.

**Files:** `pages/Pricing.tsx`

**Action:** Two options:
- **(A) Lemon Squeezy Overlay (recommended):** Add `<script src="https://app.lemonsqueezy.com/js/lemon.js">` to `index.html`. Replace each tier's CTA `<a>` with `<a href="https://STORE.lemonsqueezy.com/checkout/buy/VARIANT_ID" class="lemonsqueezy-button">`. Each tier (monthly + annual) = 6 variant URLs.
- **(B) Order page:** Create `/order` page with tier selection + Telegram user ID input → redirect to Lemon Squeezy.

**Human dependency:** Lemon Squeezy subscription plans must be configured first (3 tiers x 2 billing cycles = 6 products).

**Complexity:** Medium | **Impact:** Critical (no revenue without this)

---

### 1.3 Replace Placeholder WhatsApp Number

**Problem:** `85200000000` appears in 7+ files. Every CTA on the site leads nowhere.

**Files:** Index.tsx, Pricing.tsx, FAQ.tsx, Technology.tsx, Contact.tsx, Navbar.tsx, Footer.tsx, WhatsAppFloat.tsx

**Action:**
1. Create `lib/constants.ts` with `export const WHATSAPP_URL = "https://wa.me/852XXXXXXXX"`
2. Replace all 7+ hardcoded instances with the import
3. Also centralize `TELEGRAM_URL` the same way

**Human dependency:** Buy prepaid SIM, register WhatsApp Business.

**Complexity:** Small | **Impact:** Critical

---

### 1.4 Fix Payment Methods in Footer

**Problem:** Footer shows "Stripe | PayPal | Bank Transfer". Business plan specifies FPS, PayMe, credit card. HK users expect FPS/PayMe.

**File:** `components/Footer.tsx` (lines ~61-63)

**Fix:** Replace with "FPS | PayMe | 信用卡" (or add payment method icons).

**Complexity:** Small | **Impact:** Important (trust signal for HK market)

---

### 1.5 Remove WireGuard from Technology Page

**Problem:** Technology.tsx still includes WireGuard section ("軍事級 VPN 隧道"). F1 rebrand spec explicitly removed it. F2 copy replaced it with ACPX/ClawTeam/Watchdog.

**File:** `pages/Technology.tsx` (lines ~24-27 in techSections array)

**Fix:** Delete the WireGuard entry from the array.

**Complexity:** Small | **Impact:** Important (outdated/inaccurate info)

---

### 1.6 Fix OG Image Meta Tags

**Problem:** `index.html` still points to `https://lovable.dev/opengraph-image-p98pqg.png`. The OG image SVG now exists at `public/og-image.svg`.

**File:** `index.html` (lines ~13-14)

**Action:** Update meta tags. Note: many social platforms don't render SVG — convert to PNG first (`og-image.png`, 1200x630).

**Complexity:** Small | **Impact:** Important (LIHKG/WhatsApp sharing shows blank preview)

---

## Phase 2: Important Improvements (Before Soft Launch)

### 2.1 Add Tally.so Contact Form

**Problem:** Contact page has only WhatsApp/Telegram cards. No form. Checklist item #7.

**File:** `pages/Contact.tsx`

**Action:** Embed Tally.so form iframe with fields: Name, Email, WhatsApp (optional), Tier interest (dropdown), Message.

**Human dependency:** Create Tally.so account + form first.

**Complexity:** Small | **Impact:** High

---

### 2.2 Create Legal Pages (Terms, Privacy, Refund)

**Problem:** Footer links to 服務條款, 私隱政策, 退款政策 all point to `href="#"`.

**Action:**
- Create `pages/Terms.tsx`, `pages/Privacy.tsx`, `pages/Refund.tsx`
- Add routes in `App.tsx`
- Draft minimal content (AI can generate initial drafts, human reviews)

**Complexity:** Medium | **Impact:** High (legally required for HK data handling)

---

### 2.3 Fix Navbar Dark Mode Consistency

**Problem:** Navbar uses `bg-white/80` but the design system specifies dark mode. Hero is dark, footer is dark — navbar is jarring white.

**File:** `components/Navbar.tsx` (line ~36)

**Fix:** Change to `bg-gray-900/80 backdrop-blur-md` with white text. Or use transparent-over-hero with scroll-triggered background.

**Complexity:** Small | **Impact:** Medium (visual cohesion)

---

### 2.4 Remove Vite Boilerplate from App.css

**Problem:** App.css contains default Vite/React styles (`.logo`, `.logo-spin`, `#root { max-width: 1280px }`). The `#root` rule may conflict with Tailwind container settings.

**File:** `App.css`

**Fix:** Delete all Vite boilerplate content.

**Complexity:** Small | **Impact:** Medium (prevents subtle layout bugs)

---

### 2.5 Add Floating WhatsApp Button

**Problem:** The knowledge file calls this "the #1 conversion element for HK market." A `WhatsAppFloat.tsx` component EXISTS but may not be rendered in the layout.

**File:** `components/Layout.tsx`, `components/WhatsAppFloat.tsx`

**Action:** Verify `<WhatsAppFloat />` is included in Layout. If not, add it. Ensure it's fixed bottom-right, green, visible on all pages, especially mobile.

**Complexity:** Small | **Impact:** High (HK conversion pattern)

---

### 2.6 Integrate Privacy Diagram on Technology Page

**Problem:** `public/privacy-diagram.svg` exists but no page uses it.

**File:** `pages/Technology.tsx`

**Action:** Add a new section: "數據私隱比較" with the SVG diagram showing ChatGPT vs 蟹助手 data flow.

**Complexity:** Small | **Impact:** Medium (strong trust signal)

---

### 2.7 Translate NotFound Page to Chinese

**Problem:** 404 page shows English "Oops! Page not found". Also lacks Layout wrapper (no navbar/footer).

**File:** `pages/NotFound.tsx`

**Fix:** Translate to Chinese, wrap in `<Layout>`.

**Complexity:** Small | **Impact:** Small

---

### 2.8 Load Noto Sans TC Font

**Problem:** CSS declares `font-family: 'Noto Sans TC'` but no font is actually loaded. Chinese text falls back to system fonts inconsistently.

**File:** `index.html`

**Action:** Add Google Fonts link: `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&display=swap" rel="stylesheet">`

**Complexity:** Small | **Impact:** Medium (consistent Chinese typography)

---

## Phase 3: Post-Launch Enhancements

### 3.1 Post-Purchase Status Tracking Page

**Problem:** After payment, customers have zero visibility into deployment progress (~15-30 min).

**Action:** Create `/status` page that accepts an order ID and polls CF Worker `GET /api/jobs/:id` to show: queued → provisioning → installing → testing → ready. Include "we'll notify you on Telegram" message.

**Complexity:** Medium | **Impact:** High (reduces support load)

---

### 3.2 Per-Page SEO Titles + Structured Data

**Problem:** All pages show the same `<title>`. No JSON-LD structured data. No sitemap.xml.

**Action:**
- Add `react-helmet-async` for per-page titles/descriptions
- Add JSON-LD `LocalBusiness` + `Service` structured data
- Generate sitemap.xml

**Complexity:** Medium | **Impact:** Medium (SEO for LIHKG/Google)

---

### 3.3 Strengthen Decoy Effect on Pricing Cards

**Problem:** Tier 2 already has visual prominence (border, scale, badge) but Tier 1 doesn't look "bad enough" to push users to Tier 2.

**Action:**
- Make Tier 1's missing features more visually prominent (red X, stronger grey-out)
- Add "最划算" per-feature cost calculation on Tier 2
- Consider subtle glow/gradient on Tier 2 card

**Complexity:** Small | **Impact:** Medium (revenue optimization)

---

### 3.4 Add Real Telegram Screenshots

**Problem:** Zero product visuals anywhere. Only a code-rendered chat mockup. Non-technical users need to SEE the product.

**Action:** Capture 4-6 real Telegram screenshots (general Q&A, memory recall, search results, Cantonese responses). Use in hero section and social proof area.

**Human dependency:** Requires working OpenClaw instance with Mem0 populated.

**Complexity:** Small (code) | **Impact:** Very High (credibility)

---

### 3.5 Proper Logo

**Problem:** Current logo is a blue square with letter "N". Placeholder quality.

**Action:** AI-generate or commission a proper logo. Options: stylized "N" with AI/neural network motif, or retain the crab icon if brand direction permits.

**Human dependency:** Design decision on brand direction (NexGen blue vs crab-orange).

**Complexity:** Medium | **Impact:** High (brand credibility)

---

### 3.6 Resolve Brand Color Direction

**Problem:** CSS uses blue (`--primary: 217 91% 60%`). Knowledge file specifies "warm coral/terracotta (crab theme)". The NexGen rebrand may have intentionally changed this, but it's undocumented.

**Action:** Make an explicit decision:
- **Option A:** Keep blue, update knowledge file to reflect NexGen brand
- **Option B:** Switch to coral/orange, align with original crab theme

**Complexity:** Small-Medium (depending on choice) | **Impact:** High (brand identity)

---

### 3.7 Accessibility & Performance Polish

- Add `prefers-reduced-motion` check for framer-motion animations
- Add alt text improvements for decorative elements
- Remove 40+ unused shadcn/ui components (tree-shaking handles runtime, but source cleanup is good)
- Add annual pricing "Save HK$XXX" badge
- Cross-link FAQ answers to pricing page

**Complexity:** Small (each) | **Impact:** Small-Medium

---

## Execution Priority Matrix

| Priority | Items | Est. Active Time |
|----------|-------|-----------------|
| **P0: Launch Blockers** | 1.1 pricing, 1.2 checkout, 1.3 WhatsApp, 1.4 payment methods, 1.5 WireGuard, 1.6 OG image | ~4 hrs (code) + human deps |
| **P1: Before Soft Launch** | 2.1-2.8 (Tally, legal pages, dark navbar, CSS cleanup, WhatsApp float, privacy diagram, 404, font) | ~3 hrs |
| **P2: Post-Launch** | 3.1-3.7 (status page, SEO, decoy, screenshots, logo, brand, a11y) | ~6 hrs |

**Human dependencies that block P0:**
1. Buy WhatsApp SIM → register WhatsApp Business
2. Configure Lemon Squeezy products (6 variants)
3. Decide: blue brand (NexGen) or coral brand (crab theme)?

---

## Order Form Specification

The site currently has NO order form. Here's the recommended design:

### Option A: Lemon Squeezy Direct Checkout (Simplest)

Each pricing card's CTA button links directly to a Lemon Squeezy hosted checkout page with the variant pre-selected. Customer enters payment details on Lemon Squeezy. Webhook fires to CF Worker.

**Pros:** No custom form needed, PCI compliance handled by LS.
**Cons:** Customer can't input Telegram bot token/user ID during checkout.

**Workaround:** After payment, redirect to a "setup info" page where customer provides:
- Telegram User ID (link to instructions on how to find it)
- Bot Token (link to `telegram-bot-creation/human_guide.md`)

### Option B: Custom Order Page (Better UX)

Create `/order` page:
```
Step 1: Select tier (radio cards, pre-selected from pricing page via URL param)
Step 2: Provide Telegram info
  - Telegram User ID (with help tooltip + link to find-my-id bot)
  - Bot Token (with inline guide or link to BotFather instructions)
Step 3: Payment
  - "Proceed to checkout" → redirect to Lemon Squeezy with tier variant
```

After payment, Lemon Squeezy webhook includes custom data (Telegram info) → CF Worker creates job → Pi5 deploys.

**Recommended:** Start with Option A for launch speed, evolve to Option B.
