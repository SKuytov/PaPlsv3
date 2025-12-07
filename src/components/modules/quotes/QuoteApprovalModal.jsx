import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import * as Dialog from '@radix-ui/react-dialog';
import { dbService } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import PurchaseOrderForm from './PurchaseOrderForm';

const QuoteApprovalModal = ({ open, onOpenChange, quote, onApprovalComplete }) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState(null); // 'approve', 'reject', or 'create_po'
  const { user } = useAuth();
  const { toast } = useToast();

  const totalPrice = quote.quantity_requested * (quote.quotes?.quoted_unit_price || 0);
  const needsCEO = totalPrice > 3000;

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Create approval record
      const { data: approval, error } = await dbService.createQuoteApproval(
        quote.id,
        needsCEO ? 'ceo' : 'technical_director',
        user.id
      );

      if (error) throw error;

      // If we approved it, mark it as approved
      await dbService.approveQuote(approval.id, notes, user.id);

      toast({
        title: 'Quote Approved!',
        description: 'Ready to create purchase order'
      });

      onOpenChange(false);
      onApprovalComplete?.();
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

  const handleReject = async () => {
    if (!notes.trim()) {
      toast({
        variant: 'destructive',
        title: 'Required',
        description: 'Please provide rejection reason'
      });
      return;
    }

    setLoading(true);
    try {
      const { data: approval, error } = await dbService.createQuoteApproval(
        quote.id,
        needsCEO ? 'ceo' : 'technical_director',
        user.id
      );

      if (error) throw error;

      await dbService.rejectQuote(approval.id, notes, user.id);

      toast({
        title: 'Quote Rejected',
        description: 'Requester will be notified'
      });

      onOpenChange(false);
      onApprovalComplete?.();
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

  if (action === 'create_po') {
    return (
      <PurchaseOrderForm
        quote={quote}
        onComplete={() => {
          onOpenChange(false);
          onApprovalComplete?.();
        }}
        onCancel={() => setAction(null)}
      />
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-bold text-slate-900">
                Approve Quote
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-6">
              {/* Quote Summary */}
              <Card className="bg-teal-50 border-teal-200">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-xs text-teal-600 font-bold">PART</p>
                    <p className="font-semibold text-slate-900">{quote.part?.name}</p>
                    <p className="text-xs text-slate-600">{quote.part?.part_number}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-teal-600 font-bold">QUANTITY</p>
                      <p className="font-semibold">{quote.quantity_requested} units</p>
                    </div>
                    <div>
                      <p className="text-xs text-teal-600 font-bold">UNIT PRICE</p>
                      <p className="font-semibold">€{(quote.quotes?.quoted_unit_price || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-teal-600 font-bold">TOTAL</p>
                      <p className="font-bold text-teal-700 text-lg">€{totalPrice.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Gate Alert */}
                  <div className={`flex gap-3 p-3 rounded border ${
                    needsCEO
                      ? 'bg-red-50 border-red-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
                      needsCEO ? 'text-red-600' : 'text-blue-600'
                    }`} />
                    <p className={`text-sm ${needsCEO ? 'text-red-700' : 'text-blue-700'}`}>
                      {needsCEO
                        ? '⚠️ Requires CEO approval (exceeds €3,000)'
                        : '✓ Tech Director approval sufficient'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Action Selection */}
              {!action ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-900 block mb-2">
                      Comments (Optional)
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes about this quote..."
                      className="resize-none h-20"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Dialog.Close asChild>
                      <Button variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </Dialog.Close>
                    <Button
                      onClick={() => setAction('reject')}
                      variant="destructive"
                      className="flex-1"
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => setAction('approve')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              ) : action === 'approve' ? (
                <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-green-900">Approve Quote?</p>
                  <p className="text-sm text-green-700">
                    Quote will be marked approved and ready for PO creation.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setAction(null)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {loading ? 'Approving...' : 'Confirm Approval'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-900 block">
                    Rejection Reason *
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Why are you rejecting this quote?..."
                    className="resize-none h-24"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setAction(null)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={loading || !notes.trim()}
                      variant="destructive"
                      className="flex-1"
                    >
                      {loading ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default QuoteApprovalModal;
