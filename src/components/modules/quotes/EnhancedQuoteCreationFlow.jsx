import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, CheckCircle, AlertCircle, Send, Trash2, Edit2, Clock, Users, Zap, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SearchablePartSelector from './SearchablePartSelector';
import SearchableSupplierSelector from './SearchableSupplierSelector';

/**
 * EnhancedQuoteCreationFlow - Professional Quote Request Creation
 * Features:
 * - Item-level supplier selection (clean UX)
 * - Free text entry for custom items
 * - Smart supplier detection for parts with preferred_supplier
 * - Complete workflow tracking
 */
const EnhancedQuoteCreationFlow = ({ onSuccess, onClose }) => {
  const [step, setStep] = useState(1); // 1: Mode, 2: Items, 3: Review, 4: Success
  const [mode, setMode] = useState(null);
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({ 
    part: null, 
    supplier: null,
    quantity: '', 
    notes: '',
    isCustom: false,
    customPartName: ''
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [quoteMetadata, setQuoteMetadata] = useState({
    projectName: '',
    deliveryDate: '',
    paymentTerms: 'Net 30',
    specialRequirements: '',
  });
  const [createdQuotes, setCreatedQuotes] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);

  // Load all suppliers on mount
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data) setAllSuppliers(data);
      } catch (err) {
        console.error('Error loading suppliers:', err);
      }
    };
    loadSuppliers();
  }, []);

  // When part is selected, check if it has a preferred supplier
  const handlePartSelected = (part) => {
    setCurrentItem(prev => ({
      ...prev,
      part,
      isCustom: false,
      customPartName: ''
    }));

    // If part has preferred_supplier_id, auto-load that supplier
    if (part?.preferred_supplier_id) {
      const preferredSupplier = allSuppliers.find(s => s.id === part.preferred_supplier_id);
      if (preferredSupplier) {
        setCurrentItem(prev => ({
          ...prev,
          part,
          supplier: preferredSupplier,
          isCustom: false,
          customPartName: ''
        }));
        toast({
          title: '✅ Preferred Supplier Loaded',
          description: `${preferredSupplier.name} is set as the supplier for this part.`,
          duration: 2000
        });
      }
    } else {
      setCurrentItem(prev => ({
        ...prev,
        part,
        supplier: null,
        isCustom: false,
        customPartName: ''
      }));
    }
  };

  // Mode Selection Step
  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-teal-50 to-teal-100">
            <div>
              <CardTitle className="text-2xl">Create Quote Request</CardTitle>
              <p className="text-sm text-slate-600 mt-1">Choose how you'd like to create your quote</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-6 w-6" />
            </button>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {/* Mode Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Manual Mode */}
              <button
                onClick={() => {
                  setMode('manual');
                  setStep(2);
                }}
                className="p-6 border-2 border-slate-200 hover:border-teal-400 hover:bg-teal-50 rounded-xl transition-all text-left group"
              >
                <div className="h-12 w-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-teal-200 transition-colors">
                  <Zap className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">Quick Create</h3>
                <p className="text-sm text-slate-600">Add items one by one with supplier selection</p>
                <p className="text-xs text-slate-500 mt-3">✓ Select supplier per item</p>
                <p className="text-xs text-slate-500">✓ Custom items</p>
                <p className="text-xs text-slate-500">✓ Auto-load preferred suppliers</p>
              </button>

              {/* Bulk Mode */}
              <button
                onClick={() => {
                  setMode('bulk');
                  setStep(2);
                }}
                className="p-6 border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all text-left group opacity-50 cursor-not-allowed"
                disabled
              >
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">Bulk Import</h3>
                <p className="text-sm text-slate-600">Coming Soon</p>
                <p className="text-xs text-slate-500 mt-3">✓ Paste from Excel</p>
                <p className="text-xs text-slate-500">✓ Auto-parse format</p>
                <p className="text-xs text-slate-500">✓ 50+ items at once</p>
              </button>

              {/* Template Mode */}
              <button
                onClick={() => {
                  setMode('template');
                  setStep(2);
                }}
                className="p-6 border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50 rounded-xl transition-all text-left group opacity-50 cursor-not-allowed"
                disabled
              >
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">Use Template</h3>
                <p className="text-sm text-slate-600">Coming Soon</p>
                <p className="text-xs text-slate-500 mt-3">✓ Pre-filled items</p>
                <p className="text-xs text-slate-500">✓ Saved suppliers</p>
                <p className="text-xs text-slate-500">✓ Quick customize</p>
              </button>
            </div>

            {/* Benefits Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
              <div className="flex gap-3">
                <Clock className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Fast Creation</p>
                  <p className="text-xs text-slate-600">Most quotes in under 2 minutes</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Users className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Smart Suppliers</p>
                  <p className="text-xs text-slate-600">One supplier per item, auto-loaded</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Intuitive Flow</p>
                  <p className="text-xs text-slate-600">Clean, step-by-step process</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Creation Step
  if (step === 2 && mode === 'manual') {
    // Collect unique suppliers from items
    const itemSuppliers = [...new Set(items.filter(i => i.supplier?.id).map(i => i.supplier.id))]
      .map(id => allSuppliers.find(s => s.id === id))
      .filter(Boolean);

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
        <Card className="w-full max-w-5xl my-4">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-teal-50 to-teal-100">
            <div>
              <CardTitle className="text-2xl">Create Quote Request</CardTitle>
              <p className="text-sm text-slate-600 mt-1">Step 2 of 3: Add Items with Suppliers</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-6 w-6" />
            </button>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Summary Bar */}
            {items.length > 0 && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-teal-900">{items.length} items added</p>
                  <p className="text-sm text-teal-700">{itemSuppliers.length} unique supplier{itemSuppliers.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  {itemSuppliers.map(s => (
                    <p key={s.id} className="text-xs text-teal-700">{s.name}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Add Item Form */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-teal-600" />
                Add Quote Item
              </h3>

              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4 space-y-4">
                  {/* Toggle: Existing Part or Custom */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentItem({ ...currentItem, isCustom: false, customPartName: '', part: null, supplier: null })}
                      className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                        !currentItem.isCustom
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                      }`}
                    >
                      📦 Existing Part
                    </button>
                    <button
                      onClick={() => setCurrentItem({ ...currentItem, isCustom: true, part: null, supplier: null })}
                      className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                        currentItem.isCustom
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                      }`}
                    >
                      ✏️ Free Text
                    </button>
                  </div>

                  {/* Item Input Section */}
                  {!currentItem.isCustom ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold block mb-2">Part *</label>
                        <SearchablePartSelector
                          value={currentItem.part}
                          onChange={handlePartSelected}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-semibold block mb-2">Item Description *</label>
                      <Input
                        type="text"
                        value={currentItem.customPartName}
                        onChange={(e) => setCurrentItem({ ...currentItem, customPartName: e.target.value })}
                        placeholder="e.g., Custom Bracket, Installation Service, Tech Support"
                      />
                    </div>
                  )}

                  {/* Supplier Selection - Only show if part/item selected */}
                  {(currentItem.part || currentItem.customPartName) && (
                    <div>
                      <label className="text-sm font-semibold block mb-2">
                        Supplier *
                        {currentItem.supplier && (
                          <span className="text-xs font-normal text-teal-600 ml-2">({currentItem.supplier.name})</span>
                        )}
                      </label>
                      <SearchableSupplierSelector
                        value={currentItem.supplier}
                        onChange={(supplier) => setCurrentItem({ ...currentItem, supplier })}
                      />
                    </div>
                  )}

                  {/* Quantity */}
                  {(currentItem.part || currentItem.customPartName) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold block mb-2">Quantity *</label>
                        <Input
                          type="number"
                          min="1"
                          value={currentItem.quantity}
                          onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                          placeholder="10"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <button
                          onClick={() => {
                            if (!currentItem.part && !currentItem.customPartName) {
                              toast({ variant: 'destructive', title: 'Missing item' });
                              return;
                            }
                            if (!currentItem.supplier) {
                              toast({ variant: 'destructive', title: 'Missing supplier' });
                              return;
                            }
                            if (!currentItem.quantity) {
                              toast({ variant: 'destructive', title: 'Missing quantity' });
                              return;
                            }
                            if (editingIndex !== null) {
                              const newItems = [...items];
                              newItems[editingIndex] = currentItem;
                              setItems(newItems);
                              setEditingIndex(null);
                            } else {
                              setItems([...items, currentItem]);
                            }
                            setCurrentItem({ part: null, supplier: null, quantity: '', notes: '', isCustom: false, customPartName: '' });
                          }}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition-colors text-sm h-10"
                        >
                          {editingIndex !== null ? 'Update' : 'Add Item'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {(currentItem.part || currentItem.customPartName) && (
                    <div>
                      <label className="text-sm font-semibold block mb-2">Notes (Optional)</label>
                      <Input
                        type="text"
                        value={currentItem.notes}
                        onChange={(e) => setCurrentItem({ ...currentItem, notes: e.target.value })}
                        placeholder="Special requirements, certifications, etc."
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <h3 className="font-bold text-slate-900">Items ({items.length})</h3>
                {items.map((item, idx) => (
                  <div key={idx} className="p-4 bg-white border border-slate-200 rounded-lg hover:border-teal-300 hover:bg-teal-50/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {item.isCustom ? item.customPartName : item.part?.name}
                          </p>
                          {item.isCustom && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Custom</span>}
                        </div>
                        <p className="text-sm text-slate-600">📦 Qty: {item.quantity}</p>
                        {item.supplier && (
                          <p className="text-sm text-teal-600 font-medium">👤 {item.supplier.name}</p>
                        )}
                        {item.notes && <p className="text-xs text-amber-600 mt-2">📝 {item.notes}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setCurrentItem(item);
                            setEditingIndex(idx);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Metadata Section */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-bold text-slate-900">Quote Details (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold block mb-1">Project Name</label>
                  <Input
                    value={quoteMetadata.projectName}
                    onChange={(e) => setQuoteMetadata({ ...quoteMetadata, projectName: e.target.value })}
                    placeholder="e.g., Q4 Maintenance"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1">Delivery Date</label>
                  <Input
                    type="date"
                    value={quoteMetadata.deliveryDate}
                    onChange={(e) => setQuoteMetadata({ ...quoteMetadata, deliveryDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1">Payment Terms</label>
                  <select
                    value={quoteMetadata.paymentTerms}
                    onChange={(e) => setQuoteMetadata({ ...quoteMetadata, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option>Net 30</option>
                    <option>Net 60</option>
                    <option>Due on Delivery</option>
                    <option>Prepayment</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1">Special Requirements</label>
                <Textarea
                  value={quoteMetadata.specialRequirements}
                  onChange={(e) => setQuoteMetadata({ ...quoteMetadata, specialRequirements: e.target.value })}
                  placeholder="Quality requirements, certifications, urgency, etc."
                  className="h-20 resize-none"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={items.length === 0}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                Review & Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Review Step
  if (step === 3) {
    const uniqueSuppliers = [...new Map(items.map(item => [item.supplier?.id, item.supplier])).values()];
    const totalQuotes = items.length * uniqueSuppliers.length;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
        <Card className="w-full max-w-4xl my-4">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-green-50 to-green-100">
            <div>
              <CardTitle className="text-2xl">Review & Send Quotes</CardTitle>
              <p className="text-sm text-slate-600 mt-1">Step 3 of 3: Confirm before sending</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-6 w-6" />
            </button>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-slate-50">
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-600 font-semibold uppercase">Items</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-teal-50">
                <CardContent className="pt-4">
                  <p className="text-xs text-teal-700 font-semibold uppercase">Suppliers</p>
                  <p className="text-2xl font-bold text-teal-600 mt-1">{uniqueSuppliers.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="pt-4">
                  <p className="text-xs text-blue-700 font-semibold uppercase">Quotes</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{totalQuotes}</p>
                </CardContent>
              </Card>
            </div>

            {/* Items */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3">Items to be Quoted ({items.length})</h4>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{item.isCustom ? item.customPartName : item.part?.name}</p>
                        <p className="text-xs text-slate-600">Qty: {item.quantity} • Supplier: {item.supplier?.name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suppliers */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3">Suppliers Receiving Quotes ({uniqueSuppliers.length})</h4>
              <div className="space-y-2">
                {uniqueSuppliers.map(supplier => {
                  const itemsForSupplier = items.filter(i => i.supplier?.id === supplier.id);
                  return (
                    <div key={supplier.id} className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                      <p className="font-semibold text-slate-900">{supplier.name}</p>
                      <p className="text-xs text-slate-600">{itemsForSupplier.length} item{itemsForSupplier.length !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-teal-700 mt-1">📧 {supplier.email}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const quoteIds = [];
                    const quotesBySupplier = {};

                    // Group items by supplier
                    items.forEach(item => {
                      const supplierId = item.supplier.id;
                      if (!quotesBySupplier[supplierId]) {
                        quotesBySupplier[supplierId] = { supplier: item.supplier, items: [] };
                      }
                      quotesBySupplier[supplierId].items.push(item);
                    });

                    // Create one quote per supplier
                    for (const [supplierId, data] of Object.entries(quotesBySupplier)) {
                      const { data: created, error } = await supabase
                        .from('quote_requests')
                        .insert({
                          quote_id: `QR-${Date.now().toString(36).toUpperCase()}-${supplierId.slice(0, 4).toUpperCase()}`,
                          supplier_id: supplierId,
                          items: data.items.map(i => ({
                            part_id: i.isCustom ? null : i.part?.id,
                            part_name: i.isCustom ? i.customPartName : i.part?.name,
                            quantity: parseInt(i.quantity),
                            notes: i.notes,
                            is_custom: i.isCustom
                          })),
                          total_items: data.items.length,
                          estimated_total: 0,
                          status: 'pending',
                          created_by: user.id,
                          project_name: quoteMetadata.projectName || null,
                          delivery_date: quoteMetadata.deliveryDate || null,
                          request_notes: quoteMetadata.specialRequirements || null
                        })
                        .select();

                      if (error) throw error;
                      quoteIds.push(created[0]);
                    }

                    setCreatedQuotes(quoteIds);
                    setStep(4);
                    toast({
                      title: '✅ Quotes Created',
                      description: `${quoteIds.length} quote(s) created successfully`
                    });
                  } catch (error) {
                    toast({
                      variant: 'destructive',
                      title: 'Error',
                      description: error.message
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Create Quotes ({totalQuotes})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success Step
  if (step === 4) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Quotes Created Successfully!</h3>
              <p className="text-slate-600 mt-2">
                {createdQuotes.length} quote{createdQuotes.length !== 1 ? 's' : ''} created and ready for tracking
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-left max-h-40 overflow-y-auto space-y-2">
              {createdQuotes.map((quote, idx) => (
                <div key={idx} className="font-mono text-sm text-slate-700">
                  <span className="font-bold">{quote.quote_id}</span>
                  <span className="text-xs text-slate-500 ml-2">→ {quote.supplier_id}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
};

export default EnhancedQuoteCreationFlow;