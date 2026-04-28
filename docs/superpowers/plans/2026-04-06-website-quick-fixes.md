# Website Quick Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the highest-impact website issues identified in the review report — broken social sharing, dead code, and missing SEO fallbacks — in ~30 minutes of work.

**Architecture:** All changes are in-place edits to the existing React + Vite + Tailwind site. No new dependencies, no structural refactors. Every task is independently shippable.

**Tech Stack:** React, Vite, TypeScript, Tailwind CSS, react-helmet-async

**Source root:** `website-lovable/src/`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `public/og-image.png` | 1200x630 OG image for social sharing |
| Modify | `index.html` | Fix OG image path, add static `<title>` + `<meta description>` fallback |
| Modify | `src/components/SEOHead.tsx` | Add `og:image` meta tag |
| Modify | `src/App.tsx` | Remove unused QueryClientProvider, Toaster, Sonner |
| Modify | `src/pages/Privacy.tsx` | Use SUPPORT_EMAIL constant instead of hardcoded email |
| Modify | `src/pages/Refund.tsx` | Use SUPPORT_EMAIL constant instead of hardcoded email |
| Modify | `src/pages/NotFound.tsx` | Replace `<a>` with `<Link>` to prevent full page reload |
| Delete | `src/components/NavLink.tsx` | Dead code — never imported anywhere |
| Delete | `public/placeholder.svg` | Dead asset — never referenced anywhere |
| Modify | `public/robots.txt` | Add `Sitemap:` directive |

---

### Task 1: Create OG Image and Fix Social Sharing Meta Tags

This is the single most impactful fix. Every LIHKG post, Telegram share, and Facebook link currently shows a blank preview because `og:image` points to a non-existent `/og-image.svg`.

**Files:**
- Create: `website-lovable/src/public/og-image.png`
- Modify: `website-lovable/src/index.html`
- Modify: `website-lovable/src/src/components/SEOHead.tsx`

- [ ] **Step 1: Generate OG image**

Create a 1200x630 PNG image for social sharing. Use a simple dark gradient background matching the site's dark theme with the NexGen brand name and tagline.

Option A (recommended): Use a canvas/image tool to create a 1200x630 PNG with:
- Background: dark gradient (#0f172a to #1e293b)
- Text: "NexGen" in white, large
- Subtitle: "AI 智能助手安裝服務" in lighter text
- Save to `website-lovable/src/public/og-image.png`

Option B (quick fallback): Create a minimal SVG-to-PNG using any available tool, ensuring the output is PNG format (not SVG — most social platforms reject SVG).

- [ ] **Step 2: Fix index.html — update OG image path and add static SEO fallbacks**

Edit `website-lovable/src/index.html`. Replace the entire `<head>` content:

```html
<!doctype html>
<html lang="zh-HK">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="author" content="NexGen" />

    <title>NexGen — AI 智能助手安裝服務 | 香港</title>
    <meta name="description" content="NexGen 為香港用戶提供一站式 AI 智能助手安裝服務。透過 Telegram 即可使用 AI 對話、記憶、搜尋功能。無需技術知識，24 小時內完成部署。" />

    <meta property="og:title" content="NexGen — AI 智能助手安裝服務" />
    <meta property="og:description" content="一站式 AI 智能助手安裝服務，透過 Telegram 即可使用。" />
    <meta property="og:image" content="https://3nexgen.com/og-image.png" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://3nexgen.com" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://3nexgen.com/og-image.png" />

    <link rel="icon" href="/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Key changes:
- `og:image` now points to absolute URL `https://3nexgen.com/og-image.png` (PNG, not SVG)
- Added static `<title>` and `<meta description>` as fallback for non-JS crawlers
- Added `og:title`, `og:description`, `og:url` fallbacks
- Added explicit `<link rel="icon">`
- Twitter image also updated to absolute PNG URL

- [ ] **Step 3: Add og:image to SEOHead component**

Edit `website-lovable/src/src/components/SEOHead.tsx`. Add the `og:image` and `twitter:image` meta tags inside the `<Helmet>` block, after the `og:type` line (line 34) and before the `twitter:card` line (line 35):

```tsx
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
```

The full modified section (lines 33-36) becomes:

```tsx
      <meta property="og:url" content={`${SITE_URL}${getLocalizedPath(basePath, currentLang)}`} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
```

- [ ] **Step 4: Verify the build still works**

Run:
```bash
cd website-lovable/src && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add website-lovable/src/public/og-image.png website-lovable/src/index.html website-lovable/src/src/components/SEOHead.tsx
git commit -m "fix(website): add OG image and static SEO fallbacks for social sharing"
```

---

### Task 2: Remove Unused Providers from App.tsx

`QueryClientProvider`, `<Toaster>`, and `<Sonner>` are all rendered but none are used by any page.

**Files:**
- Modify: `website-lovable/src/src/App.tsx`

- [ ] **Step 1: Remove unused imports and providers**

Replace the entire `website-lovable/src/src/App.tsx` with:

```tsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/Layout";
import LanguageDetector from "./components/LanguageDetector";
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import Technology from "./pages/Technology";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import Onboarding from "./pages/Onboarding";
import BotGuide from "./pages/BotGuide";
import NotFound from "./pages/NotFound";

/** Page routes shared by both the default (zh-HK, no prefix) and prefixed language layouts. */
function pageRoutes() {
  return (
    <>
      <Route index element={<Index />} />
      <Route path="pricing" element={<Pricing />} />
      <Route path="technology" element={<Technology />} />
      <Route path="faq" element={<FAQ />} />
      <Route path="contact" element={<Contact />} />
      <Route path="terms" element={<Terms />} />
      <Route path="privacy" element={<Privacy />} />
      <Route path="refund" element={<Refund />} />
      <Route path="onboarding" element={<Onboarding />} />
      <Route path="bot-guide" element={<BotGuide />} />
      <Route path="*" element={<NotFound />} />
    </>
  );
}

const App = () => (
  <TooltipProvider>
    <BrowserRouter>
      <Routes>
        {/* Default language (zh-HK) — no URL prefix */}
        <Route element={<LanguageDetector />}>
          <Route element={<Layout />}>
            {pageRoutes()}
          </Route>
        </Route>

        {/* Other languages — /:lang prefix (e.g. /en/pricing, /ja/faq) */}
        <Route path=":lang" element={<LanguageDetector />}>
          <Route element={<Layout />}>
            {pageRoutes()}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
```

Removed:
- `@tanstack/react-query` import and `QueryClientProvider` wrapper
- `sonner` import and `<Sonner />` component
- `toaster` import and `<Toaster />` component
- `queryClient` constant

- [ ] **Step 2: Verify the build still works**

Run:
```bash
cd website-lovable/src && npm run build
```

Expected: Build succeeds. No runtime errors (nothing uses toasts or react-query).

- [ ] **Step 3: Commit**

```bash
git add website-lovable/src/src/App.tsx
git commit -m "fix(website): remove unused QueryClientProvider, Toaster, and Sonner from App"
```

---

### Task 3: Fix Hardcoded Emails in Privacy and Refund Pages

Both pages hardcode `support@3nexgen.com` instead of using the `SUPPORT_EMAIL` constant from `src/lib/constants.ts`.

**Files:**
- Modify: `website-lovable/src/src/pages/Privacy.tsx`
- Modify: `website-lovable/src/src/pages/Refund.tsx`

- [ ] **Step 1: Fix Privacy.tsx**

Add the import at the top of `website-lovable/src/src/pages/Privacy.tsx` (after line 2):

```tsx
import { SUPPORT_EMAIL } from '@/lib/constants';
```

Then replace the hardcoded email block (lines 28-34) with:

```tsx
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-primary hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
```

- [ ] **Step 2: Fix Refund.tsx**

Same change in `website-lovable/src/src/pages/Refund.tsx`. Add the import (after line 2):

```tsx
import { SUPPORT_EMAIL } from '@/lib/constants';
```

Replace the hardcoded email block (lines 28-34) with:

```tsx
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-primary hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
```

- [ ] **Step 3: Verify the build still works**

Run:
```bash
cd website-lovable/src && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add website-lovable/src/src/pages/Privacy.tsx website-lovable/src/src/pages/Refund.tsx
git commit -m "fix(website): use SUPPORT_EMAIL constant in Privacy and Refund pages"
```

---

### Task 4: Fix NotFound.tsx — Replace `<a>` with `<Link>`

The 404 page uses a plain `<a href>` tag for the home link, which causes a full page reload instead of a client-side navigation.

**Files:**
- Modify: `website-lovable/src/src/pages/NotFound.tsx`

- [ ] **Step 1: Replace `<a>` with `<Link>`**

Replace the entire `website-lovable/src/src/pages/NotFound.tsx` with:

```tsx
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation('legal');
  const lp = useLocalizedPath();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t('notFound.title')}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('notFound.message')}</p>
        <Link to={lp("/")} className="text-primary underline hover:text-primary/90">
          {t('notFound.homeLink')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
```

Changes:
- Added `Link` to the `react-router-dom` import (line 1)
- Replaced `<a href={lp("/")}` with `<Link to={lp("/")}`  (line 20)

- [ ] **Step 2: Verify the build still works**

Run:
```bash
cd website-lovable/src && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add website-lovable/src/src/pages/NotFound.tsx
git commit -m "fix(website): use Link instead of <a> in NotFound page to prevent full reload"
```

---

### Task 5: Delete Dead Code and Dead Assets

`NavLink.tsx` is never imported. `placeholder.svg` is never referenced.

**Files:**
- Delete: `website-lovable/src/src/components/NavLink.tsx`
- Delete: `website-lovable/src/public/placeholder.svg`

- [ ] **Step 1: Confirm NavLink.tsx is not imported anywhere**

Run:
```bash
cd website-lovable/src && grep -r "NavLink" --include="*.tsx" --include="*.ts" -l
```

Expected: Only `src/components/NavLink.tsx` itself appears. If any other file imports it, do NOT delete.

- [ ] **Step 2: Confirm placeholder.svg is not referenced anywhere**

Run:
```bash
cd website-lovable/src && grep -r "placeholder" --include="*.tsx" --include="*.ts" --include="*.html" --include="*.css" -l
```

Expected: No matches. If any file references it, do NOT delete.

- [ ] **Step 3: Delete the files**

```bash
rm website-lovable/src/src/components/NavLink.tsx
rm website-lovable/src/public/placeholder.svg
```

- [ ] **Step 4: Verify the build still works**

Run:
```bash
cd website-lovable/src && npm run build
```

Expected: Build succeeds with no errors about missing files.

- [ ] **Step 5: Commit**

```bash
git add -u website-lovable/src/src/components/NavLink.tsx website-lovable/src/public/placeholder.svg
git commit -m "chore(website): delete unused NavLink component and placeholder.svg"
```

---

### Task 6: Add Sitemap Directive to robots.txt

The robots.txt is missing the `Sitemap:` directive, which tells crawlers where to find the sitemap.

**Files:**
- Modify: `website-lovable/src/public/robots.txt`

- [ ] **Step 1: Add Sitemap directive**

Append to the end of `website-lovable/src/public/robots.txt`:

```
Sitemap: https://3nexgen.com/sitemap.xml
```

The full file should read:

```
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /

Sitemap: https://3nexgen.com/sitemap.xml
```

- [ ] **Step 2: Commit**

```bash
git add website-lovable/src/public/robots.txt
git commit -m "fix(website): add Sitemap directive to robots.txt"
```

---

## Verification Checklist

After all tasks are done, run a final build and quick sanity check:

```bash
cd website-lovable/src && npm run build
```

Then verify:
- [ ] `dist/og-image.png` exists in the build output
- [ ] `dist/placeholder.svg` does NOT exist
- [ ] `dist/index.html` contains `<title>NexGen` (static fallback)
- [ ] `dist/index.html` contains `og-image.png` (not `og-image.svg`)
- [ ] `dist/robots.txt` contains `Sitemap:` line
- [ ] No TypeScript errors in build output
