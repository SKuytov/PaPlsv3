import React, { useState } from 'react';
import { QuoteItemForm } from './QuoteItemForm';
import { QuoteItemsList } from './QuoteItemsList';
import { useQuoteItems, QuoteItem } from '@/lib/hooks/useQuoteItems';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SupplierQuoteFormProps {
  supplier: any;
  onSubmit: (data: { items: QuoteItem[]; supplier: any }) => Promise<void> | void;
  onCancel?: () => void;
  initialItems?: QuoteItem[];
  isLoading?: boolean;
  showHeader?: boolean;
}

export const SupplierQuoteForm: React.FC<SupplierQuoteFormProps> = ({
  supplier,
  onSubmit,
  onCancel,
  initialItems = [],
  isLoading = false,
  showHeader = true
}) => {
  const {
    items,
    currentItem,
    editingIndex,
    addOrUpdateItem,
    removeItem,
    editItem,
    setCurrentItem,
    cancelEdit,
    calculateTotal,
    calculateLineTotal,
    hasItems
  } = useQuoteItems(initialItems);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!hasItems) {
      toast({
        variant: 'destructive',
        title: 'No Items',
        description: 'Please add at least one item to the quote'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ items, supplier });
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit quote'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Create Quote</h2>
            <p className="text-sm text-slate-600 mt-1">Supplier: {supplier?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600 font-semibold uppercase">Total Items</p>
            <p className="text-2xl font-bold text-teal-600">{items.length}</p>
          </div>
        </div>
      )}

      {/* Info Box */}
      {!hasItems && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">Get Started</p>
            <p className="text-sm text-blue-800 mt-1">Add items below to create a quote for {supplier?.name}.</p>
          </div>
        </div>
      )}

      {/* Item Form */}
      <QuoteItemForm
        currentItem={currentItem}
        selectedSupplier={supplier}
        onItemChange={setCurrentItem}
        onAddItem={addOrUpdateItem}
        isEditing={editingIndex !== null}
        onCancelEdit={cancelEdit}
      />

      {/* Items List */}
      {hasItems && (
        <QuoteItemsList
          items={items}
          onEditItem={editItem}
          onRemoveItem={removeItem}
          calculateLineTotal={calculateLineTotal}
          calculateTotal={calculateTotal}
          showActions={true}
        />
      )}

      {/* Summary */}
      {hasItems && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-teal-600 font-semibold uppercase">Quote Summary</p>
              <p className="text-xs text-teal-700 mt-1">{items.length} item{items.length !== 1 ? 's' : ''} for {supplier?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-teal-600 font-semibold uppercase">Total Value</p>
              <p className="text-2xl font-bold text-teal-700">€{calculateTotal().toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        {onCancel && (
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading || isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!hasItems || isLoading || isSubmitting}
          className="flex-1 bg-teal-600 hover:bg-teal-700"
        >
          {isSubmitting ? 'Creating Quote...' : `Create Quote (${items.length} item${items.length !== 1 ? 's' : ''})`}
        </Button>
      </div>
    </div>
  );
};
