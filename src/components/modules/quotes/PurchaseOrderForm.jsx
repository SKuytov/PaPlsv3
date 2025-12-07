import React, { useState } from 'react';
import { X, Send, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { dbService } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const PurchaseOrderForm = ({ quote, onComplete, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const totalPrice = quote.quantity_requested * (quote.quotes?.quoted_unit_price || 0);

  const handleCreatePO = async (e) => {
    e.preventDefault();

    if (!deliveryDate) {
      toast({
        variant: 'destructive',
        title: 'Required',
        description: 'Please enter expected delivery date'
      });
      return;
    }

    setLoading(true);
    try {
      const { data: po, error } = await dbService.createPurchaseOrder({
        quote_request_id: quote.id,
        supplier_id: quote.supplier_id,
        part_id: quote.part_id,
        quantity: quote.quantity_requested,
        unit_price: quote.quotes?.quoted_unit_price || 0,
        delivery_address: deliveryAddress,
        expected_arrival_date: deliveryDate
      }, user.id);

      if (error) throw error;

      toast({
        title: 'Purchase Order Created!',
        description: `PO Number: ${po.po_number}`
      });

      onComplete?.(po);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-2xl font-bold text-slate-900">Create Purchase Order</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCreatePO} className="space-y-6">
          {/* Quote Summary */}
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-teal-600 font-bold">PART</p>
                  <p className="font-semibold text-slate-900">{quote.part?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-teal-600 font-bold">SUPPLIER</p>
                  <p className="font-semibold text-slate-900">{quote.supplier?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-teal-600 font-bold">QUANTITY</p>
                  <p className="font-semibold">{quote.quantity_requested} units</p>
                </div>
                <div>
                  <p className="text-xs text-teal-600 font-bold">TOTAL PRICE</p>
                  <p className="font-bold text-teal-700">€{totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Details */}
          <div>
            <label className="text-sm font-semibold text-slate-900 block mb-2">
              Expected Delivery Date *
            </label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900 block mb-2">
              Delivery Address (Optional)
            </label>
            <Input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Warehouse or location address"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {loading ? 'Creating...' : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create Purchase Order
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;
