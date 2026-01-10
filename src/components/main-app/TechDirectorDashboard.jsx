import React, { useState, useEffect } from 'react';
import { useRequestsApi } from '@/hooks/useRequestsApi';
import { RequestDetailsModal } from './RequestDetailsModal';
import './TechDirectorDashboardStyles.css';

/**
 * TechDirectorDashboard Component
 * 
 * Tech Director level approvals (Level 3):
 * - Review MAINTENANCE_APPROVED requests
 * - Final budget and technical approval
 * - Send to Admin for execution
 * - Monitor all requests
 */
export const TechDirectorDashboard = ({ userInfo }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [stats, setStats] = useState({
    pending: 0,
    totalBudget: 0,
    approved: 0,
    rejected: 0
  });

  const { getPendingApprovals, getRequestDetails } = useRequestsApi();

  useEffect(() => {
    loadPendingRequests();
  }, [filterPriority]);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getPendingApprovals('tech_director');
      let requests = response?.data || [];

      if (filterPriority !== 'ALL') {
        requests = requests.filter(r => r.priority === filterPriority);
      }

      setPendingRequests(requests);

      // Calculate stats
      const totalBudget = requests.reduce((sum, req) => sum + (req.total_amount || 0), 0);
      setStats({
        pending: requests.length,
        totalBudget: totalBudget,
        approved: 0,
        rejected: 0
      });
    } catch (err) {
      setError(err.message || 'Failed to load pending requests');
      console.error('Error loading requests:', err);
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

  const handleApprovalComplete = () => {
    setSelectedRequest(null);
    loadPendingRequests();
  };

  const priorityColors = {
    LOW: '#green',
    MEDIUM: '#blue',
    HIGH: '#orange',
    URGENT: '#red'
  };

  return (
    <div className="dashboard tech-director-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>🎨 Technical Director Dashboard</h1>
        <p>Final approval authority for all requests (Level 3)</p>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">Pending Approvals</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-number">${stats.totalBudget.toLocaleString()}</div>
            <div className="stat-label">Total Budget</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.approved}</div>
            <div className="stat-label">Approved This Month</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-number">{stats.rejected}</div>
            <div className="stat-label">Rejected This Month</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <label>Filter by Priority:</label>
        <div className="filter-buttons">
          {['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((priority) => (
            <button
              key={priority}
              className={`filter-btn ${filterPriority === priority ? 'active' : ''}`}
              onClick={() => setFilterPriority(priority)}
            >
              {priority}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
          <button onClick={loadPendingRequests} className="btn btn-sm">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading pending requests...</p>
        </div>
      )}

      {/* Requests List */}
      {!loading && (
        <div className="requests-container">
          {pendingRequests.length === 0 ? (
            <div className="empty-state">
              <p>✅ No pending approvals</p>
              <small>All requests have been reviewed</small>
            </div>
          ) : (
            <div className="requests-list">
              {pendingRequests.map((request) => (
                <div key={request.id} className="request-item">
                  <div className="item-header">
                    <span className="request-number">{request.request_number}</span>
                    <span className="status">{request.status}</span>
                  </div>

                  <div className="item-details">
                    <div className="detail-row">
                      <span className="label">Building:</span>
                      <span className="value">{request.building}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Items:</span>
                      <span className="value">{request.items?.length || 0}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Budget:</span>
                      <span className="value strong">${request.total_amount?.toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Priority:</span>
                      <span className="priority-badge" style={{ backgroundColor: priorityColors[request.priority] }}>
                        {request.priority}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Submitted by:</span>
                      <span className="value">{request.submitter_email}</span>
                    </div>
                  </div>

                  <div className="item-footer">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleViewDetails(request)}
                    >
                      👁️ Review & Approve
                    </button>
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
          userRole="tech_director"
          approvalLevel="DIRECTOR_APPROVED"
          onClose={() => setSelectedRequest(null)}
          onApprovalComplete={handleApprovalComplete}
        />
      )}
    </div>
  );
};

export default TechDirectorDashboard;