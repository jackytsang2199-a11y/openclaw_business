# ClawHK 蟹助手 — Master Todo List

> **最後更新：** 2026-03-28
> **來源：** [openclaw-setup-business-plan-v1.md](openclaw-setup-business-plan-v1.md) 各 section + 實際開發進度
> **排序：** 按 Phase → 按優先度
> **狀態追蹤：** ✅ = done, 🔄 = in progress / partial, ⏸️ = deferred, ❌ = cancelled/replaced

---

## Phase 0: 準備（原計 Week 1-2，實際 Mar 13 → Mar 28）

### 🔥 最高優先

| # | 任務 | 類別 | 狀態 | Notes |
|---|------|------|------|-------|
| 1 | 開 DeepSeek 官方 API account | API | ✅ | 已開，key 存在 CF Worker secrets |
| 2 | 測試 DeepSeek V3 + R1 實際 per-message 成本 | API | ✅ | 已測，cost tracking 在 D1 per-client |
| 3 | 開 Contabo account + provision 測試 VPS | VPS | ✅ | 已開，API credentials ready，首單未下（需 fraud verification） |
| 4 | ~~Setup LiteLLM proxy~~ → CF Worker AI proxy | 技術 | ✅ | ❌ LiteLLM replaced by custom CF Worker proxy at api.3nexgen.com |
| 5 | 寫 automated setup script（VPS 版本優先） | 技術 | ✅ | 14 scripts (00-13) + 5-layer QA + CLAUDE.md playbook |
| 6 | ~~測試 Tailscale auth key pre-authorize flow~~ | 技術 | ❌ | Tailscale dropped — direct SSH via deploy user + UFW |

### 高優先

| # | 任務 | 類別 | 狀態 | Notes |
|---|------|------|------|-------|
| 7 | ~~開 Qwen（阿里 DashScope）API account~~ | API | ❌ | Not needed — DeepSeek sufficient for all LLM tasks |
| 8 | ~~確認 VPN access Anthropic/OpenAI API 可行性~~ | API | ❌ | Not needed — OpenAI embeddings via proxy, no direct access |
| 9 | ~~實作 Smart Routing config（via LiteLLM）~~ | API | ❌ | LiteLLM dropped; single-provider per stream via CF Worker |
| 10 | 實測 Contabo Japan → 香港延遲 | VPS | ⏸️ | Deferred — using Contabo SIN (Singapore) first |
| 11 | 測試自動安裝 script 喺 VPS 上跑 | VPS | ✅ | E2E validated on Hetzner (T001/T002) + Contabo partial |
| 12 | Cloudflare 買 domain | Website | ✅ | 3nexgen.com bought |
| 13 | 起 static site（landing + pricing + FAQ） | Website | 🔄 | Lovable built, 14 iterations, not deployed yet |
| 14 | Deploy to Cloudflare Pages | Website | ⏳ | Pending final Lovable build |
| 15 | 開 Telegram Bot 做客服 | 客服 | ⏳ | |
| 16 | 寫 Knowledge Base（FAQ + pricing + troubleshooting） | 客服 | ⏳ | |
| 17 | 設定 notification → 你個人 Telegram | 客服 | ✅ | Owner notifications in Pi5 worker notifier.py |
| 18 | Research WhatsApp Business API + OpenClaw 接入 | 客服 | ⏳ | Phase 1 |
| 19 | ~~建 Google Sheet client tracker~~ | 客服 | ❌ | Replaced by D1 database in CF Worker |
| 20 | ~~製作 Tailscale 安裝圖文教學（Route C 用）~~ | Onboarding | ❌ | Tailscale dropped |
| 21 | 製作客人交付 message template | Onboarding | ⏳ | |
| 22 | ~~製作 Pi5 預裝 checklist（Route B 用）~~ | Onboarding | ❌ | Pi5 is deployer, not customer device |
| 23 | 開 IG business account | 推廣 | ⏳ | Phase 1 |
| 24 | 開 Threads account（同 IG 連結） | 推廣 | ⏳ | Phase 1 |
| 25 | 買初始 IG followers（500-1000） | 推廣 | ⏳ | Phase 1 |
| 26 | 準備 10 個 Reels 內容（腳本 + 素材） | 推廣 | ⏳ | Phase 1 |
| 27 | 開 Telegram Group "OpenClaw HK" | 推廣 | ⏳ | Phase 1 |

### 中優先

| # | 任務 | 類別 | 狀態 | Notes |
|---|------|------|------|-------|
| 28 | ~~開 Kimi（Moonshot）API account~~ | API | ❌ | Not needed |
| 29 | ~~研究 Azure OpenAI 作為 Layer 2 備選~~ | API | ⏸️ | Know it exists, not needed yet |
| 30 | ~~設計 BYOK setup 流程 + 文檔~~ | API | ❌ | Proxy-only model — no BYOK |
| 31 | ~~試搶 Oracle Cloud Always Free (Tokyo)~~ | VPS | ❌ | Using Contabo paid VPS |
| 32 | 研究 VPS security hardening baseline | VPS | ✅ | 09-security-hardening.sh: UFW + fail2ban + SSH hardening |
| 33 | ~~研究 OpenClaw → Google Sheet API 自動更新~~ | 客服 | ❌ | Replaced by D1 database |
| 34 | 製作基本用法指南（客人用） | Onboarding | ⏳ | |

---

## New Tasks (Added During Development, Mar 25-28)

| # | 任務 | 類別 | 狀態 | Notes |
|---|------|------|------|-------|
| N1 | CF Worker AI proxy + cost tracking | 技術 | ✅ | api.3nexgen.com — 19 endpoints, per-client HKD tracking |
| N2 | Per-client gateway token system | 技術 | ✅ | 64-char hex tokens, D1 api_usage table |
| N3 | Pi5 worker deployment pipeline | 技術 | ✅ | 10 Python modules, 35 tests, systemd service |
| N4 | Claude Agent SDK integration | 技術 | ✅ | Max plan OAuth, autonomous VPS deployment |
| N5 | Contabo provisioning scripts | 技術 | ✅ | create, cancel, revoke, reinstall, destroy |
| N6 | VPS recycling pool logic | 技術 | ✅ code, ⏳ test | Code complete, E2E test pending |
| N7 | Backup/restore system | 技術 | ✅ code, ⏳ test | Tier-aware, code complete, E2E test pending |
| N8 | Admin usage endpoints (8) | 技術 | ✅ | list, get, update, bulk, reset, revoke, rotate, create |
| N9 | Proxy-only architecture validation | 技術 | ✅ | 3 API streams via proxy, verified with curl |
| N10 | Mem0 "404 no body" proxy bug fix | Bug | ✅ | Missing /v1 in OpenAI base URL |
| N11 | Contabo first manual order | VPS | ⏳ | Clear fraud verification before API works |
| N12 | Lemon Squeezy → CF Worker webhook | Payment | ⏳ | Webhook → /api/confirm → D1 job |
| N13 | Update deployer.py — gateway token only | Code | ✅ | _build_client_env uses gateway_token, not os.environ |
| N14 | Pin Qdrant Docker to v1.14.0 | Scripts | ✅ | qdrant/qdrant:v1.14.0 in 05-setup-qdrant.sh |

---

## Phase 1: Soft Launch

| # | 任務 | 類別 | 狀態 | Notes |
|---|------|------|------|-------|
| 35 | 開 Lemon Squeezy account + 設定 Visa/MC checkout | Payment | ⏳ | |
| 36 | Lemon Squeezy 設定 recurring subscription plans（3 Tiers） | Payment | ⏳ | |
| 37 | Website pricing page embed checkout button | Website | ⏳ | |
| 38 | 接頭 3-5 個客（免費或半價，換 testimonial） | Sales | ⏳ | |
| 39 | LIHKG 開第一個話題帖 | 推廣 | ⏳ | |
| 40 | 收集 feedback，改善流程 | 營運 | ⏳ | |
| 41 | Landing page 上線後更新 IG bio link | 推廣 | ⏳ | |
| 42 | 宣傳素材設計 | 推廣 | ⏳ | |
| 43 | IG Reel / 廣告短片 design + 製作 | 推廣 | ⏳ | |

---

## Phase 2+: 正式推出 + Scale

| # | 任務 | 類別 | 狀態 |
|---|------|------|------|
| 44 | 正式定價上線 | Sales | ⏳ |
| 45 | IG 恆常 Reel（每週 2-3 條） | 推廣 | ⏳ |
| 46 | LIHKG 定期發 post | 推廣 | ⏳ |
| 47 | Referral program | 推廣 | ⏳ |
| 48 | 小紅書 account | 推廣 | ⏳ |
| 49 | Discord server | 客服 | ⏳ |
| 50 | YouTube 教學影片 | 推廣 | ⏳ |
| 51 | 商業登記（BR） | Legal | ⏳ |
| 52 | BR 後轉 Stripe（3.4% vs Lemon Squeezy 5%） | Payment | ⏳ |

---

## ⏸️ Deferred

| # | Topic | 依賴 |
|---|-------|------|
| D1 | **Pricing Fine-tune** | 需要更多客戶使用數據（D1 cost tracking 已 ready） |
| D2 | **Add-on / Topup 包裝** | API 成本 + 客戶使用數據 |

---

## 統計（Updated 2026-03-28）

| 狀態 | 數量 |
|------|------|
| ✅ Completed | 24 |
| ❌ Cancelled/Replaced | 12 |
| 🔄 In Progress | 1 |
| ⏳ Pending | 25 |
| ⏸️ Deferred | 3 |
| **Total** | **65** (original 53 + 14 new - 2 merged) |
