# NexGen — 項目狀態

> **最後更新：** 2026-03-30
> **階段：** Phase 0 → Phase 1 過渡中（技術基建已驗證，準備 soft launch）

---

## 已完成項目

### 業務規劃 ✅ 100%
- [x] 14-section 商業計劃 v1 完成（所有 section confirmed）
- [x] 三層 Decoy Effect 定價（新手上路 $148/月 → 智能管家 $248/月 → 全能大師 $388/月）
- [x] API 定價研究（7 個 provider，HK 可用性分析）
- [x] 法律分析完成（HK 限制地區 — DeepSeek 直接可用，Azure OpenAI 為合規 GPT 通道）
- [x] 安裝自動化策略決定（Option C: Hybrid — 80% bash + 20% Claude Agent SDK）

### 客戶 Onboarding Pipeline ✅ 95%
- [x] CF Worker API gateway 部署到 `api.3nexgen.com`（19 個 endpoints）
- [x] Per-client gateway tokens（64-char hex，D1 `api_usage` table 追蹤）
- [x] Proxy-only 架構 — **零真實 API key 在客戶 VPS 上**
- [x] AI cost tracking per-client（HKD，monthly budget enforcement：90% warn，100% block）
- [x] 3 個 API streams 全部經 proxy：DeepSeek chat + OpenAI embeddings + Mem0 LLM extraction
- [x] Pi5 worker Python modules（deployer, api_client, notifier, playbook, worker, vps_lifecycle, backup, restore）
- [x] 35 tests 全部通過（Windows + Pi5 ARM64）
- [x] Claude Agent SDK 驗證（CLI v2.1.85，OAuth token via Max plan）
- [x] E2E pipeline test（Job T1043，Tier 2，Hetzner VPS — 到 Phase 3 timeout 前核心 stack 已運行）
- [x] Contabo provisioning scripts（create, cancel, revoke, reinstall, destroy）
- [x] 8 admin usage endpoints（list, get, update, bulk budgets, reset, revoke, rotate, create）
- [x] Gateway token generation in deployer（_generate_gateway_token, _register_gateway_token）
- [x] Bot management 改為 customer-provided（客戶自己建 Telegram bot，簡化流程）
- [x] 11 個 E2E bugs 修復（SDK package name, rate_limit_event patch, systemd config, SSH path 等）
- [x] proxy.ts bug fix — OpenAI `/v1` path missing（Mem0 "404 no body" root cause）
- [x] 10-configure-env.sh — vectorStore `dimension` key fix（was `embeddingModelDims`）

### VPS 安裝系統 ✅ 100%
- [x] 14 個 modular install scripts（00-swap 到 13-clawteam）
- [x] 5-layer QA suite（health, ports, API, Telegram, full integration — 28 checks）
- [x] Discovery run 完成（1 小時，12 issues found + fixed）
- [x] CLAUDE.md installer playbook（完整部署指南 + troubleshooting table）
- [x] T001 + T002 test deployments on Hetzner

### 基礎設施 ✅
- [x] Domain `3nexgen.com` 買咗（Cloudflare）
- [x] CF Worker 部署 + D1 database
- [x] Pi5 as deployment orchestrator（systemd service ready，未 enable）
- [x] PC-side backup script（rsync→scp rewrite for Windows Git Bash compat）

### 客戶 Onboarding 內容 ✅
- [x] 客人交付 Telegram message template（香港書面語，onboarding-pipeline/templates/delivery-message.md）
- [x] Telegram FAQ Knowledge Base（21 Q&A，marketing/telegram-faq.md）
- [x] Website missing checklist 更新（actionable steps + execution order）
- [x] Agent briefing docs（docs/agent-briefs/ — 3 files for AI agent onboarding）
- [x] E2E test script: VPS recycling（tests/test_e2e_vps_lifecycle.py）
- [x] E2E test script: Backup/restore（tests/test_e2e_backup_restore.py）
- [x] Pi5 monitoring dashboard script（dashboard.sh + cron setup guide）
- [x] OG image SVG（website-lovable/public/og-image.svg）
- [x] Privacy diagram SVG（website-lovable/public/privacy-diagram.svg）

### 網站 🔄 70%
- [x] Lovable website 初版建好（React + Vite + Tailwind + shadcn/ui）
- [x] 14 次設計 iteration（01-13 series + E/F variants）
- [x] 設計方向確定（Contabo-inspired dark mode, crab theme）
- [x] Copy voice 確定（13-prompt-F2-copy-rewrite.md）
- [ ] Final Lovable build with latest copy
- [ ] Deploy to Cloudflare Pages

---

## 剩餘工作（Remaining Tasks）

### 🔴 Critical — Before First Customer

| # | Task | Category | Status | Notes |
|---|------|----------|--------|-------|
| 1 | ~~Contabo 首單手動下單~~ | VPS | ✅ | 已買，161.97.82.155 (deploy test VPS) + 另一台 |
| 2 | Contabo API credentials 更新到 Pi5 `.env` | VPS | 未開始 | 目前係 placeholder |
| 3 | VPS E2E Mem0 capture 測試 | Pipeline | Ready | 161.97.82.155 available for testing |
| 4 | ~~Update deployer.py — remove real key injection~~ | Code | ✅ | gateway_token only, no os.environ real keys |
| 5 | Website final build + deploy | Website | 未開始 | Lovable → Cloudflare Pages（先 deploy 現有版本？）|
| 6 | Payment integration（Lemon Squeezy） | Payment | 🔄 | Account created，需要 website URL 先完成 setup |

### 🟡 Important — Before Soft Launch

| # | Task | Category | Status | Notes |
|---|------|----------|--------|-------|
| 7 | ~~VPS recycling pool E2E test~~ | Pipeline | ✅ | test_e2e_vps_lifecycle.py ready to run on Pi5 |
| 8 | ~~Backup/restore E2E test~~ | Pipeline | ✅ | test_e2e_backup_restore.py ready to run on Pi5 |
| 9 | ~~Pin Qdrant Docker image to v1.14.0~~ | Scripts | ✅ | qdrant/qdrant:v1.14.0 in 05-setup-qdrant.sh |
| 10 | ~~Telegram 客服 bot + Knowledge Base~~ | Customer | ✅ | marketing/telegram-faq.md (21 Q&A pairs) |
| 11 | 商業登記 | Legal | 未開始 | HK business registration |
| 12 | ~~客人交付 message template~~ | Onboarding | ✅ | onboarding-pipeline/templates/delivery-message.md |
| 13 | ~~Monitoring dashboard（Pi5）~~ | Ops | ✅ | dashboard.sh + dashboard-cron-setup.md |

### 🟢 Phase 1 — Growth

| # | Task | Category | Status | Notes |
|---|------|----------|--------|-------|
| 14 | IG business account + Threads | Marketing | 未開始 | |
| 15 | 10 個 Reels 內容 | Marketing | 未開始 | |
| 16 | Telegram Group "OpenClaw HK" | Marketing | 未開始 | |
| 17 | LIHKG 推廣帖 | Marketing | 未開始 | |
| 18 | WhatsApp Business 接入研究 | Customer | 未開始 | |
| 19 | SDK patch review（claude-code-sdk updates past v0.0.25）| Maintenance | 待觀察 | rate_limit_event patch 可能不再需要 |
| 20 | Clean up D1 test data（T_E2E_PROXY test spend） | Cleanup | 低優先 | |

---

## 技術架構摘要（Current State）

### Proxy-Only Architecture（已驗證 ✅）
```
Customer VPS (零 real API keys)
    ↓ Bearer gateway_token
CF Worker @ api.3nexgen.com
    ├── Auth: D1 token lookup → customer_id
    ├── Cost: Calculate HKD, update D1
    ├── Budget: 90% warn header, 100% block
    └── Forward with real API key (Worker secrets)
         ├── /api/ai/deepseek/* → api.deepseek.com/v1/*
         └── /api/ai/openai/*   → api.openai.com/v1/*
```

### 3 API Streams（全部經 proxy）
| Stream | Provider | Purpose | VPS Sends |
|--------|----------|---------|-----------|
| Chat | DeepSeek | OpenClaw 對話 | gateway_token as DEEPSEEK_API_KEY |
| Embeddings | OpenAI | Mem0 vector memory | gateway_token as apiKey |
| LLM Extract | DeepSeek (via OpenAI client) | Mem0 fact extraction | gateway_token as apiKey |

### Deployment Pipeline
```
Lemon Squeezy webhook → CF Worker /api/confirm → D1 job queue
    ↓ (Pi5 polls every 30s)
Pi5 Worker → Contabo API provision → Agent SDK deploy → QA gates → deliver
```

---

## 項目文件索引（Updated）

```
openclaw_setup_business/
├── active.md                           ← 你而家睇緊嘅嘢
├── CLAUDE.md                           ← Master AI guidance
│
├── business/                           ← 商業策略
│   ├── openclaw-setup-business-plan-v1.md  ← 主 plan（14 sections）
│   ├── installation-automation-strategy.md ← 安裝自動化策略（Option C: Hybrid）
│   ├── api-pricing-research-2026-03.md     ← API 定價研究（7 providers）
│   ├── pricing-analysis.md                 ← 成本分析 + tier margins
│   ├── todo-master.md                      ← 原始 48 tasks（部分已完成）
│   └── archive/                            ← 已過時文件
│
├── docs/superpowers/
│   ├── plans/                              ← Implementation plans
│   │   ├── 2026-03-26-plan-b-pi5-worker.md     ← Plan B MAIN（已實現）
│   │   ├── 2026-03-27-plan-pipeline-v2.md       ← Pipeline v2 refinements
│   │   ├── 2026-03-28-plan-per-client-api-gateway.md ← API gateway（已實現）
│   │   └── archive/                              ← Plan A（已過時）
│   └── specs/                              ← Design specs
│       ├── 2026-03-26-customer-onboarding-pipeline-design.md
│       ├── 2026-03-27-contabo-vps-billing-strategy-design.md
│       ├── 2026-03-27-customer-backup-strategy-design.md
│       ├── 2026-03-27-pipeline-v2-bot-and-recycling-design.md
│       ├── 2026-03-28-per-client-api-gateway-design.md
│       └── archive/
│
├── legal/
│   └── legal-analysis-hk-ai-reseller.md    ← CRITICAL: HK 限制 + 合規通道
│
├── onboarding-pipeline/                    ← Customer onboarding automation
│   ├── cf-worker/                          ← CF Worker（TypeScript，已部署）
│   ├── pi5-worker/                         ← Pi5 Python worker（已部署，未 enable）
│   ├── plan-b-implementation-report.md     ← Implementation status
│   ├── contabo-api-guide.md                ← Contabo API reference
│   └── telegram-bot-creation/              ← Bot setup guide
│
├── openclaw_install/                       ← VPS installation system
│   ├── scripts/                            ← 14 install scripts (00-13)
│   ├── qa/                                 ← 5-layer QA suite (28 checks)
│   ├── provision/                          ← Contabo provisioning scripts
│   ├── discovery/                          ← E2E run documentation (12 issues)
│   └── clients/T001, T002/                 ← Test deployment records
│
├── Pi5/
│   └── Pi5_remote_management.md            ← Pi5 SSH + ops guide
│
├── technical/
│   ├── guides/openclaw-stack-reference.md  ← Full stack technical reference
│   └── inventory/pi5-setup-inventory.md    ← Hardware + software BOM
│
├── website-lovable/                        ← Website（React + Vite + Tailwind）
│   ├── 00-knowledge-file.md                ← Lovable knowledge base
│   ├── 05-build-strategy.md                ← Lovable workflow guide
│   ├── 08-13-prompt-*.md                   ← Current design iterations
│   ├── src/                                ← Website source code
│   └── archive/                            ← Outdated v1 prompts
│
├── scripts/
│   └── nexgen-backup-pull.sh               ← PC → Pi5 backup sync
│
└── marketing/templates/                    ← 待建
```

---

## 關鍵數字

| 指標 | 數值 |
|------|------|
| Plan sections | 14（全部 confirmed） |
| Pipeline tests | 35（全部 passing） |
| Install scripts | 14（00-13） |
| QA checks | 28（5 layers） |
| E2E bugs fixed | 11（pipeline）+ 12（installer） |
| CF Worker endpoints | 19 |
| Admin usage endpoints | 8 |
| Website design iterations | 14 |
| Critical remaining tasks | 3（Contabo creds, website deploy, payment setup） |
| Startup cost | ~HK$300-400 |
| 目標：第一個客 | Phase 1（pending website + payment） |
