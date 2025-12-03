import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Target, ArrowUpRight, Zap } from 'lucide-react';
import { formatCurrency } from '@/utils/calculations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MetricCard = ({ title, value, subtext, icon: Icon, color }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-xl shadow border border-slate-200 flex flex-col justify-between"
  >
    <div>
        <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-600`}>
            <Icon className="w-6 h-6" />
        </div>
        </div>
        <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wide">{title}</h3>
        <div className="text-3xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
    <p className="text-slate-400 text-sm mt-4 pt-4 border-t">{subtext}</p>
  </motion.div>
);

const SavingsDashboard = ({ analysis }) => {
  const { totalPotentialSavings, totalActualSavings, topOpportunities, trends } = analysis;
  const annualGoal = 50000;
  const progress = Math.min(100, (totalActualSavings / annualGoal) * 100);

  return (
    <div className="space-y-6">
       {/* Metrics */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard 
             title="Total Potential Savings" 
             value={formatCurrency(totalPotentialSavings)} 
             subtext="If all alternatives are adopted"
             icon={TrendingUp}
             color="blue"
          />
          <MetricCard 
             title="Realized Savings" 
             value={formatCurrency(totalActualSavings)} 
             subtext="Achieved year-to-date"
             icon={DollarSign}
             color="green"
          />
          <MetricCard 
             title="Cost Avoidance" 
             value={formatCurrency(totalPotentialSavings * 0.8)} 
             subtext="Estimated future reduction"
             icon={Target}
             color="orange"
          />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <Card className="lg:col-span-2">
               <CardHeader>
                   <CardTitle>Cumulative Savings Trend</CardTitle>
               </CardHeader>
               <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="savings" name="Realized Savings" stroke="#16a34a" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
               </CardContent>
           </Card>

           <Card className="lg:col-span-1">
               <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500 fill-current" /> Top Opportunities
                   </CardTitle>
               </CardHeader>
               <CardContent className="px-4 space-y-4">
                   {topOpportunities.slice(0, 5).map((part, i) => (
                       <div key={i} className="flex justify-between items-center border-b last:border-0 pb-3 last:pb-0">
                            <div className="overflow-hidden">
                                <div className="font-medium truncate w-32 text-slate-800" title={part.name}>{part.name}</div>
                                <div className="text-xs text-slate-500">{part.part_number}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-green-600">{formatCurrency(part.potentialSavings)}</div>
                                <Badge variant="outline" className="text-[10px] h-5">{part.savingsPercent}% off</Badge>
                            </div>
                       </div>
                   ))}
                   {topOpportunities.length === 0 && <div className="text-center text-slate-400 py-8">No recommendations available.</div>}
               </CardContent>
           </Card>
       </div>
    </div>
  );
};

export default SavingsDashboard;