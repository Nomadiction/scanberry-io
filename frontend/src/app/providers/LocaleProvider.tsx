import { useState } from 'react';
import { LocaleContext, translate, type Locale, type TranslationKey } from '../lib/i18n';

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale') as Locale | null;
    if (stored === 'ru' || stored === 'es' || stored === 'de') return stored;
    return 'en';
  });

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (key: TranslationKey) => translate(key, locale);

  return (
    <LocaleContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};
