import React, { useState, useEffect } from 'react';
import { useRequestsApi } from '@/hooks/useRequestsApi';
import { RequestDetailsModal } from './RequestDetailsModal';
import { QuoteManagementPanel } from './QuoteManagementPanel';
import { OrderTrackingPanel } from './OrderTrackingPanel';
import { InvoiceChecklistWidget } from './InvoiceChecklistWidget';
import './MaintenanceOrgDashboardStyles.css';

/**
 * MaintenanceOrgDashboard Component
 * 
 * Complete procurement workflow management:
 * - Review BUILDING_APPROVED requests
 * - Create supplier quote requests
 * - Process received quotes
 * - Place purchase orders
 * - Track delivery status
 * - Manage invoice documentation
 * - Send to accounting
 */
export const MaintenanceOrgDashboard = ({ userInfo }) => {
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('quotes'); // quotes, orders, received, accounting
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { getPendingApprovals, getRequestDetails } = useRequestsApi();

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (activeTab === 'quotes') {
        // Get BUILDING_APPROVED requests (ready for quotes)
        response = await fetch('/api/requests?status=BUILDING_APPROVED');
      } else if (activeTab === 'orders') {
        // Get QUOTE_PROCESSED requests (ready for orders)
        response = await fetch('/api/requests?status=TECH_APPROVED');
      } else if (activeTab === 'received') {
        // Get orders awaiting invoice checklist
        response = await fetch('/api/requests?status=ITEMS_RECEIVED');
      } else if (activeTab === 'accounting') {
        // Get DOCUMENTATION_COMPLETE requests
        response = await fetch('/api/requests?status=DOCUMENTATION_COMPLETE');
      }

      const data = await response.json();
      setRequests(data?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = async (request) => {
    try {
      const fullRequest = await getRequestDetails(request.id);
      setSelectedRequest(fullRequest?.data || request);
    } catch (err) {
      setError('Failed to load request details');
    }
  };

  const handleRefresh = () => {
    loadRequests();
  };

  return (
    <div className="dashboard maintenance-org-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>👨‍💼 Maintenance Organizer Dashboard</h1>
        <p>Manage supplier quotes, orders, and documentation</p>
      </div>

      {/* Tabs Navigation */}
      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'quotes' ? 'active' : ''}`}
          onClick={() => setActiveTab('quotes')}
        >
          📨 Pending Quotes
          <span className="badge">{requests.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📦 Active Orders
          <span className="badge">{requests.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          ✅ Items Received
          <span className="badge">{requests.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'accounting' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounting')}
        >
          💰 Ready for Accounting
          <span className="badge">{requests.length}</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
          <button onClick={handleRefresh} className="btn btn-sm">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading requests...</p>
        </div>
      )}

      {/* Requests List */}
      {!loading && (
        <div className="requests-container">
          {requests.length === 0 ? (
            <div className="empty-state">
              <p>No requests in this stage</p>
              <small>Check back later for new requests</small>
            </div>
          ) : (
            <div className="requests-grid">
              {requests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="card-header">
                    <span className="request-number">{request.request_number}</span>
                    <span className="status-badge">{request.status}</span>
                  </div>

                  <div className="card-body">
                    <div className="card-row">
                      <span className="label">Building:</span>
                      <span className="value">{request.building}</span>
                    </div>
                    <div className="card-row">
                      <span className="label">Items:</span>
                      <span className="value">{request.items?.length || 0}</span>
                    </div>
                    <div className="card-row">
                      <span className="label">Budget:</span>
                      <span className="value strong">${request.total_amount?.toLocaleString()}</span>
                    </div>
                    {activeTab === 'quotes' && (
                      <div className="card-action">
                        <button
                          className="btn btn-primary"
                          onClick={() => handleViewRequest(request)}
                        >
                          📨 Create Quote Request
                        </button>
                      </div>
                    )}
                    {activeTab === 'orders' && (
                      <div className="card-action">
                        <button
                          className="btn btn-primary"
                          onClick={() => handleViewRequest(request)}
                        >
                          💳 Place Purchase Order
                        </button>
                      </div>
                    )}
                    {activeTab === 'received' && (
                      <div className="card-action">
                        <button
                          className="btn btn-primary"
                          onClick={() => handleViewRequest(request)}
                        >
                          📄 Complete Checklist
                        </button>
                      </div>
                    )}
                    {activeTab === 'accounting' && (
                      <div className="card-action">
                        <button
                          className="btn btn-success"
                          onClick={() => handleViewRequest(request)}
                        >
                          📤 Send to Accounting
                        </button>
                      </div>
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
          onClose={() => setSelectedRequest(null)}
          showApprovalPanel={false}
        />
      )}
    </div>
  );
};

export default MaintenanceOrgDashboard;