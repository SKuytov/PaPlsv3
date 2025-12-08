import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Link as LinkIcon, Plus, Trash2, ChevronDown, ChevronUp, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { dbService } from '@/lib/supabase';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const PartForm = ({ open, onOpenChange, editPart, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [supplierMappings, setSupplierMappings] = useState([]);
  const [expandedSuppliers, setExpandedSuppliers] = useState({});
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [newMapping, setNewMapping] = useState({
    supplier_id: '',
    supplier_sku: '',
    supplier_part_number: '',
    min_order_qty: 1,
    lead_time_days: '',
    price_per_unit: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    part_number: '',
    barcode: '',
    category: '',
    manufacturer: '',
    description: '', // mapped to notes
    datasheet_url: '', // mapped to specifications.datasheet_url
    min_stock_level: 5,
    reorder_point: 10,
    current_quantity: 0,
    building_id: '',
    warehouse_id: '',
    bin_location: '',
    average_cost: 0,
    unit_of_measure: 'pcs',
    preferred_supplier_id: ''
  });

  useEffect(() => {
    if (open) {
      loadRefs();
      if (editPart) {
        setFormData({
          name: editPart.name || '',
          part_number: editPart.part_number || '',
          barcode: editPart.barcode || '',
          category: editPart.category || '',
          manufacturer: editPart.manufacturer || '',
          description: editPart.notes || '',
          datasheet_url: editPart.specifications?.datasheet_url || '',
          min_stock_level: editPart.min_stock_level || 5,
          reorder_point: editPart.reorder_point || 10,
          current_quantity: editPart.current_quantity || 0,
          building_id: editPart.building_id?.toString() || '',
          warehouse_id: editPart.warehouse_id || '',
          bin_location: editPart.bin_location || '',
          average_cost: editPart.average_cost || 0,
          unit_of_measure: editPart.unit_of_measure || 'pcs',
          preferred_supplier_id: editPart.preferred_supplier_id || ''
        });
        loadSupplierMappings(editPart.id);
      } else {
        setFormData({
          name: '',
          part_number: '',
          barcode: '',
          category: '',
          manufacturer: '',
          description: '',
          datasheet_url: '',
          min_stock_level: 5,
          reorder_point: 10,
          current_quantity: 0,
          building_id: '',
          warehouse_id: '',
          bin_location: '',
          average_cost: 0,
          unit_of_measure: 'pcs',
          preferred_supplier_id: ''
        });
        setSupplierMappings([]);
      }
      resetNewMapping();
      setSupplierSearchTerm('');
    }
  }, [open, editPart]);

  const loadRefs = async () => {
    setSuppliersLoading(true);
    try {
      const [b, w, c] = await Promise.all([
        dbService.getBuildings(),
        dbService.getWarehouses(),
        dbService.getCategories()
      ]);
      setBuildings(b.data || []);
      setWarehouses(w.data || []);
      setCategories(c.data || []);

      // Load suppliers with better error handling
      let suppliersData = [];
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, name, email')
          .order('name', { ascending: true });
        
        if (error) {
          console.error('Supabase error loading suppliers:', error);
          toast({
            variant: "destructive",
            title: "Warning",
            description: "Could not load suppliers list"
          });
        } else {
          suppliersData = data || [];
        }
      } catch (err) {
        console.error('Error loading suppliers:', err);
      }
      
      setSuppliers(suppliersData);

      // Set default category if needed
      if (!editPart && c.data && c.data.length > 0) {
        setFormData(prev => ({ ...prev, category: c.data[0].name }));
      }
    } catch (error) {
      console.error('Error loading references:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load form data"
      });
    } finally {
      setSuppliersLoading(false);
    }
  };

  const loadSupplierMappings = async (partId) => {
    try {
      const { data, error } = await supabase
        .from('supplier_part_mappings')
        .select(`
          id,
          supplier_id,
          supplier_sku,
          supplier_part_number,
          min_order_qty,
          lead_time_days,
          price_per_unit,
          supplier:suppliers(id, name, email)
        `)
        .eq('part_id', partId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupplierMappings(data || []);
    } catch (error) {
      console.error('Error loading supplier mappings:', error);
    }
  };

  const resetNewMapping = () => {
    setNewMapping({
      supplier_id: '',
      supplier_sku: '',
      supplier_part_number: '',
      min_order_qty: 1,
      lead_time_days: '',
      price_per_unit: ''
    });
    setSupplierSearchTerm('');
  };

  const handleAddSupplierMapping = async () => {
    if (!newMapping.supplier_id || !newMapping.supplier_sku) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Supplier and SKU are required"
      });
      return;
    }

    // Check if mapping already exists
    if (supplierMappings.some(m => m.supplier_id === newMapping.supplier_id)) {
      toast({
        variant: "destructive",
        title: "Duplicate Supplier",
        description: "This supplier already has a mapping for this part"
      });
      return;
    }

    // Add to local state (will be saved with part)
    const supplierData = suppliers.find(s => s.id === newMapping.supplier_id);
    setSupplierMappings(prev => [{
      ...newMapping,
      id: `temp-${Date.now()}`,
      supplier_id: newMapping.supplier_id,
      supplier: supplierData,
      supplier_sku: newMapping.supplier_sku,
      supplier_part_number: newMapping.supplier_part_number || null,
      min_order_qty: parseInt(newMapping.min_order_qty) || 1,
      lead_time_days: newMapping.lead_time_days ? parseInt(newMapping.lead_time_days) : null,
      price_per_unit: newMapping.price_per_unit ? parseFloat(newMapping.price_per_unit) : null,
      _new: true
    }, ...prev]);

    resetNewMapping();
    setShowSupplierDropdown(false);
  };

  const handleRemoveSupplierMapping = async (mappingId, isNew = false) => {
    if (isNew) {
      // Just remove from local state
      setSupplierMappings(prev => prev.filter(m => m.id !== mappingId));
      return;
    }

    // Delete from database
    try {
      const { error } = await supabase
        .from('supplier_part_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;
      setSupplierMappings(prev => prev.filter(m => m.id !== mappingId));
      toast({
        title: "Removed",
        description: "Supplier mapping removed"
      });
    } catch (error) {
      console.error('Error removing mapping:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove supplier mapping"
      });
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectSupplier = (supplierId) => {
    setNewMapping({ ...newMapping, supplier_id: supplierId });
    setShowSupplierDropdown(false);
    setSupplierSearchTerm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare specifications JSON
      const specs = {
        ...(editPart?.specifications || {}),
        datasheet_url: formData.datasheet_url
      };

      // Prepare payload
      const payload = {
        ...formData,
        building_id: formData.building_id ? parseInt(formData.building_id) : null,
        warehouse_id: formData.warehouse_id || null,
        preferred_supplier_id: formData.preferred_supplier_id || null,
        current_quantity: Number(formData.current_quantity),
        min_stock_level: Number(formData.min_stock_level),
        reorder_point: Number(formData.reorder_point),
        average_cost: Number(formData.average_cost),
        notes: formData.description,
        specifications: specs
      };

      // Remove temporary form fields that aren't DB columns
      delete payload.description;
      delete payload.datasheet_url;

      let partId;
      if (editPart) {
        // SAFE UPDATE
        const { error } = await dbService.updateSparePart(editPart.id, payload);
        if (error) throw error;
        partId = editPart.id;
      } else {
        // Create new
        const result = await dbService.createSparePart(payload);
        if (result.error) throw result.error;
        partId = result.data?.id;
      }

      // Save new supplier mappings
      const newMappings = supplierMappings.filter(m => m._new);
      if (newMappings.length > 0 && partId) {
        const mappingsToInsert = newMappings.map(m => ({
          part_id: partId,
          supplier_id: m.supplier_id,
          supplier_sku: m.supplier_sku,
          supplier_part_number: m.supplier_part_number || null,
          min_order_qty: m.min_order_qty || 1,
          lead_time_days: m.lead_time_days,
          price_per_unit: m.price_per_unit
        }));

        const { error: mappingError } = await supabase
          .from('supplier_part_mappings')
          .insert(mappingsToInsert);

        if (mappingError) throw mappingError;
      }

      toast({
        title: editPart ? "Part Updated" : "Part Created",
        description: `${formData.name} has been saved successfully.`
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save part details."
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSupplierExpanded = (supplierId) => {
    setExpandedSuppliers(prev => ({
      ...prev,
      [supplierId]: !prev[supplierId]
    }));
  };

  // Get available suppliers (not already mapped)
  const availableSuppliers = suppliers.filter(
    s => !supplierMappings.some(m => m.supplier_id === s.id)
  );

  // Filter suppliers based on search term
  const filteredSuppliers = availableSuppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  // Get selected supplier name
  const selectedSupplierName = newMapping.supplier_id 
    ? suppliers.find(s => s.id === newMapping.supplier_id)?.name 
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>{editPart ? 'Edit Spare Part' : 'Add New Spare Part'}</DialogTitle>
        </DialogHeader>

        {suppliersLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Basic Info */}
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Part Name</label>
                <Input required value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g. Hydraulic Pump Seal Kit" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Part Number</label>
                <Input required value={formData.part_number} onChange={e => handleChange('part_number', e.target.value)} placeholder="OEM-123-456" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Barcode / SKU</label>
                <Input value={formData.barcode} onChange={e => handleChange('barcode', e.target.value)} placeholder="Scanned Value" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={formData.category} onValueChange={v => handleChange('category', v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Manufacturer</label>
                <Input value={formData.manufacturer} onChange={e => handleChange('manufacturer', e.target.value)} placeholder="e.g. Bosch Rexroth" />
              </div>

              {/* Stock & Location */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold text-slate-500 uppercase mb-3">Inventory Control</h4>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Current Stock</label>
                <Input type="number" min="0" value={formData.current_quantity} onChange={e => handleChange('current_quantity', e.target.value)} />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Unit of Measure</label>
                <Select value={formData.unit_of_measure} onValueChange={v => handleChange('unit_of_measure', v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="l">Liters (l)</SelectItem>
                    <SelectItem value="m">Meters (m)</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4 col-span-2 md:col-span-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Min Level</label>
                  <Input type="number" min="0" value={formData.min_stock_level} onChange={e => handleChange('min_stock_level', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Reorder Point</label>
                  <Input type="number" min="0" value={formData.reorder_point} onChange={e => handleChange('reorder_point', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Avg. Unit Cost (€)</label>
                <Input type="number" min="0" step="0.01" value={formData.average_cost} onChange={e => handleChange('average_cost', e.target.value)} />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Building</label>
                <Select value={formData.building_id} onValueChange={v => handleChange('building_id', v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Building..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {buildings.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Warehouse</label>
                <Select value={formData.warehouse_id} onValueChange={v => handleChange('warehouse_id', v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Warehouse..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {warehouses
                      .filter(w => !formData.building_id || w.building_id.toString() === formData.building_id)
                      .map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Bin / Shelf Location</label>
                <Input value={formData.bin_location} onChange={e => handleChange('bin_location', e.target.value)} placeholder="e.g. A-12-3" />
              </div>

              {/* Preferred Supplier */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold text-slate-500 uppercase mb-3">Supplier Preferences</h4>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> Preferred Supplier
                </label>
                <p className="text-xs text-slate-600 mb-2">Select which supplier to use by default for this part</p>
                <Select value={formData.preferred_supplier_id} onValueChange={v => handleChange('preferred_supplier_id', v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="None (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="">None</SelectItem>
                    {supplierMappings.map(mapping => (
                      <SelectItem key={mapping.supplier_id} value={mapping.supplier_id}>
                        {mapping.supplier?.name || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier Mappings Section */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold text-slate-500 uppercase mb-3">Supplier Part IDs</h4>
                <p className="text-xs text-slate-600 mb-4">Link suppliers to their unique part numbers/SKUs for this item. These will be used in quotes.</p>

                {/* Current Mappings */}
                {supplierMappings.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {supplierMappings.map((mapping) => (
                      <div key={mapping.id} className={`border-2 rounded-lg p-3 ${
                        formData.preferred_supplier_id === mapping.supplier_id 
                          ? 'border-amber-400 bg-amber-50' 
                          : 'border-slate-200 bg-slate-50'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">{mapping.supplier?.name || 'Unknown Supplier'}</p>
                              {formData.preferred_supplier_id === mapping.supplier_id && (
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              )}
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-600">SKU:</span>
                                <p className="font-mono text-slate-900">{mapping.supplier_sku}</p>
                              </div>
                              {mapping.supplier_part_number && (
                                <div>
                                  <span className="text-slate-600">Part #:</span>
                                  <p className="font-mono text-slate-900">{mapping.supplier_part_number}</p>
                                </div>
                              )}
                              {mapping.lead_time_days && (
                                <div>
                                  <span className="text-slate-600">Lead Time:</span>
                                  <p className="font-mono text-slate-900">{mapping.lead_time_days} days</p>
                                </div>
                              )}
                              {mapping.price_per_unit && (
                                <div>
                                  <span className="text-slate-600">Price:</span>
                                  <p className="font-mono text-slate-900">€{mapping.price_per_unit.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSupplierMapping(mapping.id, mapping._new)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            title="Remove mapping"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Mapping */}
                <div className="border border-slate-300 rounded-lg p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">Add Supplier Mapping</p>
                    {suppliers.length === 0 && (
                      <p className="text-xs text-red-600 font-medium">No suppliers available</p>
                    )}
                    {availableSuppliers.length === 0 && suppliers.length > 0 && (
                      <p className="text-xs text-amber-600 font-medium">All suppliers mapped</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Searchable Supplier Dropdown */}
                    <div className="relative">
                      <label className="text-xs font-medium mb-1 block">Supplier *</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                          className="w-full px-3 py-2 h-9 text-sm bg-white border border-slate-300 rounded-lg text-left flex items-center justify-between hover:border-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        >
                          <span className={selectedSupplierName ? 'text-slate-900' : 'text-slate-500'}>
                            {selectedSupplierName || (suppliers.length === 0 ? "No suppliers" : "Select supplier...")}
                          </span>
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </button>

                        {showSupplierDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-300 rounded-lg shadow-lg">
                            {/* Search Input */}
                            <div className="p-2 border-b border-slate-200">
                              <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search suppliers..."
                                  value={supplierSearchTerm}
                                  onChange={(e) => setSupplierSearchTerm(e.target.value)}
                                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                  autoFocus
                                />
                              </div>
                            </div>

                            {/* Supplier List */}
                            <div className="max-h-48 overflow-y-auto">
                              {filteredSuppliers.length === 0 ? (
                                <div className="p-3 text-sm text-slate-500 text-center">
                                  {availableSuppliers.length === 0 && suppliers.length > 0
                                    ? "All suppliers mapped"
                                    : "No suppliers found"
                                  }
                                </div>
                              ) : (
                                filteredSuppliers.map(supplier => (
                                  <button
                                    key={supplier.id}
                                    type="button"
                                    onClick={() => handleSelectSupplier(supplier.id)}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50 flex flex-col"
                                  >
                                    <span className="font-medium text-slate-900">{supplier.name}</span>
                                    {supplier.email && (
                                      <span className="text-xs text-slate-500">{supplier.email}</span>
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1 block">Their SKU/ID *</label>
                      <Input
                        type="text"
                        placeholder="SKU-12345"
                        value={newMapping.supplier_sku}
                        onChange={(e) => setNewMapping({ ...newMapping, supplier_sku: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1 block">Their Part #</label>
                      <Input
                        type="text"
                        placeholder="PART-ABC-500"
                        value={newMapping.supplier_part_number}
                        onChange={(e) => setNewMapping({ ...newMapping, supplier_part_number: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1 block">Min Order Qty</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={newMapping.min_order_qty}
                        onChange={(e) => setNewMapping({ ...newMapping, min_order_qty: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1 block">Lead Time (days)</label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="14"
                        value={newMapping.lead_time_days}
                        onChange={(e) => setNewMapping({ ...newMapping, lead_time_days: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1 block">Unit Price (€)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={newMapping.price_per_unit}
                        onChange={(e) => setNewMapping({ ...newMapping, price_per_unit: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddSupplierMapping}
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 w-full disabled:bg-slate-300"
                    disabled={availableSuppliers.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplier
                  </Button>
                </div>
              </div>

              {/* Additional Details */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold text-slate-500 uppercase mb-3">Additional Details</h4>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> Datasheet URL
                </label>
                <Input value={formData.datasheet_url} onChange={e => handleChange('datasheet_url', e.target.value)} placeholder="https://..." />
                <p className="text-xs text-slate-500 mt-1">Link to external datasheet (OneDrive, SharePoint, etc.)</p>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Notes / Specifications</label>
                <Textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} placeholder="Add any additional details here..." className="h-20 bg-white" />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editPart ? 'Update Part' : 'Create Part'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PartForm;