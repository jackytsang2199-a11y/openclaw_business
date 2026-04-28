import SEOHead from "@/components/SEOHead";
import { useTranslation } from 'react-i18next';
import { SUPPORT_EMAIL } from '@/lib/constants';

const SECTIONS = ['collection', 'usage', 'storage', 'sharing', 'proxy', 'thirdParty', 'rights'] as const;

const Privacy = () => {
  const { t } = useTranslation('legal');

  return (
    <>
      <SEOHead page="privacy" />
      <section className="container py-20 max-w-3xl mx-auto">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-3xl md:text-5xl">{t('privacy.pageTitle')}</h1>
      </div>

      <div className="space-y-8 text-base leading-relaxed text-muted-foreground">
        {SECTIONS.map((key) => (
          <div key={key}>
            <h2 className="text-xl font-medium text-foreground mb-3">{t(`privacy.${key}.title`)}</h2>
            <p>{t(`privacy.${key}.body`)}</p>
          </div>
        ))}

        <div>
          <h2 className="text-xl font-medium text-foreground mb-3">{t('privacy.contact.title')}</h2>
          <p>
            {t('privacy.contact.body')}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-primary hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-12 text-center opacity-60">
        {t('privacy.lastUpdated')}
      </p>
    </section>
    </>
  );
};

export default Privacy;
