# Order Form — Technical Spec

This document defines the order form for the 3nexgen.com website. It specifies the form fields, validation rules, API integration, and payment flow.

---

## Form Fields

| Field | Type | Required | Validation | Notes |
|-------|------|----------|-----------|-------|
| 服務計劃 (Service Tier) | Dropdown | Yes | Must be 1, 2, or 3 | Options: 🌱 新手上路 (Tier 1) / ⭐ 智能管家 (Tier 2) / 🚀 全能大師 (Tier 3) |
| Bot Token | Text input | Yes | Validated via Telegram API | Has a "驗證" (Validate) button |
| Bot 名稱 (Display Name) | Text input | Yes | Non-empty | Auto-filled from getMe response `first_name` after validation, editable |
| Bot 用戶名 | Read-only text | — | — | Auto-populated from getMe response `username`, shown as `@username` |
| Telegram User ID | Text input | Yes | Numeric string | Include help link: "如何查詢您的 Telegram User ID?" |
| 電郵地址 (Email) | Email input | Yes | Valid email format | Used for order confirmation and Lemon Squeezy matching |

---

## Bot Token Validation Flow

When user clicks "驗證" (Validate) button:

1. Frontend calls Telegram API directly (no backend needed):
   ```
   GET https://api.telegram.org/bot{TOKEN}/getMe
   ```

2. **On success** (`ok: true`, `result.is_bot: true`):
   - Show green checkmark next to token field
   - Auto-fill "Bot 名稱" with `result.first_name`
   - Show "Bot 用戶名" as `@{result.username}`
   - Enable the Submit button

3. **On failure** (network error, `ok: false`):
   - Show red X next to token field
   - Display error: "Token 無效，請檢查後重試"
   - Keep Submit button disabled

---

## Form Submission

**API Endpoint:** `POST https://api.3nexgen.com/api/orders`

**Request body:**
```json
{
  "tier": 2,
  "display_name": "我的AI助手",
  "telegram_user_id": "123456789",
  "email": "user@example.com",
  "bot_token": "1234567890:ABCdefGHI..."
}
```

**Response (201):**
```json
{
  "order": {
    "id": "1001",
    "status": "pending_payment",
    "bot_username": "MyAI_Helper_bot",
    "tier": 2
  }
}
```

**Error responses:**
- `400` — Missing field or invalid bot token
- `409` — Bot token already in use

---

## Post-Submission: Payment Options

After successful order submission, show payment options page:

### Option A: Visa / Mastercard (Lemon Squeezy)

Redirect to Lemon Squeezy checkout with order_id embedded:

```
https://STORE_NAME.lemonsqueezy.com/checkout/buy/VARIANT_ID?checkout[custom_data][order_id]=1001&checkout[email]=user@example.com
```

The variant_id maps to the selected tier (configured in Lemon Squeezy dashboard).

Payment is auto-confirmed via webhook — no manual action needed.

### Option B: FPS / PayMe

Display payment details:

```
銀行: [Bank Name]
FPS 識別碼: [FPS ID]
金額: HK$[amount based on tier]
備註: 訂單編號 1001
```

Instruct customer: "轉帳後請耐心等候，我們會在確認收款後開始設定您的 AI 助手。"

Admin manually confirms via:
```
POST https://api.3nexgen.com/api/confirm/1001
X-API-Key: [CONFIRM_API_KEY]
{"payment_method": "fps"}
```

---

## Telegram User ID Help

Link to a help section explaining how to find your Telegram User ID:

1. 在 Telegram 搜尋 **@userinfobot** 並開啟對話
2. 發送任何訊息
3. Bot 會回覆您的 User ID（一串數字）
4. 複製這串數字到訂單表格

---

## Pricing Display (from CLAUDE.md)

| Tier | Name | 安裝費 (半價優惠) | 月費 |
|------|------|-----------------|------|
| 1 | 🌱 新手上路 | HK$200 | HK$148/月 |
| 2 | ⭐ 智能管家 | HK$400 | HK$248/月 |
| 3 | 🚀 全能大師 | HK$900 | HK$388/月 |
