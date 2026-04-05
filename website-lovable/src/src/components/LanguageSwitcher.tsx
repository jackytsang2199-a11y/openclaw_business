import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from '@/i18n';
import { getLocalizedPath, stripLangPrefix } from '@/hooks/useLocalizedPath';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'inline';
  onSelect?: () => void;
}

export default function LanguageSwitcher({ variant = 'dropdown', onSelect }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLang = i18n.language as SupportedLanguage;

  useEffect(() => {
    if (variant !== 'dropdown') return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant]);

  function switchLanguage(lang: SupportedLanguage) {
    const basePath = stripLangPrefix(location.pathname);
    const newPath = getLocalizedPath(basePath, lang);
    i18n.changeLanguage(lang);
    navigate(newPath + location.search);
    setOpen(false);
    onSelect?.();
  }

  if (variant === 'inline') {
    return (
      <div className="flex flex-col gap-1 py-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button key={lang} onClick={() => switchLanguage(lang)}
            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${lang === currentLang ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent'}`}>
            <span>{LANGUAGE_NAMES[lang]}</span>
            {lang === currentLang && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Change language" aria-expanded={open}>
        <Globe className="h-4 w-4" />
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 rounded-md border bg-popover shadow-lg z-50">
          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button key={lang} onClick={() => switchLanguage(lang)}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm ${lang === currentLang ? 'bg-primary/10 text-primary font-medium' : 'text-popover-foreground hover:bg-accent'}`}>
                <span>{LANGUAGE_NAMES[lang]}</span>
                {lang === currentLang && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
