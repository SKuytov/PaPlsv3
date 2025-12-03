import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Package, QrCode, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const BuildingTechDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    { title: 'Scan Part', icon: QrCode, action: '/scanner', color: 'from-teal-500 to-teal-600' },
    { title: 'View My Machines', icon: Settings, action: '/machines', color: 'from-blue-500 to-blue-600' },
    { title: 'Check Stock', icon: Package, action: '/parts', color: 'from-green-500 to-green-600' },
    { title: 'Log Downtime', icon: AlertCircle, action: '/downtime', color: 'from-red-500 to-red-600' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Welcome, {user?.full_name}</h1>
        <p className="text-slate-600 mt-1">Quick access to your daily tasks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(action.action)}
              className={`bg-gradient-to-br ${action.color} rounded-xl shadow-lg p-8 text-white hover:shadow-2xl transition-all transform hover:scale-105 text-left w-full`}
            >
              <Icon className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold">{action.title}</h3>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">My Recent Activity</h2>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-800">Scanned Part #12345</p>
              <p className="text-sm text-slate-600">2 hours ago</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-800">Logged Downtime - B1-ACM-001</p>
              <p className="text-sm text-slate-600">5 hours ago</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">My Machine Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium text-slate-800">B1-ACM-001</span>
              <span className="text-sm font-medium text-green-600">Running</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium text-slate-800">B1-ACM-002</span>
              <span className="text-sm font-medium text-green-600">Running</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildingTechDashboard;