# SearXNG Self-Hosted Search — Setup 文檔

> **目的：** 喺 Raspberry Pi 上跑一個完全 self-hosted 嘅搜尋引擎，俾 Marigold (OpenClaw AI) 用嚟做 web search，唔需要任何 API key。

---

## 點解要用 SearXNG？

### vs. Brave Search API

| 比較 | Brave Search API | SearXNG (Self-hosted) |
|------|-----------------|----------------------|
| **費用** | 有 free tier，但有 quota limit | 完全免費，無 limit |
| **API Key** | ✅ 需要 register + key | ❌ 唔需要 |
| **隱私** | Brave 收到你嘅 queries | 完全 local，唔 log |
| **搜尋源** | Brave 自己嘅 index | 聚合多個引擎（Google, Bing, Reddit, etc.）|
| **Reddit 支援** | ❌ 唔直接抓 Reddit | ✅ 可以直接搜 Reddit 內容 |
| **AI Block Bypass** | 唔可以 | ✅ 可以（見下方） |
| **Rate Limit** | 有 | 視乎你設定 |

### SearXNG 嘅獨特優勢

**1. 聚合多個搜尋源**
SearXNG 係 meta-search engine — 佢同時 query 多個引擎（Google, Bing, DuckDuckGo, Reddit, Wikipedia, etc.）再整合結果。唔係靠單一 index。

**2. 可以 bypass AI-blocked content（如 Reddit）**

Reddit 於 2023 年開始 block 大部分 AI crawlers（包括 OpenAI、Anthropic 等），直接 fetch reddit.com 會俾 block 或者 return 空內容。

SearXNG 解決方法：
- 佢搜尋 Reddit 係透過 **搜尋引擎嘅 cached/indexed 版本**，唔係直接 crawl reddit.com
- 可以配置用 `reddit` engine 直接搜 Reddit（走 old.reddit.com 或 Reddit API 其中一個 endpoint）
- 結果唔會俾 Reddit 嘅 anti-bot 攔截

**3. 完全控制**
- 想搜邊個 engine 就搜邊個
- 可以 filter 特定 site（e.g. `site:reddit.com`）
- 可以自訂 result count、語言、地區

---

## 我們嘅 Setup

### 環境
- **Host:** Raspberry Pi（arm64, Linux）
- **Docker:** 用 Docker 跑 container

### Docker Container 詳情

