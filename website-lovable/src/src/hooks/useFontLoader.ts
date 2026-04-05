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
    if (!fontUrl) return;

    const id = `font-${lang}`;
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);
  }, [lang]);
}
