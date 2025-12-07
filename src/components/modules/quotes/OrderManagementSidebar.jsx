import React, { useState, useEffect } from 'react';
import { Package, FileText, CheckCircle, Truck, Plus, Filter, Search } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import ManualQuoteRequestModal from './ManualQuoteRequestModal';
import QuoteApprovalPanel from './QuoteApprovalPanel';
import OrderTrackingPanel from './OrderTrackingPanel';
import QuoteTrackingDashboard from './QuoteTrackingDashboard';

/**
 * OrderManagementSidebar Component
 * Comprehensive management system for quotes, approvals, POs, and delivery tracking
 * Organized as tabs within the Orders section
 */
const OrderManagementSidebar = () => {
  const [activeTab, setActiveTab] = useState('quotes'); // quotes, approvals, orders, delivery
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch quote requests
  const fetchQuoteRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quote_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setQuoteRequests(data || []);
    } catch (err) {
      console.error('Error fetching quote requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending approvals
  const fetchPendingApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('status', 'pending_approval')
        .limit(100);

      if (error) throw error;
      setPendingApprovals(data || []);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
    }
  };

  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setPurchaseOrders(data || []);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchQuoteRequests();
    fetchPendingApprovals();
    fetchPurchaseOrders();
  }, []);

  // Filter quote requests
  const filteredRequests = quoteRequests.filter((quote) => {
    const matchesSearch = !searchQuery ||
      quote.part?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.sku?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Tab configuration
  const tabs = [
    {
      id: 'quotes',
      label: 'Quote Requests',
      icon: <FileText className="w-4 h-4" />,
      badge: quoteRequests.length,
      color: 'blue',
    },
    {
      id: 'approvals',
      label: 'Pending Approvals',
      icon: <CheckCircle className="w-4 h-4" />,
      badge: pendingApprovals.length,
      color: 'yellow',
    },
    {
      id: 'orders',
      label: 'Purchase Orders',
      icon: <Package className="w-4 h-4" />,
      badge: purchaseOrders.length,
      color: 'green',
    },
    {
      id: 'delivery',
      label: 'Delivery Tracking',
      icon: <Truck className="w-4 h-4" />,
      badge: purchaseOrders.filter((po) => po.status === 'shipped').length,
      color: 'purple',
    },
  ];

  const getColorClasses = (color, isActive) => {
    const baseClass = isActive ? 'text-white' : 'text-gray-700 dark:text-gray-300';
    const bgClass = isActive
      ? `bg-${color}-600 hover:bg-${color}-700`
      : `bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600`;
    return `${bgClass} ${baseClass}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Order & Quote Management
          </h2>
          <button
            onClick={() => setShowNewQuoteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Quote Request
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
                setFilterStatus('all');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? `bg-${tab.color}-600 text-white`
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === tab.id
                    ? 'bg-white/30 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Search and Filter Bar */}
        {(activeTab === 'quotes' || activeTab === 'orders') && (
          <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by part, supplier, or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {activeTab === 'quotes' && (
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="quoted">Quoted</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              )}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="px-6 py-6">
          {loading && activeTab === 'quotes' && (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                Loading quote requests...
              </div>
            </div>
          )}

          {/* Quote Requests Tab */}
          {activeTab === 'quotes' && (
            <QuoteTrackingDashboard
              quoteRequests={filteredRequests}
              onRefresh={fetchQuoteRequests}
              searchQuery={searchQuery}
            />
          )}

          {/* Pending Approvals Tab */}
          {activeTab === 'approvals' && (
            <QuoteApprovalPanel
              pendingApprovals={pendingApprovals}
              onRefresh={fetchPendingApprovals}
            />
          )}

          {/* Purchase Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {purchaseOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No purchase orders yet</p>
                </div>
              ) : (
                purchaseOrders.map((po) => (
                  <div
                    key={po.id}
                    className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          PO #{po.po_number}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {po.supplier_name} • {po.total_amount} EUR
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        po.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : po.status === 'shipped'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {po.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Delivery Tracking Tab */}
          {activeTab === 'delivery' && (
            <OrderTrackingPanel
              purchaseOrders={purchaseOrders.filter((po) => po.status !== 'completed')}
            />
          )}
        </div>
      </div>

      {/* New Quote Request Modal */}
      {showNewQuoteModal && (
        <ManualQuoteRequestModal
          open={showNewQuoteModal}
          onOpenChange={() => setShowNewQuoteModal(false)}
          onSuccess={() => {
            setShowNewQuoteModal(false);
            fetchQuoteRequests();
          }}
        />
      )}
    </div>
  );
};

export default OrderManagementSidebar;
