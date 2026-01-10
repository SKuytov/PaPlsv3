import React, { useState, useEffect } from 'react';
import { useRequestsApi } from '@/hooks/useRequestsApi';
import { RequestDetailsModal } from './RequestDetailsModal';
import './AccountantDashboardStyles.css';

/**
 * AccountantDashboard Component
 * 
 * Accounting department interface:
 * - View all completed requests
 * - Process invoices for payment
 * - Track expenses and budgets
 * - Generate financial reports
 * - Manage payment approvals
 */
export const AccountantDashboard = ({ userInfo }) => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('DOCUMENTATION_COMPLETE');
  const [paymentStatus, setPaymentStatus] = useState({});
  const [financialSummary, setFinancialSummary] = useState({
    totalAmount: 0,
    pendingPayment: 0,
    paid: 0,
    invoicesProcessed: 0
  });

  const { getRequestDetails } = useRequestsApi();

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load requests ready for accounting
      const response = await fetch(`/api/requests?status=${filterStatus}`);
      const data = await response.json();
      const requestsList = data?.data || [];

      setRequests(requestsList);

      // Calculate financial summary
      const totalAmount = requestsList.reduce((sum, req) => sum + (req.total_amount || 0), 0);
      const paid = requestsList.filter(req => paymentStatus[req.id] === 'PAID').length;
      const pending = requestsList.length - paid;

      setFinancialSummary({
        totalAmount: totalAmount,
        pendingPayment: totalAmount * (pending / requestsList.length || 0),
        paid: totalAmount * (paid / requestsList.length || 0),
        invoicesProcessed: paid
      });
    } catch (err) {
      setError(err.message || 'Failed to load requests');
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

  const handleProcessPayment = async (requestId) => {
    try {
      setPaymentStatus({
        ...paymentStatus,
        [requestId]: 'PAID'
      });
      await loadRequests();
    } catch (err) {
      setError('Failed to process payment');
    }
  };

  return (
    <div className="dashboard accountant-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>💰 Accountant Dashboard</h1>
        <p>Invoice processing and financial management</p>
      </div>

      {/* Financial Summary */}
      <div className="financial-summary">
        <div className="summary-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <div className="card-label">Total Amount</div>
            <div className="card-value">${financialSummary.totalAmount.toLocaleString()}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon">⏳</div>
          <div className="card-content">
            <div className="card-label">Pending Payment</div>
            <div className="card-value">${financialSummary.pendingPayment.toLocaleString()}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <div className="card-label">Paid</div>
            <div className="card-value">${financialSummary.paid.toLocaleString()}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon">📄</div>
          <div className="card-content">
            <div className="card-label">Invoices Processed</div>
            <div className="card-value">{financialSummary.invoicesProcessed}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <label>View:</label>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === 'DOCUMENTATION_COMPLETE' ? 'active' : ''}`}
            onClick={() => setFilterStatus('DOCUMENTATION_COMPLETE')}
          >
            📋 Ready for Payment
          </button>
          <button
            className={`filter-btn ${filterStatus === 'PAID' ? 'active' : ''}`}
            onClick={() => setFilterStatus('PAID')}
          >
            ✅ Payment Processed
          </button>
          <button
            className={`filter-btn ${filterStatus === 'EXECUTED' ? 'active' : ''}`}
            onClick={() => setFilterStatus('EXECUTED')}
          >
            📄 All Executed
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
          <button onClick={loadRequests} className="btn btn-sm">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading invoices...</p>
        </div>
      )}

      {/* Requests List */}
      {!loading && (
        <div className="requests-container">
          {requests.length === 0 ? (
            <div className="empty-state">
              <p>✅ No invoices to process</p>
              <small>Check back later for new invoices</small>
            </div>
          ) : (
            <div className="invoices-table">
              <div className="table-header">
                <div className="col-number">Request #</div>
                <div className="col-building">Building</div>
                <div className="col-amount">Amount</div>
                <div className="col-items">Items</div>
                <div className="col-date">Date</div>
                <div className="col-status">Status</div>
                <div className="col-action">Action</div>
              </div>

              {requests.map((request) => (
                <div key={request.id} className="table-row">
                  <div className="col-number">
                    <span className="request-number">{request.request_number}</span>
                  </div>
                  <div className="col-building">{request.building}</div>
                  <div className="col-amount strong">${request.total_amount?.toLocaleString()}</div>
                  <div className="col-items">{request.items?.length || 0}</div>
                  <div className="col-date">{new Date(request.created_at).toLocaleDateString()}</div>
                  <div className="col-status">
                    <span className="status-badge">
                      {paymentStatus[request.id] === 'PAID' ? '✅ Paid' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="col-action">
                    {paymentStatus[request.id] !== 'PAID' ? (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleProcessPayment(request.id)}
                      >
                        Process Payment
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-secondary"
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
          onClose={() => setSelectedRequest(null)}
          showApprovalPanel={false}
        />
      )}
    </div>
  );
};

export default AccountantDashboard;