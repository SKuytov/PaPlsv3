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
import QuoteDistribution from './QuoteDistribution';

const EnhancedQuoteCreationFlow = ({ onSuccess, onClose }) => {
  const [step, setStep] = useState(1);
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
  const [createdQuote, setCreatedQuote] = useState(null);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [showDistribution, setShowDistribution] = useState(false);
  const [distributionData, setDistributionData] = useState(null);

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
                <p className="text-xs text-slate-500">✓ Custom items supported</p>
                <p className="text-xs text-slate-500">✓ Multiple items in ONE quote</p>
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
                  <p className="font-semibold text-slate-900 text-sm">One Quote</p>
                  <p className="text-xs text-slate-600">All items in a single quote request</p>
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
    const itemSuppliers = [...new Set(items.filter(i => i.supplier?.id).map(i => i.supplier.id))]
      .map(id => allSuppliers.find(s => s.id === id))
      .filter(Boolean);

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
        <Card className="w-full max-w-5xl my-4">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-teal-50 to-teal-100">
            <div>
              <CardTitle className="text-2xl">Create Quote Request</CardTitle>
              <p className="text-sm text-slate-600 mt-1">Step 2 of 3: Add Items (all items go into ONE quote)</p>
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
                <p className="text-sm text-blue-700 mt-1">This quote will contain {items.length} item{items.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-blue-600 mt-2">✓ All items will be sent together in ONE quote request</p>
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
                <h3 className="font-bold text-slate-900">Items in Quote ({items.length})</h3>
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
                          <p className="text-sm text-teal-600 font-medium flex items-center gap-1">
                            👤 {item.supplier.name}
                          </p>
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
                  <p className="text-xs text-slate-600 font-semibold uppercase">Items in Quote</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="pt-4">
                  <p className="text-xs text-blue-700 font-semibold uppercase">Quote Records</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">1</p>
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

            {/* Quote Summary */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-900">✓ One Quote Request</p>
              <p className="text-sm text-green-700 mt-1">All {items.length} items will be sent in a single quote request</p>
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
                    console.log('=== CREATING QUOTE ===' );
                    console.log('Items:', items);
                    console.log('Metadata:', quoteMetadata);
                    
                    // Create ONE quote with all items
                    const quoteId = `QR-${Date.now().toString(36).toUpperCase()}`;
                    console.log('Quote ID:', quoteId);
                    
                    // Map items correctly for database
                    const itemsForDB = items.map(i => ({
                      part_id: i.isCustom ? null : (i.part?.id || null),
                      part_name: i.isCustom ? i.customPartName : i.part?.name,
                      quantity: parseInt(i.quantity),
                      notes: i.notes || '',
                      is_custom: i.isCustom
                    }));
                    
                    console.log('Items for DB:', itemsForDB);
                    
                    const { data, error } = await supabase
                      .from('quote_requests')
                      .insert({
                        quote_id: quoteId,
                        items: itemsForDB,
                        total_items: items.length,
                        estimated_total: 0,
                        status: 'pending',
                        created_by: user?.id || null,
                        project_name: quoteMetadata.projectName || null,
                        delivery_date: quoteMetadata.deliveryDate || null,
                        request_notes: quoteMetadata.specialRequirements || null
                      })
                      .select();

                    console.log('Database response error:', error);
                    console.log('Database response data:', data);

                    if (error) {
                      console.error('Database error:', error);
                      throw new Error(error.message);
                    }

                    if (data && data.length > 0) {
                      const quote = data[0];
                      console.log('Quote created successfully:', quote);
                      
                      // Prepare distribution data
                      const distData = {
                        id: quote.quote_id,
                        items: items.map(i => ({
                          part_name: i.isCustom ? i.customPartName : i.part?.name,
                          quantity: i.quantity,
                          notes: i.notes || '',
                          is_custom: i.isCustom
                        })),
                        project: quote.project_name,
                        delivery_date: quote.delivery_date,
                        payment_terms: quoteMetadata.paymentTerms,
                        special_notes: quote.request_notes,
                        created_by: user?.email || 'Procurement Team',
                        created_at: quote.created_at
                      };
                      
                      console.log('Distribution data:', distData);
                      
                      setCreatedQuote(quote);
                      setDistributionData(distData);
                      setShowDistribution(true);
                      setStep(4);
                      
                      toast({
                        title: '✅ Quote Created',
                        description: `Quote #${quoteId} created successfully`
                      });
                    } else {
                      throw new Error('No quote returned from database');
                    }
                  } catch (error) {
                    console.error('Error creating quote:', error);
                    toast({
                      variant: 'destructive',
                      title: 'Error Creating Quote',
                      description: error.message || 'Failed to create quote'
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
                    Create & Send Quote
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
    console.log('STEP 4 - showDistribution:', showDistribution);
    console.log('STEP 4 - distributionData:', distributionData);
    
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
                  <h3 className="text-2xl font-bold text-slate-900">Quote Created Successfully!</h3>
                  <p className="text-slate-600 mt-2">Quote #{createdQuote?.quote_id}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg text-left space-y-2">
                  <p className="text-sm font-semibold text-slate-900">Items: {items.length}</p>
                  {items.slice(0, 3).map((item, idx) => (
                    <p key={idx} className="text-xs text-slate-600">• {item.isCustom ? item.customPartName : item.part?.name} (Qty: {item.quantity})</p>
                  ))}
                  {items.length > 3 && <p className="text-xs text-slate-600">... and {items.length - 3} more item(s)</p>}
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
                      console.log('Clicked Send Quote button');
                      setShowDistribution(true);
                    }}
                  >
                    📧 Send Quote
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Distribution Modal - ALWAYS render if showDistribution is true */}
        {showDistribution && distributionData && (
          <QuoteDistribution
            quoteRequest={distributionData}
            onClose={() => {
              console.log('Distribution modal closed');
              setShowDistribution(false);
              onClose();
            }}
            onSent={(data) => {
              console.log('Quote sent via:', data);
              toast({
                title: `✅ Quote sent via ${data.method}!`,
                description: `Quote #${createdQuote?.quote_id} sent successfully`
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