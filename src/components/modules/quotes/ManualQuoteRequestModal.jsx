import React, { useState, useEffect } from 'react';
import FileUploadManager from './FileUploadManager';
import SearchablePartSelector from './SearchablePartSelector';
import EmailTemplateGenerator from './EmailTemplateGenerator';
import { X, Plus, Loader2, AlertCircle, CheckCircle, Search, Upload, File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { dbService } from '@/lib/supabase';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import * as Dialog from '@radix-ui/react-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ManualQuoteRequestModal = ({ open, onOpenChange, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Form, 2: Review, 3: Confirmation
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdQuote, setCreatedQuote] = useState(null);
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    part_id: '',
    partSearch: '',
    supplier_id: '',
    quantity_requested: '',
    requested_unit_price: '',
    request_notes: ''
  });

  const [selectedPart, setSelectedPart] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      resetForm();
      loadData();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      part_id: '',
      partSearch: '',
      supplier_id: '',
      quantity_requested: '',
      requested_unit_price: '',
      request_notes: ''
    });
    setSelectedPart(null);
    setSelectedSupplier(null);
    setAttachments([]);
    setCreatedQuote(null);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: partsData } = await dbService.getSpareParts({}, 0, 500);
      const { data: suppliersData } = await dbService.getSuppliers();
      setParts(partsData || []);
      setFilteredParts(partsData || []);
      setSuppliers(suppliersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load parts and suppliers"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePartSearch = (searchValue) => {
    setFormData({ ...formData, partSearch: searchValue, part_id: '' });
    setSelectedPart(null);

    if (searchValue.length > 0) {
      const filtered = parts.filter(p =>
        p.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
        p.part_number?.toLowerCase().includes(searchValue.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredParts(filtered);
      setShowPartDropdown(true);
    } else {
      setFilteredParts(parts);
      setShowPartDropdown(false);
    }
  };

  const handleSelectPart = (part) => {
    setFormData({
      ...formData,
      part_id: part.id,
      partSearch: part.name
    });
    setSelectedPart(part);
    setShowPartDropdown(false);
  };

  const handleSupplierChange = (supplierId) => {
    setFormData({ ...formData, supplier_id: supplierId });
    const supplier = suppliers.find(s => s.id === supplierId);
    setSelectedSupplier(supplier);
  };

  const handleAttachmentUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Maximum file size is 5MB"
        });
        return;
      }
      setAttachments(prev => [...prev, { id: Date.now(), file, name: file.name }]);
    });
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleNext = () => {
    if (!formData.part_id || !formData.supplier_id || !formData.quantity_requested) {
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
          part_id: formData.part_id,
          supplier_id: formData.supplier_id,
          quantity_requested: parseInt(formData.quantity_requested),
          requested_unit_price: formData.requested_unit_price ? parseFloat(formData.requested_unit_price) : null,
          request_notes: formData.request_notes || null,
          status: 'pending',
          created_by: user.id,
          created_at: new Date().toISOString(),
          has_attachments: attachments.length > 0
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
                {/* Part Search */}
                <div className="relative">
                  <label className="text-sm font-semibold block mb-2">Select Part *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name, number, or category..."
                      value={formData.partSearch}
                      onChange={(e) => handlePartSearch(e.target.value)}
                      onFocus={() => formData.partSearch && setShowPartDropdown(true)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Dropdown */}
                  {showPartDropdown && (
                    <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                      {filteredParts.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          No parts found. Create one in Spare Parts module.
                        </div>
                      ) : (
                        filteredParts.map(part => (
                          <button
                            key={part.id}
                            onClick={() => handleSelectPart(part)}
                            className="w-full text-left px-4 py-3 hover:bg-teal-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="font-semibold text-slate-900">{part.name}</div>
                            <div className="text-xs text-slate-600">
                              #{part.part_number} • {part.category} • Stock: {part.current_quantity}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Part Info */}
                {selectedPart && (
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">Current Stock</p>
                          <p className="font-bold text-lg text-slate-900">{selectedPart.current_quantity}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Reorder Point</p>
                          <p className="font-bold text-lg text-slate-900">{selectedPart.reorder_point}</p>
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
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Choose a supplier...</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
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
                  <label className="text-sm font-semibold block mb-2">Attachments (Optional)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
                    <input
                      type="file"
                      multiple
                      onChange={handleAttachmentUpload}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png,.gif"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        <Upload className="h-6 w-6 text-slate-400 mb-2" />
                        <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG, PDF, DOC, XLS up to 5MB</p>
                      </div>
                    </label>
                  </div>

                  {/* Attachments List */}
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4 text-slate-600" />
                            <span className="text-sm text-slate-700">{att.name}</span>
                          </div>
                          <button
                            onClick={() => removeAttachment(att.id)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                        <p className="text-sm text-slate-600">#{selectedPart.part_number}</p>
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
                          {formData.requested_unit_price
                            ? `€${(parseFloat(formData.requested_unit_price) * parseInt(formData.quantity_requested)).toFixed(2)}`
                            : 'Not specified'}
                        </p>
                        {formData.requested_unit_price && (
                          <p className="text-sm text-slate-600">€{formData.requested_unit_price}/unit</p>
                        )}
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
                          {attachments.map(att => (
                            <div key={att.id} className="flex items-center gap-2 text-sm text-slate-700">
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
