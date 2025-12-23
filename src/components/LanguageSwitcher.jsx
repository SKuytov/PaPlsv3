import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';

/**
 * LanguageSwitcher Component
 * Allows users to switch between available languages (English and Bulgarian)
 * 
 * Usage:
 * <LanguageSwitcher />
 */
export function LanguageSwitcher() {
  const { language, setLanguage, isLoading } = useLanguage();
  const { t } = useTranslation();

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
  };

  return (
    <div className="language-switcher">
      <label htmlFor="language-select" className="language-label">
        {t('settings.language')}:
      </label>
      <select
        id="language-select"
        value={language}
        onChange={handleLanguageChange}
        disabled={isLoading}
        className="language-select"
        aria-label={t('settings.language')}
      >
        <option value="en">English</option>
        <option value="bg">Български</option>
      </select>
      {isLoading && <span className="loading-indicator">{t('common.loading')}</span>}
    </div>
  );
}

/**
 * LanguageSwitcherButton Component
 * Alternative UI with button-based language switching
 * 
 * Usage:
 * <LanguageSwitcherButton />
 */
export function LanguageSwitcherButton() {
  const { language, setLanguage, isLoading } = useLanguage();
  const { t } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺S' },
    { code: 'bg', name: 'Български', flag: '🆺G' },
  ];

  return (
    <div className="language-switcher-buttons">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          disabled={isLoading}
          className={`language-button ${language === lang.code ? 'active' : ''}`}
          aria-label={`Switch to ${lang.name}`}
          aria-current={language === lang.code ? 'true' : 'false'}
        >
          <span className="flag">{lang.flag}</span>
          <span className="name">{lang.name}</span>
        </button>
      ))}
      {isLoading && <span className="loading-indicator">{t('common.loading')}</span>}
    </div>
  );
}

/**
 * LanguageSwitcherDropdown Component
 * Styled dropdown with icons
 * 
 * Usage:
 * <LanguageSwitcherDropdown />
 */
export function LanguageSwitcherDropdown() {
  const { language, setLanguage, isLoading } = useLanguage();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'bg', name: 'Български' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === language);

  const handleLanguageSelect = (code) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="language-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="language-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="current-language">{currentLanguage?.name}</span>
        <span className="dropdown-icon">▾</span>
      </button>

      {isOpen && (
        <div className="language-dropdown-menu" role="listbox">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`language-dropdown-item ${language === lang.code ? 'active' : ''}`}
              role="option"
              aria-selected={language === lang.code}
            >
              {lang.name}
              {language === lang.code && <span className="checkmark">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CSS Styles for LanguageSwitcher Components
 * Add these to your CSS file or use CSS modules
 */
const switcherStyles = `
/* Basic Select Switcher */
.language-switcher {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.language-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.language-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  background-color: white;
  color: #333;
  min-width: 150px;
}

.language-select:hover {
  border-color: #999;
}

.language-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.language-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Button Switcher */
.language-switcher-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.language-button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 0.375rem;
  background-color: white;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.language-button:hover:not(:disabled) {
  border-color: #007bff;
  background-color: #f0f7ff;
}

.language-button.active {
  border-color: #007bff;
  background-color: #007bff;
  color: white;
}

.language-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.language-button .flag {
  font-size: 1rem;
}

/* Dropdown Switcher */
.language-dropdown {
  position: relative;
  display: inline-block;
}

.language-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 0.375rem;
  background-color: white;
  cursor: pointer;
  font-size: 0.875rem;
  min-width: 150px;
}

.language-dropdown-trigger:hover:not(:disabled) {
  border-color: #999;
}

.language-dropdown-trigger:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.language-dropdown-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown-icon {
  margin-left: auto;
}

.language-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 1px solid #ccc;
  border-top: none;
  border-radius: 0 0 0.375rem 0.375rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.language-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background-color: white;
  cursor: pointer;
  font-size: 0.875rem;
  text-align: left;
}

.language-dropdown-item:hover {
  background-color: #f0f7ff;
}

.language-dropdown-item.active {
  background-color: #e7f0ff;
  color: #007bff;
  font-weight: 500;
}

.language-dropdown-item .checkmark {
  color: #007bff;
  font-weight: bold;
}

/* Loading Indicator */
.loading-indicator {
  font-size: 0.75rem;
  color: #666;
  margin-left: 0.5rem;
}
`;

export default LanguageSwitcher;
