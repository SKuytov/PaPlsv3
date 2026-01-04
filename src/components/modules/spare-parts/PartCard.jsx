import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getStockStatus } from '@/utils/calculations';
import ImageWithFallback from '@/components/common/ImageWithFallback';

/**
 * Displays a single spare part in a grid layout.
 * Memoized to prevent unnecessary re-renders during parent state updates.
 * Updated: Added map-style location breadcrumb showing Building → Warehouse → Bin Location
 */
const PartCard = memo(({ part, onClick }) => {
  const status = getStockStatus(part.current_quantity, part.min_stock_level, part.reorder_point);

  // Extract location information with fallbacks
  const warehouseName = part.warehouse?.name || 'Unknown';
  const buildingName = part.warehouse?.building?.name || part.building?.name || 'Unknown';
  const binLocation = part.bin_location || 'Not assigned';
  const locationBreadcrumb = `${buildingName} → ${warehouseName} → ${binLocation}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="group h-full flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-slate-200 hover:border-teal-500/50" 
        onClick={() => onClick(part)}
      >
        {/* Image Section */}
        <div className="relative aspect-video flex items-center justify-center overflow-hidden border-b p-0">
          <ImageWithFallback 
            src={part.photo_url} 
            alt={part.name} 
            className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" 
          />
        </div>
        
        <CardContent className="p-4 flex-1 flex flex-col">
           {/* Header Info */}
           <div className="flex justify-between items-start gap-2 mb-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 truncate max-w-[120px] bg-slate-100 text-slate-600 hover:bg-slate-200">
                 {part.category}
              </Badge>
           </div>

           <h3 className="font-bold text-slate-800 leading-tight mb-1 line-clamp-2 text-base" title={part.name}>{part.name}</h3>
           <p className="text-xs text-slate-500 font-mono mb-4 truncate">{part.part_number}</p>
           
           {/* Stats Grid (Stock Levels) */}
           <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-y-2 text-sm border border-slate-100 mt-auto">
              <div className="flex justify-between items-center pr-2 border-r border-slate-200">
                 <span className="text-slate-500 text-xs">Current Stock</span>
                 <span className={`font-bold ${status === 'out' ? 'text-red-600' : 'text-slate-700'}`}>{part.current_quantity}</span>
              </div>
              <div className="flex justify-between items-center pl-2">
                 <span className="text-slate-500 text-xs">Min Stock</span>
                 <span className="font-medium text-slate-700">{part.min_stock_level}</span>
              </div>
              <div className="col-span-2 flex justify-between items-center pt-2 border-t border-slate-200">
                 <span className="text-slate-500 text-xs">Reorder Level</span>
                 <span className="font-medium text-orange-600">{part.reorder_point}</span>
              </div>
           </div>

           {/* Location Breadcrumb - Map Style */}
           <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-start gap-2 text-xs text-slate-600">
                 <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
                 <span className="text-[11px] leading-snug break-words" title={locationBreadcrumb}>
                    {locationBreadcrumb}
                 </span>
              </div>
           </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

PartCard.displayName = 'PartCard';

export default PartCard;