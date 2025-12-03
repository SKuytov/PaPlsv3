import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Activity, Package, AlertTriangle } from 'lucide-react';
import { dbService } from '@/lib/supabase';
import { formatCurrency } from '@/utils/calculations';
import { KPICard } from './dashboard/KPICards';
import { SimpleBarChart, DonutChart } from './dashboard/Charts';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const ExecutiveDashboard = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState({});
  const [catSpend, setCatSpend] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [kpis, trends, cats] = await Promise.all([
          dbService.getDashboardStats(timeRange),
          dbService.getMonthlyTrends(),
          dbService.getSpendByCategory()
        ]);
        setStats(kpis);
        setMonthlyTrends(trends);
        setCatSpend(cats);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [timeRange]);

  if (loading) return <LoadingSpinner message="Generating Executive Report..." />;

  return (
    <ErrorBoundary>
      <div className="space-y-8">
         <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-800">Executive Overview</h1>
            <div className="bg-white border rounded-lg p-1 flex">
               {['month', 'quarter', 'year'].map(t => (
                  <button key={t} onClick={() => setTimeRange(t)} className={`px-3 py-1 rounded capitalize text-sm ${timeRange === t ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>{t}</button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard title="Inventory Value" value={formatCurrency(stats?.inventory?.value || 0)} icon={Package} color="bg-blue-500" />
            <KPICard title="Total Spend" value={formatCurrency(stats?.finance?.totalSpend || 0)} icon={DollarSign} color="bg-teal-500" />
            <KPICard title="Maintenance" value={formatCurrency(stats?.maintenance?.cost || 0)} icon={Activity} color="bg-orange-500" />
            <KPICard title="Low Stock" value={stats?.inventory?.lowStock || 0} icon={AlertTriangle} color="bg-red-500" />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
               <h3 className="font-bold text-slate-800 mb-6">6-Month Spending Trend</h3>
               <SimpleBarChart data={Object.values(monthlyTrends)} labels={Object.keys(monthlyTrends)} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
               <h3 className="font-bold text-slate-800 mb-6">Spend by Category</h3>
               <DonutChart data={Object.values(catSpend)} labels={Object.keys(catSpend)} />
            </div>
         </div>
      </div>
    </ErrorBoundary>
  );
};

export default ExecutiveDashboard;