import React, { useState, useEffect } from 'react';
import CreateSupplierInvoiceForm from '../components/CreateSupplierInvoiceForm';
import useSupplierInvoices from '../hooks/useSupplierInvoices';

const SupplierInvoices = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const {
    invoices,
    loading,
    error,
    fetchSupplierInvoices,
    updateSupplierInvoice,
    sendToAccounting,
    deleteSupplierInvoice,
    fetchStatistics
  } = useSupplierInvoices();

  // Fetch initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await fetchSupplierInvoices({ status: selectedStatus !== 'all' ? selectedStatus : undefined });
      const statsData = await fetchStatistics();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleCreateInvoice = async (newInvoice) => {
    setShowCreateForm(false);
    await loadData();
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
  };

  const handleSendToAccounting = async (invoiceId) => {
    try {
      await sendToAccounting(invoiceId);
      await loadData();
    } catch (err) {
      console.error('Error sending to accounting:', err);
    }
  };

  const handleDelete = async (invoiceId) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteSupplierInvoice(invoiceId);
        await loadData();
      } catch (err) {
        console.error('Error deleting invoice:', err);
      }
    }
  };

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetails(true);
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.supplier_invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          invoice.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || invoice.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'sent_to_accounting': 'bg-blue-100 text-blue-800',
      'processed': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Pending',
      'sent_to_accounting': 'Sent to Accounting',
      'processed': 'Processed',
      'rejected': 'Rejected'
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Supplier Invoices</h1>
          <p className="text-gray-600">Manage and track supplier invoices</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="mt-4 md:mt-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <span className="text-xl">➕</span> New Invoice
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-gray-600 text-sm font-medium mb-1">Total Invoices</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total_invoices}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="text-gray-600 text-sm font-medium mb-1">Pending</div>
            <div className="text-3xl font-bold text-gray-900">{stats.pending_count}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-gray-600 text-sm font-medium mb-1">Total Amount</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_amount || 0)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-gray-600 text-sm font-medium mb-1">Avg Amount</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.average_amount || 0)}</div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'sent_to_accounting', 'processed', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <span className="text-red-600 text-xl">⚠️</span>
          <div>
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !invoices.length ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 text-lg">Loading invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No invoices found</p>
        </div>
      ) : (
        // Invoices Table
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Invoice Number</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Due Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Received</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {invoice.supplier_invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                        {getStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(invoice.received_date)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm space-x-2">
                      <button
                        onClick={() => handleViewDetails(invoice)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View
                      </button>
                      {invoice.status === 'pending' && (
                        <button
                          onClick={() => handleSendToAccounting(invoice.id)}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Send
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(invoice.id)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateForm && (
        <CreateSupplierInvoiceForm
          orderId={null}
          orderTitle="New Supplier Invoice"
          supplier=""
          orderAmount=""
          onSubmit={handleCreateInvoice}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Invoice Details Modal */}
      {showDetails && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Invoice Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 font-medium">Invoice Number</p>
                <p className="text-lg font-semibold text-gray-900">{selectedInvoice.supplier_invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Amount</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedInvoice.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Status</p>
                <p className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedInvoice.status)}`}>
                    {getStatusLabel(selectedInvoice.status)}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Due Date</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(selectedInvoice.due_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Received Date</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(selectedInvoice.received_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Created</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(selectedInvoice.created_at)}</p>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600 font-medium mb-2">Notes</p>
                <p className="text-gray-700">{selectedInvoice.notes}</p>
              </div>
            )}

            {selectedInvoice.attachment_url && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600 font-medium mb-2">Invoice File</p>
                <a href={selectedInvoice.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 break-all">
                  {selectedInvoice.attachment_url}
                </a>
              </div>
            )}

            <div className="mt-8 pt-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierInvoices;
