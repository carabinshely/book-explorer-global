import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import enTranslations from '@/data/i18n/en.json';
import esTranslations from '@/data/i18n/es.json';

type TranslationData = typeof enTranslations;
type SupportedLanguage = 'en' | 'es';

interface LanguageContextType {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: TranslationData;
  supportedLanguages: { code: SupportedLanguage; name: string }[];
}

const translations: Record<SupportedLanguage, TranslationData> = {
  en: enTranslations,
  es: esTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLanguage>(() => {
    // Check URL for language param
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang') as SupportedLanguage;
    if (urlLang && translations[urlLang]) return urlLang;
    
    // Check localStorage
    const stored = localStorage.getItem('ui-lang') as SupportedLanguage;
    if (stored && translations[stored]) return stored;
    
    // Check browser preference
    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    if (translations[browserLang]) return browserLang;
    
    return 'en';
  });

  const setLang = useCallback((newLang: SupportedLanguage) => {
    setLangState(newLang);
    localStorage.setItem('ui-lang', newLang);
    document.documentElement.lang = newLang;
  }, []);

  const supportedLanguages = useMemo(() => [
    { code: 'en' as const, name: 'English' },
    { code: 'es' as const, name: 'Español' },
  ], []);

  const value = useMemo(() => ({
    lang,
    setLang,
    t: translations[lang],
    supportedLanguages,
  }), [lang, setLang, supportedLanguages]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
