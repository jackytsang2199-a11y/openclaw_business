import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

const categoryColors: Record<string, string> = {
  core: "border-l-primary",
  memory: "border-l-accent-teal",
  search: "border-l-accent-teal",
  browser: "border-l-accent-amber",
  infra: "border-l-muted-foreground",
};

const sectionKeys = [
  { key: "openclaw", category: "core" },
  { key: "mem0", category: "memory" },
  { key: "searxng", category: "search" },
  { key: "chromium", category: "browser" },
  { key: "docker", category: "infra" },
  { key: "acpx", category: "infra" },
  { key: "clawteam", category: "infra" },
  { key: "watchdog", category: "infra" },
];

const Technology = () => {
  const { t } = useTranslation('technology');
  const lp = useLocalizedPath();

  const techSections = sectionKeys.map((s) => ({
    name: t(`sections.${s.key}.name`),
    headline: t(`sections.${s.key}.headline`),
    body: t(`sections.${s.key}.body`),
    category: s.category,
  }));

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
      </Helmet>
      <section className="container py-20">
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-3xl md:text-5xl">{t('pageTitle')}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('pageSubtitle')}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {techSections.map((tech, i) => (
            <div
              key={tech.name}
              className={`rounded-2xl border border-border border-l-4 ${categoryColors[tech.category] || "border-l-muted-foreground"} ${i % 2 === 1 ? "bg-section-alt" : "bg-card"} p-8 space-y-4 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`}
            >
              <p className="text-xs text-primary font-semibold uppercase tracking-wider">{tech.name}</p>
              <h2 className="text-2xl md:text-3xl">{tech.headline}</h2>
              <p className="text-muted-foreground prose-zh text-base">{tech.body}</p>
            </div>
          ))}
        </div>

        {/* Privacy section */}
        <div className="max-w-4xl mx-auto text-center mt-20 space-y-6">
          <h2 className="text-2xl md:text-4xl">{t('privacy.title')}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('privacy.body')}
          </p>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-xl mx-auto text-center mt-16 space-y-4">
          <p className="text-muted-foreground text-lg">{t('cta.learnMore')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 rounded-2xl shadow-lg">
              <Link to={lp("/pricing")}>{t('cta.viewPricing')}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-primary/20 text-primary hover:bg-primary/[0.05] rounded-2xl text-base px-8 gap-2">
              <Link to={lp("/contact")}>
                <Mail className="h-5 w-5" />
                {t('cta.submitTicket')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Technology;
