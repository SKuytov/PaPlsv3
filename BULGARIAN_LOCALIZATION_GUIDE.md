# Bulgarian Localization Implementation Guide

This guide explains how the Bulgarian language support has been implemented in the PaPlsv3 WMS/CMMS system.

## Overview

The system now supports English (default) and Bulgarian (bg) languages using a JSON-based localization approach with a custom i18n hook.

## Architecture

### 1. **Localization Files Structure**
```
src/
├── locales/
│   ├── en/
│   │   └── translation.json      # English translations
│   └── bg/
│       └── translation.json      # Bulgarian translations
├── contexts/
│   └── LanguageContext.jsx        # Language context provider
├── hooks/
│   └── useTranslation.js          # Custom translation hook
└── utils/
    └── i18n.js                    # i18n utilities
```

### 2. **Key Components**

#### **LanguageContext.jsx**
- Provides global language state management
- Stores current language preference
- Persists language choice to localStorage
- Provides language switching functionality

#### **useTranslation Hook**
- React hook for accessing translations
- Returns `t()` function to translate keys
- Example: `const { t } = useTranslation();` then `t('dashboard.title')`

#### **i18n.js Utilities**
- `loadTranslations()` - Loads translation files based on language
- `getTranslation()` - Retrieves translation by nested key path
- `formatDate()` - Formats dates according to language locale
- `formatCurrency()` - Formats currency values

## Implementation Steps

### Step 1: Install Dependencies (Optional)
The implementation uses only React built-ins. No additional npm packages required.

```bash
# No installation needed - uses native JSON imports
```

### Step 2: Create Localization Files

1. **Create the locales directory structure:**
```bash
mkdir -p src/locales/en
mkdir -p src/locales/bg
```

2. **Create translation files** (see translation files below)

### Step 3: Wrap Application with LanguageProvider

In `src/main.jsx` or `src/App.jsx`:

```jsx
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      {/* Your app components */}
    </LanguageProvider>
  );
}
```

### Step 4: Use Translations in Components

```jsx
import { useTranslation } from '../hooks/useTranslation';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.description')}</p>
    </div>
  );
}
```

### Step 5: Add Language Switcher Component

```jsx
import { useLanguage } from '../contexts/LanguageContext';

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  
  return (
    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
      <option value="en">English</option>
      <option value="bg">Български</option>
    </select>
  );
}
```

## Translation File Format

Translations are organized in a nested JSON structure:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome to {{name}}"
  },
  "forms": {
    "validation": {
      "required": "This field is required",
      "email": "Please enter a valid email"
    }
  }
}
```

## Translation Key Naming Convention

Use dot notation for nested keys:
- `common.save` - Common action button
- `dashboard.title` - Dashboard page title
- `forms.validation.required` - Form validation message
- `pages.inventory.search.placeholder` - Specific page, section, component

## Advanced Features

### 1. **Parameter Interpolation**

Translation with variables:
```json
{
  "welcome": "Hello {{firstName}}, welcome to {{appName}}"
}
```

Usage:
```jsx
const translated = t('welcome', { firstName: 'John', appName: 'PaPlsv3' });
// Result: "Hello John, welcome to PaPlsv3"
```

### 2. **Pluralization**

Handle plural forms:
```json
{
  "items": "You have {{count}} item",
  "items_plural": "You have {{count}} items"
}
```

### 3. **Date and Currency Formatting**

```jsx
const { formatDate, formatCurrency } = useTranslation();

// Formats according to selected language locale
formatDate(new Date(), 'dd/MM/yyyy');
formatCurrency(1000, 'BGN');
```

## Deployment to Production

### Step 1: Commit Changes
```bash
git add .
git commit -m "feat: Add Bulgarian localization support"
```

### Step 2: Create Pull Request
Push the branch and create a PR for code review:
```bash
git push origin feature/bulgarian-localization
```

### Step 3: Deploy to VPS
After merging to main:
```bash
cd /path/to/papls
git pull origin main
npm install
npm run build
sudo systemctl restart papls
```

## Translation Coverage

### Phase 1 (Current)
- Dashboard
- Navigation
- Common UI elements
- Form labels and validation

### Phase 2 (To be implemented)
- Page-specific content
- Error messages
- Notifications
- Documentation

### Phase 3 (Future)
- Backend messages
- Email templates
- Reports
- PDF exports

## Testing

### 1. **Test Language Switching**
```jsx
// In React DevTools, verify:
// 1. Language context is updated
// 2. All components re-render with new language
// 3. localStorage is updated
```

### 2. **Test All Pages**
- Dashboard
- Inventory
- Spare Parts
- Users
- Settings

### 3. **Test Date/Currency Formatting**
- Verify dates display in correct format
- Verify currency shows correct symbol and format

## Troubleshooting

### Missing Translations
**Problem**: Some UI elements don't translate
**Solution**: 
1. Check translation key is correct
2. Add missing translation to both en/translation.json and bg/translation.json
3. Verify key follows dot notation

### Language Not Persisting
**Problem**: Language resets on page reload
**Solution**:
1. Check localStorage is enabled in browser
2. Verify LanguageContext initializes language from localStorage
3. Check browser console for errors

### Performance Issues
**Problem**: App is slow after adding translations
**Solution**:
1. Ensure translation files are optimized (not too large)
2. Use dynamic imports for large translation files
3. Consider lazy loading translations by page

## Best Practices

1. **Always provide both languages** - When adding new UI text, add to both en and bg translation files
2. **Use consistent naming** - Follow established naming conventions
3. **Keep translations organized** - Group related translations in the JSON structure
4. **Test translations** - Verify all new translations work in UI
5. **Document complex translations** - Add comments for context-specific translations
6. **Avoid hardcoded text** - Never hardcode user-facing text in components

## Resources

- [React i18n Best Practices](https://react.i18next.com/)
- [Unicode CLDR - Bulgarian Locale Data](https://cldr.unicode.org/)
- [Translation Memory Exchange Format](https://www.oasis-open.org/committees/tc_home.php?wg_abbrev=xliff)

## Support

For questions or issues with Bulgarian localization:
1. Check this guide
2. Review translation files for examples
3. Check browser console for errors
4. Create an issue on GitHub with details

---

**Last Updated**: December 2024
**Status**: In Progress - Phase 1 Complete
