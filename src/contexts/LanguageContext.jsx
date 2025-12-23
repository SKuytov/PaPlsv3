import React, { createContext, useState, useContext, useEffect } from 'react';
import { loadTranslations } from '../utils/i18n';

/**
 * Language Context for managing global language state
 */
const LanguageContext = createContext();

/**
 * Language Provider Component
 * Wraps the application and provides language context
 */
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    // Initialize from localStorage or default to 'en'
    const savedLanguage = localStorage.getItem('appLanguage');
    return savedLanguage || 'en';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load translations when language changes
  useEffect(() => {
    const initializeLanguage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await loadTranslations(language);
        // Set HTML lang attribute for accessibility
        document.documentElement.lang = language;
        // Persist language preference
        localStorage.setItem('appLanguage', language);
      } catch (err) {
        console.error('Error loading language:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeLanguage();
  }, [language]);

  const setLanguage = (newLanguage) => {
    if (newLanguage !== language) {
      setLanguageState(newLanguage);
    }
  };

  const value = {
    language,
    setLanguage,
    isLoading,
    error,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context
 * @returns {Object} Language context object
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
