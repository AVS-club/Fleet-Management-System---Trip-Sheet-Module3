import { useEffect, useState } from 'react';
import { useLanguage } from './languageContext';

/**
 * Custom hook that translates text and updates it when the language changes
 * @param text Text to translate
 * @param dependencies Additional dependencies that should trigger re-translation
 * @returns Translated text
 */
export const useTranslation = (text: string, dependencies: any[] = []): string => {
  const { translate, currentLanguage } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    let isMounted = true;
    
    const translateText = async () => {
      try {
        const result = await translate(text);
        if (isMounted) {
          setTranslatedText(result);
        }
      } catch (error) {
        console.error('Translation error:', error);
      }
    };
    
    translateText();
    
    return () => {
      isMounted = false;
    };
  }, [text, currentLanguage, translate, ...dependencies]);
  
  return translatedText;
};

/**
 * Batch translate multiple strings at once
 * @param texts Array of texts to translate
 * @param targetLanguage Target language code
 * @returns Promise resolving to array of translated texts
 */
export const batchTranslate = async (
  texts: string[], 
  targetLanguage: string
): Promise<string[]> => {
  // Skip translation if target language is English
  if (targetLanguage === 'en') {
    return texts;
  }
  
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        texts,
        targetLanguage,
        sourceLanguage: 'en'
      })
    });
    
    if (!response.ok) {
      throw new Error('Batch translation failed');
    }
    
    const data = await response.json();
    return data.translatedTexts;
  } catch (error) {
    console.error('Batch translation error:', error);
    return texts; // Fallback to original texts
  }
};

/**
 * Returns a translation function for components that need to translate text on demand
 * @returns Function that translates text
 */
export const useTranslator = () => {
  const { translate } = useLanguage();
  return translate;
};