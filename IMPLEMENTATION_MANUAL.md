# Bulgarian Localization Implementation Manual

## Quick Start

This branch (`feature/bulgarian-localization`) contains a complete Bulgarian language localization system for the PaPlsv3 WMS/CMMS application.

## What's Included

### 1. **Infrastructure Files** (Already Created)

```
src/
├── utils/
│   └── i18n.js                    # Core i18n utilities
├── contexts/
│   └── LanguageContext.jsx        # Language provider
├── hooks/
│   └── useTranslation.js          # Translation hook
└── locales/
    ├── en/
    │   └── translation.json         # English translations
    └── bg/
        └── translation.json         # Bulgarian translations
```

### 2. **Translation Coverage**

- Common UI elements (buttons, messages, validation)
- Navigation menu
- Dashboard
- Inventory management
- Spare parts management
- Maintenance module
- User management
- Settings
- Reports
- Form validation
- Date/time labels
- Error messages

## Implementation Steps

### Step 1: Update Your App Component

Edit `src/App.jsx` to wrap your application with `LanguageProvider`:

```jsx
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      {/* Your existing routes and components */}
    </LanguageProvider>
  );
}

export default App;
```

### Step 2: Update Components to Use Translations

**Before:**
```jsx
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to PaPlsv3</p>
      <button>Save</button>
    </div>
  );
}
```

**After:**
```jsx
import { useTranslation } from '../hooks/useTranslation';

function Dashboard() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.welcome')}</p>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### Step 3: Add Language Switcher

Create a new component `src/components/LanguageSwitcher.jsx`:

```jsx
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  
  return (
    <div className="language-switcher">
      <label htmlFor="language-select">{t('settings.language')}:</label>
      <select 
        id="language-select"
        value={language} 
        onChange={(e) => setLanguage(e.target.value)}
      >
        <option value="en">English</option>
        <option value="bg">Български</option>
      </select>
    </div>
  );
}
```

### Step 4: Add Date/Currency Formatting

```jsx
import { useTranslation } from '../hooks/useTranslation';

function OrderDetails() {
  const { t, tDate, tCurrency } = useTranslation();
  const orderDate = new Date('2024-12-23');
  const total = 1500;
  
  return (
    <div>
      <p>{t('common.save')}: {tDate(orderDate)}</p>
      <p>{t('inventory.unitPrice')}: {tCurrency(total, 'BGN')}</p>
    </div>
  );
}
```

### Step 5: Implement in Key Components

Priority order for implementation:

1. **Navigation/Menu Components**
   - Top navigation bar
   - Sidebar menu
   - Footer

2. **Layout Components**
   - Header
   - Sidebar
   - Footer

3. **Page Components**
   - Dashboard
   - Inventory
   - Maintenance
   - Users

4. **Feature Components**
   - Forms
   - Tables
   - Modals
   - Dialogs

5. **Utility Components**
   - Error messages
   - Success notifications
   - Loading states

## Integration Checklist

### Phase 1: Core Setup (This Branch)
- [ ] Verify all infrastructure files are in place
- [ ] Verify English translations are complete
- [ ] Verify Bulgarian translations are complete
- [ ] Test language switching in browser

### Phase 2: Component Integration
- [ ] Wrap App with LanguageProvider
- [ ] Update Navigation component
- [ ] Update Dashboard component
- [ ] Update Inventory component
- [ ] Update Users component
- [ ] Update Settings component
- [ ] Add LanguageSwitcher to header

### Phase 3: Testing
- [ ] Test all pages in English
- [ ] Test all pages in Bulgarian
- [ ] Test language persistence (reload)
- [ ] Test date formatting
- [ ] Test currency formatting
- [ ] Test form validation messages

### Phase 4: Deployment
- [ ] Code review
- [ ] Merge to main
- [ ] Deploy to staging
- [ ] Final testing on staging
- [ ] Deploy to production

## Adding New Translations

### When Adding New Features:

1. **Add to English translation** (`src/locales/en/translation.json`):
   ```json
   {
     "myFeature": {
       "title": "My Feature",
       "description": "This is my feature"
     }
   }
   ```

2. **Add to Bulgarian translation** (`src/locales/bg/translation.json`):
   ```json
   {
     "myFeature": {
       "title": "Мое умение",
       "description": "Това е мое умение"
     }
   }
   ```

3. **Use in component**:
   ```jsx
   const { t } = useTranslation();
   return <h1>{t('myFeature.title')}</h1>;
   ```

## Vite Configuration Note

The current implementation uses dynamic imports which work with Vite's module resolution. If you encounter issues, ensure `vite.config.js` has the appropriate settings (it should already be configured correctly in this project).

## Testing Translations

### Browser DevTools Testing

1. Open React DevTools
2. Find the LanguageProvider component
3. Check the `value` prop shows current language
4. Change language using LanguageSwitcher
5. Verify all components re-render with new translations

### Automated Testing (Optional)

```jsx
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from './contexts/LanguageContext';
import MyComponent from './MyComponent';

test('renders in English', () => {
  render(
    <LanguageProvider>
      <MyComponent />
    </LanguageProvider>
  );
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
});
```

## Common Issues & Solutions

### Issue: Translations not loading
**Solution:**
1. Check browser console for errors
2. Verify translation files exist in `src/locales/`
3. Verify JSON syntax is valid
4. Check that language code matches ('en' or 'bg')

### Issue: Language doesn't persist after reload
**Solution:**
1. Check localStorage is enabled
2. Verify LanguageContext initializes from localStorage
3. Check browser privacy settings allow localStorage

### Issue: Some text not translating
**Solution:**
1. Verify translation key exists in both files
2. Check key path matches in component (dot notation)
3. Check JSON structure nesting is correct
4. Verify no special characters breaking JSON

### Issue: Date/Currency formatting wrong
**Solution:**
1. Verify correct locale code ('en' → 'en-US', 'bg' → 'bg-BG')
2. Check Intl.DateTimeFormat options
3. Verify browser locale support
4. Use console to test: `new Intl.DateTimeFormat('bg-BG').format(new Date())`

## Performance Considerations

1. **Translation files are small** - JSON files are only ~8KB and ~11KB
2. **No lazy loading needed** - Files are loaded on app startup
3. **Minimal re-renders** - Only affected components re-render on language change
4. **No external dependencies** - Uses only React and native Intl APIs

## Future Enhancements

1. **Add more languages** - Simply add new directory in `src/locales/`
2. **Backend translations** - Move translations to database for dynamic updates
3. **Translation management UI** - Create admin panel for managing translations
4. **Machine translation** - Auto-translate new strings to Bulgarian
5. **Right-to-left (RTL) support** - Add RTL language support

## Deployment Instructions

### For Hostinger VPS

```bash
# 1. SSH into your VPS
ssh user@your-vps-ip

# 2. Navigate to project
cd /path/to/papls

# 3. Pull the new branch
git fetch origin
git checkout feature/bulgarian-localization

# 4. Install dependencies
npm install

# 5. Build the project
npm run build

# 6. Restart the application
sudo systemctl restart papls
# OR if using PM2:
pm2 restart papls

# 7. Verify deployment
curl http://localhost:3000/
```

### Using Nginx

If using Nginx reverse proxy, ensure:
1. Cache busting is enabled for new bundle
2. Browser cache is cleared or set to short TTL
3. Gzip compression is enabled

## Merging to Main

### Via GitHub UI
1. Go to [Pull Requests](https://github.com/SKuytov/PaPlsv3/pulls)
2. Click "New Pull Request"
3. Select `main` as base, `feature/bulgarian-localization` as compare
4. Add description of changes
5. Request review
6. Merge once approved

### Via Command Line
```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Merge the feature branch
git merge feature/bulgarian-localization

# Push to remote
git push origin main
```

## Support & Questions

For questions about:
- **Implementation**: Check BULGARIAN_LOCALIZATION_GUIDE.md
- **Specific translations**: Check translation.json files
- **Technical issues**: Check Common Issues section above
- **Feature requests**: Create a GitHub issue

---

**Branch**: `feature/bulgarian-localization`
**Created**: December 23, 2024
**Status**: Ready for Integration
