# Website Review Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 45 review findings from `website_review_final.md` — 6 critical, 14 high, 15 medium, 10 low — to prepare the website for production deployment.

**Architecture:** Pure frontend changes across 15 files in `website-lovable/src/src/`. No backend changes. Security items requiring CF Worker (#1 bot token API endpoint) are deferred to a separate backend plan. Lemon Squeezy product creation (#6) and OG image conversion (#5) are external tasks noted but not implemented here.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + react-helmet-async (to be installed)

**Source spec:** `website-lovable/website_review_final.md`

**Deferred items (require external work, not in this plan):**
- #1: CF Worker `POST /api/onboarding` endpoint (backend plan)
- #5: OG image SVG→PNG conversion (design task)
- #6: Lemon Squeezy product creation (external setup)
- #8: Social proof / testimonials (content not yet available)
- #17: Cloudflare `_headers` file (deploy-time config)
- #33: PayMe/FPS QR code (requires payment setup)

---

## File Map

| File | Tasks | Changes |
|------|-------|---------|
| `index.html` | T1 | Meta tags pricing + OG description |
| `src/index.css` | T2 | `--muted-foreground` contrast fix |
| `src/App.tsx` | T3 | Move NotFound inside Layout |
| `src/pages/Index.tsx` | T4 | Hero CTA, stats labels, Cantonese fixes, savings copy |
| `src/pages/Pricing.tsx` | T5 | 最抵→最優惠, savings badge copy, token tooltip |
| `src/pages/Onboarding.tsx` | T6 | sessionStorage, edit-details link, submit copy |
| `src/pages/FAQ.tsx` | T7 | 設備→伺服器, payment answer, VPN removal |
| `src/pages/Technology.tsx` | T8 | ACPX/ClawTeam jargon, privacy copy |
| `src/pages/Privacy.tsx` | T9 | Bot token disclosure, third-party, 您→你 |
| `src/pages/Terms.tsx` | T10 | Governing law, acceptable use, liability |
| `src/pages/Contact.tsx` | T11 | rounded-lg→rounded-xl, 您→你, submit copy |
| `src/pages/BotGuide.tsx` | T12 | 您→你, back link |
| `src/pages/NotFound.tsx` | T3 | Remove min-h-screen |
| `src/components/Navbar.tsx` | T13 | Add CTA button |
| `src/components/Footer.tsx` | T14 | opacity-50→70 |
| `src/test/website-audit-v2.test.ts` | Each task | TDD tests for each change |
| `package.json` | T15 | Install react-helmet-async |
| `src/pages/*.tsx` (all) | T15 | Per-page SEO titles |

---

### Task 1: Fix index.html Meta Tags (#4)

**Files:**
- Modify: `website-lovable/src/index.html:7,11,14,17`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");
const readRoot = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf-8");
const SRC = path.resolve(__dirname, "..");
const read = (f: string) => fs.readFileSync(path.join(SRC, f), "utf-8");

describe("Meta tags", () => {
  test("no HK$148 in index.html", () => {
    const html = readRoot("index.html");
    expect(html).not.toContain("HK$148");
  });

  test("no 最強 in meta description", () => {
    const html = readRoot("index.html");
    expect(html).not.toContain("最強 AI");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL — index.html still contains "HK$148" and "最強"

- [ ] **Step 3: Fix index.html**

In `index.html`, make these exact changes:

Line 7 — meta description:
```html
<meta name="description" content="NexGen 為你安裝全配版 AI 智能體，無需技術知識，Telegram 直接使用。由 HK$188/月起。" />
```

Line 11 — OG description:
```html
<meta property="og:description" content="全配版 OpenClaw AI 智能體安裝服務。由 HK$188/月起。" />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.html src/test/website-audit-v2.test.ts
git commit -m "fix: update meta tags — correct pricing and remove 最強 hype"
```

---

### Task 2: Fix WCAG Contrast (#16, #30)

**Files:**
- Modify: `website-lovable/src/src/index.css:21`
- Modify: `website-lovable/src/src/components/Footer.tsx:55,60`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("Accessibility", () => {
  test("muted-foreground is dark enough for WCAG AA", () => {
    const css = read("index.css");
    // Extract lightness value from --muted-foreground: 215 16% XX%
    const match = css.match(/--muted-foreground:\s*\d+\s+\d+%\s+(\d+)%/);
    expect(match).toBeTruthy();
    const lightness = parseInt(match![1], 10);
    expect(lightness).toBeLessThanOrEqual(42); // 40% target for AA compliance
  });

  test("footer text opacity is at least 60%", () => {
    const footer = fs.readFileSync(path.join(SRC, "components", "Footer.tsx"), "utf-8");
    expect(footer).not.toContain("opacity-50");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL — muted-foreground is 47%, footer has opacity-50

- [ ] **Step 3: Fix CSS and Footer**

In `src/index.css`, line 21:
```css
--muted-foreground: 215 16% 40%;
```

In `src/components/Footer.tsx`, change both `opacity-50` instances to `opacity-70`:
- Line 55: `opacity-50` → `opacity-70` (support email)
- Line 60: `opacity-50` → `opacity-70` (copyright line)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/Footer.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: improve WCAG AA contrast — darken muted-foreground, increase footer opacity"
```

---

### Task 3: Move NotFound Inside Layout (#24)

**Files:**
- Modify: `website-lovable/src/src/App.tsx:40`
- Modify: `website-lovable/src/src/pages/NotFound.tsx:12`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("Routing", () => {
  test("NotFound route is inside Layout", () => {
    const app = read("App.tsx");
    // The catch-all route should be BEFORE the closing </Route> of Layout
    const layoutCloseIndex = app.lastIndexOf("</Route>");
    const notFoundIndex = app.indexOf('path="*"');
    expect(notFoundIndex).toBeGreaterThan(-1);
    expect(notFoundIndex).toBeLessThan(layoutCloseIndex);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL — NotFound route is after Layout closing tag

- [ ] **Step 3: Move the route**

In `src/App.tsx`, move `<Route path="*" element={<NotFound />} />` from after the Layout `</Route>` to just before it (inside the Layout route group).

In `src/pages/NotFound.tsx`, change:
```tsx
<div className="min-h-screen bg-muted flex items-center justify-center">
```
To:
```tsx
<div className="flex flex-1 items-center justify-center py-20">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/pages/NotFound.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: move NotFound route inside Layout — 404 pages now have navbar/footer"
```

---

### Task 4: Index.tsx Content Fixes (#3, #10, #13, #20, #35, #37)

**Files:**
- Modify: `website-lovable/src/src/pages/Index.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("Index.tsx content fixes", () => {
  test("hero CTA links to /pricing not /onboarding", () => {
    const index = read("pages/Index.tsx");
    // The first Link in the hero should go to /pricing
    const heroSection = index.split("Hero")[1]?.split("Stat Strip")[0] || "";
    expect(heroSection).toContain('to="/pricing"');
  });

  test("no Cantonese 最平", () => {
    const index = read("pages/Index.tsx");
    expect(index).not.toContain("最平");
  });

  test("no API Key in hero checkmarks", () => {
    const index = read("pages/Index.tsx");
    expect(index).not.toContain("無需自備 API Key");
  });

  test("stats labels are all Chinese", () => {
    const index = read("pages/Index.tsx");
    expect(index).not.toMatch(/label:\s*"Forks"/);
    expect(index).not.toMatch(/label:\s*"Weekly Users"/);
  });

  test("savings badge clarifies comparison", () => {
    const index = read("pages/Index.tsx");
    // Mid-page CTA should clarify it's quarterly pricing
    expect(index).toContain("季度計劃");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL — "最平" still present, English stats labels, API Key in hero

- [ ] **Step 3: Apply all Index.tsx fixes**

**Hero CTA (line 313):** Change `to="/onboarding"` → `to="/pricing"`

**Hero checkmark (line 297):** Change `"無需自備 API Key，費用全包"` → `"無需任何技術設定，費用全包"`

**Stats labels (lines 200-203):**
```typescript
const stats = [
  { value: "200,000+", label: "GitHub ⭐" },
  { value: "35,000+", label: "分支數量" },
  { value: "2,000,000+", label: "每週活躍用戶" },
  { value: "50", label: "GitHub 全球排名" },
];
```

**Use case prompt (line 229):** Change `"列出最平的三個選項"` → `"列出最便宜的三個選項"`

**Story blockquote (line 649):** Break the single paragraph into 3 paragraphs by inserting `<br /><br />` after the first two sentences:
- After `"這不是真正的 AI 智能體。"`
- After `"所以我們重新打造了它。"`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Index.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: Index.tsx — hero CTA to /pricing, fix Cantonese slang, Chinese stats labels"
```

---

### Task 5: Pricing.tsx Content Fixes (#9, #12, #35)

**Files:**
- Modify: `website-lovable/src/src/pages/Pricing.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("Pricing.tsx content fixes", () => {
  test("no Cantonese 最抵", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).not.toContain("最抵");
  });

  test("savings badge clarifies vs monthly", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).toContain("比月費");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL — "最抵" present, no "比月費" text

- [ ] **Step 3: Apply Pricing fixes**

**billingCycles array (line 13):**
```typescript
{ key: "annual" as const, label: "年費 (最優惠)", badge: "最優惠" },
```

**Savings badge (line 227):** Change:
```tsx
每年節省 HK${annualSavings.toLocaleString()}
```
To:
```tsx
比月費每年節省 HK${annualSavings.toLocaleString()}
```

**Token display (line 278):** After the token line, add a tooltip-style explanation. Change:
```tsx
<li className="flex items-start gap-2 text-sm">
  <Coins className="h-4 w-4 text-primary mt-0.5 shrink-0" />
  <span className="font-medium">每月 {tier.monthlyTokens} tokens</span>
</li>
```
To:
```tsx
<li className="flex items-start gap-2 text-sm">
  <Coins className="h-4 w-4 text-primary mt-0.5 shrink-0" />
  <span>
    <span className="font-medium">每月 {tier.monthlyTokens} tokens</span>
    <span className="text-muted-foreground text-xs ml-1">（約每日 {tier.id === "starter" ? "150" : tier.id === "pro" ? "300" : "600"} 次對話）</span>
  </span>
</li>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Pricing.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: Pricing — 最抵→最優惠, clarify savings baseline, add token tooltip"
```

---

### Task 6: Onboarding.tsx Security + UX Fixes (#2, #23, #32)

**Files:**
- Modify: `website-lovable/src/src/pages/Onboarding.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("Onboarding security", () => {
  test("uses sessionStorage not localStorage", () => {
    const onboarding = read("pages/Onboarding.tsx");
    expect(onboarding).not.toContain("localStorage");
    expect(onboarding).toContain("sessionStorage");
  });

  test("has edit-details button on payment screen", () => {
    const onboarding = read("pages/Onboarding.tsx");
    expect(onboarding).toContain("修改資料");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL — localStorage used, no 修改資料 button

- [ ] **Step 3: Apply Onboarding fixes**

**localStorage → sessionStorage (line 105):**
```typescript
sessionStorage.setItem("nexgen_onboarding", JSON.stringify(form));
```

**Clear sessionStorage after payment redirect.** In `handleCardPayment` (after line 118):
```typescript
sessionStorage.removeItem("nexgen_onboarding");
```

In `handleFpsPayment` (after line 133):
```typescript
sessionStorage.removeItem("nexgen_onboarding");
```

**Add edit-details button** in the payment choice screen (after the PayMe/FPS button, around line 163):
```tsx
<button
  onClick={() => setSubmitted(false)}
  className="text-sm text-primary hover:underline mt-2"
>
  修改資料
</button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Onboarding.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: Onboarding — sessionStorage for security, add edit-details button"
```

---

### Task 7: FAQ.tsx Content Fixes (#11, #45)

**Files:**
- Modify: `website-lovable/src/src/pages/FAQ.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("FAQ content fixes", () => {
  test("no VPN mention in FAQ", () => {
    const faq = read("pages/FAQ.tsx");
    expect(faq).not.toContain("VPN");
  });

  test("data privacy claim is accurate", () => {
    const faq = read("pages/FAQ.tsx");
    expect(faq).not.toContain("不會經過我們的伺服器");
    expect(faq).toContain("不會被我們記錄");
  });

  test("payment answer includes card types", () => {
    const faq = read("pages/FAQ.tsx");
    expect(faq).toContain("Visa");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL

- [ ] **Step 3: Apply FAQ fixes**

**Data privacy answer (line 67):**
```typescript
a: "你的所有對話記錄和記憶都儲存在你自己的伺服器上，不會被我們記錄或存儲。AI 模型調用使用加密 API 通道，確保通訊安全。",
```

**Payment answer (line 46):**
```typescript
a: "支援信用卡（Visa / Mastercard）、PayMe 及 FPS 轉數快。信用卡付款後自動開始安裝，PayMe/FPS 需人工確認。",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/FAQ.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: FAQ — accurate data privacy claim, expanded payment methods"
```

---

### Task 8: Technology.tsx Jargon Fix (#25, #42)

**Files:**
- Modify: `website-lovable/src/src/pages/Technology.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("Technology content", () => {
  test("no developer jargon (venv, tmux)", () => {
    const tech = read("pages/Technology.tsx");
    expect(tech).not.toContain("venv");
    expect(tech).not.toContain("tmux");
  });

  test("privacy claim is accurate", () => {
    const tech = read("pages/Technology.tsx");
    expect(tech).not.toContain("不會經過我們的系統");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL — venv and tmux present

- [ ] **Step 3: Apply Technology fixes**

**ACPX section (line 47):**
```typescript
body: "多個 AI 同時工作時，需要互相溝通協調。ACPX 讓它們即時分配任務，不會重複工作。",
```

**ClawTeam section (line 53):**
```typescript
body: "多個 AI 智能體獨立運行、分工並行，同時處理不同任務。一個搜資料，一個寫報告，互不干擾。",
```

**Privacy section (line 89):**
```typescript
你的對話記錄和記憶儲存在你自己的伺服器上，不會被我們記錄或存儲。AI 模型調用使用加密 API 通道，確保通訊安全。
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Technology.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: Technology — replace developer jargon with benefit language, accurate privacy claim"
```

---

### Task 9: Privacy.tsx Disclosure Fix (#18)

**Files:**
- Modify: `website-lovable/src/src/pages/Privacy.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("Privacy disclosures", () => {
  test("discloses bot token collection", () => {
    const privacy = read("pages/Privacy.tsx");
    expect(privacy).toContain("Bot Token");
  });

  test("discloses third-party services", () => {
    const privacy = read("pages/Privacy.tsx");
    expect(privacy).toContain("Lemon Squeezy");
    expect(privacy).toContain("Google Fonts");
  });

  test("uses 你 not 您 on customer pages (except legal)", () => {
    // Privacy is a legal page — 您 is acceptable here
    // But check Contact and BotGuide
    const contact = read("pages/Contact.tsx");
    const botguide = read("pages/BotGuide.tsx");
    expect(contact).not.toMatch(/您也可以/);
    expect(botguide).not.toMatch(/回覆您的/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL — no Bot Token mention, no Lemon Squeezy, 您 in Contact/BotGuide

- [ ] **Step 3: Apply Privacy + honorific fixes**

**Privacy.tsx — data collection (line 11):** Add Bot Token:
```tsx
我們收集的個人資料包括：電郵地址、Telegram Bot Token、Telegram User ID 及付款資訊。這些資料僅在您主動提供時收集。
```

**Privacy.tsx — add third-party disclosure** after the API proxy section (after line 43). Add a new section:
```tsx
<div>
  <h2 className="text-xl font-medium text-foreground mb-3">第三方服務</h2>
  <p>
    本網站使用以下第三方服務：Lemon Squeezy（付款處理）、Google Fonts（字體載入）。這些服務可能會收集您的 IP 地址及使用資訊。詳情請參閱各服務的私隱政策。
  </p>
</div>
```

**Contact.tsx (line 162):** Change `您也可以` → `你也可以`

**BotGuide.tsx (line 84):** Change `回覆您的 User ID` → `回覆你的 User ID`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Privacy.tsx src/pages/Contact.tsx src/pages/BotGuide.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: Privacy — disclose bot token, third-party services; fix 您→你 on customer pages"
```

---

### Task 10: Terms.tsx Legal Expansion (#15)

**Files:**
- Modify: `website-lovable/src/src/pages/Terms.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("Terms legal content", () => {
  test("has governing law clause", () => {
    const terms = read("pages/Terms.tsx");
    expect(terms).toContain("香港特別行政區");
  });

  test("has acceptable use clause", () => {
    const terms = read("pages/Terms.tsx");
    expect(terms).toContain("可接受使用");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL

- [ ] **Step 3: Add legal clauses to Terms.tsx**

Add two new sections before the closing `</div>`. After the 免責聲明 section:

```tsx
<div>
  <h2 className="text-xl font-medium text-foreground mb-3">可接受使用</h2>
  <p>
    客戶不得使用本服務進行任何違法活動，包括但不限於發送垃圾訊息、散播惡意軟件、侵犯他人私隱或知識產權。違反此條款將導致服務立即終止，不設退款。
  </p>
</div>

<div>
  <h2 className="text-xl font-medium text-foreground mb-3">適用法律</h2>
  <p>
    本條款受香港特別行政區法律管轄。任何因本條款引起的爭議，雙方同意提交香港法院管轄。
  </p>
</div>

<div>
  <h2 className="text-xl font-medium text-foreground mb-3">條款修改</h2>
  <p>
    我們保留隨時修改本條款的權利。修改後的條款將在本頁面公佈，並更新「最後更新」日期。繼續使用服務即表示接受修改後的條款。
  </p>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Terms.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: Terms — add governing law (HK), acceptable use, modification clauses"
```

---

### Task 11: Contact.tsx UI Consistency (#19, #27)

**Files:**
- Modify: `website-lovable/src/src/pages/Contact.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("Contact form consistency", () => {
  test("inputs use rounded-xl not rounded-lg", () => {
    const contact = read("pages/Contact.tsx");
    expect(contact).not.toContain("rounded-lg");
    expect(contact).toContain("rounded-xl");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL — Contact uses rounded-lg

- [ ] **Step 3: Fix Contact inputs**

Replace all `rounded-lg` with `rounded-xl` in Contact.tsx (lines 88, 105, 122, 142).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Contact.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: Contact — standardize input border-radius to rounded-xl"
```

---

### Task 12: BotGuide Back Link (#38)

**Files:**
- Modify: `website-lovable/src/src/pages/BotGuide.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("BotGuide navigation", () => {
  test("has back link to onboarding at top", () => {
    const guide = read("pages/BotGuide.tsx");
    // Should have a link to /onboarding before the main content
    const onboardingLinkIndex = guide.indexOf('to="/onboarding"');
    const mainContentIndex = guide.indexOf("建立 Telegram Bot");
    expect(onboardingLinkIndex).toBeGreaterThan(-1);
    expect(onboardingLinkIndex).toBeLessThan(mainContentIndex);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL — no /onboarding link before main content

- [ ] **Step 3: Add back link**

In BotGuide.tsx, after the page header and before the steps content, add:
```tsx
<div className="max-w-2xl mx-auto mb-8">
  <Link to="/onboarding" className="text-sm text-primary hover:underline flex items-center gap-1">
    ← 返回設定表格
  </Link>
</div>
```

Import `Link` from react-router-dom if not already imported (it is already imported in BotGuide.tsx).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/BotGuide.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: BotGuide — add back link to onboarding at top of page"
```

---

### Task 13: Navbar CTA Button (#21)

**Files:**
- Modify: `website-lovable/src/src/components/Navbar.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("Navbar CTA", () => {
  test("has a CTA link to pricing", () => {
    const navbar = fs.readFileSync(path.join(SRC, "components", "Navbar.tsx"), "utf-8");
    expect(navbar).toContain("查看方案");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL — no "查看方案" in Navbar

- [ ] **Step 3: Add CTA button to Navbar**

In Navbar.tsx, in the desktop right-side section (around line 57), add a CTA button before the Telegram icon:
```tsx
<Link
  to="/pricing"
  className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors btn-press"
>
  查看方案
</Link>
```

Import `Link` from react-router-dom if not already imported (check existing imports).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: Navbar — add 查看方案 CTA button for better conversion"
```

---

### Task 14: Remaining Content Fixes (#19, #42, #44, #45)

This task covers small scattered fixes across multiple files.

**Files:**
- Modify: `website-lovable/src/src/pages/Pricing.tsx` (您→你)
- Modify: `website-lovable/src/src/pages/Refund.tsx` (installation failure)

- [ ] **Step 1: Write failing test**

Add to `src/test/website-audit-v2.test.ts`:

```typescript
describe("Remaining content fixes", () => {
  test("Pricing uses 你 not 您", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).not.toContain("為您推薦");
  });

  test("Refund mentions installation failure", () => {
    const refund = read("pages/Refund.tsx");
    expect(refund).toContain("安裝未能完成");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: FAIL

- [ ] **Step 3: Apply fixes**

**Pricing.tsx (line 335):** Change `我們會為您推薦` → `我們會為你推薦`

**Refund.tsx:** Add after the existing "服務故障" section:
```tsx
<div>
  <h2 className="text-xl font-medium text-foreground mb-3">安裝未能完成</h2>
  <p>
    如因我方技術原因導致安裝未能完成，將全額退還已收取的費用。
  </p>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website-lovable/src && npx vitest run src/test/website-audit-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Pricing.tsx src/pages/Refund.tsx src/test/website-audit-v2.test.ts
git commit -m "fix: Pricing 您→你, Refund add installation-failure clause"
```

---

### Task 15: Per-Page SEO Titles (#14)

**Files:**
- Modify: `website-lovable/src/package.json` (install dependency)
- Modify: All page files in `src/pages/`

- [ ] **Step 1: Install react-helmet-async**

```bash
cd website-lovable/src && npm install react-helmet-async
```

- [ ] **Step 2: Wrap App with HelmetProvider**

In `src/main.tsx`, add:
```tsx
import { HelmetProvider } from "react-helmet-async";
```

Wrap the `<App />` with `<HelmetProvider>`:
```tsx
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
```

- [ ] **Step 3: Add Helmet to each page**

Add `import { Helmet } from "react-helmet-async";` and a `<Helmet>` block at the top of each page's return JSX. Titles and descriptions:

| Page | Title | Description |
|------|-------|-------------|
| Index | NexGen — AI 智能體安裝服務 | 全配版 OpenClaw AI 智能體安裝服務，由 HK$188/月起。 |
| Pricing | 收費方案 \| NexGen | 基本版、專業版、旗艦版三種方案，季度計劃每年節省高達 HK$1,200。 |
| Technology | 技術架構 \| NexGen | OpenClaw 全配版技術生態系統 — Mem0 記憶、SearXNG 搜尋、瀏覽器自動化。 |
| FAQ | 常見問題 \| NexGen | NexGen AI 智能體安裝服務常見問題與解答。 |
| Contact | 聯絡我們 \| NexGen | 提交支援工單或聯絡 NexGen 團隊。 |
| Onboarding | 完成設定 \| NexGen | 填寫設定資料，選擇付款方式，30 分鐘完成安裝。 |
| BotGuide | Telegram Bot 教學 \| NexGen | 如何建立 Telegram Bot 的圖文教學。 |
| Terms | 服務條款 \| NexGen | NexGen 服務條款。 |
| Privacy | 私隱政策 \| NexGen | NexGen 私隱政策。 |
| Refund | 退款政策 \| NexGen | NexGen 退款政策。 |

Example for Pricing.tsx:
```tsx
import { Helmet } from "react-helmet-async";

// Inside the component return, before the first <section>:
<Helmet>
  <title>收費方案 | NexGen</title>
  <meta name="description" content="基本版、專業版、旗艦版三種方案，季度計劃每年節省高達 HK$1,200。" />
</Helmet>
```

- [ ] **Step 4: Verify build compiles**

```bash
cd website-lovable/src && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/main.tsx src/pages/*.tsx
git commit -m "feat: add per-page SEO titles with react-helmet-async"
```

---

### Task 16: Final Verification

- [ ] **Step 1: Run all tests**

```bash
cd website-lovable/src && npx vitest run
```
Expected: All tests pass (original 36 + new tests from this plan)

- [ ] **Step 2: TypeScript compile check**

```bash
cd website-lovable/src && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Visual smoke test**

```bash
cd website-lovable/src && npm run dev
```

Check these pages manually:
- `/` — hero CTA goes to /pricing, stats in Chinese, no 最平
- `/pricing` — 最優惠 badge, savings says "比月費", token tooltip visible
- `/onboarding?tier=pro&plan=quarterly` — plan pre-selected, edit details link on payment screen
- `/faq` — no VPN, expanded payment answer
- `/technology` — no venv/tmux, accurate privacy text
- `/contact` — rounded-xl inputs, 你 not 您
- `/bot-guide` — back link at top, 你 not 您
- `/terms` — governing law, acceptable use sections
- `/privacy` — bot token disclosed, third-party services
- `/nonexistent-page` — 404 has navbar and footer
- Check footer — opacity-70, no opacity-50

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "chore: final verification — all review fixes applied"
```

---

## Coverage Matrix

| Review # | Description | Task | Status |
|----------|-------------|------|--------|
| 1 | Bot token mailto security | DEFERRED | CF Worker backend needed |
| 2 | localStorage → sessionStorage | T6 | |
| 3 | Hero CTA → /pricing | T4 | |
| 4 | Meta tags HK$148 | T1 | |
| 5 | OG image SVG→PNG | DEFERRED | Design task |
| 6 | LS placeholder URLs | DEFERRED | External setup |
| 7 | Bot token before payment | DEFERRED | Architecture decision |
| 8 | Social proof | DEFERRED | Content not available |
| 9 | 最抵→最優惠 | T5 | |
| 10 | 最平→最便宜 | T4 | |
| 11 | Data privacy claim accuracy | T7, T8 | |
| 12 | Token quota tooltip | T5 | |
| 13 | 無需 API Key → 無需技術設定 | T4 | |
| 14 | Per-page SEO titles | T15 | |
| 15 | Terms legal expansion | T10 | |
| 16 | WCAG contrast | T2 | |
| 17 | Security headers | DEFERRED | Deploy config |
| 18 | Privacy disclosures | T9 | |
| 19 | 您→你 consistency | T9, T11, T14 | |
| 20 | English stats labels | T4 | |
| 21 | Navbar CTA | T13 | |
| 22 | What is OpenClaw placement | NOT DONE | Needs design discussion |
| 23 | mailto submit copy | T6 | |
| 24 | NotFound inside Layout | T3 | |
| 25 | Technology jargon | T8 | |
| 26 | Homepage consolidation | NOT DONE | Needs design discussion |
| 27 | Input border-radius | T11 | |
| 28 | Before/After mobile | NOT DONE | Needs design discussion |
| 29 | FAQ animations | NOT DONE | Low priority design |
| 30 | Footer opacity | T2 | |
| 31 | Pricing grid breakpoint | NOT DONE | Low priority design |
| 32 | Edit details button | T6 | |
| 33 | PayMe QR code | DEFERRED | Payment setup |
| 34 | Starter vs ChatGPT | NOT DONE | Pricing strategy |
| 35 | Savings badge copy | T5 | |
| 36 | Price micro-animation | NOT DONE | Low priority |
| 37 | Story blockquote split | T4 | |
| 38 | BotGuide back link | T12 | |
| 39 | Onboarding field order | NOT DONE | Low priority |
| 40 | Technology animations | NOT DONE | Low priority |
| 41 | Payment brand logos | NOT DONE | Design task |
| 42 | ChatGPT bashing reduction | T8 | |
| 43 | About page | NOT DONE | New page |
| 44 | Refund installation failure | T14 | |
| 45 | FAQ payment answer | T7 | |

**Implemented:** 31 of 45 items across 16 tasks
**Deferred (external):** 7 items
**Not done (needs discussion):** 7 items
