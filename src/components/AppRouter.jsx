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
import Suppliers from '@/components/modules/Suppliers';
import Orders from '@/components/modules/Orders';
import Reports from '@/components/modules/Reports';
import Documentation from '@/components/modules/Documentation';
import Downtime from '@/components/modules/Downtime';
import Scanner from '@/components/modules/Scanner';
import SupplierSavings from '@/components/modules/SupplierSavings';
import WelcomeMessage from '@/components/WelcomeMessage';

// ✅ IMPORT NEW QUOTE PAGES
import QuotesPage from '@/pages/QuotesPage';

// Layout Wrapper Component
const PrivateRoute = ({ children }) => {
  const { user, loading, userRole } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavigation onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="flex-1 overflow-auto">
          <WelcomeMessage />
          {children}
        </main>
      </div>
    </div>
  );
};

const AppRouter = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Private Routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <ExecutiveOverview />
          </PrivateRoute>
        }
      />

      <Route
        path="/parts"
        element={
          <PrivateRoute>
            <SpareParts />
          </PrivateRoute>
        }
      />

      <Route
        path="/machines"
        element={
          <PrivateRoute>
            <Machines />
          </PrivateRoute>
        }
      />

      <Route
        path="/scanner"
        element={
          <PrivateRoute>
            <Scanner />
          </PrivateRoute>
        }
      />

      {/* ✅ NEW QUOTES ROUTE */}
      <Route
        path="/quotes"
        element={
          <PrivateRoute>
            <QuotesPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/suppliers"
        element={
          <PrivateRoute>
            <Suppliers />
          </PrivateRoute>
        }
      />

      <Route
        path="/orders"
        element={
          <PrivateRoute>
            <Orders />
          </PrivateRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        }
      />

      <Route
        path="/downtime"
        element={
          <PrivateRoute>
            <Downtime />
          </PrivateRoute>
        }
      />

      <Route
        path="/savings"
        element={
          <PrivateRoute>
            <SupplierSavings />
          </PrivateRoute>
        }
      />

      <Route
        path="/docs"
        element={
          <PrivateRoute>
            <Documentation />
          </PrivateRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;