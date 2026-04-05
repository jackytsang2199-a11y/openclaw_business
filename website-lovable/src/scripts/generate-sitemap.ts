import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://3nexgen.com';
const LANGUAGES = ['zh-HK', 'en', 'zh-CN', 'es', 'ja', 'ru'];
const DEFAULT_LANG = 'zh-HK';

const PAGES = [
  '/', '/pricing', '/technology', '/faq', '/contact',
  '/onboarding', '/bot-guide', '/terms', '/privacy', '/refund',
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

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap, 'utf-8');
  console.log(`[sitemap] Generated ${PAGES.length} URLs × ${LANGUAGES.length} languages`);
}
