# Legal Analysis: Hong Kong AI API Reseller Business Model
# 法律分析：香港 AI API 轉售業務模式

**Date / 日期:** 2026-03-13
**Prepared by:** Legal Advisory Analysis
**Classification:** CONFIDENTIAL - Business Strategy
**Disclaimer:** This analysis is for informational purposes only and does not constitute legal advice. Consult a qualified Hong Kong solicitor before acting on any recommendations.

---

## EXECUTIVE SUMMARY / 重點摘要

**There is a fundamental, deal-breaking problem with both proposed approaches.**

香港 (Hong Kong) 係 Anthropic 同 OpenAI 嘅 **受限制地區 (restricted region)**。兩間公司都已經喺 2024-2025 年正式封鎖咗香港嘅直接 API 存取。呢個唔係一個「可以管理嘅風險」-- 呢個係你成個商業模式嘅基礎性問題。

Both Anthropic (Claude) and OpenAI (GPT) have officially blocked Hong Kong from their supported countries/territories lists. This means:

1. **Approach 1 (Official API Keys):** You cannot legally obtain direct API keys from either provider while operating from Hong Kong.
2. **Approach 2 (Third-party resellers like DMXAPI):** These platforms are almost certainly circumventing the same geo-restrictions, compounding your legal exposure.

The entire business model needs to be reconsidered around legitimate access channels.

---

## PART 1: REGIONAL ACCESS RESTRICTIONS / 地區存取限制

### 1.1 Anthropic (Claude API)

**Status: Hong Kong is NOT a supported region.**

- Anthropic 嘅支援國家名單明確排除咗香港、中國大陸同澳門
- 2025 年 9 月，Anthropic 更新咗 ToS，進一步禁止由受限地區實體持有超過 50% 股權嘅公司使用服務，無論佢哋喺邊度營運
- Anthropic 會檢查 IP 地址，唔止係註冊時，而係每次使用時都會檢查
- 用 VPN 繞過地理限制本身就違反 ToS

**Implications:**
- A Hong Kong-registered company cannot obtain Anthropic API keys directly
- Even if you register through a third country, using the service from HK IPs violates the terms
- The September 2025 ownership clause means even a subsidiary structure may not work if the parent is HK-based

**Source:** [Anthropic Supported Countries](https://www.anthropic.com/supported-countries); [SCMP: Anthropic blocks Chinese firms](https://www.scmp.com/tech/tech-war/article/3324504/tech-war-us-start-anthropic-blocks-chinese-firms-subsidiaries-worldwide-ai-access)

### 1.2 OpenAI (GPT API)

**Status: Hong Kong is NOT a supported region (since July 2024).**

- OpenAI 喺 2024 年 7 月 9 日正式封鎖咗香港嘅 API 存取
- 香港被歸類為同中國大陸相同嘅限制類別
- 直接使用 OpenAI API 會導致帳戶被暫停或封鎖

**Source:** [OpenAI Supported Countries](https://platform.openai.com/docs/supported-countries); [The Register: OpenAI pulls plug on unsupported nations](https://www.theregister.com/2024/06/25/openai_unsupported_countries/)

### 1.3 The Azure OpenAI Exception / Azure OpenAI 例外

**This is critically important for your business model.**

Microsoft Azure OpenAI Service 仍然喺香港可用。Microsoft 已經明確表示佢哋會繼續為香港合資格客戶提供 OpenAI 模型嘅存取，通過部署喺香港以外地區嘅模型。

- Azure OpenAI is available to eligible Hong Kong business customers
- Models are deployed in regions outside HK but accessible to HK businesses
- This is the **only legitimate channel** for OpenAI models in Hong Kong
- Pricing is different from direct OpenAI API (generally higher)
- Requires Azure enterprise subscription and approval process

**Source:** [SCMP: Microsoft maintains AI services in HK](https://www.scmp.com/tech/big-tech/article/3268233/microsoft-maintains-ai-services-hong-kong-openai-curbs-api-access-china); [Microsoft News Center HK](https://news.microsoft.com/en-hk/2023/03/23/enterprise-grade-gpt-capabilities-are-now-available-for-hong-kong-users/)

### 1.4 Amazon Bedrock (Claude via AWS)

Amazon Bedrock 提供 Claude 模型嘅存取，但香港 (ap-east-1) 唔係 Bedrock 嘅直接支援區域。不過，你可能可以通過附近區域（如新加坡 ap-southeast-1）嘅跨區域推理 (cross-region inference) 黎存取。

- Need to verify current Anthropic restrictions on Bedrock usage from HK
- Even if AWS allows it technically, Anthropic's ownership clause may still apply
- Requires careful legal review of both AWS and Anthropic terms

**Risk Level: UNCERTAIN - requires direct confirmation from AWS and Anthropic**

---

## PART 2: TERMS OF SERVICE ANALYSIS / 服務條款分析

### 2.1 Anthropic API ToS -- Building Services vs. Reselling

即使你唔喺受限地區，Anthropic 嘅 ToS 對「轉售」同「建基於 API 之上嘅服務」有明確區分：

**ALLOWED (if in a supported region):**
- Building commercial applications that incorporate Claude API calls
- Creating value-added services where Claude is one component of a larger product
- Charging customers for your application that uses Claude under the hood

**PROHIBITED:**
- Reselling raw API access (acting as a passthrough/proxy)
- Sharing or redistributing API keys
- "Wrapper" apps that are essentially just a skin over the Claude API with no substantial added value
- Using subscription-based authentication to provide API access to third parties
- Using OAuth tokens from consumer subscriptions in third-party tools (explicitly banned Feb 2026)

**The "Wrapper" Test:** Anthropic 嘅立場越嚟越清晰 -- 如果移除 Claude API 呼叫之後，你嘅產品就變成空殼，咁你就係喺轉售而唔係喺「建構服務」。

**Source:** [SitePoint: End of Wrapper Era](https://www.sitepoint.com/end-wrapper-era-anthropic-api-terms-saas/); [VentureBeat: Anthropic cracks down](https://venturebeat.com/technology/anthropic-cracks-down-on-unauthorized-claude-usage-by-third-party-harnesses)

### 2.2 OpenAI API ToS -- Building Services vs. Reselling

OpenAI 嘅服務協議（2025 年 5 月 31 日生效版本）：

**ALLOWED (if in a supported region):**
- Integrating OpenAI API into "Customer Applications"
- Making Customer Applications available to End Users
- Commercial use of outputs (customer retains ownership of outputs)

**PROHIBITED:**
- Buying, selling, or transferring API keys from/to/with third parties
- Making account access credentials available to third parties
- Sharing individual login credentials between multiple users
- Reselling or leasing access to your account or any End User Account

**Key Distinction:** OpenAI 明確允許你將 API 整合到你自己嘅應用程式中並向用戶收費。但你唔可以直接轉售 API 存取權或分享 API key。

**Source:** [OpenAI Service Terms](https://openai.com/policies/service-terms/); [OpenAI Services Agreement](https://openai.com/policies/services-agreement/)

---

## PART 3: THIRD-PARTY RESELLERS RISK ANALYSIS / 第三方轉售商風險分析

### 3.1 DMXAPI, APIYI, UIUIAPI, Boluoduo AI (柏拉图AI)

**Risk Level: EXTREMELY HIGH / 風險等級：極高**

呢啲平台嘅運作模式存在嚴重法律問題：

**How they likely operate:**
- 通過支援地區嘅帳戶或公司獲取 API key
- 將流量通過非受限地區嘅伺服器路由
- 提供「折扣價」-- 呢個本身就係危險信號，因為佢哋唔可能合法地以低於官方嘅價格提供服務
- 聲稱係「授權轉售商」但無法提供可驗證嘅授權證明

**Why they are almost certainly unauthorized:**
1. Neither Anthropic nor OpenAI has a public authorized reseller program for API access (only cloud partners like AWS, Azure, GCP)
2. 佢哋提供嘅折扣價格意味住佢哋要麼虧本經營，要麼使用未經授權嘅存取方式
3. Both providers explicitly prohibit API key transfer and resale
4. Anthropic specifically bans access from China and entities controlled by Chinese companies
5. 「聚合 300+ 模型」嘅聲稱本身就暗示咗未經授權嘅存取 -- 冇任何一個平台被所有 300+ 模型嘅提供商授權

**Specific Risks / 具體風險:**

| Risk | Impact | Likelihood |
|------|--------|------------|
| API keys get banned without notice | Service completely stops, customers affected | HIGH |
| Keys sourced from stolen credentials or fraudulent accounts | Criminal liability exposure | MEDIUM |
| Upstream provider takes legal action against reseller | Your supply chain collapses | MEDIUM |
| Data passes through unknown intermediary servers | Data breach, privacy violation | HIGH |
| Reseller disappears overnight | Total loss of service, no recourse | HIGH |
| Your business associated with ToS violation chain | Reputational damage, potential legal action | MEDIUM |

### 3.2 Data Privacy Exposure / 數據私隱風險

使用第三方轉售商意味住你客戶嘅數據會經過額外嘅中間層：

- 你唔知道數據係咪被記錄、儲存或分析
- 喺香港嘅《個人資料（私隱）條例》(PDPO) 下，你作為數據控制者有責任確保數據處理嘅安全性
- 如果客戶數據通過呢啲平台洩露，你（唔係轉售商）要承擔對客戶嘅法律責任
- 你無法對呢啲平台進行有意義嘅盡職調查

### 3.3 Liability if Keys Get Banned / Key 被封禁嘅責任

如果第三方轉售商嘅 key 被封禁：

- **對客戶嘅合約責任:** 你承諾提供服務但無法交付，構成違約
- **退款義務:** 預付費用可能需要退還
- **聲譽損害:** 客戶信任一旦失去就好難恢復
- **無追索權:** 你幾乎無法向呢啲平台追討損失，因為佢哋本身嘅運作就可能違法
- **連帶責任風險:** 如果 key 係通過欺詐手段獲取嘅，你可能被視為共謀

---

## PART 4: HONG KONG LEGAL LANDSCAPE / 香港法律環境

### 4.1 Current AI Regulation

香港目前冇專門嘅 AI 法規。2025 年 4 月，數碼政策辦公室發布咗《生成式人工智能技術及應用指引》，但呢啲指引係自願性質嘅。

**Relevant existing laws:**
- **個人資料（私隱）條例 (PDPO):** 適用於處理客戶個人數據
- **商品說明條例:** 如果你聲稱提供「官方 AI 服務」但實際通過未授權渠道，可能構成虛假商品說明
- **合約法 (普通法):** 服務合約嘅基本原則適用
- **電腦犯罪條例:** 使用未經授權嘅存取方式可能觸犯

**Source:** [GLI: AI Laws in Hong Kong](https://www.globallegalinsights.com/practice-areas/ai-machine-learning-and-big-data-laws-and-regulations/hong-kong/); [White & Case: AI Watch Hong Kong](https://www.whitecase.com/insight-our-thinking/ai-watch-global-regulatory-tracker-hong-kong)

### 4.2 Trade Descriptions Ordinance Risk / 商品說明條例風險

呢個值得特別注意。如果你向客戶推銷「Claude AI 助手」或「GPT 驅動嘅服務」，但實際上通過未經授權嘅第三方渠道提供，你可能面對：

- 虛假商品說明嘅刑事檢控
- 消費者投訴同民事索賠
- 香港海關嘅調查

### 4.3 US Export Control Implications / 美國出口管制影響

呢個係一個經常被忽視但非常嚴重嘅問題：

- 美國嘅 AI 出口管制越嚟越嚴格
- 繞過地理限制存取美國 AI 服務可能觸犯美國出口管制法
- 雖然香港唔係被制裁嘅司法管轄區，但被歸類為受限地區意味住存在合規風險
- 呢啲限制反映咗更廣泛嘅中美科技戰背景

---

## PART 5: BYOK (BRING YOUR OWN KEY) MODEL / 自帶密鑰模式

### 5.1 How BYOK Works

BYOK 模式下，你嘅客戶自己獲取同管理 API key，你只提供軟件平台同技術支援：

- Customer registers directly with OpenAI/Anthropic (or Azure/Bedrock)
- Customer enters their own API key into your software
- Your software makes API calls using the customer's key
- Customer pays the AI provider directly for usage
- You charge for your software/service, not for AI access

### 5.2 BYOK Legal Analysis

**Advantages / 優點:**
- 你唔係轉售 API 存取，所以唔違反「禁止轉售」條款
- API 使用關係直接喺客戶同提供商之間
- 你唔承擔 API 存取中斷嘅責任
- 數據唔經過你嘅伺服器（如果實現正確的話）
- 符合 JetBrains、Vercel、Cloudflare 等主流平台採用嘅模式

**BUT -- The Hong Kong Problem Remains / 但係 -- 香港問題仍然存在:**
- 如果你嘅客戶喺香港，佢哋同樣無法直接從 OpenAI 或 Anthropic 獲取 API key
- BYOK 唔能解決地理限制嘅根本問題
- 你嘅客戶仍然需要通過合法渠道獲取 key

**BYOK + Azure OpenAI:** 呢個係目前最可行嘅合法組合。你嘅客戶可以：
- 申請 Azure 帳戶（Azure 喺香港可用）
- 通過 Azure OpenAI Service 獲取 API 存取權
- 將 Azure API key 輸入你嘅軟件
- 你收取軟件服務費，客戶直接向 Microsoft 付費

### 5.3 BYOK Risk Assessment

| Factor | Risk Level | Notes |
|--------|-----------|-------|
| ToS compliance | LOW | Not reselling, customer has direct relationship |
| Liability for API issues | LOW | Customer's key, customer's problem |
| Data privacy | LOW-MEDIUM | Depends on architecture; if data routes through your servers, still need DPA |
| Revenue model | MEDIUM | Can't mark up API costs; revenue only from software fees |
| Customer friction | HIGH | More complex setup, customer needs Azure account |
| Business sustainability | MEDIUM | Lower margins but much lower risk |

---

## PART 6: RECOMMENDATIONS / 建議

### 6.1 AVOID -- What NOT to Do / 唔好做嘅嘢

1. **唔好直接從 OpenAI 或 Anthropic 買 API key** -- 香港係受限地區，你拎唔到合法嘅 key
2. **唔好用 DMXAPI / APIYI / UIUIAPI / 柏拉图AI** -- 呢啲平台幾乎肯定未經授權，用佢哋嘅 key 隨時可以被封，仲可能涉及法律問題
3. **唔好用 VPN 繞過地理限制** -- 呢個違反 ToS，而且越嚟越容易被偵測
4. **唔好向客戶聲稱你提供「官方」AI 服務** -- 如果你嘅供應鏈唔合法，呢個可能觸犯商品說明條例

### 6.2 RECOMMENDED APPROACH -- Legitimate Business Model / 建議嘅合法商業模式

**Option A: Azure-Based Service (RECOMMENDED) / 基於 Azure 嘅服務（推薦）**

```
Business Model Architecture:
┌─────────────────────────────────────────────────┐
│  Your Company (HK)                              │
│  - Self-hosted AI assistant software            │
│  - Custom prompts, workflows, integrations      │
│  - Customer support & maintenance               │
│  - Monthly SaaS fee (your revenue)              │
└──────────────────┬──────────────────────────────┘
                   │ Software provides interface to
                   v
┌─────────────────────────────────────────────────┐
│  Azure OpenAI Service                           │
│  - Legitimate access in HK                      │
│  - Enterprise-grade SLA                         │
│  - GPT-4, GPT-4o, etc.                         │
│  - Customer pays Azure directly (BYOK)          │
│  OR                                             │
│  - You hold Azure account, mark up costs        │
│    (check Azure reseller terms)                 │
└─────────────────────────────────────────────────┘
```

**Key steps:**
1. 申請 Azure Partner Network 或 Microsoft Cloud Solution Provider (CSP) program
2. 以 CSP 身份合法地轉售 Azure 服務（Microsoft 有正式嘅轉售商計劃）
3. 開發你自己嘅 AI 助手軟件，增加真正嘅價值（自訂工作流程、整合、UI）
4. 收取軟件服務費 + Azure 使用費加價
5. 完全合法、可持續、有 Microsoft 嘅 SLA 支持

**Advantages:**
- 100% 合法合規
- Microsoft 明確支持香港客戶
- 有正式嘅轉售商計劃
- Enterprise SLA -- 唔會突然被封
- 可以加價 Azure 使用費作為收入來源之一
- 可以向客戶保證數據安全同合規

**Option B: BYOK Multi-Provider (ALTERNATIVE) / BYOK 多供應商（替代方案）**

如果客戶有能力自己獲取 API key（例如通過海外實體）：

1. 提供軟件平台，支援多個 AI provider 嘅 BYOK
2. 客戶自己負責獲取同管理 key
3. 你只收取軟件訂閱費
4. 明確喺合約中聲明你唔負責 API 存取嘅合法性

**Option C: Open-Source / Self-Hosted Models / 開源自架模式**

考慮使用唔受地理限制嘅開源模型：
- Llama 3 (Meta) -- 開源，可自架
- Mistral -- 歐洲公司，限制較少
- Qwen (通義千問) -- 阿里巴巴，中國模型，無地理限制
- DeepSeek -- 中國模型，無地理限制

呢個方案需要更多嘅技術投入（GPU 伺服器），但完全避免咗 ToS 同地理限制問題。

### 6.3 Risk Comparison Matrix / 風險比較矩陣

| Approach | Legal Risk | Service Continuity Risk | Margin Potential | Recommended? |
|----------|-----------|------------------------|-----------------|-------------|
| Direct OpenAI/Anthropic API | BLOCKED | N/A | N/A | NO -- not available in HK |
| Chinese 3rd-party resellers | EXTREME | EXTREME | High (short-term) | ABSOLUTELY NOT |
| Azure OpenAI (CSP model) | LOW | LOW | Medium | YES |
| Azure OpenAI (BYOK) | LOW | LOW | Low-Medium | YES |
| Amazon Bedrock (Claude) | UNCERTAIN | UNCERTAIN | Medium | MAYBE -- verify first |
| Open-source self-hosted | VERY LOW | LOW | Varies | YES (if technically feasible) |
| BYOK (customer's own keys) | LOW | LOW | Low | YES (but limited) |

---

## PART 7: CONTRACTUAL PROTECTIONS / 合約保障

Regardless of which approach you choose, your customer contracts should include:

### 7.1 Essential Contract Clauses

**Service Description:**
- 清楚描述你提供嘅係軟件服務，唔係直接嘅 AI 模型存取
- 明確列出你使用嘅底層 AI 供應商（如 Azure OpenAI）
- 避免暗示你係 OpenAI 或 Anthropic 嘅官方合作夥伴（除非你真係）

**Limitation of Liability:**
- AI 輸出嘅準確性免責聲明
- 上游供應商服務中斷嘅免責
- 將責任限制喺客戶已支付嘅費用範圍內

**Data Processing:**
- 明確數據如何流經你嘅系統
- 符合香港 PDPO 嘅數據處理條款
- 如果數據跨境傳輸，需要適當嘅保障

**Termination:**
- 如果上游服務不可用，雙方嘅退出機制
- 退款政策
- 數據返還條款

### 7.2 Privacy Policy Requirements

Under Hong Kong PDPO:
- 收集個人數據前嘅通知義務
- 數據使用目的嘅限制
- 數據安全保障措施
- 跨境數據傳輸嘅披露
- AI 處理個人數據嘅透明度

---

## PART 8: IMMEDIATE ACTION ITEMS / 即時行動項目

### Priority 1 -- Validate Business Model (This Week)
- [ ] Confirm Azure OpenAI availability for your use case in HK
- [ ] Research Microsoft CSP program requirements for HK
- [ ] Assess whether Amazon Bedrock can serve HK customers for Claude models
- [ ] Get legal opinion from a Hong Kong solicitor specializing in tech law

### Priority 2 -- Restructure Approach (Within 2 Weeks)
- [ ] If using third-party resellers currently, plan migration away immediately
- [ ] Apply for Azure Partner Network / CSP
- [ ] Redesign business model around legitimate access channels
- [ ] Prepare customer communications about service changes if needed

### Priority 3 -- Legal Documentation (Within 1 Month)
- [ ] Draft customer service agreement with proper protections
- [ ] Create privacy policy compliant with PDPO
- [ ] Prepare data processing terms
- [ ] Document your compliance measures for potential audits

### Priority 4 -- Ongoing Compliance (Continuous)
- [ ] Monitor changes to Anthropic/OpenAI/Azure ToS
- [ ] Track Hong Kong AI regulatory developments (voluntary guidelines may become mandatory)
- [ ] Regular review of upstream provider access policies
- [ ] Maintain records of compliance measures

---

## CONCLUSION / 結論

你嘅原始商業模式有一個根本性嘅問題：香港係 OpenAI 同 Anthropic 嘅受限地區。呢個唔係通過更好嘅合約條款或風險管理可以解決嘅 -- 你需要一個完全唔同嘅供應鏈。

**最安全、最可持續嘅路線係通過 Microsoft Azure OpenAI Service，最好係作為 Microsoft CSP 合作夥伴。** 呢個比用國產第三方轉售商嘅利潤可能低啲，但你會有一個真正合法、可持續、唔會隨時被封嘅業務。

用 DMXAPI 呢類平台就好似喺流沙上面起樓 -- 短期內可能有利可圖，但隨時會冧。而且一旦出事，你唔止會損失業務，仲可能面對法律責任。

**Bottom line:** Build on rock (Azure/legitimate channels), not on sand (unauthorized resellers).

---

## SOURCES

- [Anthropic Supported Countries](https://www.anthropic.com/supported-countries)
- [OpenAI Supported Countries](https://platform.openai.com/docs/supported-countries)
- [OpenAI Service Terms](https://openai.com/policies/service-terms/)
- [OpenAI Services Agreement](https://openai.com/policies/services-agreement/)
- [SCMP: Microsoft maintains AI services in HK](https://www.scmp.com/tech/big-tech/article/3268233/microsoft-maintains-ai-services-hong-kong-openai-curbs-api-access-china)
- [SCMP: Anthropic blocks Chinese firms](https://www.scmp.com/tech/tech-war/article/3324504/tech-war-us-start-anthropic-blocks-chinese-firms-subsidiaries-worldwide-ai-access)
- [VentureBeat: Anthropic cracks down](https://venturebeat.com/technology/anthropic-cracks-down-on-unauthorized-claude-usage-by-third-party-harnesses)
- [The Register: OpenAI pulls plug](https://www.theregister.com/2024/06/25/openai_unsupported_countries/)
- [GLI: AI Laws in Hong Kong](https://www.globallegalinsights.com/practice-areas/ai-machine-learning-and-big-data-laws-and-regulations/hong-kong/)
- [White & Case: AI Watch Hong Kong](https://www.whitecase.com/insight-our-thinking/ai-watch-global-regulatory-tracker-hong-kong)
- [Microsoft News Center HK](https://news.microsoft.com/en-hk/2023/03/23/enterprise-grade-gpt-capabilities-are-now-available-for-hong-kong-users/)
- [Anthropic Usage Policy Update](https://www.anthropic.com/news/usage-policy-update)
- [Medianama: Anthropic bans AI access to Chinese firms](https://www.medianama.com/2025/09/223-anthropic-service-policy-update-bans-ai-access-chinese-firms/)
- [Winbuzzer: Anthropic bans Claude subscription OAuth](https://winbuzzer.com/2026/02/19/anthropic-bans-claude-subscription-oauth-in-third-party-apps-xcxwbn/)
- [OpenAI Community: BYOK Policy](https://community.openai.com/t/bring-your-own-key-policy/446168)
- [Law.asia: HK AI Regulation](https://law.asia/hong-kong-ai-regulation-patchwork-compliance-governance/)
