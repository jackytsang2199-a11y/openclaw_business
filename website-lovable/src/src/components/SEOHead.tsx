import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  SUPPORTED_LANGUAGES,
  FALLBACK_LANGUAGE,
  type SupportedLanguage,
} from '@/i18n';
import { getLocalizedPath, stripLangPrefix } from '@/hooks/useLocalizedPath';

const SITE_URL = 'https://3nexgen.com';

interface SEOHeadProps {
  page: string;
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
      <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
      {SUPPORTED_LANGUAGES.map((lang) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={`${SITE_URL}${getLocalizedPath(basePath, lang)}`} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${getLocalizedPath(basePath, FALLBACK_LANGUAGE)}`} />
    </Helmet>
  );
}
