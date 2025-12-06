import React from 'react';
import { FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import QuoteTrackingDashboard from '@/components/modules/quotes/QuoteTrackingDashboard';
import OrderTrackingPanel from '@/components/modules/quotes/OrderTrackingPanel';
import PriceHistoryChart from '@/components/modules/quotes/PriceHistoryChart';

const QuotesPage = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-10 w-10 text-teal-600" />
          Quote & Order Management
        </h1>
        <p className="text-slate-600">
          Track supplier quotes, manage purchase orders, and analyze pricing trends
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Workflow</p>
                <p className="text-lg font-semibold text-slate-900 mt-2">
                  Request → Record → Order
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Auto Features</p>
                <p className="text-lg font-semibold text-slate-900 mt-2">
                  IDs, Emails, Tracking
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Smart Analytics</p>
                <p className="text-lg font-semibold text-slate-900 mt-2">
                  Price Trends & Stats
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboards */}
      <div className="space-y-6">
        {/* Quote Tracking Dashboard */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <QuoteTrackingDashboard />
        </div>

        {/* Order Tracking Panel */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <OrderTrackingPanel />
        </div>

        {/* Price History Chart (Optional - if you want it here) */}
        {/* Uncomment if you want to show price history by specific part */}
        {/* 
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Price Analysis</h2>
          <PriceHistoryChart />
        </div>
        */}
      </div>

      {/* Quick Tips */}
      <Card className="bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
        <CardHeader>
          <CardTitle className="text-teal-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-teal-900">
          <p>
            ✅ <strong>Request Quotes:</strong> Click "Request Quote" in the Reorder modal to auto-generate tracking IDs
          </p>
          <p>
            ✅ <strong>Track Responses:</strong> Use the Quote Tracking Dashboard to manage incoming supplier quotes
          </p>
          <p>
            ✅ <strong>Place Orders:</strong> Accept quotes and create purchase orders with automatic delivery tracking
          </p>
          <p>
            ✅ <strong>Analyze Prices:</strong> View price history and trends to negotiate better supplier rates
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotesPage;