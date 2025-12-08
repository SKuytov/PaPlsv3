import React, { useState } from 'react';
import { X, Upload, Loader2, AlertCircle, CheckCircle, DollarSign, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * QuoteResponseModal - Record supplier's response/quote
 * Allows capturing supplier's pricing, delivery date, terms, and conditions
 */
const QuoteResponseModal = ({ quote, supplier, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const { toast } = useToast();

  // Safe supplier data
  const supplierName = supplier?.name || quote.suppliers?.name || 'Unknown Supplier';
  const supplierEmail = supplier?.email || quote.suppliers?.email || '-';

  const [response, setResponse] = useState({
    quoted_price_total: '',
    quoted_price_per_unit: '',
    delivery_date: '',
    payment_terms: 'Net 30',
    lead_time_days: '',
    quality_notes: '',
    special_conditions: '',
    attachments: []
  });

  // Calculate per-unit price if total price is entered
  const handleTotalPriceChange = (e) => {
    const total = e.target.value;
    setResponse({ ...response, quoted_price_total: total });
    
    if (total && quote.total_items) {
      const perUnit = (parseFloat(total) / quote.total_items).toFixed(2);
      setResponse(prev => ({ ...prev, quoted_price_per_unit: perUnit }));
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    setAttachments([...attachments, ...newFiles]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!response.quoted_price_total) {
      toast({
        variant: 'destructive',
        title: 'Missing Price',
        description: 'Please enter the quoted price'
      });
      return;
    }

    if (!response.delivery_date) {
      toast({
        variant: 'destructive',
        title: 'Missing Delivery Date',
        description: 'Please provide a delivery date'
      });
      return;
    }

    setLoading(true);
    try {
      // Update quote with response data
      const { error: updateError } = await supabase
        .from('quote_requests')
        .update({
          status: 'responded',
          supplier_response: {
            quoted_price_total: parseFloat(response.quoted_price_total),
            quoted_price_per_unit: parseFloat(response.quoted_price_per_unit || 0),
            delivery_date: response.delivery_date,
            payment_terms: response.payment_terms,
            lead_time_days: parseInt(response.lead_time_days) || null,
            quality_notes: response.quality_notes,
            special_conditions: response.special_conditions,
            response_received_at: new Date().toISOString()
          },
          response_attachments: attachments.map(a => ({
            name: a.name,
            size: a.size,
            type: a.type
          }))
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      toast({
        title: '✅ Response Recorded',
        description: `Quote response from ${supplierName} saved successfully`
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error recording response:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to record response'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
          <div>
            <CardTitle className="text-xl">📧 Record Supplier Response</CardTitle>
            <p className="text-xs text-slate-600 mt-1">Quote ID: {quote.quote_id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Supplier Info */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 font-semibold uppercase">Supplier Response From</p>
            <p className="text-lg font-bold text-slate-900 mt-2">{supplierName}</p>
            <p className="text-sm text-slate-600 mt-1">{supplierEmail}</p>
          </div>

          {/* Quote Items Being Quoted */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3">Items in This Quote</h4>
            <div className="space-y-2">
              {quote.items && quote.items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{item.part_name || 'Unknown Part'}</p>
                    <p className="text-xs text-slate-600">Qty: {item.quantity || 0}</p>
                  </div>
                </div>
              ))}
              {quote.items && quote.items.length > 3 && (
                <p className="text-xs text-slate-600 px-2 py-1">... and {quote.items.length - 3} more items</p>
              )}
            </div>
          </div>

          {/* Price Section */}
          <div className="space-y-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing Information
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Total Quoted Price (€) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={response.quoted_price_total}
                  onChange={handleTotalPriceChange}
                  placeholder="e.g., 1500.00"
                  className="text-lg font-bold text-teal-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Price Per Unit (€)
                </label>
                <div className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-lg font-bold text-teal-600">
                  {response.quoted_price_per_unit ? `€${parseFloat(response.quoted_price_per_unit).toFixed(2)}` : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Delivery & Timeline
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Promised Delivery Date *
                </label>
                <Input
                  type="date"
                  value={response.delivery_date}
                  onChange={(e) => setResponse({ ...response, delivery_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Lead Time (days)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={response.lead_time_days}
                  onChange={(e) => setResponse({ ...response, lead_time_days: e.target.value })}
                  placeholder="e.g., 14"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Payment Terms
              </label>
              <select
                value={response.payment_terms}
                onChange={(e) => setResponse({ ...response, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="COD">Cash on Delivery</option>
                <option value="2/10 Net 30">2/10 Net 30 (2% discount if paid in 10 days)</option>
                <option value="Prepayment">Prepayment Required</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Quality & Conditions */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quality & Special Conditions
            </h4>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Quality Notes, Certifications, Warranty Info
              </label>
              <Textarea
                value={response.quality_notes}
                onChange={(e) => setResponse({ ...response, quality_notes: e.target.value })}
                placeholder="e.g., ISO 9001 certified, 2-year warranty, RoHS compliant"
                className="resize-none h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Special Conditions, Terms, or Notes
              </label>
              <Textarea
                value={response.special_conditions}
                onChange={(e) => setResponse({ ...response, special_conditions: e.target.value })}
                placeholder="e.g., Minimum order quantity, bulk discounts available, limited stock, rush charges apply"
                className="resize-none h-20"
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Attach Supplier Quote Documents
            </h4>
            <p className="text-sm text-slate-600">PDF, image, or document with supplier's official quote</p>

            <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center hover:bg-amber-100/50 transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                <p className="font-semibold text-amber-900">Click to upload or drag files</p>
                <p className="text-xs text-amber-700 mt-1">PDF, Images, or Documents</p>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Attached Files ({attachments.length})</p>
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                    <div className="text-sm">
                      <p className="font-semibold text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-600">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-600 font-semibold uppercase">Quoted Total</p>
                <p className="text-xl font-bold text-teal-600 mt-1">
                  €{response.quoted_price_total ? parseFloat(response.quoted_price_total).toFixed(2) : '0.00'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-semibold uppercase">Delivery</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {response.delivery_date ? new Date(response.delivery_date).toLocaleDateString() : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-semibold uppercase">Payment Terms</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{response.payment_terms}</p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold">💡 Pro Tip:</p>
              <p>Once saved, this response will appear in the Quote Comparison view. You'll be able to compare this supplier's offer with others side-by-side.</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Response
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteResponseModal;