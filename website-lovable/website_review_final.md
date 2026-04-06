# Website Final Review — Consolidated (4 Perspectives)

> **Date:** 2026-04-05
> **Reviewers:** Product Manager, Content Marketer, UI Designer, Security Auditor
> **Total Findings:** 45 (6 critical, 14 high, 15 medium, 10 low)

---

## CRITICAL — Must Fix Before Launch

| # | Issue | Source | Impact |
|---|-------|--------|--------|
| **1** | **Bot Token via mailto: is insecure** — plaintext email with full API credentials. Anyone with mailbox access gets full bot control. | Security | Build CF Worker `POST /api/onboarding` endpoint, or at minimum use sessionStorage + clear after redirect |
| **2** | **Bot Token in localStorage indefinitely** — no expiration, readable by any JS on same origin | Security | Switch to `sessionStorage`, clear after payment redirect |
| **3** | **Hero CTA goes to /onboarding, skipping pricing** — first-time visitors haven't been sold yet | PM | Change hero「立即開始」→ `/pricing` |
| **4** | **index.html meta still says HK$148** — search results show wrong price | Copy | Update to HK$158 or HK$188 |
| **5** | **OG image is SVG** — won't render on Facebook/Twitter/LinkedIn | Copy | Convert to PNG 1200x630 |
| **6** | **LS checkout URLs are placeholders** — card payments will 404 | PM/Security | Launch blocker — create LS products first |

---

## HIGH — Should Fix Before Launch

| # | Issue | Source | Impact |
|---|-------|--------|--------|
| **7** | **Onboarding asks for Bot Token BEFORE payment** — biggest friction wall. Users must leave site, talk to BotFather, come back. | PM | Consider: collect email + plan + payment first, Bot Token post-payment |
| **8** | **Zero social proof** — no testimonials, no customer count, no founder bio | PM | Major trust gap for new brand. Add at minimum a founder section |
| **9** | **「最抵」is Cantonese slang** — pricing tab label | Copy | →「最優惠」 |
| **10** | **「最平」is Cantonese** — use case prompt | Copy | →「最便宜」 |
| **11** | **「不會經過我們的伺服器」is misleading** — API proxy DOES route through CF Worker | Copy/Security | →「對話內容不會被我們記錄或存儲」 |
| **12** | **Token quota unexplained** — 5M/10M/20M tokens means nothing to non-tech users | PM/Copy | Add tooltip:「約等於每日 XX 次對話」 |
| **13** | **「無需 API Key」in hero** — target audience doesn't know what API Key is | Copy | →「無需任何技術設定」or「30 分鐘上線」 |
| **14** | **No per-page SEO titles** — every page serves same `<title>` | Copy | Add `react-helmet` with unique titles per page |
| **15** | **Terms page legally thin** — no governing law, no acceptable use, no liability cap | Copy/PM | Add HK governing law + acceptable use at minimum |
| **16** | **WCAG contrast fail** — `--muted-foreground` at 47% lightness fails AA for small text | UI | Darken to 40% lightness |
| **17** | **No security headers** — no CSP, no X-Frame-Options, no HSTS | Security | Add Cloudflare Pages `_headers` file |
| **18** | **Privacy policy incomplete** — doesn't disclose bot token collection, localStorage usage, third-party scripts (Lemon Squeezy, Google Fonts) | Security/Copy | Update with accurate data handling disclosures |
| **19** | **「您」vs「你」inconsistent** — legal pages use 您, customer-journey pages mix both | Copy | Standardize:「你」on customer pages,「您」on legal only |
| **20** | **"Weekly Users" is English** — only English label in stats section | Copy | →「每週活躍用戶」 |

---

## MEDIUM — Improve Before or Shortly After Launch

| # | Issue | Source | Impact |
|---|-------|--------|--------|
| **21** | Navbar has no CTA button — only Telegram icon on right side | PM | Add「查看方案」primary button |
| **22** | "What is OpenClaw?" section misplaced on Pricing page — delays purchase decision | PM/Copy | Move to Index page or collapse into accordion |
| **23** | Contact/Onboarding mailto: shows "submitted" even if email not actually sent | PM/UI | Change copy: 「請在郵件應用中按『發送』完成提交」 |
| **24** | NotFound page has no navbar/footer — route is outside Layout component | UI | Move `<Route path="*">` inside Layout route |
| **25** | Technology page too technical — ACPX ("venv 隔離環境 + tmux 3.5a") is developer jargon | Copy | Rewrite in benefit terms for non-technical users |
| **26** | Homepage has 9 sections — information overload, especially on mobile | PM | Consider consolidating: move tech stack + stats to Technology page |
| **27** | Input border-radius inconsistent — Contact uses `rounded-lg`, Onboarding uses `rounded-xl` | UI | Standardize all inputs to `rounded-xl` |
| **28** | Before/After table needs horizontal scroll on phones <400px | UI | Convert to stacked card layout on mobile |
| **29** | FAQ page has no entrance animations — every other page uses Framer Motion | UI | Add `fadeUp` + `whileInView` animations |
| **30** | Footer opacity-50 text (email, copyright) fails contrast on dark background | UI | Increase to `opacity-70` |
| **31** | Pricing card grid `md:grid-cols-3` could overflow on 768px tablets with `md:scale-105` | UI | Change breakpoint to `lg:grid-cols-3` |
| **32** | No "edit details" link on payment choice screen — can't go back to fix form | UI | Add `setSubmitted(false)` button |
| **33** | PayMe/FPS payment via mailto: is fragile — no confirmation email was sent | PM | Show QR code inline + fallback contact method |
| **34** | Starter tier ($248/mo) hard to justify vs ChatGPT Plus (~HK$156/mo) | PM | Add explicit differentiator or de-emphasize Starter |
| **35** | Savings badge says「每年節省」without clarifying comparison baseline | PM | →「比月費每年節省 HK$XXX」 |

---

## LOW — Post-Launch Polish

| # | Issue | Source |
|---|-------|--------|
| **36** | Add price-change micro-animation when switching billing tabs | UI |
| **37** | Story blockquote is one massive paragraph — break into 2-3 paragraphs | UI/Copy |
| **38** | BotGuide page lacks top-of-page back link to /onboarding | UI |
| **39** | Onboarding form field order — group Telegram-related fields together | UI |
| **40** | Technology page needs entrance animations + visual hierarchy for top 3 cards | UI |
| **41** | Footer payment badges are generic text — add Visa/Mastercard logos | PM |
| **42** | Technology page bashes ChatGPT 3 times consecutively — feels defensive | Copy |
| **43** | No About/Team page — missed trust-building opportunity | PM/Copy |
| **44** | Refund page missing installation-failure scenario | Copy |
| **45** | FAQ payment methods answer too terse —「信用卡、PayMe、FPS。」| Copy |

---

## Key Decision Points

### Decision 1: Bot Token collection timing (#7)

**Current:** Form collects Bot Token → payment → deploy
**Proposed:** Email + plan + payment → THEN collect Bot Token post-payment

**Impact:** Single biggest conversion improvement. Users who have paid are 10x more motivated to complete setup. But requires splitting onboarding into 2 phases.

### Decision 2: Security architecture (#1, #2)

**Current:** Form data via mailto: (plaintext) + localStorage (persistent)
**Proposed:** POST to CF Worker `/api/onboarding` over HTTPS → store in D1

**Impact:** Properly secures bot tokens. Also enables automated flow (LS webhook matches order → CF Worker has bot token → Pi5 deploys). This is the architecturally correct solution.

### Decision 3: Hero CTA destination (#3)

**Current:**「立即開始」→ `/onboarding`
**Proposed:**「立即開始」→ `/pricing`

**Impact:** First-time visitors need to see pricing and features before committing. The pricing page is the selling page.

---

## Summary by Reviewer

| Reviewer | Critical | High | Medium | Low | Top Concern |
|----------|----------|------|--------|-----|-------------|
| **Product Manager** | 2 | 3 | 6 | 3 | Bot Token before payment kills conversion |
| **Content Marketer** | 2 | 5 | 3 | 5 | Cantonese slang + meta pricing mismatch |
| **UI Designer** | 0 | 1 | 8 | 5 | WCAG contrast + dark section text opacity |
| **Security Auditor** | 2 | 2 | 2 | 1 | Bot token via plaintext email is critical |
