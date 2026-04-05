# Website Brief — ClawHK / 3NexGen

> **Purpose:** Quick-start context for AI agents working on website content, copy, or deployment. Read this BEFORE exploring `website-lovable/`.

## Current State

- **Tech stack:** React 18 + Vite + Tailwind CSS + shadcn/ui
- **Built with:** Lovable (AI website builder)
- **Design:** 14 iterations completed, direction settled (Contabo-inspired dark mode, crab theme)
- **Copy:** Finalized in `13-prompt-F2-copy-rewrite.md`
- **Status:** 70% — NOT YET DEPLOYED. Needs final Lovable build + Cloudflare Pages deploy.

## Key Files

| File | Purpose | Use? |
|------|---------|------|
| `00-knowledge-file.md` | Brand identity, design system, pricing, copy guidelines | Paste into Lovable Knowledge File setting |
| `05-build-strategy.md` | Lovable workflow guide + credit-saving tips | Reference for Lovable builds |
| `06-missing-checklist.md` | Pre-launch checklist (7 critical, 5 nice-to-have) | Action items before launch |
| `13-prompt-F2-copy-rewrite.md` | **Latest finalized copy** | Use this for all content |
| `lovable-changes.md` | Consolidated change log v1 | Reference |
| `lovable-changes_v2.md` | Consolidated change log v2 | Reference |
| `src/` | Website source code | React components |
| `archive/` | Outdated v1 prompts (01-04) | DO NOT USE |

## Language Rules (CRITICAL)

- **All customer-facing copy:** 香港書面語 (HK formal written Chinese)
- **NEVER use:** Cantonese slang (嘅、咩、唔、佢、嗰、咁、啲)
- **English for:** tech terms (OpenClaw, AI, API, Telegram, VPS, Docker)
- **No emoji in tier names:** 基本版 Starter, 專業版 Pro, 旗艦版 Elite

## Service Tiers (3-Tier Pricing)

All-inclusive subscription (VPS + API compute + maintenance). No install fees.

| Tier | Name | Monthly (彈性) | Quarterly (推薦) | Annual (最優惠) | Target |
|------|------|---------------|-----------------|----------------|--------|
| 1 | 基本版 Starter | HK$248/mo | HK$188/mo | HK$158/mo | Entry — AI chat on Telegram only |
| 2 | 專業版 Pro | HK$398/mo | HK$298/mo | HK$248/mo | **Main revenue driver** — memory + search + watchdog |
| 3 | 旗艦版 Elite | HK$598/mo | HK$458/mo | HK$388/mo | Premium — everything + browser + custom personality |

## Brand Identity

- **Chinese name:** 蟹助手 (Crab Assistant)
- **English name:** ClawHK / 3NexGen
- **Domain:** `3nexgen.com`
- **Tagline direction:** AI assistant accessible to non-technical HK users
- **Visual:** Dark mode base, crab-orange accent, professional aesthetic
- **Target:** Non-technical Hong Kong Cantonese-speaking users

## Site Structure

| Page | Content |
|------|---------|
| Index/Home | Hero + features + social proof + CTA |
| Pricing | 3 tiers with Lemon Squeezy checkout button |
| FAQ | Tier comparison + feature explanations |
| Contact | Support channels + form (Tally.so) |
| Technology | Stack reference + privacy model |

## Missing Items Before Launch

### Must-Have (blocks launch)

| # | Item | Notes |
|---|------|-------|
| 1 | WhatsApp number | Separate SIM, not personal |
| 2 | Telegram handle | e.g. @clawhk |
| 3 | Instagram handle | e.g. @clawhk.hk (need IG business account) |
| 4 | Logo | Text "蟹助手" + crab icon (can AI-generate) |
| 5 | Telegram chat screenshots | Real conversations from own OpenClaw instance (hero + social proof) |
| 6 | Tally.so form | Account + form + Google Sheet sync + notifications |

**Note:** Domain `3nexgen.com` already purchased on Cloudflare.

### Nice-to-Have (add later)

- Beta user quotes (3-5 friends trial)
- Memory recall screenshot
- Search result screenshot
- OG image (1200x630 for social sharing)
- Privacy diagram (ChatGPT vs 蟹助手 data flow)

## Deploy Steps

1. Gather all missing items above
2. Final Lovable build using `13-prompt-F2-copy-rewrite.md` copy
3. Download ZIP from Lovable
4. Test locally: `npm install && npm run dev`
5. Deploy to Cloudflare Pages (domain: `3nexgen.com`)
6. Configure Lemon Squeezy checkout buttons with real variant IDs

## Marketing Channel Priority

LIHKG > Instagram > Telegram > Facebook

(Marketing content goes in `marketing/templates/` — currently empty, Phase 1 work)
