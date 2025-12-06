import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Import all dashboard components
import AdminPanelDashboard from './AdminPanelDashboard';
import StrategicDashboard from './StrategicDashboard';
import ExecutiveOverview from './ExecutiveOverview';
import CEODashboard from './CEODashboard';
import TechnicianDashboard from './TechnicianDashboard';
import TechnicalDashboard from './TechnicalDashboard';

const DashboardRouter = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedDashboard, setSelectedDashboard] = React.useState(null);

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
  // God Admin has access to ALL dashboards through AdminPanelDashboard
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

    // ============================================
    // GOD ADMIN - Access to EVERYTHING
    // ============================================
    // God Admin gets the Admin Panel which allows switching between all dashboards
    if (userRole === 'God Admin') {
      return <AdminPanelDashboard />;
    }

    // ============================================
    // EXECUTIVE DASHBOARDS
    // ============================================

    // CEO → Strategic Dashboard with full analytics
    if (userRole === 'CEO') {
      return <StrategicDashboard />;
    }

    // Technical Director → Strategic Dashboard with full analytics
    if (userRole === 'Technical Director') {
      return <StrategicDashboard />;
    }

    // Head Technician → Operations Dashboard focused on execution
    if (userRole === 'Head Technician') {
      return <CEODashboard />;
    }

    // ============================================
    // MAINTENANCE COORDINATOR
    // ============================================
    if (userRole === 'Maintenance Organizer') {
      return <TechnicalDashboard />;
    }

    // ============================================
    // BUILDING TECHNICIANS
    // ============================================
    // All Building X Technician roles → Building Technician Dashboard
    if (userRole.includes('Building') && userRole.includes('Technician')) {
      return <TechnicianDashboard />;
    }

    // ============================================
    // DEFAULT FALLBACK
    // ============================================
    return <TechnicianDashboard />;
  };

  return renderDashboard();
};

export default DashboardRouter;
