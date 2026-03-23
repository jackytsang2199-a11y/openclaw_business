# Pi5 Setup Inventory — 比標準 OpenClaw 多咩

> 完整 review 我哋 Pi5 嘅 custom stack。標準 OpenClaw 係 baseline，呢份文檔 list 晒所有 extras。

*Last updated: 2026-03-13 by Marigold 🌼*

---

## 標準 OpenClaw Baseline（大家都有）

- OpenClaw daemon (`openclaw` process)
- OpenClaw Gateway (`openclaw-gateway` process)
- Telegram channel
- Basic heartbeat
- Sub-agents, cron jobs
- Built-in `web_search` (Brave API) — **我哋冇用，用 SearXNG 代替**

---

## 我哋的 Extras

---

### 1. 🧠 Mem0 OSS — Long-term Memory with Vector DB

**Plugin:** `@mem0/openclaw-mem0` v0.1.2  
**Mode:** Open-source (self-hosted, 唔係 Mem0 cloud)

| 組件 | 詳情 |
|------|------|
| **Vector Store** | Qdrant (`marigold-memories` collection) |
| **Embedder** | OpenAI `text-embedding-3-small` (1536 dims) |
| **LLM (memory extraction)** | OpenAI `gpt-4.1-nano` |
| **History DB** | `/home/jacky999/clawd/mem0-history.db` (SQLite) |
| **Auto Capture** | ✅ 開咗 — 自動從對話抽取記憶 |
| **Auto Recall** | ✅ 開咗 — 回覆前自動搜尋相關記憶 |
| **User ID** | `jacky` |

**作用：** 唔同 session 之間都記住 Jacky 嘅 preferences、decisions、context。標準 OpenClaw 係無狀態嘅，加咗呢個先有真正嘅長期記憶。

---

### 2. 🗄️ Qdrant — Vector Database

**Docker Container:** `qdrant`  
**Image:** `qdrant/qdrant:latest`  
**Ports:** `6333` (HTTP REST API), `6334` (gRPC)  
**Restart Policy:** `unless-stopped`  
**Collection:** `marigold-memories`

```bash
# Check status
docker ps --filter name=qdrant

# REST API
curl http://localhost:6333/collections
```

**作用：** Mem0 嘅向量記憶儲存。每條記憶會 embed 成 1536 維向量，Qdrant 做 semantic search。搵記憶唔係靠 keyword，係靠語意相似度。

---

### 3. 🔍 SearXNG — Self-hosted Search Engine

**Docker Container:** `searxng`  
**Image:** `searxng/searxng:latest`  
**Port:** `8888` (host) → `8080` (container)  
**Restart Policy:** `always`  
**Helper Script:** `~/clawd/scripts/searxng-search.sh`

```bash
# Basic search
~/clawd/scripts/searxng-search.sh "query" 5

# JSON API
curl "http://localhost:8888/search?q=QUERY&format=json"
```

**作用：** 替代 Brave Search API，完全 self-hosted，無 API key，無 quota。聚合 Google/Bing/Reddit 等多個引擎。Reddit AI block bypass（詳見 `docs/searxng-setup.md`）。

---

### 4. 🛡️ Gateway Watchdog

**Script:** `~/scripts/gateway-watchdog.sh`  
**Process:** 常駐 bash process（隨 OpenClaw 啟動）

**邏輯：**
- 每 60 秒 ping Telegram API (`getMe`)
- 連續 3 次失敗 → 自動 `systemctl --user restart openclaw-gateway.service`
- Restart 後等 30 秒再繼續 monitor
- Log: `/tmp/openclaw/watchdog.log`

**作用：** Gateway crash 或者 Telegram 斷線後自動恢復，唔需要手動重啟。

---

### 5. 🌐 VPN Watchdog (Multi-server Fallback)

**Script:** `~/scripts/vpn-watchdog.sh`  
**Process:** 常駐 bash process（隨 OpenClaw 啟動）

**邏輯：**
- 每 30 秒 `ping 1.1.1.1` 確認 VPN 連通性
- 連續 3 次失敗 → restart WireGuard `wg0`
- 連續 2 次 restart 失敗 → **自動切換去下一個 VPN server**
- Log: `/tmp/openclaw/vpn-watchdog.log`

**Server 配置：**
| Server | Config File | Endpoint |
|--------|------------|---------|
| 1 (default) | `/etc/wireguard/wg0-server1.conf` | — |
| 2 | `/etc/wireguard/wg0-server2.conf` | jp-tok |
| 3 | `/etc/wireguard/wg0-server3.conf` | sg-sng |

**作用：** VPN 掉線自動 reconnect，一個 server 死就切換下一個，確保 Pi 全時保持 VPN 保護。

---

### 6. 🔒 WireGuard VPN

**Service:** `wg-quick@wg0.service` (systemd, enabled)  
**Active:** 已運行 3+ 週

Pi 嘅所有出站流量走 WireGuard VPN。

---

### 7. 🌐 Chromium Browser (OpenClaw Browser Control)

**Process:** Chromium with remote debugging  
**Debug Port:** `18800`  
**Profile:** `openclaw` (isolated)  
**User Data:** `~/.openclaw/browser/openclaw/user-data`

**作用：** 俾 OpenClaw `browser` tool 用嚟做 web automation、snapshots、screenshots。標準 OpenClaw 支援，但需要 display + browser 先跑到。

---

### 8. ⚙️ OpenClaw Config Extras

呢啲係我哋 `openclaw.json` 裡面相比 default 改咗嘅設定：

| 設定 | 我哋的值 | 作用 |
|------|---------|------|
| `gateway.bind` | `lan` | Gateway 喺 LAN 可 access，唔係只 localhost |
| `gateway.auth.mode` | `token` | Gateway API 需要 auth token |
| `gateway.controlUi.allowedOrigins` | 2 origins | 允許 local UI 連接 |
| `agents.defaults.maxConcurrent` | `4` | 同時最多 4 個 agent session |
| `agents.defaults.subagents.maxConcurrent` | `8` | 同時最多 8 個 sub-agent |
| `agents.defaults.contextPruning` | `cache-ttl: 1h` | Context cache 1小時 TTL |
| `agents.defaults.compaction` | `safeguard` | 安全 compaction mode |
| `agents.defaults.heartbeat` | `every: 1h` | 每小時 heartbeat |
| `auth.profiles` | 2 profiles | `anthropic:default` + `anthropic:jacky_daomaster` |
| `session.dmScope` | `main` | DM → main session |
| `channels.telegram.dmPolicy` | `allowlist` | 只允許 whitelist 的 Telegram user |
| `plugins.slots.memory` | `openclaw-mem0` | 使用 Mem0 OSS 代替 built-in memory |

---

### 9. 🐘 PostgreSQL

**Service:** `postgresql.service` (systemd, enabled)  
**Status:** Installed，service enabled（目前 exited/standby 狀態）

可能係某些 local 工具嘅 dependency，或者 future use。

---

## 架構總覽

```
┌─────────────────────────────────────────────────┐
│                  Raspberry Pi 5                  │
│                                                 │
│  ┌─────────────┐    ┌──────────────────────┐   │
│  │  openclaw   │    │  openclaw-gateway    │   │
│  │  (daemon)   │    │  port: 18789 (LAN)   │   │
│  └──────┬──────┘    └──────────┬───────────┘   │
│         │                      │               │
│  ┌──────▼──────────────────────▼───────────┐   │
│  │           Plugins & Extensions          │   │
│  │  ┌─────────────────────────────────┐   │   │
│  │  │  openclaw-mem0 (Mem0 OSS)       │   │   │
│  │  │  → Qdrant :6333 (marigold-      │   │   │
│  │  │    memories collection)         │   │   │
│  │  │  → OpenAI embeddings + GPT nano │   │   │
│  │  └─────────────────────────────────┘   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   SearXNG    │  │  Chromium Browser       │ │
│  │  :8888       │  │  debug port: 18800      │ │
│  │  (Docker)    │  │  (OpenClaw browser ctrl)│ │
│  └──────────────┘  └─────────────────────────┘ │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │           Watchdog Scripts               │  │
│  │  gateway-watchdog.sh  vpn-watchdog.sh    │  │
│  │  (ping Telegram API)  (ping 1.1.1.1)     │  │
│  │  → restart gateway    → restart WG       │  │
│  │                       → switch VPN server│  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  WireGuard VPN (wg-quick@wg0)            │  │
│  │  3 servers: default / jp-tok / sg-sng    │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
           │
           ▼
      Telegram API ←→ Jacky
```

---

## Quick Status Check

```bash
# 一次過 check 所有 extras
echo "=== Docker ===" && docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "=== VPN ===" && sudo wg show wg0 2>/dev/null | head -5
echo "=== Watchdogs ===" && ps aux | grep "watchdog.sh" | grep -v grep
echo "=== Qdrant ===" && curl -s http://localhost:6333/collections | python3 -m json.tool 2>/dev/null | head -10
echo "=== SearXNG ===" && curl -sf http://localhost:8888/ > /dev/null && echo "OK" || echo "DOWN"
```
