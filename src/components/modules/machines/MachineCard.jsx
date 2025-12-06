// src/components/machines/MachineCard.jsx
// 📊 Machine Card Component - Mobile Responsive Grid View

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, TrendingUp, Clock, Zap, MapPin,
  Eye, Wrench, AlertCircle
} from 'lucide-react';
import ImageWithFallback from '@/components/common/ImageWithFallback';

const MachineCard = ({ machine, metrics, onViewDetails, onScheduleMaintenance }) => {
  if (!machine || !metrics) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'down': return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getHealthColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const daysUntilMaintenance = () => {
    if (!metrics.next_service_date) return null;
    const today = new Date();
    const nextService = new Date(metrics.next_service_date);
    const diffTime = nextService - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const maintenanceDaysLeft = daysUntilMaintenance();
  const isMaintenanceOverdue = maintenanceDaysLeft < 0;
  const isMaintenanceSoon = maintenanceDaysLeft <= 7;

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      {/* Header with Image & Status */}
      <CardHeader className="pb-2 sm:pb-3 relative">
        {/* Image - Hidden on very small screens */}
        <div className="hidden sm:block -mx-6 -mt-6 mb-3 h-32 sm:h-40 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden rounded-t-lg">
          {machine.image_url && (
            <ImageWithFallback
              src={machine.image_url}
              alt={machine.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between mb-2">
          <Badge className={`text-xs sm:text-sm font-semibold border ${getStatusColor(metrics.status)}`}>
            {metrics.status.charAt(0).toUpperCase() + metrics.status.slice(1)}
          </Badge>
          <span className="text-lg">
            {metrics.status === 'down' ? '🔴' : metrics.status === 'maintenance' ? '🟡' : '🟢'}
          </span>
        </div>

        {/* Machine Info */}
        <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2">
          {machine.name}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 font-mono">
          {machine.machine_code}
        </p>
      </CardHeader>

      {/* KPI Metrics - Responsive Grid */}
      <CardContent className="flex-1 flex flex-col gap-3 sm:gap-4">
        {/* KPI Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Health Score */}
          <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 font-medium">Health</p>
            <p className={`text-base sm:text-lg font-bold ${getHealthColor(metrics.health_score)}`}>
              {metrics.health_score}%
            </p>
          </div>

          {/* Availability */}
          <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 font-medium">Avail.</p>
            <p className="text-base sm:text-lg font-bold text-blue-600">
              {metrics.availability_percent}%
            </p>
          </div>

          {/* OEE Score */}
          <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 font-medium">OEE</p>
            <p className="text-base sm:text-lg font-bold text-purple-600">
              {metrics.oee_score}%
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 px-2 sm:px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-slate-600 flex-shrink-0" />
          <span className="text-xs sm:text-sm text-slate-700">
            {metrics.location_zone || 'N/A'}
          </span>
        </div>

        {/* Maintenance Alert */}
        {maintenanceDaysLeft && (
          <div className={`flex items-center gap-2 p-2 sm:p-3 rounded-lg border ${
            isMaintenanceOverdue 
              ? 'bg-red-50 border-red-200' 
              : isMaintenanceSoon 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            {isMaintenanceOverdue ? (
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            )}
            <span className={`text-xs sm:text-sm font-semibold ${
              isMaintenanceOverdue 
                ? 'text-red-800' 
                : isMaintenanceSoon 
                ? 'text-yellow-800' 
                : 'text-blue-800'
            }`}>
              {isMaintenanceOverdue
                ? 'Maintenance overdue'
                : `Due in ${maintenanceDaysLeft} days`}
            </span>
          </div>
        )}

        {/* Quick Actions - Full width on mobile, 2 columns on desktop */}
        <div className="grid grid-cols-2 gap-2 mt-auto pt-2 sm:pt-4">
          <Button
            size="sm"
            variant="default"
            onClick={() => onViewDetails(machine.id)}
            className="w-full text-xs sm:text-sm h-8 sm:h-10"
          >
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">Details</span>
            <span className="sm:hidden">View</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onScheduleMaintenance(machine.id)}
            className="w-full text-xs sm:text-sm h-8 sm:h-10"
          >
            <Wrench className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">Maintain</span>
            <span className="sm:hidden">Fix</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MachineCard;