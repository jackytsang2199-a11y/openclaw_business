# ClawHK 蟹助手 — Master Todo List

> **最後更新：** 2026-03-16
> **來源：** [openclaw-setup-business-plan-v1.md](openclaw-setup-business-plan-v1.md) 各 section 嘅 Todo 整合
> **排序：** 按 Phase → 按優先度

---

## Phase 0: 準備（Week 1-2）

### 🔥 最高優先

| # | 任務 | 類別 | Plan Section |
|---|------|------|-------------|
| 1 | 開 DeepSeek 官方 API account | API | §4 |
| 2 | 測試 DeepSeek V3 + R1 實際 per-message 成本（確認全包月費 margin 足夠） | API | §4 |
| 3 | 開 Contabo account + provision 測試 VPS (Japan) | VPS | §3d |
| 4 | Setup LiteLLM proxy（API metering + smart routing + per-client tracking） | 技術 | §2/§4 |
| 5 | 寫 automated setup script（VPS 版本優先） | 技術 | §12 |
| 6 | 測試 Tailscale auth key pre-authorize flow | 技術 | §10 |

### 高優先

| # | 任務 | 類別 | Plan Section |
|---|------|------|-------------|
| 7 | 開 Qwen（阿里 DashScope）API account | API | §4 |
| 8 | 確認 VPN access Anthropic/OpenAI API 可行性 | API | §4 |
| 9 | 實作 Smart Routing config（via LiteLLM） | API | §4 |
| 10 | 實測 Contabo Japan → 香港延遲 | VPS | §3d |
| 11 | 測試自動安裝 script 喺 Contabo VPS 上跑 | VPS | §3d |
| 12 | Cloudflare 買 domain | Website | §7 |
| 13 | 起 static site（landing + pricing + FAQ） | Website | §7 |
| 14 | Deploy to Cloudflare Pages | Website | §7 |
| 15 | 開 Telegram Bot 做客服 | 客服 | §6 |
| 16 | 寫 Knowledge Base（FAQ + pricing + troubleshooting） | 客服 | §6 |
| 17 | 設定 notification → 你個人 Telegram | 客服 | §6 |
| 18 | Research WhatsApp Business API + OpenClaw 接入 | 客服 | §6 |
| 19 | 建 Google Sheet client tracker | 客服 | §6 |
| 20 | 製作 Tailscale 安裝圖文教學（Route C 用） | Onboarding | §10 |
| 21 | 製作客人交付 message template | Onboarding | §10 |
| 22 | 製作 Pi5 預裝 checklist（Route B 用） | Onboarding | §10 |
| 23 | 開 IG business account | 推廣 | §5 |
| 24 | 開 Threads account（同 IG 連結） | 推廣 | §5 |
| 25 | 買初始 IG followers（500-1000） | 推廣 | §5 |
| 26 | 準備 10 個 Reels 內容（腳本 + 素材） | 推廣 | §5 |
| 27 | 開 Telegram Group "OpenClaw HK" | 推廣 | §5 |

### 中優先

| # | 任務 | 類別 | Plan Section |
|---|------|------|-------------|
| 28 | 開 Kimi（Moonshot）API account | API | §4 |
| 29 | 研究 Azure OpenAI 作為 Layer 2 備選 | API | §4 |
| 30 | 設計 BYOK setup 流程 + 文檔 | API | §4 |
| 31 | 試搶 Oracle Cloud Always Free (Tokyo) | VPS | §3d |
| 32 | 研究 VPS security hardening baseline | VPS | §3d |
| 33 | 研究 OpenClaw → Google Sheet API 自動更新 | 客服 | §6 |
| 34 | 製作基本用法指南（客人用） | Onboarding | §10 |

---

## Phase 1: Soft Launch（Week 3-4）

| # | 任務 | 類別 | Plan Section |
|---|------|------|-------------|
| 35 | 開 Lemon Squeezy account + 設定 Visa/MC checkout（唔需 BR） | Payment | §8 |
| 36 | Lemon Squeezy 設定 recurring subscription plans（3 Tiers） | Payment | §8 |
| 37 | Website pricing page embed Lemon Squeezy checkout button | Website | §7/§8 |
| 38 | 接頭 3-5 個客（免費或半價，換 testimonial） | Sales | §12 |
| 39 | LIHKG 開第一個話題帖 | 推廣 | §5 |
| 40 | 收集 feedback，改善流程 | 營運 | §12 |
| 41 | Landing page 上線後更新 IG bio link | 推廣 | §5 |
| 42 | 宣傳素材設計（IG 廣告圖片/影片、LIHKG banner 等） | 推廣 | §7 |
| 43 | IG Reel / 廣告短片 design + 製作 | 推廣 | §7 |

---

## Phase 2: 正式推出（Week 5-8）

| # | 任務 | 類別 | Plan Section |
|---|------|------|-------------|
| 44 | 正式定價上線 | Sales | §12 |
| 45 | Landing page 加 pricing table + FAQ | Website | §12 |
| 46 | IG 開始恆常出 Reel（每週 2-3 條） | 推廣 | §12 |
| 47 | LIHKG 定期發 post / 回覆相關討論 | 推廣 | §12 |
| 48 | 推出 referral program | 推廣 | §12 |
| 49 | 小紅書 account 開設 | 推廣 | §5 |
| 50 | Setup Discord server | 客服 | §6 |

---

## Phase 3: Scale（Month 3+）

| # | 任務 | 類別 | Plan Section |
|---|------|------|-------------|
| 51 | YouTube 頻道 / 教學影片 | 推廣 | §12 |
| 52 | 考慮擴展服務（OpenClaw skill 開發、自訂 integration） | 產品 | §12 |
| 53 | 評估是否需要請人幫手 | 營運 | §12 |
| 54 | 計算 breakeven：幾多個 VPS 客先值得自動化 billing | VPS | §3d |
| 55 | 加入 Pi5 option（Phase 2+） | 產品 | §2 |
| 56 | 有 BR 後轉 Stripe（手續費 3.4% 比 Lemon Squeezy 5% 平） | Payment | §8 |

---

## ⏸️ Deferred（實測 API 成本後再 Fine-tune）

| # | Topic | 內容 | 依賴 |
|---|-------|------|------|
| D1 | **Pricing 數字 Fine-tune** | 實測 DeepSeek per-message 成本，確認全包月費 margin 足夠。見 [pricing-analysis.md](pricing-analysis.md) | DeepSeek 實測結果 |
| D2 | **Add-on / Topup 包裝** | 組件拆分定價 + OpenClaw Skills (2000+) | API 成本 + 客戶使用數據 |

---

## 統計

| 類別 | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Total |
|------|---------|---------|---------|---------|-------|
| API | 7 | — | — | — | 7 |
| 技術 | 3 | — | — | — | 3 |
| VPS | 4 | — | — | 1 | 5 |
| Website | 3 | 1 | 1 | — | 5 |
| 客服 | 5 | — | 1 | — | 6 |
| Onboarding | 4 | — | — | — | 4 |
| 推廣 | 5 | 4 | 4 | 1 | 14 |
| Payment | — | 2 | — | 1 | 3 |
| Sales / 營運 | — | 2 | 1 | 1 | 4 |
| 產品 | — | — | — | 2 | 2 |
| **Total** | **31** | **9** | **7** | **6** | **53** |
