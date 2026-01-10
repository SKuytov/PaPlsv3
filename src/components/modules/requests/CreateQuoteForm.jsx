import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const CreateQuoteForm = ({ requestId, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    supplier: '',
    amount: '',
    delivery_days: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier || !formData.amount) {
      alert('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      // TODO: Call API endpoint
      // const res = await fetch(`${import.meta.env.VITE_API_URL}/api/quotes`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ request_id: requestId, ...formData })
      // });
      onSubmit({ id: Date.now(), ...formData });
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
              <label className="block text-sm font-medium text-gray-900 mb-1">Amount (€) *</label>
              <Input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Delivery Days</label>
              <Input
                type="number"
                name="delivery_days"
                value={formData.delivery_days}
                onChange={handleChange}
                placeholder="14"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Quote'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateQuoteForm;