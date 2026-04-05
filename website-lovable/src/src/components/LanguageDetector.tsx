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
    if (lang) {
      if (PREFIXED_LANGUAGES.includes(lang as any)) {
        if (i18n.language !== lang) {
          i18n.changeLanguage(lang);
        }
      }
    } else {
      const stored = localStorage.getItem('nexgen-lang');

      // Returning user with stored preference that isn't the default
      if (stored && PREFIXED_LANGUAGES.includes(stored as any)) {
        navigate(`/${stored}${location.pathname}${location.search}`, { replace: true });
        return;
      }

      // First visit — detect from browser
      if (!stored) {
        const detected = i18n.language;
        if (SUPPORTED_LANGUAGES.includes(detected as any) && detected !== DEFAULT_LANGUAGE) {
          navigate(`/${detected}${location.pathname}${location.search}`, { replace: true });
          return;
        }
        // Browser language not supported → fallback to English
        navigate(`/${FALLBACK_LANGUAGE}${location.pathname}${location.search}`, { replace: true });
        return;
      }

      // stored === DEFAULT_LANGUAGE — stay on unprefixed route
      if (i18n.language !== DEFAULT_LANGUAGE) {
        i18n.changeLanguage(DEFAULT_LANGUAGE);
      }
    }
  }, [lang, i18n, navigate, location.pathname, location.search]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <Outlet />;
}
