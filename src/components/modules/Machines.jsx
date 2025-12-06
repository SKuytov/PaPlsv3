// src/modules/admin/Machines.jsx
// 🏭 Machine Registry Management - Mobile Responsive
// Create, edit, delete, and manage machines with list and map views

import React, { useState, useEffect } from 'react';
import { Settings, Search, Plus, List, Map, Trash2, Edit, RefreshCw, Eye, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { dbService } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PropTypes from 'prop-types';
import { formatCurrency } from '@/utils/calculations';
import MachineDetailsModal from './machines/MachineDetailsModal';

// --- Machine Form Component (Create/Edit) ---
const MachineForm = ({ open, onOpenChange, editMachine, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [formData, setFormData] = useState({
    machine_code: '',
    name: '',
    type: '',
    status: 'Running',
    building_id: '',
    warehouse_id: '',
    production_value_per_min: 30
  });

  useEffect(() => {
    if (open) {
      loadRefs();
      if (editMachine) {
        setFormData({
          machine_code: editMachine.machine_code,
          name: editMachine.name,
          type: editMachine.type || '',
          status: editMachine.status || 'Running',
          building_id: editMachine.building_id || '',
          warehouse_id: editMachine.warehouse_id || '',
          production_value_per_min: editMachine.production_value_per_min || 30
        });
      } else {
        setFormData({
          machine_code: '',
          name: '',
          type: '',
          status: 'Running',
          building_id: '',
          warehouse_id: '',
          production_value_per_min: 30
        });
      }
    }
  }, [open, editMachine]);

  const loadRefs = async () => {
    const [b, w] = await Promise.all([
      dbService.getBuildings(),
      dbService.getWarehouses()
    ]);
    setBuildings(b.data || []);
    setWarehouses(w.data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMachine) {
        await dbService.updateMachine(editMachine.id, formData);
        toast({
          title: "Updated",
          description: "Machine updated successfully."
        });
      } else {
        await dbService.createMachine(formData);
        toast({
          title: "Created",
          description: "New machine registered."
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save machine."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-full max-w-2xl sm:max-w-3xl h-screen sm:h-auto sm:max-h-[90vh] overflow-y-auto p-3 sm:p-6 rounded-lg sm:rounded-2xl">
        <Dialog.Header className="pb-4 border-b">
          <Dialog.Title className="text-lg sm:text-2xl">
            {editMachine ? 'Edit Machine' : 'Add Machine'}
          </Dialog.Title>
        </Dialog.Header>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 py-4 sm:py-6">
          {/* Name & Code Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-900">
                Machine Name
              </label>
              <Input
                placeholder="Injector A-1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full text-xs sm:text-sm h-9 sm:h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-900">
                Code
              </label>
              <Input
                placeholder="MID-001"
                value={formData.machine_code}
                onChange={(e) => setFormData({ ...formData, machine_code: e.target.value })}
                required
                className="w-full text-xs sm:text-sm h-9 sm:h-10"
              />
            </div>
          </div>

          {/* Type & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-900">
                Type
              </label>
              <Input
                placeholder="Injection Molding"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full text-xs sm:text-sm h-9 sm:h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-900">
                Status
              </label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Running">Running</SelectItem>
                  <SelectItem value="Down">Down</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Building & Warehouse Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-900">
                Building
              </label>
              <Select value={formData.building_id} onValueChange={(value) => setFormData({ ...formData, building_id: value })}>
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-900">
                Warehouse
              </label>
              <Select value={formData.warehouse_id} onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}>
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter(w => !formData.building_id || w.building_id === Number(formData.building_id))
                    .map(w => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Production Value */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-semibold text-slate-900">
              Production Value / Min (€)
            </label>
            <Input
              type="number"
              placeholder="30"
              value={formData.production_value_per_min}
              onChange={(e) => setFormData({ ...formData, production_value_per_min: e.target.value })}
              className="w-full text-xs sm:text-sm h-9 sm:h-10"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
            >
              {loading ? 'Saving...' : 'Save Machine'}
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

MachineForm.propTypes = {
  open: PropTypes.bool,
  onOpenChange: PropTypes.func,
  editMachine: PropTypes.object,
  onSuccess: PropTypes.func
};

// --- Main Machines Component ---
const Machines = () => {
  const [viewMode, setViewMode] = useState('list');
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Modal States
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [editingMachine, setEditingMachine] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { toast } = useToast();
  const pageSize = 50;

  useEffect(() => {
    loadData();
  }, [page, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, count } = await dbService.getMachines(filters, page, pageSize);
      setMachines(data || []);
      setTotal(count || 0);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load machines"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dbService.deleteMachine(deleteId);
      toast({
        title: "Deleted",
        description: "Machine removed"
      });
      loadData();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Delete failed"
      });
    } finally {
      setDeleteId(null);
    }
  };

  const openCreate = () => {
    setEditingMachine(null);
    setFormOpen(true);
  };

  const openEdit = (machine) => {
    setEditingMachine(machine);
    setFormOpen(true);
  };

  const openDetails = (machine) => {
    setSelectedMachine(machine);
    setDetailsOpen(true);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 p-2 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Machine Registry</h1>
          <p className="text-xs sm:text-sm text-slate-600">Create, manage, and monitor all machines</p>
        </div>

        {/* Controls Card - Responsive */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base sm:text-lg">Controls</CardTitle>
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
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9 w-full text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-full sm:min-w-[150px]">
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Running">Running</SelectItem>
                  <SelectItem value="Down">Down</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">List</span>
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
                className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
              >
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Map</span>
              </Button>
              <Button
                onClick={openCreate}
                size="sm"
                className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Add</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Location</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Maint. Cost</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-600">
                        No machines found.
                      </td>
                    </tr>
                  ) : (
                    machines.map(m => (
                      <tr key={m.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-900">{m.machine_code}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{m.name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {m.building?.name || '-'} / {m.warehouse?.name || '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatCurrency(m.total_maintenance_cost || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              m.status === 'Running'
                                ? 'default'
                                : m.status === 'Down'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {m.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDetails(m)}
                              title="View Details"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(m)}
                              title="Edit"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteId(m.id)}
                              title="Delete"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {machines.length === 0 ? (
                <Card className="text-center py-8">
                  <p className="text-slate-600 font-medium text-sm">No machines found.</p>
                </Card>
              ) : (
                machines.map(m => (
                  <Card key={m.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-slate-900">{m.name}</h3>
                          <p className="text-xs text-slate-600 font-mono">{m.machine_code}</p>
                        </div>
                        <Badge
                          variant={
                            m.status === 'Running'
                              ? 'default'
                              : m.status === 'Down'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs flex-shrink-0"
                        >
                          {m.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-600 font-medium">Location</p>
                          <p className="text-slate-900 font-semibold">
                            {m.building?.name || '-'} / {m.warehouse?.name || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-600 font-medium">Maint. Cost</p>
                          <p className="text-slate-900 font-semibold">
                            {formatCurrency(m.total_maintenance_cost || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetails(m)}
                          className="flex-1 text-xs h-8"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(m)}
                          className="flex-1 text-xs h-8"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteId(m.id)}
                          className="flex-1 text-xs h-8"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Pagination - Responsive */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-4 border-t">
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Page {page + 1} of {Math.ceil(total / pageSize) || 1} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  className="text-xs h-9 sm:h-10"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize + machines.length >= total}
                  className="text-xs h-9 sm:h-10"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Card className="p-8 sm:p-12 text-center">
            <Map className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Map View Placeholder</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Interactive map view coming soon
            </p>
          </Card>
        )}

        {/* Dialogs */}
        <MachineForm
          open={formOpen}
          onOpenChange={setFormOpen}
          editMachine={editingMachine}
          onSuccess={loadData}
        />

        {selectedMachine && (
          <MachineDetailsModal
            machine={selectedMachine}
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog.Root open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialog.Content className="max-w-sm p-6 rounded-lg">
            <AlertDialog.Header className="mb-4">
              <AlertDialog.Title className="text-lg font-bold">Confirm Delete</AlertDialog.Title>
            </AlertDialog.Header>

            <p className="text-sm text-slate-700 mb-6">
              Permanently remove this machine? This will also remove all associated history.
            </p>

            <div className="flex gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline" className="flex-1 text-xs sm:text-sm h-9 sm:h-10">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>
    </ErrorBoundary>
  );
};

export default Machines;