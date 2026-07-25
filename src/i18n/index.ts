import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pa from './locales/pa.json';
import hi from './locales/hi.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pa: { translation: pa },
    hi: { translation: hi },
  },
  lng: localStorage.getItem('hukumnama-lang') ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
