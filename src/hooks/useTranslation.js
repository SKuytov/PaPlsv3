import { useLanguage } from '../contexts/LanguageContext';
import {
  getTranslation,
  formatDate,
  formatTime,
  formatDateTime,
  formatNumber,
  formatCurrency,
} from '../utils/i18n';

/**
 * Hook to access translation functions in components
 * @returns {Object} Translation utilities
 */
export function useTranslation() {
  const { language } = useLanguage();

  /**
   * Translate a key to the current language
   * @param {string} key - Translation key (dot notation)
   * @param {Object} params - Parameters for interpolation (optional)
   * @returns {string} Translated string
   */
  const t = (key, params = {}) => {
    return getTranslation(key, language, params);
  };

  /**
   * Format date according to current language locale
   * @param {Date|string} date - Date to format
   * @param {Object} options - Intl.DateTimeFormat options (optional)
   * @returns {string} Formatted date
   */
  const tDate = (date, options = {}) => {
    return formatDate(date, language, options);
  };

  /**
   * Format time according to current language locale
   * @param {Date|string} time - Time to format
   * @param {Object} options - Intl.DateTimeFormat options (optional)
   * @returns {string} Formatted time
   */
  const tTime = (time, options = {}) => {
    return formatTime(time, language, options);
  };

  /**
   * Format date and time according to current language locale
   * @param {Date|string} dateTime - DateTime to format
   * @param {Object} options - Intl.DateTimeFormat options (optional)
   * @returns {string} Formatted date and time
   */
  const tDateTime = (dateTime, options = {}) => {
    return formatDateTime(dateTime, language, options);
  };

  /**
   * Format number according to current language locale
   * @param {number} number - Number to format
   * @param {Object} options - Intl.NumberFormat options (optional)
   * @returns {string} Formatted number
   */
  const tNumber = (number, options = {}) => {
    return formatNumber(number, language, options);
  };

  /**
   * Format currency according to current language locale
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (e.g., 'BGN', 'USD')
   * @returns {string} Formatted currency
   */
  const tCurrency = (amount, currency = 'BGN') => {
    return formatCurrency(amount, currency, language);
  };

  return {
    t,
    tDate,
    tTime,
    tDateTime,
    tNumber,
    tCurrency,
    language,
  };
}

export default useTranslation;
