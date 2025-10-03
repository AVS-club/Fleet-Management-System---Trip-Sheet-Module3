import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation files
import enTranslations from './locales/en.json';
import hiTranslations from './locales/hi.json';

const resources = {
  en: {
    translation: enTranslations
  },
  hi: {
    translation: hiTranslations
  }
};

// Initialize i18n without React hooks first
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Fallback language
    lng: 'hi', // Default language (Hindi for Indian market)
    debug: false,
    
    interpolation: {
      escapeValue: false // React already escapes
    },
    
    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    
    // Ensure proper initialization
    react: {
      useSuspense: false
    }
  });

export default i18n;
