
import React, { useState, useEffect } from 'react';
import { Settings, Search, Plus, List, Map, Trash2, Edit, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    machine_code: '', name: '', type: '', status: 'Running',
    building_id: '', warehouse_id: '', production_value_per_min: 30
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
          machine_code: '', name: '', type: '', status: 'Running',
          building_id: '', warehouse_id: '', production_value_per_min: 30
        });
      }
    }
  }, [open, editMachine]);

  const loadRefs = async () => {
    const [b, w] = await Promise.all([dbService.getBuildings(), dbService.getWarehouses()]);
    setBuildings(b.data || []);
    setWarehouses(w.data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMachine) {
        await dbService.updateMachine(editMachine.id, formData);
        toast({ title: "Updated", description: "Machine updated successfully." });
      } else {
        await dbService.createMachine(formData);
        toast({ title: "Created", description: "New machine registered." });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save machine." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] bg-white p-6 rounded-xl shadow-xl">
          <Dialog.Title className="text-lg font-bold mb-4">{editMachine ? 'Edit Machine' : 'Add Machine'}</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                   <label className="text-sm font-medium">Machine Name</label>
                   <input required className="w-full p-2 border rounded bg-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                   <label className="text-sm font-medium">Code</label>
                   <input required className="w-full p-2 border rounded bg-white" value={formData.machine_code} onChange={e => setFormData({...formData, machine_code: e.target.value})} />
                </div>
                <div>
                   <label className="text-sm font-medium">Type</label>
                   <input className="w-full p-2 border rounded bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} />
                </div>
                <div>
                   <label className="text-sm font-medium">Building</label>
                   <select className="w-full p-2 border rounded bg-white" value={formData.building_id} onChange={e => setFormData({...formData, building_id: e.target.value})}>
                      <option value="">Select...</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-sm font-medium">Warehouse</label>
                   <select className="w-full p-2 border rounded bg-white" value={formData.warehouse_id} onChange={e => setFormData({...formData, warehouse_id: e.target.value})}>
                      <option value="">Select...</option>
                      {warehouses.filter(w => !formData.building_id || w.building_id === Number(formData.building_id)).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-sm font-medium">Status</label>
                   <select className="w-full p-2 border rounded bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Running">Running</option>
                      <option value="Down">Down</option>
                      <option value="Maintenance">Maintenance</option>
                   </select>
                </div>
                <div>
                   <label className="text-sm font-medium">Prod. Value / Min (€)</label>
                   <input type="number" className="w-full p-2 border rounded bg-white" value={formData.production_value_per_min} onChange={e => setFormData({...formData, production_value_per_min: e.target.value})} />
                </div>
             </div>
             <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Machine'}</Button>
             </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

MachineForm.propTypes = { open: PropTypes.bool, onOpenChange: PropTypes.func, editMachine: PropTypes.object, onSuccess: PropTypes.func };

const Machines = () => {
  const [viewMode, setViewMode] = useState('list');
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  
  // Modal States
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [editingMachine, setEditingMachine] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  const { toast } = useToast();
  const pageSize = 50;

  useEffect(() => { loadData(); }, [page, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, count } = await dbService.getMachines(filters, page, pageSize);
      setMachines(data || []);
      setTotal(count || 0);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load machines" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dbService.deleteMachine(deleteId);
      toast({ title: "Deleted", description: "Machine removed" });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Delete failed" });
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
           <h1 className="text-3xl font-bold text-slate-800">Machine Registry</h1>
           <div className="flex gap-2">
              <Button variant="ghost" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
              <div className="bg-white border rounded p-1 flex">
                 <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-slate-100 text-teal-700' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
                 <button onClick={() => setViewMode('map')} className={`p-2 rounded ${viewMode === 'map' ? 'bg-slate-100 text-teal-700' : 'text-slate-400'}`}><Map className="w-4 h-4" /></button>
              </div>
              <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-2" /> Add Machine</Button>
           </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border flex gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input className="w-full pl-9 pr-4 py-2 border rounded bg-white" placeholder="Search machines..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
           </div>
           <select className="p-2 border rounded bg-white" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
              <option value="all">All Status</option>
              <option value="Running">Running</option>
              <option value="Down">Down</option>
           </select>
        </div>

        {loading ? <LoadingSpinner /> : (
           viewMode === 'list' ? (
             <div className="bg-white rounded-xl shadow border overflow-hidden">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                      <tr>
                         <th className="p-4">Code</th>
                         <th className="p-4">Name</th>
                         <th className="p-4">Location</th>
                         <th className="p-4 text-right">Total Maint. Cost</th>
                         <th className="p-4">Status</th>
                         <th className="p-4 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y">
                      {machines.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">No machines found.</td></tr> : 
                        machines.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50 group">
                             <td className="p-4 font-mono text-slate-600">{m.machine_code}</td>
                             <td className="p-4 font-medium text-slate-800">{m.name}</td>
                             <td className="p-4 text-slate-500">{m.building?.name || '-'} / {m.warehouse?.name || '-'}</td>
                             <td className="p-4 text-right font-bold text-slate-700">{formatCurrency(m.total_cost || 0)}</td>
                             <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${m.status === 'Running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                   {m.status}
                                </span>
                             </td>
                             <td className="p-4 text-right flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openDetails(m)} title="View Details">
                                   <Eye className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openEdit(m)} title="Edit">
                                   <Edit className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteId(m.id)} title="Delete">
                                   <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                                </Button>
                             </td>
                          </tr>
                        ))
                      }
                   </tbody>
                </table>
                <div className="p-4 border-t bg-slate-50 flex justify-between items-center text-sm">
                   <span>Page {page + 1}</span>
                   <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
                      <Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
                   </div>
                </div>
             </div>
           ) : (
             <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed">Map View Placeholder</div>
           )
        )}

        <MachineForm open={formOpen} onOpenChange={setFormOpen} editMachine={editingMachine} onSuccess={loadData} />
        
        <MachineDetailsModal open={detailsOpen} onOpenChange={setDetailsOpen} machine={selectedMachine} />

        <AlertDialog.Root open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
            <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-white p-6 rounded-lg shadow-xl">
              <AlertDialog.Title className="text-lg font-bold">Confirm Delete</AlertDialog.Title>
              <AlertDialog.Description className="my-4 text-slate-600">Permanently remove this machine? This will also remove all associated history.</AlertDialog.Description>
              <div className="flex justify-end gap-3">
                 <AlertDialog.Cancel asChild><Button variant="outline">Cancel</Button></AlertDialog.Cancel>
                 <AlertDialog.Action asChild><Button variant="destructive" onClick={handleDelete}>Delete</Button></AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </ErrorBoundary>
  );
};

export default Machines;
