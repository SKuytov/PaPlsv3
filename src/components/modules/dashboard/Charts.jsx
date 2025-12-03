import React from 'react';
import { cn } from "@/lib/utils";

export const SimpleBarChart = ({ data, labels, color = 'bg-teal-500' }) => {
  const max = Math.max(...data) || 1;
  return (
    <div className="h-64 flex items-end justify-between gap-2 pt-6">
      {data.map((val, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
          <div className="relative w-full flex justify-center h-full items-end">
             <div 
               className={`w-full max-w-[40px] rounded-t-md ${color} opacity-80 group-hover:opacity-100 transition-all duration-500`}
               style={{ height: `${(val / max) * 100}%` }}
             ></div>
             <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold bg-slate-800 text-white px-2 py-1 rounded shadow-lg z-10">
                {val}
             </div>
          </div>
          <span className="text-[10px] text-slate-500 font-medium truncate w-full text-center">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};

export const DonutChart = ({ data, labels }) => {
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const colors = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  let cumulativePercent = 0;

  return (
    <div className="flex items-center justify-center gap-8">
       <div className="relative w-40 h-40 rounded-full border-8 border-slate-100 flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0"
            style={{
              background: `conic-gradient(${
                data.map((val, i) => {
                   const start = cumulativePercent;
                   const end = start + (val / total) * 100;
                   cumulativePercent = end;
                   return `${colors[i % colors.length]} ${start}% ${end}%`;
                }).join(', ')
              })`
            }}
          ></div>
          <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center z-10">
             <span className="text-xs text-slate-500 uppercase">Total</span>
             <span className="text-xl font-bold text-slate-800">{total > 1000 ? (total/1000).toFixed(1)+'k' : total}</span>
          </div>
       </div>
       <div className="space-y-2">
          {labels.map((l, i) => (
             <div key={i} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></div>
                <span className="text-slate-600">{l}</span>
                <span className="font-bold text-slate-800 ml-auto">
                   {((data[i]/total)*100).toFixed(0)}%
                </span>
             </div>
          ))}
       </div>
    </div>
  );
};

export const ProgressBar = ({ value, max = 100, color = 'bg-teal-500', label, className = "" }) => (
  <div className={`w-full ${className}`}>
    {label && <div className="flex justify-between text-xs mb-1 font-medium text-slate-600">
      <span>{label}</span>
      <span className="font-bold text-slate-800">{Math.round((value/max)*100)}%</span>
    </div>}
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-500`} 
        style={{ width: `${Math.min(100, (value/max)*100)}%` }}
      />
    </div>
  </div>
);

export const SparkLine = ({ data, color = '#0d9488' }) => {
    const max = Math.max(...data) || 1;
    const min = Math.min(...data) || 0;
    const range = max - min || 1;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox="0 0 100 100" className="w-full h-12 overflow-visible" preserveAspectRatio="none">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};