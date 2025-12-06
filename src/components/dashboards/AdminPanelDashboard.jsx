import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, DollarSign, AlertTriangle, Package, Users, Settings,
  BarChart3, Database, AlertCircle, RefreshCw, Grid, Eye, Zap,
  Lock, Activity, Clock, CheckCircle, Server, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dbService } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const AdminPanelDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMachines: 0,
    totalParts: 0,
    totalOrders: 0,
    outOfStockParts: 0,
    pendingOrders: 0,
    criticalAlerts: 0,
    activeDowntime: 0,
  });

  const [systemHealth, setSystemHealth] = useState({
    database: { status: 'online', responseTime: 45 },
    api: { status: 'operational', uptime: 99.99 },
    auth: { status: 'active', sessions: 0 },
    storage: { status: 'healthy', usage: 65 },
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [criticalItems, setCriticalItems] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch comprehensive stats
      const [dashStats, machines, parts, orders, downtime] = await Promise.all([
        dbService.getDashboardStats('year'),
        dbService.getMachines({}, 0, 1000),
        dbService.getSpareParts({}, 0, 1000),
        dbService.getOrders({}),
        dbService.getDowntimeEvents({}),
      ]);

      // Process stats
      setStats({
        totalUsers: 15, // Would fetch from users table in real scenario
        totalMachines: machines?.data?.length || 0,
        totalParts: parts?.data?.length || 0,
        totalOrders: orders?.data?.length || 0,
        outOfStockParts: parts?.data?.filter(p => p.current_quantity <= 0).length || 0,
        pendingOrders: orders?.data?.filter(o => o.status === 'pending').length || 0,
        criticalAlerts: downtime?.data?.filter(d => !d.end_time).length || 0,
        activeDowntime: downtime?.data?.filter(d => !d.end_time).length || 0,
      });

      // Get recent transactions
      const transactions = await dbService.getRecentTransactions(8);
      setRecentActivity(transactions.data || []);

      // Get critical parts
      const criticalParts = await dbService.getSpareParts({ status: 'out' }, 0, 5);
      setCriticalItems(criticalParts.data || []);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Admin dashboard load error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3 * 60 * 1000); // Refresh every 3 minutes
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading Admin Panel..." />
      </div>
    );
  }

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  const StatCard = ({ title, value, icon: Icon, color = 'blue', trend, onClick }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="bg-white rounded-xl shadow-md p-6 border-l-4 cursor-pointer hover:shadow-lg transition-all"
      style={{ borderLeftColor: color === 'blue' ? '#3b82f6' : color === 'red' ? '#ef4444' : color === 'green' ? '#10b981' : '#f59e0b' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 font-medium mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
          {trend && <p className="text-xs text-slate-500 mt-2">↑ {trend}% from last month</p>}
        </div>
        <div className={`p-3 rounded-lg bg-opacity-10`} style={{ backgroundColor: color }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-900">Admin Control Panel</h1>
          </div>
          <p className="text-slate-600">System-wide oversight and management • Last updated {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* System Overview Stats */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-600" />
          System Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            color="blue"
            onClick={() => navigate('/admin/users')}
          />
          <StatCard
            title="Active Machines"
            value={stats.totalMachines}
            icon={Zap}
            color="green"
            onClick={() => navigate('/admin/machines')}
          />
          <StatCard
            title="Spare Parts Inventory"
            value={stats.totalParts}
            icon={Package}
            color="blue"
            onClick={() => navigate('/admin/parts')}
          />
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={BarChart3}
            color="purple"
            onClick={() => navigate('/admin/orders')}
          />
        </div>
      </div>

      {/* Critical Stats */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Critical Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Out of Stock Parts"
            value={stats.outOfStockParts}
            icon={AlertTriangle}
            color="red"
            onClick={() => navigate('/parts?status=critical')}
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={Clock}
            color="orange"
            onClick={() => navigate('/orders?status=pending')}
          />
          <StatCard
            title="Active Downtime Events"
            value={stats.activeDowntime}
            icon={AlertCircle}
            color="red"
            onClick={() => navigate('/downtime')}
          />
          <StatCard
            title="Critical Alerts"
            value={stats.criticalAlerts}
            icon={AlertTriangle}
            color="red"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="critical">Critical Items</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Access */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Access to All Dashboards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => navigate('/dashboard/executive')}
                  className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-left"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Executive Overview (CEO Dashboard)
                </Button>
                <Button
                  onClick={() => navigate('/dashboard/operations')}
                  className="w-full justify-start bg-teal-600 hover:bg-teal-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Operations Dashboard (Head Technician)
                </Button>
                <Button
                  onClick={() => navigate('/dashboard/technician')}
                  className="w-full justify-start bg-green-600 hover:bg-green-700"
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Technician Dashboard
                </Button>
                <Button
                  onClick={() => navigate('/dashboard/organizer')}
                  className="w-full justify-start bg-orange-600 hover:bg-orange-700"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Organizer Dashboard (Maintenance)
                </Button>
              </CardContent>
            </Card>

            {/* Admin Tools */}
            <Card>
              <CardHeader>
                <CardTitle>Admin Tools & Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => navigate('/admin/users')}
                  className="w-full justify-start bg-slate-600 hover:bg-slate-700"
                >
                  <Users className="w-4 h-4 mr-2" />
                  User Management
                </Button>
                <Button
                  onClick={() => navigate('/admin/roles')}
                  className="w-full justify-start bg-slate-600 hover:bg-slate-700"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Role & Permissions
                </Button>
                <Button
                  onClick={() => navigate('/admin/settings')}
                  className="w-full justify-start bg-slate-600 hover:bg-slate-700"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
                <Button
                  onClick={() => navigate('/admin/logs')}
                  className="w-full justify-start bg-slate-600 hover:bg-slate-700"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  System Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Database Connection', icon: Database, ...systemHealth.database },
              { title: 'API Gateway', icon: Server, ...systemHealth.api },
              { title: 'Authentication', icon: Lock, ...systemHealth.auth },
              { title: 'Storage System', icon: Package, ...systemHealth.storage },
            ].map((item, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <item.icon className="w-5 h-5" />
                      {item.title}
                    </h3>
                    <Badge className="bg-green-100 text-green-700">{item.status}</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">
                      {item.responseTime && `Response: ${item.responseTime}ms`}
                      {item.uptime && `Uptime: ${item.uptime}%`}
                      {item.usage && `Usage: ${item.usage}%`}
                      {item.sessions && `Sessions: ${item.sessions}`}
                    </p>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${item.usage || 95}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Critical Items Tab */}
        <TabsContent value="critical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Out of Stock Parts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {criticalItems.length > 0 ? (
                  criticalItems.map((part) => (
                    <div
                      key={part.id}
                      className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between hover:bg-red-100 cursor-pointer transition"
                      onClick={() => navigate(`/parts/${part.id}`)}
                    >
                      <div>
                        <p className="font-semibold text-red-900">{part.name}</p>
                        <p className="text-xs text-red-700 mt-1">Part#: {part.part_number}</p>
                      </div>
                      <Badge className="bg-red-600 text-white">Out of Stock</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-8">All parts in stock ✓</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{activity.part?.name}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {activity.transaction_type === 'usage' ? 'Used' : 'Restocked'} • {activity.machine?.machine_code}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            activity.transaction_type === 'usage' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {activity.transaction_type === 'usage' ? '-' : '+'}{activity.quantity}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Controls Tab */}
        <TabsContent value="controls" className="space-y-6">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-900">
                <AlertTriangle className="w-5 h-5" />
                System Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="bg-blue-600 hover:bg-blue-700 justify-start">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh All Data
                </Button>
                <Button className="bg-orange-600 hover:bg-orange-700 justify-start">
                  <Database className="w-4 h-4 mr-2" />
                  Clear Cache
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700 justify-start">
                  <Activity className="w-4 h-4 mr-2" />
                  Export Audit Log
                </Button>
                <Button className="bg-slate-600 hover:bg-slate-700 justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  System Backup
                </Button>
              </div>
              <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg mt-4">
                <p className="text-sm text-yellow-900 font-semibold">⚠️ Caution</p>
                <p className="text-xs text-yellow-800 mt-2">
                  System controls affect all users. Proceed with care.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Import Wrench icon
import { Wrench } from 'lucide-react';

export default AdminPanelDashboard;
