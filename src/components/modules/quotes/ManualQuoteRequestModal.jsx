import React, { useState, useEffect } from 'react';
import FileUploadManager from './FileUploadManager';
import SearchablePartSelector from './SearchablePartSelector';
import SearchableSupplierSelector from './SearchableSupplierSelector';
import EmailTemplateGenerator from './EmailTemplateGenerator';
import { X, Plus, Loader2, AlertCircle, CheckCircle, Search, Upload, File, Trash2, Send, Copy, Minus, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import * as Dialog from '@radix-ui/react-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Global counter for quote ID sequencing
let quoteCounter = 1000;

const ManualQuoteRequestModal = ({ open, onOpenChange, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdQuote, setCreatedQuote] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [quoteId, setQuoteId] = useState('');
  const [sendMethod, setSendMethod] = useState('system');
  const [items, setItems] = useState([]); // Multi-item support
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    request_notes: '',
    deliveryDate: '',
    budgetExpectation: '',
    companyName: '',
    projectName: '',
    requesterName: 'Procurement Team',
    requesterEmail: user?.email || 'noreply@partpulse.eu',
    requesterPhone: '',
  });

  const [currentItem, setCurrentItem] = useState({
    part: null,
    quantity: '',
    unitPrice: '',
    notes: '',
  });

  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Generate unique quote ID with format: QR-YY-XXXXX
  const generateQuoteId = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Get last 2 digits of year
    quoteCounter++; // Increment global counter
    const sequentialNumber = quoteCounter.toString().padStart(5, '0'); // Pad to 5 digits
    return `QR-${year}-${sequentialNumber}`;
  };

  // Generate unique quote ID on mount
  useEffect(() => {
    setQuoteId(generateQuoteId());
  }, []);

  useEffect(() => {
    if (open) {
      setStep(1);
      resetForm();
      setQuoteId(generateQuoteId());
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      request_notes: '',
      deliveryDate: '',
      budgetExpectation: '',
      companyName: '',
      projectName: '',
      requesterName: 'Procurement Team',
      requesterEmail: user?.email || 'noreply@partpulse.eu',
      requesterPhone: '',
    });
    setCurrentItem({
      part: null,
      quantity: '',
      unitPrice: '',
      notes: '',
    });
    setSelectedSupplier(null);
    setAttachments([]);
    setCreatedQuote(null);
    setSendMethod('system');
    setItems([]);
    setEditingItemIndex(null);
  };

  const addOrUpdateItem = () => {
    if (!currentItem.part || !currentItem.quantity) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please select a part and enter quantity"
      });
      return;
    }

    if (parseInt(currentItem.quantity) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Quantity",
        description: "Quantity must be greater than 0"
      });
      return;
    }

    if (editingItemIndex !== null) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[editingItemIndex] = { ...currentItem };
      setItems(updatedItems);
      setEditingItemIndex(null);
      toast({
        title: "Item Updated",
        description: `${currentItem.part.name} updated`
      });
    } else {
      // Add new item
      setItems([...items, { ...currentItem }]);
      toast({
        title: "Item Added",
        description: `${currentItem.part.name} added to quote`
      });
    }

    // Reset form
    setCurrentItem({
      part: null,
      quantity: '',
      unitPrice: '',
      notes: '',
    });
  };

  const removeItem = (index) => {
    const removedItem = items[index];
    setItems(items.filter((_, i) => i !== index));
    toast({
      title: "Item Removed",
      description: `${removedItem.part.name} removed from quote`
    });
  };

  const editItem = (index) => {
    setCurrentItem(items[index]);
    setEditingItemIndex(index);
  };

  const handleNext = () => {
    if (items.length === 0) {
      toast({
        variant: "destructive",
        title: "No Items",
        description: "Please add at least one item to the quote"
      });
      return;
    }

    if (!selectedSupplier) {
      toast({
        variant: "destructive",
        title: "Missing Supplier",
        description: "Please select a supplier"
      });
      return;
    }

    setStep(2);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return sum + (unitPrice * quantity);
    }, 0);
  };

  // Generate professional email body
  const generateEmailBody = () => {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const deliveryNeed = formData.deliveryDate ? new Date(formData.deliveryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' }) : 'As soon as possible';
    const specialNotes = formData.request_notes || '';
    const budgetExpectation = formData.budgetExpectation || '';
    const requesterName = formData.requesterName || 'Procurement Team';
    const requesterEmail = formData.requesterEmail || user?.email || 'noreply@partpulse.eu';
    const requesterPhone = formData.requesterPhone || '';
    const companyName = 'PartPulse Industrial';

    // Quote Details Section
    let emailBody = `Dear ${selectedSupplier.name || 'Supplier'},

We are reaching out regarding a quote request for the following items:

------- QUOTE REQUEST DETAILS -------

Quote ID: ${quoteId}
Date: ${date}
Delivery Date: ${deliveryNeed}
`;

    // Items Section
    emailBody += `
------- REQUESTED ITEMS -------

`;
    items.forEach((item, index) => {
      const itemName = item.part?.name || 'Unknown Item';
      const itemSKU = item.part?.barcode || 'N/A';
      const itemQuantity = item.quantity || 1;
      const itemDescription = item.part?.description || 'No description provided';
      const supplierPartNumber = item.part?.supplier_part_mappings?.[0]?.supplier_part_number || 'N/A';
      const supplierPartInfo = item.part?.supplier_part_mappings?.[0]?.supplier_sku || 'N/A';
      
      emailBody += `Item ${index + 1}:\n`;
      emailBody += `  Part Name: ${itemName}\n`;
      emailBody += `  Supplier Part Number: ${supplierPartNumber}\n`;
      emailBody += `  Supplier SKU: ${supplierPartInfo}\n`;
      emailBody += `  SKU/Internal ID: ${itemSKU}\n`;
      emailBody += `\n  Quantity: ${itemQuantity} units\n`;
      emailBody += `  Description: ${itemDescription}\n\n`;
    });

    emailBody += `Delivery Location: To be confirmed

Budget & Preferences:
${budgetExpectation ? `  • Budget Expectation: €${budgetExpectation}\n` : ''}`;

    if (specialNotes) {
      emailBody += `\nSpecial Instructions & Notes:\n  ${specialNotes}\n`;
    }

    emailBody += `
------- REQUESTOR INFORMATION -------

${requesterName}
${requesterEmail}
${requesterPhone ? `Phone: ${requesterPhone}\n` : ''}${companyName}

`;

    emailBody += `We would appreciate your detailed quotation including:
  • Unit price and total cost for each item
  • Availability and lead time
  • Delivery terms and freight cost (if applicable)
  • Payment terms
  • Any volume discounts available
  • Warranty information

Please reply with your quotation at your earliest convenience. Reference the Quote ID (${quoteId}) in your response for easy tracking.

Thank you for your prompt attention to this request.

Best regards,
${requesterName}
${companyName}
${requesterEmail}
${requesterPhone ? `${requesterPhone}\n` : ''}
www.partpulse.eu

Quote Generated: ${date}`;

    return emailBody;
  };

  const generateEmailSubject = () => {
    if (items.length === 1) {
      return `Quote Request: ${items[0].quantity}x ${items[0].part.name} [${quoteId}]`;
    } else {
      return `Quote Request: ${items.length} items [${quoteId}]`;
    }
  };

  const handleOutlookOpen = () => {
    try {
      const emailBody = generateEmailBody();
      const subject = generateEmailSubject();
      
      // Try to use the native Outlook protocol if available
      if (window.navigator.msLaunchUri) {
        // Microsoft Edge / IE
        const outlookUri = `ms-outlook:compose?to=${encodeURIComponent(selectedSupplier.email || '')}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
        window.navigator.msLaunchUri(outlookUri);
      } else {
        // Fallback to mailto (works on most systems)
        const mailtoLink = `mailto:${selectedSupplier.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailtoLink;
      }
    } catch (error) {
      console.error('Error opening Outlook:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not open email client"
      });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .insert({
          quote_id: quoteId,
          supplier_id: selectedSupplier.id,
          items: items.map(item => ({
            part_id: item.part.id,
            part_name: item.part.name,
            quantity: parseInt(item.quantity),
            unit_price: item.unitPrice ? parseFloat(item.unitPrice) : null,
            notes: item.notes || null
          })),
          total_items: items.length,
          estimated_total: calculateTotal(),
          request_notes: formData.request_notes || null,
          delivery_date: formData.deliveryDate || null,
          budget_expectation: formData.budgetExpectation || null,
          company_name: formData.companyName || null,
          project_name: formData.projectName || null,
          status: 'pending',
          send_method: sendMethod,
          created_by: user.id,
          created_at: new Date().toISOString(),
          has_attachments: attachments.length > 0,
          attachments: attachments.map(a => ({ name: a.name, size: a.file.size }))
        })
        .select();

      if (error) throw error;

      const createdQuoteData = data[0];
      setCreatedQuote(createdQuoteData);

      // If sending via Outlook, open email client AFTER database insert
      if (sendMethod === 'outlook') {
        // Small delay to ensure DB write completes
        setTimeout(() => {
          handleOutlookOpen();
          setStep(3);
        }, 500);
      } else if (sendMethod === 'system') {
        setStep(3);
      } else if (sendMethod === 'copy') {
        setStep(4);
      }

      toast({
        title: "Quote Request Recorded!",
        description: `Quote ID: ${quoteId} with ${items.length} item${items.length !== 1 ? 's' : ''}`
      });

      if (onSuccess && (sendMethod === 'system' || sendMethod === 'outlook')) {
        setTimeout(() => onSuccess(), 2000);
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
          <Dialog.Content className="w-full max-w-4xl bg-white rounded-2xl p-6 shadow-lg max-h-[95vh] overflow-y-auto">
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

            {/* Step 1: Multi-Item Form */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Quote ID Display */}
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <p className="text-xs text-teal-600 font-semibold uppercase">Quote ID (Auto-Generated)</p>
                  <p className="text-lg font-mono font-bold text-teal-900 mt-2">{quoteId}</p>
                </div>

                {/* Top Section: Supplier & General Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Supplier Selection */}
                  <div>
                    <label className="text-sm font-semibold block mb-2">Select Supplier *</label>
                    <SearchableSupplierSelector
                      value={selectedSupplier}
                      onChange={setSelectedSupplier}
                    />
                  </div>

                  {/* Project Info */}
                  <div>
                    <label className="text-sm font-semibold block mb-2">Project/Order Name (Optional)</label>
                    <Input
                      type="text"
                      value={formData.projectName}
                      onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      placeholder="e.g., Q4 Maintenance, System Upgrade"
                    />
                  </div>
                </div>

                {/* Supplier Info Card */}
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

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                      Quote Items ({items.length})
                    </h3>
                    {editingItemIndex !== null && (
                      <button
                        onClick={() => {
                          setEditingItemIndex(null);
                          setCurrentItem({ part: null, quantity: '', unitPrice: '', notes: '' });
                        }}
                        className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  {/* Current Item Form */}
                  <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="bg-slate-100 border-b pb-3">
                      <CardTitle className="text-sm">
                        {editingItemIndex !== null ? '✏️ Edit Item' : '➕ Add New Item'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {/* Part Selection */}
                      <div>
                        <label className="text-sm font-semibold block mb-2">Select Part *</label>
                        <SearchablePartSelector 
                          value={currentItem.part}
                          onChange={(part) => setCurrentItem({ ...currentItem, part })}
                          supplierFilter={selectedSupplier?.id}
                        />
                      </div>

                      {/* Part Details Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-semibold block mb-2">Quantity *</label>
                          <Input
                            type="number"
                            min="1"
                            value={currentItem.quantity}
                            onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold block mb-2">Unit Price (€)</label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={currentItem.unitPrice}
                            onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: e.target.value })}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold block mb-2">Line Total</label>
                          <div className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-teal-600">
                            €{(parseFloat(currentItem.unitPrice || 0) * parseInt(currentItem.quantity || 0)).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Item Notes */}
                      <div>
                        <label className="text-sm font-semibold block mb-2">Notes for this Item</label>
                        <Input
                          type="text"
                          value={currentItem.notes}
                          onChange={(e) => setCurrentItem({ ...currentItem, notes: e.target.value })}
                          placeholder="e.g., Specific model, color, certification needed"
                        />
                      </div>

                      {/* Add Button */}
                      <button
                        onClick={addOrUpdateItem}
                        className="w-full px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {editingItemIndex !== null ? (
                          <>
                            <Edit2 className="h-4 w-4" />
                            Update Item
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add Item
                          </>
                        )}
                      </button>
                    </CardContent>
                  </Card>

                  {/* Items List */}
                  {items.length > 0 && (
                    <Card className="border border-slate-300">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Items in Quote</CardTitle>
                          <span className="text-xs px-2 py-1 bg-teal-100 text-teal-700 rounded-full font-semibold">
                            {items.length} item{items.length !== 1 ? 's' : ''} • €{calculateTotal().toFixed(2)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Part</th>
                                <th className="px-4 py-3 text-center font-semibold text-slate-700">Qty</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700">Unit Price</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
                                <th className="px-4 py-3 text-center font-semibold text-slate-700">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, idx) => {
                                const lineTotal = (parseFloat(item.unitPrice || 0) * parseInt(item.quantity || 0));
                                return (
                                  <tr key={idx} className={idx % 2 ? 'bg-white' : 'bg-slate-50 border-b'}>
                                    <td className="px-4 py-3">
                                      <div>
                                        <p className="font-semibold text-slate-900">{item.part.name}</p>
                                        <p className="text-xs text-slate-500">SKU: {item.part.barcode || 'N/A'}</p>
                                        {item.notes && <p className="text-xs text-amber-600 mt-1">📝 {item.notes}</p>}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                                    <td className="px-4 py-3 text-right font-semibold">€{parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-teal-600">€{lineTotal.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => editItem(idx)}
                                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                          title="Edit item"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => removeItem(idx)}
                                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title="Remove item"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-300 bg-teal-50">
                              <tr>
                                <td colSpan="3" className="px-4 py-3 text-right font-bold text-slate-900">
                                  Estimated Total:
                                </td>
                                <td className="px-4 py-3 text-right text-xl font-bold text-teal-600">
                                  €{calculateTotal().toFixed(2)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* General Quote Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Additional Information</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                        placeholder="e.g., 5000-6000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">General Notes & Special Requirements</label>
                    <Textarea
                      value={formData.request_notes}
                      onChange={(e) => setFormData({ ...formData, request_notes: e.target.value })}
                      placeholder="Payment terms, quality requirements, certifications, urgency notes, etc."
                      className="resize-none h-24"
                    />
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <label className="text-sm font-semibold block mb-2">📎 Attachments (Specs, Drawings, etc.)</label>
                  <FileUploadManager 
                    onFilesSelected={setAttachments}
                    maxFiles={5}
                    maxSizePerFile={10}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Dialog.Close asChild>
                    <Button variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    Review & Send
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Review Quote */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Review Your Quote</p>
                    <p className="text-sm text-blue-800 mt-1">Please verify all details before selecting send method.</p>
                  </div>
                </div>

                {/* Quote Summary */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100 border-b">
                    <CardTitle className="text-lg">Quote Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Quote ID</p>
                        <p className="font-mono font-bold text-slate-900 mt-1">{quoteId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Supplier</p>
                        <p className="font-semibold text-slate-900 mt-1">{selectedSupplier?.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Items</p>
                        <p className="font-bold text-slate-900 mt-1">{items.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">Total</p>
                        <p className="font-bold text-lg text-teal-600 mt-1">€{calculateTotal().toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="border-t pt-6">
                      <h4 className="font-bold text-slate-900 mb-3">Items</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 border-b">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Part</th>
                              <th className="px-3 py-2 text-center font-semibold">Qty</th>
                              <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                              <th className="px-3 py-2 text-right font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => {
                              const lineTotal = parseFloat(item.unitPrice || 0) * parseInt(item.quantity || 0);
                              return (
                                <tr key={idx} className={idx % 2 ? 'bg-white' : 'bg-slate-50'}>
                                  <td className="px-3 py-2 font-semibold text-slate-900">{item.part.name}</td>
                                  <td className="px-3 py-2 text-center">{item.quantity}</td>
                                  <td className="px-3 py-2 text-right">€{parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-bold text-teal-600">€{lineTotal.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Request Details */}
                    {(formData.deliveryDate || formData.budgetExpectation || formData.request_notes) && (
                      <div className="border-t pt-6 space-y-3">
                        {formData.deliveryDate && (
                          <div>
                            <p className="text-xs text-slate-600 font-semibold">DELIVERY DATE</p>
                            <p className="text-slate-900">{new Date(formData.deliveryDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {formData.budgetExpectation && (
                          <div>
                            <p className="text-xs text-slate-600 font-semibold">BUDGET EXPECTATION</p>
                            <p className="text-slate-900">€ {formData.budgetExpectation}</p>
                          </div>
                        )}
                        {formData.request_notes && (
                          <div>
                            <p className="text-xs text-slate-600 font-semibold">NOTES</p>
                            <p className="text-slate-700 whitespace-pre-wrap">{formData.request_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Send Method Selection */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900">How would you like to send this quote?</h4>
                  
                  {/* System Auto-Send */}
                  <button
                    onClick={() => setSendMethod('system')}
                    className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                      sendMethod === 'system'
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-slate-200 bg-white hover:border-teal-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center ${
                        sendMethod === 'system' ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
                      }`}>
                        {sendMethod === 'system' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">🚀 Auto-Send via System</p>
                        <p className="text-sm text-slate-600 mt-1">System automatically emails the supplier</p>
                      </div>
                    </div>
                  </button>

                  {/* Outlook Option */}
                  <button
                    onClick={() => setSendMethod('outlook')}
                    className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                      sendMethod === 'outlook'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center ${
                        sendMethod === 'outlook' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}>
                        {sendMethod === 'outlook' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">📬 Open in Outlook</p>
                        <p className="text-sm text-slate-600 mt-1">Review & send from your email client</p>
                      </div>
                    </div>
                  </button>

                  {/* Copy/Paste Option */}
                  <button
                    onClick={() => setSendMethod('copy')}
                    className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                      sendMethod === 'copy'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-slate-200 bg-white hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center ${
                        sendMethod === 'copy' ? 'border-purple-600 bg-purple-600' : 'border-slate-300'
                      }`}>
                        {sendMethod === 'copy' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">📋 Copy & Paste</p>
                        <p className="text-sm text-slate-600 mt-1">Copy email and send manually</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className={`flex-1 ${
                      sendMethod === 'system'
                        ? 'bg-teal-600 hover:bg-teal-700'
                        : sendMethod === 'outlook'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : sendMethod === 'system' ? (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Now
                      </>
                    ) : sendMethod === 'outlook' ? (
                      <>Open in Outlook</>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Email
                      </>
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
                    {items.length} item{items.length !== 1 ? 's' : ''} sent to {selectedSupplier?.name}
                  </p>
                </div>

                {createdQuote && (
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-4">
                      <div className="text-left space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-600 font-semibold">QUOTE ID</p>
                          <p className="font-mono text-lg font-bold text-slate-900">{quoteId}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                          <div>
                            <p className="text-xs text-slate-600 font-semibold">Items</p>
                            <p className="font-bold text-slate-900">{items.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 font-semibold">Total</p>
                            <p className="font-bold text-teal-600">€{calculateTotal().toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 font-semibold">Status</p>
                            <p className="font-bold text-slate-900">Pending</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <p className="text-sm text-slate-600">
                  Track status using Quote ID in the Quote Management tab
                </p>

                <Dialog.Close asChild>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700">
                    Close
                  </Button>
                </Dialog.Close>
              </div>
            )}

            {/* Step 4: Copy Instructions */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">Quote Saved & Ready to Send</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Quote ID: <span className="font-mono font-bold">{quoteId}</span> with {items.length} item{items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {createdQuote && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-600 font-semibold mb-2">QUOTE DETAILS</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">ID</p>
                          <p className="font-mono font-bold text-slate-900">{quoteId}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Total Items</p>
                          <p className="font-bold text-slate-900">{items.length}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Total Value</p>
                          <p className="font-bold text-teal-600">€{calculateTotal().toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <EmailTemplateGenerator 
                  quoteData={formData}
                  supplierData={selectedSupplier}
                  partData={null}
                  quoteId={quoteId}
                  showCopyOnly={true}
                  items={items}
                />

                <div className="flex gap-2 pt-4 border-t">
                  <Dialog.Close asChild>
                    <Button variant="outline" className="flex-1">Done</Button>
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

export default ManualQuoteRequestModal;