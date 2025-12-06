// src/pages/machines/index.jsx
// 🏭 Machines Management Page - Mobile Responsive
// Complete dashboard with grid, filters, modals, and factory map

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
  Plus, LayoutGrid, MapPin, TrendingUp, Menu, X
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
  const [viewMode, setViewMode] = useState('grid');
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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

      const { data: machinesData, error: machinesError } = await dbService.query('machines');
      if (machinesError) throw machinesError;
      setMachines(machinesData || []);

      const { data: metricsData, error: metricsError } = await dbService.query('machine_metrics');
      if (metricsError) throw metricsError;
      setMachineMetrics(metricsData || []);

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
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !machine.name.toLowerCase().includes(searchLower) &&
        !machine.machine_code?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    if (statusFilter !== 'all') {
      const metrics = machineMetrics.find(m => m.machine_id === machine.id);
      if (!metrics || metrics.status !== statusFilter) return false;
    }

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
        default:
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
      'Machine Name', 'Code', 'Status', 'Health Score', 'Availability %',
      'OEE %', 'MTBF (h)', 'MTTR (h)', 'Last Service', 'Next Service'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Machines</h1>
        <p className="text-xs sm:text-sm text-slate-600">Manage and monitor factory equipment</p>
      </div>

      {/* Statistics Cards - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[
          { label: 'Total', value: stats.total, icon: LayoutGrid },
          { label: 'Operational', value: stats.operational, color: 'text-green-600' },
          { label: 'Maintenance', value: stats.maintenance, color: 'text-yellow-600' },
          { label: 'Down', value: stats.down, color: 'text-red-600' },
          { label: 'Avg Health', value: `${stats.avgHealth}%`, color: 'text-blue-600' }
        ].map((stat, idx) => (
          <Card key={idx} className="col-span-1">
            <CardContent className="pt-4 sm:pt-6">
              <p className="text-xs sm:text-sm text-slate-600 font-medium">{stat.label}</p>
              <p className={`text-xl sm:text-2xl font-bold ${stat.color || 'text-slate-900'}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Error loading machines</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Controls - Mobile Responsive */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden"
            >
              {showMobileFilters ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className={`${showMobileFilters ? 'block' : 'hidden'} md:block space-y-3 sm:space-y-0 sm:flex sm:gap-3 sm:flex-wrap`}>
          {/* Search Input */}
          <div className="flex-1 min-w-full sm:min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search machines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex-1 min-w-full sm:min-w-[150px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="down">Down</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Health Filter */}
          <div className="flex-1 min-w-full sm:min-w-[150px]">
            <Select value={healthFilter} onValueChange={setHealthFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Health" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Health</SelectItem>
                <SelectItem value="excellent">Excellent (90%+)</SelectItem>
                <SelectItem value="good">Good (75-89%)</SelectItem>
                <SelectItem value="fair">Fair (60-74%)</SelectItem>
                <SelectItem value="poor">Poor (&lt;60%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode & Export */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="flex-1 sm:flex-initial"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Grid</span>
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="flex-1 sm:flex-initial"
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Map</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              className="flex-1 sm:flex-initial"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Export</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Tabs */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-4">
        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="space-y-4">
            {filteredMachines.length === 0 ? (
              <Card className="col-span-full text-center py-12">
                <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No machines found</p>
                <p className="text-xs sm:text-sm text-slate-500">Try adjusting your filters</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredMachines.map(machine => {
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
                })}
              </div>
            )}
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="min-h-[500px] sm:min-h-[600px] rounded-lg overflow-hidden border border-slate-200">
            {factoryMapUrl ? (
              <FactoryMapViewer
                mapImageUrl={factoryMapUrl}
                machines={filteredMachines}
                metrics={machineMetrics}
                selectedMachineId={selectedMachineId}
                onMachineSelect={setSelectedMachineId}
              />
            ) : (
              <Card className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">Factory map not configured</p>
                  <p className="text-xs sm:text-sm text-slate-500">Upload a factory floor plan in settings</p>
                </div>
              </Card>
            )}
          </div>
        )}
      </Tabs>

      {/* Machine Detail Modal */}
      <MachineDetailModal
        machine={selectedMachine}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </div>
  );
};

export default MachinesPage;