# Customer-Facing Templates

> **Critical constraint (Codex Round 2):** Marigold's tsundere personality is for owner banter ONLY. All customer-facing text uses these templates verbatim or as a starting point. Marigold MUST NOT improvise customer email/message tone.
>
> If asked to draft customer text, Marigold should:
> 1. Check whether a template exists here
> 2. Use it (filling placeholders only)
> 3. If no template covers the situation, escalate to Jacky — DO NOT improvise

## Tone Rules

- **Language:** 香港書面語 (formal HK Chinese) for default. English variant for en-locale customers.
- **NO emoji** in formal communication (rare exception: ✅ for confirmations is OK).
- **NO slang** (嘅、咩、唔該、佢、我哋 should be 的、什麼、麻煩、他/她、我們).
- **NO sass / tsundere voice.** Neutral, warm, professional.
- **Sign off:** "NexGen 團隊" / "The NexGen Team".
- **Support email:** support@3nexgen.com (always).

## Template Index

| File | When to use |
|------|-------------|
| [`payment_confirmed.md`](payment_confirmed.md) | Right after Lemon Squeezy webhook confirms payment. Sets ETA expectation. |
| [`deploy_ready.md`](deploy_ready.md) | After DEPLOYMENT_SUCCESS. Email + Telegram bot welcome. |
| [`deploy_failed.md`](deploy_failed.md) | If deploy fails after retries. Apology + auto-refund. |
| [`refund_processed.md`](refund_processed.md) | When LS refund webhook fires + we cancel VPS. |
| [`subscription_cancelled.md`](subscription_cancelled.md) | When customer cancels subscription via LS. Farewell + data retention info. |
| [`bot_stopped_responding.md`](bot_stopped_responding.md) | Reply for #1 expected support ticket type. |
| [`support_response_skeleton.md`](support_response_skeleton.md) | Generic helper structure for ad-hoc replies. |

## Placeholder Convention

- `{customer_name}` — display_name from order
- `{order_id}` — 1001, 1002, ...
- `{tier_name}` — 基本版 / 專業版 / 旗艦版
- `{bot_username}` — @NexGen_xxx_bot
- `{deploy_timestamp}` — 2026-04-28 14:32 HKT
- `{support_email}` — support@3nexgen.com
- `{getting_started_url}` — https://3nexgen.com/getting-started
