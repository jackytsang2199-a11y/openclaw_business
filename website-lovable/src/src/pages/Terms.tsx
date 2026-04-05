import SEOHead from "@/components/SEOHead";
import { useTranslation } from 'react-i18next';

const SECTIONS = ['scope', 'payment', 'sla', 'termination', 'disclaimer', 'acceptableUse', 'jurisdiction', 'amendments'] as const;

const Terms = () => {
  const { t } = useTranslation('legal');

  return (
    <>
      <SEOHead page="terms" />
      <section className="container py-20 max-w-3xl mx-auto">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-3xl md:text-5xl">{t('terms.pageTitle')}</h1>
      </div>

      <div className="space-y-8 text-base leading-relaxed text-muted-foreground">
        {SECTIONS.map((key) => (
          <div key={key}>
            <h2 className="text-xl font-medium text-foreground mb-3">{t(`terms.${key}.title`)}</h2>
            <p>{t(`terms.${key}.body`)}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mt-12 text-center opacity-60">
        {t('terms.lastUpdated')}
      </p>
    </section>
    </>
  );
};

export default Terms;
