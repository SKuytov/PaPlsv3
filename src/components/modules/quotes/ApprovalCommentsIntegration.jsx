import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { MessageSquare, Send, AlertCircle, Loader2, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ApprovalCommentsIntegration - Save approval comments to database
 * Handles approval workflow with comment storage
 */
const ApprovalCommentsIntegration = ({ quote, onClose, onSuccess, onApprove }) => {
  const [comments, setComments] = useState('');
  const [approving, setApproving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleApproveQuote = async () => {
    setApproving(true);
    try {
      // Update quote with approval details
      const { error } = await supabase
        .from('quote_requests')
        .update({
          status: 'approved',
          approval_comments: comments || 'Approved',
          approved_by: user?.id,
          approval_date: new Date().toISOString(),
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: '✅ Quote Approved',
        description: 'Quote approved successfully with comments saved',
      });

      onApprove?.({
        comments,
        approved_by: user?.id,
        approval_date: new Date().toISOString(),
      });

      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Error approving quote:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve quote',
      });
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Approve Quote
            </CardTitle>
            <p className="text-xs text-slate-600 mt-1">Quote {quote.quote_id} from {quote.suppliers?.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Quote Summary */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <h4 className="font-bold text-slate-900">Quote Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-600 font-semibold">Supplier</p>
                <p className="font-bold text-slate-900 mt-1">{quote.suppliers?.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-semibold">Total Value</p>
                <p className="font-bold text-green-600 mt-1">€{parseFloat(quote.estimated_total || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-semibold">Items</p>
                <p className="font-bold text-slate-900 mt-1">{quote.total_items || 0} items</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-semibold">Delivery</p>
                <p className="font-bold text-slate-900 mt-1">
                  {quote.supplier_response?.delivery_date
                    ? new Date(quote.supplier_response.delivery_date).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Supplier Response Details */}
          {quote.supplier_response && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <h4 className="font-bold text-blue-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Supplier Response
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-blue-700 font-semibold">Quoted Price</p>
                  <p className="font-bold text-blue-900 mt-1">€{quote.supplier_response.quoted_price_total?.toFixed(2) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-semibold">Payment Terms</p>
                  <p className="font-bold text-blue-900 mt-1">{quote.supplier_response.payment_terms || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-semibold">Lead Time</p>
                  <p className="font-bold text-blue-900 mt-1">{quote.supplier_response.lead_time_days || 'N/A'} days</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-semibold">Quality</p>
                  <p className="font-bold text-blue-900 mt-1">{quote.supplier_response.quality_notes?.substring(0, 30) || 'N/A'}...</p>
                </div>
              </div>
            </div>
          )}

          {/* Approval Comments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-900">Approval Comments</label>
              <span className="text-xs text-slate-500">{comments.length}/500</span>
            </div>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value.slice(0, 500))}
              placeholder="Why are you approving this quote? E.g., Best price, Fast delivery, High quality, Preferred supplier, etc."
              rows={5}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900 resize-none"
            />
            <p className="text-xs text-slate-600">
              These comments will be saved with the approval for audit and reference purposes.
            </p>
          </div>

          {/* Approval Confirmation */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-900">Ready to Approve</p>
            </div>
            <p className="text-sm text-green-800">
              You are about to approve this quote from <strong>{quote.suppliers?.name}</strong>.
            </p>
            <p className="text-xs text-green-700">
              ✓ Your approval will be recorded with timestamp
              <br />
              ✓ Comments will be saved for audit trail
              <br />
              ✓ Status will change to "Approved"
              <br />
              ✓ Next step: Convert to Purchase Order
            </p>
          </div>

          {/* Warning if no comments */}
          {!comments.trim() && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">No Comments Provided</p>
                <p className="text-xs text-amber-700 mt-1">
                  It's recommended to add comments explaining why you selected this quote.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveQuote}
              disabled={approving}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {approving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Approve Quote
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovalCommentsIntegration;