# NexGen Onboarding Pipeline — Operations Guide for AI Agents

> **Audience:** AI agents (Claude, etc.) operating the NexGen/ClawHK infrastructure
> **Last updated:** 2026-03-29

---

## Architecture Overview

```
Customer (Telegram) → OpenClaw bot (VPS) → CF Worker proxy (api.3nexgen.com) → DeepSeek/OpenAI APIs
                                                    ↓
                                              D1 database (tracks cost per customer in HKD)
```

**Three systems to operate:**

| System | Location | Access |
|--------|----------|--------|
| CF Worker API | `api.3nexgen.com` (Cloudflare edge) | HTTP endpoints |
| VPS (customer) | `161.97.82.155` (Contabo Singapore) | SSH as `deploy` user |
| Pi5 (deployer) | `192.168.1.30` (home LAN) | SSH as `jacky999` |

---

## 1. CF Worker API — All Endpoints

Base URL: `https://api.3nexgen.com`

### Authentication

Three auth methods depending on endpoint:

| Header | Secret Name | Used By |
|--------|-------------|---------|
| `X-API-Key: <key>` | `CONFIRM_API_KEY` | Admin endpoints (usage, confirm) |
| `X-Worker-Token: <token>` | `WORKER_TOKEN` | Pi5 worker (jobs, health, VPS) |
| `Authorization: Bearer <gateway_token>` | Per-client token in D1 | Customer VPS (AI proxy) |

### Admin Endpoints (require `X-API-Key`)

```bash
# List all customer usage records
curl -s -H "X-API-Key: $CONFIRM_API_KEY" https://api.3nexgen.com/api/usage

# Get single customer usage (tokens, spend, budget)
curl -s -H "X-API-Key: $CONFIRM_API_KEY" https://api.3nexgen.com/api/usage/$CUSTOMER_ID

# Update budget for one customer
curl -s -X PATCH -H "X-API-Key: $CONFIRM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"monthly_budget_hkd": 20.0}' \
  https://api.3nexgen.com/api/usage/$CUSTOMER_ID

# Bulk update budget by tier
curl -s -X POST -H "X-API-Key: $CONFIRM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tier": 2, "monthly_budget_hkd": 16.0}' \
  https://api.3nexgen.com/api/usage/budgets

# Reset customer monthly spend to 0
curl -s -X POST -H "X-API-Key: $CONFIRM_API_KEY" \
  https://api.3nexgen.com/api/usage/$CUSTOMER_ID/reset

# Revoke customer token (blocks all API access)
curl -s -X POST -H "X-API-Key: $CONFIRM_API_KEY" \
  https://api.3nexgen.com/api/usage/$CUSTOMER_ID/revoke

# Rotate customer token (new token, old one stops working)
curl -s -X POST -H "X-API-Key: $CONFIRM_API_KEY" \
  https://api.3nexgen.com/api/usage/$CUSTOMER_ID/rotate

# Create new usage record (usually called by Pi5 deployer)
curl -s -X POST -H "X-API-Key: $CONFIRM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "T001", "gateway_token": "abc123...", "tier": 2}' \
  https://api.3nexgen.com/api/usage

# Confirm order manually (creates job in D1)
curl -s -X POST -H "X-API-Key: $CONFIRM_API_KEY" \
  https://api.3nexgen.com/api/confirm/$ORDER_ID
```

### Worker Endpoints (require `X-Worker-Token`)

```bash
# Pi5 polls for next pending job
curl -s -H "X-Worker-Token: $WORKER_TOKEN" \
  https://api.3nexgen.com/api/jobs/next

# Update job status
curl -s -X PATCH -H "X-Worker-Token: $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "complete", "server_ip": "161.97.82.155"}' \
  https://api.3nexgen.com/api/jobs/$JOB_ID

# Pi5 health ping
curl -s -X POST -H "X-Worker-Token: $WORKER_TOKEN" \
  https://api.3nexgen.com/api/health

# List VPS instances
curl -s -H "X-Worker-Token: $WORKER_TOKEN" \
  "https://api.3nexgen.com/api/vps?status=active"

# Get recyclable VPS
curl -s -H "X-Worker-Token: $WORKER_TOKEN" \
  https://api.3nexgen.com/api/vps/recyclable

# Create VPS record
curl -s -X POST -H "X-Worker-Token: $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vps_id": "abc", "contabo_ip": "1.2.3.4", "customer_id": "T001", "status": "active", "tier": 2}' \
  https://api.3nexgen.com/api/vps

# Update VPS record
curl -s -X PATCH -H "X-Worker-Token: $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "cancelling"}' \
  https://api.3nexgen.com/api/vps/$VPS_ID
```

### Public Endpoints (no auth)

```bash
# Submit order (from website checkout)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"display_name": "Test", "email": "test@test.com", "tier": 2, "telegram_user_id": "123", "bot_token": "xxx", "bot_username": "test_bot"}' \
  https://api.3nexgen.com/api/orders

# Lemon Squeezy webhook (HMAC-verified)
POST https://api.3nexgen.com/api/webhook/lemonsqueezy
```

### AI Proxy Endpoints (require Bearer gateway_token)

```bash
# DeepSeek chat (used by OpenClaw for conversations)
curl -s -X POST -H "Authorization: Bearer $GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "deepseek-chat", "messages": [{"role": "user", "content": "hello"}]}' \
  https://api.3nexgen.com/api/ai/deepseek/chat/completions

# OpenAI embeddings (used by Mem0 for vector memory)
curl -s -X POST -H "Authorization: Bearer $GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "text-embedding-3-small", "input": "test text"}' \
  https://api.3nexgen.com/api/ai/openai/embeddings
```

---

## 2. Usage Data — What D1 Tracks

The `api_usage` table has one row per customer:

| Field | Type | Description |
|-------|------|-------------|
| `customer_id` | TEXT | e.g., "T001", "J1043" |
| `gateway_token` | TEXT | 64-char hex (masked in API responses) |
| `tier` | INT | 1, 2, or 3 |
| `monthly_budget_hkd` | REAL | NULL = no limit |
| `current_month` | TEXT | "2026-03" — auto-resets on new month |
| `current_spend_hkd` | REAL | Running total for current month |
| `total_requests` | INT | All-time request count |
| `total_tokens_in` | INT | All-time input tokens |
| `total_tokens_out` | INT | All-time output tokens |
| `warned_at` | TEXT | Set when spend hits 90% of budget |
| `blocked_at` | TEXT | Set when spend hits 100% of budget |

### Cost Calculation Formula

```
cost_hkd = (tokens_in × input_rate + tokens_out × output_rate) × USD_TO_HKD

Where:
  DeepSeek: input_rate = $0.000001/token, output_rate = $0.000002/token
  OpenAI:   input_rate = $0.00000002/token, output_rate = $0/token (embed only)
  USD_TO_HKD = 7.8
```

### Cross-Checking with Provider Dashboards

D1 tracks cost based on token counts reported in API responses. To verify accuracy:

1. Query D1: `GET /api/usage/$CUSTOMER_ID` → note `total_tokens_in`, `total_tokens_out`, `current_spend_hkd`
2. Check DeepSeek dashboard: total tokens consumed and USD spend
3. Check OpenAI dashboard: total tokens consumed and USD spend
4. D1 spend (converted to USD) should approximately match dashboard totals

**Note:** D1 tracks DeepSeek and OpenAI combined in one record per customer. Dashboards show them separately. A single Mem0-enabled chat message generates:
- 1× DeepSeek chat call (conversation)
- 1× OpenAI embedding call (memory recall)
- 1× DeepSeek chat call (Mem0 LLM fact extraction)

So 1 user message = 2-3 API requests in the dashboards.

---

## 3. SSH Access

### VPS (Customer Server)

```bash
# SSH key: ~/.ssh/nexgen_automation (on Pi5) or configured in openclaw_install/.env
ssh -o StrictHostKeyChecking=no -i ~/.ssh/nexgen_automation deploy@161.97.82.155

# Check OpenClaw gateway status
ssh deploy@161.97.82.155 "export XDG_RUNTIME_DIR=/run/user/\$(id -u) && export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/\$(id -u)/bus && systemctl --user status openclaw-gateway.service"

# Check all services
ssh deploy@161.97.82.155 "export XDG_RUNTIME_DIR=/run/user/\$(id -u) && export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/\$(id -u)/bus && systemctl --user list-units --type=service --state=running"

# Check Docker containers (Qdrant, SearXNG)
ssh deploy@161.97.82.155 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Read gateway logs
ssh deploy@161.97.82.155 "export XDG_RUNTIME_DIR=/run/user/\$(id -u) && export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/\$(id -u)/bus && journalctl --user -u openclaw-gateway.service --no-pager -n 50"

# Check env file (gateway tokens, proxy URLs)
ssh deploy@161.97.82.155 "cat ~/.openclaw/env"

# Check openclaw.json config
ssh deploy@161.97.82.155 "cat ~/.openclaw/openclaw.json | python3 -m json.tool"
```

### Pi5 (Deployer)

```bash
ssh jacky999@192.168.1.30

# Check nexgen worker service
ssh jacky999@192.168.1.30 "export XDG_RUNTIME_DIR=/run/user/1000 && export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus && systemctl --user status nexgen-worker.service"

# Read worker env (contains WORKER_TOKEN, CONFIRM_API_KEY, etc.)
ssh jacky999@192.168.1.30 "cat ~/nexgen-worker/.env"

# Check Claude auth (required for Agent SDK)
ssh jacky999@192.168.1.30 "ls -la ~/.claude/"
```

---

## 4. Wrangler (CF Worker Management)

Run from the Windows PC in `onboarding-pipeline/cf-worker/`:

```bash
cd onboarding-pipeline/cf-worker

# Deploy code changes
npx wrangler deploy

# Set/update secrets
echo "your-secret-value" | npx wrangler secret put SECRET_NAME

# List secrets (names only, not values)
npx wrangler secret list

# Query D1 directly
npx wrangler d1 execute nexgen-jobs --command "SELECT * FROM api_usage"
npx wrangler d1 execute nexgen-jobs --command "SELECT customer_id, current_spend_hkd, total_requests, total_tokens_in, total_tokens_out FROM api_usage"

# Tail live Worker logs
npx wrangler tail
```

### Current Secrets (set via wrangler)

| Secret | Purpose |
|--------|---------|
| `DEEPSEEK_API_KEY` | Real DeepSeek key (proxied to customers) |
| `OPENAI_API_KEY` | Real OpenAI key (proxied for Mem0 embeddings) |
| `WORKER_TOKEN` | Pi5 authenticates with this |
| `CONFIRM_API_KEY` | Admin operations (usage management, order confirm) |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | HMAC verification for payment webhooks |
| `OWNER_TELEGRAM_BOT_TOKEN` | Owner notification bot |

---

## 5. Common Operations

### Check API cost after test messages

```bash
# Option A: Via admin API (from any machine with CONFIRM_API_KEY)
curl -s -H "X-API-Key: $CONFIRM_API_KEY" https://api.3nexgen.com/api/usage | python3 -m json.tool

# Option B: Via wrangler D1 direct query (from Windows PC)
cd onboarding-pipeline/cf-worker
npx wrangler d1 execute nexgen-jobs --command "SELECT customer_id, current_spend_hkd, total_requests, total_tokens_in, total_tokens_out FROM api_usage"
```

### Register a new test customer gateway token

```bash
curl -s -X POST -H "X-API-Key: $CONFIRM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "TEST001", "gateway_token": "PASTE_64_CHAR_HEX_HERE", "tier": 2}' \
  https://api.3nexgen.com/api/usage
```

### Reset a customer's monthly spend (e.g., after testing)

```bash
curl -s -X POST -H "X-API-Key: $CONFIRM_API_KEY" \
  https://api.3nexgen.com/api/usage/TEST001/reset
```

### Verify proxy is working (manual test)

```bash
# Send a test chat request through proxy
curl -s -X POST -H "Authorization: Bearer $GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "deepseek-chat", "messages": [{"role": "user", "content": "say hi"}]}' \
  https://api.3nexgen.com/api/ai/deepseek/chat/completions
```

### Deploy updated CF Worker code

```bash
cd onboarding-pipeline/cf-worker
npx wrangler deploy
```

---

## 6. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Proxy returns 401 | Invalid gateway token | Check token matches D1 record: `GET /api/usage` |
| Proxy returns 429 | Budget exceeded | Reset: `POST /api/usage/$ID/reset` |
| Usage shows 0 tokens but request succeeded | Provider response had no `usage` field | Check if streaming mode is on (streaming doesn't return usage) |
| D1 cost doesn't match provider dashboard | Rate mismatch in wrangler.toml | Compare `DEEPSEEK_INPUT_RATE` with actual DeepSeek pricing |
| VPS bot not responding | Gateway service down | SSH to VPS, check `systemctl --user status openclaw-gateway.service` |
| Mem0 404 error | Missing /v1 in base URL | Verify `openclaw.json` has `baseURL` ending in `/deepseek` or `/openai` (proxy adds `/v1` upstream) |
| Admin endpoint returns 401 | Wrong API key header | Use `X-API-Key` header with `CONFIRM_API_KEY` value |
| Pi5 worker endpoint returns 401 | Wrong worker token | Use `X-Worker-Token` header with `WORKER_TOKEN` value |
