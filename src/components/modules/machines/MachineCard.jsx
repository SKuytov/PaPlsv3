// src/components/machines/MachineCard.jsx
// 📊 Machine Card Component - Grid View Display
// Shows machine summary with KPIs and quick actions

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, TrendingUp, Clock, Zap, MapPin,
  MoreVertical, Eye, Wrench, AlertCircle
} from 'lucide-react';
import ImageWithFallback from '@/components/common/ImageWithFallback';

const MachineCard = ({ machine, metrics, onViewDetails, onScheduleMaintenance }) => {
  if (!machine || !metrics) return null;

  // Determine status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'down': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  // Health score color
  const getHealthColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
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
    <Card className="hover:shadow-lg transition-shadow bg-white h-full flex flex-col">
      {/* Header with Image & Status */}
      <div className="relative h-32 bg-gradient-to-r from-slate-200 to-slate-100 overflow-hidden">
        <ImageWithFallback
          src={machine.photo_url}
          alt={machine.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <Badge className={getStatusColor(metrics.status)} variant="outline">
            {metrics.status === 'down' ? '🔴' : metrics.status === 'maintenance' ? '🟡' : '🟢'}
            {metrics.status.charAt(0).toUpperCase() + metrics.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Machine Info */}
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-sm line-clamp-2">
              {machine.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {machine.machine_code}
            </p>
          </div>
        </div>
      </CardHeader>

      {/* KPI Metrics */}
      <CardContent className="flex-1 space-y-3">
        {/* Health Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-600">Health</span>
          </div>
          <div className={`font-bold text-sm ${getHealthColor(metrics.health_score)}`}>
            {metrics.health_score}%
          </div>
        </div>

        {/* Availability */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-600">Availability</span>
          </div>
          <span className="text-xs font-semibold">{metrics.availability_percent}%</span>
        </div>

        {/* OEE Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-600">OEE</span>
          </div>
          <span className="text-xs font-semibold">{metrics.oee_score}%</span>
        </div>

        {/* Location */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-600">Zone</span>
          </div>
          <span className="text-xs font-semibold text-slate-700">
            {metrics.location_zone || 'N/A'}
          </span>
        </div>

        {/* Maintenance Alert */}
        {maintenanceDaysLeft && (
          <div className={`p-2 rounded text-xs font-medium ${
            isMaintenanceOverdue
              ? 'bg-red-50 text-red-700'
              : isMaintenanceSoon
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-blue-50 text-blue-700'
          }`}>
            {isMaintenanceOverdue ? (
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Maintenance overdue
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due in {maintenanceDaysLeft} days
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Quick Actions */}
      <div className="border-t p-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8"
          onClick={() => onViewDetails(machine.id)}
        >
          <Eye className="w-3 h-3 mr-1" />
          <span className="hidden sm:inline">Details</span>
        </Button>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 h-8"
          onClick={() => onScheduleMaintenance(machine.id)}
        >
          <Wrench className="w-3 h-3 mr-1" />
          <span className="hidden sm:inline">Maintain</span>
        </Button>
      </div>
    </Card>
  );
};

export default MachineCard;