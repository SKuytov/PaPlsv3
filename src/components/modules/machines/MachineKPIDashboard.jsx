// src/components/machines/MachineKPIDashboard.jsx
// 📈 KPI Dashboard - Comprehensive Metrics Overview
// Displays all critical metrics for the selected machine

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, Zap, Clock, AlertTriangle,
  Wrench, DollarSign, Activity, Gauge
} from 'lucide-react';

const MachineKPIDashboard = ({ metrics, machine }) => {
  if (!metrics) return null;

  const getHealthStatus = (score) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 75) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (score >= 60) return { label: 'Fair', color: 'bg-yellow-100 text-yellow-800' };
    if (score >= 40) return { label: 'Poor', color: 'bg-orange-100 text-orange-800' };
    return { label: 'Critical', color: 'bg-red-100 text-red-800' };
  };

  const healthStatus = getHealthStatus(metrics.health_score);

  return (
    <div className="space-y-6">
      {/* Top Row - Critical Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Health Score */}
        <Card className="bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-900">
                  {metrics.health_score}%
                </div>
                <Badge className={healthStatus.color} variant="outline" className="mt-2">
                  {healthStatus.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {metrics.availability_percent}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Operational time</p>
          </CardContent>
        </Card>

        {/* OEE Score */}
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              OEE Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {metrics.oee_score}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Overall effectiveness</p>
          </CardContent>
        </Card>

        {/* Planned Maintenance % */}
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Planned Maint.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {metrics.planned_maintenance_percent}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Target: 85%+</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row - Reliability Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MTBF - Mean Time Between Failures */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              MTBF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-slate-900">
                {metrics.mtbf_hours}h
              </div>
              <p className="text-xs text-slate-600">
                Mean time between failures
              </p>
              <div className="pt-2 flex items-center gap-2">
                <div className="text-xs font-medium">Industry avg: 2,000h</div>
                {metrics.mtbf_hours > 2000 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MTTR - Mean Time To Repair */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              MTTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-slate-900">
                {metrics.mttr_hours}h
              </div>
              <p className="text-xs text-slate-600">
                Mean time to repair
              </p>
              <div className="pt-2 flex items-center gap-2">
                <div className="text-xs font-medium">Target: &lt;4h</div>
                {metrics.mttr_hours < 4 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Per Hour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Cost/Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-slate-900">
                €{metrics.maintenance_cost_per_hour.toFixed(2)}
              </div>
              <p className="text-xs text-slate-600">
                Maintenance cost per hour
              </p>
              <div className="pt-2">
                <div className="text-xs font-medium">
                  Total: €{(metrics.total_maintenance_cost || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Sensor Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Temperature */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Current</span>
                <span className="text-lg font-bold text-slate-900">
                  {metrics.temperature_current || 'N/A'}°C
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Maximum</span>
                <span className="text-lg font-bold text-slate-900">
                  {metrics.temperature_max || 'N/A'}°C
                </span>
              </div>
              {metrics.temperature_current && metrics.temperature_max && (
                <div className="mt-2">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        (metrics.temperature_current / metrics.temperature_max) > 0.9
                          ? 'bg-red-500'
                          : (metrics.temperature_current / metrics.temperature_max) > 0.7
                          ? 'bg-orange-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${(metrics.temperature_current / metrics.temperature_max) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {Math.round((metrics.temperature_current / metrics.temperature_max) * 100)}% of max
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vibration Level */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Vibration Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-3xl font-bold text-slate-900">
                {metrics.vibration_level || 'N/A'} mm/s
              </div>
              <div className="pt-2">
                {metrics.vibration_level && (
                  <div>
                    {metrics.vibration_level > 7.1 ? (
                      <Badge className="bg-red-100 text-red-800">High - Investigate</Badge>
                    ) : metrics.vibration_level > 4.5 ? (
                      <Badge className="bg-yellow-100 text-yellow-800">Medium - Monitor</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Normal</Badge>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-2">
                ISO 10816 Standard
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MachineKPIDashboard;