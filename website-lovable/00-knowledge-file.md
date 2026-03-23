# Lovable Knowledge File — 蟹助手 (ClawHK)

> Paste this entire file into Lovable's Knowledge File setting. It stays with every prompt.

## Project Identity

- **Brand:** 蟹助手 (ClawHK)
- **Domain:** clawhk.com
- **Tagline:** 擁有你自己的 AI 助手 — 記住你、幫助你、24/7 隨時待命
- **What it is:** Hong Kong's AI assistant installation service. We remotely set up a private AI system (OpenClaw) on customers' VPS or Raspberry Pi 5, with long-term memory, real-time search, auto-recovery watchdogs, and Telegram/WhatsApp access.
- **Target audience:** Non-technical Hong Kong users who want a personal AI assistant but can't set it up themselves.
- **Website language:** 香港書面語 (Hong Kong formal written Chinese). No Cantonese slang. English for tech terms only.

## Design System

- **Theme:** Dark mode with subtle glow effects (reference: SetupClaw.io aesthetic)
- **Primary color:** Warm coral / terracotta (crab theme) — NOT aggressive red
- **Secondary:** Deep navy / charcoal (text + background)
- **Accent:** White + subtle glow + gradient
- **Avoid:** Pure blue (too corporate), green (too WeChat), purple (too abstract)
- **Fonts:** Noto Sans TC for Chinese headings, system sans-serif for body, monospace for English tech terms
- **Layout:** Mobile-first (HK 80%+ mobile users), centered max-width container, generous whitespace
- **Images:** WebP, lazy-loaded, NO stock photos — only real Telegram screenshots + custom mockups
- **Icons:** Emoji for tier names only (🌱⭐🚀), minimal elsewhere

## Global UI Elements

- **Navigation:** Logo "蟹助手" (with crab icon) + 首頁 / 收費 / 常見問題 / 聯絡我們. Mobile hamburger. Sticky on scroll. Desktop top-right CTA: "WhatsApp 查詢"
- **Floating WhatsApp button:** All pages, bottom-right, green WhatsApp icon → wa.me/{NUMBER}. Always visible on mobile. This is the #1 conversion element for HK market.
- **Footer:** Logo + nav links + payment method icons (FPS / PayMe) + email (small) + © 2026 蟹助手
- **Open Graph:** Each page needs og:title + og:description + og:image (1200x630 branded card)
- **Performance target:** Total < 500KB, FCP < 1.5s, static site on Cloudflare Pages

## Pricing Model (source of truth)

3-tier decoy effect pricing. Tier 1 is intentionally weak to push users toward Tier 2.

| | 🌱 新手上路 | ⭐ 智能管家 | 🚀 全能大師 |
|---|---|---|---|
| **Installation (original)** | HK$400 | HK$800 | HK$1,800 |
| **Installation (launch 50% off)** | **HK$200** | **HK$400** | **HK$900** |
| **Monthly (all-inclusive)** | **HK$148/mo** | **HK$248/mo** | **HK$388/mo** |
| **Annual (15% off)** | HK$1,508/yr | HK$2,528/yr | HK$3,958/yr |

Monthly fee includes: VPS hosting + AI compute + VPN + maintenance + monitoring. No hidden costs.

Launch promo: First 20 customers get 50% off installation fee.

## Tier Features

| Feature | 🌱 新手上路 | ⭐ 智能管家 | 🚀 全能大師 |
|---|---|---|---|
| AI Model | DeepSeek | DeepSeek + GPT-4.1-mini | DeepSeek + GPT-4.1 + Claude |
| Messaging | Telegram only | Telegram + WhatsApp | All platforms |
| Long-term memory | No | Yes | Yes + custom personality |
| Real-time search | No | Yes | Yes + custom config |
| Browser automation | No | No | Yes |
| Auto-recovery | No | Yes (gateway watchdog) | Yes (full watchdog suite) |
| Support | AI chatbot only | AI + 7-day human support | AI + 30-day priority support |
| Daily message limit | 100 | 300 | 1,000 |

## Competitor Positioning

**vs ChatGPT Plus (HK$156/mo):**
蟹助手 智能管家 costs HK$92 more but provides: full long-term memory, unlimited search (incl. Reddit), complete data privacy (runs on your own server), 24/7 Telegram/WhatsApp access, dedicated instance (not shared).

## Design References

- **RunMyClaw.ai:** Learn — Telegram chat mockup, "$1/day" reframing, Before/After comparison, sticky mobile CTA, FAQ accordion. Avoid — fake urgency, no localization, no real screenshots.
- **SetupClaw.io:** Learn — Dark theme + coral accent, 3-tier pricing, "Most Popular" badge, dashboard preview. Avoid — zero social proof, too many use cases, unclear pricing breakdown.
