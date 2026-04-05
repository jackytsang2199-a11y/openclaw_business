import { Helmet } from "react-helmet-async";
import { useTranslation } from 'react-i18next';

const SECTIONS = ['prepaid', 'noRefund', 'outage', 'failedInstall'] as const;

const Refund = () => {
  const { t } = useTranslation('legal');

  return (
    <>
      <Helmet>
        <title>{t('refund.meta.title')}</title>
        <meta name="description" content={t('refund.meta.description')} />
      </Helmet>
      <section className="container py-20 max-w-3xl mx-auto">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-3xl md:text-5xl">{t('refund.pageTitle')}</h1>
      </div>

      <div className="space-y-8 text-base leading-relaxed text-muted-foreground">
        {SECTIONS.map((key) => (
          <div key={key}>
            <h2 className="text-xl font-medium text-foreground mb-3">{t(`refund.${key}.title`)}</h2>
            <p>{t(`refund.${key}.body`)}</p>
          </div>
        ))}

        <div>
          <h2 className="text-xl font-medium text-foreground mb-3">{t('refund.contact.title')}</h2>
          <p>
            {t('refund.contact.body')}
            <a
              href="mailto:support@3nexgen.com"
              className="text-primary hover:underline"
            >
              support@3nexgen.com
            </a>
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-12 text-center opacity-60">
        {t('refund.lastUpdated')}
      </p>
    </section>
    </>
  );
};

export default Refund;
