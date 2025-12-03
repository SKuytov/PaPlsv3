import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-25"></div>
        <Loader2 className="w-16 h-16 animate-spin text-teal-600 relative z-10" />
      </div>
      <h2 className="mt-8 text-xl font-bold text-slate-800">Loading WMS</h2>
      <p className="text-slate-500 mt-2">Initializing application...</p>
    </div>
  );
};

export default LoadingScreen;