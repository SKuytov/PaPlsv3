import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const RestockModal = ({ 
  isOpen, 
  onClose, 
  sparePart, 
  userId,
  userName,
  building,
  onRestockSuccess 
}) => {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleRestock = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Quantity',
        description: 'Please enter a positive number'
      });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      // Get API base URL
      const apiUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
      
      const response = await fetch(`${apiUrl}/api/inventory/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          spare_part_id: sparePart.id,
          quantity_added: parseInt(quantity),
          reason: reason || 'Manual restock by technician',
          building: building || 'Unknown',
          technician_name: userName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Restock failed');
      }

      setResult({
        success: true,
        data: data,
        message: `✓ Added ${quantity} units. New total: ${data.new_quantity}`
      });

      toast({
        title: 'Success',
        description: `Restocked ${sparePart.name}: +${quantity} units`
      });

      onRestockSuccess?.(data);

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setQuantity('');
        setReason('');
        setResult(null);
      }, 2000);

    } catch (error) {
      console.error('[RestockModal] Error:', error);
      setResult({
        success: false,
        error: error.message
      });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>📦 Restock Item</DialogTitle>
          <DialogDescription>
            {sparePart?.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Current Stock Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Current Stock:</strong> {sparePart?.quantity_on_hand || 0} units
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Part ID: {sparePart?.id}
            </p>
          </div>

          {/* Success Result */}
          {result?.success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-green-700 font-medium">{result.message}</p>
                <p className="text-xs text-green-600 mt-1">
                  Previous: {result.data.previous_quantity} → New: {result.data.new_quantity}
                </p>
              </div>
            </div>
          )}

          {/* Error Result */}
          {result?.success === false && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{result.error}</p>
            </div>
          )}

          {/* Form (hidden if showing success) */}
          {!result?.success && (
            <>
              <div>
                <Label htmlFor="quantity" className="text-sm font-medium">
                  Quantity to Add
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="9999"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity..."
                  disabled={isSubmitting}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="reason" className="text-sm font-medium">
                  Reason (Optional)
                </Label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this being restocked?"
                  disabled={isSubmitting}
                  rows="2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                />
              </div>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            {result?.success ? 'Close' : 'Cancel'}
          </Button>
          {!result?.success && (
            <Button
              onClick={handleRestock}
              disabled={isSubmitting || !quantity}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restocking...
                </>
              ) : (
                '✓ Confirm Restock'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestockModal;
