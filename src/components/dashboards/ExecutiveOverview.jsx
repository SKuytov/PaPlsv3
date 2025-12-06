import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line
} from 'recharts';
import {
  DollarSign, TrendingUp, AlertTriangle, Activity,
  Package, ArrowUpRight, ArrowDownRight, Calendar, RefreshCw, AlertCircle
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
  const [timeframe, setTimeframe] = useState('30'); // 7, 30, 90, 365
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

  // Load Dashboard Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, categorySpend, spendHistory, transactions, machineData, partData] = await Promise.all([
        dbService.getDashboardStats('month'),
        dbService.getSpendByCategory(),
        dbService.getFinancialHistory('month'),
        dbService.getRecentTransactions(20),
        dbService.getMachines({}, 0, 1000),
        dbService.getSpareParts({ status: 'all' }, 0, 1000),
      ]);

      // Process Stats
      if (statsData) {
        setStats({
          inventory: {
            value: statsData.inventory?.value || 0,
            count: statsData.inventory?.count || 0,
            lowStock: statsData.inventory?.lowStock || 0,
            outOfStock: statsData.inventory?.outOfStock || 0,
          },
          finance: {
            totalSpend: statsData.finance?.totalSpend || 0,
            orderCount: statsData.finance?.orderCount || 0,
            totalSavings: statsData.finance?.totalSavings || 0,
          },
          maintenance: {
            cost: statsData.maintenance?.cost || 0,
            minutes: statsData.maintenance?.minutes || 0,
            events: statsData.maintenance?.events || 0,
          },
          machines: {
            total: machineData?.data?.length || 0,
            running: machineData?.data?.filter(m => m.operational_status === 'running').length || 0,
            down: machineData?.data?.filter(m => m.operational_status === 'down').length || 0,
          },
        });
      }

      // Process Category Spend
      if (categorySpend) {
        const categoryData = Object.entries(categorySpend)
          .map(([name, value]) => ({
            name: name === 'null' ? 'Uncategorized' : name,
            value,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);
        setChartData(prev => ({ ...prev, categorySpend: categoryData }));
      }

      // Process Spend History
      if (spendHistory) {
        const historyData = spendHistory.slice(-30).map(d => ({
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          spend: d.spend || 0,
          savings: d.savings || 0,
        }));
        setChartData(prev => ({ ...prev, spendHistory: historyData }));
      }

      // Process Top Transactions
      if (transactions?.data) {
        setChartData(prev => ({
          ...prev,
          topTransactions: transactions.data.slice(0, 10),
        }));
      }

      // Process Machine Health
      if (machineData?.data) {
        const healthData = machineData.data.slice(0, 8).map(m => ({
          name: m.machine_code,
          uptime: m.uptime_percentage || 95,
          downtime: 100 - (m.uptime_percentage || 95),
        }));
        setChartData(prev => ({ ...prev, machineHealth: healthData }));
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Executive Overview load error:', err);
      setError('Failed to load dashboard data. Please try again.');
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
          <div>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="transactions">Activity</TabsTrigger>
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
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                    <div className="text-center">
                      <span className="text-2xl font-bold text-slate-800">{chartData.categorySpend.length}</span>
                      <p className="text-xs text-slate-500 uppercase">Categories</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Spend & Savings Trend</CardTitle>
              <CardDescription>Last 30 days financial performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {chartData.spendHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.spendHistory}>
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="spend" stroke="#ef4444" fillOpacity={1} fill="url(#colorSpend)" name="Spend" />
                      <Area type="monotone" dataKey="savings" stroke="#10b981" fillOpacity={1} fill="url(#colorSavings)" name="Savings" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">No financial data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Machine Uptime Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {chartData.machineHealth.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.machineHealth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => `${value.toFixed(1)}%`}
                        />
                        <Legend />
                        <Bar dataKey="uptime" fill="#10b981" name="Uptime" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="downtime" fill="#ef4444" name="Downtime" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">No machine data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Machine Status Summary</CardTitle>
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
                {chartData.topTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-teal-300 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${tx.transaction_type === 'usage' ? 'bg-red-500' : 'bg-green-500'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{tx.part?.name || 'Unknown Part'}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {tx.transaction_type === 'usage' ? 'Used on' : 'Restocked from'}
                          <span className="font-medium ml-1">{tx.machine?.machine_code || tx.supplier?.name || 'N/A'}</span>
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
                ))}
                {chartData.topTransactions.length === 0 && (
                  <div className="text-center text-slate-500 py-8">No recent transactions</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExecutiveOverview;