import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const PriceHistoryChart = ({ partId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    currentPrice: 0,
    averagePrice: 0,
    minPrice: 0,
    maxPrice: 0,
    trend: 'stable'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPriceHistory();
  }, [partId]);

  const loadPriceHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_price_history')
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .eq('part_id', partId)
        .order('recorded_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      setHistory(data || []);

      if (data && data.length > 0) {
        const prices = data.map(h => h.unit_price);
        const currentPrice = prices[0];
        const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        // Determine trend
        let trend = 'stable';
        if (data.length >= 2) {
          const recent = data.slice(0, Math.min(5, data.length));
          const recentAvg = recent.reduce((a, b) => a + b.unit_price, 0) / recent.length;
          const older = data.slice(Math.min(5, data.length), Math.min(10, data.length));
          if (older.length > 0) {
            const olderAvg = older.reduce((a, b) => a + b.unit_price, 0) / older.length;
            if (recentAvg > olderAvg * 1.05) trend = 'increasing';
            else if (recentAvg < olderAvg * 0.95) trend = 'decreasing';
          }
        }

        setStats({
          currentPrice,
          averagePrice,
          minPrice,
          maxPrice,
          trend
        });
      }
    } catch (error) {
      console.error('Error loading price history:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load price history"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Loading price history...</div>;
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-slate-500">
          No price history available yet. Prices will appear when quotes are received.
        </CardContent>
      </Card>
    );
  }

  // Create a simple line chart using CSS
  const maxPriceDisplay = stats.maxPrice * 1.1;
  const minPriceDisplay = stats.minPrice * 0.9;
  const priceRange = maxPriceDisplay - minPriceDisplay;

  const getPricePosition = (price) => {
    return ((price - minPriceDisplay) / priceRange) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
          <CardContent className="p-4">
            <p className="text-xs text-teal-700 font-semibold mb-1">CURRENT PRICE</p>
            <p className="text-2xl font-bold text-teal-600">€{stats.currentPrice.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <p className="text-xs text-blue-700 font-semibold mb-1">AVERAGE PRICE</p>
            <p className="text-2xl font-bold text-blue-600">€{stats.averagePrice.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <p className="text-xs text-green-700 font-semibold mb-1">LOWEST PRICE</p>
            <p className="text-2xl font-bold text-green-600">€{stats.minPrice.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs text-amber-700 font-semibold mb-1">HIGHEST PRICE</p>
            <p className="text-2xl font-bold text-amber-600">€{stats.maxPrice.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {stats.trend === 'increasing' && (
              <>
                <TrendingUp className="h-6 w-6 text-red-500" />
                <div>
                  <p className="font-semibold text-red-700">Price Trending UP</p>
                  <p className="text-sm text-red-600">Supplier prices are increasing</p>
                </div>
              </>
            )}
            {stats.trend === 'decreasing' && (
              <>
                <TrendingDown className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-semibold text-green-700">Price Trending DOWN</p>
                  <p className="text-sm text-green-600">Supplier prices are decreasing</p>
                </div>
              </>
            )}
            {stats.trend === 'stable' && (
              <>
                <div className="h-6 w-6 bg-slate-200 rounded-full flex items-center justify-center">
                  <div className="h-2 w-2 bg-slate-500 rounded-full" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Price Stable</p>
                  <p className="text-sm text-slate-600">Supplier prices are stable</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Price Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Price History Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Supplier</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Unit Price</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Lead Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Comparison</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, idx) => (
                  <tr key={entry.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(entry.recorded_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {entry.supplier?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 font-bold text-teal-600">
                      €{entry.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {entry.lead_time_days} days
                    </td>
                    <td className="px-4 py-3">
                      {idx === 0 ? (
                        <span className="text-slate-500 italic">Most recent</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {entry.unit_price < history[0].unit_price && (
                            <>
                              <TrendingDown className="h-4 w-4 text-green-500" />
                              <span className="text-green-600 font-semibold">
                                -€{(history[0].unit_price - entry.unit_price).toFixed(2)}
                              </span>
                            </>
                          )}
                          {entry.unit_price > history[0].unit_price && (
                            <>
                              <TrendingUp className="h-4 w-4 text-red-500" />
                              <span className="text-red-600 font-semibold">
                                +€{(entry.unit_price - history[0].unit_price).toFixed(2)}
                              </span>
                            </>
                          )}
                          {entry.unit_price === history[0].unit_price && (
                            <span className="text-slate-500">Same</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Visual Price Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Price Trend Visualization</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {history.slice(0, 15).reverse().map((entry, idx) => {
              const percentage = getPricePosition(entry.unit_price);
              const isAboveAverage = entry.unit_price > stats.averagePrice;

              return (
                <div key={entry.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-700">
                      {entry.supplier?.name || 'Unknown'} - {new Date(entry.recorded_at).toLocaleDateString()}
                    </span>
                    <span className={`font-bold ${isAboveAverage ? 'text-amber-600' : 'text-green-600'}`}>
                      €{entry.unit_price.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isAboveAverage ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-4 bg-green-500 rounded" />
              <span className="text-slate-600">Below Average</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-4 bg-amber-500 rounded" />
              <span className="text-slate-600">Above Average</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceHistoryChart;