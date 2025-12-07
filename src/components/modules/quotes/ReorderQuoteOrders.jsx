import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, Truck, Package } from 'lucide-react';
import { dbService } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import QuoteApprovalFlow from './QuoteApprovalFlow';
import PurchaseOrderFlow from './PurchaseOrderFlow';
import OrderTrackingPanel from './OrderTrackingPanel';

const ReorderQuoteOrders = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('pending-quotes');
  const [pendingQuotes, setPendingQuotes] = useState([]);
  const [approvedQuotes, setApprovedQuotes] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending-quotes') {
        const { data } = await dbService.getQuoteRequests('pending');
        setPendingQuotes(data || []);
      } else if (activeTab === 'approved-quotes') {
        const { data } = await dbService.getQuoteRequests('received');
        setApprovedQuotes(data || []);
      } else if (activeTab === 'active-orders') {
        const { data } = await dbService.getActiveOrders();
        setActiveOrders(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Quote & Order Management</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ✕
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending-quotes" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Quotes ({pendingQuotes.length})
            </TabsTrigger>
            <TabsTrigger value="approved-quotes" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved ({approvedQuotes.length})
            </TabsTrigger>
            <TabsTrigger value="active-orders" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Orders ({activeOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending-quotes" className="mt-6">
            <div className="text-slate-600">
              {pendingQuotes.length === 0 ? (
                <p className="text-center py-8">No pending quotes. Quotes will appear here once suppliers respond.</p>
              ) : (
                <p>Waiting for supplier responses...</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approved-quotes" className="mt-6">
            <QuoteApprovalFlow
              quotes={approvedQuotes}
              onApprovalComplete={loadData}
            />
          </TabsContent>

          <TabsContent value="active-orders" className="mt-6">
            <OrderTrackingPanel
              orders={activeOrders}
              onStatusUpdate={loadData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReorderQuoteOrders;
