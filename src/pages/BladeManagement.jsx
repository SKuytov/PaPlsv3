import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Plus, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  bladeService,
  bladeTypeService,
  bladeUsageService,
  bladeSharpeningService,
  bladeAlertService
} from '@/api/bladeService';
import BladeCatalog from '@/components/blade/BladeCatalog';
import BladeDetail from '@/components/blade/BladeDetail';
import BladeUsageTracker from '@/components/blade/BladeUsageTracker';
import BladeSharpeningLog from '@/components/blade/BladeSharpeningLog';
import BladeAlerts from '@/components/blade/BladeAlerts';
import NewBladeForm from '@/components/blade/NewBladeForm';

/**
 * Blade Management Page
 * Main interface for managing blade lifecycle, usage, sharpening, and alerts
 */
const BladeManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('catalog');
  const [blades, setBlades] = useState([]);
  const [bladeTypes, setBladeTypes] = useState([]);
  const [selectedBlade, setSelectedBlade] = useState(null);
  const [showNewBladeForm, setShowNewBladeForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    machineType: 'all'
  });
  const [alertSummary, setAlertSummary] = useState(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load blade types
      const types = await bladeTypeService.getAll();
      setBladeTypes(types);

      // Load blades
      const bladesData = await bladeService.getAll(filters.status === 'all' ? {} : { status: filters.status });
      setBlades(bladesData);

      // Load alert summary
      const alerts = await bladeAlertService.getAlertSummary();
      setAlertSummary(alerts);
    } catch (err) {
      console.error('Error loading blade data:', err);
      setError('Failed to load blade data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleBladeSelect = (blade) => {
    setSelectedBlade(blade);
    setActiveTab('detail');
  };

  const handleNewBladeCreated = (newBlade) => {
    setBlades([...blades, newBlade]);
    setShowNewBladeForm(false);
  };

  const handleBladeUpdated = (updatedBlade) => {
    setBlades(blades.map(b => b.id === updatedBlade.id ? updatedBlade : b));
    setSelectedBlade(updatedBlade);
  };

  const filteredBlades = blades.filter(blade => {
    const matchesSearch = blade.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (blade.blade_types?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blade Management System</h1>
          <p className="text-gray-600 mt-2">Track lifecycle, usage, and maintenance of cutting blades</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowNewBladeForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Blade
          </Button>
        </div>
      </div>

      {/* Alert Summary Cards */}
      {alertSummary && alertSummary.total_active > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900">Active Blade Alerts</h3>
            <p className="text-sm text-yellow-800 mt-1">
              {alertSummary.total_active} alerts require attention:
              {alertSummary.by_severity.critical > 0 && ` ${alertSummary.by_severity.critical} critical`}
              {alertSummary.by_severity.high > 0 && ` ${alertSummary.by_severity.high} high`}
              {alertSummary.by_severity.medium > 0 && ` ${alertSummary.by_severity.medium} medium`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('alerts')}>
            View Alerts
          </Button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* New Blade Form Modal */}
      {showNewBladeForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle>Register New Blade</CardTitle>
            <CardDescription>Create a new blade record with unique serial number</CardDescription>
          </CardHeader>
          <CardContent>
            <NewBladeForm
              bladeTypes={bladeTypes}
              onSuccess={handleNewBladeCreated}
              onCancel={() => setShowNewBladeForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="catalog">Blade Catalog</TabsTrigger>
          <TabsTrigger value="detail">Blade Details</TabsTrigger>
          <TabsTrigger value="usage">Usage Tracking</TabsTrigger>
          <TabsTrigger value="sharpening">Sharpening Log</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Blade Catalog Tab */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by serial number or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="active">Active</option>
              <option value="in_maintenance">In Maintenance</option>
              <option value="dull">Dull</option>
              <option value="damaged">Damaged</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          {loading ? (
            <div className="text-center py-12">Loading blades...</div>
          ) : (
            <BladeCatalog
              blades={filteredBlades}
              onBladeSelect={handleBladeSelect}
              loading={loading}
            />
          )}
        </TabsContent>

        {/* Blade Details Tab */}
        <TabsContent value="detail">
          {selectedBlade ? (
            <BladeDetail
              blade={selectedBlade}
              onBladeUpdated={handleBladeUpdated}
              onRefresh={loadData}
            />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600">
                Select a blade from the catalog to view details
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Usage Tracking Tab */}
        <TabsContent value="usage">
          {selectedBlade ? (
            <BladeUsageTracker
              blade={selectedBlade}
              onUsageLogged={() => loadData()}
            />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600">
                Select a blade to log usage
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sharpening Log Tab */}
        <TabsContent value="sharpening">
          {selectedBlade ? (
            <BladeSharpeningLog
              blade={selectedBlade}
              onSharpeningRecorded={() => loadData()}
            />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600">
                Select a blade to view sharpening history
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <BladeAlerts onAlertResolved={loadData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BladeManagement;
