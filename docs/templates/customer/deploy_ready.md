# Deploy Ready Notification

> Sent after DEPLOYMENT_SUCCESS. Two channels: email (Resend) + Telegram bot greeting.

---

## Email — Subject (zh-HK)

你的 AI 助理已準備好 — NexGen 訂單 #{order_id}

## Email — Subject (en)

Your AI Assistant is Ready — NexGen Order #{order_id}

## Email — Body (zh-HK)

```
{customer_name}，

好消息！你的 AI 助理已經部署完成，可以開始使用。

如何開始使用
────────────────────
1. 打開 Telegram，搜尋你的 bot：{bot_username}
2. 發送 /start 開始對話
3. 輸入任何問題，例如「你好」或「今日香港天氣？」

訂單資料
────────────────────
訂單編號：#{order_id}
方案：{tier_name}
部署時間：{deploy_timestamp}

開始使用指南
────────────────────
完整入門指引：{getting_started_url}

如有任何問題，請回覆此電郵或聯絡 {support_email}。

NexGen 團隊
{support_email}
```

## Email — Body (en)

```
Hi {customer_name},

Great news — your AI assistant is ready to use.

How to start
────────────────────
1. Open Telegram and search for your bot: {bot_username}
2. Send /start to begin
3. Try any question, such as "Hello" or "What is the weather in Hong Kong today?"

Order Information
────────────────────
Order ID: #{order_id}
Plan: {tier_name}
Deployed at: {deploy_timestamp}

Getting started guide
────────────────────
Full guide: {getting_started_url}

For any questions, please reply to this email or contact {support_email}.

The NexGen Team
{support_email}
```

---

## Telegram bot greeting (sent via Pi5 sendMessage to customer's telegram_user_id)

### zh-HK

```
你好！我係你嘅 AI 助理，已經準備好為你服務。

你可以隨時發送訊息畀我，包括：
• 一般對話、提問
• 搜尋資料（例如「search for 香港天氣」）
• 記憶功能（例如「記住我鍾意飲咖啡」）

開始之前，請先發送 /start 給我。

如有問題請聯絡 {support_email}
訂單編號：#{order_id}
```

### en

```
Hello! I am your AI assistant, ready to help.

You can send me messages including:
• General conversation and questions
• Search queries (e.g. "search for HK weather")
• Memory features (e.g. "remember I like coffee")

To begin, please send /start.

For support: {support_email}
Order ID: #{order_id}
```
