# Subscription Cancelled — Farewell

> Sent when LS `subscription_cancelled` webhook fires (customer cancelled themselves).

## Email — Subject (zh-HK)

NexGen 訂閱已取消 — 訂單 #{order_id}

## Email — Subject (en)

NexGen Subscription Cancelled — Order #{order_id}

## Email — Body (zh-HK)

```
{customer_name}，

我們確認你已取消 NexGen 訂閱。

服務終止安排
────────────────────
訂單編號：#{order_id}
方案：{tier_name}
服務結束日期：{service_end_timestamp}

由於你已預先付費至本月底，AI 助理將繼續運作至 {service_end_timestamp}。在此之前你仍可正常使用。

服務結束後將進行以下處理：
• 你的伺服器將被回收
• 對話記錄、記憶資料於 14 日內永久刪除
• 個人資料按私隱政策處理

如需提前刪除資料，請聯絡 {support_email}。

如果你日後想再使用 NexGen，可隨時透過官網重新訂購。歡迎你嘅回歸。

如有任何疑問或反饋，請聯絡 {support_email}。

NexGen 團隊
{support_email}
```

## Email — Body (en)

```
Hi {customer_name},

We confirm you have cancelled your NexGen subscription.

Service Termination
────────────────────
Order ID: #{order_id}
Plan: {tier_name}
Service ends: {service_end_timestamp}

Since you have prepaid for this billing cycle, your AI assistant will continue to operate until {service_end_timestamp}. You can use it normally until then.

After service ends:
• Your server will be reclaimed
• Conversation history and memory data will be permanently deleted within 14 days
• Personal data handled per our Privacy Policy

To request earlier data deletion, please email {support_email}.

If you wish to return to NexGen in the future, you are welcome to re-order anytime via our website.

For any questions or feedback, please contact {support_email}.

The NexGen Team
{support_email}
```
