import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Package, Check, AlertCircle, Loader2, X, CheckCircle2 } from 'lucide-react';

/**
 * DeliveryIntegration - Receive and verify delivered goods
 * Handles delivery confirmation and status tracking
 */
const DeliveryIntegration = ({ quote, onClose, onSuccess }) => {
  const [deliveryData, setDeliveryData] = useState({
    actual_delivery_date: new Date().toISOString().split('T')[0],
    received_by: '',
    condition_notes: 'Good - No damage observed',
    received_items_count: quote.total_items || 0,
    discrepancies: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleConfirmDelivery = async () => {
    // Validation
    if (!deliveryData.received_by.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please enter who received the goods',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Update quote with delivery details
      const { error } = await supabase
        .from('quote_requests')
        .update({
          delivery_status: 'delivered',
          actual_delivery_date: new Date(deliveryData.actual_delivery_date).toISOString(),
          status: 'received',
          delivery_notes: JSON.stringify({
            received_by: deliveryData.received_by,
            condition_notes: deliveryData.condition_notes,
            received_items_count: deliveryData.received_items_count,
            discrepancies: deliveryData.discrepancies,
            confirmed_at: new Date().toISOString(),
          }),
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: '✅ Delivery Confirmed',
        description: `${quote.total_items || 0} items received from ${quote.suppliers?.name}`,
      });

      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to confirm delivery',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const daysWaited = quote.po_date
    ? Math.floor((new Date() - new Date(quote.po_date)) / (1000 * 60 * 60 * 24))
    : 'N/A';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Confirm Goods Receipt
            </CardTitle>
            <p className="text-xs text-slate-600 mt-1">PO {quote.po_number} from {quote.suppliers?.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <h4 className="font-bold text-slate-900">Order Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-600 font-semibold">PO Date</p>
                <p className="font-bold text-slate-900 mt-1">
                  {quote.po_date ? new Date(quote.po_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-semibold">Expected Delivery</p>
                <p className="font-bold text-slate-900 mt-1">
                  {quote.expected_delivery_date
                    ? new Date(quote.expected_delivery_date).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-semibold">Days Waited</p>
                <p className="font-bold text-slate-900 mt-1">{daysWaited} days</p>
              </div>
            </div>
          </div>

          {/* Expected Items */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900">Items Ordered</h4>
            {quote.items && quote.items.length > 0 ? (
              <div className="space-y-2">
                {quote.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-green-50 rounded-lg flex items-center justify-between border border-green-200">
                    <div>
                      <p className="font-semibold text-slate-900">{item.part_name}</p>
                      <p className="text-xs text-slate-600">Expected Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">✓ {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600 italic">No items specified</p>
            )}
          </div>

          {/* Received Items Count */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              Total Items Received
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={deliveryData.received_items_count}
                onChange={(e) =>
                  setDeliveryData({ ...deliveryData, received_items_count: parseInt(e.target.value) || 0 })
                }
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900"
              />
              <span className="text-sm text-slate-600">of {quote.total_items || 0} expected</span>
            </div>
            {deliveryData.received_items_count === quote.total_items && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <Check className="h-4 w-4" />
                All items received
              </p>
            )}
            {deliveryData.received_items_count !== quote.total_items && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {quote.total_items - deliveryData.received_items_count} items missing
              </p>
            )}
          </div>

          {/* Delivery Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              Delivery Date
            </label>
            <input
              type="date"
              value={deliveryData.actual_delivery_date}
              onChange={(e) => setDeliveryData({ ...deliveryData, actual_delivery_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900"
            />
          </div>

          {/* Received By */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              Received By (Name) *
            </label>
            <input
              type="text"
              value={deliveryData.received_by}
              onChange={(e) => setDeliveryData({ ...deliveryData, received_by: e.target.value })}
              placeholder="e.g., John Smith"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900"
            />
          </div>

          {/* Condition Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              Condition of Goods
            </label>
            <textarea
              value={deliveryData.condition_notes}
              onChange={(e) => setDeliveryData({ ...deliveryData, condition_notes: e.target.value })}
              placeholder="e.g., Good - No damage observed"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900"
            />
          </div>

          {/* Discrepancies */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              Any Discrepancies? (Optional)
            </label>
            <textarea
              value={deliveryData.discrepancies}
              onChange={(e) => setDeliveryData({ ...deliveryData, discrepancies: e.target.value })}
              placeholder="e.g., 5 units damaged, 2 units wrong color, etc."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900"
            />
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-900">Ready to Confirm</p>
            </div>
            <p className="text-sm text-green-800">
              Confirming receipt of {deliveryData.received_items_count} items from {quote.suppliers?.name}.
            </p>
            <p className="text-xs text-green-700">
              Status will be updated to "Received" and delivery date recorded.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelivery}
              disabled={submitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Receipt
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryIntegration;