import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, AlertCircle, Package, QrCode, Clock, CheckCircle,
  AlertTriangle, RefreshCw, MapPin, Users, TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dbService } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const TechnicianDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    assignedMachines: 0,
    activeTasks: 0,
    completedTasks: 0,
    criticalAlerts: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [assignedMachines, setAssignedMachines] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get user's building from role
      const userBuilding = user?.user_metadata?.building || 1;

      // Fetch machines in the building
      const machinesResult = await dbService.getMachines(
        { building_id: userBuilding },
        0,
        50
      );
      if (machinesResult && machinesResult.data) {
        setAssignedMachines(machinesResult.data.slice(0, 5));
        setStats(prev => ({
          ...prev,
          assignedMachines: machinesResult.data.length,
        }));
      }

      // Get recent transactions (completed tasks)
      const txResult = await dbService.getRecentTransactions(10);
      if (txResult && txResult.data) {
        setRecentActivity(txResult.data.slice(0, 5));
        setStats(prev => ({
          ...prev,
          completedTasks: txResult.data.length,
        }));
      }

      // Get pending orders
      const ordersResult = await dbService.getOrders({ status: 'pending' });
      if (ordersResult && ordersResult.data) {
        setPendingOrders(ordersResult.data.slice(0, 5));
        setStats(prev => ({
          ...prev,
          activeTasks: ordersResult.data.length,
        }));
      }

      // Calculate critical alerts (low stock in assigned machines)
      const partsResult = await dbService.getSpareParts({ status: 'out' }, 0, 100);
      if (partsResult && partsResult.data) {
        setStats(prev => ({
          ...prev,
          criticalAlerts: partsResult.data.length,
        }));
      }
    } catch (err) {
      console.error('Error loading technician dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome, {user?.user_metadata?.full_name || 'Technician'}
        </h1>
        <p className="text-slate-600 mt-2">Your daily maintenance dashboard</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Assigned Machines</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">
                {stats.assignedMachines}
              </h3>
            </div>
            <MapPin className="w-12 h-12 text-blue-100" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Completed Tasks</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">
                {stats.completedTasks}
              </h3>
            </div>
            <CheckCircle className="w-12 h-12 text-green-100" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Active Tasks</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">
                {stats.activeTasks}
              </h3>
            </div>
            <Clock className="w-12 h-12 text-yellow-100" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Critical Alerts</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">
                {stats.criticalAlerts}
              </h3>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-100" />
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          onClick={() => navigate('/scanner')}
          className="bg-blue-600 hover:bg-blue-700 h-auto py-4 flex flex-col items-center justify-center gap-2"
        >
          <QrCode className="w-6 h-6" />
          <span>Scan Part</span>
        </Button>
        <Button
          onClick={() => navigate('/machines')}
          className="bg-teal-600 hover:bg-teal-700 h-auto py-4 flex flex-col items-center justify-center gap-2"
        >
          <Wrench className="w-6 h-6" />
          <span>My Machines</span>
        </Button>
        <Button
          onClick={() => navigate('/downtime')}
          className="bg-orange-600 hover:bg-orange-700 h-auto py-4 flex flex-col items-center justify-center gap-2"
        >
          <AlertCircle className="w-6 h-6" />
          <span>Log Downtime</span>
        </Button>
        <Button
          onClick={() => navigate('/orders')}
          className="bg-purple-600 hover:bg-purple-700 h-auto py-4 flex flex-col items-center justify-center gap-2"
        >
          <Package className="w-6 h-6" />
          <span>Create Order</span>
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Machines */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-teal-600" />
              Your Assigned Machines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignedMachines.length > 0 ? (
                assignedMachines.map((machine) => (
                  <div
                    key={machine.id}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-teal-300 transition-colors cursor-pointer"
                    onClick={() => navigate(`/machines/${machine.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900">{machine.name}</h4>
                        <p className="text-sm text-slate-600 mt-1">Code: {machine.machine_code}</p>
                      </div>
                      <Badge
                        className={`${
                          machine.operational_status === 'running'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {machine.operational_status || 'unknown'}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500">
                  No machines assigned yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Critical Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Critical Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.criticalAlerts > 0 ? (
                <>
                  <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                    <p className="text-sm text-red-900 font-medium">Out of Stock Parts</p>
                    <p className="text-2xl font-bold text-red-600 mt-2">{stats.criticalAlerts}</p>
                  </div>
                  <Button
                    onClick={() => navigate('/parts?status=critical')}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    View Critical Items
                  </Button>
                </>
              ) : (
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-sm text-green-900 font-medium">All Systems Normal</p>
                  <p className="text-sm text-green-700 mt-2">✓ No critical alerts</p>
                </div>
              )}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-900 font-medium">Last Updated</p>
                <p className="text-xs text-blue-700 mt-1">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {activity.part?.name || 'Unknown Part'}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {activity.transaction_type === 'usage' ? 'Used' : 'Restocked'} - {activity.machine?.machine_code || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      activity.transaction_type === 'usage' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {activity.transaction_type === 'usage' ? '-' : '+'}{activity.quantity}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-500">No recent activity</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianDashboard;
