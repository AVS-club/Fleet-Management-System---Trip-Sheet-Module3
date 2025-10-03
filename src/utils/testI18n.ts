// Simple test utility to verify i18n is working
import i18n from '../i18n/config';

export const testI18n = () => {
  console.log('i18n initialized:', i18n.isInitialized);
  console.log('Current language:', i18n.language);
  console.log('Available languages:', i18n.languages);
  
  // Test a simple translation
  const testTranslation = i18n.t('common.appName');
  console.log('Test translation:', testTranslation);
  
  return {
    initialized: i18n.isInitialized,
    currentLanguage: i18n.language,
    testTranslation
  };
};
