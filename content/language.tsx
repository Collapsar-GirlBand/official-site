import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { UI_TEXT } from './ui';
import { UI_EN } from './english';

export type Language = 'zh' | 'en';
export const LANGUAGE_KEY = 'collapsar_language';
const LanguageContext = createContext<{ language: Language; hasSelectedLanguage: boolean; setLanguage: (language: Language) => void }>({ language: 'zh', hasSelectedLanguage: false, setLanguage: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const originalMetadata = useRef<Map<HTMLMetaElement, string>>(new Map());
  const [savedLanguage] = useState<Language | null>(() => {
    try {
      const value = localStorage.getItem(LANGUAGE_KEY);
      return value === 'zh' || value === 'en' ? value : null;
    } catch { return null; }
  });
  const [language, setLanguage] = useState<Language>(savedLanguage || 'zh');
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(Boolean(savedLanguage));

  const selectLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setHasSelectedLanguage(true);
  };

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.title = language === 'en' ? 'COLLAPSAR | Girl Band' : 'COLLAPSAR | 少女乐队';
    document.querySelectorAll<HTMLMetaElement>('meta[name="description"], meta[property$=":title"], meta[property$=":description"]').forEach(meta => {
      if (!originalMetadata.current.has(meta)) originalMetadata.current.set(meta, meta.content);
      meta.content = language === 'zh' ? originalMetadata.current.get(meta)! :
        meta.getAttribute('property')?.endsWith(':title') ? document.title :
        "Official website of COLLAPSAR, a girl band from China's Yangtze Delta. Listen to our signal.";
    });
  }, [language]);
  useEffect(() => {
    if (!hasSelectedLanguage) return;
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Storage is optional. */ }
  }, [hasSelectedLanguage, language]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_KEY || event.key === null) {
        const nextLanguage = event.newValue === 'en' || event.newValue === 'zh' ? event.newValue : null;
        if (nextLanguage) {
          setLanguage(nextLanguage);
          setHasSelectedLanguage(true);
        }
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return <LanguageContext.Provider value={{ language, hasSelectedLanguage, setLanguage: selectLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  return { ...context, UI_TEXT: context.language === 'en' ? UI_EN : UI_TEXT };
}
