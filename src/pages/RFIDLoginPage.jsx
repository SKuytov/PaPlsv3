import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RFIDLogin from '@/components/auth/RFIDLogin';
import MaintenanceScanner from '@/components/modules/MaintenanceScanner';
import MaintenanceSpareParts from '@/components/modules/MaintenanceSpareParts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const RFIDLoginPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [technicianInfo, setTechnicianInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('scanner');

  const handleLoginSuccess = async (technician) => {
    console.log('[RFIDLoginPage] Login successful:', technician);
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

  // After login: Show Scanner and SpareParts tabs
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Session Info */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-900 font-medium">
                Technician Session Active
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Name: {technicianInfo?.name} | Card: {technicianInfo?.rfid_card_id}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="scanner" className="text-base font-semibold">
              📋 Scanner
            </TabsTrigger>
            <TabsTrigger value="parts" className="text-base font-semibold">
              📦 Spare Parts
            </TabsTrigger>
          </TabsList>

          {/* Scanner Tab */}
          <TabsContent value="scanner" className="mt-0">
            <MaintenanceScanner 
              onLogout={handleLogout}
              technicianName={technicianInfo?.name}
              technicianId={technicianInfo?.id}
            />
          </TabsContent>

          {/* Spare Parts Tab */}
          <TabsContent value="parts" className="mt-0">
            <MaintenanceSpareParts 
              onLogout={handleLogout}
              technicianName={technicianInfo?.name}
              technicianId={technicianInfo?.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RFIDLoginPage;