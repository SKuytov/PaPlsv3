import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Package, AlertTriangle, ShoppingCart, Wrench, QrCode, RefreshCw,
  TrendingDown, Activity, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { dbService } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const TechnicalDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Stats State
  const [partStats, setPartStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    overStock: 0,
  });

  const [machineStats, setMachineStats] = useState({
    total: 0,
    running: 0,
    down: 0,
    maintenance: 0,
  });

  const [orderStats, setOrderStats] = useState({
    pending: 0,
    inTransit: 0,
    delivered: 0,
  });

  // Detail Data
  const [lowStockParts, setLowStockParts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [machineStatus, setMachineStatus] = useState([]);
  const [usageTrend, setUsageTrend] = useState([]);
  const [criticalAlerts, setCriticalAlerts] = useState([]);

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [parts, machines, transactions, orders] = await Promise.all([
        dbService.getSpareParts({ status: 'all' }, 0, 1000),
        dbService.getMachines({}, 0, 1000),
        dbService.getRecentTransactions(20),
        dbService.getOrders({}, 0, 1000),
      ]);

      // Process Parts Stats
      if (parts.data) {
        const lowStock = parts.data.filter(
          p => p.current_quantity <= p.min_stock_level && p.current_quantity > 0
        ).length;
        const outOfStock = parts.data.filter(p => p.current_quantity <= 0).length;
        const overStock = parts.data.filter(
          p => p.current_quantity > p.reorder_point * 2
        ).length;

        setPartStats({
          total: parts.data.length,
          lowStock,
          outOfStock,
          overStock,
        });

        // Get low stock parts
        const lowStockList = parts.data
          .filter(p => p.current_quantity <= p.min_stock_level)
          .sort((a, b) => a.current_quantity - b.current_quantity)
          .slice(0, 8);
        setLowStockParts(lowStockList);

        // Generate critical alerts
        const alerts = [];
        if (outOfStock > 0) {
          alerts.push({
            type: 'critical',
            message: `${outOfStock} part(s) are out of stock`,
            icon: AlertTriangle,
          });
        }
        if (lowStock > 5) {
          alerts.push({
            type: 'warning',
            message: `${lowStock} part(s) have low stock levels`,
            icon: AlertTriangle,
          });
        }
        setCriticalAlerts(alerts);
      }

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

        setMachineStatus(machines.data.slice(0, 6));

        // Add machine alert if any are down
        if (down > 0) {
          setCriticalAlerts(prev => [
            ...prev,
            {
              type: 'critical',
              message: `${down} machine(s) are currently down`,
              icon: AlertTriangle,
            },
          ]);
        }
      }

      // Process Order Stats
      if (orders?.data) {
        const pending = orders.data.filter(o => o.status === 'pending').length;
        const inTransit = orders.data.filter(o => o.status === 'in_transit').length;
        const delivered = orders.data.filter(o => o.status === 'delivered').length;

        setOrderStats({
          pending,
          inTransit,
          delivered,
        });
      }

      // Process Recent Activity
      if (transactions?.data) {
        setRecentActivity(transactions.data.slice(0, 6));
      }

      // Generate usage trend
      const trendData = generateUsageTrend(transactions?.data || []);
      setUsageTrend(trendData);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Technical Dashboard load error:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate usage trend
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

      const usage = dayTransactions
        .filter(tx => tx.transaction_type === 'usage')
        .reduce((sum, tx) => sum + tx.quantity, 0);
      const restock = dayTransactions
        .filter(tx => tx.transaction_type === 'restock')
        .reduce((sum, tx) => sum + tx.quantity, 0);

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

  if (loading) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" message="Loading Technical Dashboard..." />
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Parts',
      value: partStats.total.toString(),
      subtext: `${partStats.lowStock} low, ${partStats.outOfStock} empty`,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Low Stock',
      value: partStats.lowStock.toString(),
      subtext: 'requires reorder',
      icon: AlertTriangle,
      color: 'from-yellow-500 to-yellow-600',
      badgeColor: 'bg-yellow-100 text-yellow-700',
      critical: partStats.lowStock > 5,
    },
    {
      title: 'Pending Orders',
      value: orderStats.pending.toString(),
      subtext: `${orderStats.inTransit} in transit`,
      icon: ShoppingCart,
      color: 'from-teal-500 to-teal-600',
      badgeColor: 'bg-teal-100 text-teal-700',
    },
    {
      title: 'Active Machines',
      value: `${machineStats.running}/${machineStats.total}`,
      subtext: `${machineStats.down} down`,
      icon: Wrench,
      color: 'from-green-500 to-green-600',
      badgeColor: 'bg-green-100 text-green-700',
      critical: machineStats.down > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Technical Dashboard</h1>
          <p className="text-slate-600 mt-1">Maintenance and inventory overview • Last updated {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/scanner')} variant="outline" className="gap-2">
            <QrCode className="w-4 h-4" /> Scan Part
          </Button>
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

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          {criticalAlerts.map((alert, idx) => (
            <div key={idx} className={`p-4 rounded-lg border flex items-start gap-3 ${alert.type === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.type === 'critical' ? 'text-red-600' : 'text-yellow-600'}`} />
              <p className={alert.type === 'critical' ? 'text-red-900 font-medium' : 'text-yellow-900 font-medium'}>
                {alert.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`hover:shadow-lg transition-all ${stat.critical ? 'border-red-300 bg-red-50' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`bg-gradient-to-br ${stat.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {stat.critical && <Badge className="bg-red-100 text-red-700">Alert</Badge>}
                  </div>
                  <h3 className="text-sm font-medium text-slate-600 mb-1">{stat.title}</h3>
                  <p className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.subtext}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Management Tools */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Management Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white p-6 rounded-xl shadow border hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => navigate('/docs')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-4 rounded-full text-purple-600 group-hover:bg-purple-200 transition-colors">
                <QrCode className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Barcode Generator</h3>
                <p className="text-slate-600 text-sm">Create & print inventory labels</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white p-6 rounded-xl shadow border hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => navigate('/parts')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-full text-blue-600 group-hover:bg-blue-200 transition-colors">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Inventory Manager</h3>
                <p className="text-slate-600 text-sm">Add, edit, or remove parts</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white p-6 rounded-xl shadow border hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => navigate('/machines')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-teal-100 p-4 rounded-full text-teal-600 group-hover:bg-teal-200 transition-colors">
                <Wrench className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Machine Registry</h3>
                <p className="text-slate-600 text-sm">Manage facility assets</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Parts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-yellow-600" />
              Low Stock Items
            </CardTitle>
            <CardDescription>Parts requiring reorder</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {lowStockParts.length > 0 ? (
                lowStockParts.map(part => (
                  <div key={part.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-yellow-300 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{part.name}</p>
                      <p className="text-xs text-slate-600 mt-0.5">PN: {part.part_number}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <Badge
                        className={`${
                          part.current_quantity <= 0
                            ? 'bg-red-100 text-red-700'
                            : part.current_quantity <= part.min_stock_level / 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {part.current_quantity} left
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-6">No low stock items</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Machine Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-teal-600" />
              Machine Status
            </CardTitle>
            <CardDescription>Current operational status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {machineStatus.length > 0 ? (
                machineStatus.map(machine => (
                  <div key={machine.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{machine.name}</p>
                      <p className="text-xs text-slate-600 font-mono">{machine.machine_code}</p>
                    </div>
                    <Badge
                      className={`${
                        machine.operational_status === 'running'
                          ? 'bg-green-100 text-green-700'
                          : machine.operational_status === 'maintenance'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {machine.operational_status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-6">No machines registered</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            7-Day Usage Trends
          </CardTitle>
          <CardDescription>Parts usage and restocking patterns</CardDescription>
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
                  <Legend />
                  <Bar dataKey="usage" fill="#ef4444" name="Usage" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="restock" fill="#10b981" name="Restock" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">No usage data available</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest transactions and changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map(tx => (
                <div key={tx.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${tx.transaction_type === 'usage' ? 'bg-red-500' : 'bg-green-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{tx.part?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {tx.transaction_type === 'usage' ? 'Used' : 'Restocked'} • {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className={`text-sm font-bold flex-shrink-0 ${tx.transaction_type === 'usage' ? 'text-red-600' : 'text-green-600'}`}>
                    {tx.transaction_type === 'usage' ? '-' : '+'}{tx.quantity}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-6">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicalDashboard;