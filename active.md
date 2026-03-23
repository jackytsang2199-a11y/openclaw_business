# ClawHK 蟹助手 — 項目狀態

> **最後更新：** 2026-03-13

---

## 當前階段：Phase 0 準備中

### 計劃討論：✅ 完成

所有 business plan topics 已討論完畢。Plan v1 有 14 個 section，全部 confirmed 或 deferred。

| Section | Topic | 狀態 |
|---------|-------|------|
| §1 | 業務定位 + 競爭差異化 | ✅ |
| §2 | 服務 Tier（Decoy Effect 定價） | ✅ |
| §3 | 技術架構（Remote 工具 / 安裝流程 / 平台 / VPS） | ✅ |
| §4 | API 供應策略（三層架構，唔搞中轉） | ✅ |
| §5 | 推廣策略（IG + Threads + LIHKG + TG + WA） | ✅ |
| §6 | AI 客服系統 + Notification + Client Management | ✅ |
| §7 | Website / Landing Page | ✅ |
| §8 | Payment 收款方式 | ✅ |
| §9 | Business Entity 商業登記 | ✅ |
| §10 | 客人 Onboarding Flow（3 Routes） | ✅ |
| §11 | 財務預估 | ✅ |
| §12 | 啟動 Roadmap | ✅ |
| §13 | 風險同應對 | ✅ |
| §14 | 討論進度 Tracker | ✅ |

### Deferred Topics（等實測數據）

| Topic | 等咩 |
|-------|------|
| Pricing 微調 | DeepSeek 實際 API 成本 |
| Add-on / Topup 包裝 | API 成本 + 客戶使用數據 |

---

## 下一步行動（建議順序）

### 1. API 測試（最優先）
- [ ] 開 DeepSeek API account → 測試實際成本
- [ ] 確認 VPN → Anthropic/OpenAI 可行性
- 呢個決定咗成本結構，影響所有定價

### 2. 技術準備
- [ ] 寫 automated setup script（基於現有 Pi5 guide）
- [ ] 測試 Tailscale auth key pre-authorize
- [ ] 測試 Hetzner VPS provision + 安裝 flow

### 3. 基礎設施
- [ ] 買 domain + 起 landing page（Cloudflare）
- [ ] 開 TG 客服 bot + 寫 Knowledge Base
- [ ] 建 Google Sheet client tracker

### 4. Marketing 準備
- [ ] 開 IG business account + Threads
- [ ] 準備 10 個 Reels 內容
- [ ] 開 TG Group "OpenClaw HK"

---

## 項目文件索引

```
openclaw_setup_business/
├── active.md                    ← 你而家睇緊嘅嘢
├── business/
│   ├── openclaw-setup-business-plan-v1.md   ← 主 plan（14 sections）
│   ├── installation-automation-strategy.md  ← 安裝自動化策略
│   └── todo-master.md                       ← 全部 48 個 todo（按 Phase 排）
├── legal/
│   └── legal-analysis-hk-ai-reseller.md     ← API resell 法律分析
├── marketing/
│   └── templates/                           ← 推廣素材（待建）
└── technical/
    ├── guides/
    │   ├── pi5-openclaw-setup-guide.md      ← Pi5 安裝完整指南
    │   └── searxng_setup.md                 ← SearXNG 設定文檔
    └── inventory/
        └── pi5-setup-inventory.md           ← Pi5 硬件清單
```

---

## 關鍵數字

| 指標 | 數值 |
|------|------|
| Plan sections | 14（全部 confirmed） |
| 待做 tasks | 48（31 in Phase 0） |
| Deferred topics | 2 |
| 預計 startup cost | ~HK$300-400 |
| 目標：第一個客 | Phase 1（Week 3-4） |
| 目標：10 客 | Soft launch |
| 目標：30 客 | 3 個月 |
