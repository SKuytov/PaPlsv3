import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Package, X } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import * as Dialog from '@radix-ui/react-dialog';
import Scanner from '@/components/modules/scanner/Scanner'; // Your Scanner component

const DeliveryVerificationModal = ({ open, onOpenChange, delivery, onSuccess }) => {
  const [step, setStep] = useState('input'); // 'input' | 'scanning' | 'confirm'
  const [loading, setLoading] = useState(false);
  const [receivedQuantity, setReceivedQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [scannedItems, setScannedItems] = useState([]);
  const [order, setOrder] = useState(null);
  const [part, setPart] = useState(null);
  const { toast } = useToast();

  // Load delivery and order details
  useEffect(() => {
    if (open && delivery) {
      loadDeliveryDetails();
    }
  }, [open, delivery]);

  const loadDeliveryDetails = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, part:spare_parts(*)')
        .eq('id', delivery.order_id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);
      setPart(orderData.part);
      setReceivedQuantity(orderData.ordered_quantity.toString());
    } catch (error) {
      console.error('Error loading delivery details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load delivery details"
      });
    }
  };

  // Handle scanner completion (called by Scanner.jsx)
  const handleScanComplete = (scannedData) => {
    setScannedItems(prev => {
      const existing = prev.find(item => item.part.id === scannedData.part.id);
      if (existing) {
        return prev.map(item =>
          item.part.id === scannedData.part.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...scannedData, quantity: 1 }];
    });

    toast({
      title: "Item Scanned",
      description: `${scannedData.part.name} added to delivery`
    });
  };

  const handleCompleteDelivery = async () => {
    if (!receivedQuantity || parseInt(receivedQuantity) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Quantity",
        description: "Please enter received quantity"
      });
      return;
    }

    const quantity = parseInt(receivedQuantity);
    if (quantity !== order.ordered_quantity) {
      toast({
        variant: "destructive",
        title: "Quantity Mismatch",
        description: `Expected ${order.ordered_quantity}, received ${quantity}. Please verify.`
      });
      return;
    }

    setLoading(true);
    try {
      // Update delivery record
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .update({
          delivery_status: 'delivered',
          delivered_quantity: quantity,
          received_at_warehouse: new Date().toISOString(),
          actual_delivery_date: new Date().toISOString().split('T')[0],
          restock_completed_at: new Date().toISOString(),
          restock_notes: notes
        })
        .eq('id', delivery.id);

      if (deliveryError) throw deliveryError;

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ order_status: 'delivered' })
        .eq('id', delivery.order_id);

      if (orderError) throw orderError;

      // Update part quantity (items were already scanned via Scanner.jsx)
      const { error: partError } = await supabase
        .from('spare_parts')
        .update({
          current_quantity: part.current_quantity + quantity
        })
        .eq('id', part.id);

      if (partError) throw partError;

      toast({
        title: "Delivery Complete!",
        description: `${quantity} units received and restocked`
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <Dialog.Content className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-lg overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
              <Dialog.Title className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Receive & Restock Delivery
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {!order || !part ? (
              <div className="text-center py-8 text-slate-500">Loading delivery details...</div>
            ) : (
              <div className="space-y-6">
                {/* Order Summary */}
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-600 font-semibold">PART</p>
                        <p className="font-semibold text-slate-900">{part.name}</p>
                        <p className="text-xs text-slate-600">{part.part_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold">ORDER QUANTITY</p>
                        <p className="text-xl font-bold text-teal-600">{order.ordered_quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold">CURRENT STOCK</p>
                        <p className="text-lg font-semibold text-slate-900">{part.current_quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-semibold">AFTER RESTOCK</p>
                        <p className="text-lg font-bold text-green-600">
                          {parseInt(receivedQuantity) ? part.current_quantity + parseInt(receivedQuantity) : part.current_quantity}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step Selector */}
                <div className="flex gap-2 border-b">
                  <button
                    onClick={() => setStep('input')}
                    className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                      step === 'input'
                        ? 'border-teal-600 text-teal-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1. Input Quantity
                  </button>
                  <button
                    onClick={() => setStep('scanning')}
                    className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                      step === 'scanning'
                        ? 'border-teal-600 text-teal-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    2. Scan Items
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                      step === 'confirm'
                        ? 'border-teal-600 text-teal-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    3. Confirm
                  </button>
                </div>

                {/* Step 1: Input Quantity */}
                {step === 'input' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold block mb-2">Received Quantity</label>
                      <Input
                        type="number"
                        min="1"
                        value={receivedQuantity}
                        onChange={(e) => setReceivedQuantity(e.target.value)}
                        className="text-lg font-bold"
                      />
                    </div>

                    {parseInt(receivedQuantity) !== order.ordered_quantity && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-700">
                          <p className="font-semibold">Quantity Mismatch</p>
                          <p>Expected {order.ordered_quantity}, you entered {receivedQuantity}</p>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => setStep('scanning')}
                      className="w-full bg-teal-600 hover:bg-teal-700"
                    >
                      Next: Scan Items
                    </Button>
                  </div>
                )}

                {/* Step 2: Scanner */}
                {step === 'scanning' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <p className="font-semibold">Scan items to verify delivery</p>
                        <p>Use your barcode scanner to scan each item in the shipment</p>
                      </div>
                    </div>

                    <Scanner
                      onScanComplete={handleScanComplete}
                      batchMode={true}
                      selectedMachineId={null}
                    />

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setStep('input')}
                        variant="outline"
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => setStep('confirm')}
                        className="flex-1 bg-teal-600 hover:bg-teal-700"
                      >
                        Next: Confirm
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Confirm */}
                {step === 'confirm' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-green-700">
                        <p className="font-semibold">Ready to complete</p>
                        <p>Review details below and confirm</p>
                      </div>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Delivery Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Expected Quantity:</span>
                          <span className="font-semibold">{order.ordered_quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Received Quantity:</span>
                          <span className="font-semibold">{receivedQuantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Current Stock:</span>
                          <span className="font-semibold">{part.current_quantity}</span>
                        </div>
                        <div className="border-t pt-3 flex justify-between">
                          <span className="font-semibold">New Stock Level:</span>
                          <span className="text-lg font-bold text-teal-600">
                            {part.current_quantity + parseInt(receivedQuantity)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <div>
                      <label className="text-sm font-semibold block mb-2">Delivery Notes (Optional)</label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any notes about the delivery (condition, discrepancies, etc.)"
                        className="resize-none h-20"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setStep('scanning')}
                        variant="outline"
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleCompleteDelivery}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {loading ? 'Processing...' : 'Complete Delivery'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default DeliveryVerificationModal;