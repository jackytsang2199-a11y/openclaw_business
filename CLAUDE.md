# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

Business planning, technical documentation, and **production automation code** for **NexGen** — a remote OpenClaw installation service targeting non-technical Hong Kong (Cantonese-speaking) users.

The service installs a full production stack (not just vanilla OpenClaw) on customers' VPS, including Mem0+Qdrant memory, SearXNG search, watchdogs, and browser automation. All API traffic routes through a Cloudflare Worker proxy for per-client cost tracking and budget enforcement — **zero real API keys on customer VPS**.

**Domain:** `3nexgen.com` (Cloudflare) | **API:** `api.3nexgen.com` (CF Worker)

## Repository Structure

```
openclaw_setup_business/
├── active.md                           ← Project status dashboard (start here)
├── CLAUDE.md                           ← You are here
│
├── business/                           ← Business strategy and operations
│   ├── openclaw-setup-business-plan-v1.md   ← Master 14-section business plan
│   ├── installation-automation-strategy.md  ← Automation approach (Option C: Hybrid)
│   ├── api-pricing-research-2026-03.md      ← API pricing: 7 providers, HK availability
│   ├── pricing-analysis.md                  ← Cost breakdown per tier
│   ├── todo-master.md                       ← Original 48 tasks (partially completed)
│   └── archive/                             ← Outdated docs
│
├── onboarding-pipeline/                ← Customer onboarding automation (PRODUCTION CODE)
│   ├── cf-worker/                      ← Cloudflare Worker — API gateway + AI proxy
│   │   └── src/
│   │       ├── index.ts                ← Route handler (19 endpoints)
│   │       ├── handlers/proxy.ts       ← AI proxy with cost tracking
│   │       ├── handlers/health.ts      ← Health endpoints
│   │       ├── lib/types.ts            ← TypeScript types
│   │       ├── lib/db.ts               ← D1 database operations
│   │       ├── lib/auth.ts             ← Auth helpers
│   │       ├── lib/hmac.ts             ← HMAC signature verification
│   │       └── lib/alerts.ts           ← Alert utilities
│   ├── pi5-worker/                     ← Pi5 deployment worker (Python)
│   │   ├── worker.py                   ← Main polling loop (30s)
│   │   ├── deployer.py                 ← Deployment orchestrator (Agent SDK)
│   │   ├── api_client.py               ← CF Worker REST client
│   │   ├── playbook.py                 ← Deployment prompt builder
│   │   ├── notifier.py                 ← Telegram notifications
│   │   ├── vps_lifecycle.py            ← VPS recycling pool
│   │   ├── backup.py                   ← Weekly backup orchestrator
│   │   ├── restore.py                  ← Restore helper
│   │   ├── config.py                   ← Configuration loader
│   │   └── tests/                      ← 35 tests (all passing)
│   ├── plan-b-implementation-report.md ← Implementation status + bugs fixed
│   ├── contabo-api-guide.md            ← Contabo API reference for AI agents
│   └── telegram-bot-creation/          ← Bot setup guide
│
├── openclaw_install/                   ← VPS installation system
│   ├── CLAUDE.md                       ← Installer playbook (detailed deployment guide)
│   ├── scripts/                        ← 14 install scripts (00-swap to 13-clawteam)
│   ├── qa/                             ← 5-layer QA suite (28 checks)
│   ├── provision/                      ← Contabo + Hetzner provisioning scripts
│   ├── discovery/                      ← E2E run documentation (12 issues found + fixed)
│   └── clients/T001, T002/             ← Test deployment records
│
├── docs/superpowers/                   ← Design specs and implementation plans
│   ├── plans/                          ← Implementation plans (current + archived)
│   └── specs/                          ← Design specifications
│
├── technical/
│   ├── guides/openclaw-stack-reference.md  ← Full stack technical reference
│   └── inventory/pi5-setup-inventory.md    ← Hardware + software BOM
│
├── legal/
│   └── legal-analysis-hk-ai-reseller.md    ← CRITICAL: HK restrictions + compliant channels
│
├── Pi5/
│   └── Pi5_remote_management.md            ← Pi5 SSH + operations guide
│
├── website-lovable/                    ← Website (React + Vite + Tailwind + shadcn/ui)
│   ├── 00-knowledge-file.md            ← Lovable knowledge base (paste into Lovable)
│   ├── 05-build-strategy.md            ← Lovable workflow guide
│   ├── 08-13-prompt-*.md               ← Current design iterations
│   ├── src/                            ← Website source code
│   └── archive/                        ← Outdated v1 prompts
│
├── scripts/
│   └── nexgen-backup-pull.sh           ← PC → Pi5 backup sync
│
└── marketing/templates/                ← (Future) LIHKG, IG, Telegram content
```

## Key Context

### Language
- **Website copy & customer-facing content:** 香港書面語 (HK formal written Chinese). No Cantonese slang (嘅、咩、唔、佢). English for tech terms.
- **Internal business docs:** May contain 廣東話 — this is fine for internal use.
- **Design directives / AI instructions / Code:** English.

### Service Tiers (3-Tier Pricing) — All-Inclusive Subscription

| Tier | Name | Monthly (彈性) | Quarterly (推薦) | Annual (最優惠) | Token Allocation | Key Features |
|------|------|---------------|-----------------|----------------|-----------------|--------------|
| 1 | 基本版 Starter | HK$248/mo | HK$188/mo | HK$158/mo | 5M tokens/mo | AI chat on Telegram only |
| 2 | 專業版 Pro | HK$398/mo | HK$298/mo | HK$248/mo | 10M tokens/mo | + Mem0 memory + SearXNG search + watchdog |
| 3 | 旗艦版 Elite | HK$598/mo | HK$458/mo | HK$388/mo | 20M tokens/mo | + Chrome headless + multi-agent + custom personality |

No install fees — subscription only. Monthly fee is all-inclusive: VPS + API compute + maintenance.

### Architecture: Proxy-Only (Zero Keys on VPS)

**Security model:** Customer VPS has ZERO real API keys. All API requests route through CF Worker proxy at `api.3nexgen.com`, which:
1. Validates per-client gateway tokens (64-char hex, stored in D1)
2. Tracks cost in HKD per customer (monthly budget enforcement: 90% warn, 100% block)
3. Swaps gateway token for real API key (stored as CF Worker secrets)
4. Forwards to provider (DeepSeek or OpenAI)

**Three API streams (all proxied):**
| Stream | Provider | Purpose | Endpoint |
|--------|----------|---------|----------|
| Chat | DeepSeek | OpenClaw conversations | `/api/ai/deepseek/*` |
| Embeddings | OpenAI | Mem0 vector memory | `/api/ai/openai/*` |
| LLM Extract | DeepSeek via OpenAI client | Mem0 fact extraction | `/api/ai/deepseek/*` |

**VPS config:** `DEEPSEEK_API_KEY` and `OPENAI_API_KEY` are both set to the gateway token. `baseURL` points to `api.3nexgen.com/api/ai/{provider}`.

### Deployment Pipeline
```
Customer payment (Lemon Squeezy) → webhook → CF Worker /api/confirm → D1 job queue
    ↓ Pi5 polls every 30s
Pi5 Worker → Contabo API provision VPS → Claude Agent SDK deploy stack → QA gates → deliver
```

The Pi5 runs on home LAN (no public IP needed), uses Claude Max plan OAuth for Agent SDK sessions (zero marginal cost), and manages the full VPS lifecycle including recycling.

### Custom Stack (Core Technical Differentiator)
What we install beyond vanilla OpenClaw:
- **Mem0 OSS + Qdrant** — Long-term vector memory (OpenAI `text-embedding-3-small` via proxy)
- **SearXNG** — Self-hosted meta-search, bypasses Reddit AI block
- **Gateway Watchdog** — Auto-restarts OpenClaw when Telegram API unreachable
- **Chromium headless** — Browser automation (Tier 3 only)

### Critical Legal Constraints
- **Hong Kong is a restricted region** for Anthropic, OpenAI (direct), Google Gemini APIs
- **DeepSeek, Qwen, Zhipu, Kimi** — NO HK restrictions, directly accessible
- **Azure OpenAI** — legitimate GPT access channel (Microsoft confirms HK service)
- **Claude OAuth tokens banned** for third-party apps since Jan 2026
- We use DeepSeek for chat + LLM extraction, OpenAI only for embeddings (via proxy)

### Revenue Model
Subscription only: all-inclusive monthly fees (HK$158-598/mo depending on tier and billing cycle). No one-time install fees. API costs absorbed into the subscription.

## Working With This Repo

- Read `active.md` for current project status and remaining tasks
- `onboarding-pipeline/` contains production code — treat with care
- `openclaw_install/CLAUDE.md` is the installer agent playbook — read before modifying install scripts
- Customer-facing content uses 香港書面語; internal docs may use 廣東話
- The business plan v1 is the master document; other docs are supporting materials
- Archived docs in `archive/` directories are for reference only — do not use for current work
- Marketing channel priority: LIHKG > Instagram > Telegram > Facebook
