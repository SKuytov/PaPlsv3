import React, { useState, useEffect } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, CheckCircle, Clock, XCircle, AlertCircle, Eye, X } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import * as Dialog from '@radix-ui/react-dialog';

const QuoteTrackingDashboard = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'received', 'accepted'
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteData, setQuoteData] = useState({
    quoted_unit_price: '',
    quoted_delivery_days: '',
    quote_notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadQuotes();
  }, [filter]);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('quote_requests')
        .select(`
          *,
          part:spare_parts(id, name, part_number),
          supplier:suppliers(id, name, email),
          quotes(*)
        `)
        .order('requested_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load quotes"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkQuoteReceived = async (quoteRequest) => {
    setSelectedQuote(quoteRequest);
    setQuoteData({
      quoted_unit_price: '',
      quoted_delivery_days: '',
      quote_notes: ''
    });
    setShowQuoteModal(true);
  };

  const handleSaveQuote = async () => {
    if (!quoteData.quoted_unit_price || !quoteData.quoted_delivery_days) {
      toast({
        variant: "destructive",
        title: "Required Fields",
        description: "Please fill in unit price and delivery days"
      });
      return;
    }

    try {
      // Create quote record
      const { error: quoteError } = await supabase
        .from('quotes')
        .insert({
          quote_request_id: selectedQuote.id,
          quoted_unit_price: parseFloat(quoteData.quoted_unit_price),
          quoted_delivery_days: parseInt(quoteData.quoted_delivery_days),
          quoted_delivery_date: new Date(Date.now() + parseInt(quoteData.quoted_delivery_days) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          quote_notes: quoteData.quote_notes,
          received_at: new Date().toISOString()
        });

      if (quoteError) throw quoteError;

      // Update quote request status
      const { error: updateError } = await supabase
        .from('quote_requests')
        .update({ status: 'received' })
        .eq('id', selectedQuote.id);

      if (updateError) throw updateError;

      // Add to price history
      await supabase
        .from('supplier_price_history')
        .insert({
          part_id: selectedQuote.part_id,
          supplier_id: selectedQuote.supplier_id,
          unit_price: parseFloat(quoteData.quoted_unit_price),
          lead_time_days: parseInt(quoteData.quoted_delivery_days)
        });

      toast({
        title: "Quote Recorded!",
        description: "Quote received and added to price history"
      });

      setShowQuoteModal(false);
      loadQuotes();
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const handleAcceptQuote = async (quoteRequest) => {
    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({ status: 'accepted' })
        .eq('id', quoteRequest.id);

      if (error) throw error;

      toast({
        title: "Quote Accepted!",
        description: "You can now place an order for this quote"
      });

      loadQuotes();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Awaiting Response', icon: Clock },
      received: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Quote Received', icon: CheckCircle },
      accepted: { bg: 'bg-green-100', text: 'text-green-700', label: 'Accepted', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected', icon: XCircle },
      expired: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Expired', icon: XCircle }
    };

    const config = statusConfig[status];
    const Icon = config?.icon || Clock;

    return (
      <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${config.bg}`}>
        <Icon className="h-3 w-3" />
        <span className={`text-xs font-semibold ${config.text}`}>{config.label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Quote Tracking</h2>
        <div className="flex gap-2">
          {['all', 'pending', 'received', 'accepted'].map(status => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Quotes List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading quotes...</div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No quotes found</div>
        ) : (
          quotes.map(quote => (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Part Info */}
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">PART</p>
                    <p className="font-semibold text-slate-900">{quote.part?.name}</p>
                    <p className="text-xs text-slate-600">{quote.part?.part_number}</p>
                  </div>

                  {/* Supplier & Qty */}
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">SUPPLIER</p>
                    <p className="font-semibold text-slate-900">{quote.supplier?.name}</p>
                    <p className="text-xs text-slate-600">Qty: {quote.quantity_requested}</p>
                  </div>

                  {/* Status & Date */}
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">STATUS</p>
                    <div className="mt-1">
                      {getStatusBadge(quote.status)}
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      {new Date(quote.requested_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-end justify-end gap-2">
                    {quote.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkQuoteReceived(quote)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Mark Received
                      </Button>
                    )}
                    {quote.status === 'received' && (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptQuote(quote)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Accept
                      </Button>
                    )}
                    {quote.status === 'accepted' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                      >
                        Ready to Order
                      </Button>
                    )}
                  </div>
                </div>

                {/* Quote Details (if received) */}
                {quote.quotes && quote.quotes.length > 0 && quote.quotes[0] && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-600 font-semibold">QUOTED PRICE</p>
                      <p className="text-lg font-bold text-teal-600">€{quote.quotes[0].quoted_unit_price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold">DELIVERY</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {quote.quotes[0].quoted_delivery_days} days
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold">ETA</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(quote.quotes[0].quoted_delivery_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quote Received Modal */}
      <Dialog.Root open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <Dialog.Content className="w-full max-w-md bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  Record Quote
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              {selectedQuote && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-slate-900">{selectedQuote.part?.name}</p>
                    <p className="text-xs text-slate-600">{selectedQuote.supplier?.name}</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">Unit Price (€)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={quoteData.quoted_unit_price}
                      onChange={(e) => setQuoteData({...quoteData, quoted_unit_price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">Delivery Days</label>
                    <Input
                      type="number"
                      min="1"
                      value={quoteData.quoted_delivery_days}
                      onChange={(e) => setQuoteData({...quoteData, quoted_delivery_days: e.target.value})}
                      placeholder="Number of days"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">Notes</label>
                    <Textarea
                      value={quoteData.quote_notes}
                      onChange={(e) => setQuoteData({...quoteData, quote_notes: e.target.value})}
                      placeholder="Any notes about this quote..."
                      className="resize-none h-20"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Dialog.Close asChild>
                      <Button variant="outline" className="flex-1">Cancel</Button>
                    </Dialog.Close>
                    <Button
                      onClick={handleSaveQuote}
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                    >
                      Save Quote
                    </Button>
                  </div>
                </div>
              )}
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default QuoteTrackingDashboard;