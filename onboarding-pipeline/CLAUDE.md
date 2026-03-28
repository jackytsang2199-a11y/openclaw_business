<claude-mem-context>

</claude-mem-context>

# Onboarding Pipeline — CLAUDE.md

Production automation for customer onboarding. Two main components:

## CF Worker (`cf-worker/`)

TypeScript Cloudflare Worker deployed at `api.3nexgen.com`. Handles:
- **AI Proxy** (`handlers/proxy.ts`): Routes customer API requests to DeepSeek/OpenAI with per-client cost tracking in HKD. Validates gateway tokens via D1 lookup, swaps for real API keys (Worker secrets), enforces monthly budgets (90% warn, 100% block).
- **Job Queue**: Webhook from Lemon Squeezy → `/api/confirm` → D1 jobs table. Pi5 polls `/api/jobs/next`.
- **VPS Management**: CRUD for VPS records, recycling pool (`/api/vps/recyclable`).
- **Admin Endpoints**: 8 usage management endpoints (list, get, update, bulk budgets, reset, revoke, rotate, create).
- **Health**: Worker health + Pi5 heartbeat monitoring (15-min alert threshold).

**Deploy:** `npx wrangler deploy` from `cf-worker/`
**Secrets:** `wrangler secret put DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `ADMIN_API_KEY`, `HMAC_SECRET`
**Database:** Cloudflare D1 (tables: `jobs`, `vps_instances`, `api_usage`)

### Key Technical Details
- Provider base URLs include `/v1` (OpenAI SDK strips it from paths): `deepseek: "https://api.deepseek.com/v1"`, `openai: "https://api.openai.com/v1"`
- Cost rates in `wrangler.toml` env vars (USD per token × USD_TO_HKD)
- Route regex: `/^\/api\/ai\/([^/]+)\/(.+)$/` extracts provider + subpath

## Pi5 Worker (`pi5-worker/`)

Python service running on Raspberry Pi 5 (home LAN, no public IP). Handles:
- **Polling** (`worker.py`): Every 30s, checks CF Worker for pending jobs + sends health ping.
- **Deployment** (`deployer.py`): Full VPS lifecycle — provision → Agent SDK install → QA gates → deliver. Uses Claude Max plan OAuth (zero marginal cost).
- **VPS Recycling** (`vps_lifecycle.py`): Check-before-provision, auto-cancel on churn, revoke+reinstall on recycle.
- **Backup/Restore** (`backup.py`, `restore.py`): Weekly tier-aware backups (Qdrant snapshots + Mem0 DB + clawd data).
- **Notifications** (`notifier.py`): Telegram alerts to owner + customer messages.
- **Playbook** (`playbook.py`): Generates Agent SDK prompts from `openclaw_install/CLAUDE.md` playbook.

**Service:** `nexgen-worker.service` (systemd user service, not yet enabled)
**Tests:** 35 tests in `tests/` (all passing on Windows + Pi5 ARM64)
**Deps:** `requests`, `claude-code-sdk>=0.0.25`, `anyio>=4.0.0`

### Known Patches
- `claude-code-sdk` v0.0.25: patched `message_parser.py` to handle `rate_limit_event` from CLI v2.1.81+

## Architecture
```
Lemon Squeezy → CF Worker /api/confirm → D1 job queue
                                            ↓ (Pi5 polls 30s)
Pi5 Worker → Contabo API → VPS provisioned
           → Agent SDK → 14 install scripts → 5-layer QA
           → Telegram notification → customer delivered
```

## Important Files
- `plan-b-implementation-report.md` — Implementation status, 11 bugs found + fixed
- `contabo-api-guide.md` — Contabo API reference for AI agents
- `telegram-bot-creation/human_guide.md` — Bot setup instructions
