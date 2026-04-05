import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

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
    interpolation: { escapeValue: false },
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'nexgen-lang',
    },
    react: { useSuspense: true },
  });

export default i18n;
