import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import QuoteResponseModal from './QuoteResponseModal';
import {
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  TrendingUp,
  ChevronDown,
  MoreVertical,
  Eye,
  MessageSquare,
  Download,
  Mail,
  Loader2,
  X,
  Calendar,
  DollarSign,
  User,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const QuotesDashboard = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch quotes on mount
  useEffect(() => {
    fetchQuotes();
    // Refresh every 30 seconds
    const interval = setInterval(fetchQuotes, 30000);
    return () => clearInterval(interval);
  }, [user, statusFilter, supplierFilter]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('quote_requests')
        .select('*, suppliers(id, name, email, phone, quality_score, delivery_score)')
        .eq('created_by', user.id)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply supplier filter
      if (supplierFilter !== 'all') {
        query = query.eq('supplier_id', supplierFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load quotes'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter quotes based on search and date range
  const filteredQuotes = quotes.filter(quote => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      quote.quote_id.toLowerCase().includes(searchLower) ||
      quote.suppliers?.name.toLowerCase().includes(searchLower) ||
      quote.project_name?.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // Date range filter
    if (dateRange.from) {
      const quoteDate = new Date(quote.created_at);
      const fromDate = new Date(dateRange.from);
      if (quoteDate < fromDate) return false;
    }
    if (dateRange.to) {
      const quoteDate = new Date(quote.created_at);
      const toDate = new Date(dateRange.to);
      if (quoteDate > toDate) return false;
    }

    return true;
  });

  // Calculate KPIs
  const kpis = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    responded: quotes.filter(q => q.status === 'responded').length,
    approved: quotes.filter(q => q.status === 'approved').length,
    ordered: quotes.filter(q => q.status === 'ordered').length,
    totalValue: quotes.reduce((sum, q) => sum + (parseFloat(q.estimated_total) || 0), 0),
    overdue: quotes.filter(q => {
      if (q.status !== 'pending' && q.status !== 'responded') return false;
      const daysSinceSent = Math.floor((new Date() - new Date(q.created_at)) / (1000 * 60 * 60 * 24));
      return daysSinceSent > 7;
    }).length,
  };

  const getStatusBadge = (status) => {
    const statuses = {
      pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: '⏳ Pending' },
      responded: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: '📧 Response Received' },
      approved: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: '✅ Approved' },
      ordered: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: '📦 Ordered' },
      rejected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: '❌ Rejected' },
    };
    const style = statuses[status] || statuses.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.border} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const getDaysSinceSent = (createdAt) => {
    const days = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
    return days;
  };

  const isOverdue = (quote) => {
    const days = getDaysSinceSent(quote.created_at);
    return (quote.status === 'pending' || quote.status === 'responded') && days > 7;
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">📊 Quotes Dashboard</h1>
          <p className="text-slate-600 mt-2">Track all quote requests, responses, and orders</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-semibold uppercase">Total Quotes</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{kpis.total}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4">
            <p className="text-xs text-yellow-700 font-semibold uppercase">Pending</p>
            <p className="text-2xl font-bold text-yellow-700 mt-2">{kpis.pending}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <p className="text-xs text-blue-700 font-semibold uppercase">Responded</p>
            <p className="text-2xl font-bold text-blue-700 mt-2">{kpis.responded}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <p className="text-xs text-green-700 font-semibold uppercase">Approved</p>
            <p className="text-2xl font-bold text-green-700 mt-2">{kpis.approved}</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <p className="text-xs text-purple-700 font-semibold uppercase">Ordered</p>
            <p className="text-2xl font-bold text-purple-700 mt-2">{kpis.ordered}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <p className="text-xs text-red-700 font-semibold uppercase">⚠️ Overdue</p>
            <p className="text-2xl font-bold text-red-700 mt-2">{kpis.overdue}</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Value Card */}
      <Card className="bg-gradient-to-r from-teal-50 to-teal-100 border-teal-200">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-teal-700 font-semibold uppercase">Total Quote Value</p>
            <p className="text-4xl font-bold text-teal-900 mt-2">€{kpis.totalValue.toFixed(2)}</p>
          </div>
          <DollarSign className="h-16 w-16 text-teal-600 opacity-20" />
        </CardContent>
      </Card>

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">🔍 Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Search Quote ID, Supplier, Project</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="e.g., QR-ABC123 or Supplier Name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">⏳ Pending</option>
                <option value="responded">📧 Response Received</option>
                <option value="approved">✅ Approved</option>
                <option value="ordered">📦 Ordered</option>
                <option value="rejected">❌ Rejected</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="created_at">Date Created</option>
                <option value="estimated_total">Total Value</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Toggle Sort Order */}
            <div className="flex items-end">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">From Date</label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">To Date</label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {kpis.overdue > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">⚠️ {kpis.overdue} Quote(s) Overdue</p>
            <p className="text-sm text-red-800 mt-1">No response received for 7+ days. Consider following up with suppliers.</p>
          </div>
        </div>
      )}

      {/* Quotes Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">📋 All Quotes ({filteredQuotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No quotes found</p>
              <p className="text-sm text-slate-500 mt-2">Try adjusting your filters or create a new quote</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Quote ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Project</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Supplier</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Items</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Value</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Days</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote, idx) => {
                    const daysAgo = getDaysSinceSent(quote.created_at);
                    const overdue = isOverdue(quote);

                    return (
                      <tr
                        key={quote.id}
                        className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                          overdue ? 'bg-red-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <code className="font-mono font-bold text-teal-700 text-xs">{quote.quote_id}</code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {quote.project_name || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 text-sm">
                            {quote.suppliers?.name || 'Unknown'}
                          </div>
                          <p className="text-xs text-slate-500">{quote.suppliers?.email || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                            {quote.total_items || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-teal-600">€{parseFloat(quote.estimated_total || 0).toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(quote.status)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="font-semibold text-slate-700">
                            {daysAgo}d
                            {overdue && <span className="text-red-600 ml-1">⚠️</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {quote.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setSelectedQuote(quote);
                                  setResponseModalOpen(true);
                                }}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-blue-100 transition-colors text-blue-600 hover:text-blue-700"
                                title="Record supplier response"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedQuote(quote)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-200 transition-colors text-slate-600 hover:text-slate-900"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Details Modal */}
      {selectedQuote && !responseModalOpen && (
        <QuoteDetailsModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onUpdate={fetchQuotes}
          onRecordResponse={() => setResponseModalOpen(true)}
        />
      )}

      {/* Response Modal */}
      {selectedQuote && responseModalOpen && (
        <QuoteResponseModal
          quote={selectedQuote}
          supplier={selectedQuote.suppliers}
          onClose={() => {
            setResponseModalOpen(false);
            setSelectedQuote(null);
          }}
          onSuccess={fetchQuotes}
        />
      )}
    </div>
  );
};

// Quote Details Modal Component
const QuoteDetailsModal = ({ quote, onClose, onUpdate, onRecordResponse }) => {
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(quote.status);
  const { toast } = useToast();

  const handleStatusUpdate = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({ status: newStatus })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Quote status updated to ${newStatus}`
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating quote:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update quote status'
      });
    } finally {
      setUpdating(false);
    }
  };

  const daysAgo = Math.floor((new Date() - new Date(quote.created_at)) / (1000 * 60 * 60 * 24));
  const hasResponse = quote.supplier_response;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <div>
            <CardTitle className="text-xl">Quote Details</CardTitle>
            <p className="text-xs text-slate-600 mt-1 font-mono">{quote.quote_id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-600 font-semibold uppercase">Supplier</p>
              <p className="text-lg font-bold text-slate-900 mt-2">{quote.suppliers?.name}</p>
              <p className="text-sm text-slate-600">{quote.suppliers?.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-semibold uppercase">Project</p>
              <p className="text-lg font-bold text-slate-900 mt-2">{quote.project_name || 'N/A'}</p>
            </div>
          </div>

          {/* Status & Timeline */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-xs text-slate-600 font-semibold uppercase">Status</p>
              <p className="text-sm font-bold text-slate-900 mt-2">{quote.status}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-semibold uppercase">Created</p>
              <p className="text-sm font-bold text-slate-900 mt-2">{new Date(quote.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-semibold uppercase">Days Ago</p>
              <p className="text-sm font-bold text-slate-900 mt-2">{daysAgo} days</p>
            </div>
          </div>

          {/* Items */}
          {quote.items && quote.items.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-900 mb-3">Items ({quote.items.length})</h4>
              <div className="space-y-2">
                {quote.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.part_name}</p>
                      <p className="text-xs text-slate-600 mt-1">Qty: {item.quantity}</p>
                    </div>
                    {item.unit_price && (
                      <div className="text-right">
                        <p className="font-bold text-teal-600">€{(item.unit_price * item.quantity).toFixed(2)}</p>
                        <p className="text-xs text-slate-600">@ €{item.unit_price.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
            <p className="font-semibold text-teal-900">Estimated Total</p>
            <p className="text-2xl font-bold text-teal-600">€{parseFloat(quote.estimated_total || 0).toFixed(2)}</p>
          </div>

          {/* Response Info if exists */}
          {hasResponse && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <h4 className="font-bold text-slate-900 text-blue-900">📧 Supplier Response</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-blue-700 font-semibold">Quoted Price</p>
                  <p className="font-bold text-blue-900 mt-1">€{quote.supplier_response.quoted_price_total?.toFixed(2) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-semibold">Delivery Date</p>
                  <p className="font-bold text-blue-900 mt-1">
                    {quote.supplier_response.delivery_date ? new Date(quote.supplier_response.delivery_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-semibold">Payment Terms</p>
                  <p className="font-bold text-blue-900 mt-1">{quote.supplier_response.payment_terms || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-semibold">Lead Time</p>
                  <p className="font-bold text-blue-900 mt-1">{quote.supplier_response.lead_time_days || 'N/A'} days</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {quote.request_notes && (
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Notes</h4>
              <p className="text-slate-700 whitespace-pre-wrap text-sm p-3 bg-slate-50 rounded-lg">
                {quote.request_notes}
              </p>
            </div>
          )}

          {/* Delivery Date */}
          {quote.delivery_date && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700 font-semibold uppercase">Requested Delivery</p>
              <p className="text-sm font-bold text-blue-900 mt-1">
                {new Date(quote.delivery_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Status Update */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-bold text-slate-900">Update Status</h4>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="pending">⏳ Pending</option>
              <option value="responded">📧 Response Received</option>
              <option value="approved">✅ Approved</option>
              <option value="ordered">📦 Ordered</option>
              <option value="rejected">❌ Rejected</option>
            </select>
            <div className="flex gap-2">
              <Button
                onClick={handleStatusUpdate}
                disabled={updating || newStatus === quote.status}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </Button>
              {quote.status === 'pending' && (
                <Button
                  onClick={onRecordResponse}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Record Response
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotesDashboard;