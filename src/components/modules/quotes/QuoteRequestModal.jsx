import React, { useState } from 'react';
import { X, Send, Calendar, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as Dialog from '@radix-ui/react-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Helper: Generate Unique Quote Request ID
const generateQuoteRequestId = () => {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `QR-${date}-${random}`;
};

const QuoteRequestModal = ({ open, onOpenChange, part, supplier, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  // Generate ID when modal opens
  React.useEffect(() => {
    if (open) {
      setRequestId(generateQuoteRequestId());
      setQuantity('');
      setEstimatedPrice('');
      setNotes('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!quantity || parseInt(quantity) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Quantity",
        description: "Please enter a valid quantity"
      });
      return;
    }

    setLoading(true);
    try {
      // Create quote request
      const { data: quoteRequest, error: qrError } = await supabase
        .from('quote_requests')
        .insert({
          id: requestId,
          part_id: part.id,
          supplier_id: supplier.id,
          quantity_requested: parseInt(quantity),
          requested_unit_price: estimatedPrice ? parseFloat(estimatedPrice) : null,
          status: 'pending',
          request_notes: notes,
          created_by: user?.id
        })
        .select()
        .single();

      if (qrError) throw qrError;

      toast({
        title: "Quote Request Created!",
        description: `Request ID: ${requestId} - Copy this for your email to the supplier`
      });

      // Generate email text for user
      const emailSubject = `Quote Request #${requestId} - ${part.name}`;
      const emailBody = `
Quantity: ${quantity} units
Estimated Unit Price: €${estimatedPrice || 'Not specified'}
Notes: ${notes || 'None'}

Please reply with your quote including:
- Unit price
- Delivery date
- Total cost

Reference this Request ID in your response: ${requestId}
      `.trim();

      // Copy to clipboard
      navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);

      onOpenChange(false);
      if (onSuccess) onSuccess(quoteRequest);

    } catch (error) {
      console.error('Error creating quote request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <Dialog.Content className="w-full max-w-md bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                Request Quote
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Request ID Display */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <label className="text-xs font-semibold text-teal-900">Request ID</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm font-bold text-teal-700 break-all">
                    {requestId}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(requestId);
                      toast({ title: "Copied!", description: "Request ID copied to clipboard" });
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-teal-700 mt-1">Include this in email subject line</p>
              </div>

              {/* Part Info */}
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm font-semibold text-slate-900">{part.name}</p>
                <p className="text-xs text-slate-600">{part.part_number}</p>
              </div>

              {/* Supplier Info */}
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm font-semibold text-slate-900">{supplier.name}</p>
                {supplier.email && <p className="text-xs text-slate-600">{supplier.email}</p>}
              </div>

              {/* Quantity */}
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">
                  Quantity Needed
                </label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  required
                />
              </div>

              {/* Estimated Price */}
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">
                  Estimated Unit Price (Optional)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  placeholder="€ 0.00"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">
                  Notes (Optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requirements or notes for the supplier..."
                  className="resize-none h-20"
                />
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-semibold">Email Format:</p>
                  <p>Include Request ID in subject line so supplier can reference it in their reply</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <Dialog.Close asChild>
                  <Button variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button 
                  type="submit" 
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default QuoteRequestModal;