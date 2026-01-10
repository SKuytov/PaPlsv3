import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

const CreateOrderForm = ({ requestId, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    order_number: '',
    supplier: '',
    total_amount: '',
    tracking_number: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.order_number || !formData.supplier) {
      alert('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      onSubmit({ id: Date.now(), status: 'pending', ...formData });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Order Number *</label>
              <Input
                type="text"
                name="order_number"
                value={formData.order_number}
                onChange={handleChange}
                placeholder="PO-2026-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Supplier *</label>
              <Input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="Supplier name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Total Amount (€)</label>
              <Input
                type="number"
                name="total_amount"
                value={formData.total_amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Tracking Number</label>
              <Input
                type="text"
                name="tracking_number"
                value={formData.tracking_number}
                onChange={handleChange}
                placeholder="Track ID"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateOrderForm;