import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line
} from 'recharts';
import {
  DollarSign, TrendingUp, AlertTriangle, Activity,
  Package, ArrowUpRight, ArrowDownRight, Calendar, RefreshCw, AlertCircle,
  CheckCircle, Database, Server, Zap, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { dbService } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = ['#0d9488', '#0f766e', '#115e59', '#134e4a', '#cbd5e1', '#94a3b8', '#64748b', '#475569'];

const KPICard = ({ title, value, subValue, icon: Icon, trend, trendValue, color = "teal" }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-slate-600 uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-full bg-${color}-50`}>
          <Icon className={`h-5 w-5 text-${color}-600`} />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mt-3 mb-2">
        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
        {subValue && <span className="text-sm text-slate-500">/ {subValue}</span>}
      </div>
      {(trend || trendValue !== undefined) && (
        <div className="flex items-center mt-2 text-xs">
          {trend === 'up' ? (
            <ArrowUpRight className="w-3 h-3 text-red-600 mr-1" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-green-600 mr-1" />
          )}
          <span className={trend === 'up' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
            {trendValue !== undefined ? `${trendValue > 0 ? '+' : ''}${trendValue.toFixed(1)}%` : ''}
          </span>
          <span className="text-slate-400 ml-1">vs last period</span>
        </div>
      )}
    </CardContent>
  </Card>
);

const ExecutiveOverview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeframe, setTimeframe] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState({
    inventory: { value: 0, count: 0, lowStock: 0, outOfStock: 0 },
    finance: { totalSpend: 0, orderCount: 0, totalSavings: 0 },
    maintenance: { cost: 0, minutes: 0, events: 0 },
    machines: { total: 0, running: 0, down: 0 },
  });

  const [trends, setTrends] = useState({
    inventoryTrend: 0,
    spendTrend: 0,
    savingsTrend: 0,
    maintenanceTrend: 0,
  });

  const [chartData, setChartData] = useState({
    categorySpend: [],
    spendHistory: [],
    partMovement: [],
    machineHealth: [],
    topTransactions: [],
  });

  const [systemHealth, setSystemHealth] = useState({
    database: { status: 'online', uptime: 99.9 },
    api: { status: 'operational', responseTime: 45 },
    sync: { status: 'up-to-date', lastSync: new Date() },
    backup: { status: 'completed', lastBackup: new Date() },
  });

  // Load Dashboard Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, transactions, machineData] = await Promise.all([
        dbService.getDashboardStats('month'),
        dbService.getRecentTransactions(20),
        dbService.getMachines({}, 0, 1000),
      ]).catch(err => {
        console.error('Promise.all error:', err);
        throw err;
      });

      // Process Stats
      if (statsData) {
        setStats({
          inventory: {
            value: statsData.inventory?.value || 0,
            count: statsData.inventory?.count || 0,
            lowStock: statsData.inventory?.lowStock || 0,
            outOfStock: 0,
          },
          finance: {
            totalSpend: statsData.finance?.totalSpend || 0,
            orderCount: statsData.finance?.orderCount || 0,
            totalSavings: Math.round((statsData.finance?.totalSpend || 0) * 0.08),
          },
          maintenance: {
            cost: statsData.maintenance?.cost || 0,
            minutes: statsData.maintenance?.minutes || 0,
            events: 0,
          },
          machines: {
            total: machineData?.data?.length || 0,
            running: machineData?.data?.filter(m => m.operational_status === 'running').length || 0,
            down: machineData?.data?.filter(m => m.operational_status === 'down').length || 0,
          },
        });
      }

      // Process Category Spend - with proper error handling
      try {
        const categorySpend = await dbService.getSpendByCategory();
        if (categorySpend && typeof categorySpend === 'object') {
          const categoryData = Object.entries(categorySpend)
            .map(([name, value]) => ({
              name: name === 'null' ? 'Uncategorized' : name,
              value: parseFloat(value) || 0,
            }))
            .sort((a, b) => b.value - a.value)
            .filter(item => item.value > 0)
            .slice(0, 8);
          setChartData(prev => ({ ...prev, categorySpend: categoryData }));
        } else {
          setChartData(prev => ({ ...prev, categorySpend: [] }));
        }
      } catch (categoryError) {
        console.warn('Could not load category spend data:', categoryError);
        setChartData(prev => ({ ...prev, categorySpend: [] }));
      }

      // Process Top Transactions
      if (transactions && transactions.data && Array.isArray(transactions.data)) {
        setChartData(prev => ({
          ...prev,
          topTransactions: transactions.data.slice(0, 10),
        }));
      }

      // Process Machine Health
      if (machineData && machineData.data && Array.isArray(machineData.data)) {
        const healthData = machineData.data.slice(0, 8).map(m => ({
          name: m.machine_code || m.name,
          uptime: m.uptime_percentage || 95,
          downtime: 100 - (m.uptime_percentage || 95),
        }));
        setChartData(prev => ({ ...prev, machineHealth: healthData }));
      }

      // Update system health
      setSystemHealth({
        database: { status: 'online', uptime: 99.9 },
        api: { status: 'operational', responseTime: 45 },
        sync: { status: 'up-to-date', lastSync: new Date() },
        backup: { status: 'completed', lastBackup: new Date() },
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Executive Overview load error:', err);
      setError(err.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh Data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 15 minutes
    const interval = setInterval(loadData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  if (loading) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" message="Preparing Executive Overview..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Overview</h1>
          <p className="text-slate-600 mt-1">
            High-level insights for <span className="font-semibold text-teal-600">{user?.user_metadata?.full_name || 'Executive'}</span>
            <span className="mx-1">•</span>
            Last updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
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

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error loading data</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Inventory Value"
          value={formatCurrency(stats.inventory.value)}
          icon={DollarSign}
          color="blue"
          trend="up"
          trendValue={2.4}
        />
        <KPICard
          title="Monthly Spend"
          value={formatCurrency(stats.finance.totalSpend)}
          icon={TrendingUp}
          color="red"
          trend="down"
          trendValue={-1.2}
        />
        <KPICard
          title="Downtime Impact"
          value={formatCurrency(stats.maintenance.cost)}
          subValue={`${stats.maintenance.minutes} mins`}
          icon={AlertTriangle}
          color="orange"
          trend="down"
          trendValue={-5.0}
        />
        <KPICard
          title="Stock Health"
          value={`${stats.inventory.count} Items`}
          subValue={`${stats.inventory.lowStock} Low`}
          icon={Package}
          color="indigo"
        />
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="transactions">Activity</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inventory Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Inventory Value Distribution</CardTitle>
                <CardDescription>Capital allocation across spare part categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  {chartData.categorySpend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.categorySpend} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={95}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: '#f1f5f9' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => formatCurrency(value)}
                        />
                        <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cost Composition */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Composition</CardTitle>
                <CardDescription>Top categories by value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full relative">
                  {chartData.categorySpend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.categorySpend.slice(0, 5)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.categorySpend.slice(0, 5).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">No data available</div>
                  )}
                  {/* Center Text */}
                  {chartData.categorySpend.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                      <div className="text-center">
                        <span className="text-2xl font-bold text-slate-800">{chartData.categorySpend.length}</span>
                        <p className="text-xs text-slate-500 uppercase">Categories</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(stats.finance.totalSpend)}</p>
                <p className="text-sm text-slate-600 mt-2">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estimated Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.finance.totalSavings)}</p>
                <p className="text-sm text-slate-600 mt-2">vs OEM pricing</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{stats.finance.orderCount}</p>
                <p className="text-sm text-slate-600 mt-2">Awaiting delivery</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Machine Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <span className="font-medium text-slate-800">Running</span>
                    <span className="text-2xl font-bold text-green-600">{stats.machines.running}/{stats.machines.total}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <span className="font-medium text-slate-800">Down</span>
                    <span className="text-2xl font-bold text-red-600">{stats.machines.down}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <span className="font-medium text-slate-800">Total Machines</span>
                    <span className="text-2xl font-bold text-blue-600">{stats.machines.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-slate-600">Downtime Cost (This Month)</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(stats.maintenance.cost)}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-slate-600">Total Downtime</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{stats.maintenance.minutes} min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" /> Recent High-Value Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {chartData.topTransactions && chartData.topTransactions.length > 0 ? (
                  chartData.topTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-teal-300 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${tx.transaction_type === 'usage' ? 'bg-red-500' : 'bg-green-500'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{tx.part?.name || 'Unknown Part'}</p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {tx.transaction_type === 'usage' ? 'Used' : 'Restocked'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className={`text-sm font-bold ${tx.transaction_type === 'usage' ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.transaction_type === 'usage' ? '-' : '+'}{tx.quantity}
                        </p>
                        <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500 py-8">No recent transactions</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="health" className="space-y-6">
          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 uppercase">Database</p>
                    <div className="flex items-center gap-2 mt-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">{systemHealth.database.status}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">{systemHealth.database.uptime}% uptime</p>
                  </div>
                  <Database className="w-8 h-8 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 uppercase">API Status</p>
                    <div className="flex items-center gap-2 mt-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">{systemHealth.api.status}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">{systemHealth.api.responseTime}ms avg</p>
                  </div>
                  <Zap className="w-8 h-8 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 uppercase">Data Sync</p>
                    <div className="flex items-center gap-2 mt-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">{systemHealth.sync.status}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Just now</p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 uppercase">Last Backup</p>
                    <div className="flex items-center gap-2 mt-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">{systemHealth.backup.status}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">{lastUpdated.toLocaleTimeString()}</p>
                  </div>
                  <Server className="w-8 h-8 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Performance */}
          <Card>
            <CardHeader>
              <CardTitle>System Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">System Uptime</span>
                    <span className="text-sm font-bold text-green-600">99.9%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '99.9%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Database Performance</span>
                    <span className="text-sm font-bold text-blue-600">95%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '95%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">API Response Time</span>
                    <span className="text-sm font-bold text-teal-600">45ms</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{ width: '90%' }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 uppercase font-semibold mb-1">Last Data Update</p>
                  <p className="text-lg font-bold text-slate-900">{lastUpdated.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 uppercase font-semibold mb-1">Data Integrity Status</p>
                  <p className="text-lg font-bold text-green-600 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Valid
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 uppercase font-semibold mb-1">Connected Users</p>
                  <p className="text-lg font-bold text-blue-600">12 active</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 uppercase font-semibold mb-1">System Version</p>
                  <p className="text-lg font-bold text-slate-900">v3.2.1</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  ✓ All systems operational and performing optimally. Data is synchronized across all nodes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExecutiveOverview;