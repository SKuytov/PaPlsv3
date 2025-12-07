import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { dbService } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import QuoteApprovalModal from './QuoteApprovalModal';

const QuoteApprovalFlow = ({ quotes, onApprovalComplete }) => {
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const canApprove = (quote) => {
    const totalPrice = quote.quantity_requested * (quote.quotes?.quoted_unit_price || 0);
    
    // Tech Director can approve quotes ≤ €3000
    if (userRole === 'technical_director' && totalPrice <= 3000) return true;
    
    // CEO can approve all quotes
    if (userRole === 'ceo') return true;
    
    // Admin can approve all
    if (userRole === 'admin') return true;
    
    return false;
  };

  const getApprovalGate = (quote) => {
    const totalPrice = quote.quantity_requested * (quote.quotes?.quoted_unit_price || 0);
    return totalPrice > 3000 ? 'CEO' : 'Tech Director';
  };

  return (
    <div className="space-y-4">
      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No approved quotes ready for ordering. Quotes appear here once suppliers respond and internal approvals are complete.
          </CardContent>
        </Card>
      ) : (
        quotes.map((quote) => {
          const totalPrice = quote.quantity_requested * (quote.quotes?.quoted_unit_price || 0);
          const canUserApprove = canApprove(quote);

          return (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  {/* Part Info */}
                  <div>
                    <p className="text-xs text-slate-500 font-bold mb-1">PART</p>
                    <p className="font-semibold text-slate-900">{quote.part?.name}</p>
                    <p className="text-xs text-slate-600">{quote.part?.part_number}</p>
                  </div>

                  {/* Supplier */}
                  <div>
                    <p className="text-xs text-slate-500 font-bold mb-1">SUPPLIER</p>
                    <p className="font-semibold text-slate-900">{quote.supplier?.name}</p>
                    <p className="text-xs text-slate-600">Qty: {quote.quantity_requested}</p>
                  </div>

                  {/* Price */}
                  <div>
                    <p className="text-xs text-slate-500 font-bold mb-1">PRICE</p>
                    <p className="font-bold text-slate-900">€{(quote.quotes?.quoted_unit_price || 0).toFixed(2)}</p>
                    <p className="text-xs text-teal-600">Total: €{totalPrice.toFixed(2)}</p>
                  </div>

                  {/* Gate */}
                  <div>
                    <p className="text-xs text-slate-500 font-bold mb-1">APPROVAL</p>
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold ${
                      totalPrice > 3000 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      <AlertCircle className="h-3 w-3" />
                      {getApprovalGate(quote)}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex justify-end">
                    {canUserApprove ? (
                      <Button
                        onClick={() => {
                          setSelectedQuote(quote);
                          setShowApprovalModal(true);
                        }}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    ) : (
                      <div className="text-xs text-slate-500">
                        Awaiting {getApprovalGate(quote)} approval
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {selectedQuote && (
        <QuoteApprovalModal
          open={showApprovalModal}
          onOpenChange={setShowApprovalModal}
          quote={selectedQuote}
          onApprovalComplete={onApprovalComplete}
        />
      )}
    </div>
  );
};

export default QuoteApprovalFlow;
