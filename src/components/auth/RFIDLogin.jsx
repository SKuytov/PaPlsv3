import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Lock, Loader2, CheckCircle2, Globe } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import RFIDReader from '@/utils/rfidReader';
import { useTranslation } from '@/hooks/useTranslation';

const RFIDLogin = ({ onLoginSuccess, onLoginError }) => {
  const { toast } = useToast();
  const { t, language, setLanguage } = useTranslation();
  const [isReading, setIsReading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cardId, setCardId] = useState('');
  const [error, setError] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [technicianInfo, setTechnicianInfo] = useState(null);
  const rfidReaderRef = useRef(null);

  // Get API base URL from environment or construct from current domain
  const getApiUrl = () => {
    // Priority:
    // 1. VITE_API_URL environment variable (if set)
    // 2. Same domain as frontend on port 5000
    // 3. Fallback to localhost
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    // Get current domain and use port 5000
    const domain = window.location.hostname;
    return `http://${domain}:5000`;
  };

  const apiUrl = getApiUrl();

  useEffect(() => {
    // Initialize RFID reader
    const rfidReader = new RFIDReader({
      minLength: 8,
      maxLength: 50,
      timeoutMs: 100,
      clearOnRead: true
    });

    rfidReaderRef.current = rfidReader;

    rfidReader.init(
      (cardId) => handleCardRead(cardId),
      (err) => handleReaderError(err)
    );

    return () => {
      rfidReader.destroy();
    };
  }, []);

  const handleCardRead = async (cardId) => {
    console.log('[RFIDLogin] Card read:', cardId);
    setCardId(cardId);
    setIsReading(false);
    await authenticateCard(cardId);
  };

  const handleReaderError = (err) => {
    console.error('[RFIDLogin] Reader error:', err);
    setError(err.message);
    setIsReading(false);
    toast({
      variant: 'destructive',
      title: t('errors.error') || 'RFID Read Error',
      description: err.message
    });
  };

  const authenticateCard = async (cardIdValue) => {
    setIsVerifying(true);
    setError(null);

    try {
      // Call backend endpoint to verify RFID card and create session
      console.log('[RFIDLogin] Calling API at:', apiUrl);
      const response = await fetch(`${apiUrl}/api/auth/rfid-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rfid_card_id: cardIdValue
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('errors.error'));
      }

      // Success: Store session/token if provided
      if (data.session) {
        // If backend returns Supabase session, set it
        await supabase.auth.setSession(data.session);
      }

      setTechnicianInfo(data.technician);
      
      toast({
        title: t('common.success') || 'Success',
        description: `${t('scanner.title') || 'Welcome'} ${data.technician.name}!`,
        variant: 'default'
      });

      // Notify parent component
      if (onLoginSuccess) {
        onLoginSuccess(data.technician);
      }

    } catch (err) {
      console.error('[RFIDLogin] Auth error:', err);
      const errorMsg = err.message || t('errors.error') || 'Card not recognized. Please try again.';
      setError(errorMsg);
      setCardId('');
      
      toast({
        variant: 'destructive',
        title: t('common.error') || 'Error',
        description: errorMsg
      });

      if (onLoginError) {
        onLoginError(err);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!cardId.trim()) {
      setError(t('forms.validation.required') || 'Please enter a card ID');
      return;
    }
    await authenticateCard(cardId.trim());
  };

  const translations = {
    en: {
      title: 'Technician Login',
      descriptionScan: 'Hold your RFID card near the reader',
      descriptionManual: 'Enter your RFID card ID',
      reading: 'Reading card...',
      ready: 'Ready to scan',
      holdCard: 'Hold RFID card near the reader',
      verifying: 'Verifying card...',
      cardIdLabel: 'Card ID',
      cardIdPlaceholder: 'Enter card ID...',
      login: 'Login',
      verifyingBtn: 'Verifying...',
      toggleReader: 'Back to RFID Reader',
      toggleManual: 'Manual Entry',
      footer: 'RFID technician authentication system • Connected to Supabase'
    },
    bg: {
      title: 'Вход на техник',
      descriptionScan: 'Поставете вашата RFID карта близо до четеца',
      descriptionManual: 'Въведете вашия код на RFID карта',
      reading: 'Четене на карта...',
      ready: 'Готово за сканиране',
      holdCard: 'Поставете RFID карта близо до четеца',
      verifying: 'Проверка на карта...',
      cardIdLabel: 'Код на карта',
      cardIdPlaceholder: 'Въведете код на карта...',
      login: 'Вход',
      verifyingBtn: 'Проверка...',
      toggleReader: 'Назад към RFID четец',
      toggleManual: 'Ръчно въвеждане',
      footer: 'Система за RFID автентификация на техници • Свързано със Supabase'
    }
  };

  const lang = language === 'bg' ? 'bg' : 'en';
  const txt = translations[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <div className="flex gap-2 bg-slate-800/50 backdrop-blur-sm rounded-lg p-2 border border-slate-700">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-1 ${
              language === 'en'
                ? 'bg-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            EN
          </button>
          <button
            onClick={() => setLanguage('bg')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
              language === 'bg'
                ? 'bg-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            БГ
          </button>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-950">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-500/20 mx-auto mb-2">
            <Lock className="w-6 h-6 text-teal-400" />
          </div>
          <CardTitle className="text-center text-2xl text-slate-100">{txt.title}</CardTitle>
          <CardDescription className="text-center text-slate-400">
            {manualMode ? txt.descriptionManual : txt.descriptionScan}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* RFID Reader Mode */}
          {!manualMode && (
            <div className="space-y-4">
              <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 text-center space-y-3">
                <div className={`flex justify-center ${
                  isReading ? 'animate-pulse' : ''
                }`}>
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-teal-500/30"></div>
                    <div className="absolute inset-2 rounded-full border-2 border-teal-500/60 animate-pulse"></div>
                    <div className="absolute inset-4 rounded-full bg-teal-500/10 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-teal-400" />
                    </div>
                  </div>
                </div>
                <p className="text-slate-300 font-medium">
                  {isReading ? txt.reading : txt.ready}
                </p>
                <p className="text-xs text-slate-500">
                  {txt.holdCard}
                </p>
              </div>

              {cardId && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-300 font-mono">{cardId}</span>
                </div>
              )}

              {isVerifying && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  <span className="text-sm text-blue-300">{txt.verifying}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-300">{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry Mode */}
          {manualMode && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-id" className="text-slate-300">{txt.cardIdLabel}</Label>
                <Input
                  id="card-id"
                  type="text"
                  placeholder={txt.cardIdPlaceholder}
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-teal-500"
                  disabled={isVerifying}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-300">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                disabled={isVerifying || !cardId.trim()}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {txt.verifyingBtn}
                  </>
                ) : (
                  txt.login
                )}
              </Button>
            </form>
          )}

          {/* Mode Toggle */}
          <Button
            type="button"
            variant="ghost"
            className="w-full text-slate-400 hover:text-slate-300"
            onClick={() => {
              setManualMode(!manualMode);
              setError(null);
              setCardId('');
            }}
          >
            {manualMode ? txt.toggleReader : txt.toggleManual}
          </Button>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="absolute bottom-4 left-4 right-4">
        <p className="text-xs text-slate-500 text-center">
          {txt.footer}
        </p>
      </div>
    </div>
  );
};

export default RFIDLogin;