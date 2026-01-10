import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Copy, Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import * as Dialog from '@radix-ui/react-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnhancedQuoteCreationFlow from './EnhancedQuoteCreationFlow';

const BulkQuoteRequestCreator = ({ open, onOpenChange, selectedParts = [], onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Mode Selection, 2: Quick Create Flow
  const [selectedMode, setSelectedMode] = useState(null); // 'quick-create'
  const [submitting, setSubmitting] = useState(false);
  const [createdQuotes, setCreatedQuotes] = useState([]);
  const [errors, setErrors] = useState([]);
  const [showEnhancedFlow, setShowEnhancedFlow] = useState(false);
  const [bulkItems, setBulkItems] = useState([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Auto-start Quick Create flow when modal opens
  useEffect(() => {
    if (open && selectedParts && selectedParts.length > 0) {
      console.log('BulkQuoteRequestCreator opened with parts:', selectedParts);
      prepareBulkItems();
      // Auto-start quick create immediately
      handleStartQuickCreate();
    }
  }, [open, selectedParts]);

  const prepareBulkItems = () => {
    if (selectedParts && selectedParts.length > 0) {
      // Transform reorder parts into Quick Create item format
      const items = selectedParts.map((part) => {
        const supplier = part.suppliers?.find(s => s.is_preferred) || part.suppliers?.[0];
        const quantityNeeded = Math.max(0, part.reorder_point - part.current_quantity);
        
        return {
          part_id: part.id,
          part_name: part.name,
          part_number: part.part_number,
          supplier_id: supplier?.id,
          supplier_name: supplier?.name,
          supplierPartNumber: supplier?.supplier_part_number || '',
          supplierPartId: supplier?.supplier_sku || '',
          quantity: quantityNeeded,
          unit_price: supplier?.unit_price,
          notes: `Auto-loaded from Reorder Management - Reorder Point: ${part.reorder_point}, Current: ${part.current_quantity}`,
          source: 'reorder'
        };
      });
      setBulkItems(items);
      console.log('Prepared bulk items:', items);
    }
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      setStep(1);
      setSelectedMode(null);
      setCreatedQuotes([]);
      setErrors([]);
      setShowEnhancedFlow(false);
    }
    onOpenChange(newOpen);
  };

  const handleStartQuickCreate = () => {
    console.log('Starting Quick Create with parts:', selectedParts);
    setSelectedMode('quick-create');
    setShowEnhancedFlow(true);
  };

  const handleEnhancedFlowSuccess = () => {
    toast({
      title: "Success!",
      description: "Quote requests created and ready to send to suppliers!"
    });
    handleOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  // If showing Enhanced Flow, render that directly (skip mode selection)
  if (showEnhancedFlow && selectedMode === 'quick-create') {
    return (
      <>
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content className="w-full max-w-5xl bg-white rounded-2xl shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b">
                  <Dialog.Title className="text-2xl font-bold text-slate-900">
                    Create Quote Requests - Quick Create
                  </Dialog.Title>
                  <button
                    onClick={() => handleOpenChange(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  <EnhancedQuoteCreationFlow
                    isReorderMode={true}
                    initialItems={bulkItems}
                    onCreateComplete={handleEnhancedFlowSuccess}
                  />
                </div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        </Dialog.Root>
      </>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="w-full max-w-3xl bg-white rounded-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-2xl font-bold text-slate-900">
                Create Quote Requests
              </Dialog.Title>
              <button
                onClick={() => handleOpenChange(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Loading State */}
            <div className="flex justify-center py-12">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-teal-600 font-semibold">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Preparing Quick Create Form...
                </div>
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default BulkQuoteRequestCreator;