import React, { useState, useEffect } from 'react';
import { X, Trophy, TrendingDown, Calendar, DollarSign, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * QuoteComparisonMatrix - Compare multiple supplier quotes side-by-side
 * Shows pricing, delivery, terms, and helps select the best option
 */
const QuoteComparisonMatrix = ({ quotes, onClose, onWinnerSelected }) => {
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  // Filter quotes that have responses
  const respondedQuotes = quotes.filter(q => q.supplier_response && Object.keys(q.supplier_response).length > 0);

  if (respondedQuotes.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle>Quote Comparison</CardTitle>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-6 w-6" />
            </button>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-slate-900 font-semibold">No Responses Yet</p>
            <p className="text-slate-600 text-sm mt-2">
              Record supplier responses first before comparing. Click the 💬 icon on pending quotes.
            </p>
            <Button onClick={onClose} className="mt-4 w-full">Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate metrics for each quote
  const metrics = respondedQuotes.map((quote) => {
    const response = quote.supplier_response || {};
    const price = response.quoted_price_total || 0;
    const deliveryDate = response.delivery_date ? new Date(response.delivery_date) : null;
    const daysToDelivery = deliveryDate ? Math.ceil((deliveryDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

    return {
      quoteId: quote.id,
      quoteIdDisplay: quote.quote_id,
      supplier: quote.suppliers?.name || 'Unknown',
      email: quote.suppliers?.email,
      price,
      pricePerUnit: response.quoted_price_per_unit || 0,
      deliveryDate: response.delivery_date,
      daysToDelivery,
      paymentTerms: response.payment_terms || 'N/A',
      leadTime: response.lead_time_days || 'N/A',
      quality: response.quality_notes || '-',
      conditions: response.special_conditions || '-',
      qualityScore: quote.suppliers?.quality_score || 'N/A',
      deliveryScore: quote.suppliers?.delivery_score || 'N/A'
    };
  });

  // Find best in each category
  const lowestPrice = Math.min(...metrics.map(m => m.price));
  const fastestDelivery = metrics.reduce((min, m) => {
    if (m.daysToDelivery === null) return min;
    if (min.daysToDelivery === null) return m;
    return m.daysToDelivery < min.daysToDelivery ? m : min;
  });
  const highestQuality = metrics.reduce((max, m) => {
    const mScore = typeof m.qualityScore === 'number' ? m.qualityScore : 0;
    const maxScore = typeof max.qualityScore === 'number' ? max.qualityScore : 0;
    return mScore > maxScore ? m : max;
  });

  const handleSelectWinner = async () => {
    if (!selectedWinner) {
      toast({
        variant: 'destructive',
        title: 'No Selection',
        description: 'Please select a winning quote'
      });
      return;
    }

    setUpdating(true);
    try {
      // Update selected quote to approved
      const { error } = await supabase
        .from('quote_requests')
        .update({ status: 'approved' })
        .eq('id', selectedWinner);

      if (error) throw error;

      // Optionally reject other quotes
      const otherQuotes = respondedQuotes.filter(q => q.id !== selectedWinner);
      for (const quote of otherQuotes) {
        await supabase
          .from('quote_requests')
          .update({ status: 'rejected' })
          .eq('id', quote.id);
      }

      toast({
        title: '🏆 Winner Selected!',
        description: 'Quote approved and others rejected'
      });

      onWinnerSelected();
      onClose();
    } catch (error) {
      console.error('Error selecting winner:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to select winner'
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <Card className="w-full max-w-7xl my-4">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div>
            <CardTitle className="text-2xl">🏆 Quote Comparison Matrix</CardTitle>
            <p className="text-xs text-slate-600 mt-1">{respondedQuotes.length} supplier responses</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </CardHeader>

        <CardContent className="p-6 space-y-6 overflow-x-auto">
          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300">
                  <th className="px-4 py-3 text-left font-bold text-slate-900 sticky left-0 bg-slate-100 z-10" style={{minWidth: '200px'}}>
                    Supplier
                  </th>
                  {metrics.map((metric) => (
                    <th
                      key={metric.quoteId}
                      className={`px-4 py-3 text-center font-bold border-l border-slate-300 ${
                        selectedWinner === metric.quoteId
                          ? 'bg-green-100 text-green-900'
                          : 'bg-slate-50 text-slate-900'
                      }`}
                      style={{minWidth: '180px'}}
                    >
                      <div className="flex flex-col items-center">
                        <p>{metric.supplier}</p>
                        <p className="text-xs text-slate-600 font-normal mt-1">{metric.email}</p>
                        {selectedWinner === metric.quoteId && (
                          <Trophy className="h-4 w-4 text-yellow-500 mt-2" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Price Row */}
                <tr className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-900 sticky left-0 bg-white z-10 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    Total Price
                  </td>
                  {metrics.map((metric) => (
                    <td
                      key={metric.quoteId}
                      className={`px-4 py-4 text-center font-bold border-l border-slate-300 ${
                        metric.price === lowestPrice
                          ? 'bg-green-100 text-green-700'
                          : selectedWinner === metric.quoteId
                          ? 'bg-green-50'
                          : 'bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-lg">€{metric.price.toFixed(2)}</p>
                        {metric.price === lowestPrice && (
                          <span className="text-xs font-semibold text-green-700">✓ BEST PRICE</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Price Per Unit Row */}
                <tr className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4 font-semibold text-slate-700 sticky left-0 bg-white z-10">
                    Unit Price
                  </td>
                  {metrics.map((metric) => (
                    <td
                      key={metric.quoteId}
                      className={`px-4 py-4 text-center border-l border-slate-300 ${
                        selectedWinner === metric.quoteId ? 'bg-green-50' : 'bg-white'
                      }`}
                    >
                      €{metric.pricePerUnit.toFixed(2)}
                    </td>
                  ))}
                </tr>

                {/* Delivery Date Row */}
                <tr className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-900 sticky left-0 bg-white z-10 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    Delivery Date
                  </td>
                  {metrics.map((metric) => (
                    <td
                      key={metric.quoteId}
                      className={`px-4 py-4 text-center border-l border-slate-300 ${
                        metric === fastestDelivery
                          ? 'bg-amber-100 text-amber-700 font-bold'
                          : selectedWinner === metric.quoteId
                          ? 'bg-green-50'
                          : 'bg-white'
                      }`}
                    >
                      <div>
                        <p>{metric.deliveryDate ? new Date(metric.deliveryDate).toLocaleDateString() : 'N/A'}</p>
                        {metric.daysToDelivery && (
                          <p className="text-xs text-slate-600 mt-1">({metric.daysToDelivery} days from now)</p>
                        )}
                        {metric === fastestDelivery && (
                          <span className="text-xs font-semibold text-amber-700">✓ FASTEST</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Lead Time Row */}
                <tr className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4 font-semibold text-slate-700 sticky left-0 bg-white z-10">
                    Lead Time
                  </td>
                  {metrics.map((metric) => (
                    <td
                      key={metric.quoteId}
                      className={`px-4 py-4 text-center border-l border-slate-300 ${
                        selectedWinner === metric.quoteId ? 'bg-green-50' : 'bg-white'
                      }`}
                    >
                      {metric.leadTime} days
                    </td>
                  ))}
                </tr>

                {/* Payment Terms Row */}
                <tr className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4 font-semibold text-slate-700 sticky left-0 bg-white z-10">
                    Payment Terms
                  </td>
                  {metrics.map((metric) => (
                    <td
                      key={metric.quoteId}
                      className={`px-4 py-4 text-center border-l border-slate-300 ${
                        selectedWinner === metric.quoteId ? 'bg-green-50' : 'bg-white'
                      }`}
                    >
                      {metric.paymentTerms}
                    </td>
                  ))}
                </tr>

                {/* Quality Score Row */}
                <tr className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4 font-semibold text-slate-700 sticky left-0 bg-white z-10">
                    Quality Score
                  </td>
                  {metrics.map((metric) => (
                    <td
                      key={metric.quoteId}
                      className={`px-4 py-4 text-center border-l border-slate-300 ${
                        metric === highestQuality
                          ? 'bg-purple-100 text-purple-700 font-bold'
                          : selectedWinner === metric.quoteId
                          ? 'bg-green-50'
                          : 'bg-white'
                      }`}
                    >
                      {typeof metric.qualityScore === 'number' ? (
                        <div>
                          <p className="text-lg">⭐ {metric.qualityScore.toFixed(1)}</p>
                          {metric === highestQuality && (
                            <span className="text-xs font-semibold text-purple-700">✓ BEST</span>
                          )}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  ))}
                </tr>

                {/* Delivery Score Row */}
                <tr className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4 font-semibold text-slate-700 sticky left-0 bg-white z-10">
                    Delivery Score
                  </td>
                  {metrics.map((metric) => (
                    <td
                      key={metric.quoteId}
                      className={`px-4 py-4 text-center border-l border-slate-300 ${
                        selectedWinner === metric.quoteId ? 'bg-green-50' : 'bg-white'
                      }`}
                    >
                      {typeof metric.deliveryScore === 'number' ? `⭐ ${metric.deliveryScore.toFixed(1)}` : 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* Quality Notes Row */}
                <tr className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4 font-semibold text-slate-700 sticky left-0 bg-white z-10">
                    Quality Notes
                  </td>
                  {metrics.map((metric) => (
                    <td
                      key={metric.quoteId}
                      className={`px-4 py-4 text-sm border-l border-slate-300 ${
                        selectedWinner === metric.quoteId ? 'bg-green-50' : 'bg-white'
                      }`}
                    >
                      <p className="text-xs leading-relaxed">{metric.quality}</p>
                    </td>
                  ))}
                </tr>

                {/* Special Conditions Row */}
                <tr className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-4 font-semibold text-slate-700 sticky left-0 bg-white z-10">
                    Special Conditions
                  </td>
                  {metrics.map((metric) => (
                    <td
                      key={metric.quoteId}
                      className={`px-4 py-4 text-sm border-l border-slate-300 ${
                        selectedWinner === metric.quoteId ? 'bg-green-50' : 'bg-white'
                      }`}
                    >
                      <p className="text-xs leading-relaxed">{metric.conditions}</p>
                    </td>
                  ))}
                </tr>

                {/* Selection Row */}
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  <td className="px-4 py-4 font-bold text-slate-900 sticky left-0 bg-slate-50 z-10 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Select Winner
                  </td>
                  {metrics.map((metric) => (
                    <td key={metric.quoteId} className="px-4 py-4 text-center border-l border-slate-300">
                      <button
                        onClick={() => setSelectedWinner(metric.quoteId)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          selectedWinner === metric.quoteId
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-green-500'
                        }`}
                      >
                        {selectedWinner === metric.quoteId ? '✓ Selected' : 'Choose'}
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          {selectedWinner && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-bold text-green-900">Winner Selected</h4>
              </div>
              <p className="text-sm text-green-800">
                {metrics.find(m => m.quoteId === selectedWinner)?.supplier} has been selected as the winning supplier.
              </p>
              <p className="text-xs text-green-700">
                All other quotes will be marked as rejected. You can then convert this quote to a Purchase Order.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSelectWinner}
              disabled={!selectedWinner || updating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {updating ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Confirm Winner
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteComparisonMatrix;