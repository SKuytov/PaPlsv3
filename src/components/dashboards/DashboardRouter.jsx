import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Import all dashboard components
import ExecutiveOverview from './ExecutiveOverview';
import CEODashboard from './CEODashboard';
import TechnicianDashboard from './TechnicianDashboard';
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

    // EXECUTIVE DASHBOARDS
    // CEO, God Admin, Technical Director → Full Executive Overview
    if (['CEO', 'God Admin', 'Technical Director'].includes(userRole)) {
      return <ExecutiveOverview />;
    }

    // Head Technician → Executive-focused with operations metrics
    if (userRole === 'Head Technician') {
      return <CEODashboard />;
    }

    // MAINTENANCE ORGANIZER
    // Focus on inventory management and order coordination
    if (userRole === 'Maintenance Organizer') {
      return <TechnicalDashboard />;
    }

    // BUILDING TECHNICIANS
    // All variants: Building 1-5 Technician
    // Shows machines in their assigned building and their tasks
    if (
      userRole.includes('Building') &&
      userRole.includes('Technician')
    ) {
      return <TechnicianDashboard />;
    }

    // Default fallback for any other role
    return <TechnicianDashboard />;
  };

  return renderDashboard();
};

export default DashboardRouter;
