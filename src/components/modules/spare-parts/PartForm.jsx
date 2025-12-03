import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Link as LinkIcon } from 'lucide-react';
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

const PartForm = ({ open, onOpenChange, editPart, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);

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
    unit_of_measure: 'pcs'
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
          unit_of_measure: editPart.unit_of_measure || 'pcs'
        });
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
          unit_of_measure: 'pcs'
        });
      }
    }
  }, [open, editPart]);

  const loadRefs = async () => {
    const [b, w, c] = await Promise.all([
        dbService.getBuildings(), 
        dbService.getWarehouses(),
        dbService.getCategories()
    ]);
    setBuildings(b.data || []);
    setWarehouses(w.data || []);
    setCategories(c.data || []);
    
    // Set default category if needed
    if (!editPart && c.data && c.data.length > 0) {
       setFormData(prev => ({ ...prev, category: c.data[0].name }));
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

      let result;
      if (editPart) {
        // SAFE UPDATE
        const { error } = await dbService.updateSparePart(editPart.id, payload);
        if (error) throw error;
        result = { success: true };
      } else {
        // Create new
        result = await dbService.createSparePartFull(payload, [], [], []);
        if (result.error) throw result.error;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>{editPart ? 'Edit Spare Part' : 'Add New Spare Part'}</DialogTitle>
        </DialogHeader>
        
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

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editPart ? 'Update Part' : 'Create Part'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PartForm;