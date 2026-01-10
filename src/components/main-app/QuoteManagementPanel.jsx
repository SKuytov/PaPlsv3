import React, { useState } from 'react';
import './QuoteManagementStyles.css';

/**
 * QuoteManagementPanel Component
 * 
 * Handle supplier quote management:
 * - Request quotes from suppliers
 * - Track supplier responses
 * - Compare multiple quotes
 * - Select best option
 * - Store quote documents
 */
export const QuoteManagementPanel = ({ request, onQuoteSelected }) => {
  const [showForm, setShowForm] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteFile, setQuoteFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [existingQuotes, setExistingQuotes] = useState(request.quotes || []);

  const handleSubmitQuote = async (e) => {
    e.preventDefault();
    
    if (!selectedSupplier || !quoteAmount) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // In production, upload file and save quote to database
      const newQuote = {
        id: `quote_${Date.now()}`,
        supplier_name: selectedSupplier,
        total_amount: parseFloat(quoteAmount),
        quote_pdf_url: quoteFile ? URL.createObjectURL(quoteFile) : null,
        created_at: new Date().toISOString()
      };

      setExistingQuotes([...existingQuotes, newQuote]);
      setShowForm(false);
      setSelectedSupplier('');
      setQuoteAmount('');
      setQuoteFile(null);
    } catch (err) {
      setError('Failed to save quote');
    } finally {
      setLoading(false);
    }
  };

  const bestQuote = existingQuotes.length > 0
    ? existingQuotes.reduce((best, current) => 
        current.total_amount < (best?.total_amount || Infinity) ? current : best
      )
    : null;

  return (
    <div className="quote-management-panel">
      <h3>📨 Supplier Quote Management</h3>
      
      {/* Error Message */}
      {error && <div className="alert alert-error">❌ {error}</div>}

      {/* Budget Summary */}
      <div className="budget-summary">
        <div className="summary-item">
          <label>Request Total:</label>
          <span className="amount">${request.total_amount?.toLocaleString()}</span>
        </div>
        {bestQuote && (
          <div className="summary-item">
            <label>Best Quote:</label>
            <span className="amount highlight">${bestQuote.total_amount?.toLocaleString()}</span>
            <span className="supplier-name">{bestQuote.supplier_name}</span>
          </div>
        )}
      </div>

      {/* Existing Quotes */}
      {existingQuotes.length > 0 && (
        <div className="quotes-list">
          <h4>Received Quotes ({existingQuotes.length})</h4>
          {existingQuotes.map((quote) => (
            <div 
              key={quote.id} 
              className={`quote-item ${quote.id === bestQuote?.id ? 'best-quote' : ''}`}
            >
              <div className="quote-header">
                <span className="supplier-name">{quote.supplier_name}</span>
                {quote.id === bestQuote?.id && (
                  <span className="badge badge-success">✨ Best Quote</span>
                )}
              </div>
              <div className="quote-details">
                <span className="quote-amount">${quote.total_amount?.toLocaleString()}</span>
                <span className="variance">
                  {quote.total_amount > request.total_amount ? '+' : ''}
                  ${(quote.total_amount - request.total_amount).toLocaleString()}
                </span>
              </div>
              {quote.quote_pdf_url && (
                <a href={quote.quote_pdf_url} target="_blank" rel="noopener noreferrer" className="link">
                  📄 View Quote PDF
                </a>
              )}
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onQuoteSelected(quote)}
              >
                Use This Quote
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Quote Form */}
      {!showForm ? (
        <button
          className="btn btn-secondary"
          onClick={() => setShowForm(true)}
        >
          + Add Supplier Quote
        </button>
      ) : (
        <form onSubmit={handleSubmitQuote} className="quote-form">
          <div className="form-group">
            <label>Supplier Name</label>
            <input
              type="text"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              placeholder="Enter supplier name"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label>Quote Amount</label>
            <input
              type="number"
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
              placeholder="Enter quote amount"
              step="0.01"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label>Quote Document (PDF)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setQuoteFile(e.target.files[0])}
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Saving...' : '✅ Save Quote'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowForm(false)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default QuoteManagementPanel;