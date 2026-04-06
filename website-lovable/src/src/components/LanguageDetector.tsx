import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  PREFIXED_LANGUAGES,
} from '@/i18n';

/**
 * Syncs i18n language with the URL :lang param.
 * - /en/pricing → i18n set to 'en'
 * - /pricing (no prefix) → i18n set to 'zh-HK'
 *
 * URL is the single source of truth. No browser-based redirects.
 * Users change language via the LanguageSwitcher component.
 */
export default function LanguageDetector() {
  const { lang } = useParams<{ lang?: string }>();
  const { i18n } = useTranslation();

  useEffect(() => {
    const target = lang && PREFIXED_LANGUAGES.includes(lang as any)
      ? lang
      : DEFAULT_LANGUAGE;

    if (i18n.language !== target) {
      i18n.changeLanguage(target);
    }
  }, [lang, i18n]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <Outlet />;
}
