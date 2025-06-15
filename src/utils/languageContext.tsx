import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Available languages in the application
export const LANGUAGES = {
  en: 'English',
  hi: 'हिंदी (Hindi)',
  mr: 'मराठी (Marathi)'
};

export type LanguageCode = keyof typeof LANGUAGES;

// Translation cache to avoid redundant API calls
interface TranslationCache {
  [key: string]: {
    [languageCode: string]: string;
  };
}

interface LanguageContextType {
  currentLanguage: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  translate: (text: string) => Promise<string>;
  translateImmediate: (text: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Default language
const DEFAULT_LANGUAGE: LanguageCode = 'en';

// Local storage key for language preference
const LANGUAGE_STORAGE_KEY = 'avs_language_preference';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with saved preference or default language
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    return savedLanguage && Object.keys(LANGUAGES).includes(savedLanguage) 
      ? savedLanguage 
      : DEFAULT_LANGUAGE;
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [translationCache, setTranslationCache] = useState<TranslationCache>({});
  
  // Update local storage when language changes
  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  }, [currentLanguage]);
  
  // Change language
  const setLanguage = (code: LanguageCode) => {
    if (Object.keys(LANGUAGES).includes(code)) {
      setCurrentLanguage(code);
    } else {
      console.error(`Unsupported language code: ${code}`);
    }
  };

  // Translate text using Supabase Edge Function
  const translate = async (text: string): Promise<string> => {
    // Return the original text if we're using English or text is empty
    if (currentLanguage === 'en' || !text || text.trim() === '') {
      return text;
    }
    
    // Check cache first
    if (translationCache[text]?.[currentLanguage]) {
      return translationCache[text][currentLanguage];
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          text,
          targetLanguage: currentLanguage,
          sourceLanguage: 'en'
        })
      });
      
      if (!response.ok) {
        throw new Error('Translation failed');
      }
      
      const data = await response.json();
      
      // Update cache
      setTranslationCache(prev => ({
        ...prev,
        [text]: {
          ...prev[text],
          [currentLanguage]: data.translatedText
        }
      }));
      
      return data.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original text on error
    } finally {
      setIsLoading(false);
    }
  };
  
  // Synchronous translation (returns cached translation or original text)
  const translateImmediate = (text: string): string => {
    if (currentLanguage === 'en' || !text || text.trim() === '') {
      return text;
    }
    
    return translationCache[text]?.[currentLanguage] || text;
  };
  
  return (
    <LanguageContext.Provider 
      value={{ 
        currentLanguage, 
        setLanguage, 
        translate, 
        translateImmediate,
        isLoading 
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook for using the language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};