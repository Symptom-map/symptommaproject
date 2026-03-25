// src/hooks/useTranslation.js
import { createContext, useContext, useState } from 'react';
import { t as translate } from '../utils/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLang = 'es' }) {
  const [lang, setLang] = useState(initialLang);

  const t = (key, vars = {}) => translate(key, lang, vars);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
}
