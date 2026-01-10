import React, { useState, useEffect } from 'react';

const QuoteRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal',
    budget: '',
    required_by_date: ''
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch requests on component mount
  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`${API_URL}/api/quote-requests?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch requests');

      const data = await response.json();
      setRequests(data.data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);

    try {
      if (!formData.title?.trim() || !formData.description?.trim() || !formData.budget) {
        setError('Please fill in all required fields');
        setSubmitLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/quote-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          priority: formData.priority,
          budget: parseFloat(formData.budget),
          required_by_date: formData.required_by_date || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create request');
      }

      const newRequest = await response.json();
      setRequests(prev => [newRequest.data, ...prev]);
      setFormData({
        title: '',
        description: '',
        priority: 'normal',
        budget: '',
        required_by_date: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating request:', err);
      setError(err.message || 'Failed to create request');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!confirm('Are you sure you want to delete this quote request?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/quote-requests/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete request');

      setRequests(prev => prev.filter(req => req.id !== id));
    } catch (err) {
      console.error('Error deleting request:', err);
      setError(err.message || 'Failed to delete request');
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      'open': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'quoted': 'bg-purple-100 text-purple-800',
      'ordered': 'bg-indigo-100 text-indigo-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quote Requests</h1>
          <p className="text-gray-600">Manage and track supplier quote requests</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="mt-4 md:mt-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <span className="text-xl">➕</span> New Request
        </button>
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

      {/* Status Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-2 flex-wrap">
        {['all', 'open', 'in_progress', 'quoted', 'ordered', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {status.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && !requests.length ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 text-lg">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No quote requests found</p>
        </div>
      ) : (
        // Requests Table
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Budget</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Priority</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Required By</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {request.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      {formatCurrency(request.budget)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(request.priority)}`}>
                        {request.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {request.required_by_date ? formatDate(request.required_by_date) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm space-x-2">
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(request.id)}
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

      {/* Create Request Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateRequest}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Create Quote Request</h2>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Request Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="e.g., IT Equipment Purchase"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Describe what you need..."
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Budget (€) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-gray-600">€</span>
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Required By Date (Optional)
                </label>
                <input
                  type="date"
                  name="required_by_date"
                  value={formData.required_by_date}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-8 pt-6 border-t">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                disabled={submitLoading}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitLoading ? '⏳ Creating...' : '✅ Create Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Request Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600 font-medium">Title</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{selectedRequest.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Budget</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(selectedRequest.budget)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Priority</p>
                <p className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(selectedRequest.priority)}`}>
                    {selectedRequest.priority.toUpperCase()}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Status</p>
                <p className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status.replace('_', ' ').toUpperCase()}
                  </span>
                </p>
              </div>
            </div>

            <div className="mb-6 pt-6 border-t">
              <p className="text-sm text-gray-600 font-medium mb-2">Description</p>
              <p className="text-gray-700">{selectedRequest.description}</p>
            </div>

            {selectedRequest.notes && (
              <div className="mb-6 pb-6 border-b">
                <p className="text-sm text-gray-600 font-medium mb-2">Notes</p>
                <p className="text-gray-700">{selectedRequest.notes}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
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

export default QuoteRequests;
