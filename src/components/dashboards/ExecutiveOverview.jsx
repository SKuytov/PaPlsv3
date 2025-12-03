import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  DollarSign, TrendingUp, AlertTriangle, Activity, 
  Package, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dbService } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = ['#0d9488', '#0f766e', '#115e59', '#134e4a', '#cbd5e1', '#94a3b8'];

const KPICard = ({ title, value, subValue, icon: Icon, trend, trendValue, color = "teal" }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-full bg-${color}-50`}>
          <Icon className={`h-4 w-4 text-${color}-600`} />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subValue && <span className="text-sm text-slate-500">/ {subValue}</span>}
      </div>
      {(trend || trendValue) && (
        <div className="flex items-center mt-3 text-xs">
          {trend === 'up' ? (
            <ArrowUpRight className="w-3 h-3 text-green-600 mr-1" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-red-600 mr-1" />
          )}
          <span className={trend === 'up' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {trendValue}
          </span>
          <span className="text-slate-400 ml-1">vs last month</span>
        </div>
      )}
    </CardContent>
  </Card>
);

const ExecutiveOverview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    inventory: { value: 0, count: 0, lowStock: 0 },
    finance: { totalSpend: 0, orderCount: 0 },
    maintenance: { cost: 0, minutes: 0 }
  });
  const [categoryData, setCategoryData] = useState([]);
  const [recentTx, setRecentTx] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsData, categorySpend, transactions] = await Promise.all([
          dbService.getDashboardStats('month'),
          dbService.getSpendByCategory(),
          dbService.getRecentTransactions(5)
        ]);

        setStats(statsData || {
          inventory: { value: 0, count: 0, lowStock: 0 },
          finance: { totalSpend: 0, orderCount: 0 },
          maintenance: { cost: 0, minutes: 0 }
        });

        // Process Category Data
        const processedCats = Object.entries(categorySpend || {}).map(([name, value]) => ({
          name: name === 'null' ? 'Uncategorized' : name,
          value
        })).sort((a, b) => b.value - a.value);
        
        setCategoryData(processedCats);
        setRecentTx(transactions.data || []);

      } catch (error) {
        console.error("Executive Dashboard Load Failed:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Overview</h1>
          <p className="text-slate-500 mt-1">
            High-level insights for <span className="font-semibold text-teal-600">{user?.user_metadata?.full_name || "God Admin"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
           <Button variant="ghost" size="sm" className="text-xs font-medium text-slate-600">
             <Calendar className="w-3.5 h-3.5 mr-2" /> Last 30 Days
           </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Inventory Value" 
          value={formatCurrency(stats.inventory.value)} 
          icon={DollarSign}
          trend="up"
          trendValue="+2.4%"
        />
        <KPICard 
          title="Monthly Spend" 
          value={formatCurrency(stats.finance.totalSpend)} 
          icon={TrendingUp}
          color="blue"
          trend="down"
          trendValue="-1.2%"
        />
        <KPICard 
          title="Downtime Impact" 
          value={formatCurrency(stats.maintenance.cost)} 
          subValue={`${stats.maintenance.minutes} mins`}
          icon={AlertTriangle}
          color="orange"
          trend="down"
          trendValue="-5.0%"
        />
        <KPICard 
          title="Stock Health" 
          value={`${stats.inventory.count} Items`} 
          subValue={`${stats.inventory.lowStock} Low`}
          icon={Package}
          color="indigo"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Inventory Distribution Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inventory Value Distribution</CardTitle>
            <CardDescription>Capital allocation across spare part categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={120} 
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
            </div>
          </CardContent>
        </Card>

        {/* Cost Composition Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Composition</CardTitle>
            <CardDescription>Top categories by value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                 <div className="text-center">
                    <span className="text-2xl font-bold text-slate-800">{categoryData.length}</span>
                    <p className="text-xs text-slate-500 uppercase">Categories</p>
                 </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Large Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" /> Recent High-Value Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
           <div className="space-y-4">
             {recentTx.map((tx, i) => (
               <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                     <div className={`w-2 h-2 rounded-full ${tx.transaction_type === 'usage' ? 'bg-red-500' : 'bg-green-500'}`} />
                     <div>
                        <p className="text-sm font-medium text-slate-900">{tx.part?.name || "Unknown Part"}</p>
                        <p className="text-xs text-slate-500">
                           {tx.transaction_type === 'usage' ? 'Used on' : 'Restocked from'} 
                           <span className="font-medium"> {tx.machine?.machine_code || tx.supplier?.name || "N/A"}</span>
                        </p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-bold text-slate-700">{Math.abs(tx.quantity)} units</p>
                     <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
               </div>
             ))}
             {recentTx.length === 0 && <div className="text-center text-slate-400 py-4">No recent activity recorded.</div>}
           </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveOverview;