/**
 * i18n Utility Functions
 * Handles translation loading, retrieval, and formatting
 */

let translations = {};

/**
 * Load translations for a specific language
 * @param {string} language - Language code (e.g., 'en', 'bg')
 * @returns {Promise<Object>} Loaded translations
 */
export const loadTranslations = async (language) => {
  try {
    const translationModule = await import(`../locales/${language}/translation.json`);
    translations[language] = translationModule.default;
    return translations[language];
  } catch (error) {
    console.error(`Failed to load translations for language: ${language}`, error);
    // Fallback to English if translation loading fails
    if (language !== 'en') {
      return loadTranslations('en');
    }
    return {};
  }
};

/**
 * Get translation by key path
 * @param {string} key - Dot-notation key (e.g., 'dashboard.title')
 * @param {string} language - Language code
 * @param {Object} params - Parameters for interpolation (optional)
 * @returns {string} Translated string
 */
export const getTranslation = (key, language, params = {}) => {
  if (!translations[language]) {
    console.warn(`Translations for ${language} not loaded`);
    return key; // Fallback to key if not loaded
  }

  // Navigate through nested object using dot notation
  const keys = key.split('.');
  let value = translations[language];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key; // Return key if not found
    }
  }

  // Handle interpolation of parameters
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    return interpolateParams(value, params);
  }

  return value || key;
};

/**
 * Interpolate parameters in translation string
 * @param {string} template - Template string
 * @param {Object} params - Parameters to inject
 * @returns {string} Interpolated string
 */
const interpolateParams = (template, params) => {
  let result = template;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
};

/**
 * Format date according to language locale
 * @param {Date|string} date - Date to format
 * @param {string} language - Language code
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export const formatDate = (date, language, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  };

  const localeMap = {
    en: 'en-US',
    bg: 'bg-BG',
  };

  const locale = localeMap[language] || 'en-US';

  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(
      new Date(date)
    );
  } catch (error) {
    console.error('Date formatting error:', error);
    return new Date(date).toLocaleDateString();
  }
};

/**
 * Format time according to language locale
 * @param {Date|string} date - Date/time to format
 * @param {string} language - Language code
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted time
 */
export const formatTime = (date, language, options = {}) => {
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  };

  const localeMap = {
    en: 'en-US',
    bg: 'bg-BG',
  };

  const locale = localeMap[language] || 'en-US';

  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(
      new Date(date)
    );
  } catch (error) {
    console.error('Time formatting error:', error);
    return new Date(date).toLocaleTimeString();
  }
};

/**
 * Format date and time according to language locale
 * @param {Date|string} date - Date/time to format
 * @param {string} language - Language code
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (date, language, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  const localeMap = {
    en: 'en-US',
    bg: 'bg-BG',
  };

  const locale = localeMap[language] || 'en-US';

  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(
      new Date(date)
    );
  } catch (error) {
    console.error('DateTime formatting error:', error);
    return new Date(date).toLocaleString();
  }
};

/**
 * Format number according to language locale
 * @param {number} number - Number to format
 * @param {string} language - Language code
 * @param {Object} options - Intl.NumberFormat options
 * @returns {string} Formatted number
 */
export const formatNumber = (number, language, options = {}) => {
  const localeMap = {
    en: 'en-US',
    bg: 'bg-BG',
  };

  const locale = localeMap[language] || 'en-US';

  try {
    return new Intl.NumberFormat(locale, options).format(number);
  } catch (error) {
    console.error('Number formatting error:', error);
    return String(number);
  }
};

/**
 * Format currency according to language locale
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (e.g., 'BGN', 'USD')
 * @param {string} language - Language code
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, currency, language) => {
  const localeMap = {
    en: 'en-US',
    bg: 'bg-BG',
  };

  const locale = localeMap[language] || 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'BGN',
    }).format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${amount} ${currency || 'BGN'}`;
  }
};

/**
 * Get all loaded translations
 * @returns {Object} All loaded translations
 */
export const getAllTranslations = () => {
  return translations;
};

/**
 * Clear translations cache
 */
export const clearTranslations = () => {
  translations = {};
};

/**
 * Check if language is loaded
 * @param {string} language - Language code
 * @returns {boolean} Whether language is loaded
 */
export const isLanguageLoaded = (language) => {
  return language in translations;
};

/**
 * Get supported languages
 * @returns {Array<string>} Array of supported language codes
 */
export const getSupportedLanguages = () => {
  return ['en', 'bg'];
};

/**
 * Get language name for display
 * @param {string} language - Language code
 * @returns {string} Language name
 */
export const getLanguageName = (language) => {
  const names = {
    en: 'English',
    bg: 'Български',
  };
  return names[language] || language;
};
