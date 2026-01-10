import React, { useState } from 'react';
import './InvoiceChecklistStyles.css';

/**
 * InvoiceChecklistWidget Component
 * 
 * Complete invoice verification checklist:
 * - Verify items received
 * - Check quantities
 * - Compare invoice to PO
 * - Mark documentation complete
 * - Send to accounting
 */
export const InvoiceChecklistWidget = ({ request }) => {
  const [checklist, setChecklist] = useState(request.invoice_checklist || {
    items_received: false,
    quantities_verified: false,
    invoice_matches_po: false,
    prices_verified: false,
    no_damages: false,
    documentation_complete: false
  });
  const [invoiceFile, setInvoiceFile] = useState(request.invoice_file_url || null);
  const [notes, setNotes] = useState(request.invoice_notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checklistItems = [
    {
      id: 'items_received',
      label: '📦 All Items Received',
      description: 'Verify all items from PO have been received'
    },
    {
      id: 'quantities_verified',
      label: '📊 Quantities Verified',
      description: 'Check quantities match PO'
    },
    {
      id: 'invoice_matches_po',
      label: '📋 Invoice Matches PO',
      description: 'Invoice details match purchase order'
    },
    {
      id: 'prices_verified',
      label: '💰 Prices Verified',
      description: 'Prices on invoice match agreed quote'
    },
    {
      id: 'no_damages',
      label: '✅ No Damages',
      description: 'All items received in good condition'
    },
    {
      id: 'documentation_complete',
      label: '✔️ Documentation Complete',
      description: 'All required documents attached'
    }
  ];

  const handleChecklistChange = (id) => {
    setChecklist({
      ...checklist,
      [id]: !checklist[id]
    });
  };

  const handleSubmitToAccounting = async () => {
    const incompleteItems = checklistItems.filter(item => !checklist[item.id]);
    
    if (incompleteItems.length > 0) {
      setError(`Please complete: ${incompleteItems.map(i => i.label).join(', ')}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // In production, save to database and change status to DOCUMENTATION_COMPLETE
      alert('✅ Checklist submitted! Ready for accounting.');
    } catch (err) {
      setError('Failed to submit checklist');
    } finally {
      setLoading(false);
    }
  };

  const completionPercentage = Object.values(checklist).filter(v => v).length / checklistItems.length * 100;

  return (
    <div className="invoice-checklist-widget">
      <h3>📋 Invoice Verification Checklist</h3>

      {/* Error Message */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Completion Progress */}
      <div className="completion-progress">
        <div className="progress-header">
          <span>Completion Status</span>
          <span className="percentage">{Math.round(completionPercentage)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${completionPercentage}%` }}></div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="checklist-items">
        {checklistItems.map((item) => (
          <div key={item.id} className="checklist-item">
            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                checked={checklist[item.id]}
                onChange={() => handleChecklistChange(item.id)}
                disabled={loading}
              />
              <span className="checkmark"></span>
            </label>
            <div className="item-content">
              <div className="item-label">{item.label}</div>
              <div className="item-description">{item.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Invoice Document */}
      <div className="invoice-section">
        <h4>📄 Invoice Document</h4>
        {invoiceFile ? (
          <div className="invoice-file">
            <span className="file-icon">📎</span>
            <a href={invoiceFile} target="_blank" rel="noopener noreferrer" className="file-link">
              View Invoice PDF
            </a>
          </div>
        ) : (
          <p className="no-file">No invoice file attached yet</p>
        )}
      </div>

      {/* Notes Section */}
      <div className="notes-section">
        <label htmlFor="invoice-notes">Additional Notes</label>
        <textarea
          id="invoice-notes"
          className="notes-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes or issues..."
          disabled={loading}
          rows={4}
        />
      </div>

      {/* Items Summary */}
      <div className="items-summary">
        <h4>📦 Items Summary</h4>
        {request.items && request.items.length > 0 ? (
          <div className="summary-table">
            {request.items.map((item, index) => (
              <div key={index} className="summary-row">
                <span className="item-desc">{item.description}</span>
                <span className="item-qty">Qty: {item.quantity}</span>
                <span className="item-price">${item.price?.toLocaleString()}</span>
              </div>
            ))}
            <div className="summary-total">
              <span>Total:</span>
              <span className="total-amount">${request.total_amount?.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <p>No items to display</p>
        )}
      </div>

      {/* Action Button */}
      <div className="checklist-actions">
        <button
          className="btn btn-success"
          onClick={handleSubmitToAccounting}
          disabled={loading || completionPercentage < 100}
          title={completionPercentage < 100 ? 'Complete all items first' : 'Submit to accounting'}
        >
          {loading ? 'Submitting...' : '✅ Submit to Accounting'}
        </button>
        {completionPercentage < 100 && (
          <p className="helper-text">
            Complete {checklistItems.length - Object.values(checklist).filter(v => v).length} more item(s) to submit
          </p>
        )}
      </div>
    </div>
  );
};

export default InvoiceChecklistWidget;