import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OrderList = ({ orders, onViewDetails }) => {
  
  const getStatusColor = (status) => {
    const map = {
      'Draft': 'bg-slate-100 text-slate-700',
      'Pending Approval': 'bg-yellow-100 text-yellow-700',
      'Approved': 'bg-blue-100 text-blue-700',
      'Ordered': 'bg-purple-100 text-purple-700',
      'Received': 'bg-green-100 text-green-700',
      'Rejected': 'bg-red-100 text-red-700'
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-xl shadow border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b">
             <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Created By</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
             {orders.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No orders found matching your criteria.</td></tr>
             ) : (
                orders.map(order => (
                   <tr key={order.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-800">{order.order_number}</td>
                      <td className="p-4 text-slate-600">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                         {order.items?.[0]?.supplier?.name || 'Unknown Supplier'}
                      </td>
                      <td className="p-4 text-slate-600">{order.creator?.full_name || 'Unknown'}</td>
                      <td className="p-4 font-bold text-slate-700">€{order.total_amount?.toFixed(2)}</td>
                      <td className="p-4">
                         <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                         </span>
                      </td>
                      <td className="p-4 text-right">
                         <Button size="sm" variant="ghost" onClick={() => onViewDetails(order)}>
                            <Eye className="w-4 h-4 text-slate-500" />
                         </Button>
                      </td>
                   </tr>
                ))
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderList;