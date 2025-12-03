import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Filter, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dbService } from '@/lib/supabase';
import OrderList from './orders/OrderList';
import CreateOrder from './orders/CreateOrder';
import OrderDetails from './orders/OrderDetails';

const Orders = () => {
  const [view, setView] = useState('list'); // list, create, details
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, value: 0 });

  useEffect(() => {
    if (view === 'list') loadOrders();
  }, [view, filters]);

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await dbService.getOrders(filters);
    if (data) {
      setOrders(data);
      
      // Calc stats (simple client-side for now)
      const pending = data.filter(o => o.status === 'Pending Approval').length;
      const approved = data.filter(o => o.status === 'Approved' || o.status === 'Ordered').length;
      const totalVal = data.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      
      setStats({
         total: data.length,
         pending,
         approved,
         value: totalVal
      });
    }
    setLoading(false);
  };

  const handleViewDetails = async (order) => {
    const { data } = await dbService.getOrderDetails(order.id);
    if (data) {
       setSelectedOrder(data);
       setView('details');
    }
  };

  return (
    <div className="space-y-6">
       {/* Header / Stats - Only show in List View */}
       {view === 'list' && (
          <>
            <div className="flex justify-between items-end">
              <div>
                 <h1 className="text-3xl font-bold text-slate-800">Order Management</h1>
                 <p className="text-slate-600 mt-1">Procurement, approvals, and supplier coordination</p>
              </div>
              <Button onClick={() => setView('create')} className="bg-blue-600 hover:bg-blue-700">
                 <Plus className="w-4 h-4 mr-2" /> New Order
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col">
                  <span className="text-slate-500 text-sm">Total Orders</span>
                  <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col">
                  <span className="text-slate-500 text-sm">Pending Approval</span>
                  <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col">
                  <span className="text-slate-500 text-sm">Active / Ordered</span>
                  <span className="text-2xl font-bold text-green-600">{stats.approved}</span>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col">
                  <span className="text-slate-500 text-sm">Total Value (All)</span>
                  <span className="text-2xl font-bold text-blue-600">€{stats.value.toFixed(0)}</span>
               </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow border flex gap-4 items-center flex-wrap">
               <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    className="w-full pl-9 pr-4 py-2 border rounded-md text-sm" 
                    placeholder="Search orders..."
                    value={filters.search}
                    onChange={e => setFilters({...filters, search: e.target.value})}
                  />
               </div>
               <select 
                 className="p-2 border rounded-md text-sm bg-white"
                 value={filters.status}
                 onChange={e => setFilters({...filters, status: e.target.value})}
               >
                  <option value="all">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Received">Received</option>
                  <option value="Rejected">Rejected</option>
               </select>
            </div>

            <OrderList orders={orders} onViewDetails={handleViewDetails} />
          </>
       )}

       {view === 'create' && (
          <CreateOrder 
             onBack={() => setView('list')} 
             onSuccess={() => { setView('list'); loadOrders(); }} 
          />
       )}

       {view === 'details' && selectedOrder && (
          <OrderDetails 
             order={selectedOrder} 
             onBack={() => setView('list')} 
             onUpdate={() => { handleViewDetails(selectedOrder); }}
          />
       )}
    </div>
  );
};

export default Orders;