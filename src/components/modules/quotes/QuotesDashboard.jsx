import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import QuoteResponseModal from './QuoteResponseModal';
import QuoteComparisonMatrix from './QuoteComparisonMatrix';
import PurchaseOrderIntegration from './PurchaseOrderIntegration';
import DeliveryIntegration from './DeliveryIntegration';
import ApprovalCommentsIntegration from './ApprovalCommentsIntegration';
import EnhancedQuoteCreationFlow from './EnhancedQuoteCreationFlow';
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
  Trophy,
  FileCheck,
  Truck,
  Plus,
  File,
  Paperclip,
  TrendingDown,
  ArrowRight,
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
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [createQuoteOpen, setCreateQuoteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const { user } = useAuth();
  const { toast } = useToast();

  // Safe number parsing utility
  const safeNumber = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

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
        .select(`
          *,
          suppliers:supplier_id (id, name, email, phone, quality_score, delivery_score)
        `)
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
    const supplierName = quote.suppliers?.name || 'Unknown';
    const projectName = quote.project_name || '';
    
    const matchesSearch =
      quote.quote_id.toLowerCase().includes(searchLower) ||
      supplierName.toLowerCase().includes(searchLower) ||
      projectName.toLowerCase().includes(searchLower);

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
    received: quotes.filter(q => q.status === 'received').length,
    posSent: quotes.filter(q => q.po_status === 'sent').length,
    delivered: quotes.filter(q => q.delivery_status === 'delivered').length,
    totalValue: quotes.reduce((sum, q) => sum + safeNumber(q.estimated_total), 0),
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
      received: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: '✔️ Received' },
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

  // Find quotes with same items for comparison
  const canCompare = (quote) => {
    if (quote.status !== 'responded') return false;
    // Can compare if there are other responded quotes for same items
    return quotes.some(q => 
      q.id !== quote.id && 
      q.status === 'responded' && 
      q.total_items === quote.total_items
    );
  };

  const handleOpenComparison = (quote) => {
    // Get all responded quotes that can be compared
    const comparableQuotes = quotes.filter(q => 
      q.status === 'responded' && 
      q.total_items === quote.total_items &&
      q.supplier_response
    );
    
    if (comparableQuotes.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Not Enough Quotes',
        description: 'Need at least 2 responded quotes to compare'
      });
      return;
    }

    setSelectedQuote({ ...quote, comparableQuotes });
    setComparisonModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">📊 Quotes Dashboard</h1>
          <p className="text-slate-600 mt-2">Track all quote requests, responses, orders, and deliveries</p>
        </div>
        <Button
          onClick={() => setCreateQuoteOpen(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Quote Request
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-slate-600 font-semibold uppercase">Total</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{kpis.total}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-3">
            <p className="text-xs text-yellow-700 font-semibold uppercase">Pending</p>
            <p className="text-xl font-bold text-yellow-700 mt-1">{kpis.pending}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3">
            <p className="text-xs text-blue-700 font-semibold uppercase">Responded</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{kpis.responded}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-3">
            <p className="text-xs text-green-700 font-semibold uppercase">Approved</p>
            <p className="text-xl font-bold text-green-700 mt-1">{kpis.approved}</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-3">
            <p className="text-xs text-purple-700 font-semibold uppercase">Ordered</p>
            <p className="text-xl font-bold text-purple-700 mt-1">{kpis.ordered}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-3">
            <p className="text-xs text-emerald-700 font-semibold uppercase">Received</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{kpis.received}</p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="p-3">
            <p className="text-xs text-indigo-700 font-semibold uppercase">POs Sent</p>
            <p className="text-xl font-bold text-indigo-700 mt-1">{kpis.posSent}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-3">
            <p className="text-xs text-red-700 font-semibold uppercase">⚠️ Overdue</p>
            <p className="text-xl font-bold text-red-700 mt-1">{kpis.overdue}</p>
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
                <option value="received">✔️ Received</option>
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
                    const supplierName = quote.suppliers?.name || 'Unknown';
                    const supplierEmail = quote.suppliers?.email || '-';
                    const quoteValue = safeNumber(quote.estimated_total);

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
                            {supplierName}
                          </div>
                          <p className="text-xs text-slate-500">{supplierEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                            {quote.total_items || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-teal-600">€{quoteValue.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(quote.status)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="font-semibold text-slate-700">
                            {daysAgo}d
                            {overdue && <span className="text-red-600 ml-1">⚠️</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Record Response */}
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

                            {/* Compare Quotes */}
                            {quote.status === 'responded' && canCompare(quote) && (
                              <button
                                onClick={() => handleOpenComparison(quote)}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-purple-100 transition-colors text-purple-600 hover:text-purple-700"
                                title="Compare with other quotes"
                              >
                                <Trophy className="h-4 w-4" />
                              </button>
                            )}

                            {/* Approve Quote */}
                            {quote.status === 'responded' && (
                              <button
                                onClick={() => {
                                  setSelectedQuote(quote);
                                  setApprovalModalOpen(true);
                                }}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-green-100 transition-colors text-green-600 hover:text-green-700"
                                title="Approve quote with comments"
                              >
                                <FileCheck className="h-4 w-4" />
                              </button>
                            )}

                            {/* Create PO */}
                            {quote.status === 'approved' && !quote.po_number && (
                              <button
                                onClick={() => {
                                  setSelectedQuote(quote);
                                  setPoModalOpen(true);
                                }}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-indigo-100 transition-colors text-indigo-600 hover:text-indigo-700"
                                title="Create Purchase Order"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                            )}

                            {/* Receive Goods */}
                            {quote.status === 'ordered' && (
                              <button
                                onClick={() => {
                                  setSelectedQuote(quote);
                                  setDeliveryModalOpen(true);
                                }}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-green-100 transition-colors text-green-600 hover:text-green-700"
                                title="Confirm goods receipt"
                              >
                                <Package className="h-4 w-4" />
                              </button>
                            )}

                            {/* View Details */}
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
      {selectedQuote && !responseModalOpen && !comparisonModalOpen && !poModalOpen && !deliveryModalOpen && !approvalModalOpen && (
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

      {/* Comparison Modal */}
      {selectedQuote && comparisonModalOpen && (
        <QuoteComparisonMatrix
          quotes={selectedQuote.comparableQuotes || []}
          onClose={() => {
            setComparisonModalOpen(false);
            setSelectedQuote(null);
          }}
          onWinnerSelected={fetchQuotes}
        />
      )}

      {/* PO Integration Modal */}
      {selectedQuote && poModalOpen && (
        <PurchaseOrderIntegration
          quote={selectedQuote}
          onClose={() => {
            setPoModalOpen(false);
            setSelectedQuote(null);
          }}
          onSuccess={fetchQuotes}
        />
      )}

      {/* Delivery Integration Modal */}
      {selectedQuote && deliveryModalOpen && (
        <DeliveryIntegration
          quote={selectedQuote}
          onClose={() => {
            setDeliveryModalOpen(false);
            setSelectedQuote(null);
          }}
          onSuccess={fetchQuotes}
        />
      )}

      {/* Approval Comments Modal */}
      {selectedQuote && approvalModalOpen && (
        <ApprovalCommentsIntegration
          quote={selectedQuote}
          onClose={() => {
            setApprovalModalOpen(false);
            setSelectedQuote(null);
          }}
          onSuccess={fetchQuotes}
        />
      )}

      {/* Create Quote Modal */}
      {createQuoteOpen && (
        <EnhancedQuoteCreationFlow
          onClose={() => setCreateQuoteOpen(false)}
          onSuccess={fetchQuotes}
        />
      )}
    </div>
  );
};

// Quote Details Modal Component - ENHANCED WITH FILE DOWNLOADS
const QuoteDetailsModal = ({ quote, onClose, onUpdate, onRecordResponse }) => {
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(quote.status);
  const [expandedSections, setExpandedSections] = useState({
    items: true,
    response: !!quote.supplier_response,
    files: true,
  });
  const [downloadingFiles, setDownloadingFiles] = useState({});
  const { toast } = useToast();

  // Safe number parsing utility
  const safeNumber = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Download file from Supabase Storage
  const downloadFile = async (file) => {
    try {
      setDownloadingFiles(prev => ({ ...prev, [file.id]: true }));

      if (!file.path || !file.url) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'File path not available'
        });
        return;
      }

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: '📥 Download Started',
        description: `${file.name} is downloading`
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download file'
      });
    } finally {
      setDownloadingFiles(prev => ({ ...prev, [file.id]: false }));
    }
  };

  const daysAgo = Math.floor((new Date() - new Date(quote.created_at)) / (1000 * 60 * 60 * 24));
  const hasResponse = quote.supplier_response;
  const supplierName = quote.suppliers?.name || 'Unknown';
  const supplierEmail = quote.suppliers?.email || '-';
  const responseAttachments = quote.response_attachments || [];
  const requestAttachments = quote.request_attachments || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <Card className="w-full max-w-4xl my-4">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-slate-50 to-blue-50">
          <div>
            <CardTitle className="text-2xl">📋 Quote Details</CardTitle>
            <p className="text-xs text-slate-600 mt-1 font-mono">{quote.quote_id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </CardHeader>

        <CardContent className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold uppercase">Supplier</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{supplierName}</p>
              <p className="text-xs text-slate-600">{supplierEmail}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold uppercase">Project</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{quote.project_name || 'N/A'}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold uppercase">Status</p>
              <p className="text-sm font-bold text-blue-900 mt-1">{quote.status}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold uppercase">Created</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{new Date(quote.created_at).toLocaleDateString()}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold uppercase">Days Elapsed</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{daysAgo} days</p>
            </div>
            <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
              <p className="text-xs text-teal-700 font-semibold uppercase">Total Items</p>
              <p className="text-sm font-bold text-teal-900 mt-1">{quote.total_items || 0} items</p>
            </div>
          </div>

          {/* Items Section */}
          {quote.items && quote.items.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('items')}
                className="w-full px-4 py-3 bg-gradient-to-r from-teal-50 to-teal-100 border-b border-teal-200 flex items-center justify-between hover:from-teal-100 hover:to-teal-150 transition-colors"
              >
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Items in Quote ({quote.items.length})
                </h4>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.items ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.items && (
                <div className="p-4 space-y-2">
                  {quote.items.map((item, idx) => {
                    const quantity = safeNumber(item.quantity);
                    const unitPrice = safeNumber(item.unit_price);
                    const lineTotal = quantity * unitPrice;
                    
                    return (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200">
                        <div>
                          <p className="font-semibold text-slate-900">{item.part_name || 'Unknown Part'}</p>
                          <p className="text-xs text-slate-600 mt-1">Qty: {quantity}</p>
                        </div>
                        {unitPrice > 0 && (
                          <div className="text-right">
                            <p className="font-bold text-teal-600">€{lineTotal.toFixed(2)}</p>
                            <p className="text-xs text-slate-600">@ €{unitPrice.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Total Section */}
          <div className="p-4 bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-lg flex items-center justify-between">
            <p className="font-semibold text-teal-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Estimated Total
            </p>
            <p className="text-3xl font-bold text-teal-700">€{safeNumber(quote.estimated_total).toFixed(2)}</p>
          </div>

          {/* Supplier Response Section */}
          {hasResponse && (
            <div className="border rounded-lg overflow-hidden border-blue-200">
              <button
                onClick={() => toggleSection('response')}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 flex items-center justify-between hover:from-blue-100 hover:to-blue-150 transition-colors"
              >
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  📧 Supplier Response
                </h4>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.response ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.response && (
                <div className="p-4 space-y-4 bg-blue-50">
                  {/* Response Item Pricing */}
                  {quote.supplier_response?.item_prices && quote.supplier_response.item_prices.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-2">Item-Level Pricing:</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-blue-100 border-b border-blue-300">
                            <tr>
                              <th className="px-2 py-1 text-left">Item</th>
                              <th className="px-2 py-1 text-center">Qty</th>
                              <th className="px-2 py-1 text-right">Unit Price</th>
                              <th className="px-2 py-1 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quote.supplier_response.item_prices.map((item, idx) => {
                              const itemQty = safeNumber(item.quantity);
                              const itemPrice = safeNumber(item.unit_price);
                              const itemLineTotal = safeNumber(item.line_total);
                              
                              return (
                                <tr key={idx} className="border-b border-blue-200 bg-white">
                                  <td className="px-2 py-1 font-semibold">{item.part_name}</td>
                                  <td className="px-2 py-1 text-center">{itemQty}</td>
                                  <td className="px-2 py-1 text-right">€{itemPrice.toFixed(2)}</td>
                                  <td className="px-2 py-1 text-right font-semibold">€{itemLineTotal.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Pricing Breakdown */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-blue-200">
                    <div>
                      <p className="text-xs text-blue-700 font-semibold">Subtotal</p>
                      <p className="text-lg font-bold text-blue-900">€{safeNumber(quote.supplier_response?.quoted_price_subtotal).toFixed(2)}</p>
                    </div>
                    {safeNumber(quote.supplier_response?.total_charges) > 0 && (
                      <div>
                        <p className="text-xs text-orange-700 font-semibold">Charges</p>
                        <p className="text-lg font-bold text-orange-900">€{safeNumber(quote.supplier_response?.total_charges).toFixed(2)}</p>
                      </div>
                    )}
                    <div className="col-span-2 pt-2 border-t border-blue-200 flex justify-between">
                      <p className="font-semibold text-slate-900">Total Quoted</p>
                      <p className="text-lg font-bold text-teal-700">€{safeNumber(quote.supplier_response?.quoted_price_total).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Charges Breakdown */}
                  {quote.supplier_response?.charges && Object.values(quote.supplier_response.charges).some(v => v) && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm font-semibold text-orange-900 mb-2">Additional Charges:</p>
                      <div className="space-y-1 text-sm">
                        {safeNumber(quote.supplier_response.charges.transport) > 0 && (
                          <div className="flex justify-between">
                            <span>Transport:</span>
                            <span className="font-semibold">€{safeNumber(quote.supplier_response.charges.transport).toFixed(2)}</span>
                          </div>
                        )}
                        {safeNumber(quote.supplier_response.charges.minimum_order_charge) > 0 && (
                          <div className="flex justify-between">
                            <span>Minimum Order:</span>
                            <span className="font-semibold">€{safeNumber(quote.supplier_response.charges.minimum_order_charge).toFixed(2)}</span>
                          </div>
                        )}
                        {safeNumber(quote.supplier_response.charges.other_charge_amount) > 0 && (
                          <div className="flex justify-between">
                            <span>{quote.supplier_response.charges.other_charge_description || 'Other'}:</span>
                            <span className="font-semibold">€{safeNumber(quote.supplier_response.charges.other_charge_amount).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery & Terms */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-xs text-slate-600 font-semibold">Delivery Date</p>
                      <p className="text-sm font-bold text-slate-900">{quote.supplier_response?.delivery_date ? new Date(quote.supplier_response.delivery_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-xs text-slate-600 font-semibold">Payment Terms</p>
                      <p className="text-sm font-bold text-slate-900">{quote.supplier_response?.payment_terms || 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-xs text-slate-600 font-semibold">Lead Time</p>
                      <p className="text-sm font-bold text-slate-900">{quote.supplier_response?.lead_time_days || 'N/A'} days</p>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-xs text-slate-600 font-semibold">Per Unit</p>
                      <p className="text-sm font-bold text-teal-700">€{safeNumber(quote.supplier_response?.quoted_price_per_unit).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Quality Notes */}
                  {quote.supplier_response?.quality_notes && (
                    <div className="p-3 bg-white rounded border border-slate-200">
                      <p className="text-xs text-slate-600 font-semibold mb-1">Quality & Certifications:</p>
                      <p className="text-sm text-slate-700">{quote.supplier_response.quality_notes}</p>
                    </div>
                  )}

                  {/* Special Conditions */}
                  {quote.supplier_response?.special_conditions && (
                    <div className="p-3 bg-white rounded border border-slate-200">
                      <p className="text-xs text-slate-600 font-semibold mb-1">Special Conditions:</p>
                      <p className="text-sm text-slate-700">{quote.supplier_response.special_conditions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Files Section - WITH DOWNLOAD FUNCTIONALITY */}
          {(responseAttachments.length > 0 || requestAttachments.length > 0) && (
            <div className="border rounded-lg overflow-hidden border-amber-200">
              <button
                onClick={() => toggleSection('files')}
                className="w-full px-4 py-3 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200 flex items-center justify-between hover:from-amber-100 hover:to-amber-150 transition-colors"
              >
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({responseAttachments.length + requestAttachments.length})
                </h4>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.files ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.files && (
                <div className="p-4 space-y-4 bg-amber-50">
                  {responseAttachments.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Supplier Response Files ({responseAttachments.length})
                      </p>
                      <div className="space-y-2">
                        {responseAttachments.map((file) => (
                          <div key={file.id} className="p-3 bg-white rounded border border-amber-200 flex items-center justify-between group hover:border-amber-400 transition-colors">
                            <div className="flex items-center gap-3 flex-1">
                              <File className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                                <p className="text-xs text-slate-600">{(safeNumber(file.size) / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <button
                              onClick={() => downloadFile(file)}
                              disabled={downloadingFiles[file.id]}
                              className="ml-2 p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              title="Download file"
                            >
                              {downloadingFiles[file.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {requestAttachments.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Request Files ({requestAttachments.length})
                      </p>
                      <div className="space-y-2">
                        {requestAttachments.map((file) => (
                          <div key={file.id} className="p-3 bg-white rounded border border-amber-200 flex items-center justify-between group hover:border-amber-400 transition-colors">
                            <div className="flex items-center gap-3 flex-1">
                              <File className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                                <p className="text-xs text-slate-600">{(safeNumber(file.size) / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <button
                              onClick={() => downloadFile(file)}
                              disabled={downloadingFiles[file.id]}
                              className="ml-2 p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              title="Download file"
                            >
                              {downloadingFiles[file.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Approval Info */}
          {quote.approval_comments && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
              <h4 className="font-bold text-green-900 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                ✅ Approval
              </h4>
              <p className="text-sm text-green-800"><strong>Comments:</strong> {quote.approval_comments}</p>
              {quote.approval_date && (
                <p className="text-xs text-green-700">Approved on {new Date(quote.approval_date).toLocaleDateString()}</p>
              )}
            </div>
          )}

          {/* PO Info */}
          {quote.po_number && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
              <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                📋 Purchase Order
              </h4>
              <p className="text-sm text-indigo-800"><strong>PO Number:</strong> {quote.po_number}</p>
              <p className="text-xs text-indigo-700">Status: {quote.po_status || 'Draft'}</p>
            </div>
          )}

          {/* Delivery Info */}
          {quote.delivery_status && quote.delivery_status !== 'pending' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <h4 className="font-bold text-emerald-900 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                🚚 Delivery
              </h4>
              <p className="text-sm text-emerald-800"><strong>Status:</strong> {quote.delivery_status}</p>
              {quote.actual_delivery_date && (
                <p className="text-xs text-emerald-700">Received on {new Date(quote.actual_delivery_date).toLocaleDateString()}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {quote.request_notes && (
            <div>
              <h4 className="font-bold text-slate-900 mb-2">📝 Notes</h4>
              <p className="text-slate-700 whitespace-pre-wrap text-sm p-3 bg-slate-50 rounded-lg border border-slate-200">
                {quote.request_notes}
              </p>
            </div>
          )}

          {/* Status Update */}
          {quote.status !== 'received' && (
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
                <option value="received">✔️ Received</option>
                <option value="rejected">❌ Rejected</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={updating || newStatus === quote.status}
                  className="bg-teal-600 hover:bg-teal-700"
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotesDashboard;