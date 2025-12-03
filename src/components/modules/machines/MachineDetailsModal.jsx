
import React, { useState, useEffect } from 'react';
import { 
  X, Wrench, Activity, DollarSign, Calendar, 
  BarChart3, AlertTriangle, Box
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dbService } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/utils/calculations';
import { Badge } from '@/components/ui/badge';

const MachineDetailsModal = ({ machine, open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [stats, setStats] = useState({
    totalParts: 0,
    uniqueParts: 0,
    lastMaintenance: null
  });

  useEffect(() => {
    if (open && machine?.id) {
      loadTransactions();
    }
  }, [open, machine]);

  const loadTransactions = async () => {
    setLoadingTx(true);
    try {
      const { data } = await dbService.getMachineTransactions(machine.id);
      if (data) {
        setTransactions(data);
        
        // Calculate derived stats
        const totalParts = data.reduce((acc, tx) => acc + Math.abs(tx.quantity), 0);
        const uniqueParts = new Set(data.map(tx => tx.part_id)).size;
        const lastMaintenance = data.length > 0 ? data[0].created_at : null;

        setStats({ totalParts, uniqueParts, lastMaintenance });
      }
    } catch (error) {
      console.error("Failed to load machine history", error);
    } finally {
      setLoadingTx(false);
    }
  };

  if (!machine) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{machine.name}</h2>
                <Badge variant={machine.status === 'Running' ? 'default' : 'destructive'} className="capitalize">
                   {machine.status}
                </Badge>
              </div>
              <div className="flex gap-4 text-slate-300 text-sm font-mono">
                <span>{machine.machine_code}</span>
                <span>•</span>
                <span>{machine.building?.name}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs & Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            <div className="bg-white border-b px-6 pt-2">
              <TabsList className="bg-transparent p-0 h-auto gap-6">
                <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Overview</TabsTrigger>
                <TabsTrigger value="maintenance" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Maintenance Cost</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Total Maintenance Cost</CardTitle></CardHeader>
                        <CardContent>
                           <div className="text-2xl font-bold text-slate-800">{formatCurrency(machine.total_cost || 0)}</div>
                        </CardContent>
                     </Card>
                     <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Parts Replaced</CardTitle></CardHeader>
                        <CardContent>
                           <div className="text-2xl font-bold text-slate-800">{stats.totalParts}</div>
                           <p className="text-xs text-slate-500">{stats.uniqueParts} unique items</p>
                        </CardContent>
                     </Card>
                     <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Last Activity</CardTitle></CardHeader>
                        <CardContent>
                           <div className="text-lg font-bold text-slate-800">
                              {stats.lastMaintenance ? new Date(stats.lastMaintenance).toLocaleDateString() : 'N/A'}
                           </div>
                           <p className="text-xs text-slate-500">Latest part replacement</p>
                        </CardContent>
                     </Card>
                  </div>

                  <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Wrench className="w-5 h-5 text-blue-600" /> Technical Specs
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="grid grid-cols-2 gap-y-4">
                        <div>
                           <span className="block text-xs font-semibold text-slate-500 uppercase">Type</span>
                           <span className="text-sm font-medium">{machine.type || 'N/A'}</span>
                        </div>
                        <div>
                           <span className="block text-xs font-semibold text-slate-500 uppercase">Manufacturer</span>
                           <span className="text-sm font-medium">{machine.manufacturer || 'N/A'}</span>
                        </div>
                        <div>
                           <span className="block text-xs font-semibold text-slate-500 uppercase">Production Rate</span>
                           <span className="text-sm font-medium">{machine.production_value_per_min ? `€${machine.production_value_per_min}/min` : 'N/A'}</span>
                        </div>
                        <div>
                           <span className="block text-xs font-semibold text-slate-500 uppercase">Capacity</span>
                           <span className="text-sm font-medium">{machine.capacity || 'N/A'}</span>
                        </div>
                     </CardContent>
                  </Card>
                </TabsContent>

                {/* Maintenance Cost Tab */}
                <TabsContent value="maintenance" className="mt-0">
                   <Card>
                      <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" /> Cost Breakdown
                         </CardTitle>
                      </CardHeader>
                      <CardContent>
                         {loadingTx ? <LoadingSpinner message="Analyzing costs..." /> : (
                           <div className="rounded-md border">
                              <table className="w-full text-sm text-left">
                                 <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                       <th className="p-3">Date</th>
                                       <th className="p-3">Part Used</th>
                                       <th className="p-3 text-right">Qty</th>
                                       <th className="p-3 text-right">Unit Cost</th>
                                       <th className="p-3 text-right">Total</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y">
                                    {transactions.length === 0 ? (
                                       <tr><td colSpan={5} className="p-6 text-center text-slate-400">No maintenance records found.</td></tr>
                                    ) : (
                                       transactions.map(tx => {
                                          const total = Math.abs(tx.quantity) * (tx.unit_cost || 0);
                                          return (
                                             <tr key={tx.id} className="hover:bg-slate-50">
                                                <td className="p-3 text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                                                <td className="p-3">
                                                   <div className="font-medium text-slate-800">{tx.part?.name || 'Unknown Part'}</div>
                                                   <div className="text-xs text-slate-400 font-mono">{tx.part?.part_number}</div>
                                                </td>
                                                <td className="p-3 text-right">{Math.abs(tx.quantity)}</td>
                                                <td className="p-3 text-right text-slate-500">{formatCurrency(tx.unit_cost)}</td>
                                                <td className="p-3 text-right font-bold text-slate-700">{formatCurrency(total)}</td>
                                             </tr>
                                          );
                                       })
                                    )}
                                 </tbody>
                                 {transactions.length > 0 && (
                                    <tfoot className="bg-slate-50 font-bold border-t">
                                       <tr>
                                          <td colSpan={4} className="p-3 text-right">Total Maintenance Cost:</td>
                                          <td className="p-3 text-right text-blue-600">{formatCurrency(machine.total_cost)}</td>
                                       </tr>
                                    </tfoot>
                                 )}
                              </table>
                           </div>
                         )}
                      </CardContent>
                   </Card>
                </TabsContent>

              </div>
            </ScrollArea>

            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Close Details</Button>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MachineDetailsModal;
