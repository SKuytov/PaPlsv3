import React from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, ShoppingCart, Wrench, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TechnicalDashboard = () => {
  const navigate = useNavigate();
  
  const stats = [
    { title: 'Total Parts', value: '1,247', icon: Package, color: 'from-blue-500 to-blue-600' },
    { title: 'Low Stock', value: '23', icon: AlertTriangle, color: 'from-yellow-500 to-yellow-600' },
    { title: 'Pending Orders', value: '8', icon: ShoppingCart, color: 'from-teal-500 to-teal-600' },
    { title: 'Active Machines', value: '51', icon: Wrench, color: 'from-green-500 to-green-600' },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Technical Dashboard</h1>
          <p className="text-slate-600 mt-1">Maintenance and inventory overview</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={() => navigate('/scanner')} variant="outline" className="gap-2">
             <QrCode className="w-4 h-4" /> Scan Part
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className={`bg-gradient-to-br ${stat.color} p-3 rounded-lg w-fit mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-sm font-medium text-slate-600 mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>
      
      {/* Quick Actions Grid */}
      <h2 className="text-xl font-bold text-slate-800 mb-4">Management Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/docs')}>
           <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-4 rounded-full text-purple-600">
                 <QrCode className="w-8 h-8" />
              </div>
              <div>
                 <h3 className="font-bold text-lg text-slate-800">Barcode Generator</h3>
                 <p className="text-slate-500 text-sm">Create & print inventory labels</p>
              </div>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/parts')}>
           <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-full text-blue-600">
                 <Package className="w-8 h-8" />
              </div>
              <div>
                 <h3 className="font-bold text-lg text-slate-800">Inventory Manager</h3>
                 <p className="text-slate-500 text-sm">Add, edit, or remove parts</p>
              </div>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/machines')}>
           <div className="flex items-center gap-4">
              <div className="bg-teal-100 p-4 rounded-full text-teal-600">
                 <Wrench className="w-8 h-8" />
              </div>
              <div>
                 <h3 className="font-bold text-lg text-slate-800">Machine Registry</h3>
                 <p className="text-slate-500 text-sm">Manage facility assets</p>
              </div>
           </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Usage Trends</h2>
        <p className="text-slate-600">Usage analytics and trends will be displayed here</p>
      </div>
    </div>
  );
};

export default TechnicalDashboard;