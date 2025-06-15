import { useState, useEffect } from 'react';
import { useLanguage } from '../utils/languageContext';

/**
 * Custom hook for handling form field translation
 * 
 * This hook provides a translated version of a field value when displaying it,
 * but preserves the original value when editing or submitting forms.
 * 
 * @param originalValue The original field value in English
 * @returns Object with translated value and utilities to handle form interaction
 */
const useTranslatedField = (originalValue: string) => {
  const { translate, currentLanguage } = useLanguage();
  const [translatedValue, setTranslatedValue] = useState<string>(originalValue);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Translate the value whenever language changes or original value changes
  useEffect(() => {
    if (currentLanguage !== 'en' && !isEditing && originalValue) {
      const translateValue = async () => {
        try {
          const result = await translate(originalValue);
          setTranslatedValue(result);
        } catch (error) {
          console.error('Translation error:', error);
          setTranslatedValue(originalValue);
        }
      };
      
      translateValue();
    } else {
      setTranslatedValue(originalValue);
    }
  }, [currentLanguage, originalValue, isEditing, translate]);
  
  // Start editing - switch back to original value
  const handleStartEditing = () => {
    setIsEditing(true);
    setTranslatedValue(originalValue);
  };
  
  // Stop editing - translate again if needed
  const handleStopEditing = async () => {
    setIsEditing(false);
    if (currentLanguage !== 'en') {
      try {
        const result = await translate(originalValue);
        setTranslatedValue(result);
      } catch (error) {
        console.error('Translation error:', error);
      }
    }
  };
  
  return {
    value: isEditing ? originalValue : translatedValue,
    originalValue,
    isEditing,
    handleStartEditing,
    handleStopEditing,
    setIsEditing
  };
};

export default useTranslatedField;