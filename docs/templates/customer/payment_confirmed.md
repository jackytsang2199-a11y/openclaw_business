# Payment Confirmed Email

> Sent immediately after Lemon Squeezy webhook `order_created` confirms payment.
> Channel: email (Resend)

## Subject (zh-HK)

NexGen 訂單確認 — 訂單編號 #{order_id}

## Subject (en)

NexGen Order Confirmation — Order #{order_id}

## Body (zh-HK)

```
{customer_name}，你好：

感謝你選擇 NexGen，我們已收到你的付款。

訂單詳情
────────────────────
訂單編號：#{order_id}
方案：{tier_name}
金額：HK${amount} （{billing_cycle}）

接下來會發生什麼
────────────────────
我們現正為你準備專屬伺服器，整個過程約需 30 分鐘至 2 小時。完成後，我們會：

1. 發送 email 通知你的 AI 助理已準備好
2. 你的 Telegram bot {bot_username} 會主動向你發送歡迎訊息

如果 24 小時內仍未收到通知，請回覆此電郵或聯絡 {support_email}。

請保留此訂單編號，未來查詢或聯絡支援時會用到。

NexGen 團隊
{support_email}
```

## Body (en)

```
Hi {customer_name},

Thank you for choosing NexGen. We have received your payment.

Order Details
────────────────────
Order ID: #{order_id}
Plan: {tier_name}
Amount: HK${amount} ({billing_cycle})

What happens next
────────────────────
We are preparing your dedicated server. This typically takes 30 minutes to 2 hours. Once ready, you will receive:

1. An email confirming your AI assistant is ready
2. A welcome message from your Telegram bot {bot_username}

If you have not heard from us within 24 hours, please reply to this email or contact {support_email}.

Please keep this order number for future reference.

The NexGen Team
{support_email}
```
