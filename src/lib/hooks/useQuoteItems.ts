import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface QuoteItem {
  part: any;
  quantity: string | number;
  unitPrice: string | number;
  notes: string;
  supplierPartNumber: string;
  supplierSku: string;
}

export function useQuoteItems(initialItems: QuoteItem[] = []) {
  const [items, setItems] = useState<QuoteItem[]>(initialItems);
  const [currentItem, setCurrentItem] = useState<QuoteItem>({
    part: null,
    quantity: '',
    unitPrice: '',
    notes: '',
    supplierPartNumber: '',
    supplierSku: '',
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const validateItem = (item: QuoteItem): boolean => {
    if (!item.part) {
      toast({
        variant: 'destructive',
        title: 'Missing Part',
        description: 'Please select a part'
      });
      return false;
    }

    if (!item.quantity || parseInt(item.quantity.toString()) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Quantity',
        description: 'Quantity must be greater than 0'
      });
      return false;
    }

    return true;
  };

  const addOrUpdateItem = (item: QuoteItem): boolean => {
    if (!validateItem(item)) {
      return false;
    }

    if (editingIndex !== null) {
      const updatedItems = [...items];
      updatedItems[editingIndex] = item;
      setItems(updatedItems);
      setEditingIndex(null);
      toast({
        title: 'Item Updated',
        description: `${item.part.name} updated`
      });
    } else {
      setItems([...items, item]);
      toast({
        title: 'Item Added',
        description: `${item.part.name} added to quote`
      });
    }

    resetCurrentItem();
    return true;
  };

  const removeItem = (index: number): void => {
    if (index < 0 || index >= items.length) {
      console.error('Invalid item index');
      return;
    }

    const removedItem = items[index];
    setItems(items.filter((_, i) => i !== index));
    toast({
      title: 'Item Removed',
      description: `${removedItem.part.name} removed from quote`
    });
  };

  const editItem = (index: number): void => {
    if (index < 0 || index >= items.length) {
      console.error('Invalid item index');
      return;
    }

    setCurrentItem(items[index]);
    setEditingIndex(index);
  };

  const resetCurrentItem = (): void => {
    setCurrentItem({
      part: null,
      quantity: '',
      unitPrice: '',
      notes: '',
      supplierPartNumber: '',
      supplierSku: '',
    });
    setEditingIndex(null);
  };

  const cancelEdit = (): void => {
    resetCurrentItem();
  };

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => {
      const unitPrice = parseFloat(item.unitPrice?.toString() || '0');
      const quantity = parseInt(item.quantity?.toString() || '0');
      return sum + (unitPrice * quantity);
    }, 0);
  };

  const calculateLineTotal = (unitPrice: string | number, quantity: string | number): number => {
    return (parseFloat(unitPrice?.toString() || '0') * parseInt(quantity?.toString() || '0'));
  };

  return {
    items,
    currentItem,
    editingIndex,
    setCurrentItem,
    addOrUpdateItem,
    removeItem,
    editItem,
    resetCurrentItem,
    cancelEdit,
    calculateTotal,
    calculateLineTotal,
    setItems,
    hasItems: items.length > 0
  };
}
