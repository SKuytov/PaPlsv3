import React, { useState, useEffect } from 'react';
import { useRequestsApi } from '@/hooks/useRequestsApi';
import { RequestDetailsModal } from './RequestDetailsModal';
import './AdminDashboardStyles.css';

/**
 * AdminDashboard Component
 * 
 * God Admin level interface:
 * - Final execution authority (Level 4)
 * - System-wide request monitoring
 * - Budget and approval analytics
 * - User and role management
 * - System health and statistics
 */
export const AdminDashboard = ({ userInfo }) => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [systemStats, setSystemStats] = useState({
    totalRequests: 0,
    totalBudget: 0,
    executed: 0,
    pending: 0,
    rejected: 0,
    averageProcessTime: 0
  });

  const { getPendingApprovals, getRequestDetails } = useRequestsApi();

  useEffect(() => {
    loadSystemData();
  }, [activeTab]);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (activeTab === 'pending') {
        response = await getPendingApprovals('admin');
      } else if (activeTab === 'all') {
        response = await fetch('/api/requests?status=DIRECTOR_APPROVED');
      } else {
        response = await fetch(`/api/requests?status=${activeTab}`);
      }

      const data = await response.json ? await response.json() : { data: response?.data };
      setRequests(data?.data || []);

      // Calculate system statistics
      const allRequestsResponse = await fetch('/api/requests');
      const allRequests = await allRequestsResponse.json();
      const allData = allRequests?.data || [];

      const totalBudget = allData.reduce((sum, req) => sum + (req.total_amount || 0), 0);
      const executed = allData.filter(req => req.status === 'EXECUTED').length;
      const rejected = allData.filter(req => req.status === 'REJECTED').length;
      const pending = allData.filter(req => ['SUBMITTED', 'BUILDING_APPROVED', 'MAINTENANCE_APPROVED', 'DIRECTOR_APPROVED'].includes(req.status)).length;

      setSystemStats({
        totalRequests: allData.length,
        totalBudget: totalBudget,
        executed: executed,
        pending: pending,
        rejected: rejected,
        averageProcessTime: allData.length > 0 ? Math.round(Math.random() * 10 + 3) : 0 // Placeholder
      });
    } catch (err) {
      setError(err.message || 'Failed to load system data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (request) => {
    try {
      const fullRequest = await getRequestDetails(request.id);
      setSelectedRequest(fullRequest?.data || request);
    } catch (err) {
      setError('Failed to load request details');
    }
  };

  const handleExecuteRequest = async (requestId) => {
    try {
      // Execute request and move to final EXECUTED status
      await fetch(`/api/requests/${requestId}/execute`, { method: 'POST' });
      loadSystemData();
      setSelectedRequest(null);
    } catch (err) {
      setError('Failed to execute request');
    }
  };

  return (
    <div className="dashboard admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>🔐 God Admin Dashboard</h1>
        <p>Complete system oversight and final execution authority</p>
      </div>

      {/* System Statistics */}
      <div className="system-stats">
        <div className="stat-card primary">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-label">Total Requests</div>
            <div className="stat-value">{systemStats.totalRequests}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Total Budget</div>
            <div className="stat-value">${systemStats.totalBudget.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Executed</div>
            <div className="stat-value">{systemStats.executed}</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">🔗</div>
          <div className="stat-content">
            <div className="stat-label">Pending Execution</div>
            <div className="stat-value">{systemStats.pending}</div>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-label">Rejected</div>
            <div className="stat-value">{systemStats.rejected}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-label">Avg Process Time</div>
            <div className="stat-value">{systemStats.averageProcessTime} days</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          🔗 Pending Execution ({systemStats.pending})
        </button>
        <button
          className={`admin-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📋 All Requests
        </button>
        <button
          className={`admin-tab ${activeTab === 'EXECUTED' ? 'active' : ''}`}
          onClick={() => setActiveTab('EXECUTED')}
        >
          ✅ Completed
        </button>
        <button
          className={`admin-tab ${activeTab === 'REJECTED' ? 'active' : ''}`}
          onClick={() => setActiveTab('REJECTED')}
        >
          ❌ Rejected
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
          <button onClick={loadSystemData} className="btn btn-sm">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading data...</p>
        </div>
      )}

      {/* Requests Grid */}
      {!loading && (
        <div className="requests-container">
          {requests.length === 0 ? (
            <div className="empty-state">
              <p>✅ No requests in this category</p>
              <small>Check another tab</small>
            </div>
          ) : (
            <div className="admin-grid">
              {requests.map((request) => (
                <div key={request.id} className="admin-card">
                  <div className="card-header">
                    <span className="request-id">{request.request_number}</span>
                    <span className="status-indicator" data-status={request.status}>
                      {request.status}
                    </span>
                  </div>

                  <div className="card-body">
                    <div className="card-row">
                      <span className="label">Building:</span>
                      <span className="value">{request.building}</span>
                    </div>
                    <div className="card-row">
                      <span className="label">Submitted by:</span>
                      <span className="value">{request.submitter_email}</span>
                    </div>
                    <div className="card-row">
                      <span className="label">Priority:</span>
                      <span className="priority-badge" data-priority={request.priority}>
                        {request.priority}
                      </span>
                    </div>
                    <div className="card-row">
                      <span className="label">Items:</span>
                      <span className="value">{request.items?.length || 0}</span>
                    </div>
                    <div className="card-row highlight">
                      <span className="label">Amount:</span>
                      <span className="value strong">${request.total_amount?.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="card-footer">
                    {activeTab === 'pending' && request.status === 'DIRECTOR_APPROVED' && (
                      <button
                        className="btn btn-success"
                        onClick={() => handleViewDetails(request)}
                      >
                        👁️ Review & Execute
                      </button>
                    )}
                    {activeTab !== 'pending' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleViewDetails(request)}
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          userRole="admin"
          approvalLevel="EXECUTED"
          onClose={() => setSelectedRequest(null)}
          onApprovalComplete={() => {
            setSelectedRequest(null);
            loadSystemData();
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;