import React, { useState } from 'react';
import { X, Upload, File, Loader2, CheckCircle, AlertCircle, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import * as Dialog from '@radix-ui/react-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const QuoteApprovalPanel = ({ quote, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Details, 2: PDF Upload, 3: Approval, 4: Confirmation
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [quotePrice, setQuotePrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handlePdfUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum PDF size is 10MB"
      });
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload a PDF file"
      });
      return;
    }

    setPdfFile(file);
    setPdfPreview(URL.createObjectURL(file));
  };

  const handleApproveQuote = async () => {
    if (!quotePrice) {
      toast({
        variant: "destructive",
        title: "Missing Price",
        description: "Please enter the quote price"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({
          status: 'approved',
          approval_notes: approvalNotes,
          quoted_unit_price: parseFloat(quotePrice),
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          has_pdf_quote: !!pdfFile
        })
        .eq('id', quote.id);

      if (error) throw error;

      setStep(4);
      toast({
        title: "Quote Approved!",
        description: "The quote has been approved and is ready for purchase order creation"
      });

      setTimeout(() => onSuccess(), 1500);
    } catch (error) {
      console.error('Error approving quote:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve quote"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectQuote = async () => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
          rejected_by: user.id
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: "Quote Rejected",
        description: "The quote has been rejected"
      });

      setTimeout(() => onSuccess(), 1000);
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject quote"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="w-full max-w-3xl bg-white rounded-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-2xl font-bold text-slate-900">
                Quote Approval
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4].map((stepNum) => (
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
                  {stepNum < 4 && (
                    <div
                      className={`h-1 w-12 mx-2 transition-all ${
                        step > stepNum ? 'bg-teal-600' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Quote Details */}
            {step === 1 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="bg-slate-50 border-b">
                    <CardTitle>Quote Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Part</p>
                        <p className="text-lg font-bold text-slate-900 mt-2">{quote.part?.name}</p>
                        <p className="text-sm text-slate-600">#{quote.part?.part_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Supplier</p>
                        <p className="text-lg font-bold text-slate-900 mt-2">{quote.supplier?.name}</p>
                        <p className="text-sm text-slate-600">{quote.supplier?.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Quantity</p>
                        <p className="text-lg font-bold text-slate-900 mt-2">{quote.quantity_requested} units</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Budget Expectation</p>
                        <p className="text-lg font-bold text-slate-900 mt-2">
                          {quote.requested_unit_price ? `€${quote.requested_unit_price}` : 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {quote.request_notes && (
                      <div className="mt-6 pt-6 border-t">
                        <p className="text-xs text-slate-600 font-semibold uppercase mb-2">Special Notes</p>
                        <p className="text-slate-700 bg-slate-50 p-3 rounded">{quote.request_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    Continue to PDF Upload
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: PDF Upload */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Upload Supplier Quote</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Please upload the PDF quote file received from the supplier for your records.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">Upload PDF Quote (Optional)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        <Upload className="h-8 w-8 text-slate-400 mb-2" />
                        <p className="text-sm font-medium text-slate-700">Click to upload PDF or drag and drop</p>
                        <p className="text-xs text-slate-500 mt-1">PDF files up to 10MB</p>
                      </div>
                    </label>
                  </div>
                </div>

                {pdfFile && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <File className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="font-semibold text-slate-900">{pdfFile.name}</p>
                            <p className="text-xs text-slate-600">{(pdfFile.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setPdfFile(null);
                            setPdfPreview(null);
                          }}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    Continue to Approval
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Approval */}
            {step === 3 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="bg-slate-50 border-b">
                    <CardTitle>Approve Quote</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <label className="text-sm font-semibold block mb-2">Quoted Unit Price (€) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quotePrice}
                        onChange={(e) => setQuotePrice(e.target.value)}
                        placeholder="Enter the quoted price per unit"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-2">Total Cost Estimation</p>
                      {quotePrice && (
                        <p className="text-2xl font-bold text-teal-600">
                          €{(parseFloat(quotePrice) * quote.quantity_requested).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold block mb-2">Approval Notes (Optional)</label>
                      <Textarea
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        placeholder="Any notes about this quote (e.g., negotiated terms, delivery dates, special conditions)"
                        className="resize-none h-24"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleRejectQuote}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <>Reject</>}
                  </Button>
                  <Button
                    onClick={handleApproveQuote}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      'Approve Quote'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="text-center space-y-6 py-8">
                <div className="flex justify-center">
                  <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Quote Approved!</h3>
                  <p className="text-slate-600 mt-2">
                    The quote has been approved and is ready for purchase order creation.
                  </p>
                </div>

                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4">
                    <div className="text-left space-y-3">
                      <div>
                        <p className="text-xs text-slate-600 font-semibold">Quote Price</p>
                        <p className="text-2xl font-bold text-teal-600 mt-1">€{quotePrice}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold">Total Cost</p>
                        <p className="text-lg font-bold text-slate-900">€{(parseFloat(quotePrice) * quote.quantity_requested).toFixed(2)}</p>
                      </div>
                      {pdfFile && (
                        <div>
                          <p className="text-xs text-slate-600 font-semibold">PDF Quote Attached</p>
                          <p className="text-sm text-slate-900 mt-1">{pdfFile.name}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <p className="text-sm text-slate-600">
                  You can now create a purchase order from the Quote Management tab.
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

export default QuoteApprovalPanel;