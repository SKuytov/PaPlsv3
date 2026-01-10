import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Plus, Search, Eye, Trash2, AlertCircle } from 'lucide-react';
import RequestDetailModal from '@/components/modules/requests/RequestDetailModal';
import CreateRequestModal from '@/components/modules/requests/CreateRequestModal';

const RequestsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, in-progress, completed

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      // For now, we'll use mock data since backend quote-requests endpoint may not exist
      // In production, replace with: const response = await fetch(`${import.meta.env.VITE_API_URL}/api/quote-requests`);
      const mockRequests = [
        {
          id: 'req-001',
          title: 'Bearing Replacement Parts',
          description: 'Need replacement bearings for production line 3',
          status: 'pending',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          priority: 'high',
          requested_by: user?.user_metadata?.full_name || 'Current User',
          estimated_budget: 5000,
          quotes_count: 0,
          orders_count: 0
        },
        {
          id: 'req-002',
          title: 'Hydraulic Pump Assembly',
          description: 'Backup hydraulic pump for maintenance',
          status: 'in-progress',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          priority: 'medium',
          requested_by: user?.user_metadata?.full_name || 'Current User',
          estimated_budget: 8500,
          quotes_count: 3,
          orders_count: 1
        }
      ];
      setRequests(mockRequests);
    } catch (err) {
      setError('Failed to load requests: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (confirm('Are you sure you want to delete this request?')) {
      try {
        // Delete from backend when endpoint is ready
        setRequests(requests.filter(r => r.id !== requestId));
      } catch (err) {
        setError('Failed to delete request: ' + err.message);
      }
    }
  };

  const handleCreateRequest = async (formData) => {
    try {
      // Create on backend when endpoint is ready
      const newRequest = {
        id: `req-${Date.now()}`,
        ...formData,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        requested_by: user?.user_metadata?.full_name || 'Current User',
        quotes_count: 0,
        orders_count: 0
      };
      setRequests([newRequest, ...requests]);
      setShowCreateModal(false);
    } catch (err) {
      setError('Failed to create request: ' + err.message);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || request.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'text-gray-600',
      'medium': 'text-blue-600',
      'high': 'text-red-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Requests</h1>
          <p className="text-gray-600 mt-1">Manage spare parts requests and track their progress</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Request
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'in-progress', 'completed'].map(status => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              onClick={() => setFilter(status)}
              size="sm"
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">No requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(request => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">{request.title}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace('-', ' ')}
                      </Badge>
                      <span className={`text-sm font-medium ${getPriorityColor(request.priority)}`}>
                        {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{request.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Requested By</span>
                        <p className="font-medium text-gray-900">{request.requested_by}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Budget</span>
                        <p className="font-medium text-gray-900">€{request.estimated_budget?.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Quotes</span>
                        <p className="font-medium text-gray-900">{request.quotes_count}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Orders</span>
                        <p className="font-medium text-gray-900">{request.orders_count}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetailModal(true);
                      }}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRequest(request.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateRequestModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRequest}
        />
      )}

      {showDetailModal && selectedRequest && (
        <RequestDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          request={selectedRequest}
        />
      )}
    </div>
  );
};

export default RequestsPage;