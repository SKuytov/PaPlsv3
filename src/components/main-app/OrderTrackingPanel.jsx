import React, { useState } from 'react';
import './OrderTrackingStyles.css';

/**
 * OrderTrackingPanel Component
 * 
 * Track purchase orders:
 * - Create PO from approved quote
 * - Monitor order status
 * - Track expected delivery
 * - Receive items
 * - Mark as completed
 */
export const OrderTrackingPanel = ({ request, selectedQuote }) => {
  const [orderStatus, setOrderStatus] = useState(request.order_status || 'NOT_PLACED');
  const [trackingNumber, setTrackingNumber] = useState(request.tracking_number || '');
  const [expectedDelivery, setExpectedDelivery] = useState(request.expected_delivery || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const orderStatuses = [
    { value: 'NOT_PLACED', label: '⏳ Order Not Placed', color: '#gray' },
    { value: 'ORDER_PLACED', label: '📦 Order Placed', color: '#blue' },
    { value: 'IN_TRANSIT', label: '🚚 In Transit', color: '#orange' },
    { value: 'OUT_FOR_DELIVERY', label: '🚗 Out for Delivery', color: '#yellow' },
    { value: 'DELIVERED', label: '✅ Delivered', color: '#green' },
  ];

  const currentStatus = orderStatuses.find(s => s.value === orderStatus);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setLoading(true);
      setError(null);
      
      // In production, update to database
      setOrderStatus(newStatus);
    } catch (err) {
      setError('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedQuote) {
      setError('Please select a quote first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // In production, create PO in database
      setOrderStatus('ORDER_PLACED');
    } catch (err) {
      setError('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-tracking-panel">
      <h3>📦 Purchase Order Tracking</h3>

      {/* Error Message */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Order Information */}
      <div className="order-info">
        {selectedQuote && (
          <div className="info-section">
            <h4>Selected Quote</h4>
            <div className="info-grid">
              <div className="info-item">
                <label>Supplier:</label>
                <span>{selectedQuote.supplier_name}</span>
              </div>
              <div className="info-item">
                <label>Quote Amount:</label>
                <span className="amount">${selectedQuote.total_amount?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Status Progress */}
      <div className="status-progress">
        <h4>Order Status</h4>
        <div className="progress-bar">
          {orderStatuses.map((status, index) => (
            <div
              key={status.value}
              className={`progress-item ${orderStatus === status.value ? 'active' : ''} ${orderStatuses.findIndex(s => s.value === orderStatus) >= index ? 'completed' : ''}`}
              style={{ flex: 1 }}
            >
              <span className="status-label">{status.label}</span>
            </div>
          ))}
        </div>
        <div className="current-status">
          <span className="status-badge" style={{ backgroundColor: currentStatus?.color }}>
            {currentStatus?.label}
          </span>
        </div>
      </div>

      {/* Tracking Information */}
      {orderStatus !== 'NOT_PLACED' && (
        <div className="tracking-info">
          <div className="form-group">
            <label>Tracking Number</label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter carrier tracking number"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Expected Delivery Date</label>
            <input
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="order-actions">
        {orderStatus === 'NOT_PLACED' && (
          <button
            className="btn btn-success"
            onClick={handlePlaceOrder}
            disabled={loading || !selectedQuote}
          >
            {loading ? 'Processing...' : '📝 Place Purchase Order'}
          </button>
        )}

        {orderStatus === 'ORDER_PLACED' && (
          <button
            className="btn btn-primary"
            onClick={() => handleStatusUpdate('IN_TRANSIT')}
            disabled={loading}
          >
            {loading ? 'Updating...' : '🚚 Mark as In Transit'}
          </button>
        )}

        {orderStatus === 'IN_TRANSIT' && (
          <button
            className="btn btn-primary"
            onClick={() => handleStatusUpdate('OUT_FOR_DELIVERY')}
            disabled={loading}
          >
            {loading ? 'Updating...' : '🚗 Out for Delivery'}
          </button>
        )}

        {orderStatus === 'OUT_FOR_DELIVERY' && (
          <button
            className="btn btn-success"
            onClick={() => handleStatusUpdate('DELIVERED')}
            disabled={loading}
          >
            {loading ? 'Updating...' : '✅ Mark as Delivered'}
          </button>
        )}
      </div>

      {/* Delivery Timeline */}
      {expectedDelivery && (
        <div className="delivery-timeline">
          <h4>📅 Expected Delivery Timeline</h4>
          <div className="timeline-item">
            <span className="label">Expected Arrival:</span>
            <span className="date">{new Date(expectedDelivery).toLocaleDateString()}</span>
            <span className="days-left">
              {Math.ceil((new Date(expectedDelivery) - new Date()) / (1000 * 60 * 60 * 24))} days from now
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTrackingPanel;