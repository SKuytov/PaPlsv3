import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Import all dashboard components
import ExecutiveOverview from './ExecutiveOverview';
import CEODashboard from './CEODashboard';
import BuildingTechDashboard from './BuildingTechDashboard';
import TechnicalDashboard from './TechnicalDashboard';

const DashboardRouter = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Get user role from auth metadata or local storage
    const role = user?.user_metadata?.role || localStorage.getItem('userRole');
    setUserRole(role);
    setLoading(false);
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  // Route to appropriate dashboard based on role
  const renderDashboard = () => {
    if (!userRole) {
      return (
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-600 mb-2">No role assigned</p>
            <p className="text-sm text-slate-500">Please contact administrator</p>
          </div>
        </div>
      );
    }

    // Executive roles - Full overview dashboards
    if (['CEO', 'God Admin', 'Technical Director'].includes(userRole)) {
      return <ExecutiveOverview />;
    }

    // Head Technician - Executive focused but with operations
    if (userRole === 'Head Technician') {
      return <CEODashboard />;
    }

    // Building Technicians - Building-specific dashboard
    if (
      userRole.includes('Building') &&
      userRole.includes('Technician')
    ) {
      return <BuildingTechDashboard />;
    }

    // Maintenance Organizer - Technical dashboard with focus on orders and inventory
    if (userRole === 'Maintenance Organizer') {
      return <TechnicalDashboard />;
    }

    // Default fallback
    return <BuildingTechDashboard />;
  };

  return renderDashboard();
};

export default DashboardRouter;
