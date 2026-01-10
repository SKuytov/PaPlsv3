import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, AlertCircle, CheckCircle, DollarSign, Calendar, FileText, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * QuoteResponseModal - Record supplier's response/quote with item-level pricing
 * Allows capturing per-item pricing, charges, and auto-calculation
 */
const QuoteResponseModal = ({ quote, supplier, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const { toast } = useToast();

  // Safe supplier data
  const supplierName = supplier?.name || quote.suppliers?.name || 'Unknown Supplier';
  const supplierEmail = supplier?.email || quote.suppliers?.email || '-';

  // Initialize item prices from quote items
  const [itemPrices, setItemPrices] = useState(() => {
    if (quote.items && quote.items.length > 0) {
      return quote.items.map((item, idx) => ({
        id: idx,
        part_name: item.part_name || 'Unknown Part',
        quantity: item.quantity || 0,
        unit_price: '',
        line_total: 0
      }));
    }
    return [];
  });

  const [charges, setCharges] = useState({
    transport: '',
    minimum_order_charge: '',
    other_charge_description: '',
    other_charge_amount: ''
  });

  const [response, setResponse] = useState({
    quoted_price_per_unit: '',
    delivery_date: '',
    payment_terms: 'Net 30',
    lead_time_days: '',
    quality_notes: '',
    special_conditions: '',
    attachments: []
  });

  // Calculate line total for an item
  const calculateLineTotal = (quantity, unitPrice) => {
    if (!quantity || !unitPrice) return 0;
    return (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2);
  };

  // Handle item price change
  const handleItemPriceChange = (idx, unitPrice) => {
    const updated = [...itemPrices];
    updated[idx].unit_price = unitPrice;
    updated[idx].line_total = calculateLineTotal(updated[idx].quantity, unitPrice);
    setItemPrices(updated);
  };

  // Calculate subtotal from items
  const subtotal = itemPrices.reduce((sum, item) => sum + (parseFloat(item.line_total) || 0), 0).toFixed(2);

  // Calculate total charges
  const totalCharges = (
    (parseFloat(charges.transport) || 0) +
    (parseFloat(charges.minimum_order_charge) || 0) +
    (parseFloat(charges.other_charge_amount) || 0)
  ).toFixed(2);

  // Calculate grand total
  const grandTotal = (parseFloat(subtotal) + parseFloat(totalCharges)).toFixed(2);

  // Update quoted_price_per_unit based on grand total
  useEffect(() => {
    if (grandTotal && quote.total_items) {
      const perUnit = (parseFloat(grandTotal) / quote.total_items).toFixed(2);
      setResponse(prev => ({ ...prev, quoted_price_per_unit: perUnit }));
    }
  }, [grandTotal, quote.total_items]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      uploaded: false,
      uploading: false,
      path: null,
      url: null
    }));
    setAttachments([...attachments, ...newFiles]);
  };

  const removeAttachment = (id) => {
    setAttachments(attachments.filter((att) => att.id !== id));
  };

  // Upload file to Supabase Storage
  const uploadFile = async (attachment) => {
    try {
      setUploadingFiles(prev => ({ ...prev, [attachment.id]: true }));

      // Create storage path: quotes/{quote_id}/{timestamp}_{filename}
      const timestamp = new Date().getTime();
      const storagePath = `quotes/${quote.id}/${timestamp}_${attachment.name}`;

      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('quote-attachments')
        .upload(storagePath, attachment.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL for the file
      const { data: urlData } = supabase.storage
        .from('quote-attachments')
        .getPublicUrl(storagePath);

      // Update attachment with storage path and URL
      setAttachments(prev => prev.map(att => {
        if (att.id === attachment.id) {
          return {
            ...att,
            uploaded: true,
            uploading: false,
            path: storagePath,
            url: urlData?.publicUrl || null
          };
        }
        return att;
      }));

      toast({
        title: '✅ File Uploaded',
        description: `${attachment.name} uploaded successfully`
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadingFiles(prev => ({ ...prev, [attachment.id]: false }));
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Failed to upload file'
      });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (itemPrices.length === 0 || itemPrices.every(item => !item.unit_price)) {
      toast({
        variant: 'destructive',
        title: 'Missing Pricing',
        description: 'Please enter unit prices for at least one item'
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

    // Check if all attachments are uploaded
    const unuploadedFiles = attachments.filter(att => !att.uploaded);
    if (unuploadedFiles.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Files Not Uploaded',
        description: `Please upload or remove ${unuploadedFiles.length} file(s) before saving`
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare attachment metadata with storage paths and URLs
      const attachmentMetadata = attachments.map(att => ({
        id: att.id,
        name: att.name,
        size: att.size,
        type: att.type,
        path: att.path,
        url: att.url
      }));

      // Update quote with response data - WITHOUT updated_at (Supabase handles this automatically)
      const { error: updateError } = await supabase
        .from('quote_requests')
        .update({
          status: 'responded',
          supplier_response: {
            item_prices: itemPrices,
            quoted_price_subtotal: parseFloat(subtotal),
            charges: {
              transport: parseFloat(charges.transport) || 0,
              minimum_order_charge: parseFloat(charges.minimum_order_charge) || 0,
              other_charge_description: charges.other_charge_description,
              other_charge_amount: parseFloat(charges.other_charge_amount) || 0
            },
            total_charges: parseFloat(totalCharges),
            quoted_price_total: parseFloat(grandTotal),
            quoted_price_per_unit: parseFloat(response.quoted_price_per_unit),
            delivery_date: response.delivery_date,
            payment_terms: response.payment_terms,
            lead_time_days: parseInt(response.lead_time_days) || null,
            quality_notes: response.quality_notes,
            special_conditions: response.special_conditions,
            response_received_at: new Date().toISOString()
          },
          response_attachments: attachmentMetadata
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      toast({
        title: '✅ Response Recorded',
        description: `Quote response from ${supplierName} saved successfully with ${attachments.length} file(s)`
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
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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

          {/* Item-Level Pricing */}
          <div className="space-y-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Item-Level Pricing
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-teal-100 border-b border-teal-300">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-teal-900">Item</th>
                    <th className="px-3 py-2 text-center font-semibold text-teal-900">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold text-teal-900">Unit Price (€)</th>
                    <th className="px-3 py-2 text-right font-semibold text-teal-900">Line Total (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {itemPrices.map((item, idx) => (
                    <tr key={idx} className="border-b border-teal-200 hover:bg-teal-100/50">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900">{item.part_name}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-bold text-slate-700">{item.quantity}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                          placeholder="0.00"
                          className="text-right font-semibold text-teal-600 bg-white"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-bold text-teal-700">€{parseFloat(item.line_total || 0).toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal */}
            <div className="flex justify-end pt-4 border-t border-teal-300">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span className="font-semibold">Subtotal (Items):</span>
                  <span className="font-bold text-teal-600">€{subtotal}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Charges */}
          <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Additional Charges (Optional)
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Transport/Shipping Charge (€)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={charges.transport}
                  onChange={(e) => setCharges({ ...charges, transport: e.target.value })}
                  placeholder="0.00"
                  className="text-right font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Minimum Order Charge (€)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={charges.minimum_order_charge}
                  onChange={(e) => setCharges({ ...charges, minimum_order_charge: e.target.value })}
                  placeholder="0.00"
                  className="text-right font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Other Charge Description
              </label>
              <Input
                type="text"
                value={charges.other_charge_description}
                onChange={(e) => setCharges({ ...charges, other_charge_description: e.target.value })}
                placeholder="e.g., Handling fee, Rush fee, Packaging"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Other Charge Amount (€)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={charges.other_charge_amount}
                onChange={(e) => setCharges({ ...charges, other_charge_amount: e.target.value })}
                placeholder="0.00"
                className="text-right font-semibold"
              />
            </div>

            {/* Charges Summary */}
            <div className="flex justify-end pt-4 border-t border-orange-300">
              <div className="w-full max-w-xs space-y-2">
                {parseFloat(charges.transport) > 0 && (
                  <div className="flex justify-between text-sm text-slate-700">
                    <span>Transport:</span>
                    <span className="font-semibold">€{parseFloat(charges.transport).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(charges.minimum_order_charge) > 0 && (
                  <div className="flex justify-between text-sm text-slate-700">
                    <span>Minimum Order:</span>
                    <span className="font-semibold">€{parseFloat(charges.minimum_order_charge).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(charges.other_charge_amount) > 0 && (
                  <div className="flex justify-between text-sm text-slate-700">
                    <span>{charges.other_charge_description || 'Other'}:</span>
                    <span className="font-semibold">€{parseFloat(charges.other_charge_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold text-orange-700 border-t border-orange-300 pt-2">
                  <span>Total Charges:</span>
                  <span>€{totalCharges}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grand Total */}
          <div className="p-4 bg-gradient-to-r from-teal-100 to-teal-50 border border-teal-300 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-teal-700 font-semibold uppercase">Items Subtotal</p>
                <p className="text-2xl font-bold text-teal-700 mt-2">€{subtotal}</p>
              </div>
              <div>
                <p className="text-xs text-orange-700 font-semibold uppercase">Additional Charges</p>
                <p className="text-2xl font-bold text-orange-700 mt-2">€{totalCharges}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-teal-200">
                <p className="text-xs text-teal-700 font-semibold uppercase">Grand Total</p>
                <p className="text-3xl font-bold text-teal-700 mt-2">€{grandTotal}</p>
                <p className="text-xs text-teal-600 mt-1 font-mono">({response.quoted_price_per_unit} per unit)</p>
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

          {/* Attachments - ENHANCED WITH UPLOAD STATUS */}
          <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Attach Supplier Quote Documents
            </h4>
            <p className="text-sm text-slate-600">PDF, image, or document with supplier's official quote - Files will be uploaded and accessible</p>

            <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center hover:bg-amber-100/50 transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                <p className="font-semibold text-amber-900">Click to upload or drag files</p>
                <p className="text-xs text-amber-700 mt-1">PDF, Images, Documents, ZIP - Max 10MB per file</p>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Attached Files ({attachments.length})</p>
                {attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded border border-slate-200">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 text-sm">{file.name}</p>
                      <p className="text-xs text-slate-600">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!file.uploaded && (
                        <Button
                          size="sm"
                          onClick={() => uploadFile(file)}
                          disabled={uploadingFiles[file.id] || file.uploading}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          {uploadingFiles[file.id] || file.uploading ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-3 w-3 mr-1" />
                              Upload
                            </>
                          )}
                        </Button>
                      )}
                      {file.uploaded && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                          <CheckCircle className="h-3 w-3" />
                          Uploaded
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(file.id)}
                        className="text-red-600 hover:text-red-700 transition-colors p-1"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold">💡 Pro Tip:</p>
              <p>All pricing information including item-level prices and charges will be saved. Upload files are stored securely and can be downloaded from the quote details. You'll be able to compare this supplier's offer with others side-by-side in the Quote Comparison view.</p>
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