# ClawHK API Pricing Research（2026年3月）

> **最後更新：** 2026-03-13
> **用途：** 為 ClawHK 蟹助手服務選擇 API provider，制定 Smart Routing 策略，計算 per-客成本
> **匯率：** 1 USD ≈ 7.2 CNY

---

## 📊 Quick Comparison — Chat Completion（每 1M tokens, USD）

### 平價 / Budget 級

| Provider | Model | Input | Output | Cache Hit Input | HK 可用？ |
|----------|-------|-------|--------|-----------------|-----------|
| **DeepSeek** | V3.2 (chat/reasoner) | $0.28 | $0.42 | $0.028 | ✅ 直接用 |
| **Azure OpenAI** | GPT-4.1-nano | $0.10 | $0.40 | $0.025 | ✅ 明確支持 HK |
| **Qwen** | qwen3.5-flash | $0.10 | $0.40 | — | ✅ SG endpoint |
| **Qwen** | qwen-turbo | $0.05 | $0.20 | — | ✅ SG endpoint |
| **智譜** | GLM-4.7-Flash | **免費** | **免費** | — | ✅ 港交所上市 |
| **智譜** | GLM-4.5-Flash | **免費** | **免費** | — | ✅ |
| **Gemini** | 2.5 Flash-Lite | $0.10 | $0.40 | — | ❌ HK restricted |
| **Azure OpenAI** | GPT-4o-mini | $0.15 | $0.60 | $0.075 | ✅ |

### 中端 / Standard 級

| Provider | Model | Input | Output | Cache Hit Input | HK 可用？ |
|----------|-------|-------|--------|-----------------|-----------|
| **Qwen** | qwen3.5-plus | $0.40 | $2.40 | — | ✅ |
| **Azure OpenAI** | GPT-4.1-mini | $0.40 | $1.60 | $0.10 | ✅ |
| **Kimi** | K2.5 | $0.60 | $3.00 | $0.10 | ✅ 冇限制 |
| **智譜** | GLM-4.7 | $0.60 | $2.20 | $0.11 | ✅ |
| **Gemini** | 2.5 Flash | $0.30 | $2.50 | — | ❌ |
| **智譜** | GLM-5 | $1.00 | $3.20 | $0.20 | ✅ |

### 高端 / Premium 級

| Provider | Model | Input | Output | Cache Hit Input | HK 可用？ |
|----------|-------|-------|--------|-----------------|-----------|
| **Azure OpenAI** | GPT-4.1 | $2.00 | $8.00 | $0.50 | ✅ |
| **Azure OpenAI** | GPT-4o | $2.50 | $10.00 | $1.25 | ✅ |
| **Gemini** | 2.5 Pro | $1.25 | $10.00 | — | ❌ |
| **Anthropic** | Sonnet 4.6 | $3.00 | $15.00 | $0.30 (cached read) | ❌ HK blocked |
| **Anthropic** | Opus 4.6 | $5.00 | $25.00 | $0.50 (cached read) | ❌ |
| **Azure OpenAI** | o4-mini | $1.10 | $4.40 | $0.275 | ✅ |
| **Azure OpenAI** | o3 | $2.00 | $8.00 | $0.50 | ✅ |

### Reasoning 級

| Provider | Model | Input | Output | HK 可用？ |
|----------|-------|-------|--------|-----------|
| **Azure OpenAI** | o4-mini | $1.10 | $4.40 | ✅ |
| **Azure OpenAI** | o3 | $2.00 | $8.00 | ✅ |
| **Qwen** | QwQ-Plus | $0.80 | $2.40 | ✅ |
| **Kimi** | K2-thinking | $0.60 | $2.50 | ✅ |
| **DeepSeek** | V3.2 reasoner | $0.28 | $0.42 | ✅ |

---

## 🔤 Embedding Models

| Provider | Model | Price / 1M tokens | Dimensions | 備註 |
|----------|-------|--------------------|------------|------|
| **Azure OpenAI** | text-embedding-3-small | **$0.02** | 1,536 | ⭐ 推薦用於 Mem0+Qdrant |
| **Azure OpenAI** | text-embedding-3-large | $0.13 | 3,072 | 更高精度 |
| Azure OpenAI | text-embedding-ada-002 | $0.10 | 1,536 | Legacy, 唔推薦 |

> ⚠️ **重要更正：`text-embedding-3-nano` 唔存在。** 最細嘅 embedding model 係 `text-embedding-3-small`。Business plan 需要更新呢個 reference。Azure OpenAI 嘅 embedding-3-small 已經好平（$0.02/1M），每月 embed 10,000 段 500-token 文字只需 ~$0.10。

---

## 🖼️ Vision Models

| Provider | Model | 額外收費？ | 備註 |
|----------|-------|-----------|------|
| **Azure OpenAI** | GPT-4o / 4.1 / 4.1-mini | 冇，按 input token 計 | ~765 tokens per 1024x1024 image |
| **Qwen** | qwen3.5-plus（原生多模態） | 冇額外費 | $0.40/1M input |
| **Kimi** | K2.5（原生多模態） | 冇額外費 | 15T mixed tokens 預訓練 |
| **智譜** | GLM-4.6V | $0.30/$0.90 per 1M | 128K context, tool calling |
| **智譜** | GLM-4.6V-Flash | **免費** | 9B 參數，可本地部署 |
| **Gemini** | 所有 2.5 系列 | 冇額外費 | HK restricted |
| **Anthropic** | 所有 Claude 4.x | 冇額外費 | HK restricted |
| **DeepSeek** | ❌ 暫無 Vision API | — | V4 預計會有，但 delay 中 |

---

## 🎨 Image Generation

| Provider | Model | Resolution | 價格 |
|----------|-------|------------|------|
| **Azure OpenAI** | DALL-E 3 Standard | 1024×1024 | $0.044/張 |
| **Azure OpenAI** | DALL-E 3 HD | 1024×1024 | $0.088/張 |
| **Azure OpenAI** | DALL-E 3 HD | 1792×1024 | $0.132/張 |
| **Gemini** | Imagen 4 | — | $0.02-$0.06/張 |

> Image generation 主要靠 Azure OpenAI (DALL-E 3)，因為 HK 可用。

---

## 🌏 Hong Kong 地區限制總覽

| Provider | HK 可直接用？ | 合法性 | 備註 |
|----------|--------------|--------|------|
| **Azure OpenAI** | ✅ **明確支持** | ✅ 合法 | Microsoft 官方聲明繼續服務 HK 客戶 |
| **DeepSeek** | ✅ | ✅ | HK 大學已部署（HKU, Lingnan）|
| **Qwen (DashScope)** | ✅ | ✅ | Singapore endpoint 延遲最低 |
| **智譜 (Z.ai)** | ✅ | ✅ | 港交所上市公司，有確認嘅 HK 客戶 |
| **Kimi (Moonshot)** | ✅ | ✅ | 冇地區限制，Global endpoint 可用 |
| **Anthropic** | ❌ **明確封鎖** | ❌ VPN 違反 ToS | 每次 request 都 check IP |
| **OpenAI (Direct)** | ❌ | ❌ | 2024年起封鎖 |
| **Google Gemini** | ❌ | ❌ | 三層偵測（IP + account region + browser）|

> ⭐ **關鍵發現：Azure OpenAI 係唯一合法用 GPT 系列嘅渠道。** 中國 provider（DeepSeek, Qwen, 智譜, Kimi）全部 HK 可用。

---

## 💳 月費 / Subscription 方案

### Consumer 月費

| Provider | Plan | 價格 | 可用於第三方 App (OpenClaw)? |
|----------|------|------|--------------------------|
| **Anthropic** | Pro | $20/月 | ❌ **2026年1月起禁止** OAuth token 用喺第三方 app |
| **Anthropic** | Max 5x | $100/月 | ❌ 同上 |
| **Google** | One AI Pro | $19.99/月 | ❌ 只限 Google 自家 interface |
| **Kimi** | Andante | ~$9/月 | ❌ Consumer app only，API 另計 |
| **智譜** | GLM Coding Pro | ~$21/月 | ⚠️ 只限 coding endpoint |

> ⚠️ **重要：Claude OAuth Token 自 2026年1月起已禁止用喺第三方 app。** Anthropic 用 client fingerprinting 執行，非官方 client 會收到 error。即係話客人嘅 Claude Pro/Max 月費 **唔可以** pass-through 去 OpenClaw / Telegram bot。唯一合規渠道係 API key (pay-per-token)。

### API 計費方式

| Provider | 計費方式 | 最低消費 | 免費額度 |
|----------|---------|---------|---------|
| **Azure OpenAI** | Pay-as-you-go (S0) | 冇 | 冇（但 Azure 新帳號有 $200 credit） |
| **DeepSeek** | Pay-as-you-go | 冇 | 5-10M tokens（30日有效） |
| **Qwen** | Pay-as-you-go + Savings Plan | 冇 | 1M tokens/model（90日有效） |
| **智譜** | Pay-as-you-go | 冇 | 25M tokens 新用戶禮物 |
| **Kimi** | Pay-as-you-go | $1 最低充值 | $5 充值送 $5 voucher |
| **Anthropic** | Pay-as-you-go | $5 deposit | ~$5 free credits |
| **Gemini** | Pay-as-you-go | 冇 | Free tier（5 RPM, 250K TPM）|

---

## ⚡ Rate Limits 比較

| Provider | Model | RPM | TPM | 備註 |
|----------|-------|-----|-----|------|
| **Qwen** | qwen3.5-plus (SG) | 15,000 | 5,000,000 | 🏆 最高 |
| **Qwen** | qwen3.5-flash (SG) | 15,000 | 5,000,000 | |
| **Azure OpenAI** | GPT-4.1-nano (Tier 1) | 5,000 | 5,000,000 | |
| **Azure OpenAI** | GPT-4.1 (Tier 1) | 1,000 | 1,000,000 | |
| **Gemini** | 2.5 Flash (Tier 1) | 150-300 | 1M-2M | |
| **DeepSeek** | V3.2 | ~500 (unofficial) | ~100K (unofficial) | 官方話「冇限制」|
| **Kimi** | K2.5 (Tier 1) | 200 | — | 需 $10 充值 |
| **Anthropic** | Sonnet 4.6 (Tier 1) | 50 | 30,000 ITPM | 🚨 最低 |

---

## 🧠 Smart Routing 建議

基於成本、HK 可用性、質量同 rate limit，推薦以下 routing 策略：

### Primary Route（日常對話）
```
DeepSeek V3.2 (chat) → $0.028-$0.28 input / $0.42 output
```
- 最平、HK 直接用、OpenAI-compatible
- Cache hit 只要 $0.028/1M = 幾乎免費
- 缺點：冇 Vision、中國 server（私隱考慮）

### Fallback 1（質量升級 / 需要 Vision）
```
Azure OpenAI GPT-4.1-mini → $0.40 input / $1.60 output
```
- HK 合法、有 Vision、Microsoft 品質保證
- 成本仍然好低

### Fallback 2（複雜推理）
```
Azure OpenAI o4-mini → $1.10 input / $4.40 output
或 Qwen QwQ-Plus → $0.80 input / $2.40 output
```

### Fallback 3（免費兜底）
```
智譜 GLM-4.7-Flash → 免費
```
- 完全免費、HK 可用、OpenAI-compatible
- 質量較低但可做 fallback

### Embedding（固定）
```
Azure OpenAI text-embedding-3-small → $0.02/1M tokens
```

### Image Generation
```
Azure OpenAI DALL-E 3 → $0.044-$0.132/張
```

### Tier 對應建議

| Service Tier | Primary Model | Fallback | 預計月成本/客 |
|-------------|---------------|----------|-------------|
| **Lite (HK$200)** | DeepSeek V3.2 | GLM-4.7-Flash (免費) | ~$0.50-2 |
| **Standard (HK$500)** | DeepSeek V3.2 + GPT-4.1-mini | Qwen qwen3.5-plus | ~$2-8 |
| **Premium (HK$1,200+)** | GPT-4.1 + o4-mini | DeepSeek reasoning | ~$5-20 |

---

## 💰 Per-客月成本估算

假設：每日 30 條 message，每條平均 500 tokens input + 800 tokens output

**每月 token 消耗：**
- Input: 30 × 500 × 30 = 450,000 tokens/月
- Output: 30 × 800 × 30 = 720,000 tokens/月
- Embedding (Mem0): ~50,000 tokens/月（memory 存取）

| Model | Input Cost | Output Cost | Embedding | 月總成本 |
|-------|-----------|-------------|-----------|---------|
| DeepSeek V3.2 (cache hit) | $0.013 | $0.302 | $0.001 | **~$0.32** |
| DeepSeek V3.2 (cache miss) | $0.126 | $0.302 | $0.001 | **~$0.43** |
| GPT-4.1-nano | $0.045 | $0.288 | $0.001 | **~$0.33** |
| GPT-4.1-mini | $0.180 | $1.152 | $0.001 | **~$1.33** |
| Qwen qwen3.5-flash | $0.045 | $0.288 | $0.001 | **~$0.33** |
| Qwen qwen3.5-plus | $0.180 | $1.728 | $0.001 | **~$1.91** |
| 智譜 GLM-4.7-Flash | $0.000 | $0.000 | $0.001 | **~$0.00** |
| GPT-4.1 | $0.900 | $5.760 | $0.001 | **~$6.66** |
| Claude Sonnet 4.6 | $1.350 | $10.800 | $0.001 | **~$12.15** |

### 重用戶估算（每日 100 條 message）

| Model | 月總成本 |
|-------|---------|
| DeepSeek V3.2 (cache hit) | **~$1.05** |
| GPT-4.1-nano | **~$1.11** |
| GPT-4.1-mini | **~$4.44** |
| GPT-4.1 | **~$22.20** |

### Margin 分析

以 Standard Tier（HK$500 安裝 + HK$50/月訂閱）為例：
- HK$50/月 ≈ $6.50 USD/月
- 用 DeepSeek V3.2 primary: 成本 ~$0.43-1.05/月 → **毛利 ~84-93%**
- 用 GPT-4.1-mini: 成本 ~$1.33-4.44/月 → **毛利 ~32-80%**
- 用 GPT-4.1: 成本 ~$6.66-22.20/月 → **毛利 -2% 至 -242%（蝕本）**

> ⭐ **結論：日常對話必須行 DeepSeek 或 GPT-4.1-nano/mini，高端 model 只適合 Premium tier 或 BYOK。**

---

## 🔑 OpenAI-Compatible API 支援

全部 provider 都支援 OpenAI SDK format，方便 OpenClaw 整合：

| Provider | Base URL | 備註 |
|----------|----------|------|
| **Azure OpenAI** | `https://{resource}.openai.azure.com/` | 需要 Azure-specific header |
| **DeepSeek** | `https://api.deepseek.com` | 完全 drop-in |
| **Qwen** | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | SG endpoint |
| **智譜** | `https://api.z.ai/api/paas/v4/` | International endpoint |
| **Kimi** | `https://api.moonshot.ai/v1` | Global endpoint |
| **Gemini** | 需要用 Vertex AI 或 Google SDK | 唔係 OpenAI-compatible |
| **Anthropic** | `https://api.anthropic.com/v1` | Anthropic SDK format |

---

## 📋 Action Items（更新 Todo）

基於呢份 research，以下係需要跟進嘅事項：

1. ~~開 DeepSeek 官方 API account~~ → **優先度最高，成本最低**
2. ~~測試 DeepSeek V3.2 實際成本 per 客~~ → 用上面估算作基準
3. 開 Azure OpenAI account → **唯一合法用 GPT 嘅渠道**
4. 開 Qwen DashScope account（Singapore region）→ 做 fallback
5. ~~開 Kimi API account~~ → 可做 secondary fallback
6. **更正 Business Plan：** `text-embedding-3-nano` 唔存在，改用 `text-embedding-3-small`
7. **更正 Business Plan：** Claude OAuth token 已禁止第三方 app 使用
8. 實作 Smart Routing：DeepSeek (primary) → GPT-4.1-mini (fallback) → GLM-4.7-Flash (免費兜底)
9. 評估 AWS Bedrock 作為 Claude access 嘅 gray area 方案

---

## 📚 Sources

各 provider 嘅官方定價頁面：
- [Azure OpenAI Pricing](https://azure.microsoft.com/en-us/pricing/details/azure-openai/)
- [DeepSeek API Pricing](https://api-docs.deepseek.com/quick_start/pricing)
- [Qwen DashScope Pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
- [智譜 Z.ai Pricing](https://docs.z.ai/guides/overview/pricing)
- [Kimi Moonshot Pricing](https://platform.moonshot.ai/docs/pricing/chat)
- [Anthropic Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Google Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing)

> ⚠️ 價格會變動，建議每月 review。中國 provider 價格戰激烈，可能會繼續減價。
