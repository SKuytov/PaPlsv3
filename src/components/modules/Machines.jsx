// src/modules/admin/Machines.jsx
// 🏭 Machine Registry Management - Mobile Responsive (FIXED)
// Create, edit, delete, and manage machines with list and map views

import React, { useState, useEffect } from 'react';
import { Settings, Search, Plus, List, Map, Trash2, Edit, RefreshCw, Eye, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <Dialog.Content className="w-full h-screen sm:h-auto sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-lg overflow-y-auto sm:max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b">
              <Dialog.Title className="text-lg sm:text-xl font-bold text-slate-900">
                {editMachine ? 'Edit Machine' : 'Add Machine'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Name & Code Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                    Machine Name
                  </label>
                  <Input
                    placeholder="Injector A-1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                    Code
                  </label>
                  <Input
                    placeholder="MID-001"
                    value={formData.machine_code}
                    onChange={(e) => setFormData({ ...formData, machine_code: e.target.value })}
                    required
                    className="w-full text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Type & Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                    Type
                  </label>
                  <Input
                    placeholder="Injection Molding"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Running">Running</option>
                    <option value="Down">Down</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              {/* Building & Warehouse Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                    Building
                  </label>
                  <select
                    value={formData.building_id}
                    onChange={(e) => setFormData({ ...formData, building_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select...</option>
                    {buildings.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                    Warehouse
                  </label>
                  <select
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select...</option>
                    {warehouses
                      .filter(w => !formData.building_id || w.building_id === Number(formData.building_id))
                      .map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Production Value */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                  Production Value / Min (€)
                </label>
                <Input
                  type="number"
                  placeholder="30"
                  value={formData.production_value_per_min}
                  onChange={(e) => setFormData({ ...formData, production_value_per_min: e.target.value })}
                  className="w-full text-xs sm:text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 sm:pt-6 border-t">
                <Dialog.Close asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 text-xs sm:text-sm"
                >
                  {loading ? 'Saving...' : 'Save Machine'}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
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
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-0">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Controls</h2>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {showMobileFilters ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          <div className={`${showMobileFilters ? 'block' : 'hidden'} md:flex gap-2 md:gap-3 flex-wrap items-center`}>
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
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Status</option>
                <option value="Running">Running</option>
                <option value="Down">Down</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 md:flex-initial px-3 py-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <List className="h-4 w-4 md:mr-2 mx-auto md:mx-0" />
                <span className="hidden md:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex-1 md:flex-initial px-3 py-2 rounded-lg transition-colors ${
                  viewMode === 'map'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Map className="h-4 w-4 md:mr-2 mx-auto md:mx-0" />
                <span className="hidden md:inline">Map</span>
              </button>
              <button
                onClick={openCreate}
                className="flex-1 md:flex-initial px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="h-4 w-4 md:mr-2 mx-auto md:mx-0" />
                <span className="hidden md:inline">Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 bg-white">
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
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            m.status === 'Running'
                              ? 'bg-green-100 text-green-800'
                              : m.status === 'Down'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => openDetails(m)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEdit(m)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(m.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
                <div className="bg-white rounded-lg p-6 text-center border border-slate-200">
                  <p className="text-slate-600 font-medium text-sm">No machines found.</p>
                </div>
              ) : (
                machines.map(m => (
                  <div key={m.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-900">{m.name}</h3>
                        <p className="text-xs text-slate-600 font-mono">{m.machine_code}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                        m.status === 'Running'
                          ? 'bg-green-100 text-green-800'
                          : m.status === 'Down'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
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
                      <button
                        onClick={() => openDetails(m)}
                        className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-semibold"
                      >
                        <Eye className="h-3 w-3 inline mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => openEdit(m)}
                        className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-semibold"
                      >
                        <Edit className="h-3 w-3 inline mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(m.id)}
                        className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-semibold"
                      >
                        <Trash2 className="h-3 w-3 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination - Responsive */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-4 border-t bg-white rounded-lg p-4">
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Page {page + 1} of {Math.ceil(total / pageSize) || 1} ({total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-semibold"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize + machines.length >= total}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-8 sm:p-12 text-center border border-slate-200">
            <Map className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Map View Placeholder</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Interactive map view coming soon
            </p>
          </div>
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
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <AlertDialog.Content className="bg-white rounded-2xl p-6 shadow-lg max-w-sm w-full mx-4">
                <AlertDialog.Title className="text-lg font-bold text-slate-900 mb-2">
                  Confirm Delete
                </AlertDialog.Title>
                <AlertDialog.Description className="text-sm text-slate-700 mb-6">
                  Permanently remove this machine? This will also remove all associated history.
                </AlertDialog.Description>

                <div className="flex gap-2">
                  <AlertDialog.Cancel asChild>
                    <button className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-xs sm:text-sm">
                      Cancel
                    </button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <button
                      onClick={handleDelete}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-xs sm:text-sm"
                    >
                      Delete
                    </button>
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </div>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </ErrorBoundary>
  );
};

export default Machines;