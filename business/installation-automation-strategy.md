# 安裝自動化策略 — AI CLI + Modular Scripts 混合方案

> **本文檔係 OpenClaw 安裝服務嘅技術核心 — 定義點樣高效、可靠咁為客人 remote setup OpenClaw。**

---

## 1. 安裝方法演進

### 你嘅實際方法

你而家係用 **VSCode + Claude Code SSH** 入客人 device，跟住 `pi5-openclaw-setup-guide.md` 做 setup。呢個方法已驗證可行。

### 方案比較

| | **A. 純 Bash Script** | **B. 純 AI CLI SSH** | **C. 混合（Scripts + AI QA）** |
|---|---|---|---|
| **描述** | 寫好 script 一鍵跑 | Claude Code SSH 入去逐步做 | Script 做常規步驟，AI 做 QA + debug |
| **開發成本** | 高 — 要寫 + 測試 + 維護 | 低 — 你已經識做 | 中 — 寫簡單 scripts + playbook |
| **Error Handling** | 要自己寫每個 edge case | AI 即時判斷 + 自動 debug | Script handle 常見，AI handle 異常 |
| **執行速度** | 🏆 最快（全自動） | 較慢（AI 要思考 + 逐步） | 中等（script 快跑 + AI 驗證） |
| **適應性** | 低 — 環境唔同就 fail | 🏆 最高 — AI 識 adapt | 高 — 核心穩定 + AI 靈活 |
| **Scalability** | 🏆 最好 — 無人手 | 差 — 每客要你開 session | 好 — 常規自動 + 例外 AI |
| **API Token 成本** | $0 | ~$0.5-2 USD/次 | ~$0.2-0.5 USD/次（只 QA） |
| **可重複性** | 100% 一致 | 每次可能唔同 | 核心一致，debug 靈活 |
| **你嘅經驗** | ❌ 未寫過完整 script | ✅ 已用緊 | 兩邊結合 |

### 決定：方案 C — 混合方案

直接跳去成熟版：**Modular Scripts 做 80% 常規步驟 + Claude Code 做 QA check、test、debug。**

理由：
- 你已有 Pi5 setup 經驗，抽取 scripts 唔難
- Scripts 保證速度同一致性
- AI 處理 edge case + 最終驗證
- Token 成本低（只做 QA，唔做全程安裝）
- 每次遇到新問題 → 加入 script / playbook → 越嚟越自動

---

## 2. 安裝系統架構

### 決定：CLAUDE.md Playbook 模式

核心 insight：**唔係寫一個完美 script，而係寫一個完美 playbook 俾 Claude Code 跟。**

CLAUDE.md = 你嘅「AI 裝機員培訓手冊」。佢會越用越強 — 每次遇到新問題就加入。

### 項目結構

```
openclaw-installer/
├── CLAUDE.md                    ← 🧠 核心：教 Claude Code 點做 setup
├── scripts/
│   ├── core/                    ← Pi5 + VPS 共用步驟
│   │   ├── 01-system-update.sh
│   │   ├── 02-install-node.sh
│   │   ├── 03-install-docker.sh
│   │   ├── 04-install-openclaw.sh
│   │   ├── 05-setup-qdrant.sh
│   │   ├── 06-setup-mem0.sh
│   │   ├── 07-setup-searxng.sh
│   │   └── 08-configure-env.sh
│   ├── pi5/                     ← Pi5 專用
│   │   ├── kernel-fix.sh        ← 16KB → 4KB page size
│   │   ├── vpn-setup.sh         ← WireGuard + multi-server config
│   │   ├── watchdog-gateway.sh  ← Gateway health check service
│   │   ├── watchdog-vpn.sh      ← VPN connectivity check service
│   │   └── systemd-services.sh  ← 所有 systemd unit files
│   ├── vps/                     ← VPS 專用
│   │   ├── security-hardening.sh ← firewall, fail2ban, SSH key only
│   │   ├── swap-setup.sh        ← 低 RAM VPS 需要
│   │   └── systemd-services.sh  ← VPS 版 systemd units
│   ├── mac/                     ← Mac Mini（Phase 2）
│   │   └── README.md            ← 待開發
│   └── qa/                      ← QA 驗證 scripts
│       ├── health-check.sh      ← 檢查所有 service 狀態
│       ├── verify-services.sh   ← 驗證 Docker containers、ports、configs
│       └── test-openclaw-chat.sh ← 發 test message 驗證端到端
├── configs/
│   ├── templates/               ← Config 模板（每次安裝 copy + 填值）
│   │   ├── openclaw.env.template
│   │   ├── docker-compose.qdrant.yml
│   │   ├── docker-compose.searxng.yml
│   │   ├── searxng-settings.yml
│   │   └── soul.md.default
│   └── clients/                 ← 每客獨立設定
│       └── {CLIENT_ID}/
│           ├── .env             ← 客人嘅 API key、bot token 等
│           ├── soul.md          ← 客人嘅 personality（如有）
│           └── setup-log.md     ← 安裝記錄
├── guides/
│   ├── pi5-setup-guide.md       ← 你已有（reference）
│   └── vps-setup-guide.md       ← 待寫
├── ssh-configs/
│   └── config.d/                ← 每客 SSH config snippet
│       ├── C001-pi5
│       └── C002-vps
└── logs/
    └── {CLIENT_ID}/
        └── setup-{DATE}.log    ← 完整安裝 log
```

### CLAUDE.md Playbook 內容設計

```markdown
# OpenClaw 安裝 Playbook

你係 OpenClaw 安裝員。收到安裝指令後跟以下步驟：

## Step 1: 確認安裝資料
- Client ID?（e.g. C005）
- Platform?（pi5 / vps）
- Tier?（1 / 2 / 3）
- SSH host 名?（對應 ssh-configs/config.d/ 入面嘅 config）
- 客人 config 已準備好?（configs/clients/{CLIENT_ID}/.env）

## Step 2: SSH 入目標 device
- 用 ssh-configs/ 入面嘅 config 連接
- 確認 OS、architecture、available disk space

## Step 3: 運行 Core Scripts（按順序）
依次序跑 scripts/core/ 下面嘅 scripts：
1. 01-system-update.sh
2. 02-install-node.sh
3. 03-install-docker.sh
4. 04-install-openclaw.sh
5. 05-setup-qdrant.sh（Tier 2+ only）
6. 06-setup-mem0.sh（Tier 2+ only）
7. 07-setup-searxng.sh（Tier 2+ only）
8. 08-configure-env.sh

每個 script：
- 跑之前 check 係咪已經裝過（idempotent）
- 跑完 check exit code
- 如果失敗 → 讀 error output → 嘗試修復 → 重跑一次
- 仍然失敗 → 記錄落 log → 通知操作員

## Step 4: 運行 Platform-Specific Scripts
### 如果 Pi5：
- scripts/pi5/kernel-fix.sh（需要 reboot）
- scripts/pi5/vpn-setup.sh（Tier 2+ / 如需要）
- scripts/pi5/watchdog-gateway.sh（Tier 2+）
- scripts/pi5/watchdog-vpn.sh（Tier 3 / 如有 VPN）
- scripts/pi5/systemd-services.sh

### 如果 VPS：
- scripts/vps/security-hardening.sh
- scripts/vps/swap-setup.sh（如 RAM < 4GB）
- scripts/vps/systemd-services.sh

## Step 5: Apply 客戶 Config
- Copy configs/clients/{CLIENT_ID}/.env 到正確位置
- Apply soul.md（如有）
- 設定 API key、bot token、其他 env vars

## Step 6: QA Check（關鍵！）
跑以下驗證 scripts：
1. scripts/qa/health-check.sh — 所有 service 狀態
2. scripts/qa/verify-services.sh — Docker containers、ports、configs
3. scripts/qa/test-openclaw-chat.sh — 發 test message

全部 PASS 先算完成。任何 FAIL → debug → fix → 重跑 QA。

## Step 7: 產生 Setup Report
寫入 configs/clients/{CLIENT_ID}/setup-log.md：
- 安裝日期時間
- Platform + Tier
- 所有 service 狀態（✅/❌）
- 遇到嘅問題同解法
- 安裝總耗時

## 常見問題處理（持續更新）
| 問題 | 解法 |
|------|------|
| jemalloc crash (Pi5) | 跑 pi5/kernel-fix.sh → reboot |
| Docker permission denied | sudo usermod -aG docker $USER && newgrp docker |
| Port 已被佔用 | lsof -i :{PORT} → kill process |
| npm install 失敗 | 清 cache: npm cache clean --force → 重試 |
| Qdrant container 起唔到 | 檢查 disk space + Docker logs |
| SearXNG 503 error | 檢查 searxng-settings.yml → restart container |
| VPN 連唔到 | 檢查 WireGuard config + endpoint IP |
| Telegram bot 無回應 | 檢查 bot token + gateway service status |
| ... | （每次遇到新問題就加入呢度）|

## Tier-specific 安裝矩陣
| 組件 | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| System + Node + Docker | ✅ | ✅ | ✅ |
| OpenClaw daemon + gateway | ✅ | ✅ | ✅ |
| Telegram bot | ✅ | ✅ | ✅ |
| WhatsApp bot | ❌ | ✅ | ✅ |
| Qdrant + Mem0 | ❌ | ✅ | ✅ |
| SearXNG | ❌ | ✅ | ✅ |
| Gateway Watchdog | ❌ | ✅ | ✅ |
| VPN + VPN Watchdog | ❌ | 可選 | ✅ |
| Chromium Browser | ❌ | ❌ | ✅ |
| Custom personality | ❌ | ❌ | ✅ |
| Security hardening (VPS) | 基本 | ✅ | ✅ |
```

---

## 3. 安裝工作流程

### 你嘅實際操作流程

```
1. 收到新客訂單
   ├── 確認 Client ID、Platform、Tier
   ├── Pi5: SSH access ready?（Tailscale）
   └── VPS: Provision new server（Hetzner API）

2. 準備客戶 config
   ├── 建 configs/clients/C005/ 目錄
   ├── 填 .env（API key、bot token、等等）
   ├── 準備 soul.md（如 Tier 3）
   └── 加 SSH config 到 ssh-configs/config.d/

3. 開 VSCode → 一句指令啟動
   "Setup Tier 2 Pi5 for C005, SSH host client-c005"

4. Claude Code 自動跟 CLAUDE.md playbook：
   ├── SSH 入去
   ├── 順序跑 scripts（core → platform-specific）
   ├── Apply 客戶 config
   ├── 跑 QA check
   ├── 產生 setup report
   └── 遇到問題 → 自動 debug → 記錄

5. 你 review setup report → approve → 交付

6. 更新 Google Sheet client tracker
```

### 安裝時間預估

| Platform | Script 執行 | AI QA + Debug | 你嘅時間 | Total |
|----------|------------|---------------|----------|-------|
| **VPS** | ~5-8 min | ~3-5 min | ~2 min review | ~10-15 min |
| **Pi5** | ~8-12 min（含 reboot） | ~5-8 min | ~3 min review | ~15-25 min |
| **Mac Mini** | TBD（Phase 2） | TBD | TBD | TBD |

---

## 4. 平台考慮

### 目前開發工具：VSCode + Claude Code Extension

**優點：**
- 你已經熟悉
- 有 visual feedback（terminal output、file explorer）
- Claude Code 可以直接操作 SSH terminal
- 可以同時開多個 terminal tab

**限制：**
- 需要你開住 VSCode 監督
- 一次通常只做一個安裝

### 未來升級路線

| 階段 | 客戶數 | 方法 | 你嘅時間/客 | 並行能力 |
|------|--------|------|-------------|----------|
| **Launch** | 0-15 | VSCode + Claude Code + Playbook | ~15-25min | 1 個 |
| **Scale** | 15-30 | Claude Code CLI headless（`claude -p "..."`） | ~10-15min | 2-3 個 |
| **Mature** | 30+ | Claude Agent SDK / 自動化 dashboard | ~2-5min | 5+ 個 |

#### Claude Code CLI Headless 模式（Scale 階段）

```bash
# 唔使開 VSCode，直接 terminal 跑
claude -p "Setup Tier 2 Pi5 for client C005, SSH host: client-c005. Follow the playbook in CLAUDE.md."

# 可以同時開幾個 terminal = 並行安裝
# Terminal 1
claude -p "Setup Tier 2 VPS for client C006..."
# Terminal 2
claude -p "Setup Tier 2 Pi5 for client C007..."
```

#### Claude Agent SDK（Mature 階段）

自建安裝 agent：
```
Web dashboard → 揀客 → 揀 Tier → Click "Deploy"
  → Agent SSH 入去 → 跑 playbook → 自動 report → 通知你
```
- 最 scalable，幾乎全自動
- 開發成本最高
- 30+ 客先值得投資

---

## 5. Script 設計原則

### 每個 Script 必須：

1. **Idempotent** — 跑兩次唔會 break（已裝嘅 skip）
2. **有 exit code** — 0 = success, non-zero = fail
3. **有 log output** — 每步驟 print 狀態
4. **有 pre-check** — 確認環境 OK 先跑
5. **有 error message** — 失敗時清楚說明原因

### Script 模板

```bash
#!/bin/bash
# Script: 04-install-openclaw.sh
# Purpose: Install OpenClaw daemon and gateway
# Platform: Pi5 + VPS (shared)

set -euo pipefail

SCRIPT_NAME="04-install-openclaw"
LOG_PREFIX="[$SCRIPT_NAME]"

log() { echo "$LOG_PREFIX $1"; }
error() { echo "$LOG_PREFIX ERROR: $1" >&2; exit 1; }

# Pre-check
command -v node >/dev/null 2>&1 || error "Node.js not found. Run 02-install-node.sh first."
command -v docker >/dev/null 2>&1 || error "Docker not found. Run 03-install-docker.sh first."

# Idempotent check
if command -v openclaw >/dev/null 2>&1; then
    log "OpenClaw already installed ($(openclaw --version)). Skipping."
    exit 0
fi

# Install
log "Installing OpenClaw..."
npm install -g openclaw || error "npm install openclaw failed"

# Verify
openclaw --version || error "OpenClaw installed but --version failed"
log "OpenClaw installed successfully: $(openclaw --version)"
```

### QA Health Check 模板

```bash
#!/bin/bash
# Script: qa/health-check.sh
# Purpose: Verify all services are running correctly

PASS=0
FAIL=0

check() {
    local name="$1"
    local cmd="$2"
    if eval "$cmd" >/dev/null 2>&1; then
        echo "✅ $name"
        ((PASS++))
    else
        echo "❌ $name"
        ((FAIL++))
    fi
}

echo "=== OpenClaw Health Check ==="
echo ""

# Core
check "Node.js installed" "command -v node"
check "Docker running" "docker info"
check "OpenClaw daemon running" "systemctl --user is-active openclaw-daemon"
check "OpenClaw gateway running" "systemctl --user is-active openclaw-gateway"

# Tier 2+ components
check "Qdrant container running" "docker ps | grep -q qdrant"
check "Qdrant API responding" "curl -sf http://localhost:6333/healthz"
check "SearXNG container running" "docker ps | grep -q searxng"
check "SearXNG API responding" "curl -sf http://localhost:8888/healthz"

# Pi5-specific (if applicable)
if [[ -f /etc/wireguard/wg0.conf ]]; then
    check "WireGuard interface up" "ip link show wg0"
    check "VPN watchdog running" "systemctl --user is-active vpn-watchdog"
fi

check "Gateway watchdog running" "systemctl --user is-active gateway-watchdog"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [[ $FAIL -gt 0 ]]; then
    exit 1
fi
```

---

## 6. Config 管理

### 每客戶 .env Template

```bash
# configs/templates/openclaw.env.template
# ===== Client Config =====
CLIENT_ID="{CLIENT_ID}"
PLATFORM="{pi5|vps}"
TIER="{1|2|3}"

# ===== API Keys =====
ANTHROPIC_API_KEY="{中轉 API key}"
# OPENAI_API_KEY="{如需要}"

# ===== Telegram Bot =====
TELEGRAM_BOT_TOKEN="{bot token}"
TELEGRAM_ALLOWED_USERS="{user ID, comma separated}"

# ===== WhatsApp (Tier 2+) =====
# WHATSAPP_PHONE_NUMBER_ID="{phone number ID}"
# WHATSAPP_ACCESS_TOKEN="{access token}"

# ===== Mem0 + Qdrant (Tier 2+) =====
QDRANT_HOST="localhost"
QDRANT_PORT="6333"
MEM0_COLLECTION="{CLIENT_ID}_memory"

# ===== SearXNG (Tier 2+) =====
SEARXNG_URL="http://localhost:8888"

# ===== VPN (Pi5 / Tier 3) =====
# VPN_SERVER_1="jp-tokyo.example.com"
# VPN_SERVER_2="sg-singapore.example.com"

# ===== Production Config =====
OPENCLAW_BIND="0.0.0.0"
OPENCLAW_PORT="3000"
OPENCLAW_AUTH_TOKEN="{auto-generated}"
```

### SSH Config 管理

每個客加一個 SSH config snippet：

```
# ssh-configs/config.d/C005-pi5
Host client-c005
    HostName 100.x.x.x          # Tailscale IP
    User pi
    IdentityFile ~/.ssh/clawhk_c005
    StrictHostKeyChecking no
```

```
# ssh-configs/config.d/C006-vps
Host client-c006
    HostName 203.x.x.x          # Hetzner VPS IP
    User root
    IdentityFile ~/.ssh/clawhk_c006
    StrictHostKeyChecking no
```

用法：`Include ~/.ssh/clawhk/config.d/*` 加入你嘅 `~/.ssh/config`

---

## 7. 持續改進機制

### 每次安裝後

1. **記錄問題** — 遇到新 error → 加入 CLAUDE.md 嘅「常見問題處理」
2. **更新 scripts** — 如果某個步驟經常要 AI 介入 → 寫入 script
3. **Review setup-log** — 睇邊步最慢 → 優化

### Playbook 進化路線

```
Week 1-2:  CLAUDE.md 入面有好多「常見問題」需要 AI 判斷
Week 3-4:  最常見嘅問題已經寫入 scripts，AI 介入越嚟越少
Month 2:   90% 步驟自動化，AI 只做 final QA
Month 3+:  考慮 CLI headless 模式，並行安裝
```

> **核心理念：CLAUDE.md 就係你嘅「員工培訓手冊」。你而家 train 緊一個 AI 裝機員，呢份 playbook 會越用越強。每次安裝都係一次 training — 新問題、新解法、新 script 都會 feedback 入 playbook。**

---

## 📌 Action Items

| # | 項目 | 優先度 | 狀態 |
|---|------|--------|------|
| 1 | 建 `openclaw-installer/` 項目結構 | 🔴 高 | 🔲 待做 |
| 2 | 將 `pi5-setup-guide.md` 拆成 modular scripts（core/ + pi5/） | 🔴 高 | 🔲 待做 |
| 3 | 寫 CLAUDE.md playbook | 🔴 高 | 🔲 待做 |
| 4 | 建 `configs/templates/` 目錄 + env template | 🔴 高 | 🔲 待做 |
| 5 | 寫 QA scripts（health-check + verify-services + test-chat） | 🔴 高 | 🔲 待做 |
| 6 | 自己用 playbook 跑 2-3 次 Pi5 setup 驗證 | 🔴 高 | 🔲 待做 |
| 7 | 寫 VPS scripts（security-hardening + swap + systemd） | 🟡 中 | 🔲 待做 |
| 8 | 寫 VPS setup guide | 🟡 中 | 🔲 待做 |
| 9 | 測試 VPS (Hetzner) 完整安裝流程 | 🟡 中 | 🔲 待做 |
| 10 | 測試 Claude Code CLI headless mode | 🟢 低 | 🔲 待做 |
| 11 | 研究 Claude Agent SDK for automation | 🟢 低 | 🔲 待做 |
