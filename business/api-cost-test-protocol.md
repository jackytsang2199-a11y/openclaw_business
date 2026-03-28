# API Cost Test Protocol

> **目的：** 用真實對話測試每條 message 嘅 API 成本，驗證 pricing tiers 嘅 margin 是否足夠
> **方法：** 人手 send messages → check DeepSeek + OpenAI dashboard → 計算
> **VPS：** 161.97.82.155（Tier 2 setup — Mem0 + SearXNG enabled）

---

## 準備

1. Open DeepSeek dashboard → note current **total spend** (USD)
2. Open OpenAI dashboard → note current **total spend** (USD)
3. Record timestamp: `_________`

---

## Test Messages（共 20 條）

Send all 20 messages to the OpenClaw bot on Telegram, one by one. Wait for each response before sending the next. The messages simulate a realistic day of usage for a Hong Kong user.

### A. Quick QA — 快問快答（8 條，佔日常 60%）

Short questions, short answers. Lowest cost per message.

| # | Message |
|---|---------|
| A1 | 今日香港天氣點呀？ |
| A2 | 幫我將「Meeting postponed to Friday」翻譯做中文 |
| A3 | 5 磅等於幾多 kg？ |
| A4 | Python 嘅 list comprehension 點寫？畀個簡單例子 |
| A5 | 「躊躇」呢個詞點解？ |
| A6 | 提醒我聽日下午三點要開會 |
| A7 | 香港公眾假期 2026 有邊幾日？ |
| A8 | 幫我改呢句英文 grammar：「I have went to the store yesterday」 |

### B. Deep Conversation — 深度對話（6 條，佔日常 20%）

Multi-turn discussion on one topic. Context grows with each turn → more input tokens.

| # | Message |
|---|---------|
| B1 | 我想開始學投資，完全零經驗，應該點開始？ |
| B2 | ETF 同個股有咩分別？邊個適合新手？ |
| B3 | 如果我每個月有 HK$5000 可以投資，你會建議點分配？ |
| B4 | 咁 bond fund 同 money market fund 又係咩嚟？值唔值得加入組合？ |
| B5 | 你之前建議嘅分配方案，如果遇到股災應該點應對？ |
| B6 | 總結返你所有建議，整理成一個簡單嘅投資計劃畀我 |

### C. Document Tasks — 文件工作（4 條，佔日常 20%）

Longer outputs — emails, content creation. Higher output tokens.

| # | Message |
|---|---------|
| C1 | 幫我寫一封 email 畀老闆，request 下星期一放假一日，原因係要處理私人事務。用返正式英文商業語氣。 |
| C2 | 幫我寫一段 Instagram caption，介紹我新開嘅咖啡店，要有 hashtag，語氣要親切但專業，中英夾雜 |
| C3 | 以下係我嘅 meeting notes，幫我整理成 action items：「今日同 marketing team 開會，佢哋話 Q2 campaign budget 要 cut 20%，John 負責改 media plan，Sarah 要搵新嘅 KOL 合作，deadline 係 4 月 15 號，另外要 review 上季 ROI report」 |
| C4 | 幫我寫一份簡單嘅租約終止通知信，畀業主知我會喺 2026 年 6 月 30 日搬走，要包含必要嘅法律用語，用中文 |

### D. Search-Triggering — 搜尋觸發（2 條，測 SearXNG overhead）

Questions that should trigger web search, injecting search results into context.

| # | Message |
|---|---------|
| D1 | 最新 iPhone 17 幾時出？大概賣幾錢？ |
| D2 | 今日恒生指數收市點？升定跌？ |

---

## 記錄結果

Send 完 20 條之後：

1. DeepSeek dashboard **total spend after**: $________ USD
2. OpenAI dashboard **total spend after**: $________ USD
3. Record timestamp: `_________`

### 計算

```
DeepSeek cost for 20 msgs = (after - before) = $________ USD
OpenAI cost for 20 msgs   = (after - before) = $________ USD
Total cost for 20 msgs    = $________ USD = HK$________ (×7.8)

Average cost per message   = HK$________ ÷ 20 = HK$________
```

---

## 月費 Projection

用平均 cost per message 推算每月 API 成本：

| Usage Level | Msgs/Day | Msgs/Month | Monthly API Cost (HK$) | + VPS (HK$35) | Total Cost | Monthly Fee | Margin |
|-------------|----------|------------|------------------------|---------------|------------|-------------|--------|
| Light       | 20       | 600        | ×600 = $____           | +35           | $____      | —           | —      |
| Normal      | 50       | 1,500      | ×1500 = $____          | +35           | $____      | —           | —      |
| Heavy       | 150      | 4,500      | ×4500 = $____          | +35           | $____      | —           | —      |

### Map to Tiers

| Tier | Monthly Fee | Tier Cost Multiplier | Projected Cost | Margin |
|------|-------------|---------------------|----------------|--------|
| 🌱 Tier 1 ($148) | HK$148 | ×0.7 (no Mem0 overhead) | $____ | ___% |
| ⭐ Tier 2 ($248) | HK$248 | ×1.0 (this test) | $____ | ___% |
| 🚀 Tier 3 ($388) | HK$388 | ×1.1 (browser adds minimal) | $____ | ___% |

> **Tier 1 multiplier = 0.7:** No Mem0 = no embedding calls, no LLM extraction. Roughly 30% less API cost.
> **Tier 3 multiplier = 1.1:** Browser tasks occasionally add screenshot/DOM tokens but most usage is same as Tier 2.

---

## 判斷標準

| Result | Action |
|--------|--------|
| Normal user (50/day) margin > 50% for all tiers | ✅ Pricing confirmed, proceed with website |
| Heavy user (150/day) margin > 30% for Tier 2 | ✅ Safe — heavy users are rare |
| Heavy user margin < 30% for Tier 2 | ⚠️ Consider lowering budget cap or raising Tier 2 price |
| Any tier negative margin at Normal usage | 🔴 Must raise price or cut costs before launch |

---

## Notes

- This test runs on Tier 2 config (Mem0 + SearXNG enabled) — this is the main revenue tier
- Tier 1 cost is estimated at 70% of measured (no Mem0 overhead)
- Tier 3 cost is estimated at 110% of measured (browser adds minimal)
- If results look unexpected, re-run with just 5 Quick QA messages to isolate Mem0 overhead vs chat cost
- CF Worker D1 `api_usage` table also tracks cost in HKD — can cross-check with `curl -H "X-Admin-Key: $KEY" https://api.3nexgen.com/api/usage/$CUSTOMER_ID`
