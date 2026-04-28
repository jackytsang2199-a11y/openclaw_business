# Refund Processed Confirmation

> Sent when LS `subscription_payment_refunded` webhook fires + VPS cancellation scheduled.

## Email — Subject (zh-HK)

NexGen 退款確認 — 訂單 #{order_id}

## Email — Subject (en)

NexGen Refund Confirmation — Order #{order_id}

## Email — Body (zh-HK)

```
{customer_name}，

我們確認已處理你的退款請求。

退款詳情
────────────────────
訂單編號：#{order_id}
退款金額：HK${refund_amount}
處理日期：{refund_timestamp}

退款款項將於 5–10 個工作天內回到你的原付款方式。實際時間視乎發卡銀行而定。

服務狀態
────────────────────
你嘅 AI 助理服務將於 {service_end_timestamp} 結束。在此之前你仍可正常使用。

服務結束後，相關伺服器及資料將按以下方式處理：
• 對話記錄、記憶資料：14 天內永久刪除
• 個人資料：依據私隱政策保留 30 天後刪除

如希望提前刪除所有資料，請發送請求至 {support_email}。

如有任何疑問請聯絡 {support_email}。感謝你曾經使用 NexGen。

NexGen 團隊
{support_email}
```

## Email — Body (en)

```
Hi {customer_name},

We confirm your refund has been processed.

Refund Details
────────────────────
Order ID: #{order_id}
Refund Amount: HK${refund_amount}
Processed: {refund_timestamp}

Funds will return to your original payment method within 5–10 business days. Actual timing depends on your card issuer.

Service Status
────────────────────
Your AI assistant service will end on {service_end_timestamp}. Until then it remains usable.

After service ends, your server and data will be handled as follows:
• Conversation history, memory data: permanently deleted within 14 days
• Personal information: retained per Privacy Policy for 30 days, then deleted

To request earlier data deletion, please email {support_email}.

For any questions, please contact {support_email}. Thank you for trying NexGen.

The NexGen Team
{support_email}
```
