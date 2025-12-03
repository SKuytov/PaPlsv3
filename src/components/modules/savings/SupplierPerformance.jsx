import React from 'react';
import { Star, Award, Clock, Truck } from 'lucide-react';

const SupplierPerformance = ({ suppliers }) => {
  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map(s => (
             <div key={s.id} className="bg-white p-5 rounded-xl shadow border border-slate-200 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                     <h3 className="font-bold text-slate-800 text-lg">{s.name}</h3>
                     <span className={`text-xs px-2 py-1 rounded-full ${s.is_oem ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {s.is_oem ? 'OEM' : 'Alternative'}
                     </span>
                  </div>
                  <div className="flex items-center bg-yellow-50 px-2 py-1 rounded text-yellow-700 font-bold">
                     <Star className="w-4 h-4 mr-1 fill-yellow-500 text-yellow-500" />
                     {s.quality_score || '-'}
                  </div>
                </div>
                
                <div className="space-y-3 flex-1 border-t pt-4">
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-2"><Truck className="w-4 h-4" /> Delivery</span>
                      <span className="font-medium">{s.delivery_score || 'N/A'}%</span>
                   </div>
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-2"><Clock className="w-4 h-4" /> Lead Time Avg</span>
                      <span className="font-medium">3-5 days</span>
                   </div>
                </div>
             </div>
          ))}
          {suppliers.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400">No supplier data available.</div>
          )}
       </div>
    </div>
  );
};

export default SupplierPerformance;