import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Filter, TrendingUp, Mail, Download, Copy, AlertCircle, Loader2, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dbService } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ManualQuoteRequestModal from './ManualQuoteRequestModal';
import BulkQuoteRequestCreator from './BulkQuoteRequestCreator';
import QuoteApprovalPanel from './QuoteApprovalPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const QuoteManagementHub = () => {
  const [activeTab, setActiveTab] = useState('pending'); // pending, received, approved, all
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showManualQuoteModal, setShowManualQuoteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    received: 0,
    approved: 0,
    rejected: 0
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadQuotes();
    loadSuppliers();
  }, [activeTab, searchTerm, filterSupplier]);

  const loadSuppliers = async () => {
    try {
      const { data } = await dbService.getSuppliers();
      if (data) setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getQuoteRequests();
      if (data) {
        let filtered = data;

        // Filter by tab
        if (activeTab === 'pending') {
          filtered = filtered.filter(q => q.status === 'pending');
        } else if (activeTab === 'received') {
          filtered = filtered.filter(q => q.status === 'received');
        } else if (activeTab === 'approved') {
          filtered = filtered.filter(q => q.status === 'approved');
        }

        // Filter by search term
        if (searchTerm) {
          filtered = filtered.filter(q =>
            q.part?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.part?.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        // Filter by supplier
        if (filterSupplier !== 'all') {
          filtered = filtered.filter(q => q.supplier_id === filterSupplier);
        }

        setQuotes(filtered);

        // Calculate stats
        setStats({
          total: data.length,
          pending: data.filter(q => q.status === 'pending').length,
          received: data.filter(q => q.status === 'received').length,
          approved: data.filter(q => q.status === 'approved').length,
          rejected: data.filter(q => q.status === 'rejected').length
        });
      }
    } catch (error) {
      console.error('Error loading quotes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load quotes"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApproval = (quote) => {
    setSelectedQuote(quote);
    setShowApprovalPanel(true);
  };

  const handleApprovalSuccess = () => {
    setShowApprovalPanel(false);
    setSelectedQuote(null);
    loadQuotes();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quote & Order Management</h1>
          <p className="text-slate-600 mt-1">Request quotes, track responses, and manage approvals</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowManualQuoteModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Quote Request
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600 text-sm">Total Quotes</p>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-slate-600 text-sm">Pending Response</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-slate-600 text-sm">Received Quotes</p>
            <p className="text-3xl font-bold text-blue-600">{stats.received}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-slate-600 text-sm">Approved</p>
            <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-slate-600 text-sm">Rejected</p>
            <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: 'pending', label: 'Pending Response', icon: '⏳', count: stats.pending },
          { id: 'received', label: 'Received Quotes', icon: '✓', count: stats.received },
          { id: 'approved', label: 'Approved', icon: '✅', count: stats.approved },
          { id: 'all', label: 'All Quotes', icon: '📋', count: stats.total }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 border-b-2 font-semibold transition-colors ${
              activeTab === tab.id
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
            <Badge className="ml-2">{tab.count}</Badge>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search parts, suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
        <select
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All Suppliers</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Quotes List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="bg-white p-12 rounded-lg text-center border border-slate-200">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No quotes found</p>
          <p className="text-slate-500 text-sm mt-1">Create a new quote request to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onApprove={() => handleOpenApproval(quote)}
              onReload={loadQuotes}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ManualQuoteRequestModal
        open={showManualQuoteModal}
        onOpenChange={setShowManualQuoteModal}
        onSuccess={() => {
          setShowManualQuoteModal(false);
          loadQuotes();
        }}
      />

      {showApprovalPanel && selectedQuote && (
        <QuoteApprovalPanel
          quote={selectedQuote}
          onClose={() => setShowApprovalPanel(false)}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </div>
  );
};

// Quote Card Component
const QuoteCard = ({ quote, onApprove, onReload }) => {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'received':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const generateEmailText = () => {
    return `Hello ${quote.supplier?.name || 'Supplier'},

We would like to request a quote for the following:

Part: ${quote.part?.name || 'N/A'}
Part Number: ${quote.part?.part_number || 'N/A'}
Quantity: ${quote.quantity_requested}
Category: ${quote.part?.category || 'N/A'}

${quote.request_notes ? `Special Requirements:\n${quote.request_notes}\n\n` : ''}${quote.requested_unit_price ? `Budget Expectation: €${quote.requested_unit_price}/unit\n\n` : ''}Please provide your best quote at your earliest convenience.

Thank you,
Best regards`;
  };

  const handleCopyEmail = () => {
    const emailText = generateEmailText();
    navigator.clipboard.writeText(emailText);
    setCopiedEmail(true);
    toast({
      title: "Copied!",
      description: "Email text copied to clipboard"
    });
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleOpenEmail = () => {
    const emailText = generateEmailText();
    const mailtoLink = `mailto:${quote.supplier?.email}?subject=Quote%20Request%20-%20${encodeURIComponent(quote.part?.name || 'Part')}&body=${encodeURIComponent(emailText)}`;
    window.location.href = mailtoLink;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-bold text-lg text-slate-900">{quote.part?.name}</h3>
              <Badge className={getStatusColor(quote.status)}>
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
              <div>
                <p className="text-slate-600">Part Number</p>
                <p className="font-mono font-semibold text-slate-900">{quote.part?.part_number}</p>
              </div>
              <div>
                <p className="text-slate-600">Quantity</p>
                <p className="font-semibold text-slate-900">{quote.quantity_requested} units</p>
              </div>
              <div>
                <p className="text-slate-600">Supplier</p>
                <p className="font-semibold text-slate-900">{quote.supplier?.name}</p>
              </div>
              <div>
                <p className="text-slate-600">Created</p>
                <p className="font-semibold text-slate-900">
                  {new Date(quote.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {quote.request_notes && (
              <div className="mb-3 p-2 bg-slate-50 rounded border-l-4 border-teal-500 text-sm">
                <p className="text-slate-600"><strong>Notes:</strong> {quote.request_notes}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-4">
            {quote.status === 'pending' && (
              <>
                <button
                  onClick={handleOpenEmail}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Send email"
                >
                  <Mail className="h-5 w-5" />
                </button>
                <button
                  onClick={handleCopyEmail}
                  className="p-2 text-slate-600 hover:bg-slate-50 rounded transition-colors"
                  title="Copy email text"
                >
                  {copiedEmail ? <Badge className="bg-green-600">✓</Badge> : <Copy className="h-5 w-5" />}
                </button>
              </>
            )}

            {quote.status === 'received' && (
              <button
                onClick={onApprove}
                className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                title="Approve quote"
              >
                <FileText className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuoteManagementHub;