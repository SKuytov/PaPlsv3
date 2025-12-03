import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { dbService } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const CreateOrder = ({ onBack, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [suppliers, setSuppliers] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const loadSuppliers = async () => {
      const { data } = await dbService.getSuppliers();
      if (data) setSuppliers(data);
    };
    loadSuppliers();
  }, []);

  const handleSupplierSelect = async (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setSelectedSupplier(supplier);
    
    setLoading(true);
    const { data } = await dbService.getPartsBySupplier(supplierId);
    if (data) {
      setAvailableParts(data.map(item => ({
        ...item.part,
        price: item.unit_price // Attach price from supplier option
      })));
    }
    setLoading(false);
    setStep(2);
    setOrderItems([]); // Reset items if supplier changes
  };

  const addItem = (partId) => {
    const part = availableParts.find(p => p.id === partId);
    if (!part) return;
    
    if (orderItems.find(i => i.part_id === partId)) {
      toast({ title: "Already Added", description: "This part is already in your order list." });
      return;
    }

    setOrderItems([...orderItems, {
      part_id: part.id,
      name: part.name,
      part_number: part.part_number,
      quantity: 1,
      unit_price: part.price || 0,
      total: part.price || 0
    }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
       const qty = parseFloat(field === 'quantity' ? value : newItems[index].quantity) || 0;
       const price = parseFloat(field === 'unit_price' ? value : newItems[index].unit_price) || 0;
       newItems[index].total = qty * price;
    }
    setOrderItems(newItems);
  };

  const removeItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const handleSubmit = async (status = 'Draft') => {
    if (orderItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Order", description: "Please add at least one item." });
      return;
    }

    setLoading(true);
    try {
      const orderNumber = await dbService.getNextOrderNumber();
      const total = calculateTotal();

      const orderData = {
        order_number: orderNumber,
        created_by: user.id,
        status: status,
        total_amount: total,
        approval_notes: notes,
        created_at: new Date().toISOString()
      };

      const itemsPayload = orderItems.map(item => ({
        part_id: item.part_id,
        supplier_id: selectedSupplier.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total,
        notes: ''
      }));

      const { error } = await dbService.createOrder(orderData, itemsPayload);
      
      if (error) throw error;
      
      toast({ title: "Success", description: `Order ${orderNumber} created as ${status}.` });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to create order." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6 border-b pb-4">
         <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2"/> Back</Button>
         <h2 className="text-xl font-bold text-slate-800">Create New Order</h2>
      </div>

      {/* Steps Indicator */}
      <div className="flex justify-center mb-8">
         <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step >= 1 ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>1. Supplier</div>
         <div className="w-8 h-1 bg-slate-200"></div>
         <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step >= 2 ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>2. Items</div>
         <div className="w-8 h-1 bg-slate-200"></div>
         <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step >= 3 ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>3. Review</div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
           <h3 className="font-semibold text-lg">Select Supplier</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppliers.map(s => (
                 <div 
                   key={s.id} 
                   onClick={() => handleSupplierSelect(s.id)}
                   className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all flex justify-between items-center"
                 >
                    <div>
                       <p className="font-bold text-slate-800">{s.name}</p>
                       <p className="text-sm text-slate-500">{s.email || 'No email'}</p>
                    </div>
                    <div className="text-right">
                       <span className="text-xs bg-slate-100 px-2 py-1 rounded">Lead Time: {s.lead_time_days || 7} days</span>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
              <div>
                 <p className="text-sm text-slate-500">Supplier</p>
                 <p className="font-bold text-lg">{selectedSupplier?.name}</p>
              </div>
              <Button onClick={() => setStep(3)} disabled={orderItems.length === 0}>Next: Review Order</Button>
           </div>

           <div className="flex gap-4">
              <div className="w-1/3 border-r pr-4">
                 <h4 className="font-semibold mb-3 text-sm uppercase text-slate-500">Available Parts</h4>
                 <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {availableParts.length === 0 && <p className="text-sm text-slate-400 italic">No parts linked to this supplier.</p>}
                    {availableParts.map(part => (
                       <div key={part.id} className="flex justify-between items-center p-2 border rounded hover:bg-slate-50 text-sm">
                          <div className="overflow-hidden">
                             <p className="font-medium truncate">{part.name}</p>
                             <p className="text-xs text-slate-500">{part.part_number}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => addItem(part.id)}><Plus className="w-4 h-4"/></Button>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="w-2/3 pl-2">
                 <h4 className="font-semibold mb-3 text-sm uppercase text-slate-500">Order Items</h4>
                 <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                       <tr>
                          <th className="p-2">Part</th>
                          <th className="p-2 w-24">Qty</th>
                          <th className="p-2 w-24">Price</th>
                          <th className="p-2 w-24">Total</th>
                          <th className="p-2 w-10"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {orderItems.map((item, idx) => (
                          <tr key={idx}>
                             <td className="p-2">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-slate-500">{item.part_number}</div>
                             </td>
                             <td className="p-2">
                                <input 
                                  type="number" min="1" 
                                  className="w-full border rounded p-1" 
                                  value={item.quantity}
                                  onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                />
                             </td>
                             <td className="p-2">
                                <input 
                                  type="number" min="0" step="0.01"
                                  className="w-full border rounded p-1" 
                                  value={item.unit_price}
                                  onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                                />
                             </td>
                             <td className="p-2 font-bold">€{item.total.toFixed(2)}</td>
                             <td className="p-2">
                                <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                   <Trash2 className="w-4 h-4"/>
                                </button>
                             </td>
                          </tr>
                       ))}
                       {orderItems.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Add parts from the left menu</td></tr>}
                    </tbody>
                 </table>
                 
                 <div className="mt-4 text-right border-t pt-4">
                    <p className="text-lg font-bold">Total: €{calculateTotal().toFixed(2)}</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {step === 3 && (
         <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-lg border">
               <div className="flex justify-between mb-6">
                  <div>
                     <p className="text-sm text-slate-500">Supplier</p>
                     <p className="font-bold text-xl text-slate-800">{selectedSupplier?.name}</p>
                     <p className="text-sm text-slate-600">{selectedSupplier?.contact_person}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm text-slate-500">Total Amount</p>
                     <p className="font-bold text-3xl text-blue-600">€{calculateTotal().toFixed(2)}</p>
                     <p className="text-xs text-slate-400">{orderItems.length} items</p>
                  </div>
               </div>

               <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium text-slate-700">Order Notes / Instructions</label>
                  <textarea 
                     className="w-full border rounded-md p-3 text-sm" 
                     rows={3} 
                     placeholder="Add any specific delivery instructions or notes..."
                     value={notes}
                     onChange={e => setNotes(e.target.value)}
                  />
               </div>

               <div className="border-t pt-4">
                  <h4 className="font-medium mb-2 text-sm text-slate-500">Items Summary</h4>
                  <ul className="space-y-1 text-sm">
                     {orderItems.map((item, i) => (
                        <li key={i} className="flex justify-between">
                           <span>{item.quantity}x {item.name}</span>
                           <span className="font-mono">€{item.total.toFixed(2)}</span>
                        </li>
                     ))}
                  </ul>
               </div>
            </div>

            <div className="flex gap-3 justify-end">
               <Button variant="outline" onClick={() => setStep(2)}>Back to Edit</Button>
               <Button variant="secondary" disabled={loading} onClick={() => handleSubmit('Draft')}>Save as Draft</Button>
               <Button className="bg-green-600 hover:bg-green-700" disabled={loading} onClick={() => handleSubmit('Pending Approval')}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Submit for Approval
               </Button>
            </div>
         </div>
      )}
    </div>
  );
};

export default CreateOrder;