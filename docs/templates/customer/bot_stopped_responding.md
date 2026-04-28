# "Bot Stopped Responding" — Customer Reply

> Expected to be the #1 customer ticket type. Use this skeleton when responding to "我個 bot 唔覆我" / "my bot stopped working" complaints.
>
> **BEFORE replying:** Marigold (or operator) MUST run through `docs/operational/bot-stopped-responding.md` checklist first to identify the actual cause. Then choose appropriate variant below.

## Variant A: Issue Identified & Fixed (most common)

### zh-HK

```
{customer_name}，你好：

收到你的報告，我哋已經調查過。

問題原因
────────────────────
{cause_description}

例如：「你的服務器於 14:32 短暫斷網，已自動恢復」
     「你的 bot token 因 Telegram BotFather 的安全更新而需要重新驗證」
     「服務器記憶體使用率過高，已自動重啟相關程式」

現時狀態
────────────────────
✅ 已修復，bot 應該可以正常回覆
請發送訊息畀 bot 確認

如再遇到問題，請聯絡 {support_email}。

NexGen 團隊
```

## Variant B: Customer-Side Issue (e.g. blocked bot, network)

### zh-HK

```
{customer_name}，你好：

我哋檢查過你的服務，技術上一切正常。問題可能係喺 Telegram 客戶端：

請逐項嘗試
────────────────────
1. 確認你冇 block 個 bot：打開與 {bot_username} 的對話 → 點擊 bot 名稱 → 確認冇出現「Unblock」按鈕
2. 重啟 Telegram app
3. 確認你的網絡連線正常
4. 發送 /start 重新啟動對話

如果以上步驟都試過仍然有問題，請回覆此電郵，我們會進一步協助。

NexGen 團隊
{support_email}
```

## Variant C: Investigating (need more time)

### zh-HK

```
{customer_name}，你好：

收到你的報告，我哋正在調查。

由於需要進一步檢查，預計需要 {eta} 小時內完成。期間 bot 的服務可能會有短暫中斷。

調查進展我會主動通知你。對於不便之處我哋深感抱歉。

如有緊急情況請回覆此電郵。

NexGen 團隊
{support_email}
```

## Variant D: Service Outage (DeepSeek / OpenAI / Cloudflare 3rd-party down)

### zh-HK

```
{customer_name}，你好：

我哋的 AI 服務供應商 {provider_name} 目前出現服務中斷，影響所有 NexGen 客戶。

事件詳情
────────────────────
影響時間：{outage_start} 至今
影響範圍：對話功能{additional_impact}
我哋的應對：監察緊供應商修復進度，亦同時準備後備方案

我哋會喺服務恢復後第一時間通知你。如果中斷時間長過 24 小時，我哋會按服務協議提供補償。

對於不便之處我哋深感抱歉。

NexGen 團隊
{support_email}
```
