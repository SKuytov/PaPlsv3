import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Box, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

/**
 * Renders a consistent status badge for inventory items.
 * @param {Object} props
 * @param {'out' | 'critical' | 'low' | 'ok'} props.status - The calculated stock status
 */
const StatusBadge = ({ status }) => {
  const styles = {
    out: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
    critical: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
    low: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
    ok: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  };
  
  const labels = { 
    out: 'Out of Stock', 
    critical: 'Critical Low', 
    low: 'Low Stock', 
    ok: 'Healthy' 
  };
  
  const icons = { 
    out: XCircle, 
    critical: AlertTriangle, 
    low: AlertTriangle, 
    ok: CheckCircle 
  };
  
  const Icon = icons[status] || Box;

  return (
    <Badge variant="outline" className={`${styles[status] || styles.ok} gap-1.5 pl-1.5 pr-2.5 py-0.5 transition-colors`}>
      <Icon className="w-3.5 h-3.5" />
      {labels[status] || status}
    </Badge>
  );
};

export default StatusBadge;