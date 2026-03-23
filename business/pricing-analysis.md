# ClawHK 蟹助手 — 定價分析（2026-03-16）

> **狀態：** 已確認（暫定，實測 API 成本後 fine-tune）
> **依據：** [api-pricing-research-2026-03.md](api-pricing-research-2026-03.md) 實際數據
> **關聯：** [openclaw-setup-business-plan-v1.md](openclaw-setup-business-plan-v1.md) §2

---

## 1. API 成本實際分析

### 每條 Message 成本（500 tokens input + 800 tokens output）

| Model | 每條成本 (USD) | 每條成本 (HK$) | HK 可用？ |
|---|---|---|---|
| **DeepSeek V3.2 (cache hit)** | $0.000310 | $0.0024 | ✅ |
| **DeepSeek V3.2 (cache miss)** | $0.000476 | $0.0037 | ✅ |
| **GPT-4.1-nano (Azure)** | $0.000370 | $0.0029 | ✅ |
| **智譜 GLM-4.7-Flash** | $0.000000 | **免費** | ✅ |
| **GPT-4.1-mini (Azure)** | $0.001480 | $0.0115 | ✅ |
| **Qwen qwen3.5-flash** | $0.000370 | $0.0029 | ✅ |
| **GPT-4.1 (Azure)** | $0.007400 | $0.0577 | ✅ |
| **Claude Sonnet 4.6** | $0.013500 | $0.1053 | ❌ 需 VPN |

### 每月成本 Per 客

| 使用量 | DeepSeek V3.2 | GPT-4.1-mini | GPT-4.1 | Claude Sonnet |
|---|---|---|---|---|
| **30 條/日（普通）** | HK$2-3 | HK$10 | HK$52 | HK$95 |
| **100 條/日（重度）** | HK$7-10 | HK$33 | HK$173 | HK$316 |

### Embedding 成本（Mem0 用 `text-embedding-3-small`）

| 使用量 | 月 Embedding Calls | 月成本 |
|---|---|---|
| 30 條/日 | ~1,350-2,700 | **HK$0.07** |
| 100 條/日 | ~4,500-9,000 | **HK$0.3** |

> **結論：Embedding 成本可忽略不計。**

### 關鍵發現

```
HK$100 API credit (DeepSeek) = ~27,000 條 message = 普通用家用 9 個月

→ API 充值制唔 make sense — 充一次用大半年
→ 改為全包月費，API 成本攤入月費
→ VPS 佔總成本 70-80%，API 只佔 5-15%
```

---

## 2. 確認定價（全包月費制）

### 收費模式

**由 Model C（安裝費 + VPS 月費 + API 充值）改為全包月費制。**

原因：
1. API 成本極低（DeepSeek 每客每月 HK$2-10），充值制收唔到錢
2. 全包月費客人體驗最好 — 每月一筆，唔使煩
3. 管理簡單 — 唔使 track 充值餘額
4. Margin 更高更穩定

### Tier 命名同定價

| | 🌱 **新手上路** | ⭐ **智能管家** | 🚀 **全能大師** |
|---|---|---|---|
| **安裝費（原價）** | HK$400 | HK$800 | HK$1,800 |
| **🔥 開業限時半價** | **HK$200** | **HK$400** | **HK$900** |
| **月費（全包）** | **HK$148/月** | **HK$248/月** | **HK$388/月** |
| **年費（85折）** | HK$1,508/年 | HK$2,528/年 | HK$3,958/年 |

### 每個 Tier 包咩

| 功能 | 🌱 新手上路 | ⭐ 智能管家 | 🚀 全能大師 |
|---|---|---|---|
| **VPS Hosting** | ✅ Contabo Japan 8GB | ✅ | ✅ |
| **AI Model** | DeepSeek only | DeepSeek + GPT-4.1-mini | DeepSeek + GPT-4.1 + Claude |
| **Messaging** | Telegram only | Telegram + WhatsApp | 全平台 |
| **🧠 記憶 (Mem0)** | ❌ | ✅ | ✅ + 自訂 personality |
| **🔍 搜尋 (SearXNG)** | ❌ | ✅ | ✅ + 自訂配置 |
| **🌐 Browser** | ❌ | ❌ | ✅ Chromium |
| **VPN + Watchdog** | ❌ | ✅ Gateway watchdog | ✅ 全套 |
| **售後支援** | AI 客服 only | AI + 7 日人手 | AI + 30 日人手 |
| **每日 message 上限** | 100 條 | 300 條 | 1,000 條 |

### 超額保護

| 每日上限 | 月 API 成本（DeepSeek） | Margin 影響 |
|---|---|---|
| 100 條 | ~HK$11 | 零風險 |
| 300 條 | ~HK$33 | 低風險 |
| 1,000 條 | ~HK$111 | Tier 3 margin 仍正 |
| 3,000 條（hard cap = 3x） | ~HK$333 | ⚠️ 需 hard cap |

- **Soft limit：** 到達日上限時 AI 提醒
- **Hard cap：** 3x 日上限（正常人永遠唔會到）
- **極端 case：** 如發現 scripted abuse → 暫停服務

---

## 3. Margin 分析

### 你嘅成本 Per 客 Per 月

| 成本項 | 新手上路 | 智能管家 | 全能大師 |
|---|---|---|---|
| VPS (Contabo Japan 8GB) | HK$53 | HK$53 | HK$53 |
| VPN (Surfshark 分攤 10+ 客) | HK$2 | HK$3 | HK$5 |
| API - DeepSeek (primary) | HK$2-3 | HK$3-5 | HK$5-10 |
| API - GPT/Claude (fallback) | — | HK$3-5 | HK$15-25 |
| Embedding (Mem0) | — | HK$0.1 | HK$0.3 |
| 維護 / monitoring | HK$5 | HK$5 | HK$5 |
| **Total 成本** | **~HK$62** | **~HK$67** | **~HK$93** |

### Margin 表

| | 🌱 新手上路 | ⭐ 智能管家 | 🚀 全能大師 |
|---|---|---|---|
| **月費** | HK$148 | HK$248 | HK$388 |
| **成本** | ~HK$62 | ~HK$67 | ~HK$93 |
| **月 Margin** | **HK$86（58%）** | **HK$181（73%）** | **HK$295（76%）** |
| **安裝費利潤（半價期）** | HK$180 | HK$340 | HK$800 |
| **安裝費利潤（原價）** | HK$380 | HK$740 | HK$1,700 |
| **首年利潤/客（半價）** | **HK$1,212** | **HK$2,512** | **HK$4,340** |
| **首年利潤/客（原價）** | **HK$1,412** | **HK$2,912** | **HK$5,240** |

---

## 4. 市場定位

### HK 月費 Benchmark

| 服務 | 月費 | 包 API？ | 包 Hosting？ | 包記憶？ |
|---|---|---|---|---|
| ChatGPT Plus | HK$156 | ✅ 有限 | N/A | ❌ 有限 |
| Claude Pro | HK$156 | ✅ 有限 | N/A | ❌ |
| SetupClaw (外國) | ~HK$230-380 | ❌ 自己搞 | ❌ 自己搞 | ❌ |
| Netflix Standard | HK$93 | N/A | N/A | N/A |
| YouTube Premium | HK$68 | N/A | N/A | N/A |
| **蟹助手 智能管家** | **HK$248** | **✅ 全包** | **✅ 全包** | **✅ Mem0** |

### 賣點 vs ChatGPT Plus

> **「貴 ChatGPT Plus HK$92，但你攞到：**
> - 完全屬於你嘅 AI 助手（唔係共用）
> - 長期記憶（記得你所有對話）
> - 自架搜尋（包 Reddit，無 quota）
> - Telegram/WhatsApp 24/7 on call
> - 完全私隱（data 喺你自己 server）
> - 廣東話專業支援」

---

## 5. 開業限時半價策略

```
🔥 開業優惠 — 頭 20 位客人安裝費半價！

  🌱 新手上路：HK$400 → HK$200
  ⭐ 智能管家：HK$800 → HK$400
  🚀 全能大師：HK$1,800 → HK$900

  名額有限，先到先得
```

- **限 20 個名額** — 製造 scarcity + urgency
- **只限安裝費半價，月費唔打折** — 月費係長期收入
- **Phase 1 Soft Launch 用** — 換 testimonial + 口碑
- **之後恢復原價** — 早期客覺得自己「賺咗」，更 loyal

---

## 6. Scale 預測

> 以全部 ⭐ 智能管家 估算（主推 Tier）

| 客戶數 | 月費收入 | 月 Margin | 累計安裝費（半價） | 備注 |
|---|---|---|---|---|
| 5 客 | HK$1,240 | HK$905 | HK$2,000 | Soft launch（半價期） |
| 10 客 | HK$2,480 | HK$1,810 | HK$4,000 | 半價期尾聲 |
| 20 客 | HK$4,960 | HK$3,620 | HK$8,000 | 半價名額用完，恢復原價 |
| 30 客 | HK$7,440 | HK$5,430 | HK$16,000 | 3 個月目標 |
| 100 客 | HK$24,800 | HK$18,100 | HK$72,000 | 6 個月目標 |
| 300 客 | HK$74,400 | HK$54,300 | HK$232,000 | 1 年目標 |

---

## 7. 待實測後 Fine-tune

| 項目 | 依賴 | 影響 |
|---|---|---|
| DeepSeek V3.2 實際 per-message 成本 | 開 account + 實測 | 確認月費 margin 是否足夠 |
| Contabo Japan 延遲 | 開 VPS + ping test | 確認 VPS 選擇 |
| LiteLLM per-client metering | Setup + 測試 | 確認用量 tracking 可行 |
| 重度用家 300 條/日嘅 API 成本 | 模擬測試 | 確認 soft limit 設定 |
| GPT-4.1-mini 同 DeepSeek 嘅成本差異 | 實際 routing 測試 | Smart routing threshold |

---

## Sources

- [API Pricing Research](api-pricing-research-2026-03.md)
- [Business Plan v1](openclaw-setup-business-plan-v1.md) §2, §4, §11
