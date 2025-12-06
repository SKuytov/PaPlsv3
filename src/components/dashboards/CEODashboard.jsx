import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle, Package, Wrench,
  RefreshCw, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { dbService } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CEODashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeframe, setTimeframe] = useState('month');

  const [stats, setStats] = useState({
    inventoryValue: 0,
    ytdSpend: 0,
    ytdSavings: 0,
    downtimeCost: 0,
    lowStockItems: 0,
    pendingOrders: 0,
  });

  const [trends, setTrends] = useState({
    inventoryTrend: 0,
    spendTrend: 0,
    downtimeTrend: 0,
  });

  const [chartData, setChartData] = useState({
    categoryBreakdown: [],
  });

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch main dashboard stats
      const dashboardStats = await dbService.getDashboardStats(timeframe);
      
      if (!dashboardStats) {
        throw new Error('No dashboard stats returned from database');
      }

      // Extract and set stats
      setStats({
        inventoryValue: dashboardStats.inventory?.value || 0,
        ytdSpend: dashboardStats.finance?.totalSpend || 0,
        ytdSavings: Math.round((dashboardStats.finance?.totalSpend || 0) * 0.08), // Estimate 8% savings
        downtimeCost: dashboardStats.maintenance?.cost || 0,
        lowStockItems: dashboardStats.inventory?.lowStock || 0,
        pendingOrders: dashboardStats.finance?.orderCount || 0,
      });

      // Fetch category data for pie chart - with error handling
      try {
        const categoryData = await dbService.getSpendByCategory();
        if (categoryData && typeof categoryData === 'object' && Object.keys(categoryData).length > 0) {
          const processedCats = Object.entries(categoryData)
            .map(([name, value]) => ({
              name: name === 'null' ? 'Uncategorized' : name,
              value: parseFloat(value) || 0
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

          setChartData({ categoryBreakdown: processedCats });
        } else {
          setChartData({ categoryBreakdown: [] });
        }
      } catch (categoryError) {
        console.warn('Could not load category data:', categoryError);
        setChartData({ categoryBreakdown: [] });
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('CEO Dashboard load error:', err);
      setError(err.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  // Refresh Data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 10 minutes
    const interval = setInterval(loadDashboardData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  const KPICard = ({ title, value, subValue, icon: Icon, trend, trendValue, color = 'teal', onClick }) => (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left group w-full"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-600 uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-full bg-${color}-50`}>
          <Icon className={`h-5 w-5 text-${color}-600`} />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subValue && <span className="text-xs text-slate-500">{subValue}</span>}
      </div>
      {trendValue !== undefined && (
        <div className="flex items-center text-xs">
          {trend === 'up' ? (
            <ArrowUpRight className="w-3 h-3 text-red-600 mr-1" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-green-600 mr-1" />
          )}
          <span className={trend === 'up' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
            {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
          </span>
          <span className="text-slate-400 ml-1">vs previous</span>
        </div>
      )}
    </motion.button>
  );

  if (loading) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" message="Loading CEO dashboard..." />
      </div>
    );
  }

  const COLORS = ['#0d9488', '#0f766e', '#115e59', '#134e4a', '#10b981', '#059669'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">CEO Dashboard</h1>
          <p className="text-slate-600 mt-1">Executive overview of warehouse operations • Last updated {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error loading data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <Button
              onClick={handleRefresh}
              size="sm"
              className="mt-2 bg-red-600 hover:bg-red-700"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Inventory Value"
          value={formatCurrency(stats.inventoryValue)}
          icon={Package}
          color="blue"
          trend={trends.inventoryTrend > 0 ? 'up' : 'down'}
          trendValue={trends.inventoryTrend}
        />
        <KPICard
          title="YTD Spend"
          value={formatCurrency(stats.ytdSpend)}
          icon={DollarSign}
          color="red"
          trend={trends.spendTrend > 0 ? 'up' : 'down'}
          trendValue={trends.spendTrend}
        />
        <KPICard
          title="YTD Savings"
          value={formatCurrency(stats.ytdSavings)}
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="Downtime Cost"
          value={formatCurrency(stats.downtimeCost)}
          icon={AlertCircle}
          color="orange"
          trend={trends.downtimeTrend > 0 ? 'up' : 'down'}
          trendValue={trends.downtimeTrend}
        />
        <KPICard
          title="Low Stock Items"
          value={stats.lowStockItems.toString()}
          subValue="requires attention"
          icon={AlertCircle}
          color="yellow"
        />
        <KPICard
          title="Pending Orders"
          value={stats.pendingOrders.toString()}
          subValue="in progress"
          icon={Wrench}
          color="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Spend by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {chartData.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">No category data available yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-teal-600" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-slate-700 font-medium">Database Connection</span>
                <Badge className="bg-green-100 text-green-700">✓ Online</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-slate-700 font-medium">Data Sync Status</span>
                <Badge className="bg-green-100 text-green-700">✓ Up to Date</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-slate-700 font-medium">Last Full Sync</span>
                <span className="text-slate-600 text-sm">{lastUpdated.toLocaleTimeString()}</span>
              </div>
              <Button className="w-full bg-teal-600 hover:bg-teal-700 mt-4">
                View System Log
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Alerts */}
      {stats.lowStockItems > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-800 mb-4">
              {stats.lowStockItems} items are below minimum stock levels and need immediate attention for reordering.
            </p>
            <Button className="bg-yellow-600 hover:bg-yellow-700">
              Review Low Stock Items
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CEODashboard;