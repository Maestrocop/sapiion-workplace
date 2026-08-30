import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import nlCommon from './locales/nl/common.json';

const STORAGE_KEY = 'workplace_language';

function getStoredLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  } catch {
    return 'en';
  }
}

export function setLanguage(lang) {
  i18n.changeLanguage(lang);
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* best-effort */ }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    nl: { common: nlCommon },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
