import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Copy, Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import * as Dialog from '@radix-ui/react-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnhancedQuoteCreationFlow from './EnhancedQuoteCreationFlow';

const BulkQuoteRequestCreator = ({ open, onOpenChange, selectedParts = [], onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Mode Selection, 2: Quick Create Flow
  const [selectedMode, setSelectedMode] = useState(null); // 'quick-create' | 'legacy'
  const [submitting, setSubmitting] = useState(false);
  const [createdQuotes, setCreatedQuotes] = useState([]);
  const [errors, setErrors] = useState([]);
  const [showEnhancedFlow, setShowEnhancedFlow] = useState(false);
  const [bulkItems, setBulkItems] = useState([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Prepare items for Quick Create flow
  useEffect(() => {
    if (selectedParts && selectedParts.length > 0) {
      // Transform reorder parts into Quick Create item format
      const items = selectedParts.map((part) => {
        const supplier = part.suppliers?.find(s => s.is_preferred) || part.suppliers?.[0];
        const quantityNeeded = Math.max(0, part.reorder_point - part.current_quantity);
        
        return {
          part_id: part.id,
          part_name: part.name,
          part_number: part.part_number,
          supplier_id: supplier?.id,
          supplier_name: supplier?.name,
          supplierPartNumber: supplier?.supplier_part_number || '',
          supplierPartId: supplier?.supplier_sku || '',
          quantity: quantityNeeded,
          unit_price: supplier?.unit_price,
          notes: `Auto-loaded from Reorder Management - Reorder Point: ${part.reorder_point}, Current: ${part.current_quantity}`,
          source: 'reorder'
        };
      });
      setBulkItems(items);
    }
  }, [selectedParts]);

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      setStep(1);
      setSelectedMode(null);
      setCreatedQuotes([]);
      setErrors([]);
      setShowEnhancedFlow(false);
    }
    onOpenChange(newOpen);
  };

  const handleStartQuickCreate = () => {
    setSelectedMode('quick-create');
    setShowEnhancedFlow(true);
  };

  const handleStartLegacy = () => {
    setSelectedMode('legacy');
    setStep(2);
  };

  const handleEnhancedFlowSuccess = () => {
    toast({
      title: "Success!",
      description: "Quote requests created and ready to send to suppliers!"
    });
    handleOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleCreateQuoteRequests = async () => {
    setSubmitting(true);
    const newErrors = [];
    const newQuotes = [];

    try {
      // Create quote requests for each part using legacy method
      for (const part of selectedParts) {
        const supplier = part.suppliers?.find(s => s.is_preferred) || part.suppliers?.[0];
        const quantityNeeded = Math.max(0, part.reorder_point - part.current_quantity);

        if (!supplier) {
          newErrors.push({
            part: part.name,
            error: 'No supplier assigned'
          });
          continue;
        }

        if (quantityNeeded <= 0) {
          newErrors.push({
            part: part.name,
            error: 'Quantity needed is 0'
          });
          continue;
        }

        try {
          const { data, error } = await supabase
            .from('quote_requests')
            .insert({
              part_id: part.id,
              supplier_id: supplier.id,
              quantity_requested: quantityNeeded,
              requested_unit_price: supplier.unit_price || null,
              status: 'pending',
              created_by: user.id,
              created_at: new Date().toISOString()
            })
            .select();

          if (error) throw error;
          newQuotes.push(data[0]);
        } catch (error) {
          newErrors.push({
            part: part.name,
            error: error.message
          });
        }
      }

      setCreatedQuotes(newQuotes);
      setErrors(newErrors);
      setStep(3);

      toast({
        title: `${newQuotes.length} Quote Request${newQuotes.length !== 1 ? 's' : ''} Created!`,
        description: `Successfully sent to suppliers. ${newErrors.length > 0 ? `${newErrors.length} failed.` : ''}`
      });

      if (onSuccess && newQuotes.length > 0) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (error) {
      console.error('Error creating quote requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSummary = () => {
    const summary = [
      'QUOTE REQUESTS SUMMARY',
      '======================',
      `Created: ${new Date().toLocaleString()}`,
      `Total Created: ${createdQuotes.length}`,
      `Total Failed: ${errors.length}`,
      '',
      'CREATED QUOTE REQUESTS:',
      ...createdQuotes.map(q => `- ID: ${q.id}`),
      '',
      'FAILED REQUESTS:',
      ...errors.map(e => `- ${e.part}: ${e.error}`)
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(summary));
    element.setAttribute('download', `quote-requests-${new Date().toISOString().split('T')[0]}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopySummary = () => {
    const summary = [
      `Created ${createdQuotes.length} quote requests`,
      ...createdQuotes.map(q => `Quote ID: ${q.id}`)
    ].join('\n');
    navigator.clipboard.writeText(summary);
    toast({
      title: "Copied!",
      description: "Summary copied to clipboard"
    });
  };

  // If showing Enhanced Flow, render that instead
  if (showEnhancedFlow && selectedMode === 'quick-create') {
    return (
      <>
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content className="w-full max-w-5xl bg-white rounded-2xl shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b">
                  <Dialog.Title className="text-2xl font-bold text-slate-900">
                    Create Quote Requests - Quick Create Flow
                  </Dialog.Title>
                  <button
                    onClick={() => handleOpenChange(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  <EnhancedQuoteCreationFlow
                    isReorderMode={true}
                    initialItems={bulkItems}
                    onCreateComplete={handleEnhancedFlowSuccess}
                  />
                </div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        </Dialog.Root>
      </>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="w-full max-w-3xl bg-white rounded-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-2xl font-bold text-slate-900">
                Create Quote Requests from Reorder
              </Dialog.Title>
              <button
                onClick={() => handleOpenChange(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Step 1: Mode Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Choose Your Method</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Select how you want to create quote requests for {selectedParts.length} item{selectedParts.length !== 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quick Create Option */}
                  <button
                    onClick={handleStartQuickCreate}
                    className="p-6 border-2 border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all text-left group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-teal-700">⚡ Quick Create (NEW)</h3>
                        <p className="text-xs text-slate-600 mt-1">Recommended</p>
                      </div>
                      <Badge className="bg-teal-600 text-white">Recommended</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      Load all items with suppliers and part numbers into the Quick Create form. Edit and customize before sending.
                    </p>
                    <ul className="text-xs text-slate-600 space-y-2 mb-4">
                      <li>✓ Auto-loads suppliers and part numbers</li>
                      <li>✓ Full customization available</li>
                      <li>✓ Review before sending</li>
                      <li>✓ Professional email templates</li>
                    </ul>
                    <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm group-hover:gap-3 transition-all">
                      Start <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>

                  {/* Legacy Option */}
                  <button
                    onClick={handleStartLegacy}
                    className="p-6 border-2 border-slate-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all text-left group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">📋 Direct Creation</h3>
                        <p className="text-xs text-slate-600 mt-1">Legacy method</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      Directly create quote requests without the full form. Faster for experienced users.
                    </p>
                    <ul className="text-xs text-slate-600 space-y-2 mb-4">
                      <li>✓ Quick creation</li>
                      <li>✓ Simple confirmation</li>
                      <li>✓ Instant sending</li>
                      <li>• No customization</li>
                    </ul>
                    <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm group-hover:gap-3 transition-all">
                      Start <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review (Legacy Mode) */}
            {step === 2 && selectedMode === 'legacy' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Direct Quote Request Creation</p>
                    <p className="text-sm text-blue-800 mt-1">
                      {selectedParts.length} quote request{selectedParts.length !== 1 ? 's' : ''} will be created and sent to suppliers immediately.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedParts.map((part) => {
                    const supplier = part.suppliers?.find(s => s.is_preferred) || part.suppliers?.[0];
                    const quantityNeeded = Math.max(0, part.reorder_point - part.current_quantity);

                    return (
                      <Card key={part.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-bold text-slate-900">{part.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {part.part_number}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                                <div>
                                  <p className="text-slate-600">Current Stock</p>
                                  <p className="font-semibold text-slate-900">{part.current_quantity}</p>
                                </div>
                                <div>
                                  <p className="text-slate-600">Reorder Point</p>
                                  <p className="font-semibold text-slate-900">{part.reorder_point}</p>
                                </div>
                                <div>
                                  <p className="text-slate-600">Qty Needed</p>
                                  <p className="font-bold text-teal-600 text-lg">{quantityNeeded}</p>
                                </div>
                              </div>

                              {supplier && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-xs text-slate-600 font-semibold">Supplier</p>
                                  <p className="font-semibold text-slate-900">{supplier.name}</p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    Unit Price: €{supplier.unit_price || 'N/A'}
                                  </p>
                                </div>
                              )}

                              {!supplier && (
                                <div className="mt-3 pt-3 border-t bg-red-50 p-2 rounded">
                                  <p className="text-xs text-red-600 font-semibold">⚠️ No supplier assigned</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-4">
                  <Dialog.Close asChild>
                    <Button variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateQuoteRequests}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                    disabled={submitting || selectedParts.length === 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      `Create ${selectedParts.length} Quote Request${selectedParts.length !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation (Legacy Mode) */}
            {step === 3 && selectedMode === 'legacy' && (
              <div className="space-y-6">
                <div className="text-center py-6">
                  <div className="flex justify-center mb-4">
                    <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Quote Requests Created!</h3>
                  <p className="text-slate-600 mt-2">
                    {createdQuotes.length} quote request{createdQuotes.length !== 1 ? 's' : ''} successfully sent to suppliers
                  </p>
                </div>

                {createdQuotes.length > 0 && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="bg-green-100 border-b border-green-200">
                      <CardTitle className="text-lg text-green-900">✓ Successfully Created</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {createdQuotes.map((quote, idx) => {
                          const part = selectedParts.find(p => p.id === quote.part_id);
                          return (
                            <div key={quote.id} className="text-sm border-b pb-2 last:border-0">
                              <div className="font-semibold text-slate-900">{idx + 1}. {part?.name}</div>
                              <div className="text-xs text-slate-600 font-mono mt-1 break-all">
                                ID: {quote.id}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {errors.length > 0 && (
                  <Card className="bg-red-50 border-red-200">
                    <CardHeader className="bg-red-100 border-b border-red-200">
                      <CardTitle className="text-lg text-red-900">✗ Failed ({errors.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {errors.map((error, idx) => (
                          <div key={idx} className="text-sm text-red-700 border-b pb-2 last:border-0">
                            <span className="font-semibold">{error.part}:</span> {error.error}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCopySummary}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Summary
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleDownloadSummary}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                  <Dialog.Close asChild>
                    <Button className="flex-1 bg-teal-600 hover:bg-teal-700">
                      Close
                    </Button>
                  </Dialog.Close>
                </div>
              </div>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default BulkQuoteRequestCreator;