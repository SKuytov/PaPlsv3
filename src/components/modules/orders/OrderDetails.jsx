import React, { useState } from 'react';
import { ArrowLeft, Check, X, Truck, PackageCheck, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { dbService } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';

const OrderDetails = ({ order, onBack, onUpdate }) => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const canApprove = ['God Admin', 'Technical Director'].includes(userRole?.name);
  const canReceive = ['God Admin', 'Technical Director', 'Head Technician', 'Building Tech'].includes(userRole?.name);

  const handleStatusUpdate = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to update status to ${newStatus}?`)) return;
    
    setIsProcessing(true);
    try {
      const updates = {
         ...(newStatus === 'Approved' ? { approved_by: user.id, approved_at: new Date().toISOString() } : {}),
         ...(newStatus === 'Ordered' ? { ordered_at: new Date().toISOString() } : {}),
         ...(newStatus === 'Received' ? { received_at: new Date().toISOString() } : {})
      };
      
      await dbService.updateOrderStatus(order.id, newStatus, updates);
      toast({ title: "Updated", description: `Order marked as ${newStatus}` });
      onUpdate();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Failed to update status" });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportPDF = () => {
     const doc = new jsPDF();
     doc.setFontSize(20);
     doc.text(`Purchase Order: ${order.order_number}`, 20, 20);
     
     doc.setFontSize(12);
     doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 35);
     doc.text(`Supplier: ${order.items?.[0]?.supplier?.name}`, 20, 45);
     doc.text(`Status: ${order.status}`, 20, 55);
     
     let y = 75;
     doc.setFontSize(10);
     doc.text("Item", 20, y);
     doc.text("Qty", 120, y);
     doc.text("Total", 160, y);
     
     y += 5;
     doc.line(20, y, 190, y);
     y += 10;

     order.items?.forEach(item => {
        doc.text(item.part?.name || 'Item', 20, y);
        doc.text(item.quantity?.toString(), 120, y);
        doc.text(`EUR ${item.total_price}`, 160, y);
        y += 10;
     });
     
     doc.line(20, y, 190, y);
     y += 10;
     doc.setFontSize(12);
     doc.text(`Grand Total: EUR ${order.total_amount?.toFixed(2)}`, 120, y);
     
     doc.save(`${order.order_number}.pdf`);
  };

  return (
    <div className="bg-white rounded-xl shadow border p-8">
       <div className="flex justify-between items-start mb-8">
          <div>
             <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 pl-0 hover:bg-transparent hover:text-blue-600"><ArrowLeft className="w-4 h-4 mr-2"/> Back to List</Button>
             <h1 className="text-3xl font-bold text-slate-800">{order.order_number}</h1>
             <p className="text-slate-500">Created on {new Date(order.created_at).toLocaleDateString()} by {order.creator?.full_name}</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
             <div className="px-4 py-1 rounded-full text-sm font-bold bg-slate-100 border border-slate-200 shadow-sm">
                {order.status}
             </div>
             {order.approved_by && (
                <p className="text-xs text-slate-400">Approved by: {order.approver?.full_name}</p>
             )}
          </div>
       </div>

       {/* Action Bar */}
       <div className="flex flex-wrap gap-3 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <Button variant="outline" size="sm" onClick={exportPDF}>
             <FileDown className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          
          <div className="flex-1"></div>

          {/* Workflow Buttons */}
          {order.status === 'Pending Approval' && canApprove && (
             <>
               <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('Rejected')} disabled={isProcessing}>
                  <X className="w-4 h-4 mr-2" /> Reject
               </Button>
               <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate('Approved')} disabled={isProcessing}>
                  <Check className="w-4 h-4 mr-2" /> Approve Order
               </Button>
             </>
          )}
          
          {order.status === 'Approved' && (
             <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleStatusUpdate('Ordered')} disabled={isProcessing}>
                <Truck className="w-4 h-4 mr-2" /> Mark as Ordered
             </Button>
          )}
          
          {order.status === 'Ordered' && canReceive && (
             <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => handleStatusUpdate('Received')} disabled={isProcessing}>
                <PackageCheck className="w-4 h-4 mr-2" /> Receive Goods
             </Button>
          )}
       </div>

       {/* Details Grid */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="md:col-span-2">
             <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2">Order Items</h3>
             <table className="w-full text-sm">
                <thead className="text-slate-500 text-left">
                   <tr>
                      <th className="pb-3">Part Details</th>
                      <th className="pb-3">Qty</th>
                      <th className="pb-3">Unit Price</th>
                      <th className="pb-3 text-right">Total</th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   {order.items?.map(item => (
                      <tr key={item.id}>
                         <td className="py-3">
                            <p className="font-medium">{item.part?.name}</p>
                            <p className="text-xs text-slate-500">{item.part?.part_number}</p>
                         </td>
                         <td className="py-3">{item.quantity} {item.part?.unit_of_measure}</td>
                         <td className="py-3">€{item.unit_price?.toFixed(2)}</td>
                         <td className="py-3 text-right font-medium">€{item.total_price?.toFixed(2)}</td>
                      </tr>
                   ))}
                </tbody>
                <tfoot>
                   <tr>
                      <td colSpan={3} className="pt-4 text-right font-bold text-slate-600">Grand Total:</td>
                      <td className="pt-4 text-right font-bold text-xl text-blue-600">€{order.total_amount?.toFixed(2)}</td>
                   </tr>
                </tfoot>
             </table>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg h-fit border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4">Supplier Info</h3>
             {order.items?.[0]?.supplier && (
               <div className="space-y-3 text-sm">
                  <p className="font-semibold text-lg">{order.items[0].supplier.name}</p>
                  <div className="text-slate-600 space-y-1">
                     <p>{order.items[0].supplier.address}</p>
                     <p>Contact: {order.items[0].supplier.contact_person}</p>
                     <p>{order.items[0].supplier.email}</p>
                     <p>{order.items[0].supplier.phone}</p>
                  </div>
               </div>
             )}
             
             <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="font-bold text-slate-800 mb-2">Notes</h3>
                <p className="text-sm text-slate-600 italic">{order.approval_notes || "No notes provided."}</p>
             </div>
          </div>
       </div>
    </div>
  );
};

export default OrderDetails;