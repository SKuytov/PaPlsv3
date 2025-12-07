import React, { useState, useEffect } from 'react';
import FileUploadManager from './FileUploadManager';
import SearchablePartSelector from './SearchablePartSelector';
import SearchableSupplierSelector from './SearchableSupplierSelector';
import EmailTemplateGenerator from './EmailTemplateGenerator';
import { X, Plus, Loader2, AlertCircle, CheckCircle, Search, Upload, File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import * as Dialog from '@radix-ui/react-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ManualQuoteRequestModal = ({ open, onOpenChange, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdQuote, setCreatedQuote] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    quantity_requested: '',
    requested_unit_price: '',
    request_notes: '',
    deliveryDate: '',
    budgetExpectation: '',
  });

  const [selectedPart, setSelectedPart] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      quantity_requested: '',
      requested_unit_price: '',
      request_notes: '',
      deliveryDate: '',
      budgetExpectation: '',
    });
    setSelectedPart(null);
    setSelectedSupplier(null);
    setAttachments([]);
    setCreatedQuote(null);
  };

  const handleNext = () => {
    if (!selectedPart || !selectedSupplier || !formData.quantity_requested) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in Part, Supplier, and Quantity"
      });
      return;
    }

    if (parseInt(formData.quantity_requested) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Quantity",
        description: "Quantity must be greater than 0"
      });
      return;
    }

    setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .insert({
          part_id: selectedPart.id,
          supplier_id: selectedSupplier.id,
          quantity_requested: parseInt(formData.quantity_requested),
          requested_unit_price: formData.requested_unit_price ? parseFloat(formData.requested_unit_price) : null,
          request_notes: formData.request_notes || null,
          delivery_date: formData.deliveryDate || null,
          budget_expectation: formData.budgetExpectation || null,
          status: 'pending',
          created_by: user.id,
          created_at: new Date().toISOString(),
          has_attachments: attachments.length > 0,
          attachments: attachments.map(a => ({ name: a.name, size: a.file.size }))
        })
        .select();

      if (error) throw error;

      setCreatedQuote(data[0]);
      setStep(3);

      toast({
        title: "Quote Request Created!",
        description: `Quote request sent to ${selectedSupplier?.name}`
      });

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (error) {
      console.error('Error creating quote request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create quote request"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-2xl font-bold text-slate-900">
                Create Quote Request
              </Dialog.Title>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      step >= stepNum
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {step > stepNum ? <CheckCircle className="h-5 w-5" /> : stepNum}
                  </div>
                  {stepNum < 3 && (
                    <div
                      className={`h-1 w-12 mx-2 transition-all ${
                        step > stepNum ? 'bg-teal-600' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Form */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Part Selection */}
                <div>
                  <label className="text-sm font-semibold block mb-2">Select Part *</label>
                  <SearchablePartSelector 
                    value={selectedPart}
                    onChange={setSelectedPart}
                    supplierFilter={selectedSupplier?.id}
                  />
                </div>

                {/* Part Info */}
                {selectedPart && (
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">Current Stock</p>
                          <p className="font-bold text-lg text-slate-900">{selectedPart.current_quantity || 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Reorder Point</p>
                          <p className="font-bold text-lg text-slate-900">{selectedPart.reorder_point || 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Category</p>
                          <p className="font-semibold text-slate-900">{selectedPart.category || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Unit Cost</p>
                          <p className="font-semibold text-slate-900">€{selectedPart.unit_cost || '0.00'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Supplier Selection */}
                <div>
                  <label className="text-sm font-semibold block mb-2">Select Supplier *</label>
                  <SearchableSupplierSelector
                    value={selectedSupplier}
                    onChange={setSelectedSupplier}
                  />
                </div>

                {/* Supplier Info */}
                {selectedSupplier && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">Email</p>
                          <p className="font-semibold text-slate-900 break-all">{selectedSupplier.email}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Phone</p>
                          <p className="font-semibold text-slate-900">{selectedSupplier.phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Quality Score</p>
                          <p className="font-semibold text-slate-900">⭐ {selectedSupplier.quality_score || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Delivery Score</p>
                          <p className="font-semibold text-slate-900">⭐ {selectedSupplier.delivery_score || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quantity & Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold block mb-2">Quantity Needed *</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity_requested}
                      onChange={(e) => setFormData({ ...formData, quantity_requested: e.target.value })}
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Expected Unit Price (€)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.requested_unit_price}
                      onChange={(e) => setFormData({ ...formData, requested_unit_price: e.target.value })}
                      placeholder="Optional - Your budget expectation"
                    />
                  </div>
                </div>

                {/* Delivery Date & Budget */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold block mb-2">Delivery Date</label>
                    <Input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Budget Expectation (€)</label>
                    <Input
                      type="text"
                      value={formData.budgetExpectation}
                      onChange={(e) => setFormData({ ...formData, budgetExpectation: e.target.value })}
                      placeholder="e.g., 500-600 EUR"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-semibold block mb-2">Notes & Special Requirements</label>
                  <Textarea
                    value={formData.request_notes}
                    onChange={(e) => setFormData({ ...formData, request_notes: e.target.value })}
                    placeholder="Any special requirements, urgency, certifications needed, etc."
                    className="resize-none h-24"
                  />
                </div>

                {/* File Attachments */}
                <div>
                  <label className="text-sm font-semibold block mb-2">📎 Attachments (Images, PDFs, Documents)</label>
                  <FileUploadManager 
                    onFilesSelected={setAttachments}
                    maxFiles={5}
                    maxSizePerFile={10}
                  />
                </div>

                {/* Email Template */}
                <div>
                  <label className="text-sm font-semibold block mb-2">📧 Email Template</label>
                  <EmailTemplateGenerator 
                    quoteData={formData}
                    supplierData={selectedSupplier}
                    partData={selectedPart}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-4">
                  <Dialog.Close asChild>
                    <Button variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Review & Send'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && selectedPart && selectedSupplier && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">Review Before Sending</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Please verify all details are correct. This quote request will be sent to the supplier.
                    </p>
                  </div>
                </div>

                <Card>
                  <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="text-lg">Quote Request Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Part</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">{selectedPart.name}</p>
                        <p className="text-sm text-slate-600">#{selectedPart.sku || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Supplier</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">{selectedSupplier.name}</p>
                        <p className="text-sm text-slate-600">{selectedSupplier.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Quantity</p>
                        <p className="text-lg font-bold text-teal-600 mt-1">{formData.quantity_requested} units</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Budget Expectation</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">
                          {formData.budgetExpectation || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {formData.request_notes && (
                      <div className="mt-6 pt-6 border-t">
                        <p className="text-xs text-slate-600 font-semibold uppercase">Special Notes</p>
                        <p className="text-slate-700 mt-2 whitespace-pre-wrap">{formData.request_notes}</p>
                      </div>
                    )}

                    {attachments.length > 0 && (
                      <div className="mt-6 pt-6 border-t">
                        <p className="text-xs text-slate-600 font-semibold uppercase mb-2">Attachments ({attachments.length})</p>
                        <div className="space-y-1">
                          {attachments.map((att, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                              <File className="h-4 w-4" />
                              {att.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                    disabled={submitting}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Quote Request'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <div className="text-center space-y-6 py-8">
                <div className="flex justify-center">
                  <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Quote Request Sent!</h3>
                  <p className="text-slate-600 mt-2">
                    Your quote request has been successfully sent to {selectedSupplier?.name}
                  </p>
                </div>

                {createdQuote && (
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-4">
                      <div className="text-left space-y-3">
                        <div>
                          <p className="text-xs text-slate-600 font-semibold">Quote Request ID</p>
                          <p className="font-mono text-sm text-slate-900 break-all">{createdQuote.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 font-semibold">Status</p>
                          <p className="text-sm text-slate-900">Waiting for supplier response</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 font-semibold">Created</p>
                          <p className="text-sm text-slate-900">
                            {new Date(createdQuote.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <p className="text-sm text-slate-600">
                  You can track the status in the Quote Management tab
                </p>

                <Dialog.Close asChild>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700">
                    Close
                  </Button>
                </Dialog.Close>
              </div>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ManualQuoteRequestModal;