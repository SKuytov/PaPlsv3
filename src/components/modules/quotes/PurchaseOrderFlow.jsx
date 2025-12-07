import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Send } from 'lucide-react';
import PurchaseOrderForm from './PurchaseOrderForm';

const PurchaseOrderFlow = ({ quotes, onPOCreated }) => {
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showForm, setShowForm] = useState(false);

  if (showForm && selectedQuote) {
    return (
      <PurchaseOrderForm
        quote={selectedQuote}
        onComplete={onPOCreated}
        onCancel={() => {
          setShowForm(false);
          setSelectedQuote(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No approved quotes. Quotes appear here after all approvals are complete.
          </CardContent>
        </Card>
      ) : (
        quotes.map((quote) => (
          <Card key={quote.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{quote.part?.name}</p>
                  <p className="text-sm text-slate-600">{quote.supplier?.name}</p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedQuote(quote);
                    setShowForm(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Create PO
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default PurchaseOrderFlow;
