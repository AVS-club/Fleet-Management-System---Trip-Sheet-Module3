import React from 'react';
import { useTranslation } from '../../utils/translationUtils';

interface TranslatableTextProps {
  text: string;
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div';
  className?: string;
  loading?: React.ReactNode;
  dependencies?: any[];
  children?: never;
}

/**
 * Component that automatically translates text based on the current language
 */
const TranslatableText: React.FC<TranslatableTextProps> = ({
  text,
  as: Component = 'span',
  className = '',
  loading = null,
  dependencies = []
}) => {
  const translatedText = useTranslation(text, dependencies);
  
  if (!translatedText && loading) {
    return <>{loading}</>;
  }
  
  return (
    <Component className={className}>
      {translatedText}
    </Component>
  );
};

export default TranslatableText;