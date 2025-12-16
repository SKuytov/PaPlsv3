import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Sidebar from '@/components/layout/Sidebar';
import TopNavigation from '@/components/layout/TopNavigation';
import LoadingScreen from '@/components/LoadingScreen';
import Dashboard from '@/pages/Dashboard';
import ExecutiveOverview from '@/components/dashboards/ExecutiveOverview';
import SpareParts from '@/components/modules/SpareParts';
import Machines from '@/components/modules/Machines';
import MachinesCatalogPage from '@/pages/machines/MachinesCatalog';
import Suppliers from '@/components/modules/Suppliers';
import Orders from '@/components/modules/Orders';
import Reports from '@/components/modules/Reports';
import Documentation from '@/components/modules/Documentation';
import Downtime from '@/components/modules/Downtime';
import Scanner from '@/components/modules/Scanner';
import SupplierSavings from '@/components/modules/SupplierSavings';
import QuotesDashboard from '@/components/modules/quotes/QuotesDashboard';
import WelcomeMessage from '@/components/WelcomeMessage';
import EnhancedMachineCatalogueUI from '@/components/EnhancedMachineCatalogueUI';

// Layout Wrapper Component
const PrivateRoute = ({ children }) => {
  const { user, loading, userRole } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        mobileOpen={mobileSidebarOpen} 
        setMobileOpen={setMobileSidebarOpen} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavigation 
          onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          userName={user.user_metadata?.full_name || user.email?.split('@')[0]}
          userRole={userRole?.name || 'User'}
        />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 relative scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">
            <WelcomeMessage />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const AppRouter = () => {
  const { userRole } = useAuth();
  
  // Helper to determine which dashboard to show at root
  const HomeDashboard = () => {
    if (userRole?.name === 'God Admin') {
      return <ExecutiveOverview />;
    }
    return <Dashboard />;
  };

  return (
<Route path="/machinery" element={
  <PrivateRoute>
    <EnhancedMachineCatalogueUI />
  </PrivateRoute>
} />
    
    <Routes>
      <Route path="/login" element={<LoginPage />} />
   
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <HomeDashboard />
        </PrivateRoute>
      } />
      
      {/* Explicit route for the executive dashboard if needed directly */}
      <Route path="/executive" element={
        <PrivateRoute>
           <ExecutiveOverview />
        </PrivateRoute>
      } />
      
      <Route path="/parts" element={
        <PrivateRoute>
          <SpareParts />
        </PrivateRoute>
      } />

      <Route path="/machines" element={
        <PrivateRoute>
          <Machines />
        </PrivateRoute>
      } />

      <Route path="/catalogue" element={
        <PrivateRoute>
          <MachinesCatalogPage />
        </PrivateRoute>
      } />

      <Route path="/suppliers" element={
        <PrivateRoute>
          <Suppliers />
        </PrivateRoute>
      } />

      <Route path="/savings" element={
        <PrivateRoute>
          <SupplierSavings />
        </PrivateRoute>
      } />

      <Route path="/orders" element={
        <PrivateRoute>
          <Orders />
        </PrivateRoute>
      } />

      <Route path="/quotes/dashboard" element={
        <PrivateRoute>
          <QuotesDashboard />
        </PrivateRoute>
      } />

      <Route path="/reports" element={
        <PrivateRoute>
          <Reports />
        </PrivateRoute>
      } />
      
      <Route path="/downtime" element={
        <PrivateRoute>
          <Downtime />
        </PrivateRoute>
      } />

      <Route path="/docs" element={
        <PrivateRoute>
          <Documentation />
        </PrivateRoute>
      } />
      
      <Route path="/scanner" element={
        <PrivateRoute>
          <Scanner />
        </PrivateRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
