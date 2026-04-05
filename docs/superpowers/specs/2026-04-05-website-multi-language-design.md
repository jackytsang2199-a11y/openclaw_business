# Website Multi-Language Translation Design

**Date:** 2026-04-05
**Status:** Approved
**Scope:** Add i18n to NexGen website (3nexgen.com) — 6 languages in Phase 1

## Overview

Transform the NexGen website from a single-language zh-HK site to a fully internationalized website supporting 6 languages. The site currently has ~287 hardcoded Chinese strings across 11 pages with zero i18n infrastructure.

## Languages

### Phase 1 (this implementation)

| Language | Code | URL Prefix | Translation Source |
|----------|------|------------|-------------------|
| 繁體中文 (Traditional Chinese) | zh-HK | `/` (root, no prefix) | Source language — strings extracted from existing JSX |
| English | en | `/en/` | AI-generated from zh-HK |
| 简体中文 (Simplified Chinese) | zh-CN | `/zh-CN/` | Auto-converted from zh-HK via OpenCC at build time |
| Español (Spanish) | es | `/es/` | AI-generated from zh-HK |
| 日本語 (Japanese) | ja | `/ja/` | AI-generated from zh-HK |
| Русский (Russian) | ru | `/ru/` | AI-generated from zh-HK |

### Phase 2 (future, based on traffic data)

pt-BR, ko, fr — added when demand justifies.

### Not planned

Arabic (ar) — requires RTL layout rework, disproportionate engineering cost for v1.

## Architecture

### Core Library

**react-i18next + i18next** — the dominant React i18n solution. Supports namespaces, lazy loading, interpolation, and pluralization rules per language.

### File Structure

```
src/
├── i18n/
│   ├── index.ts                  ← i18next init + language detection logic
│   ├── opencc.ts                 ← Build-time zh-HK → zh-CN converter
│   ├── locales/
│   │   ├── zh-HK/
│   │   │   ├── common.json       ← Navbar, Footer, shared UI (~25 strings)
│   │   │   ├── home.json         ← Index page (~55 strings)
│   │   │   ├── pricing.json      ← Pricing page (~45 strings)
│   │   │   ├── technology.json   ← Technology page (~20 strings)
│   │   │   ├── faq.json          ← FAQ page (~30 strings)
│   │   │   ├── contact.json      ← Contact page (~15 strings)
│   │   │   ├── onboarding.json   ← Onboarding page (~25 strings)
│   │   │   ├── botguide.json     ← Bot Guide page (~15 strings)
│   │   │   ├── legal.json        ← Terms + Privacy + Refund (~35 strings)
│   │   │   └── meta.json         ← Page titles + descriptions (~22 strings)
│   │   ├── en/
│   │   │   └── (same 10 files)
│   │   ├── es/
│   │   │   └── (same 10 files)
│   │   ├── ja/
│   │   │   └── (same 10 files)
│   │   └── ru/
│   │       └── (same 10 files)
```

- **zh-CN/ is NOT in the repo** — it's gitignored, generated at build time from zh-HK via OpenCC
- 10 namespace files × 5 language folders = **50 JSON files** in source control
- Total translatable strings: **~287 per language**

### String Key Convention

Flat, descriptive keys with dot-separated hierarchy:

```json
// en/home.json
{
  "hero.title": "Your Own Private AI System",
  "hero.subtitle": "Full-stack AI agent installation service",
  "hero.cta": "View Plans",
  "trustStats.uptime": "Uptime",
  "useCases.title": "What Can You Do With It?"
}
```

## URL Routing

### Structure

```
3nexgen.com/pricing          ← zh-HK (default, no prefix)
3nexgen.com/en/pricing       ← English
3nexgen.com/zh-CN/pricing    ← Simplified Chinese
3nexgen.com/es/pricing       ← Spanish
3nexgen.com/ja/pricing       ← Japanese
3nexgen.com/ru/pricing       ← Russian
```

### React Router Integration

```tsx
<Route path="/" element={<LanguageDetector />}>
  {/* zh-HK — default, no prefix */}
  <Route element={<Layout />}>
    <Route index element={<Index />} />
    <Route path="pricing" element={<Pricing />} />
    ...
  </Route>

  {/* Other languages — /:lang prefix */}
  <Route path=":lang" element={<Layout />}>
    <Route index element={<Index />} />
    <Route path="pricing" element={<Pricing />} />
    ...
  </Route>
</Route>
```

- `:lang` param validated against supported languages only (`en`, `zh-CN`, `es`, `ja`, `ru`)
- Invalid prefixes (e.g., `/de/pricing`) fall through to 404
- `useLocalizedPath()` hook auto-prepends current language prefix to all internal `<Link>` components
- Onboarding `?tier=&plan=` query params preserved across language switches
- Lemon Squeezy checkout URLs unchanged — external links, not translated

### Language Detection Flow (first visit)

1. Check localStorage for saved preference → use it
2. Check `navigator.language` → map to nearest supported language
3. Fallback → English (`/en/`)
4. zh-HK browser users → root `/` (no redirect needed)

Preference saved to localStorage on every language switch.

## Language Switcher Component

### Navbar Placement

```
[首頁] [收費] [技術] [常見問題] [聯絡我們]     [🌐 ▾] [查看方案] [Telegram]
```

Globe icon positioned right side of navbar, before the CTA button.

### Dropdown

```
🌐 ▾
┌─────────────────┐
│ 繁體中文    ✓   │  ← current language checkmarked
│ 简体中文        │
│ English         │
│ Español         │
│ 日本語          │
│ Русский         │
└─────────────────┘
```

### Behavior

- Each language displayed in its **own native script** (always readable regardless of current page language)
- Click → navigate to same page in new language prefix, save to localStorage, close dropdown
- Current language indicated with checkmark
- **Mobile:** language switcher appears at bottom of hamburger menu as inline list (not nested dropdown)

### Full UI Translation

When language is switched, the entire UI updates — navbar, footer, page content, meta tags. Example in Japanese:

```
[ホーム] [料金] [技術] [FAQ] [お問い合わせ]     [🌐 ▾] [プランを見る]
```

## SEO & Meta Tags

### Dynamic HTML Attributes

```html
<html lang="zh-HK" dir="ltr">  <!-- updates per language -->
```

### Hreflang Tags (on every page)

```html
<link rel="alternate" hreflang="zh-HK" href="https://3nexgen.com/pricing" />
<link rel="alternate" hreflang="en" href="https://3nexgen.com/en/pricing" />
<link rel="alternate" hreflang="zh-CN" href="https://3nexgen.com/zh-CN/pricing" />
<link rel="alternate" hreflang="es" href="https://3nexgen.com/es/pricing" />
<link rel="alternate" hreflang="ja" href="https://3nexgen.com/ja/pricing" />
<link rel="alternate" hreflang="ru" href="https://3nexgen.com/ru/pricing" />
<link rel="alternate" hreflang="x-default" href="https://3nexgen.com/en/pricing" />
```

`x-default` points to English — matches the fallback logic.

### Meta Tags Per Language

Stored in `meta.json` per locale, rendered via `react-helmet-async`:

```json
// en/meta.json
{
  "home.title": "NexGen — AI Agent Installation Service",
  "home.description": "Full-stack AI agent installed on your own server. From HK$188/mo.",
  "pricing.title": "Pricing — NexGen",
  "pricing.description": "3 plans starting from HK$158/mo. All-inclusive: VPS + API + maintenance."
}
```

### Multi-Language Sitemap

Generated at build time. 10 pages × 6 languages = **60 URLs** with hreflang annotations:

```xml
<url>
  <loc>https://3nexgen.com/pricing</loc>
  <xhtml:link rel="alternate" hreflang="zh-HK" href="https://3nexgen.com/pricing"/>
  <xhtml:link rel="alternate" hreflang="en" href="https://3nexgen.com/en/pricing"/>
  <xhtml:link rel="alternate" hreflang="zh-CN" href="https://3nexgen.com/zh-CN/pricing"/>
  <xhtml:link rel="alternate" hreflang="es" href="https://3nexgen.com/es/pricing"/>
  <xhtml:link rel="alternate" hreflang="ja" href="https://3nexgen.com/ja/pricing"/>
  <xhtml:link rel="alternate" hreflang="ru" href="https://3nexgen.com/ru/pricing"/>
</url>
```

## OpenCC zh-CN Conversion

### How It Works

1. Source of truth: always `zh-HK/` locale files
2. Build-time script reads all zh-HK JSON → runs OpenCC `t2s` (Traditional to Simplified) → outputs `zh-CN/`
3. `zh-CN/` folder is **gitignored** — it's a build artifact

### Conversion Layers

- **Characters:** 記憶體 → 记忆体, 伺服器 → 服务器
- **Phrases:** 軟體 → 软件, 資料庫 → 数据库
- **Regional terms:** Uses `tw2sp` profile for HK/TW → mainland terminology mapping

### Custom Overrides

Brand/product names that must NOT be converted:

```json
// opencc-overrides.json
{
  "NexGen": "NexGen",
  "OpenClaw": "OpenClaw",
  "Mem0": "Mem0",
  "Qdrant": "Qdrant",
  "SearXNG": "SearXNG",
  "ClawTeam": "ClawTeam",
  "ACPX": "ACPX"
}
```

### Build Pipeline

```
vite build
  → pre-build: run opencc-convert.ts
    → read zh-HK/*.json
    → apply OpenCC tw2sp + custom overrides
    → write to zh-CN/*.json (gitignored)
  → bundle all locales including generated zh-CN
```

## Fonts

| Language | Font | Loading |
|----------|------|---------|
| zh-HK | Noto Sans TC | Lazy-loaded when zh-HK is active |
| zh-CN | Noto Sans SC | Lazy-loaded when zh-CN is active |
| ja | Noto Sans JP | Lazy-loaded when ja is active |
| en, es, ru | System font stack (Latin + Cyrillic) | No extra download needed |

CJK fonts are only loaded when the corresponding language is active, avoiding unnecessary bandwidth on Latin-script pages.

## Translation Scope

### What Gets Translated (~287 strings)

| Namespace | Count | Content |
|-----------|-------|---------|
| common.json | ~25 | Navbar links, footer text, shared buttons, language names |
| home.json | ~55 | Hero, trust stats, 6 use cases, before/after, 3-step process, CTAs |
| pricing.json | ~45 | 3 tier names/descriptions, billing toggle, feature matrix, CTAs |
| technology.json | ~20 | 8 tech headlines + descriptions, privacy section |
| faq.json | ~30 | 4 category titles + 13 Q&A pairs |
| contact.json | ~15 | Form labels, placeholders, validation, success/error |
| onboarding.json | ~25 | Form labels, plan names, validation, step instructions |
| botguide.json | ~15 | Step titles, instructions, tips |
| legal.json | ~35 | Terms (5) + Privacy (5) + Refund (4) sections |
| meta.json | ~22 | 11 page titles + 11 descriptions |

### What Does NOT Get Translated

- **Brand names:** NexGen, OpenClaw, Mem0, Qdrant, SearXNG, Telegram, BotFather
- **URLs, emails:** External links, support@3nexgen.com, Lemon Squeezy checkout URLs
- **Prices:** Kept in HKD (HK$) across all languages — this is an HK-based service
- **Code/identifiers:** `/newbot`, `@BotFather`, technical commands in Bot Guide

### Translation Method

- **AI-generated** (Claude) for en, es, ja, ru — shipped directly
- **OpenCC automated** for zh-CN — derived from zh-HK at build time
- Professional review deferred to Phase 2 if market traction warrants it

## Dependencies to Add

```json
{
  "i18next": "^24.x",
  "react-i18next": "^15.x",
  "i18next-browser-languagedetector": "^8.x",
  "opencc-js": "^1.x"
}
```

- `opencc-js` is the pure JavaScript port of OpenCC — runs in Node.js at build time via a Vite plugin, no native binaries needed.

## Phase 2 (Future)

- Add pt-BR, ko, fr based on traffic data from Google Analytics
- Professional review of ja/es/ru translations if those markets show traction
- Consider Cloudflare geo-routing for faster language detection (skip JS detection)
- Arabic (RTL) only if significant demand — requires layout rework
