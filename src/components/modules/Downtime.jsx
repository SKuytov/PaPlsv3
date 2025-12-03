import React, { useState, useEffect } from 'react';
import { TrendingDown, Plus, Calendar, Trash2, AlertTriangle, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dbService } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDuration } from '@/utils/calculations';
import { useAuth } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const Downtime = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [machines, setMachines] = useState([]);
  const [filterMachine, setFilterMachine] = useState('all');
  
  // Stats
  const [metrics, setMetrics] = useState({ totalEvents: 0, totalHours: 0, totalCost: 0, mtbf: 0, mttr: 0 });

  // Form Data
  const [formData, setFormData] = useState({
    machine_id: '',
    start_time: '',
    end_time: '',
    root_cause: '',
    downtime_cost: 0
  });

  useEffect(() => {
    loadData();
  }, [filterMachine]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [e, m] = await Promise.all([
        dbService.getDowntimeEvents(filterMachine !== 'all' ? { machine_id: filterMachine } : {}),
        dbService.getMachines()
      ]);
      
      const evData = e.data || [];
      setEvents(evData);
      setMachines(m.data || []);
      calculateMetrics(evData);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load downtime logs." });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (data) => {
    const totalEvents = data.length;
    const totalMinutes = data.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
    const totalCost = data.reduce((acc, curr) => acc + (curr.downtime_cost || 0), 0);
    
    // Simplified Metrics
    const mttr = totalEvents > 0 ? (totalMinutes / totalEvents).toFixed(1) : 0;
    // MTBF would require total operating time, approximating with standard 30 days * 24h
    const operatingMinutes = 30 * 24 * 60; 
    const mtbf = totalEvents > 0 ? ((operatingMinutes - totalMinutes) / totalEvents / 60).toFixed(1) : 0;

    setMetrics({
      totalEvents,
      totalHours: (totalMinutes / 60).toFixed(1),
      totalCost,
      mttr: `${mttr} min`,
      mtbf: `${mtbf} hrs`
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this downtime record?")) return;
    await dbService.deleteDowntimeEvent(id);
    loadData();
    toast({ title: "Deleted", description: "Record removed." });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.machine_id) return;
    
    const start = new Date(formData.start_time);
    const end = formData.end_time ? new Date(formData.end_time) : new Date();
    const duration = Math.max(0, Math.floor((end - start) / 60000)); // minutes
    
    const machine = machines.find(m => m.id === formData.machine_id);
    const rate = machine?.production_value_per_min || 30;
    const cost = duration * rate;

    try {
      await dbService.logDowntime({
        ...formData,
        duration_minutes: duration,
        downtime_cost: cost,
        technician_id: user?.id,
        created_at: new Date().toISOString()
      });
      toast({ title: "Logged", description: "Downtime recorded successfully." });
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to log downtime." });
    }
  };

  const openLogModal = () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60*60000);
    const toLocalISO = (d) => d.toISOString().slice(0, 16);

    setFormData({ 
      machine_id: '', 
      start_time: toLocalISO(oneHourAgo), 
      end_time: toLocalISO(now), 
      root_cause: '' 
    });
    setModalOpen(true);
  };

  if (loading && events.length === 0) return <LoadingSpinner message="Loading Downtime Logs..." />;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Downtime Log</h1>
            <p className="text-slate-600 mt-1">Track machine stoppages, MTTR, and cost impact</p>
          </div>
          <Button onClick={openLogModal} className="bg-red-600 hover:bg-red-700 shadow-md">
             <Plus className="w-4 h-4 mr-2" /> Log Event
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col justify-between">
              <span className="text-slate-500 text-xs uppercase tracking-wider">Total Events</span>
              <div className="flex items-center gap-2">
                 <AlertTriangle className="w-5 h-5 text-red-500" />
                 <span className="text-2xl font-bold text-slate-800">{metrics.totalEvents}</span>
              </div>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col justify-between">
              <span className="text-slate-500 text-xs uppercase tracking-wider">Downtime</span>
              <div className="flex items-center gap-2">
                 <Clock className="w-5 h-5 text-orange-500" />
                 <span className="text-2xl font-bold text-slate-800">{metrics.totalHours}h</span>
              </div>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col justify-between">
              <span className="text-slate-500 text-xs uppercase tracking-wider">Cost Impact</span>
              <div className="flex items-center gap-2">
                 <TrendingDown className="w-5 h-5 text-red-600" />
                 <span className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalCost)}</span>
              </div>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col justify-between">
              <span className="text-slate-500 text-xs uppercase tracking-wider">MTTR (Avg Repair)</span>
              <div className="flex items-center gap-2">
                 <span className="text-2xl font-bold text-blue-600">{metrics.mttr}</span>
              </div>
           </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border w-fit shadow-sm">
           <Filter className="w-4 h-4 text-slate-400 ml-2" />
           <select 
             className="p-2 bg-transparent outline-none text-sm font-medium text-slate-700 min-w-[200px]"
             value={filterMachine}
             onChange={(e) => setFilterMachine(e.target.value)}
           >
              <option value="all">All Machines</option>
              {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} - {m.name}</option>)}
           </select>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow border overflow-hidden">
           <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b">
                 <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Machine</th>
                    <th className="p-4">Root Cause</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Cost</th>
                    <th className="p-4">Tech</th>
                    <th className="p-4"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {events.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">No downtime events found.</td></tr>
                 ) : (
                    events.map(ev => (
                      <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                         <td className="p-4">
                            <div className="font-medium">{new Date(ev.start_time).toLocaleDateString()}</div>
                            <div className="text-xs text-slate-400">{new Date(ev.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                         </td>
                         <td className="p-4">
                            <div className="font-bold text-slate-700">{ev.machine?.machine_code}</div>
                            <div className="text-xs text-slate-500">{ev.machine?.name}</div>
                         </td>
                         <td className="p-4 max-w-xs truncate font-medium text-slate-800">{ev.root_cause}</td>
                         <td className="p-4">
                            <span className="inline-flex items-center px-2 py-1 rounded bg-orange-50 text-orange-700 font-medium text-xs border border-orange-100">
                               {formatDuration(ev.duration_minutes)}
                            </span>
                         </td>
                         <td className="p-4 font-mono text-red-600 font-medium">{formatCurrency(ev.downtime_cost)}</td>
                         <td className="p-4 text-slate-500 text-xs">{ev.technician?.full_name || 'Unknown'}</td>
                         <td className="p-4 text-right">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600" onClick={() => handleDelete(ev.id)}><Trash2 className="w-4 h-4" /></Button>
                         </td>
                      </tr>
                    ))
                 )}
              </tbody>
           </table>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
           <DialogContent>
              <DialogHeader><DialogTitle>Log Downtime Event</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                 <div>
                    <label className="text-sm font-medium text-slate-700">Machine Affected</label>
                    <select required className="w-full p-2 border rounded mt-1" value={formData.machine_id} onChange={e => setFormData({...formData, machine_id: e.target.value})}>
                       <option value="">Select Machine...</option>
                       {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} - {m.name}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-sm font-medium text-slate-700">Start Time</label>
                       <input required type="datetime-local" className="w-full p-2 border rounded mt-1" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-sm font-medium text-slate-700">End Time</label>
                       <input type="datetime-local" className="w-full p-2 border rounded mt-1" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                    </div>
                 </div>
                 <div>
                    <label className="text-sm font-medium text-slate-700">Root Cause / Reason</label>
                    <textarea required className="w-full p-2 border rounded mt-1" rows={3} value={formData.root_cause} onChange={e => setFormData({...formData, root_cause: e.target.value})} placeholder="Describe the failure..." />
                 </div>
                 <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-red-600 hover:bg-red-700">Save Log</Button>
                 </div>
              </form>
           </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
};

export default Downtime;