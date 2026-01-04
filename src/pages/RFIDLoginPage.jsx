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
import { AlertCircle, Globe, LogOut, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getRoleDisplayInfo } from '@/utils/rolePermissions';

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
      sessionActive: 'Session Active',
      name: 'Name',
      id: 'ID',
      email: 'Email',
      role: 'Role',
      buildings: 'Buildings',
      scanner: '📋 Scanner',
      spareParts: '📦 Spare Parts',
      logout: 'Logout',
      errorNoTechnicianId: 'Error: No technician ID found',
      permissions: 'Permissions',
      canRestock: 'Can Restock',
      canEdit: 'Can Edit Inventory',
      canApprove: 'Can Approve'
    },
    bg: {
      sessionActive: 'Активна сесия',
      name: 'Име',
      id: 'Код',
      email: 'Имейл',
      role: 'Роля',
      buildings: 'Сгради',
      scanner: '📋 Сканер',
      spareParts: '📦 Резервни части',
      logout: 'Излез',
      errorNoTechnicianId: 'Грешка: Няма намерен код',
      permissions: 'Разрешения',
      canRestock: 'Може да пополнява',
      canEdit: 'Може да редактира',
      canApprove: 'Може да одобрява'
    }
  };

  const lang = language === 'bg' ? 'bg' : 'en';
  const txt = translations[lang];

  const handleLoginSuccess = async (technician) => {
    console.log('[RFIDLoginPage] Login successful:', technician);
    
    // Update role context
    if (roleContext) {
      roleContext.setRole(technician.role);
      roleContext.setPermissions(technician.permissions || []);
      if (technician.assigned_buildings) {
        roleContext.setAssignedBuildings(
          Array.isArray(technician.assigned_buildings) 
            ? technician.assigned_buildings 
            : [technician.assigned_buildings]
        );
      }
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
      
      // Reset role context
      if (roleContext) {
        roleContext.setRole(null);
        roleContext.setPermissions([]);
        roleContext.setAssignedBuildings([]);
        roleContext.setUserProfile(null);
      }
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

  const roleInfo = technicianInfo?.role ? getRoleDisplayInfo(technicianInfo.role.name) : null;
  const buildings = Array.isArray(technicianInfo?.assigned_buildings) 
    ? technicianInfo.assigned_buildings.join(', ') 
    : (technicianInfo?.assigned_buildings || 'N/A');

  // After login: Show Scanner and SpareParts tabs with role-based features
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
        {/* Session Info Card */}
        <Card className={`mb-6 border-l-4 ${
          roleInfo?.bg.includes('blue') ? 'border-blue-600 bg-blue-50' :
          roleInfo?.bg.includes('purple') ? 'border-purple-600 bg-purple-50' :
          roleInfo?.bg.includes('orange') ? 'border-orange-600 bg-orange-50' :
          roleInfo?.bg.includes('red') ? 'border-red-600 bg-red-50' :
          roleInfo?.bg.includes('green') ? 'border-green-600 bg-green-50' :
          'border-slate-600 bg-slate-50'
        }`}>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Main Info Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {roleInfo && (
                    <div className="text-2xl">{roleInfo.icon}</div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {txt.sessionActive} • {technicianInfo?.name}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {txt.role}: <span className="font-medium">{technicianInfo?.role?.name}</span>
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {txt.logout}
                </Button>
              </div>

              {/* Details Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-slate-600 font-medium">{txt.email}</p>
                  <p className="text-slate-900 font-mono">{technicianInfo?.email}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium">{txt.buildings}</p>
                  <p className="text-slate-900">{buildings}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium">{txt.canRestock}</p>
                  <p className="text-slate-900">
                    {technicianInfo?.role?.can_restock ? '✅ Yes' : '❌ No'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium">{txt.canEdit}</p>
                  <p className="text-slate-900">
                    {technicianInfo?.role?.can_edit_inventory ? '✅ Yes' : '❌ No'}
                  </p>
                </div>
              </div>

              {/* Permissions Display */}
              {technicianInfo?.permissions && technicianInfo.permissions.length > 0 && (
                <div className="pt-2 border-t border-slate-300/50">
                  <p className="text-xs font-semibold text-slate-700 mb-1.5">{txt.permissions}:</p>
                  <div className="flex flex-wrap gap-1">
                    {technicianInfo.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="inline-block px-2 py-1 bg-white/60 border border-slate-300 rounded text-xs font-mono text-slate-700"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-200">
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
                userId={technicianInfo?.id}
                userRole={technicianInfo?.role}
                userPermissions={technicianInfo?.permissions || []}
                building={buildings}
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
                userId={technicianInfo?.id}
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
