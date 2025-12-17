import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import RFIDReader from '@/utils/rfidReader';

const RFIDLogin = ({ onLoginSuccess, onLoginError }) => {
  const { toast } = useToast();
  const [isReading, setIsReading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cardId, setCardId] = useState('');
  const [error, setError] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [technicianInfo, setTechnicianInfo] = useState(null);
  const rfidReaderRef = useRef(null);

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
      title: 'RFID Read Error',
      description: err.message
    });
  };

  const authenticateCard = async (cardIdValue) => {
    setIsVerifying(true);
    setError(null);

    try {
      // Call backend endpoint to verify RFID card and create session
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/rfid-login`, {
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
        throw new Error(data.error || 'Authentication failed');
      }

      // Success: Store session/token if provided
      if (data.session) {
        // If backend returns Supabase session, set it
        await supabase.auth.setSession(data.session);
      }

      setTechnicianInfo(data.technician);
      
      toast({
        title: 'Login Successful',
        description: `Welcome ${data.technician.name}!`,
        variant: 'default'
      });

      // Notify parent component
      if (onLoginSuccess) {
        onLoginSuccess(data.technician);
      }

    } catch (err) {
      console.error('[RFIDLogin] Auth error:', err);
      const errorMsg = err.message || 'Card not recognized. Please try again.';
      setError(errorMsg);
      setCardId('');
      
      toast({
        variant: 'destructive',
        title: 'Login Failed',
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
      setError('Please enter a card ID');
      return;
    }
    await authenticateCard(cardId.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-950">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-500/20 mx-auto mb-2">
            <Lock className="w-6 h-6 text-teal-400" />
          </div>
          <CardTitle className="text-center text-2xl text-slate-100">Technician Login</CardTitle>
          <CardDescription className="text-center text-slate-400">
            {manualMode ? 'Enter your RFID card ID' : 'Hold your RFID card near the reader'}
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
                  {isReading ? 'Reading card...' : 'Ready to scan'}
                </p>
                <p className="text-xs text-slate-500">
                  Hold RFID card near the reader
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
                  <span className="text-sm text-blue-300">Verifying card...</span>
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
                <Label htmlFor="card-id" className="text-slate-300">Card ID</Label>
                <Input
                  id="card-id"
                  type="text"
                  placeholder="Enter card ID..."
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
                    Verifying...
                  </>
                ) : (
                  'Login'
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
            {manualMode ? 'Back to RFID Reader' : 'Manual Entry'}
          </Button>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="absolute bottom-4 left-4 right-4">
        <p className="text-xs text-slate-500 text-center">
          RFID technician authentication system • Connected to Supabase
        </p>
      </div>
    </div>
  );
};

export default RFIDLogin;
