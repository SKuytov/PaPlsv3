import React, { useEffect } from 'react';
import SearchablePartSelector from './SearchablePartSelector';
import { useSupplierPartMapping } from '@/lib/hooks/useSupplierPartMapping';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, AlertCircle } from 'lucide-react';
import { QuoteItem } from '@/lib/hooks/useQuoteItems';

interface QuoteItemFormProps {
  currentItem: QuoteItem;
  selectedSupplier: any;
  onItemChange: (item: QuoteItem) => void;
  onAddItem: (item: QuoteItem) => boolean;
  isEditing: boolean;
  onCancelEdit?: () => void;
}

export const QuoteItemForm: React.FC<QuoteItemFormProps> = ({
  currentItem,
  selectedSupplier,
  onItemChange,
  onAddItem,
  isEditing,
  onCancelEdit
}) => {
  // Auto-load supplier part mapping
  const { mapping: supplierMapping, loading: mappingLoading } = useSupplierPartMapping(
    currentItem.part?.id,
    selectedSupplier?.id,
    (data) => {
      // Auto-populate when mapping found
      onItemChange({
        ...currentItem,
        supplierPartNumber: data.supplier_part_number || '',
        supplierSku: data.supplier_sku || ''
      });
    }
  );

  const handleAddItem = () => {
    onAddItem(currentItem);
  };

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardHeader className="bg-slate-100 border-b pb-3">
        <CardTitle className="text-sm">
          {isEditing ? '✏️ Edit Item' : '➕ Add New Item'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Part Selection */}
        <div>
          <label className="text-sm font-semibold block mb-2">Select Part *</label>
          <SearchablePartSelector
            value={currentItem.part}
            onChange={(part) => onItemChange({ ...currentItem, part })}
            supplierFilter={selectedSupplier?.id}
            selectedSupplier={selectedSupplier}
          />
        </div>

        {/* Supplier Part Fields - Auto-populated or allow manual entry */}
        {currentItem.part && selectedSupplier && (
          <div className="space-y-4">
            {/* Loading State */}
            {mappingLoading && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <div className="animate-spin text-blue-600">⟳</div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Loading supplier info...</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Checking for part number and SKU from {selectedSupplier.name}
                  </p>
                </div>
              </div>
            )}

            {/* Supplier Part Fields Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Supplier Part Number */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-900">Supplier Part Number</label>
                  {supplierMapping?.supplier_part_number && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                      ✓ Found
                    </span>
                  )}
                </div>
                <Input
                  type="text"
                  value={currentItem.supplierPartNumber || (supplierMapping?.supplier_part_number || '')}
                  onChange={(e) =>
                    onItemChange({
                      ...currentItem,
                      supplierPartNumber: e.target.value
                    })
                  }
                  placeholder="Enter part number..."
                  className={`${
                    supplierMapping?.supplier_part_number && !currentItem.supplierPartNumber
                      ? 'border-green-300 bg-green-50'
                      : currentItem.supplierPartNumber
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
                {supplierMapping?.supplier_part_number && !currentItem.supplierPartNumber && (
                  <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
                    <span>✓</span>
                    <span>Auto-populated from supplier data</span>
                  </p>
                )}
              </div>

              {/* Supplier SKU */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-900">Supplier SKU</label>
                  {supplierMapping?.supplier_sku && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                      ✓ Found
                    </span>
                  )}
                </div>
                <Input
                  type="text"
                  value={currentItem.supplierSku || (supplierMapping?.supplier_sku || '')}
                  onChange={(e) =>
                    onItemChange({
                      ...currentItem,
                      supplierSku: e.target.value
                    })
                  }
                  placeholder="Enter SKU..."
                  className={`${
                    supplierMapping?.supplier_sku && !currentItem.supplierSku
                      ? 'border-green-300 bg-green-50'
                      : currentItem.supplierSku
                      ? 'border-slate-300'
                      : 'border-amber-300 bg-amber-50'
                  }`}
                />
                {!supplierMapping?.supplier_sku && !mappingLoading && (
                  <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Not found - enter manually or create mapping in Suppliers</span>
                  </p>
                )}
                {supplierMapping?.supplier_sku && !currentItem.supplierSku && (
                  <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
                    <span>✓</span>
                    <span>Auto-populated from supplier data</span>
                  </p>
                )}
              </div>
            </div>

            {/* Info Box if mapping exists */}
            {supplierMapping && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <p className="text-xs text-teal-900 font-semibold">✓ Supplier part data found in system</p>
                {supplierMapping.lead_time_days && (
                  <p className="text-xs text-teal-700 mt-1">Lead time: {supplierMapping.lead_time_days} days</p>
                )}
                {supplierMapping.unit_price && (
                  <p className="text-xs text-teal-700">Unit price: €{supplierMapping.unit_price.toFixed(2)}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Part Details Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold block mb-2">Quantity *</label>
            <Input
              type="number"
              min="1"
              value={currentItem.quantity}
              onChange={(e) => onItemChange({ ...currentItem, quantity: e.target.value })}
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
              onChange={(e) => onItemChange({ ...currentItem, unitPrice: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-2">Line Total</label>
            <div className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-teal-600">
              €{(parseFloat(currentItem.unitPrice?.toString() || '0') * parseInt(currentItem.quantity?.toString() || '0')).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Item Notes */}
        <div>
          <label className="text-sm font-semibold block mb-2">Notes for this Item</label>
          <Input
            type="text"
            value={currentItem.notes}
            onChange={(e) => onItemChange({ ...currentItem, notes: e.target.value })}
            placeholder="e.g., Specific model, color, certification needed"
          />
        </div>

        {/* Add/Update Button */}
        <div className="flex gap-2">
          <button
            onClick={handleAddItem}
            className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isEditing ? (
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
          {isEditing && onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="px-4 py-2.5 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
