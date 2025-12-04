import React, { useState, useEffect } from 'react';
import {
  Box, Wrench, History, AlertTriangle,
  Trash2, Ruler, MapPin, FileText, Pencil, Users, Monitor,
  Plus, Save, DollarSign, X, Search, Check, Link as LinkIcon, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { dbService } from '@/lib/supabase';
import { getStockStatus } from '@/utils/calculations';
import StatusBadge from '@/components/common/StatusBadge';
import ImageWithFallback from '@/components/common/ImageWithFallback';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/calculations';
import TransactionDetailsModal from '@/components/modules/machines/TransactionDetailsModal';

const PartDetailsModal = ({ part: initialPart, onClose, onDeleteRequest, onEditRequest }) => {
  const [part, setPart] = useState(initialPart);
  const [activeTab, setActiveTab] = useState('info');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [loadingFullDetails, setLoadingFullDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetailsOpen, setTransactionDetailsOpen] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();
  const isGodAdmin = userRole?.name === 'God Admin';

  // Linking State
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [isAddingMachine, setIsAddingMachine] = useState(false);
  const [availableSuppliers, setAvailableSuppliers] = useState([]);
  const [availableMachines, setAvailableMachines] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Search State for Dropdowns
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [machineSearchTerm, setMachineSearchTerm] = useState('');

  // Forms
  const [newSupplier, setNewSupplier] = useState({ supplier_id: '', unit_price: '', lead_time_days: '', is_preferred: false });
  const [newMachine, setNewMachine] = useState({ machine_id: '', usage_frequency: 'On Demand' });

  useEffect(() => {
    if (initialPart?.id) {
      setPart(initialPart);
      loadFullData();
    }
  }, [initialPart]);

  const loadFullData = async () => {
    if (!initialPart?.id) return;
    setLoadingFullDetails(true);
    const { data, error } = await dbService.getPartDetails(initialPart.id);
    if (data && !error) {
      setPart(data);
    }
    setLoadingFullDetails(false);
  };

  // Tab Switching Logic
  useEffect(() => {
    if (part && activeTab === 'history') {
      fetchHistory();
    }
    if (activeTab === 'suppliers' && isAddingSupplier && availableSuppliers.length === 0) {
      fetchSuppliers();
    }
    if (activeTab === 'machines' && isAddingMachine && availableMachines.length === 0) {
      fetchMachines();
    }
  }, [part, activeTab, isAddingSupplier, isAddingMachine]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    const { data, error } = await dbService.getPartTransactions(part.id);
    if (error) {
      setHistoryError("Failed to load transaction history.");
    } else {
      setHistory(data || []);
    }
    setLoadingHistory(false);
  };

  const fetchSuppliers = async () => {
    setLoadingOptions(true);
    const { data } = await dbService.getSuppliers();
    if (data) setAvailableSuppliers(data);
    setLoadingOptions(false);
  };

  const fetchMachines = async () => {
    setLoadingOptions(true);
    const { data } = await dbService.getMachines({}, 0, 1000); // Fetch all
    if (data) setAvailableMachines(data);
    setLoadingOptions(false);
  };

  // --- Actions ---
  const handleAddSupplier = async () => {
    if (!isGodAdmin) return;
    if (!newSupplier.supplier_id || !newSupplier.unit_price) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please select a supplier and enter a price." });
      return;
    }
    try {
      const { error } = await dbService.addPartSupplier({
        part_id: part.id,
        ...newSupplier
      });
      if (error) throw error;
      toast({ title: "Supplier Linked", description: "Successfully added supplier to part." });
      setNewSupplier({ supplier_id: '', unit_price: '', lead_time_days: '', is_preferred: false });
      setIsAddingSupplier(false);
      loadFullData(); // Reload
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleRemoveSupplier = async (supplierOptionId) => {
    if (!isGodAdmin) return;
    if (confirm("Remove this supplier link?")) {
      const { error } = await dbService.removePartSupplier(supplierOptionId);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      } else {
        loadFullData();
      }
    }
  };

  const handleAddMachine = async () => {
    if (!isGodAdmin) return;
    if (!newMachine.machine_id) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please select a machine." });
      return;
    }
    try {
      const { error } = await dbService.addPartMachine({
        part_id: part.id,
        ...newMachine
      });
      if (error) throw error;
      toast({ title: "Machine Linked", description: "Successfully linked machine to part." });
      setNewMachine({ machine_id: '', usage_frequency: 'On Demand' });
      setIsAddingMachine(false);
      loadFullData(); // Reload
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleRemoveMachine = async (machineAssocId) => {
    if (!isGodAdmin) return;
    if (confirm("Remove this machine link?")) {
      const { error } = await dbService.removePartMachine(machineAssocId);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      } else {
        loadFullData();
      }
    }
  };

  const handleDeletePart = async () => {
    if (!isGodAdmin) return;
    if (confirm("Are you sure you want to delete this part? This cannot be undone.")) {
      onDeleteRequest?.(part.id);
    }
  };

  // Filtered lists for search
  const filteredSuppliers = availableSuppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  const filteredMachines = availableMachines.filter(m =>
    m.name.toLowerCase().includes(machineSearchTerm.toLowerCase()) ||
    m.machine_code.toLowerCase().includes(machineSearchTerm.toLowerCase())
  );

  // Handler to open transaction details
  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setTransactionDetailsOpen(true);
  };

  if (!part) return null;

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
          
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{part.name}</h2>
                  <Badge variant={getStockStatus(part.current_quantity, part.min_stock_level) === 'out' ? 'destructive' : 'default'}>
                    {part.current_quantity} in stock
                  </Badge>
                </div>
                <div className="flex gap-4 text-slate-300 text-sm font-mono">
                  <span>{part.part_number}</span>
                  <span>•</span>
                  <span>{part.barcode || 'No barcode'}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Tabs & Content */}
          <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
              <div className="bg-white border-b px-6 pt-2">
                <TabsList className="bg-transparent p-0 h-auto gap-6">
                  <TabsTrigger value="info" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Info</TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">History</TabsTrigger>
                  <TabsTrigger value="suppliers" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Suppliers</TabsTrigger>
                  <TabsTrigger value="machines" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Machines</TabsTrigger>
                  <TabsTrigger value="specs" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Specs</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  
                  {/* INFO TAB */}
                  <TabsContent value="info" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Stock Level</CardTitle></CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-slate-800">{part.current_quantity}</div>
                          <p className="text-xs text-slate-500">Min: {part.min_stock_level}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Unit Cost</CardTitle></CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">{formatCurrency(part.average_cost || 0)}</div>
                          <p className="text-xs text-slate-500">Average price</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Inventory Value</CardTitle></CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">{formatCurrency((part.current_quantity || 0) * (part.average_cost || 0))}</div>
                          <p className="text-xs text-slate-500">Total value in stock</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" /> Basic Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-y-4">
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 uppercase">Category</span>
                          <span className="text-sm font-medium">{part.category || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 uppercase">Warehouse</span>
                          <span className="text-sm font-medium">{part.warehouse?.name || 'N/A'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* HISTORY TAB */}
                  <TabsContent value="history" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <History className="w-5 h-5 text-purple-600" /> Transaction History
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loadingHistory ? <LoadingSpinner message="Loading transactions..." /> : (
                          <div className="rounded-md border">
                            {historyError && (
                              <div className="p-4 bg-red-50 text-red-700 text-sm rounded">{historyError}</div>
                            )}
                            {history.length === 0 ? (
                              <div className="p-6 text-center text-slate-400">No transactions found for this part.</div>
                            ) : (
                              <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                  <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3 text-right">Qty</th>
                                    <th className="p-3">Machine / Used By</th>
                                    <th className="p-3">Notes</th>
                                    <th className="p-3 text-center">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {history.map(tx => (
                                    <tr key={tx.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => handleTransactionClick(tx)}>
                                      <td className="p-3 text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                                      <td className="p-3">
                                        <Badge variant={tx.transaction_type === 'usage' ? 'destructive' : 'default'} className="capitalize">
                                          {tx.transaction_type}
                                        </Badge>
                                      </td>
                                      <td className="p-3 text-right font-semibold">{tx.transaction_type === 'usage' ? '-' : '+'}{Math.abs(tx.quantity)}</td>
                                      <td className="p-3 text-sm">
                                        {tx.machine?.name ? (
                                          <div className="font-medium">{tx.machine.name}</div>
                                        ) : (
                                          <div className="text-slate-600">{tx.user?.full_name || 'System'}</div>
                                        )}
                                      </td>
                                      <td className="p-3 text-sm text-slate-600 truncate">{tx.notes || '-'}</td>
                                      <td className="p-3 text-center">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleTransactionClick(tx);
                                          }}
                                          className="gap-1"
                                        >
                                          <Eye className="w-4 h-4" />
                                          Details
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* SUPPLIERS TAB */}
                  <TabsContent value="suppliers" className="mt-0">
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" /> Suppliers
                          </CardTitle>
                          {!isAddingSupplier && isGodAdmin && (
                            <Button onClick={() => { setIsAddingSupplier(true); fetchSuppliers(); }} className="bg-blue-600 hover:bg-blue-700">
                              <Plus className="w-4 h-4 mr-2" /> Link Supplier
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {isAddingSupplier && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                              <Plus className="w-4 h-4" /> Link New Supplier
                            </h4>
                            <Button variant="outline" size="sm" onClick={() => setIsAddingSupplier(false)}>Cancel</Button>

                            {/* Searchable Supplier List */}
                            <div>
                              <Label>Find Supplier</Label>
                              <Input
                                placeholder="Search suppliers..."
                                value={supplierSearchTerm}
                                onChange={(e) => setSupplierSearchTerm(e.target.value)}
                                className="mt-1"
                              />
                            </div>

                            {supplierSearchTerm && (
                              <div className="border rounded max-h-48 overflow-y-auto">
                                {filteredSuppliers.length === 0 ? (
                                  <div className="p-3 text-slate-400 text-sm">No suppliers found</div>
                                ) : (
                                  filteredSuppliers.map(s => (
                                    <div
                                      key={s.id}
                                      onClick={() => { setNewSupplier({...newSupplier, supplier_id: s.id}); setSupplierSearchTerm(''); }}
                                      className="p-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between items-center border-b last:border-b-0"
                                    >
                                      <span>{s.name}</span>
                                      {s.is_oem && <Badge>OEM</Badge>}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {newSupplier.supplier_id && (
                              <div className="p-2 bg-white rounded border border-slate-200">
                                Selected: <strong>{availableSuppliers.find(s => s.id === newSupplier.supplier_id)?.name}</strong>
                              </div>
                            )}

                            <div>
                              <Label>Unit Price (€)</Label>
                              <Input type="number" placeholder="0.00" value={newSupplier.unit_price} onChange={(e) => setNewSupplier({...newSupplier, unit_price: e.target.value})} className="mt-1" />
                            </div>

                            <div>
                              <Label>Lead Time (Days)</Label>
                              <Input type="number" placeholder="0" value={newSupplier.lead_time_days} onChange={(e) => setNewSupplier({...newSupplier, lead_time_days: e.target.value})} className="mt-1" />
                            </div>

                            <div className="flex items-center gap-2">
                              <Checkbox id="is-preferred" checked={newSupplier.is_preferred} onChange={(e) => setNewSupplier({...newSupplier, is_preferred: e.target.checked})} />
                              <Label htmlFor="is-preferred" className="cursor-pointer">Preferred Supplier</Label>
                            </div>

                            <Button onClick={handleAddSupplier} className="w-full bg-green-600 hover:bg-green-700">
                              <Check className="w-4 h-4 mr-2" /> Save Link
                            </Button>
                          </div>
                        )}

                        {/* Linked Suppliers List */}
                        {!part.supplier_options?.length ? (
                          !isAddingSupplier && <p className="text-slate-400 text-sm">No suppliers linked.</p>
                        ) : (
                          <div className="space-y-3">
                            {part.supplier_options.map(opt => (
                              <div key={opt.id} className="p-4 bg-slate-50 rounded-lg border flex justify-between items-start">
                                <div>
                                  <div className="font-semibold text-slate-800">{opt.supplier?.name}</div>
                                  <div className="flex gap-2 mt-2">
                                    {opt.supplier?.is_oem && <Badge variant="secondary">OEM</Badge>}
                                    {opt.is_preferred && <Badge className="bg-amber-600">Preferred</Badge>}
                                  </div>
                                  <div className="text-sm text-slate-600 mt-2">Lead Time: {opt.lead_time_days || 0} days</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-lg font-bold text-slate-800">{formatCurrency(opt.unit_price)}</div>
                                  {isGodAdmin && (
                                    <Button size="sm" variant="ghost" onClick={() => handleRemoveSupplier(opt.id)} className="text-red-600 hover:text-red-700">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* MACHINES TAB */}
                  <TabsContent value="machines" className="mt-0">
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2">
                            <Monitor className="w-5 h-5 text-blue-600" /> Linked Machines
                          </CardTitle>
                          {!isAddingMachine && isGodAdmin && (
                            <Button onClick={() => { setIsAddingMachine(true); fetchMachines(); }} className="bg-blue-600 hover:bg-blue-700">
                              <Plus className="w-4 h-4 mr-2" /> Link Machine
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {isAddingMachine && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                              <Plus className="w-4 h-4" /> Link New Machine
                            </h4>
                            <Button variant="outline" size="sm" onClick={() => setIsAddingMachine(false)}>Cancel</Button>

                            {/* Searchable Machine List */}
                            <div>
                              <Label>Find Machine</Label>
                              <Input
                                placeholder="Search machines..."
                                value={machineSearchTerm}
                                onChange={(e) => setMachineSearchTerm(e.target.value)}
                                className="mt-1"
                              />
                            </div>

                            {machineSearchTerm && (
                              <div className="border rounded max-h-48 overflow-y-auto">
                                {filteredMachines.length === 0 ? (
                                  <div className="p-3 text-slate-400 text-sm">No machines found</div>
                                ) : (
                                  filteredMachines.map(m => (
                                    <div
                                      key={m.id}
                                      onClick={() => { setNewMachine({...newMachine, machine_id: m.id}); setMachineSearchTerm(''); }}
                                      className="p-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between items-center border-b last:border-b-0"
                                    >
                                      <span className="font-medium">{m.name}</span>
                                      <span className="text-slate-500">{m.machine_code}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {newMachine.machine_id && (
                              <div className="p-2 bg-white rounded border border-slate-200">
                                Selected: <strong>{availableMachines.find(m => m.id === newMachine.machine_id)?.name}</strong>
                              </div>
                            )}

                            <div>
                              <Label>Usage Frequency</Label>
                              <Select value={newMachine.usage_frequency} onValueChange={(v) => setNewMachine({...newMachine, usage_frequency: v})}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="High (Daily)">High (Daily)</SelectItem>
                                  <SelectItem value="Medium (Weekly)">Medium (Weekly)</SelectItem>
                                  <SelectItem value="Low (Monthly)">Low (Monthly)</SelectItem>
                                  <SelectItem value="On Demand">On Demand</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Button onClick={handleAddMachine} className="w-full bg-green-600 hover:bg-green-700">
                              <Check className="w-4 h-4 mr-2" /> Save Link
                            </Button>
                          </div>
                        )}

                        {/* Linked Machines List */}
                        {!part.machine_associations?.length ? (
                          !isAddingMachine && <p className="text-slate-400 text-sm">No machines linked.</p>
                        ) : (
                          <div className="space-y-3">
                            {part.machine_associations.map(assoc => (
                              <div key={assoc.id} className="p-4 bg-slate-50 rounded-lg border flex justify-between items-start">
                                <div>
                                  <div className="font-semibold text-slate-800">{assoc.machine?.name}</div>
                                  <div className="text-sm text-slate-600 mt-1 font-mono">{assoc.machine?.machine_code}</div>
                                  <div className="text-sm text-slate-600 mt-2">Usage: <Badge variant="outline">{assoc.usage_frequency || "Standard"}</Badge></div>
                                </div>
                                {isGodAdmin && (
                                  <Button size="sm" variant="ghost" onClick={() => handleRemoveMachine(assoc.id)} className="text-red-600 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* SPECS TAB */}
                  <TabsContent value="specs" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Wrench className="w-5 h-5 text-slate-600" /> Technical Specifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-y-6">
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 uppercase">Manufacturer</span>
                          <span className="text-sm font-medium">{part.manufacturer || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 uppercase">Unit of Measure</span>
                          <span className="text-sm font-medium">{part.unit_of_measure || "Each"}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 uppercase">Min Stock Level</span>
                          <span className="text-sm font-medium">{part.min_stock_level || "0"}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 uppercase">Category</span>
                          <span className="text-sm font-medium">{part.category || "N/A"}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                </div>
              </ScrollArea>

              <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                <Button onClick={onClose}>Close Details</Button>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          open={transactionDetailsOpen}
          onOpenChange={setTransactionDetailsOpen}
        />
      )}
    </>
  );
};

export default PartDetailsModal;
