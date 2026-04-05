# Architecture Brief — ClawHK / 3NexGen

> **Purpose:** Quick-start context for AI agents working on this codebase. Read this BEFORE exploring files.

## What This Is

A remote OpenClaw installation service for Hong Kong users. We provision VPS, install a full AI assistant stack, and manage ongoing API costs — all automated.

**Domain:** `3nexgen.com` | **API:** `api.3nexgen.com` (Cloudflare Worker)

## Core Architecture: Proxy-Only (Zero Keys on VPS)

```
Customer VPS (ZERO real API keys)
    | Bearer <64-char gateway_token>
    v
CF Worker @ api.3nexgen.com
    ├── Auth: D1 token lookup → customer_id
    ├── Cost: Calculate HKD per request, update D1
    ├── Budget: 90% warn header, 100% block (429)
    └── Forward with real API key (CF Worker secrets)
         ├── /api/ai/deepseek/* → api.deepseek.com/v1/*
         ├── /api/ai/openai/*   → api.openai.com/v1/*
         └── /api/ai/zhipu/*    → open.bigmodel.cn/api/paas/v4/*
```

**Key insight:** Customer VPS sets `DEEPSEEK_API_KEY` and `OPENAI_API_KEY` to the same gateway token. `baseURL` points to our proxy. The proxy swaps the token for real keys.

## Deployment Pipeline

```
Lemon Squeezy payment → webhook → CF Worker /api/confirm → D1 job (status: ready)
    ↓ Pi5 polls every 30s
Pi5 Worker picks up job → Contabo API provisions VPS → Claude Agent SDK deploys stack → QA gates → deliver
```

## Two Main Code Components

### 1. CF Worker (`onboarding-pipeline/cf-worker/`)

TypeScript, deployed at `api.3nexgen.com`. **19 endpoints:**

| Group | Endpoints | Purpose |
|-------|-----------|---------|
| AI Proxy | `POST /api/ai/:provider/*` | Forward customer API requests with cost tracking |
| Jobs | `GET /api/jobs/next`, `PATCH /api/jobs/:id` | Pi5 polls for work, updates status |
| Orders | `POST /api/orders`, `POST /api/webhook/lemonsqueezy`, `POST /api/confirm/:id` | Customer orders + payment |
| VPS | `GET/POST/PATCH /api/vps`, `GET /api/vps/recyclable` | VPS CRUD + recycling pool |
| Usage Admin | 8 endpoints under `/api/usage/*` | List, get, update, bulk budgets, reset, revoke, rotate, create |
| Health | `POST /api/health` | Pi5 heartbeat (15-min alert threshold) |

**Key files:**
- `src/index.ts` — Route handler
- `src/handlers/proxy.ts` — AI proxy with HKD cost tracking
- `src/lib/db.ts` — D1 database operations
- `src/lib/types.ts` — TypeScript types
- `src/lib/auth.ts` — Auth helpers (Bearer token + ADMIN_API_KEY)

**Database:** Cloudflare D1 — tables: `jobs`, `vps_instances`, `api_usage`

**Deploy:** `npx wrangler deploy` from `cf-worker/`
**Secrets:** `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `ZHIPU_API_KEY`, `ADMIN_API_KEY`, `HMAC_SECRET`

### 2. Pi5 Worker (`onboarding-pipeline/pi5-worker/`)

Python, runs on Raspberry Pi 5 (home LAN, no public IP). Systemd user service.

| Module | Purpose |
|--------|---------|
| `worker.py` | Main polling loop (30s interval) |
| `deployer.py` | Full VPS lifecycle: provision → Agent SDK deploy → QA → deliver |
| `api_client.py` | CF Worker REST client |
| `playbook.py` | Builds Agent SDK prompts from installer CLAUDE.md |
| `notifier.py` | Telegram alerts (owner + customer) |
| `vps_lifecycle.py` | VPS recycling: cancel → revoke → reinstall |
| `backup.py` | Weekly tier-aware backup orchestrator |
| `restore.py` | Data restore helper |
| `config.py` | Typed config loader (reads `.env`) |

**Auth:** Claude Max plan OAuth (`~/.claude/` token, not API keys). Zero marginal cost.
**Tests:** 35 in `tests/` (all passing)
**Service:** `nexgen-worker.service` (installed, NOT yet enabled)

## VPS Installer (`openclaw_install/`)

14 bash scripts (00-13) + 5-layer QA suite (28 checks). See `install-scripts-brief.md` for details.

**Key file:** `openclaw_install/CLAUDE.md` — the playbook that Agent SDK follows during deployment.

## Service Tiers

| Tier | Name | Monthly | Quarterly | Annual | Key Features |
|------|------|---------|-----------|--------|--------------|
| 1 | 基本版 Starter | HK$248 | HK$188 | HK$158 | AI chat on Telegram only |
| 2 | 專業版 Pro | HK$398 | HK$298 | HK$248 | + Mem0 memory + SearXNG search + watchdog |
| 3 | 旗艦版 Elite | HK$598 | HK$458 | HK$388 | + Chrome headless + multi-agent + custom personality |

## API Providers

| Stream | Provider | Purpose | HK Legal? |
|--------|----------|---------|-----------|
| Chat | DeepSeek | OpenClaw conversations | Yes (no HK restrictions) |
| Embeddings | OpenAI | Mem0 vector memory (`text-embedding-3-small`) | Via proxy (HK restricted direct) |
| LLM Extract | DeepSeek via OpenAI client | Mem0 fact extraction | Yes |
| Zhipu GLM | Zhipu | Free fallback | Yes |

## Key Directories

```
openclaw_setup_business/
├── active.md                    ← Project status dashboard
├── CLAUDE.md                    ← Master AI guidance
├── onboarding-pipeline/
│   ├── cf-worker/src/           ← CF Worker TypeScript (DEPLOYED)
│   ├── pi5-worker/              ← Pi5 Python worker (NOT ENABLED)
│   └── contabo-api-guide.md     ← Contabo API reference
├── openclaw_install/
│   ├── CLAUDE.md                ← Installer playbook (Agent SDK reads this)
│   ├── scripts/                 ← 14 install scripts
│   ├── qa/                      ← 5-layer QA suite
│   └── provision/               ← VPS provisioning scripts
├── business/                    ← Business plan, pricing, strategy
├── website-lovable/             ← Website (React + Vite + Tailwind)
├── docs/superpowers/            ← Design specs + implementation plans
└── legal/                       ← HK compliance analysis
```

## Known Patches & Gotchas

- `claude-code-sdk` v0.0.25 needs monkeypatch for `rate_limit_event` from CLI v2.1.81+
- OpenAI SDK strips `/v1` from paths — proxy base URLs must include `/v1`
- UFW: use `ufw allow 22/tcp` NOT `ufw allow OpenSSH` (profile may not exist on Contabo)
- Contabo `defaultUser` must be `root` (not `admin`) — cloud-init creates `deploy` user
- `set -e` + `((PASS++))` = script exits on 0 — use `PASS=$((PASS+1))` instead
