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
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CEODashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeframe, setTimeframe] = useState('month'); // month, quarter, year

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
    savingsTrend: 0,
    downtimeTrend: 0,
  });

  const [chartData, setChartData] = useState({
    financialHistory: [],
    categoryBreakdown: [],
    machineDowntime: [],
  });

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardStats, financialData, categorySpend, downtimeData, machineData] = await Promise.all([
        dbService.getDashboardStats(timeframe),
        dbService.getFinancialHistory(timeframe),
        dbService.getSpendByCategory(),
        dbService.getDowntimeAnalysis(timeframe),
        dbService.getMachines({}, 0, 1000),
      ]);

      // Process Dashboard Stats
      if (dashboardStats) {
        setStats({
          inventoryValue: dashboardStats.inventory?.value || 0,
          ytdSpend: dashboardStats.finance?.totalSpend || 0,
          ytdSavings: dashboardStats.finance?.totalSavings || calculateSavings(dashboardStats),
          downtimeCost: dashboardStats.maintenance?.cost || 0,
          lowStockItems: dashboardStats.inventory?.lowStock || 0,
          pendingOrders: dashboardStats.finance?.pendingOrders || 0,
        });

        // Calculate trends (comparing with previous period)
        const previousPeriod = await dbService.getDashboardStats(getPreviousTimeframe(timeframe));
        if (previousPeriod) {
          setTrends({
            inventoryTrend: ((dashboardStats.inventory?.value || 0) / (previousPeriod.inventory?.value || 1) - 1) * 100,
            spendTrend: ((dashboardStats.finance?.totalSpend || 0) / (previousPeriod.finance?.totalSpend || 1) - 1) * 100,
            savingsTrend: ((dashboardStats.finance?.totalSavings || 0) / (previousPeriod.finance?.totalSavings || 1) - 1) * 100,
            downtimeTrend: ((dashboardStats.maintenance?.cost || 0) / (previousPeriod.maintenance?.cost || 1) - 1) * 100,
          });
        }
      }

      // Process Financial History
      if (financialData) {
        setChartData(prev => ({
          ...prev,
          financialHistory: financialData.slice(-30),
        }));
      }

      // Process Category Breakdown
      if (categorySpend) {
        const categoryData = Object.entries(categorySpend).map(([name, value]) => ({
          name: name === 'null' ? 'Uncategorized' : name,
          value,
        })).sort((a, b) => b.value - a.value).slice(0, 8);

        setChartData(prev => ({
          ...prev,
          categoryBreakdown: categoryData,
        }));
      }

      // Process Downtime Analysis
      if (downtimeData) {
        const downtimeByMachine = downtimeData.slice(0, 6).map(d => ({
          machine: d.machine?.machine_code || 'Unknown',
          downtime: d.downtime_minutes || 0,
          cost: d.estimated_cost || 0,
        }));

        setChartData(prev => ({
          ...prev,
          machineDowntime: downtimeByMachine,
        }));
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('CEO Dashboard load error:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  const calculateSavings = (stats) => {
    // Calculate savings based on OEM vs supplier pricing
    return (stats.finance?.oemComparison?.savings || 0);
  };

  const getPreviousTimeframe = (current) => {
    if (current === 'month') return 'month';
    if (current === 'quarter') return 'quarter';
    return 'year';
  };

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

  const KPICard = ({ title, value, subValue, icon: Icon, trend, trendValue, color = 'teal' }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
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
            <span className="text-slate-400 ml-1">vs previous period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" message="Loading CEO dashboard..." />
      </div>
    );
  }

  const COLORS = ['#0d9488', '#0f766e', '#115e59', '#134e4a', '#10b981', '#059669', '#047857', '#065f46'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">CEO Dashboard</h1>
          <p className="text-slate-600 mt-1">Executive overview of warehouse operations • Last updated {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium"
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
          <div>
            <h3 className="font-semibold text-red-900">Error loading data</h3>
            <p className="text-sm text-red-700">{error}</p>
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
          trend={trends.savingsTrend > 0 ? 'up' : 'down'}
          trendValue={trends.savingsTrend}
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
        {/* Financial History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              Financial History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {chartData.financialHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.financialHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="spend" stroke="#ef4444" strokeWidth={2} dot={false} name="Spend" />
                    <Line type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2} dot={false} name="Savings" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">No financial data available</div>
              )}
            </div>
          </CardContent>
        </Card>

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
                <div className="h-full flex items-center justify-center text-slate-500">No category data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Downtime Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-600" />
            Machine Downtime Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {chartData.machineDowntime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.machineDowntime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="machine" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} label={{ value: 'Cost (€)', angle: 90, position: 'insideRight' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value, name) => name === 'cost' ? formatCurrency(value) : value}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="downtime" fill="#f97316" name="Downtime (mins)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="cost" fill="#ef4444" name="Cost (€)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">No downtime data available</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Database Connection</span>
                <Badge className="bg-green-100 text-green-700">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Data Sync Status</span>
                <Badge className="bg-green-100 text-green-700">Up to Date</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Last Full Sync</span>
                <span className="text-slate-600 text-sm">{lastUpdated.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">Generate Monthly Report</Button>
              <Button variant="outline" className="w-full justify-start">Export Financial Data</Button>
              <Button variant="outline" className="w-full justify-start">View Supplier Performance</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CEODashboard;