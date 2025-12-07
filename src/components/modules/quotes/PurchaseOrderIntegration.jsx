import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Send, Check, AlertCircle, Loader2, X } from 'lucide-react';

/**
 * PurchaseOrderIntegration - Create & Send POs from Approved Quotes
 * Handles PO generation, storage, and status tracking
 */
const PurchaseOrderIntegration = ({ quote, onClose, onSuccess }) => {
  const [poData, setPoData] = useState({
    po_number: generatePONumber(),
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: quote.delivery_date || '',
    special_instructions: '',
    payment_terms: quote.supplier_response?.payment_terms || 'Net 30',
  });
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Generate PO number (e.g., PO-2025-001)
  function generatePONumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000);
    return `PO-${year}-${String(random).padStart(4, '0')}`;
  }

  const handleCreatePO = async () => {
    setSending(true);
    try {
      // Update quote with PO details
      const { error } = await supabase
        .from('quote_requests')
        .update({
          po_number: poData.po_number,
          po_date: new Date(poData.po_date).toISOString(),
          po_status: 'draft',
          status: 'ordered',
          expected_delivery_date: poData.expected_delivery_date,
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: '✅ PO Created',
        description: `Purchase Order ${poData.po_number} created successfully`,
      });

      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Error creating PO:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create Purchase Order',
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendPO = async () => {
    setSending(true);
    try {
      // Update PO status to sent
      const { error } = await supabase
        .from('quote_requests')
        .update({
          po_status: 'sent',
          po_sent_at: new Date().toISOString(),
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: '📧 PO Sent',
        description: `Purchase Order sent to ${quote.suppliers?.name}`,
      });

      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Error sending PO:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send Purchase Order',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Create Purchase Order
            </CardTitle>
            <p className="text-xs text-slate-600 mt-1">From approved quote {quote.quote_id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* PO Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                PO Number
              </label>
              <input
                type="text"
                value={poData.po_number}
                readOnly
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                PO Date
              </label>
              <input
                type="date"
                value={poData.po_date}
                onChange={(e) => setPoData({ ...poData, po_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Supplier Info */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-2">
            <p className="text-xs text-slate-600 font-semibold uppercase">Supplier</p>
            <p className="text-lg font-bold text-slate-900">{quote.suppliers?.name}</p>
            <p className="text-sm text-slate-600">{quote.suppliers?.email}</p>
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <span>📍</span>
              {quote.suppliers?.address || 'No address on file'}
            </p>
          </div>

          {/* Order Details */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900">Order Details</h4>
            {quote.items && quote.items.length > 0 ? (
              <div className="space-y-2">
                {quote.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.part_name}</p>
                      <p className="text-xs text-slate-600">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">€{(item.unit_price * item.quantity).toFixed(2)}</p>
                      <p className="text-xs text-slate-600">@ €{item.unit_price?.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600 italic">No items specified</p>
            )}
          </div>

          {/* Total */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
            <p className="font-semibold text-purple-900">Total Amount</p>
            <p className="text-2xl font-bold text-purple-600">€{parseFloat(quote.estimated_total || 0).toFixed(2)}</p>
          </div>

          {/* Delivery & Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                Expected Delivery
              </label>
              <input
                type="date"
                value={poData.expected_delivery_date}
                onChange={(e) => setPoData({ ...poData, expected_delivery_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                Payment Terms
              </label>
              <input
                type="text"
                value={poData.payment_terms}
                readOnly
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900"
              />
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              Special Instructions (Optional)
            </label>
            <textarea
              value={poData.special_instructions}
              onChange={(e) => setPoData({ ...poData, special_instructions: e.target.value })}
              placeholder="e.g., Rush delivery, Special packaging, Inspect before shipping"
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
            />
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-900">Ready to Send</p>
            </div>
            <p className="text-sm text-green-800">
              This PO will be created with number <strong>{poData.po_number}</strong> and marked as draft.
            </p>
            <p className="text-xs text-green-700">
              You can review the details before sending to the supplier.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePO}
              disabled={sending}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Create PO
                </>
              )}
            </Button>
            <Button
              onClick={handleSendPO}
              disabled={sending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create & Send
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrderIntegration;