import React, { Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Lazy load dashboard variants to optimize bundle size
const CEODashboard = lazy(() => import('@/components/dashboards/CEODashboard'));
const TechnicalDashboard = lazy(() => import('@/components/dashboards/TechnicalDashboard'));
const BuildingTechDashboard = lazy(() => import('@/components/dashboards/BuildingTechDashboard'));

const Dashboard = () => {
  const { userRole } = useAuth();

  const renderDashboardContent = () => {
    // If role is not yet loaded or available
    if (!userRole) {
       return <BuildingTechDashboard />; // Default fallback
    }

    const roleName = userRole.name || '';

    if (roleName === 'CEO' || roleName === 'God Admin') {
      return <CEODashboard />;
    } else if (roleName === 'Technical Director' || roleName === 'Head Technician') {
      return <TechnicalDashboard />;
    } else {
      return <BuildingTechDashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <Helmet>
        <title>Dashboard - WMS</title>
      </Helmet>
      
      <div className="animate-in fade-in duration-500">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-slate-200 shadow-sm">
             <LoadingSpinner message="Loading dashboard insights..." />
          </div>
        }>
          {renderDashboardContent()}
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;