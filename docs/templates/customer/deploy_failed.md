# Deploy Failed Notification + Auto-Refund

> Sent if deployment fails after 3 retries. Refund issued automatically per ToS technical-failure clause.

## Email — Subject (zh-HK)

抱歉，訂單 #{order_id} 部署遇到問題 — 已安排全額退款

## Email — Subject (en)

Apologies — Order #{order_id} Deploy Failed, Full Refund Arranged

## Email — Body (zh-HK)

```
{customer_name}，

非常抱歉。我們在為你部署 AI 助理時遇到技術問題，經過多次嘗試後仍未成功。

接下來的處理
────────────────────
1. 已為訂單 #{order_id} 安排全額退款 — 款項將於 5–10 個工作天內退回原付款方式
2. 我們的工程團隊正在調查根本原因
3. 你不需要做任何事

訂單資料
────────────────────
訂單編號：#{order_id}
方案：{tier_name}
失敗時間：{failure_timestamp}
退款金額：HK${amount}

如果你日後想再嘗試 NexGen，可隨時透過官網重新訂購。

對於今次嘅體驗，我們深感抱歉。如有任何疑問請聯絡 {support_email}。

NexGen 團隊
{support_email}
```

## Email — Body (en)

```
Hi {customer_name},

We sincerely apologize. We encountered a technical issue while deploying your AI assistant and were unable to complete the setup after multiple attempts.

What happens next
────────────────────
1. A full refund has been arranged for order #{order_id} — funds will return to your original payment method within 5–10 business days
2. Our engineering team is investigating the root cause
3. No action needed from your side

Order Information
────────────────────
Order ID: #{order_id}
Plan: {tier_name}
Failure time: {failure_timestamp}
Refund amount: HK${amount}

If you would like to try NexGen again in the future, you are welcome to re-order anytime via our website.

We are truly sorry for the inconvenience. For any questions, please contact {support_email}.

The NexGen Team
{support_email}
```
