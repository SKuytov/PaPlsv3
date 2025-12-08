import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit2, Trash2 } from 'lucide-react';
import { QuoteItem } from '@/lib/hooks/useQuoteItems';

interface QuoteItemsListProps {
  items: QuoteItem[];
  onEditItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
  calculateLineTotal?: (unitPrice: string | number, quantity: string | number) => number;
  calculateTotal?: () => number;
  showActions?: boolean;
}

export const QuoteItemsList: React.FC<QuoteItemsListProps> = ({
  items,
  onEditItem,
  onRemoveItem,
  calculateLineTotal = (unitPrice, quantity) =>
    parseFloat(unitPrice?.toString() || '0') * parseInt(quantity?.toString() || '0'),
  calculateTotal = () =>
    items.reduce((sum, item) => {
      const unitPrice = parseFloat(item.unitPrice?.toString() || '0');
      const quantity = parseInt(item.quantity?.toString() || '0');
      return sum + unitPrice * quantity;
    }, 0),
  showActions = true
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
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
                {showActions && (
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const lineTotal = calculateLineTotal(item.unitPrice, item.quantity);
                return (
                  <tr key={idx} className={idx % 2 ? 'bg-white' : 'bg-slate-50 border-b'}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.part.name}</p>
                        <p className="text-xs text-slate-500">SKU: {item.part.barcode || 'N/A'}</p>
                        {item.supplierPartNumber && (
                          <p className="text-xs text-teal-600 font-semibold mt-0.5">Supplier #: {item.supplierPartNumber}</p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-amber-600 mt-1">📝 {item.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold">€{parseFloat(item.unitPrice?.toString() || '0').toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-teal-600">€{lineTotal.toFixed(2)}</td>
                    {showActions && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onEditItem(idx)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit item"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onRemoveItem(idx)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-teal-50">
              <tr>
                <td colSpan={showActions ? 4 : 3} className="px-4 py-3 text-right font-bold text-slate-900">
                  Estimated Total:
                </td>
                <td className={`px-4 py-3 text-right text-xl font-bold text-teal-600 ${showActions ? '' : 'pr-8'}`}>
                  €{calculateTotal().toFixed(2)}
                </td>
                {showActions && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
