import React from 'react';
import { Helmet } from 'react-helmet';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/toaster';
import AppRouter from '@/components/AppRouter';
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <Helmet>
            <title>PartPulse v3</title>
            <meta name="description" content="Industrial Spare Parts Management System" />
            {/* SECURITY: Content Security Policy (CSP) to prevent XSS */}
            {/* Updated to allow any hostname on port 5000 for RFID backend API calls */}
            <meta 
              http-equiv="Content-Security-Policy" 
              content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: http://*:5000; font-src 'self' data:;" 
            />
            {/* SECURITY: Prevent clickjacking */}
            <meta http-equiv="X-Frame-Options" content="DENY" />
            {/* SECURITY: Enforce XSS filtering */}
            <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
          </Helmet>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <AppRouter />
            <Toaster />
          </div>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;