import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import RFIDLogin from '@/components/auth/RFIDLogin';
import MaintenanceScanner from '@/components/modules/MaintenanceScanner';
import MaintenanceSpareParts from '@/components/modules/MaintenanceSpareParts';
import { RolePermissionsContext } from '@/contexts/RolePermissionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const RFIDLoginPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const roleContext = useContext(RolePermissionsContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [technicianInfo, setTechnicianInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('scanner');

  const translations = {
    en: {
      sessionActive: 'Technician Session Active',
      name: 'Name',
      id: 'ID',
      card: 'Card',
      scanner: '📋 Scanner',
      spareParts: '📦 Spare Parts',
      logout: 'Logout',
      errorNoTechnicianId: 'Error: No technician ID found'
    },
    bg: {
      sessionActive: 'Активна сесия на техник',
      name: 'Име',
      id: 'Код',
      card: 'Карта',
      scanner: '📋 Сканер',
      spareParts: '📦 Резервни части',
      logout: 'Излез',
      errorNoTechnicianId: 'Грешка: Няма намерен код на техник'
    }
  };

  const lang = language === 'bg' ? 'bg' : 'en';
  const txt = translations[lang];

  const handleLoginSuccess = async (technician) => {
    console.log('[RFIDLoginPage] Login successful:', technician);
    console.log('[RFIDLoginPage] Technician ID:', technician?.id);
    console.log('[RFIDLoginPage] Technician Name:', technician?.name);
    console.log('[RFIDLoginPage] Technician Role:', technician?.role);
    console.log('[RFIDLoginPage] Technician Permissions:', technician?.permissions);

    // Update role context if available
    if (roleContext && technician.role) {
      roleContext.setRole(technician.role);
      roleContext.setPermissions(technician.permissions || []);
      roleContext.setUserProfile(technician);
    }

    setTechnicianInfo(technician);
    setIsLoggedIn(true);
  };

  const handleLoginError = (error) => {
    console.error('[RFIDLoginPage] Login error:', error);
  };

  const handleLogout = async () => {
    try {
      // Clear Supabase session
      await supabase.auth.signOut();
      
      // Reset local state
      setIsLoggedIn(false);
      setTechnicianInfo(null);
      setActiveTab('scanner');

      // Clear role context
      if (roleContext) {
        roleContext.setRole(null);
        roleContext.setPermissions([]);
        roleContext.setUserProfile(null);
      }
      
      // Optionally redirect to home
      // navigate('/');
    } catch (error) {
      console.error('[RFIDLoginPage] Logout error:', error);
    }
  };

  // Before login: Show RFID login screen
  if (!isLoggedIn) {
    return (
      <RFIDLogin 
        onLoginSuccess={handleLoginSuccess}
        onLoginError={handleLoginError}
      />
    );
  }

  // After login: Show Scanner and SpareParts tabs (ORIGINAL UI)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <div className="flex gap-2 bg-white/50 backdrop-blur-sm rounded-lg p-2 border border-slate-200 shadow-sm">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-1 ${
              language === 'en'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            EN
          </button>
          <button
            onClick={() => setLanguage('bg')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
              language === 'bg'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            БГ
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Session Info - ORIGINAL DESIGN */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-900 font-medium">
                  {txt.sessionActive}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {txt.name}: {technicianInfo?.name} | {txt.id}: {technicianInfo?.id} | {txt.card}: {technicianInfo?.rfid_card_id}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              {txt.logout}
            </Button>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="scanner" className="text-base font-semibold">
              {txt.scanner}
            </TabsTrigger>
            <TabsTrigger value="parts" className="text-base font-semibold">
              {txt.spareParts}
            </TabsTrigger>
          </TabsList>

          {/* Scanner Tab */}
          <TabsContent value="scanner" className="mt-0">
            {technicianInfo?.id && (
              <MaintenanceScanner 
                onLogout={handleLogout}
                technicianName={technicianInfo?.name}
                technicianId={technicianInfo?.id}
                userRole={technicianInfo?.role}
                userPermissions={technicianInfo?.permissions || []}
              />
            )}
            {!technicianInfo?.id && (
              <div className="text-center text-red-600 font-bold py-8">{txt.errorNoTechnicianId}</div>
            )}
          </TabsContent>

          {/* Spare Parts Tab */}
          <TabsContent value="parts" className="mt-0">
            {technicianInfo?.id && (
              <MaintenanceSpareParts 
                onLogout={handleLogout}
                technicianName={technicianInfo?.name}
                technicianId={technicianInfo?.id}
                userRole={technicianInfo?.role}
                userPermissions={technicianInfo?.permissions || []}
              />
            )}
            {!technicianInfo?.id && (
              <div className="text-center text-red-600 font-bold py-8">{txt.errorNoTechnicianId}</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RFIDLoginPage;