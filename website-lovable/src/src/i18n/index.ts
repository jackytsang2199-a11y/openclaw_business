import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

export const SUPPORTED_LANGUAGES = ['zh-HK', 'en', 'zh-CN', 'es', 'ja', 'ru'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-HK';
export const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

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
  'common', 'home', 'pricing', 'technology', 'faq',
  'contact', 'onboarding', 'botguide', 'legal', 'meta',
] as const;

/**
 * Detect language from URL path on startup.
 * /en/pricing → 'en', /ja/ → 'ja', / → check localStorage → DEFAULT_LANGUAGE
 */
function detectLanguageFromURL(): SupportedLanguage {
  const path = window.location.pathname;
  for (const lang of PREFIXED_LANGUAGES) {
    if (path.startsWith(`/${lang}/`) || path === `/${lang}`) {
      return lang;
    }
  }
  // No prefix — check localStorage for returning users
  const stored = localStorage.getItem('nexgen-lang') as SupportedLanguage | null;
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored;
  }
  return DEFAULT_LANGUAGE;
}

const initialLang = detectLanguageFromURL();

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: initialLang,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: 'common',
    ns: ['common'],
    fallbackNS: 'common',
    interpolation: { escapeValue: false },
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    react: { useSuspense: true },
  });

export default i18n;
