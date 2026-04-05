import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation('legal');
  const lp = useLocalizedPath();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t('notFound.title')}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('notFound.message')}</p>
        <a href={lp("/")} className="text-primary underline hover:text-primary/90">
          {t('notFound.homeLink')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
