import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations } from '../i18n/translations.js';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('taskmanager_lang') || 'fa';
  });

  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', dir);
    root.setAttribute('lang', lang);
    localStorage.setItem('taskmanager_lang', lang);
  }, [lang, dir]);

  const toggleLang = () => {
    setLang((prev) => (prev === 'fa' ? 'en' : 'fa'));
  };

  const setLanguage = (newLang) => {
    if (newLang === 'fa' || newLang === 'en') {
      setLang(newLang);
    }
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, dir, toggleLang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
