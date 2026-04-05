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
