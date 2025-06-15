import React, { ReactNode } from 'react';
import { LanguageProvider } from '../utils/languageContext';
import { ToastContainer } from 'react-toastify';
import { Loader } from 'lucide-react';
import { useLanguage } from '../utils/languageContext';

interface TranslationProviderProps {
  children: ReactNode;
}

// Inner component to show loading indicator when translations are loading
const TranslationLoader: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isLoading } = useLanguage();
  
  return (
    <>
      {isLoading && (
        <div className="fixed bottom-4 left-4 z-50 bg-primary-600 text-white py-1 px-2 rounded-full shadow-md flex items-center">
          <Loader className="h-4 w-4 animate-spin mr-2" />
          <span className="text-xs">Translating...</span>
        </div>
      )}
      {children}
    </>
  );
};

// Main provider that wraps app with LanguageProvider
const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  return (
    <LanguageProvider>
      <TranslationLoader>
        {children}
      </TranslationLoader>
      <ToastContainer 
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
      />
    </LanguageProvider>
  );
};

export default TranslationProvider;