import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

/**
 * RequestFormModal Component
 * 2-step wizard for creating new item requests
 * Step 1: Basic request info
 * Step 2: Add items
 */
const RequestFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  technicianInfo,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [requestData, setRequestData] = useState({
    building_id: technicianInfo?.building_id || '',
    priority: 'NORMAL',
    description: '',
    notes: '',
    items: []
  });
  const [currentItem, setCurrentItem] = useState({
    item_name: '',
    quantity: 1,
    unit: 'pcs',
    estimated_unit_price: 0
  });

  const buildings = ['Building 1', 'Building 2', 'Building 3', 'Building 4', 'Building 5'];
  const units = ['pcs', 'kg', 'm', 'm²', 'l', 'set', 'box', 'hours'];
  const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

  const handleBasicInfoChange = (field, value) => {
    setRequestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (field, value) => {
    setCurrentItem(prev => ({
      ...prev,
      [field]: field === 'quantity' || field === 'estimated_unit_price'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const addItem = () => {
    if (!currentItem.item_name || currentItem.quantity <= 0 || currentItem.estimated_unit_price < 0) {
      alert('Please fill all item fields correctly');
      return;
    }

    setRequestData(prev => ({
      ...prev,
      items: [...prev.items, { ...currentItem, id: Date.now() }]
    }));

    setCurrentItem({
      item_name: '',
      quantity: 1,
      unit: 'pcs',
      estimated_unit_price: 0
    });
  };

  const removeItem = (id) => {
    setRequestData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const getTotalBudget = () => {
    return requestData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.estimated_unit_price);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!requestData.building_id) {
      alert('Please select a building');
      return;
    }

    if (requestData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    await onSubmit({
      building_id: requestData.building_id,
      priority: requestData.priority,
      description: requestData.description,
      notes: requestData.notes,
      items: requestData.items
    });

    // Reset form
    setStep(1);
    setRequestData({
      building_id: technicianInfo?.building_id || '',
      priority: 'NORMAL',
      description: '',
      notes: '',
      items: []
    });
  };

  const handleClose = () => {
    setStep(1);
    setRequestData({
      building_id: technicianInfo?.building_id || '',
      priority: 'NORMAL',
      description: '',
      notes: '',
      items: []
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1
              ? t('requests.createNew', 'Create New Request') + ' - Step 1: Basic Info'
              : t('requests.createNew', 'Create New Request') + ' - Step 2: Add Items'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('requests.building', 'Building')} *
                </label>
                <Select
                  value={requestData.building_id}
                  onValueChange={(value) => handleBasicInfoChange('building_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(building => (
                      <SelectItem key={building} value={building}>
                        {building}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('requests.priority', 'Priority')} *
                </label>
                <Select
                  value={requestData.priority}
                  onValueChange={(value) => handleBasicInfoChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(priority => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('requests.description', 'Description')}
                </label>
                <Textarea
                  placeholder="What do you need?"
                  value={requestData.description}
                  onChange={(e) => handleBasicInfoChange('description', e.target.value)}
                  className="h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('requests.notes', 'Additional Notes')}
                </label>
                <Textarea
                  placeholder="Any additional information..."
                  value={requestData.notes}
                  onChange={(e) => handleBasicInfoChange('notes', e.target.value)}
                  className="h-20"
                />
              </div>
            </div>
          )}

          {/* Step 2: Add Items */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Current Item Form */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Item Name *
                      </label>
                      <Input
                        placeholder="e.g., Hydraulic Pump"
                        value={currentItem.item_name}
                        onChange={(e) => handleItemChange('item_name', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Quantity *
                      </label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={currentItem.quantity}
                        onChange={(e) => handleItemChange('quantity', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Unit *
                      </label>
                      <Select
                        value={currentItem.unit}
                        onValueChange={(value) => handleItemChange('unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map(unit => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Unit Price (€) *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentItem.estimated_unit_price}
                        onChange={(e) => handleItemChange('estimated_unit_price', e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={addItem}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    + Add Item
                  </Button>
                </CardContent>
              </Card>

              {/* Items List */}
              {requestData.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Items Added ({requestData.items.length})</h4>
                  {requestData.items.map((item) => (
                    <Card key={item.id} className="border-gray-200">
                      <CardContent className="pt-4 flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-semibold">{item.item_name}</p>
                          <p className="text-sm text-gray-500">
                            {item.quantity} {item.unit} @ €{item.estimated_unit_price.toFixed(2)} = €{(item.quantity * item.estimated_unit_price).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          onClick={() => removeItem(item.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={18} />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Total Budget */}
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Estimated Total Budget:</span>
                        <span className="text-xl font-bold text-green-700">
                          €{getTotalBudget().toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          {step === 1 && (
            <Button
              onClick={() => setStep(2)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next: Add Items →
            </Button>
          )}

          {step === 2 && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
              >
                ← Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || requestData.items.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Creating...' : 'Create Request'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestFormModal;
