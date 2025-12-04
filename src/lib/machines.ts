import { dbService } from './supabase';

export interface MachineMetrics {
  id: string;
  machine_id: string;
  availability_percent: number;
  mtbf_hours: number;
  mttr_hours: number;
  oee_score: number;
  health_score: number;
  status: 'operational' | 'maintenance' | 'down';
  location_zone: string;
  last_service_date: string;
  next_service_date: string;
  temperature_current: number;
  temperature_max: number;
  vibration_level: number;
  maintenance_cost_per_hour: number;
}

export interface MachineAlert {
  id: string;
  machine_id: string;
  alert_type: 'critical' | 'warning' | 'info';
  alert_title: string;
  alert_message: string;
  is_resolved: boolean;
  created_at: string;
}

// Calculate Overall Equipment Effectiveness (OEE)
export const calculateOEE = (
  availability: number,
  performance: number,
  quality: number
): number => {
  return Math.round((availability * performance * quality) / 10000 * 100 * 100) / 100;
};

// Get health score based on multiple factors
export const calculateHealthScore = (metrics: Partial<MachineMetrics>): number => {
  let score = 100;
  
  // Deduct points for poor metrics
  if (metrics.availability_percent && metrics.availability_percent < 90) {
    score -= (90 - metrics.availability_percent) * 0.5;
  }
  if (metrics.mtbf_hours && metrics.mtbf_hours < 1000) {
    score -= (1000 - metrics.mtbf_hours) / 100;
  }
  if (metrics.oee_score && metrics.oee_score < 80) {
    score -= (80 - metrics.oee_score) * 0.5;
  }
  if (metrics.temperature_current && metrics.temperature_max) {
    const tempPercent = (metrics.temperature_current / metrics.temperature_max) * 100;
    if (tempPercent > 90) {
      score -= (tempPercent - 90) * 0.2;
    }
  }
  
  return Math.max(0, Math.round(score * 100) / 100);
};

// Get health status badge
export const getHealthStatus = (score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' => {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'critical';
};

// Fetch machine metrics
export const fetchMachineMetrics = async (machineId: string): Promise<MachineMetrics | null> => {
  const { data, error } = await dbService.query(
    'machine_metrics',
    { machine_id: machineId }
  );
  
  if (error || !data || data.length === 0) return null;
  return data;
};

// Fetch performance history for charts
export const fetchPerformanceHistory = async (
  machineId: string,
  days: number = 30
): Promise<any[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await dbService.query(
    'machine_performance_history',
    { machine_id: machineId },
    { 
      order: 'date',
      date: { gte: startDate.toISOString().split('T') }
    }
  );
  
  return data || [];
};

// Fetch alerts for machine
export const fetchMachineAlerts = async (machineId: string): Promise<MachineAlert[]> => {
  const { data, error } = await dbService.query(
    'machine_alerts',
    { 
      machine_id: machineId,
      is_resolved: false
    }
  );
  
  return data || [];
};

// Fetch documentation
export const fetchMachineDocumentation = async (machineId: string): Promise<any[]> => {
  const { data, error } = await dbService.query(
    'machine_documentation',
    { machine_id: machineId }
  );
  
  return data || [];
};

// Generate performance report
export const generatePerformanceReport = (
  metrics: MachineMetrics,
  history: any[]
): {
  averageAvailability: number;
  availabilityTrend: 'up' | 'down' | 'stable';
  averageMTBF: number;
  averageMTTR: number;
  costPerHour: number;
} => {
  const validHistory = history.filter(h => h.availability_percent);
  
  if (validHistory.length === 0) {
    return {
      averageAvailability: metrics.availability_percent,
      availabilityTrend: 'stable',
      averageMTBF: metrics.mtbf_hours,
      averageMTTR: metrics.mttr_hours,
      costPerHour: metrics.maintenance_cost_per_hour,
    };
  }
  
  const availabilityValues = validHistory.map(h => h.availability_percent);
  const avgAvailability = availabilityValues.reduce((a, b) => a + b, 0) / availabilityValues.length;
  
  // Determine trend
  const firstHalf = availabilityValues.slice(0, Math.floor(availabilityValues.length / 2));
  const secondHalf = availabilityValues.slice(Math.floor(availabilityValues.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (secondAvg > firstAvg + 2) trend = 'up';
  if (secondAvg < firstAvg - 2) trend = 'down';
  
  return {
    averageAvailability: Math.round(avgAvailability * 100) / 100,
    availabilityTrend: trend,
    averageMTBF: Math.round(
      validHistory.reduce((sum, h) => sum + (h.mtbf_hours || 0), 0) / validHistory.length
    ),
    averageMTTR: Math.round(
      validHistory.reduce((sum, h) => sum + (h.mttr_hours || 0), 0) / validHistory.length * 100
    ) / 100,
    costPerHour: metrics.maintenance_cost_per_hour,
  };
};