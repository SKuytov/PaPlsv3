import React, { useState } from 'react';
import { RequestApprovalPanel } from './RequestApprovalPanel';
import './ModalStyles.css';

/**
 * RequestDetailsModal Component
 * 
 * Full view of request with all details:
 * - Request information
 * - Items list
 * - Budget breakdown
 * - Activity history
 * - Approval interface (if user has permission)
 */
export const RequestDetailsModal = ({
  request,
  userRole,
  approvalLevel,
  onClose,
  onApprovalComplete,
  showApprovalPanel = true
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [quoteInfo, setQuoteInfo] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);

  if (!request) return null;

  const statusColors = {
    DRAFT: '#gray',
    SUBMITTED: '#blue',
    BUILDING_APPROVED: '#green',
    QUOTE_PROCESSED: '#purple',
    TECH_APPROVED: '#teal',
    ORDER_PLACED: '#orange',
    ITEMS_RECEIVED: '#cyan',
    DOCUMENTATION_COMPLETE: '#lime',
    EXECUTED: '#green'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content request-details-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-content">
            <h2>{request.request_number}</h2>
            <span className="status-badge" style={{ backgroundColor: statusColors[request.status] }}>
              {request.status}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`tab ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Items ({request.items?.length || 0})
          </button>
          {request.quote && (
            <button
              className={`tab ${activeTab === 'quote' ? 'active' : ''}`}
              onClick={() => setActiveTab('quote')}
            >
              Quote
            </button>
          )}
          <button
            className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="tab-content details-tab">
              <div className="section">
                <h3>Request Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Building</label>
                    <span>{request.building}</span>
                  </div>
                  <div className="info-item">
                    <label>Priority</label>
                    <span className="priority-badge" data-priority={request.priority}>
                      {request.priority}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Submitted By</label>
                    <span>{request.submitter_email}</span>
                  </div>
                  <div className="info-item">
                    <label>Status</label>
                    <span>{request.status}</span>
                  </div>
                  <div className="info-item">
                    <label>Created</label>
                    <span>{new Date(request.created_at).toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <label>Last Updated</label>
                    <span>{new Date(request.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3>Description</h3>
                <p className="description">{request.description || 'No description provided'}</p>
              </div>

              <div className="section">
                <h3>Budget Summary</h3>
                <div className="budget-summary">
                  <div className="budget-item">
                    <span>Total Items:</span>
                    <span className="value">{request.items?.length || 0}</span>
                  </div>
                  <div className="budget-item">
                    <span>Total Amount:</span>
                    <span className="value strong">${request.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Items Tab */}
          {activeTab === 'items' && (
            <div className="tab-content items-tab">
              <div className="items-list">
                {request.items && request.items.length > 0 ? (
                  request.items.map((item, index) => (
                    <div key={item.id || index} className="item-card">
                      <div className="item-header">
                        <span className="item-number">Item {index + 1}</span>
                        {item.price && (
                          <span className="item-price">${item.price.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="item-details">
                        <p className="item-description">{item.description}</p>
                        <div className="item-meta">
                          {item.quantity && (
                            <span className="meta-item">Qty: {item.quantity}</span>
                          )}
                          {item.unit && (
                            <span className="meta-item">Unit: {item.unit}</span>
                          )}
                          {item.price && item.quantity && (
                            <span className="meta-item">
                              Total: ${(item.price * item.quantity).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty">No items in this request</p>
                )}
              </div>
            </div>
          )}

          {/* Quote Tab */}
          {activeTab === 'quote' && request.quote && (
            <div className="tab-content quote-tab">
              <div className="section">
                <h3>Supplier Quote</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Supplier</label>
                    <span>{request.quote.supplier_name}</span>
                  </div>
                  <div className="info-item">
                    <label>Quote Total</label>
                    <span className="strong">${request.quote.total_amount?.toLocaleString()}</span>
                  </div>
                  {request.quote.quote_pdf_url && (
                    <div className="info-item full-width">
                      <a href={request.quote.quote_pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        📄 Download Quote PDF
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="tab-content activity-tab">
              <div className="activity-timeline">
                {request.activity && request.activity.length > 0 ? (
                  request.activity.map((activity, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-marker"></div>
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className="activity-action">{activity.action}</span>
                          <span className="activity-time">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="activity-actor">By: {activity.actor_email}</p>
                        {activity.notes && (
                          <p className="activity-notes">{activity.notes}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty">No activity recorded</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Approval Panel */}
        {showApprovalPanel && userRole && approvalLevel && (
          <div className="modal-footer">
            <RequestApprovalPanel
              request={request}
              userRole={userRole}
              approvalLevel={approvalLevel}
              onApprovalComplete={onApprovalComplete}
              onClose={onClose}
            />
          </div>
        )}

        {/* Close Button */}
        {!showApprovalPanel && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestDetailsModal;