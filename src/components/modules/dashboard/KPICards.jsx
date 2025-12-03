import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const KPICard = ({ title, value, trend, trendUpGood = true, icon: Icon, color }) => {
  const isPositive = parseFloat(trend) > 0;
  const isGood = trendUpGood ? isPositive : !isPositive;
  
  const trendColor = isGood ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group cursor-pointer">
       <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
             <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
          </div>
          {trend && (
             <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                {Math.abs(parseFloat(trend))}%
             </div>
          )}
       </div>
       <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
       <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-slate-900">{value}</span>
          <span className="text-xs text-slate-400 group-hover:text-teal-600 transition-colors">View Details &rarr;</span>
       </div>
    </div>
  );
};