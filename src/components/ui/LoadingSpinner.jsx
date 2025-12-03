import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-64 text-slate-400 animate-in fade-in duration-200">
      <div className="relative">
        <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-25"></div>
        <Loader2 className="w-10 h-10 animate-spin text-teal-600 relative z-10" />
      </div>
      <p className="text-sm font-medium mt-4 text-slate-500 animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingSpinner;