import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BuildingTechDashboard } from './BuildingTechDashboard';
import { MaintenanceOrgDashboard } from './MaintenanceOrgDashboard';
import { TechDirectorDashboard } from './TechDirectorDashboard';
import { AccountantDashboard } from './AccountantDashboard';
import { AdminDashboard } from './AdminDashboard';
import './MainAppStyles.css';

/**
 * MainApp Component
 * 
 * Main application interface with role-based routing:
 * - Building Technician Dashboard (Level 1 Approvals)
 * - Maintenance Organizer Dashboard (Quotes, Orders, Invoices)
 * - Tech Director Dashboard (Level 3 Approvals)
 * - Accountant Dashboard (Payment Processing)
 * - Admin Dashboard (Level 4 Execution & System Oversight)
 */
export const MainApp = ({ userInfo }) => {
  const navigate = useNavigate();
  const [currentDashboard, setCurrentDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  // User role and permission mapping
  const rolePermissions = {
    building_tech: {
      label: 'Building Technician',
      icon: '👷',
      component: BuildingTechDashboard,
      approvalLevel: 'L1',
      color: '#3498db'
    },
    maintenance_org: {
      label: 'Maintenance Organizer',
      icon: '👨‍💼',
      component: MaintenanceOrgDashboard,
      approvalLevel: 'L2',
      color: '#2ecc71'
    },
    tech_director: {
      label: 'Technical Director',
      icon: '🎨',
      component: TechDirectorDashboard,
      approvalLevel: 'L3',
      color: '#e74c3c'
    },
    accountant: {
      label: 'Accountant',
      icon: '💰',
      component: AccountantDashboard,
      approvalLevel: 'Finance',
      color: '#f39c12'
    },
    god_admin: {
      label: 'God Admin',
      icon: '🔐',
      component: AdminDashboard,
      approvalLevel: 'L4',
      color: '#9b59b6'
    }
  };

  // Get user's role from their profile
  const getUserRole = () => {
    if (!userInfo) return null;
    
    // Check user's highest role
    if (userInfo.role === 'god_admin') return 'god_admin';
    if (userInfo.role === 'accountant') return 'accountant';
    if (userInfo.role === 'tech_director') return 'tech_director';
    if (userInfo.role === 'maintenance_org') return 'maintenance_org';
    if (userInfo.role === 'building_tech') return 'building_tech';
    
    return null;
  };

  useEffect(() => {
    setLoading(false);
    const role = getUserRole();
    if (role) {
      setCurrentDashboard(role);
    }
  }, [userInfo]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!currentDashboard) {
    return (
      <div className="error-container">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this dashboard.</p>
        <button onClick={() => navigate('/login')} className="btn btn-primary">
          Back to Login
        </button>
      </div>
    );
  }

  const roleInfo = rolePermissions[currentDashboard];
  const DashboardComponent = roleInfo.component;

  return (
    <div className="main-app">
      {/* User Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="app-title">🏢 PartPulse Procurement System</h1>
            <p className="app-subtitle">Complete Request & Approval Management</p>
          </div>
          <div className="user-section">
            <div className="user-badge" style={{ backgroundColor: roleInfo.color }}>
              <span className="role-icon">{roleInfo.icon}</span>
              <div className="user-info">
                <div className="user-name">{userInfo?.name || 'User'}</div>
                <div className="user-role">{roleInfo.label}</div>
                <div className="approval-level">Level {roleInfo.approvalLevel}</div>
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/login')}
              title="Logout"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      {/* Approval Flow Indicator */}
      <div className="approval-flow-indicator">
        <div className="flow-step completed">
          <span className="step-icon">👨‍💻</span>
          <span className="step-label">Technician Creates</span>
        </div>
        <div className="flow-arrow">→</div>
        <div className={`flow-step ${currentDashboard === 'building_tech' ? 'current' : 'completed'}`}>
          <span className="step-icon">👷</span>
          <span className="step-label">Level 1: Building Tech</span>
        </div>
        <div className="flow-arrow">→</div>
        <div className={`flow-step ${currentDashboard === 'maintenance_org' ? 'current' : ''}`}>
          <span className="step-icon">👨‍💼</span>
          <span className="step-label">Level 2: Maintenance</span>
        </div>
        <div className="flow-arrow">→</div>
        <div className={`flow-step ${currentDashboard === 'tech_director' ? 'current' : ''}`}>
          <span className="step-icon">🎨</span>
          <span className="step-label">Level 3: Director</span>
        </div>
        <div className="flow-arrow">→</div>
        <div className={`flow-step ${currentDashboard === 'god_admin' ? 'current' : ''}`}>
          <span className="step-icon">🔐</span>
          <span className="step-label">Level 4: Admin Execute</span>
        </div>
        <div className="flow-arrow">→</div>
        <div className={`flow-step ${currentDashboard === 'accountant' ? 'current' : ''}`}>
          <span className="step-icon">💰</span>
          <span className="step-label">Finance: Payment</span>
        </div>
      </div>

      {/* Dashboard Content */}
      <main className="app-main">
        <DashboardComponent userInfo={userInfo} />
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>© 2026 PartPulse - Procurement Management System</p>
          <div className="footer-links">
            <a href="#help">Help</a>
            <a href="#docs">Documentation</a>
            <a href="#support">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainApp;