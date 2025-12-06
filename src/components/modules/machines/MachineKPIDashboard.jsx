import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Zap, Clock, AlertTriangle, Wrench, DollarSign, Activity, Gauge } from 'lucide-react';

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

  const kpis = [
    {
      icon: Activity,
      label: 'Health Score',
      value: `${metrics.health_score}%`,
      status: healthStatus.color,
      badge: healthStatus.label
    },
    {
      icon: Zap,
      label: 'Availability',
      value: `${metrics.availability_percent}%`,
      trend: metrics.availability_percent >= 90 ? 'up' : 'down'
    },
    {
      icon: TrendingUp,
      label: 'OEE Score',
      value: `${metrics.oee_score}%`,
      target: '85%+'
    },
    {
      icon: Clock,
      label: 'MTBF',
      value: `${metrics.mtbf_hours}h`,
      subtitle: 'Mean time between failures'
    },
    {
      icon: Wrench,
      label: 'MTTR',
      value: `${metrics.mttr_hours}h`,
      subtitle: 'Mean time to repair'
    },
    {
      icon: DollarSign,
      label: 'Maint. Cost/h',
      value: `€${Math.round(metrics.maintenance_cost_per_hour || 0)}`,
      subtitle: 'Cost per operational hour'
    },
    {
      icon: Gauge,
      label: 'Temperature',
      value: `${metrics.temperature_current}°C`,
      subtitle: `${Math.round((metrics.temperature_current / metrics.temperature_max) * 100)}% of max`
    },
    {
      icon: AlertTriangle,
      label: 'Vibration',
      value: 'ISO 10816',
      subtitle: `${metrics.vibration_level || 'N/A'} (Standard)`
    }
  ];

  return (
    <div className="w-full space-y-4">
      {/* Health Status Alert */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">Overall Health Status</p>
              <p className="text-2xl sm:text-3xl font-bold">{metrics.health_score}%</p>
            </div>
            <Badge className={healthStatus.color}>{healthStatus.label}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPI Grid - Responsive: 1 col mobile, 2 cols tablet, 4 cols desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="h-full">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-start justify-between mb-2">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 flex-shrink-0" />
                  {kpi.trend && (
                    kpi.trend === 'up'
                      ? <TrendingUp className="h-4 w-4 text-green-600" />
                      : <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mb-1">{kpi.label}</p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{kpi.value}</p>
                {kpi.target && <p className="text-xs text-slate-600">Target: {kpi.target}</p>}
                {kpi.subtitle && <p className="text-xs text-slate-600">{kpi.subtitle}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MachineKPIDashboard;