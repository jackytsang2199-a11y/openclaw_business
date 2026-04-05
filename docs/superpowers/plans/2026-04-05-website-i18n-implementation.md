# Website Multi-Language (i18n) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6-language i18n to the NexGen website (zh-HK, en, zh-CN, es, ja, ru) with subpath routing, browser detection, and build-time zh-CN conversion.

**Architecture:** react-i18next with lazy-loaded namespace JSON files served from `public/locales/`. Language prefix routing via React Router (`:lang` param). OpenCC build-time conversion generates zh-CN from zh-HK. AI-generated translations for en/es/ja/ru.

**Tech Stack:** react-i18next, i18next, i18next-http-backend, i18next-browser-languagedetector, opencc-js, Vite plugin, react-helmet-async

**Spec:** `docs/superpowers/specs/2026-04-05-website-multi-language-design.md`

**Note:** The spec shows locale files under `src/i18n/locales/`. This plan uses `public/locales/` instead because `i18next-http-backend` lazy-loads JSON files over HTTP — they must be served as static assets from the `public/` directory in Vite. This is an implementation detail, not a spec deviation.

---

## File Structure Overview

All paths relative to `website-lovable/src/` (the Vite project root).

**New files to create:**
```
public/locales/zh-HK/common.json      (~25 strings)
public/locales/zh-HK/home.json        (~55 strings)
public/locales/zh-HK/pricing.json     (~45 strings)
public/locales/zh-HK/technology.json   (~20 strings)
public/locales/zh-HK/faq.json         (~30 strings)
public/locales/zh-HK/contact.json     (~15 strings)
public/locales/zh-HK/onboarding.json  (~25 strings)
public/locales/zh-HK/botguide.json    (~15 strings)
public/locales/zh-HK/legal.json       (~35 strings)
public/locales/zh-HK/meta.json        (~22 strings)
public/locales/en/    (same 10 files)
public/locales/es/    (same 10 files)
public/locales/ja/    (same 10 files)
public/locales/ru/    (same 10 files)
src/i18n/index.ts                     (i18next init + config)
src/i18n/opencc-convert.ts            (build-time zh-CN generator)
src/hooks/useLocalizedPath.ts         (language-aware link helper)
src/components/LanguageSwitcher.tsx    (globe dropdown)
src/components/LanguageDetector.tsx    (auto-detect + redirect wrapper)
src/components/SEOHead.tsx             (per-page hreflang + meta)
scripts/generate-sitemap.ts           (multi-language sitemap)
```

**Files to modify:**
```
src/main.tsx              (import i18n, add Suspense)
src/App.tsx               (add :lang routes, LanguageDetector wrapper)
src/components/Navbar.tsx (useTranslation, LanguageSwitcher, localized links)
src/components/Footer.tsx (useTranslation, localized links)
src/pages/Index.tsx       (useTranslation for all strings)
src/pages/Pricing.tsx     (useTranslation for tiers, features, billing)
src/pages/Technology.tsx  (useTranslation for tech sections)
src/pages/FAQ.tsx         (useTranslation for categories + QA pairs)
src/pages/Contact.tsx     (useTranslation for form labels + messages)
src/pages/Onboarding.tsx  (useTranslation for form + plans + payment)
src/pages/BotGuide.tsx    (useTranslation for steps)
src/pages/Terms.tsx       (useTranslation for legal content)
src/pages/Privacy.tsx     (useTranslation for privacy content)
src/pages/Refund.tsx      (useTranslation for refund content)
src/pages/NotFound.tsx    (useTranslation for 404 text)
index.html                (remove hardcoded lang/meta - now dynamic)
package.json              (add i18n dependencies)
vite.config.ts            (add OpenCC build plugin)
.gitignore                (add public/locales/zh-CN/)
```

---

## CRITICAL: Strings Must Come From Live Code

The zh-HK JSON files in this plan are a **structural template** — they show key naming conventions, namespace organization, and approximate content. **Do NOT blindly copy string values from this plan.** The codebase has been actively edited and the actual strings may differ.

**For every extraction task (Tasks 4-12), you MUST:**
1. **Read the actual current source file first** (e.g., `src/pages/Pricing.tsx`)
2. Extract every hardcoded Chinese string from the **live code**, not from this plan
3. Use this plan's key naming pattern (e.g., `tiers.starter.name`, `faq.basic.0.q`) as a guide for how to structure keys
4. If a string in the live code differs from what's shown in this plan, **use the live code version**
5. If the live code has strings not listed in this plan, **add them** with consistent key names

The plan's JSON files are ~90% accurate but the source of truth is always the current codebase.

---

## Refactoring Pattern (applies to Tasks 4-12)

Every page refactor follows this exact pattern. Read this before starting any extraction task.

**Step A — Read the current source file** to identify all hardcoded translatable strings. Then create the locale JSON file in `public/locales/zh-HK/{namespace}.json` with those strings.

**Step B — Refactor the component** by:

1. Add import:
```tsx
import { useTranslation } from 'react-i18next';
```

2. Add hook at top of component:
```tsx
const { t } = useTranslation('{namespace}');
```

3. Replace every hardcoded Chinese string with `{t('key')}`:
```tsx
// Before:
<h1>服務條款</h1>

// After:
<h1>{t('title')}</h1>
```

4. For data arrays defined inside the component, keep the array structure but use `t()` for string values:
```tsx
// Before:
const items = [
  { title: "永久記憶", desc: "基於 Qdrant..." },
];

// After:
const items = [
  { title: t('items.memory.title'), desc: t('items.memory.desc') },
];
```

5. For links to internal pages, use the `useLocalizedPath` hook:
```tsx
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
// ...
const lp = useLocalizedPath();
// Before: <Link to="/pricing">
// After:  <Link to={lp('/pricing')}>
```

**Step C — Verify** the page renders identically by running the dev server.

**Step D — Commit** the locale JSON + refactored component together.

---

## Task 1: Install Dependencies and Create i18n Configuration

**Files:**
- Modify: `package.json`
- Create: `src/i18n/index.ts`
- Modify: `src/main.tsx`
- Modify: `.gitignore`

- [ ] **Step 1: Install i18n dependencies**

```bash
cd website-lovable/src
npm install i18next react-i18next i18next-http-backend i18next-browser-languagedetector opencc-js
```

- [ ] **Step 2: Create i18n configuration**

Create `src/i18n/index.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

export const SUPPORTED_LANGUAGES = ['zh-HK', 'en', 'zh-CN', 'es', 'ja', 'ru'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-HK';
export const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

// Languages that use a URL prefix (all except default zh-HK)
export const PREFIXED_LANGUAGES = SUPPORTED_LANGUAGES.filter(l => l !== DEFAULT_LANGUAGE);

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  'zh-HK': '繁體中文',
  'zh-CN': '简体中文',
  'en': 'English',
  'es': 'Español',
  'ja': '日本語',
  'ru': 'Русский',
};

export const NAMESPACES = [
  'common',
  'home',
  'pricing',
  'technology',
  'faq',
  'contact',
  'onboarding',
  'botguide',
  'legal',
  'meta',
] as const;

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: 'common',
    ns: [...NAMESPACES],
    fallbackNS: 'common',

    interpolation: {
      escapeValue: false,
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'nexgen-lang',
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;
```

- [ ] **Step 3: Update main.tsx**

Add i18n import and Suspense wrapper. Read the current `src/main.tsx` first, then modify:

```tsx
import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n';
import './index.css';

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
    <App />
  </Suspense>
);
```

- [ ] **Step 4: Add zh-CN to .gitignore**

Append to `.gitignore`:
```
# Auto-generated zh-CN locale (OpenCC build artifact)
public/locales/zh-CN/
```

- [ ] **Step 5: Create placeholder zh-HK common.json**

Create `public/locales/zh-HK/common.json` with minimal content so the app can boot:

```json
{
  "loading": "載入中..."
}
```

- [ ] **Step 6: Verify app boots without errors**

```bash
cd website-lovable/src
npm run dev
```

Open browser, check console for errors. The app should load with the existing hardcoded Chinese text (i18n is initialized but not yet used by components).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/i18n/index.ts src/main.tsx .gitignore public/locales/zh-HK/common.json
git commit -m "feat(i18n): install dependencies and create i18next configuration"
```

---

## Task 2: Add Language-Aware Routing and Detection

**Files:**
- Create: `src/components/LanguageDetector.tsx`
- Create: `src/hooks/useLocalizedPath.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create useLocalizedPath hook**

Create `src/hooks/useLocalizedPath.ts`:

```typescript
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE, PREFIXED_LANGUAGES, type SupportedLanguage } from '@/i18n';

/**
 * Returns a function that prepends the current language prefix to a path.
 * zh-HK (default) = no prefix: /pricing
 * Other languages = prefix: /en/pricing, /ja/pricing
 */
export function useLocalizedPath() {
  const { i18n } = useTranslation();
  const lang = i18n.language as SupportedLanguage;

  return useCallback(
    (path: string) => {
      if (lang === DEFAULT_LANGUAGE) return path;
      if (PREFIXED_LANGUAGES.includes(lang as any)) {
        return `/${lang}${path}`;
      }
      return path;
    },
    [lang]
  );
}

/**
 * Get localized path for a specific language (used in language switcher).
 */
export function getLocalizedPath(path: string, lang: SupportedLanguage): string {
  if (lang === DEFAULT_LANGUAGE) return path;
  return `/${lang}${path}`;
}

/**
 * Strip language prefix from a path to get the base path.
 * /en/pricing -> /pricing
 * /pricing -> /pricing
 */
export function stripLangPrefix(pathname: string): string {
  for (const lang of PREFIXED_LANGUAGES) {
    if (pathname.startsWith(`/${lang}/`)) {
      return pathname.slice(`/${lang}`.length);
    }
    if (pathname === `/${lang}`) {
      return '/';
    }
  }
  return pathname;
}
```

- [ ] **Step 2: Create LanguageDetector wrapper component**

Create `src/components/LanguageDetector.tsx`:

```tsx
import { useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  PREFIXED_LANGUAGES,
  type SupportedLanguage,
} from '@/i18n';

export default function LanguageDetector() {
  const { lang } = useParams<{ lang?: string }>();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Route has :lang param — validate it
    if (lang) {
      if (PREFIXED_LANGUAGES.includes(lang as any)) {
        if (i18n.language !== lang) {
          i18n.changeLanguage(lang);
        }
      } else {
        // Invalid lang prefix — 404 will handle via route fallthrough
        return;
      }
    } else {
      // No lang prefix = default language (zh-HK) path
      // But check if user has a stored preference that isn't zh-HK
      const stored = localStorage.getItem('nexgen-lang');
      const detected = i18n.language;

      // First visit with no stored preference: detect from browser
      if (!stored && detected !== DEFAULT_LANGUAGE) {
        // Browser language maps to a supported language — redirect
        if (SUPPORTED_LANGUAGES.includes(detected as any) && detected !== DEFAULT_LANGUAGE) {
          navigate(`/${detected}${location.pathname}${location.search}`, { replace: true });
          return;
        }
        // Browser language not supported — fallback to English
        navigate(`/${FALLBACK_LANGUAGE}${location.pathname}${location.search}`, { replace: true });
        return;
      }

      // Stored preference is zh-HK or user is on root intentionally
      if (i18n.language !== DEFAULT_LANGUAGE) {
        i18n.changeLanguage(DEFAULT_LANGUAGE);
      }
    }
  }, [lang, i18n, navigate, location.pathname, location.search]);

  // Update <html lang="..."> attribute
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <Outlet />;
}
```

- [ ] **Step 3: Update App.tsx with language routes**

Read current `src/App.tsx`, then replace with:

```tsx
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import LanguageDetector from "./components/LanguageDetector";

const Index = lazy(() => import("./pages/Index"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Technology = lazy(() => import("./pages/Technology"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Refund = lazy(() => import("./pages/Refund"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const BotGuide = lazy(() => import("./pages/BotGuide"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

function AppRoutes() {
  return (
    <>
      <Route index element={<Suspense fallback={<PageFallback />}><Index /></Suspense>} />
      <Route path="pricing" element={<Suspense fallback={<PageFallback />}><Pricing /></Suspense>} />
      <Route path="technology" element={<Suspense fallback={<PageFallback />}><Technology /></Suspense>} />
      <Route path="faq" element={<Suspense fallback={<PageFallback />}><FAQ /></Suspense>} />
      <Route path="contact" element={<Suspense fallback={<PageFallback />}><Contact /></Suspense>} />
      <Route path="terms" element={<Suspense fallback={<PageFallback />}><Terms /></Suspense>} />
      <Route path="privacy" element={<Suspense fallback={<PageFallback />}><Privacy /></Suspense>} />
      <Route path="refund" element={<Suspense fallback={<PageFallback />}><Refund /></Suspense>} />
      <Route path="onboarding" element={<Suspense fallback={<PageFallback />}><Onboarding /></Suspense>} />
      <Route path="bot-guide" element={<Suspense fallback={<PageFallback />}><BotGuide /></Suspense>} />
      <Route path="*" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default language (zh-HK) — no prefix */}
        <Route element={<LanguageDetector />}>
          <Route element={<Layout />}>
            {AppRoutes()}
          </Route>
        </Route>

        {/* Other languages — /:lang prefix */}
        <Route path=":lang" element={<LanguageDetector />}>
          <Route element={<Layout />}>
            {AppRoutes()}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

Note: If the current App.tsx uses `<BrowserRouter>` in a parent (e.g., main.tsx), adjust accordingly — the Router must wrap the Routes. Check where `<BrowserRouter>` is currently placed and keep it in one location only.

- [ ] **Step 4: Verify routing works**

```bash
npm run dev
```

- Visit `http://localhost:5173/` — should load zh-HK (default)
- Visit `http://localhost:5173/en/` — should load with lang=en
- Visit `http://localhost:5173/de/` — should fall through to 404
- Check browser console for no errors

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLocalizedPath.ts src/components/LanguageDetector.tsx src/App.tsx
git commit -m "feat(i18n): add language-aware routing and detection"
```

---

## Task 3: Create Language Switcher Component

**Files:**
- Create: `src/components/LanguageSwitcher.tsx`
- Modify: `src/components/Navbar.tsx` (add switcher to navbar)

- [ ] **Step 1: Create LanguageSwitcher component**

Create `src/components/LanguageSwitcher.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  type SupportedLanguage,
} from '@/i18n';
import { getLocalizedPath, stripLangPrefix } from '@/hooks/useLocalizedPath';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'inline';
  onSelect?: () => void;
}

export default function LanguageSwitcher({ variant = 'dropdown', onSelect }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLang = i18n.language as SupportedLanguage;

  // Close dropdown on outside click
  useEffect(() => {
    if (variant !== 'dropdown') return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant]);

  function switchLanguage(lang: SupportedLanguage) {
    const basePath = stripLangPrefix(location.pathname);
    const newPath = getLocalizedPath(basePath, lang);
    i18n.changeLanguage(lang);
    navigate(newPath + location.search);
    setOpen(false);
    onSelect?.();
  }

  // Inline variant for mobile menu
  if (variant === 'inline') {
    return (
      <div className="flex flex-col gap-1 py-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => switchLanguage(lang)}
            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
              lang === currentLang
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <span>{LANGUAGE_NAMES[lang]}</span>
            {lang === currentLang && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant for desktop navbar
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Change language"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 rounded-md border bg-popover shadow-lg z-50">
          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => switchLanguage(lang)}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm ${
                  lang === currentLang
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-popover-foreground hover:bg-accent'
                }`}
              >
                <span>{LANGUAGE_NAMES[lang]}</span>
                {lang === currentLang && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add LanguageSwitcher to Navbar**

Read `src/components/Navbar.tsx`. Add the switcher import and place it in the desktop nav (right side, before the CTA button) and in the mobile menu (at the bottom, using `variant="inline"`).

Add import:
```tsx
import LanguageSwitcher from './LanguageSwitcher';
```

In the desktop nav section, before the CTA button:
```tsx
<LanguageSwitcher />
```

In the mobile menu, at the bottom before it closes:
```tsx
<div className="border-t pt-3 mt-3">
  <LanguageSwitcher variant="inline" onSelect={() => setIsOpen(false)} />
</div>
```

- [ ] **Step 3: Verify switcher works**

```bash
npm run dev
```

- Click the globe icon — dropdown should appear with 6 languages
- Select "English" — URL should change to `/en/` and i18n language updates
- Select "繁體中文" — URL should return to `/` (no prefix)
- Mobile: open hamburger → language list should appear at bottom
- Language preference should persist after page reload (check localStorage for `nexgen-lang`)

- [ ] **Step 4: Commit**

```bash
git add src/components/LanguageSwitcher.tsx src/components/Navbar.tsx
git commit -m "feat(i18n): add language switcher component to navbar"
```

---

## Task 4: Extract Common Strings (Navbar + Footer)

**Files:**
- Create: `public/locales/zh-HK/common.json`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/components/Footer.tsx`

- [ ] **Step 1: Create zh-HK/common.json**

Create `public/locales/zh-HK/common.json`:

```json
{
  "loading": "載入中...",
  "nav.home": "首頁",
  "nav.pricing": "收費",
  "nav.technology": "技術",
  "nav.faq": "常見問題",
  "nav.contact": "聯絡我們",
  "nav.cta": "查看方案",
  "nav.telegram": "Telegram AI 機械人",
  "nav.openMenu": "開啟選單",
  "nav.menuLabel": "導航選單",
  "footer.tagline": "AI 智能體安裝服務",
  "footer.subtitle": "擁有你自己的私人 AI 系統",
  "footer.slogan": "你的伺服器。你的數據。",
  "footer.navHeading": "導航",
  "footer.paymentHeading": "付款方式",
  "footer.creditCard": "信用卡",
  "footer.terms": "服務條款",
  "footer.privacy": "私隱政策",
  "footer.refund": "退款政策",
  "footer.copyright": "© 2026 NexGen. All rights reserved."
}
```

- [ ] **Step 2: Refactor Navbar.tsx**

Read `src/components/Navbar.tsx`. Add i18n imports and replace all hardcoded strings:

```tsx
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
```

At the top of the component function:
```tsx
const { t } = useTranslation('common');
const lp = useLocalizedPath();
```

Replace the `navLinks` array:
```tsx
const navLinks = [
  { name: t('nav.home'), path: lp('/') },
  { name: t('nav.pricing'), path: lp('/pricing') },
  { name: t('nav.technology'), path: lp('/technology') },
  { name: t('nav.faq'), path: lp('/faq') },
  { name: t('nav.contact'), path: lp('/contact') },
];
```

Replace all hardcoded text:
- `"查看方案"` → `{t('nav.cta')}`
- `"開啟選單"` → `{t('nav.openMenu')}`
- `"導航選單"` → `{t('nav.menuLabel')}`
- Any `aria-label="Telegram AI 機械人"` → `aria-label={t('nav.telegram')}`
- All `<Link to="/pricing">` etc. → `<Link to={lp('/pricing')}>` 

- [ ] **Step 3: Refactor Footer.tsx**

Read `src/components/Footer.tsx`. Add same imports and replace strings:

```tsx
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
```

At top of component:
```tsx
const { t } = useTranslation('common');
const lp = useLocalizedPath();
```

Replace strings:
- `"AI 智能體安裝服務"` → `{t('footer.tagline')}`
- `"擁有你自己的私人 AI 系統"` → `{t('footer.subtitle')}`
- `"你的伺服器。你的數據。"` → `{t('footer.slogan')}`
- `"導航"` → `{t('footer.navHeading')}`
- `"付款方式"` → `{t('footer.paymentHeading')}`
- `"信用卡"` → `{t('footer.creditCard')}`
- `"服務條款"` → `{t('footer.terms')}`
- `"私隱政策"` → `{t('footer.privacy')}`
- `"退款政策"` → `{t('footer.refund')}`
- `"© 2026 NexGen. All rights reserved."` → `{t('footer.copyright')}`
- Footer nav links: use `lp()` for all internal paths
- `"PayMe"`, `"support@3nexgen.com"`, `"NexGen"` — keep as-is (brand names)

- [ ] **Step 4: Verify navbar and footer render correctly**

```bash
npm run dev
```

Page should display identical Chinese text, now loaded from JSON. Switch to English via the language switcher — the navbar/footer will show English keys (since en/common.json doesn't exist yet, it will show the fallback zh-HK text or the keys).

- [ ] **Step 5: Commit**

```bash
git add public/locales/zh-HK/common.json src/components/Navbar.tsx src/components/Footer.tsx
git commit -m "feat(i18n): extract common strings from Navbar and Footer"
```

---

## Task 5: Extract Home Page Strings (Index.tsx)

**Files:**
- Create: `public/locales/zh-HK/home.json`
- Modify: `src/pages/Index.tsx`

This is the largest page (~695 lines, ~55 strings). The home page has multiple data arrays (demoCases, pluginCards, stats, useCases, techStackCards, steps, FAQ items) and inline text.

- [ ] **Step 1: Create zh-HK/home.json**

Create `public/locales/zh-HK/home.json`:

```json
{
  "hero.subtitle": "Self-Hosted OpenClaw",
  "hero.title": "專屬於你的全配版 AI 智能體",
  "hero.description": "已配置全套插件，提供 Telegram ID 即可開始 — 無需 API Key",
  "hero.bullet1": "一鍵安裝，30 分鐘上線",
  "hero.bullet2": "全套插件已預載（記憶 · 搜尋 · 瀏覽器）",
  "hero.bullet3": "無需任何技術設定，費用全包",
  "hero.flow": "提供 Telegram ID → 付款 → 最快 30 分鐘內上線",
  "hero.cta": "立即開始",
  "hero.learnMore": "了解更多",

  "demo.pauseLabel": "暫停示範",
  "demo.playLabel": "播放示範",
  "demo.online": "在線",
  "demo.inputPlaceholder": "輸入訊息…",

  "demo.cases.0.title": "主動提醒 + 搶票",
  "demo.cases.0.messages.0": "你之前提過想看 Taylor Swift 演唱會 — 明天早上 10 點開賣。需要我自動排隊搶票嗎？",
  "demo.cases.0.messages.1": "好，幫我搶兩張山頂位",
  "demo.cases.0.messages.2": "搶票完成！以下是確認：",
  "demo.cases.1.title": "主動整理 + 旅行",
  "demo.cases.1.messages.0": "你下個月的神樂滑雪場行程 — 今天有 3 成地區未開放。我整理了最新資訊：",
  "demo.cases.1.messages.1": "好，順便查一下住宿",
  "demo.cases.1.messages.2": "收到，正在搜尋附近溫泉旅館…",
  "demo.cases.2.title": "主動追蹤 + 報告",
  "demo.cases.2.messages.0": "A 公司剛發佈了 Q4 財報，已用你慣用格式整理好：",
  "demo.cases.2.messages.1": "毛利率下跌原因？",
  "demo.cases.2.messages.2": "主要因原材料成本上升 18% 及匯率影響。詳細分析已發送。",

  "demo.ticket.title": "搶票成功",
  "demo.ticket.event": "Taylor Swift 演唱會",
  "demo.ticket.seat": "山頂位 A 區 第 3 排",
  "demo.ticket.quantity": "× 2 張",
  "demo.ski.title": "雪道資訊",
  "demo.ski.resort": "神樂滑雪場",
  "demo.ski.intermediate": "中級雪道",
  "demo.ski.snow": "積雪",
  "demo.ski.recommended": "推薦：",
  "demo.finance.title": "Q4 財報摘要",
  "demo.finance.company": "A 公司",
  "demo.finance.revenue": "營收",
  "demo.finance.margin": "毛利率",
  "demo.finance.profit": "淨利",

  "stats.stars": "GitHub ⭐",
  "stats.forks": "分支數量",
  "stats.weeklyUsers": "每週活躍用戶",
  "stats.ranking": "GitHub 全球排名",
  "stats.headline": "Built on the #1 Open-Source AI Agent",
  "stats.subheadline": "基於全球排名第一的開源 AI 智能體平台打造",
  "stats.source": "— OpenClaw 開源項目數據",

  "plugins.headline": "同樣是 OpenClaw AI 助手，我們多了什麼？",
  "plugins.subheadline": "對話。記憶。行動。",
  "plugins.description": "經過數月研究、調試與深度整合，遠超原版 OpenClaw",
  "plugins.hosting": "你的 AI 系統託管於最近的數據中心，確保低延遲、高速回應。所有節點均提供無限流量、DDoS 防護，以及穩定的 AI 運算表現。服務覆蓋全球。",
  "plugins.techComponents": "技術組件",
  "plugins.learnMore": "了解更多",
  "plugins.moreFeatures": "以及更多持續更新的功能 — 查看完整技術架構 →",

  "plugins.memory": "永久記憶",
  "plugins.search": "全網搜尋",
  "plugins.watchdog": "自動修復",
  "plugins.browser": "代你上網",

  "techStack.mem0.name": "Mem0 OSS",
  "techStack.mem0.desc": "基於 OpenAI text-embedding-3-small 自動記憶所有對話與偏好",
  "techStack.qdrant.name": "Qdrant",
  "techStack.qdrant.desc": "高維向量語義索引，毫秒級記憶檢索",
  "techStack.searxng.name": "SearXNG",
  "techStack.searxng.desc": "突破 AI 搜尋封鎖，聚合 70+ 搜尋源",
  "techStack.chromium.name": "Chromium Headless",
  "techStack.chromium.desc": "AI 直接操作瀏覽器 — 填表、格價、訂位、搶票",
  "techStack.acpx.name": "ACPX Runtime",
  "techStack.acpx.desc": "Agent Communication Protocol 即時通訊層",
  "techStack.clawteam.name": "ClawTeam",
  "techStack.clawteam.desc": "venv 隔離 + tmux 3.5a 多進程，智能體分工並行",
  "techStack.watchdog.name": "Gateway Watchdog",
  "techStack.watchdog.desc": "24/7 連線監控，斷線自動重連，多節點故障轉移",

  "useCases.0.title": "自動追蹤競爭對手",
  "useCases.0.prompt": "「A 公司出了新財報，自動整理重點與上季比較」",
  "useCases.0.tags": "自動化,搜尋",
  "useCases.1.title": "每日自動簡報",
  "useCases.1.prompt": "「每天早上 8 點自動整理我追蹤的 5 個 RSS + 新聞源」",
  "useCases.1.tags": "自動化,排程",
  "useCases.2.title": "搶票、訂位、格價",
  "useCases.2.prompt": "「陳奕迅演唱會明天開賣，9:55 自動排隊搶兩張」",
  "useCases.2.tags": "瀏覽器,Agent",
  "useCases.3.title": "瀏覽器自動操作",
  "useCases.3.prompt": "「幫我上 HKTVmall 格價，列出最便宜的三個選項」",
  "useCases.3.tags": "瀏覽器,搜尋",
  "useCases.4.title": "記住你的一切",
  "useCases.4.prompt": "「我上次說想換工作，你幫我追蹤了多久？有什麼進展？」",
  "useCases.4.tags": "記憶,Agent",
  "useCases.5.title": "全網即時搜尋",
  "useCases.5.prompt": "「Reddit 和連登今天有沒有人討論 XX 股票？」",
  "useCases.5.tags": "搜尋,自動化",

  "cta.pricing": "由 HK$188/月起 — 季度計劃，每年節省高達 HK$1,200",
  "cta.start": "立即開始",

  "comparison.title": "省時間，不是學技術",
  "comparison.subtitle": "你只需要使用，技術的事全部由我們處理。",
  "comparison.headerSelf": "自己安裝 OpenClaw",
  "comparison.headerNexgen": "找 NexGen",
  "comparison.time": "時間",
  "comparison.timeSelf": "3-8 小時（不計 debug）",
  "comparison.timeNexgen": "30 分鐘遠程裝好",
  "comparison.tech": "技術要求",
  "comparison.techSelf": "Docker、VPN、API key、Linux…",
  "comparison.techNexgen": "零。懂用 Telegram 就行",
  "comparison.memory": "長期記憶",
  "comparison.memorySelf": "❌ 自行設定 Qdrant + Mem0",
  "comparison.memoryNexgen": "✅ 裝好即用",
  "comparison.search": "即時搜尋",
  "comparison.searchSelf": "❌ 自行架設 SearXNG",
  "comparison.searchNexgen": "✅ 裝好即用",
  "comparison.recovery": "斷線修復",
  "comparison.recoverySelf": "❌ 手動 debug",
  "comparison.recoveryNexgen": "✅ Watchdog 自動 24/7",
  "comparison.support": "售後支援",
  "comparison.supportSelf": "❌ 自行上網找答案",
  "comparison.supportNexgen": "✅ 中文電郵支援",

  "steps.title": "三步開始使用",
  "steps.subtitle": "安裝。使用。忘記技術。",
  "steps.0.title": "選擇方案並提交資料",
  "steps.0.desc": "選擇適合你的計劃，提供 Telegram Bot Token 和 User ID",
  "steps.1.title": "付款後自動安裝",
  "steps.1.desc": "確認付款後，系統自動為你安裝全套 AI 環境。最快 30 分鐘完成。",
  "steps.2.title": "開始使用",
  "steps.2.desc": "在 Telegram 直接與你的 AI 對話，就這麼簡單",

  "inlineFaq.title": "常見問題",
  "inlineFaq.0.q": "我完全不懂技術，適合使用嗎？",
  "inlineFaq.0.a": "完全適合！整個安裝、設定、維護過程由我們的工程團隊處理。你只需要提供 Telegram ID，選擇方案並付款，最快 30 分鐘內即可開始使用。日後有任何問題，透過電郵提交工單即可。",
  "inlineFaq.1.q": "月費包含什麼？",
  "inlineFaq.1.a": "月費已包含 VPS 伺服器、AI 模型 API 使用費、系統維護及更新。無隱藏收費，無額外費用。",
  "inlineFaq.2.q": "跟 ChatGPT Plus 有什麼分別？",
  "inlineFaq.2.a": "ChatGPT Plus 是聊天機器人，我們安裝的是 AI 智能體。智能體可以記住所有對話、搜尋全網資訊、操作瀏覽器幫你做事 — 不只是回答問題，是真正動手幫你完成任務。",
  "inlineFaq.3.q": "如何開始使用？",
  "inlineFaq.3.a": "提供你的 Telegram ID，選擇方案並付款，我們最快 30 分鐘內完成安裝。完成後你會收到通知，直接在 Telegram 開始使用。",
  "inlineFaq.viewAll": "查看所有常見問題 →",

  "story.title": "我們為什麼做這件事",
  "story.quote": "原版 OpenClaw 是個好開始，但遠遠不夠。記憶只有基本功能，搜尋受限，斷線了？自己 debug。這不是真正的 AI 智能體。",
  "story.slogan": "你的伺服器。你的數據。",

  "trust.dataLocal": "資料在你機器",
  "trust.emailSupport": "電郵支援",
  "trust.noContract": "不綁約",
  "trust.noHiddenFees": "無隱藏費用",

  "finalCta.title": "今天安裝，今晚開始使用",
  "finalCta.subtitle": "即時遠程安裝，最快 30 分鐘完成",
  "finalCta.button": "由 HK$188/月起 — 立即開始",
  "finalCta.support": "提交支援工單"
}
```

- [ ] **Step 2: Refactor Index.tsx**

Read `src/pages/Index.tsx`. Add imports:

```tsx
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
```

At top of component:
```tsx
const { t } = useTranslation('home');
const lp = useLocalizedPath();
```

Replace all hardcoded strings with `t()` calls using the keys from home.json. For data arrays:

```tsx
// demoCases — rebuild using t()
const demoCases = [
  {
    title: t('demo.cases.0.title'),
    messages: [
      { type: 'ai', text: t('demo.cases.0.messages.0') },
      { type: 'user', text: t('demo.cases.0.messages.1') },
      { type: 'ai', text: t('demo.cases.0.messages.2') },
    ],
  },
  // ... repeat for cases 1, 2
];

// useCases — rebuild using t()
const useCases = [0, 1, 2, 3, 4, 5].map(i => ({
  title: t(`useCases.${i}.title`),
  prompt: t(`useCases.${i}.prompt`),
  tags: t(`useCases.${i}.tags`).split(','),
}));

// techStackCards — rebuild using t()
const techStackKeys = ['mem0', 'qdrant', 'searxng', 'chromium', 'acpx', 'clawteam', 'watchdog'];
const techStackCards = techStackKeys.map(key => ({
  name: t(`techStack.${key}.name`),
  desc: t(`techStack.${key}.desc`),
  // Keep icon/color properties as-is (not translatable)
}));

// steps — rebuild using t()
const steps = [0, 1, 2].map(i => ({
  title: t(`steps.${i}.title`),
  desc: t(`steps.${i}.desc`),
}));

// inlineFaq — rebuild using t()
const inlineFaq = [0, 1, 2, 3].map(i => ({
  q: t(`inlineFaq.${i}.q`),
  a: t(`inlineFaq.${i}.a`),
}));
```

All internal `<Link to="/pricing">` → `<Link to={lp('/pricing')}>`, etc.

- [ ] **Step 3: Verify home page renders correctly**

```bash
npm run dev
```

Home page should display identical to before. Check the Telegram demo mockup, stats, use cases, comparison table, steps, and FAQ sections.

- [ ] **Step 4: Commit**

```bash
git add public/locales/zh-HK/home.json src/pages/Index.tsx
git commit -m "feat(i18n): extract home page strings to locale file"
```

---

## Task 6: Extract Pricing Page Strings

**Files:**
- Create: `public/locales/zh-HK/pricing.json`
- Modify: `src/pages/Pricing.tsx`

- [ ] **Step 1: Create zh-HK/pricing.json**

Create `public/locales/zh-HK/pricing.json`:

```json
{
  "pageTitle": "選擇最適合你的方案",
  "pageSubtitle": "全包月費，沒有隱藏費用，沒有合約。",

  "billing.monthly": "月費 (彈性)",
  "billing.quarterly": "季度 (推薦)",
  "billing.annual": "年費 (最優惠)",
  "billing.bestValue": "最優惠",
  "billing.perMonth": "/月",
  "billing.quarterlyTotal": "季度合計 HK$",
  "billing.annualTotal": "年費合計 HK$",
  "billing.savingsYearly": "比月費每年節省 HK$",
  "billing.savingsHint": "選擇季度計劃，每年可節省高達 HK$",

  "tiers.starter.name": "基本版",
  "tiers.starter.label": "AI 對話工具",
  "tiers.starter.tagline": "隨時提問，即時回答",
  "tiers.starter.description": "在 Telegram 上擁有一位隨時待命的 AI 對話助手。基礎配置，即開即用。適合偶爾使用 AI 的用戶。",
  "tiers.starter.tokens": "5,000,000",

  "tiers.pro.name": "專業版",
  "tiers.pro.label": "你的專屬 AI 助手",
  "tiers.pro.tagline": "越用越了解你，幫你搜尋全網",
  "tiers.pro.description": "記住你說過的每一句話，搜尋全網最新資訊，全天候穩定運行。不只是問答機器，是了解你的專屬助理。",
  "tiers.pro.tokens": "10,000,000",
  "tiers.pro.badge": "推薦",

  "tiers.elite.name": "旗艦版",
  "tiers.elite.label": "你的 AI 團隊",
  "tiers.elite.tagline": "多個 AI 同時工作，替你動手做事",
  "tiers.elite.description": "多個 AI 智能體同時工作 — 一個幫你搜資料，一個寫報告，一個替你格價搶票。支援瀏覽器自動操作，適合創業者和重度用戶。",
  "tiers.elite.tokens": "20,000,000",

  "features.memory": "永久記憶",
  "features.memoryPro": "記住所有對話、偏好、習慣",
  "features.search": "全網搜尋",
  "features.searchPro": "包括 Reddit 等封鎖 AI 的網站",
  "features.searchElite": "自訂搜尋配置",
  "features.watchdog": "24/7 自動恢復",
  "features.watchdogElite": "全套 watchdog 監控",
  "features.browser": "瀏覽器操作",
  "features.browserElite": "格價、訂位、填表、搶票",
  "features.multiAgent": "多智能體協作",
  "features.multiAgentElite": "多個 AI 分工並行",

  "features.tokensLabel": "每月",
  "features.tokensUnit": "tokens",
  "features.dailyApprox": "約每日",
  "features.conversations": "次對話",

  "openClaw.automate.title": "自動化日常",
  "openClaw.automate.desc": "設定提醒、排行程、管理日程，用對話指令完成日常瑣事",
  "openClaw.research.title": "研究與資料",
  "openClaw.research.desc": "搜尋全網、整理資料、生成報告，你專注其他事",
  "openClaw.integrate.title": "智能整合",
  "openClaw.integrate.desc": "連接多種工具與平台，自動執行工作流程",
  "openClaw.browser.title": "瀏覽器自動化",
  "openClaw.browser.desc": "格價、訂位、填表、搶票，AI 替你操作瀏覽器",

  "payment.methods": "付款方式：信用卡 / PayMe",
  "payment.info": "提交表格後，選擇付款方式即可完成訂購。付款確認後，我們會在 30 分鐘內完成安裝。",
  "payment.helpTitle": "需要協助選擇？",
  "payment.helpDesc": "提交支援工單，我們會為你推薦最適合的方案。",
  "payment.helpCta": "提交支援工單"
}
```

- [ ] **Step 2: Refactor Pricing.tsx**

Read `src/pages/Pricing.tsx`. Add i18n imports and hook. Replace all hardcoded strings with `t()` calls following the pattern described above. Key changes:

- `billingCycles` array: use `t('billing.monthly')`, `t('billing.quarterly')`, `t('billing.annual')`
- `tiers` array: use `t('tiers.starter.name')`, etc.
- Feature labels: use `t('features.memory')`, etc.
- OpenClaw features: use `t('openClaw.automate.title')`, etc.
- All `<Link>` to internal pages: wrap with `lp()`

- [ ] **Step 3: Verify pricing page**

Check all 3 tiers render, billing toggle works, feature matrix displays correctly.

- [ ] **Step 4: Commit**

```bash
git add public/locales/zh-HK/pricing.json src/pages/Pricing.tsx
git commit -m "feat(i18n): extract pricing page strings to locale file"
```

---

## Task 7: Extract Technology Page Strings

**Files:**
- Create: `public/locales/zh-HK/technology.json`
- Modify: `src/pages/Technology.tsx`

- [ ] **Step 1: Create zh-HK/technology.json**

Create `public/locales/zh-HK/technology.json`:

```json
{
  "pageTitle": "我們的技術生態系統",
  "pageSubtitle": "經過數月研究與深度整合，每個組件都經過嚴格測試。這不是原版 OpenClaw — 這是完整的 AI 生態系統。",

  "sections.openclaw.name": "OpenClaw",
  "sections.openclaw.headline": "全球第一開源 AI 智能體框架",
  "sections.openclaw.body": "200,000+ GitHub Stars，全球 200 萬人每週使用。我們基於此平台深度定製，加入完整插件生態，打造遠超原版的完整系統。",

  "sections.mem0.name": "Mem0 + Qdrant",
  "sections.mem0.headline": "向量級永久記憶 — AI 最強大腦",
  "sections.mem0.body": "不是 ChatGPT 那種 100 條記憶上限。基於 Qdrant 向量資料庫 + Mem0 記憶引擎，你說過的每一句話，它永遠記得。三個月前提過的偏好？它記得。越用越聰明，越用越了解你。",

  "sections.searxng.name": "SearXNG",
  "sections.searxng.headline": "突破 AI 搜尋封鎖 — 全網搜尋引擎",
  "sections.searxng.body": "ChatGPT 的搜尋被大量網站封鎖 — Reddit、論壇、部分新聞網站都搜不到。SearXNG 是自架元搜尋引擎，bypass 所有 AI 搜尋封鎖，即時搜尋全網資訊。ChatGPT 搜不到的，它搜得到。",

  "sections.chromium.name": "Chromium Headless",
  "sections.chromium.headline": "AI 代你操作瀏覽器 — 不只聊天，真正做事",
  "sections.chromium.body": "無頭瀏覽器自動化引擎。AI 直接操作瀏覽器幫你填表、格價、訂位、搶票、查評價。不只是回答問題 — 是真正動手幫你完成任務。（旗艦版專屬功能）",

  "sections.docker.name": "Docker",
  "sections.docker.headline": "容器化一鍵部署 — 穩定可靠",
  "sections.docker.body": "整套系統以 Docker 容器化部署。環境完全隔離，安全穩定，一鍵啟動。你的系統獨立運行，需要搬遷時一鍵打包，資料完整保留。",

  "sections.acpx.name": "ACPX",
  "sections.acpx.headline": "ACP 協議運行環境",
  "sections.acpx.body": "多個 AI 同時工作時，需要互相溝通協調。ACPX 讓它們即時分配任務，不會重複工作。",

  "sections.clawteam.name": "ClawTeam",
  "sections.clawteam.headline": "多智能體協作框架",
  "sections.clawteam.body": "多個 AI 智能體獨立運行、分工並行，同時處理不同任務。一個搜資料，一個寫報告，互不干擾。",

  "sections.watchdog.name": "Gateway Watchdog",
  "sections.watchdog.headline": "自動恢復守護進程",
  "sections.watchdog.body": "24/7 連線監控系統，自動偵測斷線並重新連接，支援多節點故障轉移，確保服務永不中斷。",

  "privacy.title": "數據私隱",
  "privacy.body": "你的對話記錄和記憶儲存在你自己的伺服器上，不會被我們記錄或存儲。AI 模型調用使用加密 API 通道，確保通訊安全。",
  "privacy.learnMore": "想了解更多？",
  "privacy.viewPricing": "查看收費方案 →",
  "privacy.support": "提交支援工單"
}
```

- [ ] **Step 2: Refactor Technology.tsx**

Add i18n imports. Replace the `techSections` array values with `t()` calls. Replace CTA links with `lp()`.

- [ ] **Step 3: Verify and commit**

```bash
git add public/locales/zh-HK/technology.json src/pages/Technology.tsx
git commit -m "feat(i18n): extract technology page strings to locale file"
```

---

## Task 8: Extract FAQ Page Strings

**Files:**
- Create: `public/locales/zh-HK/faq.json`
- Modify: `src/pages/FAQ.tsx`

- [ ] **Step 1: Create zh-HK/faq.json**

Create `public/locales/zh-HK/faq.json`:

```json
{
  "pageTitle": "有問題？",
  "pageSubtitle": "我們已經準備好答案",

  "categories.basic": "基本問題",
  "categories.billing": "收費與付款",
  "categories.features": "功能與技術",
  "categories.support": "售後支援",

  "basic.0.q": "這跟 ChatGPT 有什麼不同？",
  "basic.0.a": "ChatGPT 是共用的雲端服務。我們提供的是安裝在你自己設備上的獨立 AI 智能體，擁有永久記憶、全網搜尋、瀏覽器自動化等功能 — 這些都是 ChatGPT 做不到的。",
  "basic.1.q": "我完全不懂技術，可以用嗎？",
  "basic.1.a": "完全可以。我們負責所有技術設定，你只需要在 Telegram 跟 AI 對話，就像跟朋友聊天一樣簡單。",
  "basic.2.q": "安裝需要多久？",
  "basic.2.a": "最快 30 分鐘。我們為你設定獨立伺服器並完成安裝，你不需要做任何技術操作。",
  "basic.3.q": "我需要自己準備伺服器嗎？",
  "basic.3.a": "不需要。月費已包含獨立伺服器，由我們代為設定和管理。",

  "billing.0.q": "有沒有合約？可以隨時取消嗎？",
  "billing.0.a": "沒有合約。月費、季度和年費三種計劃可選。季度及年費計劃享有折扣，隨時取消，不設退款。服務將於當前計費週期結束後停止。",
  "billing.1.q": "月費包含什麼？",
  "billing.1.a": "月費是全包價，包括 VPS 伺服器、AI 運算費用、系統維護和監控。你不需要額外支付任何費用。",
  "billing.2.q": "接受什麼付款方式？",
  "billing.2.a": "支援信用卡（Visa / Mastercard）及 PayMe。信用卡付款後自動開始安裝，PayMe 需人工確認。",

  "features.0.q": "永久記憶是什麼意思？",
  "features.0.a": "基於 Qdrant 向量資料庫 + Mem0 記憶引擎，AI 會記住你說過的每一句話。不像 ChatGPT 只有 100 條記憶上限 — 三個月前提過的偏好，它都記得。",
  "features.1.q": "全網搜尋跟 ChatGPT 的搜尋有什麼不同？",
  "features.1.a": "ChatGPT 的搜尋被大量網站封鎖（如 Reddit）。我們用 SearXNG 自架搜尋引擎，可以搜到 ChatGPT 搜不到的內容。",
  "features.2.q": "瀏覽器自動化可以做什麼？",
  "features.2.a": "AI 可以直接操作瀏覽器幫你填表、格價、訂位、搶票、查評價。這是旗艦版的專屬功能。",
  "features.3.q": "我的資料安全嗎？",
  "features.3.a": "你的所有對話記錄和記憶都儲存在你自己的伺服器上，不會被我們記錄或存儲。AI 模型調用使用加密 API 通道，確保通訊安全。",

  "support.0.q": "如果系統出問題怎麼辦？",
  "support.0.a": "專業版和旗艦版包含自動恢復功能（Watchdog），系統會 24/7 監控並自動修復。如需人工支援，可透過電郵提交支援工單 (support@3nexgen.com)。",
  "support.1.q": "可以升級或降級方案嗎？",
  "support.1.a": "可以。隨時透過電郵提交支援工單，差價按比例計算。",
  "support.2.q": "如果我想取消服務會怎樣？",
  "support.2.a": "你可以隨時取消。服務將於當前計費週期結束後停止，伺服器將會回收。不設退款。",

  "cantFind": "找不到答案？",
  "supportCta": "提交支援工單",
  "moreQuestions": "還有其他問題？"
}
```

- [ ] **Step 2: Refactor FAQ.tsx**

Add i18n imports. Rebuild the FAQ categories array using `t()` calls:

```tsx
const categories = [
  {
    name: t('categories.basic'),
    items: [0, 1, 2, 3].map(i => ({ q: t(`basic.${i}.q`), a: t(`basic.${i}.a`) })),
  },
  {
    name: t('categories.billing'),
    items: [0, 1, 2].map(i => ({ q: t(`billing.${i}.q`), a: t(`billing.${i}.a`) })),
  },
  {
    name: t('categories.features'),
    items: [0, 1, 2, 3].map(i => ({ q: t(`features.${i}.q`), a: t(`features.${i}.a`) })),
  },
  {
    name: t('categories.support'),
    items: [0, 1, 2].map(i => ({ q: t(`support.${i}.q`), a: t(`support.${i}.a`) })),
  },
];
```

- [ ] **Step 3: Verify and commit**

```bash
git add public/locales/zh-HK/faq.json src/pages/FAQ.tsx
git commit -m "feat(i18n): extract FAQ page strings to locale file"
```

---

## Task 9: Extract Contact Page Strings

**Files:**
- Create: `public/locales/zh-HK/contact.json`
- Modify: `src/pages/Contact.tsx`

- [ ] **Step 1: Create zh-HK/contact.json**

Create `public/locales/zh-HK/contact.json`:

```json
{
  "pageTitle": "提交支援工單",
  "pageSubtitle": "填寫以下表格，我們會在 24 小時內透過電郵回覆。",

  "form.orderNumber": "訂單號碼",
  "form.orderOptional": "（選填）",
  "form.orderPlaceholder": "例如：T1043",
  "form.email": "電郵地址",
  "form.emailPlaceholder": "you@example.com",
  "form.subject": "主題",
  "form.subjectPlaceholder": "例如：無法連接 AI 助手",
  "form.description": "問題描述",
  "form.descriptionPlaceholder": "請詳細描述您遇到的問題...",
  "form.submit": "提交工單",

  "success.title": "工單已提交",
  "success.message": "我們會盡快透過電郵回覆。",
  "success.another": "提交另一個工單",

  "info.directEmail": "你也可以直接發送電郵至",
  "info.faqHint": "常見問題可能已有解答",
  "info.viewFaq": "查看 FAQ"
}
```

- [ ] **Step 2: Refactor Contact.tsx**

Add i18n imports and replace all form labels, placeholders, validation messages, and info text with `t()` calls.

- [ ] **Step 3: Verify and commit**

```bash
git add public/locales/zh-HK/contact.json src/pages/Contact.tsx
git commit -m "feat(i18n): extract contact page strings to locale file"
```

---

## Task 10: Extract Onboarding Page Strings

**Files:**
- Create: `public/locales/zh-HK/onboarding.json`
- Modify: `src/pages/Onboarding.tsx`

- [ ] **Step 1: Create zh-HK/onboarding.json**

Create `public/locales/zh-HK/onboarding.json`:

```json
{
  "pageTitle": "完成設定",
  "pageSubtitle": "填寫以下資料並選擇付款方式。付款確認後，我們會在 30 分鐘內完成安裝。",

  "form.plan": "服務計劃",
  "form.planPlaceholder": "選擇你的方案",
  "form.email": "電郵地址",
  "form.emailPlaceholder": "your@email.com",
  "form.emailValidation": "請輸入有效的電郵地址",
  "form.botToken": "Telegram Bot Token",
  "form.botTokenPlaceholder": "例如：123456789:ABCdefGHIjklMNOpqrsTUV",
  "form.botTokenFormat": "Token 格式應為：數字:英文字母組合",
  "form.userId": "Telegram User ID",
  "form.userIdPlaceholder": "例如：123456789",
  "form.userIdFormat": "User ID 應為至少 5 位數字",
  "form.botName": "Bot 顯示名稱",
  "form.botNameOptional": "（選填）",
  "form.botNamePlaceholder": "例如：我的 AI 助手",

  "plans.starter.monthly": "基本版 — 月費 HK$248/月",
  "plans.starter.quarterly": "基本版 — 季度 HK$188/月（合計 HK$564）",
  "plans.starter.annual": "基本版 — 年費 HK$158/月（合計 HK$1,896）",
  "plans.pro.monthly": "專業版 — 月費 HK$398/月",
  "plans.pro.quarterly": "專業版 — 季度 HK$298/月（合計 HK$894）⭐ 推薦",
  "plans.pro.annual": "專業版 — 年費 HK$248/月（合計 HK$2,976）",
  "plans.elite.monthly": "旗艦版 — 月費 HK$598/月",
  "plans.elite.quarterly": "旗艦版 — 季度 HK$458/月（合計 HK$1,374）",
  "plans.elite.annual": "旗艦版 — 年費 HK$388/月（合計 HK$4,656）",

  "optgroup.starter": "基本版 Starter",
  "optgroup.pro": "專業版 Pro ⭐",
  "optgroup.elite": "旗艦版 Elite",

  "tooltip.botToken.title": "如何取得 Bot Token：",
  "tooltip.botToken.step1": "在 Telegram 搜尋 BotFather（認住藍色剔號 ✓）",
  "tooltip.botToken.step2": "輸入",
  "tooltip.botToken.step3": "設定 Bot 顯示名稱和 username（必須以 bot 結尾）",
  "tooltip.botToken.step4": "BotFather 會發送一串 Token，格式如",
  "tooltip.botToken.step5": "複製整串 Token 貼到這裏",
  "tooltip.botToken.guide": "查看完整圖文教學 →",

  "tooltip.userId.title": "如何取得 User ID：",
  "tooltip.userId.step1": "在 Telegram 搜尋",
  "tooltip.userId.step2": "向它發送任何訊息",
  "tooltip.userId.step3": "它會回覆你的 User ID（一串數字）",
  "tooltip.userId.step4": "複製這個數字貼到這裏",

  "form.submit": "提交並前往付款",
  "form.submitting": "提交中…",
  "form.submitHint": "提交後選擇付款方式，信用卡付款即時開始安裝",

  "payment.confirmed": "資料已確認",
  "payment.selected": "你選擇了：",
  "payment.chooseMethod": "選擇付款方式完成訂購：",
  "payment.creditCard": "信用卡 / Apple Pay 付款",
  "payment.payme": "PayMe 付款",
  "payment.paymeLink": "請使用以下 PayMe 連結付款：",
  "payment.copyLink": "複製連結",
  "payment.paymeConfirm": "付款後，請發送電郵確認以便我們安排安裝：",
  "payment.sendConfirmEmail": "發送付款確認電郵",
  "payment.editInfo": "修改資料",
  "payment.creditCardNote": "信用卡付款後自動開始安裝（最快 30 分鐘）。",
  "payment.paymeNote": "PayMe 付款需人工確認，安裝時間可能較長。",
  "payment.contactUs": "如有問題，請聯絡",

  "email.subject": "NexGen PayMe 付款確認 — ",
  "email.plan": "服務計劃:",
  "email.emailLabel": "電郵:",
  "email.botTokenLabel": "Bot Token:",
  "email.userIdLabel": "Telegram User ID:",
  "email.botNameLabel": "Bot 顯示名稱:",
  "email.notFilled": "未填寫",
  "email.paymentMethod": "付款方式: PayMe",
  "email.confirmNote": "請回覆此電郵確認收款後安排安裝。",

  "help.botGuide": "需要幫助建立 Telegram Bot？",
  "help.viewGuide": "查看圖文教學",
  "help.issues": "遇到問題？",
  "help.support": "提交支援工單"
}
```

- [ ] **Step 2: Refactor Onboarding.tsx**

Add i18n imports. Replace all form labels, plan options, tooltip text, payment screen text, and email template strings with `t()` calls. The plan `<select>` options use `t('plans.starter.monthly')`, etc. Tooltip content uses `t('tooltip.botToken.step1')`, etc.

- [ ] **Step 3: Verify and commit**

```bash
git add public/locales/zh-HK/onboarding.json src/pages/Onboarding.tsx
git commit -m "feat(i18n): extract onboarding page strings to locale file"
```

---

## Task 11: Extract Bot Guide Page Strings

**Files:**
- Create: `public/locales/zh-HK/botguide.json`
- Modify: `src/pages/BotGuide.tsx`

- [ ] **Step 1: Create zh-HK/botguide.json**

Create `public/locales/zh-HK/botguide.json`:

```json
{
  "pageTitle": "如何建立 Telegram Bot",
  "pageSubtitle": "只需 2 分鐘，跟著以下步驟即可完成。",
  "backLink": "← 返回設定表格",

  "steps.0.title": "開啟 BotFather",
  "steps.0.instruction": "在 Telegram 搜尋 @BotFather 並開始對話。",
  "steps.0.hint": "或直接點擊：",

  "steps.1.title": "建立新 Bot",
  "steps.1.instruction": "發送 /newbot 指令。",
  "steps.1.detail1": "輸入 Bot 的顯示名稱（例如：「我的 AI 助手」）。",
  "steps.1.detail2": "輸入 Bot 的用戶名（必須以 bot 結尾，例如：my_ai_assistant_bot）。",

  "steps.2.title": "複製 Bot Token",
  "steps.2.instruction": "BotFather 會回覆一串 Token（格式如：123456789:ABCdefGHIjklMNOpqrsTUVwxyz）。",
  "steps.2.detail1": "將此 Token 貼到我們的設定表格中。",

  "steps.3.title": "查詢您的 Telegram User ID",
  "steps.3.instruction": "在 Telegram 搜尋 @userinfobot 並開始對話。",
  "steps.3.detail1": "發送任何訊息，Bot 會回覆你的 User ID（一串數字）。",
  "steps.3.detail2": "將此 ID 貼到設定表格中。",

  "doneCta": "已完成？返回填寫設定表格"
}
```

- [ ] **Step 2: Refactor BotGuide.tsx**

Add i18n imports. Replace step titles, instructions, details with `t()` calls. The `steps` array should use indexed keys.

- [ ] **Step 3: Verify and commit**

```bash
git add public/locales/zh-HK/botguide.json src/pages/BotGuide.tsx
git commit -m "feat(i18n): extract bot guide page strings to locale file"
```

---

## Task 12: Extract Legal Page Strings (Terms + Privacy + Refund + NotFound)

**Files:**
- Create: `public/locales/zh-HK/legal.json`
- Modify: `src/pages/Terms.tsx`
- Modify: `src/pages/Privacy.tsx`
- Modify: `src/pages/Refund.tsx`
- Modify: `src/pages/NotFound.tsx`

- [ ] **Step 1: Create zh-HK/legal.json**

Create `public/locales/zh-HK/legal.json`:

```json
{
  "terms.title": "服務條款",
  "terms.scope.title": "服務範圍",
  "terms.scope.body": "NexGen 提供遠程 OpenClaw AI 助手安裝及維護服務。服務內容包括在客戶指定的 VPS 伺服器上安裝及配置 AI 智能體系統，以及持續的技術支援和系統維護。",
  "terms.payment.title": "付款條款",
  "terms.payment.body": "所有方案均為預付制，提供月費、季度及年費三種計劃。季度及年費計劃享有折扣。所有費用以港幣 (HKD) 計算。付款後不設退款。",
  "terms.guarantee.title": "服務保證",
  "terms.guarantee.body": "我們承諾 99% 以上的服務可用性。如因我方原因導致服務中斷超過 24 小時，將按比例補償受影響的服務天數。",
  "terms.termination.title": "終止服務",
  "terms.termination.body": "客戶可隨時聯絡我們取消服務。取消後，服務將於當前計費週期結束後停止，伺服器將會回收。",
  "terms.disclaimer.title": "免責聲明",
  "terms.disclaimer.body": "AI 助手的回覆僅供參考，不構成專業建議。NexGen 不對因使用或依賴 AI 回覆而產生的任何損失承擔責任。",
  "terms.acceptableUse.title": "可接受使用",
  "terms.acceptableUse.body": "客戶不得使用本服務進行任何違法活動，包括但不限於發送垃圾訊息、散播惡意軟件、侵犯他人私隱或知識產權。違反此條款將導致服務立即終止，不設退款。",
  "terms.law.title": "適用法律",
  "terms.law.body": "本條款受香港特別行政區法律管轄。任何因本條款引起的爭議，雙方同意提交香港法院管轄。",
  "terms.changes.title": "條款修改",
  "terms.changes.body": "我們保留隨時修改本條款的權利。修改後的條款將在本頁面公佈，並更新「最後更新」日期。繼續使用服務即表示接受修改後的條款。",
  "terms.lastUpdated": "最後更新：2026 年 4 月",

  "privacy.title": "私隱政策",
  "privacy.collection.title": "資料收集",
  "privacy.collection.body": "我們收集的個人資料包括：電郵地址、Telegram Bot Token、Telegram User ID 及付款資訊。這些資料僅在您主動提供時收集。",
  "privacy.usage.title": "資料用途",
  "privacy.usage.body": "個人資料僅用於提供及改善服務，包括帳戶管理、技術支援、服務通知及系統維護。",
  "privacy.storage.title": "資料儲存",
  "privacy.storage.body": "您的對話數據儲存在您的專屬 VPS 伺服器上，不會與其他客戶共用。我們不會存取或備份您的對話內容。",
  "privacy.sharing.title": "第三方共享",
  "privacy.sharing.body": "我們不會將您的個人資料出售或分享給第三方，除非法律要求或獲得您的明確同意。",
  "privacy.proxy.title": "API 代理",
  "privacy.proxy.body": "所有 API 請求通過加密代理伺服器轉發，您的 VPS 上不存儲任何真實 API 密鑰。代理伺服器僅處理請求轉發，不會記錄或存儲對話內容。",
  "privacy.thirdParty.title": "第三方服務",
  "privacy.thirdParty.body": "本網站使用以下第三方服務：Lemon Squeezy（付款處理）、Google Fonts（字體載入）。這些服務可能會收集您的 IP 地址及使用資訊。詳情請參閱各服務的私隱政策。",
  "privacy.rights.title": "您的權利",
  "privacy.rights.body": "您有權查閱、更正或刪除您的個人資料。如需行使上述權利，請透過以下聯絡方式與我們聯繫。",
  "privacy.contact.title": "聯絡方式",
  "privacy.contact.body": "如有私隱相關查詢，請聯絡 support@3nexgen.com",
  "privacy.lastUpdated": "最後更新：2026 年 4 月",

  "refund.title": "退款政策",
  "refund.prepaid.title": "預付制度",
  "refund.prepaid.body": "所有計劃（月費、季度、年費）均為預付制，費用於計費週期開始時收取。",
  "refund.noRefund.title": "不設退款",
  "refund.noRefund.body": "所有已收取的費用不設退款。取消服務後，服務將於當前計費週期結束後停止，伺服器將會回收。",
  "refund.failure.title": "服務故障",
  "refund.failure.body": "如因我方原因導致服務中斷超過 24 小時，將按比例補償受影響的服務天數。",
  "refund.installFailure.title": "安裝未能完成",
  "refund.installFailure.body": "如因我方技術原因導致安裝未能完成，將全額退還已收取的費用。",
  "refund.contact.title": "聯絡方式",
  "refund.contact.body": "如有任何查詢，請聯絡 support@3nexgen.com",
  "refund.lastUpdated": "最後更新：2026 年 4 月",

  "notFound.title": "找不到此頁面",
  "notFound.backHome": "返回首頁"
}
```

- [ ] **Step 2: Refactor Terms.tsx, Privacy.tsx, Refund.tsx, NotFound.tsx**

All four pages follow the same pattern. Add i18n imports and replace strings. For the legal pages, section titles and body text all use `t('terms.scope.title')` etc.

NotFound.tsx is the simplest — just `t('notFound.title')` and `t('notFound.backHome')` with `lp('/')`.

- [ ] **Step 3: Verify all legal pages and 404**

Navigate to `/terms`, `/privacy`, `/refund`, and a nonexistent URL. All should render correctly.

- [ ] **Step 4: Commit**

```bash
git add public/locales/zh-HK/legal.json src/pages/Terms.tsx src/pages/Privacy.tsx src/pages/Refund.tsx src/pages/NotFound.tsx
git commit -m "feat(i18n): extract legal pages and 404 strings to locale file"
```

---

## Task 13: Add SEO Meta Tags and Hreflang

**Files:**
- Create: `public/locales/zh-HK/meta.json`
- Create: `src/components/SEOHead.tsx`
- Modify: `index.html`
- Modify: all page components (add `<SEOHead>`)

- [ ] **Step 1: Create zh-HK/meta.json**

Create `public/locales/zh-HK/meta.json`:

```json
{
  "home.title": "NexGen — AI 智能體安裝服務",
  "home.description": "NexGen 為你安裝全配版 AI 智能體，無需技術知識，Telegram 直接使用。由 HK$188/月起。",
  "pricing.title": "收費方案 — NexGen",
  "pricing.description": "三種方案，由 HK$158/月起。全包：VPS + AI 運算 + 維護。",
  "technology.title": "技術架構 — NexGen",
  "technology.description": "OpenClaw + Mem0 記憶 + SearXNG 搜尋 + Chromium 瀏覽器自動化。完整 AI 生態系統。",
  "faq.title": "常見問題 — NexGen",
  "faq.description": "關於 NexGen AI 智能體安裝服務的常見問題。",
  "contact.title": "聯絡我們 — NexGen",
  "contact.description": "提交支援工單，我們會在 24 小時內回覆。",
  "onboarding.title": "開始設定 — NexGen",
  "onboarding.description": "填寫資料、選擇方案、付款，最快 30 分鐘完成安裝。",
  "botguide.title": "建立 Telegram Bot — NexGen",
  "botguide.description": "2 分鐘建立 Telegram Bot 教學。",
  "terms.title": "服務條款 — NexGen",
  "terms.description": "NexGen AI 智能體安裝服務條款。",
  "privacy.title": "私隱政策 — NexGen",
  "privacy.description": "NexGen 私隱政策 — 你的數據安全。",
  "refund.title": "退款政策 — NexGen",
  "refund.description": "NexGen 退款及取消政策。"
}
```

- [ ] **Step 2: Create SEOHead component**

Create `src/components/SEOHead.tsx`:

```tsx
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  type SupportedLanguage,
} from '@/i18n';
import { getLocalizedPath, stripLangPrefix } from '@/hooks/useLocalizedPath';

const SITE_URL = 'https://3nexgen.com';

interface SEOHeadProps {
  page: string; // key prefix in meta.json, e.g. 'home', 'pricing'
}

export default function SEOHead({ page }: SEOHeadProps) {
  const { t, i18n } = useTranslation('meta');
  const location = useLocation();
  const currentLang = i18n.language as SupportedLanguage;
  const basePath = stripLangPrefix(location.pathname);

  const title = t(`${page}.title`);
  const description = t(`${page}.description`);

  return (
    <Helmet>
      <html lang={currentLang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`${SITE_URL}${getLocalizedPath(basePath, currentLang)}`} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />

      {/* Hreflang tags for all supported languages */}
      {SUPPORTED_LANGUAGES.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`${SITE_URL}${getLocalizedPath(basePath, lang)}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${SITE_URL}${getLocalizedPath(basePath, FALLBACK_LANGUAGE)}`}
      />
    </Helmet>
  );
}
```

- [ ] **Step 3: Simplify index.html**

Remove hardcoded meta tags from `index.html` since they're now dynamic. Keep only the minimal shell:

```html
<!doctype html>
<html lang="zh-HK">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NexGen</title>
    <meta name="author" content="NexGen" />
    <meta property="og:image" content="/og-image.svg" />
    <meta name="twitter:image" content="/og-image.svg" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

The `lang` attribute on `<html>` will be dynamically updated by SEOHead.

- [ ] **Step 4: Add SEOHead to every page**

In each page component, add `<SEOHead page="..." />` at the top of the return JSX:

```tsx
// Index.tsx
import SEOHead from '@/components/SEOHead';
// ...
return (
  <>
    <SEOHead page="home" />
    {/* rest of page */}
  </>
);

// Pricing.tsx → <SEOHead page="pricing" />
// Technology.tsx → <SEOHead page="technology" />
// FAQ.tsx → <SEOHead page="faq" />
// Contact.tsx → <SEOHead page="contact" />
// Onboarding.tsx → <SEOHead page="onboarding" />
// BotGuide.tsx → <SEOHead page="botguide" />
// Terms.tsx → <SEOHead page="terms" />
// Privacy.tsx → <SEOHead page="privacy" />
// Refund.tsx → <SEOHead page="refund" />
```

- [ ] **Step 5: Verify meta tags**

Open dev tools → Elements tab → check `<html lang>`, `<title>`, `<meta>` tags, and `<link rel="alternate">` hreflang tags update correctly when switching languages.

- [ ] **Step 6: Commit**

```bash
git add public/locales/zh-HK/meta.json src/components/SEOHead.tsx index.html src/pages/*.tsx
git commit -m "feat(i18n): add SEO meta tags and hreflang for all pages"
```

---

## Task 14: OpenCC Build-Time zh-CN Conversion

**Files:**
- Create: `src/i18n/opencc-convert.ts`
- Create: `opencc-overrides.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create OpenCC overrides file**

Create `opencc-overrides.json` in the Vite project root:

```json
{
  "NexGen": "NexGen",
  "OpenClaw": "OpenClaw",
  "Mem0": "Mem0",
  "Qdrant": "Qdrant",
  "SearXNG": "SearXNG",
  "ClawTeam": "ClawTeam",
  "ACPX": "ACPX",
  "Gateway Watchdog": "Gateway Watchdog",
  "BotFather": "BotFather",
  "Chromium Headless": "Chromium Headless",
  "Docker": "Docker",
  "PayMe": "PayMe",
  "Telegram": "Telegram",
  "ChatGPT": "ChatGPT"
}
```

- [ ] **Step 2: Create the conversion script**

Create `src/i18n/opencc-convert.ts`:

```typescript
import * as OpenCC from 'opencc-js';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE_DIR = path.resolve(__dirname, '../../public/locales/zh-HK');
const OUTPUT_DIR = path.resolve(__dirname, '../../public/locales/zh-CN');
const OVERRIDES_PATH = path.resolve(__dirname, '../../opencc-overrides.json');

// Load brand name overrides
const overrides: Record<string, string> = JSON.parse(
  fs.readFileSync(OVERRIDES_PATH, 'utf-8')
);

// Create HK → CN converter
const converter = OpenCC.Converter({ from: 'hk', to: 'cn' });

function convertValue(value: string): string {
  // Protect brand names by replacing with placeholders
  let result = value;
  const placeholders: [string, string][] = [];

  Object.keys(overrides).forEach((brand, i) => {
    const placeholder = `__BRAND_${i}__`;
    // Use global replace for all occurrences
    const regex = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (regex.test(result)) {
      result = result.replace(regex, placeholder);
      placeholders.push([placeholder, overrides[brand]]);
    }
  });

  // Convert Traditional → Simplified
  result = converter(result);

  // Restore brand names
  placeholders.forEach(([placeholder, brand]) => {
    result = result.replaceAll(placeholder, brand);
  });

  return result;
}

function convertJsonFile(filename: string): void {
  const sourcePath = path.join(SOURCE_DIR, filename);
  const outputPath = path.join(OUTPUT_DIR, filename);

  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
  const converted: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') {
      converted[key] = convertValue(value);
    } else {
      converted[key] = value as string;
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2) + '\n', 'utf-8');
}

// Main
export function generateZhCN(): void {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Convert all JSON files from zh-HK
  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    convertJsonFile(file);
    console.log(`[opencc] zh-HK/${file} → zh-CN/${file}`);
  }

  console.log(`[opencc] Generated ${files.length} zh-CN locale files`);
}

// Run directly
if (require.main === module) {
  generateZhCN();
}
```

- [ ] **Step 3: Add Vite plugin for build-time conversion**

Read `vite.config.ts`, then add the OpenCC plugin:

```typescript
import { generateZhCN } from './src/i18n/opencc-convert';

// Add to the plugins array:
{
  name: 'opencc-zh-cn',
  buildStart() {
    generateZhCN();
  },
  // Also run during dev server startup
  configureServer() {
    generateZhCN();
  },
}
```

- [ ] **Step 4: Verify zh-CN generation**

```bash
npm run dev
```

Check that `public/locales/zh-CN/` is created with all 10 JSON files. Spot-check a few values:
- `記憶` should become `记忆`
- `伺服器` should become `服务器`
- `NexGen` should remain `NexGen`

- [ ] **Step 5: Commit**

```bash
git add src/i18n/opencc-convert.ts opencc-overrides.json vite.config.ts
git commit -m "feat(i18n): add OpenCC build-time zh-CN conversion"
```

---

## Task 15: Generate AI Translations (en, es, ja, ru)

**Files:**
- Create: `public/locales/en/` (10 JSON files)
- Create: `public/locales/es/` (10 JSON files)
- Create: `public/locales/ja/` (10 JSON files)
- Create: `public/locales/ru/` (10 JSON files)

This task generates all 4 × 10 = 40 translation files. Each language can be generated independently (parallelizable).

- [ ] **Step 1: Generate English translations**

For each zh-HK JSON file, generate the English equivalent. The translation should:
- Be natural, professional English (not literal translation)
- Keep brand names unchanged (NexGen, OpenClaw, Mem0, etc.)
- Keep HK$ prices unchanged
- Keep technical terms (Bot Token, User ID, API) unchanged
- Adapt cultural references where needed (e.g., 連登 → LIHKG)

Create all 10 files in `public/locales/en/`: common.json, home.json, pricing.json, technology.json, faq.json, contact.json, onboarding.json, botguide.json, legal.json, meta.json.

The JSON structure (keys) must be IDENTICAL to the zh-HK files — only the string values change.

- [ ] **Step 2: Generate Spanish translations**

Same approach for `public/locales/es/`. Translate from the English version for better natural flow (zh-HK → en → es). Use formal "usted" form for a professional service.

- [ ] **Step 3: Generate Japanese translations**

Create `public/locales/ja/`. Translate from zh-HK (Chinese → Japanese shares more cultural context). Use polite form (です/ます) throughout. Keep katakana for loan words (AI → AI, トークン for tokens).

- [ ] **Step 4: Generate Russian translations**

Create `public/locales/ru/`. Translate from English. Use formal "вы" form. Keep technical terms in Latin script where standard (API, VPS, Token).

- [ ] **Step 5: Verify all languages load**

```bash
npm run dev
```

Switch through all 6 languages using the globe dropdown. Every page should render translated text. Check for:
- Missing keys (shown as raw key names)
- Layout issues (Russian/Japanese text may be longer/shorter)
- Broken interpolation

- [ ] **Step 6: Commit all translations**

```bash
git add public/locales/en/ public/locales/es/ public/locales/ja/ public/locales/ru/
git commit -m "feat(i18n): add AI-generated translations for en, es, ja, ru"
```

---

## Task 16: Multi-Language Sitemap Generation

**Files:**
- Create: `scripts/generate-sitemap.ts`
- Modify: `vite.config.ts` (add sitemap plugin)

- [ ] **Step 1: Create sitemap generator**

Create `scripts/generate-sitemap.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://3nexgen.com';
const LANGUAGES = ['zh-HK', 'en', 'zh-CN', 'es', 'ja', 'ru'];
const DEFAULT_LANG = 'zh-HK';

const PAGES = [
  '/',
  '/pricing',
  '/technology',
  '/faq',
  '/contact',
  '/onboarding',
  '/bot-guide',
  '/terms',
  '/privacy',
  '/refund',
];

function langPath(page: string, lang: string): string {
  if (lang === DEFAULT_LANG) return `${SITE_URL}${page}`;
  return `${SITE_URL}/${lang}${page}`;
}

export function generateSitemap(outDir: string): void {
  const urls = PAGES.map(page => {
    const hreflangs = LANGUAGES.map(lang =>
      `    <xhtml:link rel="alternate" hreflang="${lang}" href="${langPath(page, lang)}"/>`
    ).join('\n');

    const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${langPath(page, 'en')}"/>`;

    return `  <url>\n    <loc>${langPath(page, DEFAULT_LANG)}</loc>\n${hreflangs}\n${xDefault}\n  </url>`;
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;

  const outPath = path.join(outDir, 'sitemap.xml');
  fs.writeFileSync(outPath, sitemap, 'utf-8');
  console.log(`[sitemap] Generated ${PAGES.length} URLs × ${LANGUAGES.length} languages = ${PAGES.length * LANGUAGES.length} entries`);
}
```

- [ ] **Step 2: Integrate into Vite build**

Add to the Vite plugin in `vite.config.ts`:

```typescript
import { generateSitemap } from './scripts/generate-sitemap';

// Add to plugins array:
{
  name: 'sitemap-generator',
  closeBundle() {
    generateSitemap(path.resolve(__dirname, 'dist'));
  },
}
```

Also generate into `public/` for dev:
```typescript
// In the opencc plugin's configureServer:
generateSitemap(path.resolve(__dirname, 'public'));
```

- [ ] **Step 3: Verify sitemap**

```bash
npm run build
cat dist/sitemap.xml | head -30
```

Should show 10 `<url>` entries, each with 6 `<xhtml:link>` hreflang tags + 1 x-default.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-sitemap.ts vite.config.ts
git commit -m "feat(i18n): add multi-language sitemap generation"
```

---

## Task 17: Per-Language Font Loading

**Files:**
- Modify: `src/index.css` or `index.html`
- Create: `src/hooks/useFontLoader.ts` (optional — can be CSS-only)

- [ ] **Step 1: Update font loading strategy**

Currently `index.html` or `index.css` loads Noto Sans TC for all users. Change to load fonts conditionally per language.

Create `src/hooks/useFontLoader.ts`:

```typescript
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const FONT_LINKS: Record<string, string> = {
  'zh-HK': 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&display=swap',
  'zh-CN': 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap',
  'ja': 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap',
};

export function useFontLoader() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  useEffect(() => {
    const fontUrl = FONT_LINKS[lang];
    if (!fontUrl) return; // en, es, ru use system fonts

    const id = `font-${lang}`;
    if (document.getElementById(id)) return; // Already loaded

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);
  }, [lang]);
}
```

- [ ] **Step 2: Use the hook in Layout**

In the Layout component (or App.tsx), add:

```tsx
import { useFontLoader } from '@/hooks/useFontLoader';

function Layout() {
  useFontLoader();
  // ...
}
```

- [ ] **Step 3: Update CSS font-family**

In `src/index.css`, update the font-family to include all CJK fonts with fallbacks:

```css
body {
  font-family: 'Noto Sans TC', 'Noto Sans SC', 'Noto Sans JP', system-ui, -apple-system, sans-serif;
}
```

The browser will use whichever font is loaded. For en/es/ru, no CJK font is loaded, so system-ui applies.

- [ ] **Step 4: Remove static font link from index.html**

If `index.html` has a static `<link>` to Google Fonts for Noto Sans TC, remove it — the hook now handles this dynamically.

- [ ] **Step 5: Verify fonts**

Switch to Japanese — Noto Sans JP should load (check Network tab). Switch to English — no CJK font request. Switch back to zh-HK — Noto Sans TC loads.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useFontLoader.ts src/index.css index.html
git commit -m "feat(i18n): add per-language font loading"
```

---

## Task 18: Integration Testing

**Files:**
- Modify: `src/test/website-audit.test.ts` (if exists) or create new test

- [ ] **Step 1: Manual smoke test all languages**

For each of the 6 languages, visit every page and check:

| Check | Description |
|-------|-------------|
| Text renders | No raw i18n keys visible (e.g., `home.hero.title`) |
| Links work | All internal navigation stays within the language prefix |
| Language switcher | Globe dropdown switches language + URL correctly |
| Language persists | Reload the page — same language loads from localStorage |
| SEO tags | Check `<html lang>`, `<title>`, `<meta>`, `<link hreflang>` in Elements |
| Forms work | Contact and Onboarding forms submit correctly in all languages |
| External links | Lemon Squeezy, Telegram, email links unchanged |
| Mobile | Hamburger menu + language list works on narrow viewport |

Pages to test: `/`, `/pricing`, `/technology`, `/faq`, `/contact`, `/onboarding`, `/bot-guide`, `/terms`, `/privacy`, `/refund`, 404 page.

- [ ] **Step 2: Test first-visit detection**

1. Clear localStorage (`nexgen-lang` key)
2. Set browser language to Japanese (Chrome → Settings → Languages)
3. Visit `3nexgen.com` — should auto-redirect to `/ja/`
4. Clear again, set browser to German (unsupported) — should redirect to `/en/`
5. Clear again, set browser to zh-HK — should stay at `/` (no redirect)

- [ ] **Step 3: Test zh-CN conversion quality**

Visit `/zh-CN/` pages and spot-check:
- 伺服器 → 服务器
- 記憶 → 记忆
- Brand names (NexGen, OpenClaw, Mem0) unchanged
- No garbled characters

- [ ] **Step 4: Build and verify production output**

```bash
npm run build
```

Check:
- Build succeeds with no errors
- `dist/locales/` contains zh-HK, en, zh-CN, es, ja, ru directories
- `dist/sitemap.xml` exists with 60 URLs
- `dist/locales/zh-CN/` was generated (not manually maintained)

- [ ] **Step 5: Commit any test files or fixes**

```bash
git add -A
git commit -m "test(i18n): verify all 6 languages across all pages"
```

---

## Execution Notes

**Task dependencies:**
- Task 1 must be done first (infrastructure)
- Tasks 2-3 (routing, switcher) should be done early
- Tasks 4-12 (string extraction) are independent of each other — can be parallelized
- Task 13 (SEO) depends on Tasks 4-12 being complete (needs meta.json)
- Task 14 (OpenCC) depends on all zh-HK JSONs being complete
- Task 15 (translations) depends on all zh-HK JSONs being complete
- Task 16 (sitemap) can be done anytime after Task 2
- Task 17 (fonts) can be done anytime after Task 1
- Task 18 (testing) must be last

**Recommended parallel groups for subagent-driven-development:**
1. Sequential: Tasks 1 → 2 → 3
2. Parallel: Tasks 4, 5, 6, 7, 8, 9, 10, 11, 12 (all independent string extractions)
3. Sequential: Task 13 (needs all pages refactored)
4. Parallel: Tasks 14, 15, 16, 17 (independent infrastructure)
5. Sequential: Task 18 (final verification)
