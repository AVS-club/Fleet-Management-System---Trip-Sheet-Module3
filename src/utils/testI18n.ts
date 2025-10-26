// Simple test utility to verify i18n is working
import i18n from '../i18n/config';
import { createLogger } from './logger';

const logger = createLogger('testI18n');

export const testI18n = () => {
  logger.debug('i18n initialized:', i18n.isInitialized);
  logger.debug('Current language:', i18n.language);
  logger.debug('Available languages:', i18n.languages);
  
  // Test a simple translation
  const testTranslation = i18n.t('common.appName');
  logger.debug('Test translation:', testTranslation);
  
  return {
    initialized: i18n.isInitialized,
    currentLanguage: i18n.language,
    testTranslation
  };
};
