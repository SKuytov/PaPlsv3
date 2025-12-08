import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, CheckCircle, AlertCircle, Send, Trash2, Edit2, Clock, Users, Zap, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SearchablePartSelector from './SearchablePartSelector';
import SearchableSupplierSelector from './SearchableSupplierSelector';
import QuoteDistribution from './QuoteDistribution';
import { useSupplierPartMapping } from '@/lib/hooks/useSupplierPartMapping';

// 🎯 SIMPLIFIED QUOTE ID GENERATOR: QT-YY-XXXXX
const generateSimpleQuoteId = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // YY: 25 for 2025
  const random = Math.random().toString(36).substring(2, 7).toUpperCase(); // 5-char random: ABCDE
  return `QT-${year}-${random}`;
};

const EnhancedQuoteCreationFlow = ({ onSuccess, onClose }) => {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState(null);
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({ 
    part: null, 
    supplier: null,
    quantity: '', 
    notes: '',
    supplierPartId: '', // Supplier's unique ID for this part
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
  const [showDistribution, setShowDistribution] = useState(false);
  const [distributionData, setDistributionData] = useState(null);

  // ✅ AUTO-LOAD SUPPLIER PART MAPPING DATA
  const { mapping: supplierMapping, loading: mappingLoading } = useSupplierPartMapping(
    currentItem.part?.id,
    currentItem.supplier?.id,
    (data) => {
      // Auto-populate when mapping found
      setCurrentItem(prev => ({
        ...prev,
        supplierPartId: data.supplier_part_number || ''
      }));
    }
  );

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
    }
    loadSuppliers();
  }, []);

  const handlePartSelected = (part) => {
    setCurrentItem(prev => ({
      ...prev,
      part,
      isCustom: false,
      customPartName: ''
    }));

    if (part?.preferred_supplier && part.preferred_supplier.id) {
      setCurrentItem(prev => ({
        ...prev,
        part,
        supplier: part.preferred_supplier,
        isCustom: false,
        customPartName: ''
      }));

      toast({
        title: '⭐ Smart Match Found!',
        description: `Supplier "${part.preferred_supplier.name}" is preferred for this part. You can change it if needed.`,
        duration: 3000
      });
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

  // Get items grouped by supplier
  const getItemsBySupplier = () => {
    const grouped = {};
    items.forEach(item => {
      const supplierId = item.supplier?.id || 'no-supplier';
      if (!grouped[supplierId]) {
        grouped[supplierId] = { supplier: item.supplier, items: [] };
      }
      grouped[supplierId].items.push(item);
    });
    return grouped;
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
                <p className="text-sm text-slate-600">Add items one by one with smart supplier matching</p>
                <p className="text-xs text-slate-500 mt-3">✓ Smart supplier auto-load</p>
                <p className="text-xs text-slate-500">✓ Separate quotes by supplier</p>
                <p className="text-xs text-slate-500">✓ Multiple suppliers supported</p>
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
              </button>
            </div>

            {/* Benefits Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
              <div className="flex gap-3">
                <Clock className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Smart Matching</p>
                  <p className="text-xs text-slate-600">Auto-loads preferred suppliers instantly</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Users className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Separate Quotes</p>
                  <p className="text-xs text-slate-600">One quote per supplier automatically</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Total Control</p>
                  <p className="text-xs text-slate-600">Can override any auto-selected supplier</p>
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
    const itemsBySupplier = getItemsBySupplier();
    const uniqueSuppliers = Object.values(itemsBySupplier).filter(g => g.supplier);

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
        <Card className="w-full max-w-5xl my-4">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-teal-50 to-teal-100">
            <div>
              <CardTitle className="text-2xl">Create Quote Request</CardTitle>
              <p className="text-sm text-slate-600 mt-1">Step 2 of 3: Add Items (separate quotes will be created per supplier)</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-6 w-6" />
            </button>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Summary Bar */}
            {items.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-semibold text-blue-900">📋 Quote Summary</p>
                <p className="text-sm text-blue-700 mt-1">You have {items.length} item{items.length !== 1 ? 's' : ''} in {uniqueSuppliers.length} supplier{uniqueSuppliers.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-blue-600 mt-2">✓ A separate quote will be created for each supplier</p>
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
                        <label className="text-sm font-semibold block mb-2">Part * (with Smart Supplier Detection)</label>
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

                  {/* Supplier Selection */}
                  {(currentItem.part || currentItem.customPartName) && (
                    <div>
                      <label className="text-sm font-semibold block mb-2">
                        Supplier *
                        {currentItem.supplier && (
                          <span className={`text-xs font-normal ml-2 px-2 py-0.5 rounded ${
                            currentItem.part?.preferred_supplier?.id === currentItem.supplier.id
                              ? 'bg-teal-100 text-teal-700 font-semibold'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {currentItem.part?.preferred_supplier?.id === currentItem.supplier.id
                              ? '⭐ Auto-Loaded'
                              : '✓ Selected'}
                          </span>
                        )}
                      </label>
                      <SearchableSupplierSelector
                        value={currentItem.supplier}
                        onChange={(supplier) => setCurrentItem({ ...currentItem, supplier })}
                      />
                    </div>
                  )}

                  {/* ✅ SUPPLIER PART ID WITH AUTO-MAPPING FIX & FIXED LOADING STATE */}
                  {(currentItem.part || currentItem.customPartName) && currentItem.supplier && !currentItem.isCustom && (
                    <div className="space-y-4">
                      {/* 🔧 FIXED: Only show loading if mapping is still loading AND we don't have data yet */}
                      {mappingLoading && !supplierMapping?.supplier_part_number && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                          <div className="animate-spin text-blue-600">⟳</div>
                          <div>
                            <p className="text-sm font-semibold text-blue-900">Loading supplier info...</p>
                            <p className="text-xs text-blue-700 mt-0.5">
                              Checking for part number from {currentItem.supplier.name}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Supplier Part ID Field */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-semibold text-slate-900">Supplier Part ID/SKU</label>
                          {supplierMapping?.supplier_part_number && (
                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                              ✓ Found
                            </span>
                          )}
                        </div>
                        <Input
                          type="text"
                          value={currentItem.supplierPartId || (supplierMapping?.supplier_part_number || '')}
                          onChange={(e) => setCurrentItem({ ...currentItem, supplierPartId: e.target.value })}
                          placeholder="e.g., SKU-12345, PART-ABC, their internal ID"
                          className={`${
                            supplierMapping?.supplier_part_number && !currentItem.supplierPartId
                              ? 'border-green-300 bg-green-50'
                              : currentItem.supplierPartId
                              ? 'border-slate-300'
                              : 'border-amber-300 bg-amber-50'
                          }`}
                        />
                        {!supplierMapping?.supplier_part_number && !mappingLoading && (
                          <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>Not found - enter manually or create mapping in Suppliers</span>
                          </p>
                        )}
                        {supplierMapping?.supplier_part_number && !currentItem.supplierPartId && (
                          <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
                            <span>✓</span>
                            <span>Auto-populated from supplier data</span>
                          </p>
                        )}
                      </div>

                      {/* Info Box if mapping exists */}
                      {supplierMapping && (
                        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                          <p className="text-xs text-teal-900 font-semibold">✓ Supplier part data found in system</p>
                          {supplierMapping.lead_time_days && (
                            <p className="text-xs text-teal-700 mt-1">Lead time: {supplierMapping.lead_time_days} days</p>
                          )}
                        </div>
                      )}
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
                            setCurrentItem({ part: null, supplier: null, quantity: '', notes: '', supplierPartId: '', isCustom: false, customPartName: '' });
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

            {/* Items List - Grouped by Supplier */}
            {items.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-bold text-slate-900">Items Grouped by Supplier ({items.length} total)</h3>
                {Object.entries(itemsBySupplier).map(([supplierId, group]) => (
                  <div key={supplierId} className="border-l-4 border-teal-500 pl-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">
                        {group.supplier ? group.supplier.name : 'No Supplier'}
                      </p>
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-semibold">
                        {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {group.items.map((item, idx) => {
                      const actualIndex = items.indexOf(item);
                      return (
                        <div key={actualIndex} className="p-3 bg-white border border-slate-200 rounded-lg hover:border-teal-300 hover:bg-teal-50/30 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-900">
                                  {item.isCustom ? item.customPartName : item.part?.name}
                                </p>
                                {item.isCustom && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Custom</span>}
                              </div>
                              {item.supplierPartId && <p className="text-xs text-blue-600">🏷️ {item.supplier?.name} SKU: {item.supplierPartId}</p>}
                              <p className="text-sm text-slate-600">📦 Qty: {item.quantity}</p>
                              {item.notes && <p className="text-xs text-amber-600 mt-2">📝 {item.notes}</p>}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setCurrentItem(item);
                                  setEditingIndex(actualIndex);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setItems(items.filter((_, i) => i !== actualIndex))}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
    const itemsBySupplier = getItemsBySupplier();
    const quoteCount = Object.values(itemsBySupplier).filter(g => g.supplier).length;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
        <Card className="w-full max-w-4xl my-4">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-green-50 to-green-100">
            <div>
              <CardTitle className="text-2xl">Review & Send Quote</CardTitle>
              <p className="text-sm text-slate-600 mt-1">Step 3 of 3: Confirm and send to suppliers</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-6 w-6" />
            </button>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-50">
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-600 font-semibold uppercase">Items in Request</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="pt-4">
                  <p className="text-xs text-blue-700 font-semibold uppercase">Quote Records</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{quoteCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Items by Supplier */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3">Quotes to be Created ({quoteCount})</h4>
              <div className="space-y-4">
                {Object.entries(itemsBySupplier).map(([supplierId, group]) => (
                  group.supplier && (
                    <div key={supplierId} className="border-l-4 border-teal-500 pl-4 space-y-2 p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <p className="font-bold text-slate-900">
                          📧 Quote for {group.supplier.name}
                        </p>
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-semibold">
                          {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item, idx) => (
                          <p key={idx} className="text-sm text-slate-700">
                            • {item.isCustom ? item.customPartName : item.part?.name} (Qty: {item.quantity}){item.supplierPartId ? ` - SKU: ${item.supplierPartId}` : ''}
                          </p>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Quote Summary */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                ✓ {quoteCount} Separate Quote{quoteCount !== 1 ? 's' : ''} Ready
              </p>
              <p className="text-sm text-green-700 mt-1">Each supplier will receive their own quote with only their items</p>
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
                    const itemsBySupplier = getItemsBySupplier();
                    const createdQuotesList = [];

                    // Create one quote per supplier
                    for (const [supplierId, group] of Object.entries(itemsBySupplier)) {
                      if (!group.supplier) continue;

                      // 🎯 NEW QUOTE ID FORMAT: QT-YY-XXXXX (simplified and cleaner)
                      const quoteId = generateSimpleQuoteId();

                      const itemsForDB = group.items.map(i => ({
                        part_id: i.isCustom ? null : (i.part?.id || null),
                        part_name: i.isCustom ? i.customPartName : (i.part?.name || ''),
                        part_number: i.isCustom ? null : (i.part?.part_number || ''),
                        description: i.isCustom ? null : (i.part?.description || ''),
                        supplier_part_id: i.supplierPartId || null,
                        quantity: parseInt(i.quantity),
                        unit_of_measure: i.part?.unit_of_measure || 'pcs',
                        notes: i.notes || '',
                        is_custom: i.isCustom
                      }));

                      const { data, error } = await supabase
                        .from('quote_requests')
                        .insert({
                          quote_id: quoteId,
                          supplier_id: group.supplier.id,
                          items: itemsForDB,
                          total_items: group.items.length,
                          estimated_total: 0,
                          status: 'pending',
                          created_by: user?.id || null,
                          project_name: quoteMetadata.projectName || null,
                          delivery_date: quoteMetadata.deliveryDate || null,
                          request_notes: quoteMetadata.specialRequirements || null
                        })
                        .select();

                      if (error) throw error;

                      if (data && data.length > 0) {
                        const quote = data[0];
                        createdQuotesList.push({
                          ...quote,
                          supplier: group.supplier,
                          items: itemsForDB // Use the full item data with all fields
                        });
                      }
                    }

                    if (createdQuotesList.length > 0) {
                      setCreatedQuotes(createdQuotesList);
                      setDistributionData({ quotes: createdQuotesList, metadata: quoteMetadata });
                      setShowDistribution(true);
                      setStep(4);

                      toast({
                        title: '✅ Quotes Created',
                        description: `${createdQuotesList.length} quote${createdQuotesList.length !== 1 ? 's' : ''} created successfully`
                      });
                    }
                  } catch (error) {
                    console.error('Error creating quotes:', error);
                    toast({
                      variant: 'destructive',
                      title: 'Error Creating Quotes',
                      description: error.message || 'Failed to create quotes'
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
                    Create & Send Quotes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success Step with Distribution
  if (step === 4) {
    return (
      <>
        {!showDistribution && (
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
              <CardContent className="p-12 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Quotes Created Successfully!</h3>
                  <p className="text-slate-600 mt-2">{createdQuotes.length} quote{createdQuotes.length !== 1 ? 's' : ''} ready to send</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg text-left space-y-2">
                  {createdQuotes.map((quote, idx) => (
                    <div key={idx}>
                      <p className="text-sm font-semibold text-slate-900">📧 {quote.supplier?.name}</p>
                      <p className="text-xs text-slate-600">Quote #{quote.quote_id} • {quote.items?.length || 0} item{quote.items?.length !== 1 ? 's' : ''}</p>
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
                      setShowDistribution(true);
                    }}
                  >
                    📧 Send Quotes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Distribution Modal */}
        {showDistribution && distributionData && (
          <QuoteDistribution
            quoteRequests={distributionData.quotes}
            metadata={distributionData.metadata}
            onClose={() => {
              setShowDistribution(false);
              onClose();
            }}
            onSent={(data) => {
              toast({
                title: `✅ Quotes sent via ${data.method}!`,
                description: `${data.count} quote${data.count !== 1 ? 's' : ''} sent successfully`
              });
              setShowDistribution(false);
              onClose();
            }}
          />
        )}
      </>
    );
  }
};

export default EnhancedQuoteCreationFlow;