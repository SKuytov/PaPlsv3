// src/pages/machines/index.jsx
// 🏭 Machines Management Page - Complete Dashboard
// Main entry point for machine management with grid, filters, and modals

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Settings, Download, AlertTriangle,
  Plus, LayoutGrid, MapPin, TrendingUp
} from 'lucide-react';
import { dbService } from '@/lib/supabase';
import MachineCard from '@/components/machines/MachineCard';
import MachineDetailModal from '@/components/machines/MachineDetailModal';
import FactoryMapViewer from '@/components/machines/FactoryMapViewer';
import { fetchMachineMetrics } from '@/lib/machines';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const MachinesPage = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const isGodAdmin = userRole?.name === 'God Admin';

  // State Management
  const [machines, setMachines] = useState([]);
  const [machineMetrics, setMachineMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & View State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or map
  const [selectedMachineId, setSelectedMachineId] = useState(null);

  // Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);

  // Factory Map State
  const [factoryMapUrl, setFactoryMapUrl] = useState(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch machines
      const { data: machinesData, error: machinesError } = await dbService.query('machines');
      if (machinesError) throw machinesError;
      setMachines(machinesData || []);

      // Fetch metrics for all machines
      const { data: metricsData, error: metricsError } = await dbService.query('machine_metrics');
      if (metricsError) throw metricsError;
      setMachineMetrics(metricsData || []);

      // Fetch factory map URL from settings
      const { data: settingsData } = await dbService.query('app_settings', {
        key: 'factory_map_url'
      });
      if (settingsData && settingsData.length > 0) {
        setFactoryMapUrl(settingsData[0].value);
      }

      toast({
        title: 'Success',
        description: `Loaded ${machinesData?.length || 0} machines`
      });
    } catch (err) {
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load machines'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter machines
  const filteredMachines = machines.filter((machine) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !machine.name.toLowerCase().includes(searchLower) &&
        !machine.machine_code?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      const metrics = machineMetrics.find(m => m.machine_id === machine.id);
      if (!metrics || metrics.status !== statusFilter) return false;
    }

    // Health filter
    if (healthFilter !== 'all') {
      const metrics = machineMetrics.find(m => m.machine_id === machine.id);
      if (!metrics) return false;

      const score = metrics.health_score;
      switch (healthFilter) {
        case 'excellent':
          if (score < 90) return false;
          break;
        case 'good':
          if (score < 75 || score >= 90) return false;
          break;
        case 'fair':
          if (score < 60 || score >= 75) return false;
          break;
        case 'poor':
          if (score >= 60) return false;
          break;
      }
    }

    return true;
  });

  // Handlers
  const handleViewDetails = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    setSelectedMachine(machine);
    setDetailModalOpen(true);
  };

  const handleScheduleMaintenance = (machineId) => {
    // TODO: Implement maintenance scheduling modal
    toast({
      title: 'Feature Coming Soon',
      description: 'Maintenance scheduling will be available in the next update'
    });
  };

  const handleExportData = () => {
    try {
      const csv = generateCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `machines-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: 'Export Successful',
        description: 'Machines report has been downloaded'
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: err.message
      });
    }
  };

  const generateCSV = () => {
    const headers = [
      'Machine Name',
      'Code',
      'Status',
      'Health Score',
      'Availability %',
      'OEE %',
      'MTBF (h)',
      'MTTR (h)',
      'Last Service',
      'Next Service'
    ];

    const rows = filteredMachines.map(machine => {
      const metrics = machineMetrics.find(m => m.machine_id === machine.id);
      return [
        machine.name,
        machine.machine_code,
        metrics?.status || 'N/A',
        metrics?.health_score || 'N/A',
        metrics?.availability_percent || 'N/A',
        metrics?.oee_score || 'N/A',
        metrics?.mtbf_hours || 'N/A',
        metrics?.mttr_hours || 'N/A',
        metrics?.last_service_date ? new Date(metrics.last_service_date).toLocaleDateString() : 'N/A',
        metrics?.next_service_date ? new Date(metrics.next_service_date).toLocaleDateString() : 'N/A'
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  };

  // Statistics
  const stats = {
    total: machines.length,
    operational: machineMetrics.filter(m => m.status === 'operational').length,
    maintenance: machineMetrics.filter(m => m.status === 'maintenance').length,
    down: machineMetrics.filter(m => m.status === 'down').length,
    avgHealth: machines.length > 0
      ? Math.round(
          machineMetrics.reduce((sum, m) => sum + (m.health_score || 0), 0) /
          Math.max(1, machineMetrics.length)
        )
      : 0
  };

  if (loading) return <LoadingSpinner message="Loading machines..." />;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Machines</h1>
          <p className="text-slate-600 mt-1">Manage and monitor factory equipment</p>
        </div>
        {isGodAdmin && (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Machine
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Operational</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.operational}</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Down</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{stats.down}</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Avg Health</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.avgHealth}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search & View Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search machines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  onClick={() => setViewMode('grid')}
                  className="gap-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Grid
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'map' ? 'default' : 'outline'}
                  onClick={() => setViewMode('map')}
                  className="gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Map
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportData}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="down">Down</SelectItem>
                </SelectContent>
              </Select>

              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Filter by Health" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health</SelectItem>
                  <SelectItem value="excellent">Excellent (90%+)</SelectItem>
                  <SelectItem value="good">Good (75-89%)</SelectItem>
                  <SelectItem value="fair">Fair (60-74%)</SelectItem>
                  <SelectItem value="poor">Poor (&lt;60%)</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-sm text-slate-600 flex items-center">
                Showing {filteredMachines.length} of {machines.length} machines
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Grid or Map View */}
      {error ? (
        <Card className="bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error loading machines</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMachines.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="pt-6 text-center">
                <p className="text-slate-500">No machines found</p>
              </CardContent>
            </Card>
          ) : (
            filteredMachines.map((machine) => {
              const metrics = machineMetrics.find(m => m.machine_id === machine.id);
              return (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  metrics={metrics}
                  onViewDetails={handleViewDetails}
                  onScheduleMaintenance={handleScheduleMaintenance}
                />
              );
            })
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {factoryMapUrl ? (
              <FactoryMapViewer
                mapImageUrl={factoryMapUrl}
                machines={filteredMachines}
                metrics={machineMetrics}
                selectedMachineId={selectedMachineId}
                onMachineSelect={setSelectedMachineId}
              />
            ) : (
              <div className="text-center py-12 text-slate-500">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Factory map not configured</p>
                <p className="text-sm mt-1">Upload a factory floor plan in settings</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      {selectedMachine && (
        <MachineDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          machine={selectedMachine}
          metrics={machineMetrics.find(m => m.machine_id === selectedMachine.id)}
        />
      )}
    </div>
  );
};

export default MachinesPage;