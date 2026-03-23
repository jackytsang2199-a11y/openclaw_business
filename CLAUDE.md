# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

Business planning and technical documentation for **ClawHK / 蟹助手** — a remote OpenClaw installation service targeting non-technical Hong Kong (Cantonese-speaking) users. This is **not a code repo** — it contains strategy documents, technical guides, legal analysis, and planning materials.

The service installs a full production stack (not just vanilla OpenClaw) on customers' Raspberry Pi 5 or VPS, including Mem0+Qdrant memory, SearXNG search, VPN with watchdogs, and browser automation.

## Repository Structure

```
openclaw_setup_business/
├── business/                  ← Business strategy and operations
│   ├── openclaw-setup-business-plan-v1.md   ← Master business plan (pricing, tiers, marketing, financials)
│   ├── installation-automation-strategy.md  ← How installations are automated (CLAUDE.md playbook + modular scripts)
│   ├── api-pricing-research-2026-03.md      ← API pricing research: 7 providers, HK availability, smart routing, per-客成本
│   └── todo-master.md                       ← Master todo list extracted from business plan
├── technical/
│   ├── guides/                ← Step-by-step setup procedures
│   │   ├── pi5-openclaw-setup-guide.md      ← Complete Pi5 setup (SSH → VPN → OpenClaw → watchdogs)
│   │   └── searxng_setup.md                 ← SearXNG self-hosted search engine setup
│   └── inventory/
│       └── pi5-setup-inventory.md           ← Full list of custom stack components beyond vanilla OpenClaw
├── legal/
│   └── legal-analysis-hk-ai-reseller.md     ← HK API reseller legality (⚠️ identifies deal-breaking regional restrictions)
├── website-lovable/             ← Lovable website build files (copy-paste ready)
│   ├── 00-knowledge-file.md     ← Paste into Lovable Knowledge File setting
│   ├── 01-prompt-pricing.md     ← Prompt 1: Pricing page
│   ├── 02-prompt-landing.md     ← Prompt 2: Landing page
│   ├── 03-prompt-faq.md         ← Prompt 3: FAQ page
│   ├── 04-prompt-contact.md     ← Prompt 4: Contact page
│   ├── 05-build-strategy.md     ← Lovable workflow & credit-saving tips
│   ├── 06-missing-checklist.md  ← Items needed before launch
│   └── src/                     ← Lovable-built website source code (GitHub repo: jackytsang2199-a11y/Openclaw_website, upstream: aimon123a/hello-world-page-46349)
│       ├── index.html           ← Entry point
│       ├── package.json         ← Dependencies (React + Vite + Tailwind + shadcn/ui)
│       ├── src/                 ← React components, pages, hooks
│       └── public/              ← Static assets
├── marketing/
│   └── templates/             ← (Future) LIHKG posts, Instagram content, Telegram promos
└── CLAUDE.md
```

## Key Context

### Language
- **Website copy & customer-facing content:** 香港書面語 (HK formal written Chinese). No Cantonese slang (嘅、咩、唔、佢). English for tech terms.
- **Internal business docs:** May still contain 廣東話 — this is fine for internal use.
- **Design directives / AI instructions:** English (for Lovable/Claude Code parsing).

### Service Tiers (Decoy Effect Pricing) — All-Inclusive Monthly
- **🌱 新手上路** (Install HK$400→200 half-price, HK$148/mo) — Intentional decoy. VPS only, no memory/search.
- **⭐ 智能管家** (Install HK$800→400 half-price, HK$248/mo) — Main revenue driver. Memory + search + watchdogs.
- **🚀 全能大師** (Install HK$1,800→900 half-price, HK$388/mo) — Everything + browser + custom personality.

Monthly fee is all-inclusive: VPS + API compute + VPN + maintenance. No separate API packages.

### Custom Stack (Core Technical Differentiator)
What we install beyond vanilla OpenClaw — this is the moat:
- **Mem0 OSS + Qdrant** — Long-term vector memory (OpenAI `text-embedding-3-small`)
- **SearXNG** — Self-hosted meta-search, bypasses Reddit AI block
- **Gateway Watchdog** — Auto-restarts OpenClaw when Telegram API unreachable
- **VPN Watchdog** — WireGuard with multi-server fallback (JP Tokyo → SG Singapore)
- **Chromium headless** — Browser automation (Tier 3 only)

### Critical Legal Issue
The legal analysis (`legal/legal-analysis-hk-ai-reseller.md`) identifies that **Hong Kong is a restricted region** for Anthropic, OpenAI (direct), and Google Gemini APIs. Key findings from API pricing research (2026-03):
- **Azure OpenAI is the legitimate GPT access channel** — Microsoft explicitly confirms continued HK service
- **Chinese providers (DeepSeek, Qwen, Zhipu, Kimi) have NO HK restrictions** — all directly accessible
- **Claude OAuth tokens are banned for third-party apps** since Jan 2026 — cannot pass Pro/Max subscriptions through OpenClaw
- **`text-embedding-3-nano` does not exist** — use `text-embedding-3-small` ($0.02/1M tokens)

### Installation Automation Strategy
The decided approach is **Option C (Hybrid)**: modular bash scripts handle 80% of routine steps, Claude Code handles QA + debugging. The `installation-automation-strategy.md` contains the full planned `openclaw-installer/` project structure that has not yet been built.

### Revenue Model
Dual stream: one-time installation fees (HK$200-900 half-price period) + all-inclusive monthly fees (HK$148-388/mo). API costs absorbed into monthly fee (not sold separately).

## Working With This Repo

- Customer-facing content uses 香港書面語; internal docs may use 廣東話
- Cross-reference between documents rather than duplicating content
- The business plan v1 is the master document; other docs are supporting materials
- The `installation-automation-strategy.md` contains a detailed future project structure (`openclaw-installer/`) and CLAUDE.md playbook design — this is the implementation roadmap
- Marketing channel priority: LIHKG > Instagram > Telegram > Facebook


<claude-mem-context>
# Recent Activity

### Mar 23, 2026

| ID | Time | T | Title | Read |
|----|------|---|-------|------|
| #560 | 6:25 PM | 🔵 | Project Context Revealed: AI API Reseller Business for Hong Kong Market | ~445 |
</claude-mem-context>