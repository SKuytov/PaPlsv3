import React, { useState, useEffect } from 'react';
import { useRequestsApi } from '@/hooks/useRequestsApi';
import { RequestDetailsModal } from './RequestDetailsModal';
import { RequestApprovalPanel } from './RequestApprovalPanel';
import './DashboardStyles.css';

/**
 * BuildingTechDashboard Component
 * 
 * Displays requests pending Building Tech approval (Level 1)
 * - View pending approvals
 * - Review request details
 * - Approve or reject with comments
 * - See approval history
 */
export const BuildingTechDashboard = ({ userInfo }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('SUBMITTED');
  
  const { getPendingApprovals, getRequestDetails } = useRequestsApi();

  // Fetch pending approvals on component mount
  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all requests waiting for Building Tech approval
      const response = await getPendingApprovals('building_tech');
      setPendingRequests(response?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending requests');
      console.error('Error loading pending requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (request) => {
    try {
      // Get full request details including items
      const fullRequest = await getRequestDetails(request.id);
      setSelectedRequest(fullRequest?.data || request);
    } catch (err) {
      setError('Failed to load request details');
      console.error('Error loading details:', err);
    }
  };

  const handleApprovalComplete = () => {
    setSelectedRequest(null);
    loadPendingRequests(); // Refresh list
  };

  return (
    <div className="dashboard building-tech-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>👷 Building Technician Dashboard</h1>
        <p>Review and approve item requests (Level 1 Approval)</p>
      </div>

      {/* Statistics Bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-number">{pendingRequests.length}</div>
          <div className="stat-label">Pending Approvals</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {pendingRequests.reduce((sum, req) => sum + (req.total_amount || 0), 0).toLocaleString()}
          </div>
          <div className="stat-label">Total Budget</div>
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
            <div className="requests-grid">
              {pendingRequests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="card-header">
                    <span className="request-number">{request.request_number}</span>
                    <span className="priority-badge" data-priority={request.priority}>
                      {request.priority}
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
                      <span className="label">Items:</span>
                      <span className="value">{request.items?.length || 0}</span>
                    </div>
                    <div className="card-row">
                      <span className="label">Budget:</span>
                      <span className="value strong">${request.total_amount?.toLocaleString()}</span>
                    </div>
                    <div className="card-row">
                      <span className="label">Submitted:</span>
                      <span className="value">
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="card-footer">
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
          userRole="building_tech"
          approvalLevel="BUILDING_APPROVED"
          onClose={() => setSelectedRequest(null)}
          onApprovalComplete={handleApprovalComplete}
        />
      )}
    </div>
  );
};

export default BuildingTechDashboard;