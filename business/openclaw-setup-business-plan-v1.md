# OpenClaw Remote Setup Business — Plan v1

> **日期：** 2026-03-13
> **狀態：** Draft v1 — 待討論
> **Target Market：** 香港人（主要非技術用家）

---

## 1. 業務定位 (Positioning)

**名稱建議（暫定）：** ClawHK / 蟹助手 / OpenClaw 香港安裝服務

**核心賣點：**

- 香港唯一廣東話 OpenClaw 安裝服務
- 全程 AI remote 安裝，快速交付
- 非技術人都用到 — "你只需要識用 Telegram"
- 售後客服都係 AI（你自己嘅 OpenClaw），24/7 回覆
- **唔止裝 OpenClaw — 我哋裝嘅係一套完整 AI 生態系統**（見下方 "Custom Stack 賣點"）

**一句 pitch：**
> "擁有你自己嘅 AI 助手 — 記得你、幫到你、24/7 on call。唔使識 code，我哋幫你搞掂。"

### Custom Stack 賣點 — 比標準 OpenClaw 多好多

標準 OpenClaw 安裝只有基本 daemon + gateway + Telegram。**我哋嘅 setup 額外包含一整套 production-grade stack**，呢個係我哋最大嘅技術差異化：

| 組件 | 功能 | 對客人嘅價值（非技術語言） |
|---|---|---|
| **🧠 Mem0 OSS + Qdrant 向量資料庫** | 長期記憶系統 — 用語意搜尋從過去對話中提取相關記憶 | "佢真係記得你講過咩 — 你鍾意飲咩 coffee、你幾時要交 deadline、你之前問過咩" |
| **🔍 SearXNG 自架搜尋引擎** | 完全 self-hosted meta-search engine，聚合 Google/Bing/Reddit 等多個引擎 | "佢識上網搵嘢，而且唔使俾錢 API、冇 quota 限制、完全 private" |
| **🌐 Reddit AI Block Bypass** | SearXNG 透過搜尋引擎 cached 版本存取 Reddit，繞過 AI crawler block | "佢搵到 Reddit 嘅真實討論內容 — 其他 AI 做唔到呢樣" |
| **🛡️ Gateway Watchdog** | 每 60 秒自動檢查 Telegram API 健康，3 次失敗自動重啟 | "佢自己識 heal — 死機會自動復活，你唔使理" |
| **🌐 VPN Watchdog + Multi-server Fallback** | 每 30 秒檢查 VPN 連線，失敗自動切換 server (JP Tokyo / SG Singapore) | "永遠連得上 — 一個 VPN 死咗會自動切去第二個" |
| **🔒 WireGuard VPN** | 全部流量加密，多 server 備援 | "你嘅 AI 通訊全程加密，私隱受保護" |
| **🌐 Chromium Browser Control** | OpenClaw 可以控制 headless browser 做 web automation | "佢可以幫你上網做嘢 — 唔止傾偈，係真正幫你做 task" |
| **📊 LiteLLM API Proxy** | API 統一入口 — metering、smart routing、per-client tracking、多 model 管理 | "自動幫你揀最平最快嘅 AI model，用量一目了然" |
| **⚙️ Production Config** | LAN bind、auth token、concurrency tuning、context pruning、heartbeat | "企業級設定 — 穩定、安全、跑得快" |

> **點解呢個係核心賣點？**
> 自己裝 OpenClaw 好簡單（`npm install -g openclaw`），但要裝到有長期記憶、有自架搜尋、有自動修復、有 VPN 保護 — 呢個先係真正嘅 value。呢套 stack 一個非技術人自己搞可能要幾日甚至幾星期，我哋 30 分鐘搞掂。

### 競爭差異化

| | SetupClaw (外國) | OpenClaw Installer (免費) | 我哋 |
|---|---|---|---|
| Target | 外國 founders/exec | 技術人（自己裝） | 香港普通用家 |
| 語言 | English | English | 廣東話/中文 |
| 價格 | 高（white-glove） | 免費 | 中等 |
| API key | 客人自己搞 | 客人自己搞 | 我哋包（官方 + 中國 model 直接 API） |
| 售後 | 有 | 無 | AI 客服 24/7 |
| 硬件支援 | VPS only | VPS only | Pi5 + VPS 全包 |
| **Memory 系統** | ❌ 無 | ❌ 無 | ✅ Mem0 + Qdrant |
| **自架搜尋** | ❌ 無 | ❌ 無 | ✅ SearXNG（無限、免費、bypass AI block） |
| **Auto-recovery** | ❌ 無 | ❌ 無 | ✅ Gateway + VPN watchdog |
| **Browser automation** | ❌ 無 | ❌ 無 | ✅ Chromium headless |

**護城河：** 廣東話本地化 + AI 客服 demo + 多 model API 一站式管理 + 香港社群經營 + **自研 production stack（Mem0 + SearXNG + Watchdog + Browser）是最大技術護城河**

---

## 2. 服務 Tier（Pricing Strategy — Decoy Effect）

### 定價策略（已確認）

使用 **Decoy Effect（誘餌效應）**：
- **🌱 新手上路** — 故意功能少，做 decoy，令人覺得智能管家超值
- **⭐ 智能管家** — **主推，最賺錢**，功能夠用，價格 sweet spot
- **🚀 全能大師** — Anchor 高價，令智能管家顯得抵；同時服務真正高端客

> 詳細定價分析同成本計算見 **[pricing-analysis.md](pricing-analysis.md)**

### 收費結構（全包月費制 — 已確認）

**原則：安裝費（一次性）+ 全包月費（VPS + API + 維護全包）**

Phase 0-1 只 offer VPS。Pi5 option Phase 2+ 先加。

```
┌─────────────────────────────────────────────────┐
│           蟹助手收費結構（已確認）                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  一次性安裝費                                     │
│  ├── 🌱 新手上路：HK$400（開業半價 HK$200）       │
│  ├── ⭐ 智能管家：HK$800（開業半價 HK$400）       │
│  └── 🚀 全能大師：HK$1,800（開業半價 HK$900）    │
│                                                 │
│  全包月費（VPS + API + 維護 + VPN 全包）           │
│  ├── 🌱 新手上路：HK$148/月（年費 HK$1,508）     │
│  ├── ⭐ 智能管家：HK$248/月（年費 HK$2,528）     │
│  └── 🚀 全能大師：HK$388/月（年費 HK$3,958）     │
│                                                 │
│  🔥 開業優惠：頭 20 位安裝費半價（月費唔打折）      │
│                                                 │
│  API 成本極低（DeepSeek ~HK$2-10/月/客）          │
│  → 全包入月費，唔做充值制                          │
│  LiteLLM: API proxy + metering + smart routing  │
│  Embedding: Shared key，成本攤入月費              │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Margin 概覽（⭐ 智能管家為例）

| 項目 | 金額 |
|---|---|
| 月費 | HK$248 |
| 你嘅成本（VPS HK$53 + API ~HK$8 + VPN HK$3 + 維護 HK$5） | ~HK$67 |
| **月 Margin** | **HK$181（73%）** |
| 安裝費利潤（半價期） | HK$340 |
| **首年利潤/客（半價期）** | **HK$2,512** |

> API 成本極低係核心優勢 — DeepSeek V3.2 每條 message 只要 HK$0.003，一個客每月用 100 條/日都只要 HK$10 API 成本。VPS 佔總成本 70-80%。

#### 超額保護

- **每日 message 上限：** 新手上路 100 條 / 智能管家 300 條 / 全能大師 1,000 條
- **Soft limit：** 到達日上限時 AI 客服提醒
- **Hard cap：** 3x 日上限（防 scripted abuse）
- 正常用家永遠唔會到上限（平均每日 30-50 條）

### Tier 詳情

| | 🌱 新手上路 | ⭐ 智能管家 | 🚀 全能大師 |
|---|---|---|---|
| **目標** | 做 decoy / 入門 | **主推（最賺）** | 高端 / 懶人全包 |
| **安裝費（原價）** | HK$400 | HK$800 | HK$1,800 |
| **🔥 開業半價** | HK$200 | HK$400 | HK$900 |
| **月費（全包）** | HK$148/月 | HK$248/月 | HK$388/月 |
| **年費（85折）** | HK$1,508/年 | HK$2,528/年 | HK$3,958/年 |
| **平台** | VPS only | VPS（Phase 0-1）; Pi5 Phase 2+ | VPS（Phase 0-1）; Pi5 Phase 2+ |
| **AI Model** | DeepSeek only | DeepSeek + GPT-4.1-mini | DeepSeek + GPT-4.1 + Claude |
| **安裝方式** | AI 自動安裝 | AI 安裝 + 人手 QA 檢查 | AI 安裝 + 人手 QA + 個人化設定 |
| **Messaging 平台** | Telegram only | Telegram + WhatsApp | 全平台（Telegram、WhatsApp、Discord 等） |
| **🧠 Memory 系統** | ❌ 無 mem0（無記憶） | ✅ Mem0 + Qdrant（長期記憶） | ✅ Mem0 + Qdrant + 自訂 personality 檔案 |
| **🔍 搜尋能力** | ❌ 無 | ✅ SearXNG 自架搜尋（無限 + Reddit bypass） | ✅ SearXNG + 自訂搜尋引擎配置 |
| **🌐 Browser 控制** | ❌ 無 | ❌ 無 | ✅ Chromium headless（web automation） |
| **VPN + Watchdog** | ❌ 無 | ✅ Gateway watchdog | ✅ Gateway + VPN watchdog 全套 |
| **售後支援** | AI 客服 only | AI 客服 + 7 日人手支援 | AI 客服 + 30 日人手支援 |
| **每日 message 上限** | 100 條 | 300 條 | 1,000 條 |

> **Tier 設計邏輯：** 新手上路故意冇 memory 冇搜尋 — 即係個 AI 唔記得你講過咩、唔識上網搵嘢。用過之後會覺得好唔夠，自然升智能管家。全能大師加埋 browser automation + Claude/GPT-4.1 + 全平台，適合想要完整 AI agent 嘅客。

### 額外 Add-on（任何 Tier 都可以加購）

| Add-on | 價格 |
|---|---|
| 額外 messaging 平台接入 | HK$50/個 |
| Personality 自訂（SOUL.md） | HK$100 |
| Heartbeat 定時提醒設定 | HK$80 |
| Pi5 代購 + 寄送 | 硬件成本 + HK$150 手續費 |

> **📌 待 Fine-tune（實測 API 成本後）：**
> - Custom stack 各組件（Mem0、SearXNG、Watchdog、Browser 等）可以包裝成獨立 add-on
> - **OpenClaw Skills（GitHub 2000+ awesome skills）** 亦可以做 add-on 賣點
> - 具體拆分、定價、計量 plan 待實際 API 成本測試後再 fine-tune
> - API 充值嘅 markup 比例、HK$100 credit 實際可用條數待實測

---

## 3. 技術架構

### 3a. Remote 安裝工具

| 工具 | 用途 | 為何選它 |
|---|---|---|
| **Tailscale** | 建立 private network（入客人部機） | 免費、零 config NAT traversal、比 TeamViewer 安全 |
| **RustDesk**（備用） | GUI remote desktop（如需要） | 開源、免費、唔使經第三方 server |
| **SSH** | Pi5 / VPS 實際安裝 | 透過 Tailscale SSH 或 standard SSH |

> **為何唔用 TeamViewer：** 商業用途收費貴、data 經第三方 server、比 Tailscale 慢。
> **為何唔用 AnyDesk：** 之前有安全問題、商業限制多。

### 3b. AI 自動安裝流程

```
客人下單
  │
  ▼
客人裝 Tailscale（我哋出教學，1 分鐘搞掂）
  │
  ▼
我哋透過 Tailscale SSH 入客人部機
  │
  ▼
AI Agent 跑自動安裝 Script
  ├── System update
  ├── Fix kernel page size（Pi5 only）
  ├── Install Node.js
  ├── Install Docker
  ├── Install OpenClaw
  ├── Configure openclaw.json
  ├── Setup API keys（官方 API / BYOK）
  ├── Setup Qdrant（如有 mem0）
  ├── Setup mem0 plugin（如有）
  ├── Setup VPN（如有）
  ├── Setup systemd services
  ├── Setup watchdog scripts（如有）
  └── Auto-debug any errors
  │
  ▼
QA 測試（AI 或人手）
  ├── Send test message via Telegram
  ├── Check memory working
  ├── Check auto-recovery
  └── Verify all services running
  │
  ▼
交付 + 教客人基本用法
```

**預計安裝時間：**
- VPS: ~10-15 分鐘（全自動）
- Pi5: ~20-30 分鐘（需要 reboot for kernel fix）

### 3c. 支援平台（已確認）

**Phase 1 Launch（Pi5 + VPS）→ Phase 2 加 Mac Mini**

#### 平台比較

| 平台 | 成本 | 優點 | 缺點 | 適合邊類客 | Launch 階段 |
|---|---|---|---|---|---|
| **Raspberry Pi 5 8GB** | ~HK$700 板 + ~HK$200 配件 | 一次性成本、私隱好、電費平（~$5/月）、data 在自己手 | 要自己接線、要 VPN、hardware 可能壞 | 重視私隱、想長期用、geek | 🥇 Phase 1 |
| **VPS (Hetzner/Vultr)** | ~HK$28-48/月 | 無硬件 hassle、穩定、唔使 VPN | 月費、data 在雲端 | 唔想搞硬件、想快 | 🥇 Phase 1 |
| **Mac Mini M4** | ~HK$4,600+（客自己買） | 性能強、macOS 生態、低功耗 | 你要另寫 macOS script、需要 HDMI dummy plug | 已有 Mac Mini、Apple 用家、預算高 | 🥈 Phase 2 |

#### 每平台利潤分析

**Pi5（幫買硬件）— 最高一次性利潤：**

| 項目 | 你嘅成本 | 收客人 | Margin |
|---|---|---|---|
| Pi5 8GB 板 | ~HK$700 | ~HK$850 | +HK$150 |
| 配件（case + PSU + NVMe + SD） | ~HK$250 | ~HK$400 | +HK$150 |
| 安裝費（Tier 2） | ~HK$50 時間 | HK$500 | +HK$450 |
| **Total** | **~HK$1,000** | **~HK$1,750** | **+HK$750** |

**VPS（你代開 + 月費制）— 最 Scalable：**

| 項目 | 你嘅成本 | 收客人 | Margin |
|---|---|---|---|
| 安裝費（Tier 2） | ~HK$30 時間 | HK$500 | +HK$470 |
| 月費（VPS + API 打包） | ~HK$43-58/月 | HK$80-120/月 | +HK$37-62/月 |

**Mac Mini（客自備硬件）— 純服務費：**

| 項目 | 你嘅成本 | 收客人 | Margin |
|---|---|---|---|
| 安裝費 | ~HK$30 時間 | HK$600-800（macOS 複雜啲） | +HK$570-770 |
| 月費 API | 同其他平台 | 同上 | 同上 |

#### 安裝自動化策略（已確認）

> **決定：混合方案 — Modular Scripts + Claude Code AI QA**
>
> 詳見獨立文檔：**[installation-automation-strategy.md](installation-automation-strategy.md)**

**核心概念：**
- **Modular Scripts** 做 80% 常規步驟（快、一致、idempotent）
- **Claude Code SSH** 做 QA check、test、debug（靈活、識 adapt）
- **CLAUDE.md Playbook** = AI 裝機員培訓手冊，越用越強
- 項目結構：`openclaw-installer/`（scripts/ + configs/ + qa/ + guides/）

**工作流：** 你開 VSCode → 一句指令 → Claude Code 跟 playbook 自動做 → 你 review report → 交付

**演進路線：**
| 階段 | 方法 | 你嘅時間/客 |
|------|------|-------------|
| Launch (0-15 客) | VSCode + Claude Code + Playbook | ~15-25min |
| Scale (15-30 客) | Claude Code CLI headless（可並行） | ~10-15min |
| Mature (30+ 客) | Claude Agent SDK / dashboard | ~2-5min |

#### 平台 Script 開發計劃

| | Pi5 (Linux) | VPS (Linux) | Mac Mini (macOS) |
|---|---|---|---|
| **OS** | Raspberry Pi OS (Debian) | Ubuntu 24.04 | macOS Sequoia |
| **Package manager** | apt | apt | brew |
| **Service manager** | systemd | systemd | launchd（要重寫） |
| **Docker** | Native Linux | Native Linux | Docker Desktop（較慢） |
| **Script 共用度** | ✅ 基礎 | ✅ 同 Pi5 大部分共用 | ❌ 要另寫 |
| **你嘅經驗** | ✅ 已有 | ❌ 未試（但應該唔難） | ❌ 未試 |
| **開發優先度** | 🥇 已有 | 🥇 小改動 | 🥈 Phase 2 |

### 3d. VPS 代開管理方案 ⚠️ 重要

> **決定：** 你代開 VPS account，收月費/年費，預繳制，唔交就停服務。

#### VPS Provider 選擇（已確認）

| | **Contabo** 🏆 主推 | **Hostinger** 備選 | **Hetzner EU** 最平 fallback |
|---|---|---|---|
| **推薦 plan** | VPS 10: **~US$6.80/月** (4vCPU, 8GB, 75GB NVMe, 無限流量) | KVM 2: **US$6.99/月** (2vCPU, 8GB, 100GB NVMe, 8TB) | CX33: **~US$6.59/月** (4vCPU, 8GB, 80GB, 20TB) |
| **HK$** | **~HK$53/月** | **~HK$55/月** | **~HK$51/月** |
| **亞洲 datacenter** | Japan (Tokyo) + Singapore | Singapore | ❌ 無（EU only） |
| **香港延遲** | Tokyo ~45ms / SG ~35ms | SG ~35ms | ~200ms（可接受，見下方） |
| **流量** | 無限（200Mbit/s） | 8TB（1Gbps） | 20TB（1Gbps） |
| **性價比** | 🏆 最高（8GB 只要 US$6.80） | 好（SG + 大 storage） | 極高（但延遲 trade-off） |

**決定：Contabo Japan 為主推（8GB/US$6.80 性價比最高），Hostinger Singapore 備選。**

> **點解唔用 Hetzner Singapore？** Hetzner SG 嘅 8GB plan 要 ~US$29/月（HK$226），係 Contabo 嘅 4 倍。同樣 8GB RAM，Contabo Japan 只要 US$6.80。
>
> **200ms EU 延遲得唔得？** 得。AI API response 本身要 1-10 秒，多 300ms relay 只係 ~10% 差異。Telegram server 本身喺 SG/Amsterdam，唔係直連 HK。但 Contabo Japan 同價已有 ~45ms，無理由用 EU。
>
> **免費選項：Oracle Cloud Always Free**（4 OCPU ARM / 24GB RAM / Tokyo）— 值得試搶，搶到就係白賺。但長期 out of capacity，唔好靠佢做 primary。

#### VPS 成本（攤入全包月費）

| | 你嘅成本 | 備註 |
|---|---|---|
| **Contabo VPS 10** | ~HK$53/月 | 佔全包月費 HK$248 嘅 ~21% |
| **年付 Contabo** | ~HK$636/年 | 可能有年付折扣 |

> VPS 成本已攤入全包月費（見 §2 收費結構）。客人唔需要知道 VPS 獨立成本。

#### 收費同斷線流程

```
每月 25 號 — AI 客服自動 send Telegram 帳單
  │
  ├─ 客人交錢 → 繼續服務 ✅
  │
  ├─ 28 號未交 → AI 客服 send 提醒
  │
  ├─ 1 號未交 → Shutdown VPS（data 仲在）
  │   └── "你嘅 AI 助手已暫停，交費即恢復"
  │
  └─ 8 號未交 → Delete VPS + data
      └── "Data 已刪除，如需重新開始請聯絡我哋"
```

#### VPS 風險同應對 ⚠️

| 風險 | 嚴重性 | 應對 |
|---|---|---|
| Contabo 無正式 reseller program，你負全責 | 高 | 每 15-20 個 VPS 開新 account 分散風險 |
| 客人 VPS 被 hack 牽連你 account | 高 | Setup 時做 security hardening（firewall、fail2ban、SSH key only） |
| 一個 account 太多 VPS 被 flag | 中 | 分散 account |
| 你信用卡扣費失敗 | 中 | 設多張信用卡 backup + billing alert |
| 客人走數 | 中 | **預繳制** — 永遠先收錢再 provision |
| Data privacy 責任 | 中 | 私隱政策寫清楚 + separate SSH key per client |
| 24/7 VPS 支援壓力 | 中 | AI 客服 first-line + Watchdog 自動修復 |
| 客人想走要 migrate data | 低 | 提供 data export service（收費 add-on） |

#### 📌 VPS 待進一步 Research / Action

| 項目 | 狀態 | 優先度 |
|---|---|---|
| 開 Contabo account + provision 測試 VPS (Japan) | 🔲 待做 | 🔥 最高 |
| 實測 Contabo Japan → 香港延遲 | 🔲 待做 | 高 |
| 測試自動安裝 script 喺 Contabo VPS 上跑 | 🔲 待做 | 高 |
| 試搶 Oracle Cloud Always Free (Tokyo) | 🔲 待做 | 中 |
| 研究 VPS security hardening baseline | 🔲 待做 | 中 |
| 計算 breakeven：幾多個 VPS 客先值得自動化 billing | 🔲 待做 | 低 |

---

## 4. API 供應策略（已確認）

### 決定

**唔搞中轉 API key。用三層架構：官方中國 model（主力）+ 官方西方 model via VPN（premium）+ BYOK（客人自己搞）。**

### ⚠️ 重要背景：HK Geo-Restriction

Anthropic 同 OpenAI 於 2024-2025 年封咗 Hong Kong 直接 API access。呢個影響：
- 你無法直接喺 HK 開 Anthropic / OpenAI API account
- 解決方案：透過 VPN（Surfshark + WireGuard）access — 你嘅 Pi5 stack 已有 VPN Watchdog + multi-server fallback
- **中國 model（DeepSeek、Qwen、Kimi）無 HK 限制** — 直接官方 API，合法、穩定

### 三層 API 架構

```
┌─────────────────────────────────────────────┐
│           蟹助手 API 供應策略                  │
├─────────────────────────────────────────────┤
│                                             │
│  Layer 1: 中國 Models（直接官方，無需 VPN）     │
│  ├── DeepSeek V3/R1  ← 主力，平+強           │
│  ├── Qwen（阿里通義）                         │
│  └── Kimi K2（Moonshot）                     │
│                                             │
│  Layer 2: 西方 Models（需 VPN，你搞埋）        │
│  ├── Claude（Anthropic）← via Surfshark VPN  │
│  └── GPT-4o（OpenAI）← via VPN 或 Azure     │
│                                             │
│  Layer 3: BYOK（客人自己搞）                  │
│  └── 任何 OpenAI-compatible endpoint         │
│      客人自帶 key，風險自負                    │
│                                             │
└─────────────────────────────────────────────┘
```

### Layer 1: 中國 Models — 主力（無 HK 限制）

| Model | 官方 API | 價格（per M tokens） | 強項 | 角色 |
|---|---|---|---|---|
| **DeepSeek V3.2** | api.deepseek.com | $0.028 (cache hit) / $0.28 input / $0.42 output | Coding、推理、性價比王 | ⭐ 預設主力 |
| **Qwen qwen3.5-flash** | dashscope-intl.aliyuncs.com | $0.10 input / $0.40 output | 中文理解、多模態、15K RPM | 中文任務 |
| **Qwen qwen3.5-plus** | dashscope-intl.aliyuncs.com | $0.40 input / $2.40 output | 原生多模態（text+image+video） | Standard 級 |
| **Kimi K2.5** | api.moonshot.ai | $0.60 input / $3.00 output (cache hit $0.10) | 262K context、multimodal | 長文任務 |
| **智譜 GLM-4.7-Flash** | api.z.ai | **免費** | 港交所上市、OpenAI-compatible | 免費兜底 |

> **大部分客人日常 traffic 行 Layer 1** — 平、合法、穩定、無需 VPN。呢個係利潤嘅關鍵。

### Layer 2: 西方 Models — Premium（需 VPN）

| Model | 官方 API | 價格（per M tokens） | 強項 | 角色 |
|---|---|---|---|---|
| **Claude Sonnet 4.6** | api.anthropic.com | $3/$15 | 日常對話、寫作 | Premium 預設 |
| **Claude Opus 4.6** | api.anthropic.com | $5/$25 | 複雜推理、高端任務 | Tier 3 optional |
| **GPT-4.1** | Azure OpenAI | $2.00/$8.00 (cache hit $0.50) | 多模態、通用 | Premium 主力 |
| **GPT-4.1-mini** | Azure OpenAI | $0.40/$1.60 (cache hit $0.10) | 輕量任務、Vision | Standard 級 |
| **GPT-4.1-nano** | Azure OpenAI | $0.10/$0.40 (cache hit $0.025) | 極平 routine chat | Budget GPT |

> **⚠️ 重要更新（2026-03）：**
> - **Claude OAuth token 已禁止用喺第三方 app**（2026年1月起）。客人嘅 Pro/Max 月費唔可以 pass-through 去 OpenClaw。唯一合規渠道係 API key (pay-per-token)。
> - **Azure OpenAI 係唯一合法用 GPT 嘅渠道** — Microsoft 明確聲明繼續服務 HK 客戶，無需 VPN。
> - **Gemini API 同樣封鎖 HK**（三層偵測：IP + account region + browser），Vertex AI 可能有 workaround 但需驗證。
> - 詳細 pricing 數據見 **[api-pricing-research-2026-03.md](api-pricing-research-2026-03.md)**

### Layer 3: BYOK（Bring Your Own Key）

- 客人自己去任何 provider 買 key
- 你只負責 setup 到 OpenClaw config 入面
- 中轉站 key、自己開嘅 key、Azure key — 全部支援
- **風險完全由客人承擔**，你唔負責 key 嘅穩定性
- 適合：技術客、價格敏感客、有自己 preference 嘅客

### Smart Routing 邏輯

OpenClaw 支援多 model routing — 你可以設定自動揀最適合嘅 model：

| 任務類型 | 用邊個 Model | 原因 | 成本/1M output |
|---|---|---|---|
| 日常對話 | DeepSeek V3.2 | 最平、cache hit 極低、HK 直接用 | $0.42 |
| 中文寫作 / 翻譯 | Qwen qwen3.5-plus | 中文理解強、原生多模態 | $2.40 |
| Coding / 技術問題 | DeepSeek V3.2 reasoner | Coding benchmark 頂尖、同價格 | $0.42 |
| 複雜推理 | Azure o4-mini / Qwen QwQ-Plus | 質素高、HK 合法 | $4.40 / $2.40 |
| 長文分析 | Kimi K2.5 | 262K context、multimodal | $3.00 |
| 簡單 utility（summarize 等） | GPT-4.1-nano (Azure) | 極平極快、HK 合法 | $0.40 |
| Vision / 圖片理解 | GPT-4.1-mini (Azure) | 有 Vision、HK 合法 | $1.60 |
| 免費兜底 | 智譜 GLM-4.7-Flash | 完全免費、HK 可用 | $0.00 |
| Embedding (Mem0) | Azure text-embedding-3-small | $0.02/1M、最平 embedding | $0.02 input only |

> **呢個 smart routing 係真正嘅成本優化** — 用最平嘅 model 做簡單嘢，只有需要時先用貴 model。可慳 40-60% API 成本。

### 定價模式

**包月制**（對非技術人最友好）：

| Plan | 包含用量 | 月費 | 你嘅成本（實測估算） | Margin |
|---|---|---|---|---|
| 輕量 | ~30 條訊息/日 | HK$30 | ~HK$2.50-3.30 (DeepSeek primary) | **88-92%** |
| 標準 | ~100 條訊息/日 | HK$80 | ~HK$8-15 (DeepSeek + GPT-4.1-mini mix) | **81-90%** |
| 重度 | ~300 條訊息/日 | HK$150 | ~HK$25-35 (mixed routing) | **77-83%** |
| BYOK | 無限（客自負） | HK$30（維護費） | ~HK$0 | ~100% |
| 超出用量 | per message | HK$0.15/條 | - | - |

> **💰 成本估算基礎（2026-03 API pricing research）：**
> - 每條 message ≈ 500 tokens input + 800 tokens output
> - DeepSeek V3.2 cache hit: ~$0.011/條 ≈ HK$0.08/條
> - GPT-4.1-mini: ~$0.044/條 ≈ HK$0.34/條
> - 智譜 GLM-4.7-Flash: $0/條（免費）
> - Embedding (Mem0): 可忽略（$0.02/1M tokens）
> - 詳見 [api-pricing-research-2026-03.md](api-pricing-research-2026-03.md)

> 用「條訊息」而唔係「token」做單位，因為非技術人唔知咩係 token。
> **利潤分析：** 官方 API 嘅 margin 已經 60-83%，唔需要靠中轉站。大部分 traffic 行 DeepSeek（極平），margin 更高。

### 點解唔搞中轉 API Key

| 理由 | 解釋 |
|---|---|
| **來源不明** | 中轉站嘅 key 可能係 stolen/shared/unauthorized |
| **穩定性差** | 平台隨時倒閉，全部客同時斷線 |
| **違反 ToS** | 中轉站本身可能違反 Anthropic/OpenAI 條款 |
| **官方 margin 已夠** | 用 DeepSeek 做主力，margin 60-83%，唔差 |
| **品牌風險** | "蟹助手用山寨 API" 對品牌傷害大 |
| **Support 成本** | 中轉 key 出事你要處理，hidden cost 高 |

### 📌 API 策略 Todo

| 項目 | 狀態 | 優先度 |
|---|---|---|
| 開 DeepSeek 官方 API account | 🔲 待做 | 🔥 最高 |
| 開 Azure OpenAI account | 🔲 待做 | 🔥 最高（唯一合法 GPT 渠道） |
| 開 Qwen DashScope account（Singapore region） | 🔲 待做 | 高 |
| 開 智譜 Z.ai account（免費 model 做兜底） | 🔲 待做 | 高 |
| 開 Kimi（Moonshot）API account | 🔲 待做 | 中 |
| 測試 DeepSeek V3.2 實際成本 per 客 | 🔲 待做 | 🔥 最高（估算見 api-pricing-research） |
| ~~確認 VPN access Anthropic/OpenAI API 可行性~~ | ✅ 已研究 | — Claude OAuth 已禁止第三方 app；Azure OpenAI 係合法渠道 |
| ~~研究 Azure OpenAI 作為 Layer 2 備選~~ | ✅ 已研究 | — Microsoft 明確支持 HK，pricing 同 OpenAI 一樣 |
| 實作 Smart Routing config（model 自動選擇） | 🔲 待做 | 高（routing 建議見 api-pricing-research） |
| 設計 BYOK setup 流程 + 文檔 | 🔲 待做 | 中 |
| ~~更正：text-embedding-3-nano 唔存在~~ | ⚠️ 需更正 | 用 text-embedding-3-small ($0.02/1M) |

---

## 5. 推廣策略（全渠道）（已確認）

### 核心原則

**賣結果，唔好賣技術。** 客人唔 care 你用咩 stack — 佢哋想知 AI 可以幫佢做咩。

### 渠道總覽

| 渠道 | 角色 | 內容類型 | 優先度 | 成本 | 階段 |
|---|---|---|---|---|---|
| **Instagram** | 🏆 主要獲客渠道 | Reels + Stories + Posts | 🔥 最高 | 少量 ad spend | Phase 0 |
| **Threads** | IG 延伸 — 文字討論 | Cross-post + 原生討論 | 🔥 高 | 免費 | Phase 0 |
| **LIHKG** | 話題製造 + organic reach | 第三人稱討論/爭議帖 | 🔥 高 | 免費 | Phase 0 |
| **Telegram Group** | 社群經營 + 轉化 | Community + support | 🔥 高 | 免費 | Phase 0 |
| **WhatsApp** | Close sales + 非技術客 | 1-on-1 對話 | 高 | 免費 | Phase 0 |
| **Reddit** | r/hongkong, r/selfhosted | 分享/教學 | 中 | 免費 | Phase 1 |
| **小紅書** | 中文圖文，年輕女性用家 | 圖文攻略 | 中 | 免費 | Phase 2 |
| **YouTube** | 長片教學/demo | Setup 影片、comparison | 中 | 時間成本 | Phase 2 |
| **口碑 Referral** | 長期最有效 | 客推客 | 長期 | 折扣成本 | Phase 1 |

### Instagram 策略（主攻）

**Account Setup：**
- 開專用 business account（唔好用個人 account）
- Bio: 一句 pitch + Landing page link + Telegram/WhatsApp link
- 初期買 500-1000 followers 做 base（過空殼期）
- 頭 10-20 個 post 買少量 likes/views boost（每個 50-100 likes）
- Organic reach 穩定後（~50+ real followers）即停買

**內容節奏：**

| 類型 | 頻率 | 內容例子 |
|---|---|---|
| **Reels（主力）** | 2-3/週 | Demo 片段、before/after、use case 展示 |
| **Stories** | 每日 | Q&A、behind the scenes、客人對話截圖（已授權）、poll |
| **Posts（圖文）** | 1-2/週 | 功能介紹、比較圖、tips、testimonial |

**Reels 內容方向：**
- "我個 AI 助手幫我每朝 summarize 新聞"
- "佢記得我鍾意飲咩 coffee"（展示 memory 功能）
- "Setup before vs after — 30 分鐘搞掂"
- "問佢 Reddit 上面大家點睇 XXX"（展示 SearXNG + Reddit bypass）
- 客人真實對話截圖（匿名）
- "ChatGPT vs 我自己嘅 AI — 邊個記得我？"

### Threads 策略

- 同 IG 共用 account，cross-post 方便
- 適合文字版分享/討論（類似 LIHKG 風格但更廣受眾）
- 發起 AI 相關話題討論，自然帶出服務
- 唔使買 followers — 靠 IG cross-post 帶流量
- 成本：$0

### LIHKG 策略（話題製造）

> **重點：LIHKG 唔係直接宣傳渠道。係用嚟製造話題、引發討論，間接帶流量去 IG/Website。**

**方法：第三人稱 + 爭議性帖文**

唔好用自己 account 直接賣嘢。用第三人稱角度開帖，引發自然討論：

| 帖文風格 | 標題例子 |
|---|---|
| **發現分享型** | "IG 見到有人幫人裝 OpenClaw，大家覺得點？" |
| **爭議討論型** | "有人話自己 host AI 好過用 ChatGPT，有冇咁誇？" |
| **求助型** | "朋友話佢個 AI 記得佢所有嘢，邊度搵到？" |
| **比較型** | "自己裝 OpenClaw vs 搵人裝，差幾遠？" |

**注意事項：**
- ❌ 絕對唔好買 followers/likes — LIHKG 用家極敏感，一睇就知
- ❌ 唔好 hard sell 或者留 link
- ✅ 自然回覆討論，建立權威
- ✅ 有人問就先答問題，之後先提服務

### Telegram Group 策略

- 開 "OpenClaw HK" 群組做社群
- 做成 community 而唔係純 sales channel
- 分享 OpenClaw tips、新功能、use case
- 客人互相幫助、分享體驗
- 你嘅 AI bot 都可以喺 group 入面答問題（又係 demo）
- **最強 demo：** 群入面嘅 bot 就係 OpenClaw — "想要一個？我哋幫你裝"

### 買 Followers / Likes 策略

| 平台 | 策略 | 預算 | 停買時機 |
|---|---|---|---|
| **IG followers** | 買 500-1000 做 base | ~HK$50-100（一次性） | Organic 穩定後 |
| **IG likes/views** | 頭 10-20 個 post 買少量 boost | ~HK$30-50/月（頭 2 個月） | ~50+ real followers |
| **Threads** | ❌ 唔買 — cross-post 帶流量 | $0 | — |
| **LIHKG** | ❌ 絕對唔好買 — 會被識破 | $0 | — |

> **重點：** 買係為咗過「空殼期」，唔係長期策略。一有真實 engagement 就停。

### 推廣時間線

| 階段 | 時間 | 重點 |
|---|---|---|
| **Phase 0** | Week 1-2 | 開 IG + Threads account、買初始 followers、準備 10 個 Reels 內容、開 TG group |
| **Phase 1** | Week 3-6 | 穩定出 Reels（2-3/週）、LIHKG 開 2-3 個話題帖、TG group 活躍經營、收第一批客 |
| **Phase 2** | Month 2-3 | 加 Reddit/小紅書、客人 testimonial 內容、referral program 啟動 |
| **Phase 3** | Month 3+ | YouTube 教學片、廣告投放測試、KOL 合作 |

### 📌 推廣 Todo

| 項目 | 狀態 | 優先度 |
|---|---|---|
| 開 IG business account | 🔲 待做 | 高 |
| 開 Threads account（同 IG 連結） | 🔲 待做 | 高 |
| 買初始 IG followers（500-1000） | 🔲 待做 | 高 |
| 準備 10 個 Reels 內容（腳本 + 素材） | 🔲 待做 | 高 |
| 開 Telegram Group "OpenClaw HK" | 🔲 待做 | 高 |
| LIHKG 開第一個話題帖 | 🔲 待做 | 高 |
| Landing page 上線後更新 IG bio link | 🔲 待做 | 中 |
| 小紅書 account 開設 | 🔲 待做 | 低（Phase 2） |
| YouTube 頻道開設 | 🔲 待做 | 低（Phase 2） |

### Referral Program

| Action | 獎勵 |
|---|---|
| 介紹朋友成功安裝 | 推薦人下月 API 費免費 |
| 寫公開 review / 推薦 | HK$50 折扣 |
| 介紹 3 個客 | 升級 Tier 免費 |

---

## 6. AI 客服系統（已確認）

### 架構

**Phase 1：Telegram（主）+ WhatsApp（必須有）**
**Phase 2：加 Discord server**

```
客人接觸點
  ├── Telegram Bot ← 主要客服 + 社群
  ├── WhatsApp Bot ← 非技術客首選
  ├── IG DM ← 接 lead → 轉去 TG/WA
  └── Discord ← Phase 2 社群
        │
        ▼
  OpenClaw AI 客服（你自己嘅 instance）
  ├── FAQ + Pricing 自動答
  ├── Troubleshooting 自動診斷
  ├── Sales qualify（新客推薦 Tier）
  └── Escalate → Notify 你（Telegram）
        │
        ▼
  Google Sheet 自動更新
  ├── 新 lead 記錄
  ├── Payment status 更新
  └── Client status tracking
```

### 客服渠道

| 平台 | 香港用家普及度 | 用途 | 階段 |
|---|---|---|---|
| **Telegram** | 高（tech 圈 + 年輕人） | 主要客服 + community group | Phase 1 |
| **WhatsApp** | 🏆 最高（幾乎人人有） | 非技術客首選 | Phase 1 |
| **Discord** | 中（gaming + tech） | 社群（channels: 討論、support、showcase） | Phase 2 |
| **Instagram DM** | 高 | 接 lead → 轉去 TG/WA | Phase 1（被動） |

### 設定

- **Knowledge base：** FAQ document + troubleshooting guide + pricing info
- **Personality：** 友善、用廣東話、簡單易明
- **Escalation trigger：** 偵測到客人情緒/重複問題 → notify 你

> **最強 selling point：** "你而家問緊嘅客服，就係 OpenClaw。想要一個？我哋幫你裝。"

### Notification 系統 — AI 客服自動通知你

AI 客服會喺以下情況直接 Telegram message 你個人 account：

**收錢相關：**

| Case | 觸發條件 | 緊急度 |
|---|---|---|
| 客人交咗錢（PayMe/FPS） | 客人話已轉帳 | 🔴 高 |
| 客人話交咗但你未收到 | 爭議 / delay | 🔴 高 |
| 月費到期未交（過 grace period） | 28號後仍未收到 | 🟡 中 |

**新客 / Sales：**

| Case | 觸發條件 | 緊急度 |
|---|---|---|
| 新客想買（AI qualify 完） | 客人 confirm 有興趣 | 🔴 高 |
| 客人想升 Tier / 加 add-on | 客人提出 | 🟡 中 |
| 潛在客問咗好多但未決定 | 對話超過 10 條未成交 | 🟡 中 |

**技術問題：**

| Case | 觸發條件 | 緊急度 |
|---|---|---|
| AI 答唔到 / 客重複問同一問題 | 3 次問同一嘢 | 🟡 中 |
| 客報告 bot 死咗 / 冇反應 | 關鍵字觸發 | 🔴 高 |
| 客人情緒負面（嬲、投訴） | Sentiment detection | 🔴 高 |

**營運：**

| Case | 觸發條件 | 緊急度 |
|---|---|---|
| 每日 summary | 每日固定時間 | 🟢 低 |
| 客人 referral | 有人提到介紹朋友 | 🟡 中 |

**Notification 格式：**
```
[🔴 新客] @username 想買 Tier 2 (VPS)
— 佢叫 Peter，想用 Telegram + WhatsApp
— 已完成 qualify，等你 confirm

[💰 收款] @username 話已 FPS 轉帳 HK$500
— 請確認收款

[⚠️ Escalate] @username 問咗 3 次同一問題
— "點解佢唔記得我昨日講嘅嘢"
— 可能 mem0 有問題

[📊 每日 Summary] 2026-03-14
— 新 lead: 3 | 成交: 1 (Tier 2) | 支援: 2 (解決 1, escalate 1)
```

### Client Management System — Google Sheet

初期用 Google Sheet（免費、手機可睇、AI 可透過 API 自動更新）：

| Column | 內容 | 例子 |
|---|---|---|
| Client ID | 自動編號 | C001 |
| Name | 客人名 | Peter |
| Telegram / WA | 聯絡方式 | @peter_hk |
| Platform | Pi5 / VPS / Mac Mini | VPS (Hetzner) |
| Tier | 1 / 2 / 3 | Tier 2 Standard |
| Add-ons | 加購項目 | SearXNG, Personality |
| Status | Active / Suspended / Cancelled | Active |
| Install Date | 安裝日期 | 2026-03-15 |
| VPS ID | Hetzner server ID（如適用） | hetzner-sg-12345 |
| Billing Type | Monthly / Yearly | Yearly |
| Next Payment | 下次交費日 | 2027-03-15 |
| Payment Status | Paid / Overdue / Grace | Paid |
| API Plan | 輕量/標準/重度 | 標準 |
| Referral By | 邊個介紹嚟 | C003 |
| Notes | 備註 | 想加 WhatsApp，下次 follow up |

> **Scale 路線：** Google Sheet → Notion / Airtable → 自己寫 dashboard

### 📌 AI 客服 Todo

| 項目 | 狀態 | 優先度 |
|---|---|---|
| 開 Telegram Bot 做客服 | 🔲 待做 | 高 |
| 寫 Knowledge Base（FAQ + pricing + troubleshooting） | 🔲 待做 | 高 |
| 設定 notification → 你個人 Telegram | 🔲 待做 | 高 |
| Research WhatsApp Business API + OpenClaw 接入 | 🔲 待做 | 高 |
| 建 Google Sheet client tracker | 🔲 待做 | 高 |
| 研究 OpenClaw → Google Sheet API 自動更新 | 🔲 待做 | 中 |
| Setup Discord server | 🔲 待做 | 低（Phase 2） |

---

## 7. Website / Landing Page（已確認）

### 決定

- **方案：B — 簡單多頁 static site**（Landing + Pricing + FAQ + Contact）
- **Hosting：** Cloudflare Pages（免費、快、全球 CDN）
- **Domain：** Cloudflare 買（`.com` ~HK$80-100/年）
- **網站設計：** 待定 — Phase 0 先做基本版，之後再 polish

> **核心目的：** LIHKG / IG post 可以 link 去一個「睇落專業」嘅頁面，建立信任。

### 頁面結構

| 頁面 | 內容 |
|------|------|
| **Landing** | Hero pitch + 3 個 Tier 簡介 + CTA（聯絡我哋） |
| **Pricing** | 詳細 Tier 比較表 + Add-on + FAQ |
| **FAQ** | 常見問題（咩係 OpenClaw？安全嗎？點安裝？etc.） |
| **Contact** | Telegram link + WhatsApp link + IG link |

### 📌 Website Todo

| 項目 | 狀態 | 優先度 |
|---|---|---|
| Cloudflare 買 domain | 🔲 待做 | 高 |
| 起 static site（landing + pricing + FAQ） | 🔲 待做 | 高 |
| Deploy to Cloudflare Pages | 🔲 待做 | 高 |
| 宣傳素材設計（IG 廣告圖片/影片、LIHKG banner 等） | 🔲 待做 | 中（Phase 1 後） |
| IG Reel / 廣告短片 design + 製作 | 🔲 待做 | 中（Phase 1 後） |

---

## 8. Payment 收款方式（已確認）

### 決定

**Freelance 形式收錢，初期唔開公司。全方式接受 — 俾客人最大方便。**

### 收款方式

| 方式 | 手續費 | 客人見到嘅名 | 自動化 | 適合場景 | 階段 |
|---|---|---|---|---|---|
| **FPS 轉數快** | 零 | 你真名（銀行登記） | ❌ 手動確認 | 本地客、安裝費、月費 | Phase 0 |
| **PayMe** | 零（個人版） | 可改顯示名（e.g. "ClawHK"） | ❌ 手動 | 小額、casual 客 | Phase 0 |
| **銀行過數** | 零 | 你真名 | ❌ 手動 | 大額（年費、全能大師） | Phase 0 |
| **PayPal** | ~4.4% | 你設定嘅名 | ✅ 可自動 | 海外華人客 | Phase 0 |
| **Crypto (USDT)** | ~0（TRC20）| 匿名 | ❌ 手動 | 重視私隱嘅客 | Phase 0 |
| **Lemon Squeezy** | 5% + US$0.50 | 商戶名（MoR） | ✅ recurring + Visa/MC | 自動月費扣款、信用卡客 | Phase 1（唔需 BR）|
| **Stripe** | 3.4% + HK$2.35 | 商戶名 | ✅ recurring | 更低手續費 | Phase 3（需 BR） |

### 收款流程

```
客人決定購買
  │
  ├─ AI 客服 send 付款方式選擇
  │   ├── FPS（QR code / 手機號）
  │   ├── PayMe（QR code）
  │   ├── 銀行過數（帳戶資料）
  │   ├── PayPal（email link）
  │   ├── Crypto（USDT 地址）
  │   └── Visa/MC 信用卡（Lemon Squeezy checkout — Phase 1+）
  │
  ├─ 客人轉帳 + send 截圖
  │
  ├─ 你確認收款
  │
  └─ AI 客服自動 notify → 開始安裝
```

### 月費收款

- 每月 25 號 AI 客服自動 send 帳單（配合 Section 3d 斷線流程）
- 接受所有付款方式
- **推薦年費制** — 客人一次過交，你預收 cash flow
- **Phase 1+ Lemon Squeezy 自動扣款** — 信用卡客人設定一次，之後自動 recurring

> **露名問題：** FPS / 銀行過數會顯示真名。PayMe 可改名。如需匿名可用 Crypto。

### Lemon Squeezy（Phase 1 — Visa/MC 信用卡收款）

> **唔需要 BR。** Lemon Squeezy 係 Merchant of Record（MoR）— 法律上客人係同 Lemon Squeezy 交易，唔係同你。佢哋負責稅務、退款、PCI 合規。你只需要有銀行帳戶收 payout。

| 項目 | 詳情 |
|---|---|
| **手續費** | 5% + US$0.50/筆 |
| **Visa/MC** | ✅ |
| **Recurring billing** | ✅ 自動月費扣款 |
| **Payout** | 每月 / 每兩週，入你銀行或 PayPal |
| **客人體驗** | Checkout page（可 embed 喺你 website） |
| **需要 BR** | ❌ |

**手續費影響（智能管家 HK$248/月為例）：**
```
HK$248 × 5% + HK$3.90 = HK$16.30/筆
你實收 HK$231.70 → 成本 HK$67 → Margin HK$164.70（仍 66%）
```

> **策略：** Phase 1 加 Lemon Squeezy 接受信用卡 + 自動月扣。Phase 3 有 BR 後可轉 Stripe（手續費 3.4% 更平）。

---

## 9. Business Entity 商業登記（已確認）

### 決定

**初期 Freelance / Sole Proprietorship，唔開公司。收入穩定後申請商業登記。**

### 階段規劃

| 階段 | 狀態 | 行動 |
|---|---|---|
| **0-10 客** | Freelance（個人） | 用個人帳戶收錢，唔申請 BR |
| **10-30 客** | Sole Proprietorship | 申請商業登記證（~HK$250/年），可用商業名 "ClawHK" |
| **30+ 客 / 想用 Stripe** | 考慮開公司 | 有限公司（如需要 Stripe recurring billing 或法律保障） |

### 香港商業登記（BR）要點

| 項目 | 詳情 |
|---|---|
| **法律要求** | 持續經營賺錢需要申請（技術上唔申請係違法，但初期風險極低） |
| **費用** | ~HK$250/年 |
| **申請** | 稅務局（IRD）網上或親身 |
| **稅務** | 報個人利得稅，唔使開公司 |
| **銀行** | 可繼續用個人戶口 |
| **Stripe** | 需要 BR 先可以開商戶帳戶 |

> **實際操作：** 好多香港 freelancer 初期唔申請 BR，等有穩定收入先搞。建議 10 個客左右就去申請 — 成本低、合法、可以用商業名。

---

## 10. 客人 Onboarding Flow（已確認）

### 核心原則

**你 handle 一切技術嘢。客人只需要：付款 + 提供 Telegram username（+ 插電開機 for Pi5）。**

你負責開：API key、VPS、Telegram bot、所有安裝同設定。

### Route A: VPS 客（客人做 2 步）⭐ 最簡單

```
1. 客人 PM（IG/TG/WA）→ AI 客服 qualify → 推薦 Tier
2. 客人：揀 Tier + 付款 + 提供 Telegram username
   ─────── 以下全部你做 ───────
3. 你：收款確認 → 開 VPS → 開 TG bot → 全自動安裝
4. Send 客人："你嘅 AI 助手準備好喇 → @xxx_bot，試下同佢講嘢"
5. 客人打開 Telegram → 直接用 ✅
```

**客人總操作：付款 + 提供 TG username = 2 步**
**你嘅時間：~10-15 分鐘**

### Route B: Pi5 經你買（客人做 3 步）

```
1-2. 同 Route A
   ─────── 你做嘅嘢 ───────
3. 你：買 Pi5 → 預裝 OS → 接好所有線/SD/NVMe → 預裝 Tailscale（auth key pre-authorize）→ 寄到客人
   ─────── 客人做嘅嘢 ───────
4. 客人：拆箱 → 插電 + 插網線 → 開機
   （Pi5 自動連網 → Tailscale 自動連上你嘅 Tailnet）
   ─────── 你做嘅嘢 ───────
5. 你：SSH 入去 → 全自動安裝 → 開 TG bot
6. Send 客人："準備好喇 → @xxx_bot"
```

**客人總操作：付款 + 提供 TG username + 插電開機 = 3 步**
**你嘅時間：~20-30 分鐘（不含寄送等待）**

#### Pi5 預裝策略

| 項目 | 你預裝 | 客人做 |
|---|---|---|
| OS flash to SD/NVMe | ✅ | — |
| 接 NVMe + case + fan | ✅ | — |
| WiFi 設定（如客提供密碼）或 Ethernet | ✅ 預設 | 插網線 |
| Tailscale（headless auth key） | ✅ 自動連接 | — |
| 插電開機 | — | ✅ |

> **關鍵：** Tailscale auth key 可以 pre-authorize，客人一開機就自動加入你嘅 Tailnet，你即刻 SSH 得入去。零操作。

### Route C: Pi5 客人自備（客人做 4 步）

```
1-2. 同 Route A
   ─────── 客人做嘅嘢 ───────
3. Send 客人圖文/短片教學：裝 Tailscale
4. 客人：裝好 Tailscale → notify 你
   ─────── 你做嘅嘢 ───────
5. 你：SSH 入去 → 全自動安裝 → 開 TG bot
6. Send 客人："準備好喇 → @xxx_bot"
```

**客人總操作：付款 + 提供 TG username + 裝 Tailscale + notify = 4 步**

### WhatsApp 接入（加購 / Tier 2+）

安裝完成後，額外 1 步：
```
1. 你 send WhatsApp QR code 俾客人
2. 客人用手機掃一下
3. Done ✅
```

### Telegram Bot 開設策略

| | 你開 | 客人開 |
|---|---|---|
| **客人體驗** | 零操作 ✅ | 要跟教學 |
| **Bot 擁有權** | 你 own | 客人 own |
| **風險** | 低（TG 唔限制 bot 數量） | 無 |
| **客人走時** | Revoke token | 客人帶走 |

> **決定：你開。** 10 秒嘅事，對非技術客人嚟講可能要 10 分鐘解釋。客人走時 revoke token 就得。

### 交付 Checklist

安裝完成後 send 俾客人嘅 message：

```
🎉 你嘅 AI 助手準備好喇！

📱 Telegram Bot: @xxx_bot
💬 試下同佢講嘢："你好，我叫 [名]"
🧠 佢會記住你講過嘅嘢（Tier 2+）
🔍 試下叫佢搜嘢："幫我搵下 Reddit 上面大家點睇 XXX"（Tier 2+）

📖 基本用法指南：[link]
🆘 有問題？直接 PM 我哋嘅客服 bot：@clawhk_support

歡迎加入我哋嘅社群：[TG Group link]
```

### Onboarding 時間總結

| Route | 客人操作 | 你嘅時間 | 總交付時間 |
|---|---|---|---|
| **A: VPS** | 2 步 | ~10-15 min | 收款後 15 分鐘內 |
| **B: Pi5 經你買** | 3 步 | ~20-30 min | 寄到後當日 |
| **C: Pi5 自備** | 4 步 | ~20-30 min | Tailscale 裝好後 30 分鐘內 |

### 📌 Onboarding Todo

| 項目 | 狀態 | 優先度 |
|---|---|---|
| 製作 Tailscale 安裝圖文教學（Route C 用） | 🔲 待做 | 高 |
| 製作客人交付 message template | 🔲 待做 | 高 |
| 測試 Tailscale auth key pre-authorize flow | 🔲 待做 | 高 |
| 製作 Pi5 預裝 checklist（Route B 用） | 🔲 待做 | 高 |
| 製作基本用法指南（客人用） | 🔲 待做 | 中 |

---

## 11. 財務預估

### Startup Cost（初期投入）

| 項目 | 成本 |
|---|---|
| 你自己嘅 OpenClaw instance（客服用） | 已有 ✅ |
| Domain 註冊 | ~HK$100/年 |
| 簡單 Landing Page（可用免費 hosting） | ~HK$0-100 |
| Tailscale account | 免費 |
| DeepSeek / Qwen API 初始充值 | ~HK$100-200 |
| Instagram / 設計工具 | ~HK$0（Canva 免費版） |
| **Total Startup** | **~HK$300-400** |

### 每單利潤估算

**⭐ 智能管家（主推）— 全包月費制：**

| 項目 | 金額 |
|---|---|
| 安裝費收入（半價期） | +HK$400 |
| 你嘅時間成本（~30min QA） | -HK$50（估） |
| Script / 工具維護分攤 | -HK$10 |
| **安裝利潤（半價期）** | **~HK$340** |
| **安裝利潤（原價 HK$800）** | **~HK$740** |
| 月費 | +HK$248 |
| 月成本（VPS+API+VPN+維護） | -HK$67 |
| **每月 Margin** | **~HK$181（73%）** |
| **首月總利潤（半價期）** | **~HK$521** |
| **首年利潤/客（半價期）** | **~HK$2,512** |

> 詳細成本拆解見 **[pricing-analysis.md](pricing-analysis.md)**

### Scale 預測

> 以全部 ⭐ 智能管家估算

| 客戶數 | 月費收入 | 月 Margin | 累計安裝費 | 備注 |
|---|---|---|---|---|
| 5 客 | HK$1,240 | HK$905 | HK$2,000 | Soft launch（半價期） |
| 10 客 | HK$2,480 | HK$1,810 | HK$4,000 | 半價期尾聲 |
| 20 客 | HK$4,960 | HK$3,620 | HK$8,000 | 半價名額用完 |
| 30 客 | HK$7,440 | HK$5,430 | HK$16,000 | 3 個月目標 |
| 100 客 | HK$24,800 | HK$18,100 | HK$72,000 | 6 個月目標 |
| 300 客 | HK$74,400 | HK$54,300 | HK$232,000 | 1 年目標 |

> 全包月費係真正嘅 business value — 73% margin + 穩定 recurring revenue。

---

## 12. 啟動 Roadmap

### Phase 0: 準備（Week 1-2）

- [ ] 寫 automated setup script（VPS 版本優先）
- [ ] 開 Contabo account + provision 測試 VPS (Japan)
- [ ] Setup LiteLLM proxy（API metering + smart routing）
- [ ] Setup AI 客服 bot（OpenClaw + knowledge base）
- [ ] 準備 Tailscale onboarding 教學（圖文步驟）
- [ ] 開 DeepSeek / Qwen 官方 API account + 測試實際 per-message 成本
- [ ] 買 domain + 起 landing page

### Phase 1: Soft Launch（Week 3-4）

- [ ] LIHKG 發第一篇教學 post
- [ ] 開 Telegram group "OpenClaw HK"
- [ ] 接頭 3-5 個客（免費或半價，換 testimonial）
- [ ] 收集 feedback，改善流程
- [ ] 開 Instagram account，出第一批 content

### Phase 2: 正式推出（Week 5-8）

- [ ] 正式定價上線
- [ ] Landing page 加 pricing table + FAQ
- [ ] IG 開始恆常出 Reel（每週 2-3 條）
- [ ] LIHKG 定期發 post / 回覆相關討論
- [ ] 推出 referral program

### Phase 3: Scale（Month 3+）

- [ ] YouTube 頻道 / 教學影片
- [ ] 考慮自建 API proxy（如客超過 20 個）
- [ ] 研究更多平台（小紅書、Threads）
- [ ] 考慮擴展服務（OpenClaw skill 開發、自訂 integration）
- [ ] 評估是否需要請人幫手

---

## 13. 風險同應對

| 風險 | 嚴重性 | 應對策略 |
|---|---|---|
| OpenClaw 更新 breaking change | 高 | Script version lock + 定期測試 + 跟 release notes |
| VPN 被 Anthropic/OpenAI detect | 中 | 備選 Azure OpenAI（HK 合法）、主力用中國 model 減少 VPN 依賴 |
| 客人 API 用量超預期 | 中 | API 充值制（用完再充）+ soft limit + HK$150 hard cap |
| HK Geo-Restriction（Anthropic/OpenAI） | 中 | Layer 1 中國 model 無限制；Layer 2 via VPN；Azure 作合法備選 |
| 競爭對手出現 | 中 | 先發優勢 + 社群經營 + 服務質素 |
| 客人 Pi5 硬件故障 | 低 | 明確唔包硬件保養，教佢聯絡 Raspberry Pi 官方 / 代理 |
| Telegram bot 被 ban | 低 | 準備 backup bot token，教客轉 bot |
| 香港網絡法規變化 | 低 | 留意新聞，必要時調整 VPN 策略 |

---

## 14. 討論進度 Tracker

### ✅ 已討論 + 寫入 Plan

| Topic | 狀態 | 備註 |
|---|---|---|
| 支援平台（Pi5 / VPS / Mac Mini） | ✅ 已確認 | Phase 1: Pi5+VPS, Phase 2: Mac Mini |
| VPS 代開管理方案 | ✅ 已確認 | 預繳月費/年費制，Contabo Japan 為主推 |
| AI 客服系統 | ✅ 已確認 | Level A (Telegram+WhatsApp)，加 notification |
| Client Management | ✅ 已確認 | Google Sheet，AI 自動更新 |
| 客服多平台 | ✅ 已確認 | Phase 1: TG+WA, Phase 2: Discord |
| Custom Stack 賣點 | ✅ 已加入 | Mem0, SearXNG, Watchdog, Browser 等 |
| Website / Landing Page | ✅ 已確認 | 方案 B static site，Cloudflare Pages + domain，宣傳設計待定 |
| 安裝自動化策略 | ✅ 已確認 | 混合方案（Scripts + AI QA），詳見 installation-automation-strategy.md |
| 推廣策略（全渠道） | ✅ 已確認 | IG 主攻 + Threads + LIHKG 話題製造 + TG 社群，含買 followers 策略 |
| Payment 收款方式 | ✅ 已確認 | FPS + PayMe + 銀行 + PayPal + Crypto，Phase 3 加 Stripe |
| Business Entity | ✅ 已確認 | 初期 freelance，10 客後申請 BR（~HK$250/年），30+ 客考慮開公司 |
| 客人 Onboarding Flow | ✅ 已確認 | 3 Routes（VPS/Pi5 經你買/Pi5 自備），你全包技術，含 Tailscale + TG bot + WhatsApp 策略 |
| Remote Control 工具細節 | ✅ 已確認 | Tailscale auth key pre-authorize，Pi5 預裝策略，併入 Onboarding Flow |
| API 供應策略 | ✅ 已確認 | 唔搞中轉 key。三層架構：中國 model 直接官方（主力）+ 西方 model via VPN + BYOK |
| Pricing Strategy（收費模式） | ✅ 已確認 | 全包月費制：安裝費（開業半價）+ 全包月費 HK$148-388。API 成本極低攤入月費。見 [pricing-analysis.md](pricing-analysis.md) |
| VPS Provider | ✅ 已確認 | Contabo Japan 主推（VPS 10: 4vCPU/8GB ~US$6.80/月），Hostinger SG 備選 |
| LiteLLM + Metering | ✅ 已確認 | LiteLLM 做 API proxy + per-client usage tracking + smart routing。Embedding 用 shared key |

### ⏸️ Deferred（實測 API 成本後再 Fine-tune）

| # | Topic | 優先度 | 備註 |
|---|---|---|---|
| 1 | **Pricing 數字 Fine-tune** | 高 | 實測 DeepSeek per-message 成本，確認月費 margin 足夠。見 [pricing-analysis.md](pricing-analysis.md) §7 |
| 2 | **Add-on / Topup 包裝** | 中 | 組件拆分定價 + OpenClaw Skills (2000+) |

---

## Sources

- [OpenClaw Official Docs](https://docs.openclaw.ai)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Raspberry Pi Guide — Adafruit](https://learn.adafruit.com/openclaw-on-raspberry-pi/installing-openclaw)
- [Raspberry Pi Official — OpenClaw](https://www.raspberrypi.com/news/turn-your-raspberry-pi-into-an-ai-agent-with-openclaw/)
- [Best VPS for OpenClaw — CyberNews](https://cybernews.com/best-web-hosting/best-openclaw-hosting/)
- [OpenClaw Deploy Cost Guide](https://yu-wenhao.com/en/blog/2026-02-01-openclaw-deploy-cost-guide/)
- [Best Model for OpenClaw — haimaker.ai](https://haimaker.ai/blog/best-models-for-clawdbot/)
- [OpenClaw Model Selection Guide](https://blog.laozhang.ai/en/posts/openclaw-best-model-selection-guide/)
- [Tailscale + RustDesk Guide](https://tailscale.com/blog/tailscale-rustdesk-remote-desktop-access)
- [SetupClaw — White-Glove Service](https://setupclaw.com)
- [DeepSeek API Platform](https://platform.deepseek.com/)
- [阿里 DashScope（Qwen）](https://dashscope.aliyuncs.com/)
- [Moonshot AI（Kimi）](https://platform.moonshot.cn/)
