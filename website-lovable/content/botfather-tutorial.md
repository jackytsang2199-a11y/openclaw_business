# 如何建立您的 Telegram Bot

在訂購 NexGen AI 服務之前，您需要先建立自己的 Telegram Bot。整個過程只需 2 分鐘。

---

## 步驟一：開啟 BotFather

在 Telegram 搜尋 **@BotFather** 並開啟對話。

BotFather 是 Telegram 的官方工具，用於建立和管理 Bot。

> [screenshot placeholder: search BotFather in Telegram]

---

## 步驟二：建立新 Bot

發送指令：

```
/newbot
```

BotFather 會回覆您，要求輸入 Bot 的顯示名稱。

> [screenshot placeholder: /newbot response]

---

## 步驟三：輸入顯示名稱

輸入您希望的 Bot 名稱，例如：

```
我的AI助手
```

這是您在 Telegram 對話清單中看到的名稱，之後可以隨時更改。

---

## 步驟四：選擇用戶名

BotFather 會要求您選擇一個用戶名。用戶名必須：
- 以 `_bot` 結尾
- 只能使用英文字母、數字和底線
- 不能與其他 Bot 重複

例如：

```
MyAI_Helper_bot
```

如果提示「已被使用」，請嘗試其他名稱，例如加上數字：`MyAI_Helper_2026_bot`

---

## 步驟五：複製 Bot Token

建立成功後，BotFather 會發送一段 **Bot Token**，格式如下：

```
1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ123456789
```

**請複製這段 Token**，然後貼上到 NexGen AI 訂單表格中。

> [screenshot placeholder: BotFather success message with token highlighted]

---

## 常見問題

### 用戶名已被使用？
請嘗試其他名稱。建議加入個人特色或數字，例如 `ClaireAI_2026_bot`。

### Token 是什麼？
Token 是您 Bot 的專屬密碼，讓我們的系統能夠為您的 Bot 安裝 AI 功能。

### Token 安全嗎？
- 請勿與他人分享您的 Token
- 我們的系統使用加密傳輸和儲存
- 如果您懷疑 Token 洩漏，可以在 BotFather 使用 `/revoke` 重新產生

### 建立 Bot 後可以更改名稱嗎？
可以。在 BotFather 使用 `/setname` 指令即可更改顯示名稱。
