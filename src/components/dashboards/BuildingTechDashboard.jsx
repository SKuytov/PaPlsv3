import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, Package, QrCode, AlertCircle, RefreshCw, TrendingUp, Activity, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dbService } from '@/lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BuildingTechDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Dashboard Data State
  const [machineStats, setMachineStats] = useState({
    total: 0,
    running: 0,
    down: 0,
    maintenance: 0,
  });
  const [partStats, setPartStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    recentScans: [],
  });
  const [downtimeEvents, setDowntimeEvents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [machineStatus, setMachineStatus] = useState([]);
  const [usageTrend, setUsageTrend] = useState([]);

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [machines, parts, downtime, transactions] = await Promise.all([
        dbService.getMachines({}, 0, 1000),
        dbService.getSpareParts({ status: 'all' }, 0, 1000),
        dbService.getDowntimeEvents(7), // Last 7 days
        dbService.getRecentTransactions(10),
      ]);

      // Process Machine Stats
      if (machines.data) {
        const running = machines.data.filter(m => m.operational_status === 'running').length;
        const down = machines.data.filter(m => m.operational_status === 'down').length;
        const maintenance = machines.data.filter(m => m.operational_status === 'maintenance').length;
        
        setMachineStats({
          total: machines.data.length,
          running,
          down,
          maintenance,
        });
        setMachineStatus(machines.data.slice(0, 5));
      }

      // Process Parts Stats
      if (parts.data) {
        const lowStock = parts.data.filter(p => p.current_quantity <= p.min_stock_level && p.current_quantity > 0).length;
        const outOfStock = parts.data.filter(p => p.current_quantity <= 0).length;
        
        setPartStats({
          total: parts.data.length,
          lowStock,
          outOfStock,
          recentScans: parts.data.slice(0, 3),
        });
      }

      // Process Downtime
      if (downtime.data) {
        setDowntimeEvents(downtime.data.slice(0, 5));
      }

      // Process Recent Activity
      if (transactions.data) {
        setRecentActivity(transactions.data.slice(0, 5));
      }

      // Generate usage trend (mock data based on real transaction patterns)
      const trendData = generateUsageTrend(transactions.data || []);
      setUsageTrend(trendData);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate usage trend data
  const generateUsageTrend = (transactions) => {
    const days = 7;
    const trendData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const dayTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.created_at);
        return txDate.toDateString() === date.toDateString();
      });

      const usage = dayTransactions.filter(tx => tx.transaction_type === 'usage').reduce((sum, tx) => sum + tx.quantity, 0);
      const restock = dayTransactions.filter(tx => tx.transaction_type === 'restock').reduce((sum, tx) => sum + tx.quantity, 0);

      trendData.push({
        date: dateStr,
        usage,
        restock,
      });
    }

    return trendData;
  };

  // Refresh Data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const quickActions = [
    { title: 'Scan Part', icon: QrCode, action: '/scanner', color: 'from-teal-500 to-teal-600', description: 'Track parts' },
    { title: 'View Machines', icon: Settings, action: '/machines', color: 'from-blue-500 to-blue-600', description: 'Manage assets' },
    { title: 'Check Stock', icon: Package, action: '/parts', color: 'from-green-500 to-green-600', description: 'Inventory status' },
    { title: 'Log Downtime', icon: AlertCircle, action: '/downtime', color: 'from-red-500 to-red-600', description: 'Report issues' },
  ];

  if (loading) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" message="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome, {user?.user_metadata?.full_name || 'Technician'}</h1>
          <p className="text-slate-600 mt-1">Quick access to your daily tasks • Last updated {lastUpdated.toLocaleTimeString()}</p>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(action.action)}
              className={`bg-gradient-to-br ${action.color} rounded-xl shadow-lg p-6 text-white hover:shadow-2xl transition-all transform hover:scale-105 text-left group`}
            >
              <Icon className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold">{action.title}</h3>
              <p className="text-sm text-white/80 mt-1">{action.description}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Machine Stats */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Machines Running</h3>
              <Badge className="bg-green-100 text-green-700">{machineStats.running}/{machineStats.total}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Running</span>
                <span className="font-bold text-green-600">{machineStats.running}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Down</span>
                <span className="font-bold text-red-600">{machineStats.down}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Maintenance</span>
                <span className="font-bold text-yellow-600">{machineStats.maintenance}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parts Stats */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Inventory Status</h3>
              <Badge className="bg-blue-100 text-blue-700">{partStats.total}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Parts</span>
                <span className="font-bold text-blue-600">{partStats.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Low Stock</span>
                <span className="font-bold text-yellow-600">{partStats.lowStock}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Out of Stock</span>
                <span className="font-bold text-red-600">{partStats.outOfStock}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Downtime Events */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Recent Downtime</h3>
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="space-y-2">
              {downtimeEvents.slice(0, 3).map((event, idx) => (
                <div key={idx} className="text-sm">
                  <p className="text-slate-600 truncate">{event.machine?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-400">{event.duration_minutes || 0} mins ago</p>
                </div>
              ))}
              {downtimeEvents.length === 0 && <p className="text-sm text-slate-500">No recent downtime</p>}
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Activity</h3>
              <Activity className="w-4 h-4 text-teal-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Transactions (24h)</span>
                <span className="font-bold text-teal-600">{recentActivity.length}</span>
              </div>
              <p className="text-xs text-slate-500 mt-3">Last updated {lastUpdated.toLocaleTimeString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((tx, idx) => (
                <div key={tx.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-teal-300 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${tx.transaction_type === 'usage' ? 'bg-red-500' : 'bg-green-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{tx.part?.name || 'Unknown Part'}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {tx.transaction_type === 'usage' ? 'Used on' : 'Restocked from'}
                      <span className="font-medium ml-1">{tx.machine?.machine_code || tx.supplier?.name || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${tx.transaction_type === 'usage' ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.transaction_type === 'usage' ? '-' : '+'}{tx.quantity}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-center text-slate-500 py-6">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Machine Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Machine Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {machineStatus.map((machine) => (
                <div key={machine.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">{machine.name}</p>
                    <p className="text-xs text-slate-600">{machine.machine_code}</p>
                  </div>
                  <Badge 
                    className={`${machine.operational_status === 'running' ? 'bg-green-100 text-green-700' : machine.operational_status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {machine.operational_status}
                  </Badge>
                </div>
              ))}
              {machineStatus.length === 0 && (
                <p className="text-center text-slate-500 py-6">No machines registered</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            7-Day Usage Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {usageTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="usage" fill="#ef4444" name="Usage" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="restock" fill="#10b981" name="Restock" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">No trend data available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuildingTechDashboard;