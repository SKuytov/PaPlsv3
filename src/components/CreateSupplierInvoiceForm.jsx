import React, { useState } from 'react';

const CreateSupplierInvoiceForm = ({ orderId, orderTitle, supplier, orderAmount, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    supplier_invoice_number: '',
    amount: orderAmount || '',
    received_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    attachment_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Validation
      if (!formData.supplier_invoice_number?.trim()) {
        throw new Error('Supplier invoice number is required');
      }

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Amount must be a positive number');
      }

      if (!formData.due_date) {
        throw new Error('Due date is required');
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/supplier-invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          supplier_invoice_number: formData.supplier_invoice_number.trim(),
          amount: parseFloat(formData.amount),
          received_date: formData.received_date,
          due_date: formData.due_date,
          notes: formData.notes?.trim() || null,
          attachment_url: formData.attachment_url?.trim() || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to log supplier invoice');
      }

      setSuccess(true);
      setTimeout(() => {
        setFormData({
          supplier_invoice_number: '',
          amount: orderAmount || '',
          received_date: new Date().toISOString().split('T')[0],
          due_date: '',
          notes: '',
          attachment_url: ''
        });
        onSubmit(data.data);
      }, 1500);
    } catch (err) {
      console.error('Error logging supplier invoice:', err);
      setError(err.message || 'Failed to log supplier invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">📋</span> Log Supplier Invoice
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Order Information Display */}
        {orderTitle && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Order Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Order:</span>
                <p className="text-gray-700">{orderTitle}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Supplier:</span>
                <p className="text-gray-700">{supplier || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Order Amount:</span>
                <p className="text-gray-700">${parseFloat(orderAmount || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <span className="text-red-600 text-xl flex-shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <span className="text-green-600 text-xl">✅</span>
            <p className="text-green-700 font-medium">Supplier invoice logged successfully!</p>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Supplier Invoice Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Supplier Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="supplier_invoice_number"
              value={formData.supplier_invoice_number}
              onChange={handleChange}
              placeholder="e.g., INV-2024-001234"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Invoice Amount (€) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-gray-600 font-medium">€</span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Date Received */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date Received <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="received_date"
              value={formData.received_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g., Invoice includes shipping costs, payment terms, etc."
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Attachment URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Invoice File URL (Optional)
            </label>
            <input
              type="url"
              name="attachment_url"
              value={formData.attachment_url}
              onChange={handleChange}
              placeholder="https://example.com/invoice.pdf"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Link to the invoice PDF or document</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-8 pt-6 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || success}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin">⏳</span> Logging...
              </>
            ) : success ? (
              <>
                <span>✅</span> Logged!
              </>
            ) : (
              <>
                <span>📋</span> Log Invoice
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSupplierInvoiceForm;
