import { useEffect, useState } from 'react';
import { useLanguage } from '../utils/languageContext';

/**
 * Hook to translate a batch of texts when component mounts or when language changes
 * 
 * @param texts Array of texts to translate
 * @returns Array of translated texts
 */
const useTranslateOnMount = (texts: string[]): string[] => {
  const { currentLanguage } = useLanguage();
  const [translatedTexts, setTranslatedTexts] = useState<string[]>(texts);
  
  useEffect(() => {
    // If language is English or there are no texts, just use the original texts
    if (currentLanguage === 'en' || texts.length === 0) {
      setTranslatedTexts(texts);
      return;
    }
    
    const translateTexts = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            texts,
            targetLanguage: currentLanguage,
            sourceLanguage: 'en'
          })
        });
        
        if (!response.ok) {
          throw new Error('Batch translation failed');
        }
        
        const data = await response.json();
        setTranslatedTexts(data.translatedTexts || texts);
      } catch (error) {
        console.error('Error translating batch of texts:', error);
        setTranslatedTexts(texts); // Fall back to original texts
      }
    };
    
    translateTexts();
  }, [texts, currentLanguage]);
  
  return translatedTexts;
};

export default useTranslateOnMount;