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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import TransactionDetailsModal from '@/components/modules/machines/TransactionDetailsModal';

const PartDetailsModal = ({ part: initialPart, onClose, onDeleteRequest, onEditRequest, open = true }) => {
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
      toast({ title: "Success", description: "Supplier linked successfully." });
      setIsAddingSupplier(false);
      setNewSupplier({ supplier_id: '', unit_price: '', lead_time_days: '', is_preferred: false });
      setSupplierSearchTerm('');
      loadFullData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to link supplier." });
    }
  };

  const handleRemoveSupplier = async (id) => {
    if (!isGodAdmin) return;
    try {
      const { error } = await dbService.removePartSupplier(id);
      if (error) throw error;
      toast({ title: "Removed", description: "Supplier link removed." });
      loadFullData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to remove supplier." });
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
      toast({ title: "Success", description: "Machine linked successfully." });
      setIsAddingMachine(false);
      setNewMachine({ machine_id: '', usage_frequency: 'On Demand' });
      setMachineSearchTerm('');
      loadFullData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to link machine." });
    }
  };

  const handleRemoveMachine = async (id) => {
    if (!isGodAdmin) return;
    try {
      const { error } = await dbService.removePartMachine(id);
      if (error) throw error;
      toast({ title: "Removed", description: "Machine link removed." });
      loadFullData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to remove machine." });
    }
  };

  // Handler to open transaction details
  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setTransactionDetailsOpen(true);
  };

  if (!part) return null;

  const status = getStockStatus(part.current_quantity, part.min_stock_level, part.reorder_point);
  const stockPercentage = Math.min(100, Math.round((part.current_quantity / (part.reorder_point * 2)) * 100));
  const formatPrice = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(val || 0);
  const unitPrice = part.average_cost || 0;
  const totalValue = unitPrice * (part.current_quantity || 0);

  // Filtered Lists for Search
  const filteredSuppliers = availableSuppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) &&
    !part.supplier_options?.some(opt => opt.supplier_id === s.id)
  );

  const filteredMachines = availableMachines.filter(m =>
    (m.name.toLowerCase().includes(machineSearchTerm.toLowerCase()) || m.machine_code.toLowerCase().includes(machineSearchTerm.toLowerCase())) &&
    !part.machine_associations?.some(assoc => assoc.machine_id === m.id)
  );

  return (
    <>
      <Dialog open={open && onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          {/* --- HEADER SECTION --- */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6 flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <ImageWithFallback src={part.image_url} alt={part.name} className="w-12 h-12 rounded object-cover bg-slate-600" />
                <div>
                  <h2 className="text-2xl font-bold">{part.name}</h2>
                  <p className="text-sm text-slate-300">{part.category || "Uncategorized"}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Part Number:</span>
                  <p className="font-mono">{part.part_number}</p>
                </div>
                <div>
                  <span className="text-slate-400">Barcode:</span>
                  <p className="font-mono">{part.barcode}</p>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <p className="font-mono"><StatusBadge status={status} /></p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {part.specifications?.datasheet_url && (
                <Button size="sm" variant="outline" onClick={() => window.open(part.specifications.datasheet_url || '#', '_blank')}>
                  Datasheet
                </Button>
              )}
              {isGodAdmin && (
                <Button size="sm" onClick={() => onEditRequest(part)}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* --- TABS & CONTENT --- */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            <div className="border-b px-6">
              <TabsList className="bg-transparent p-0 h-auto gap-8 w-full justify-start">
                <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-0 py-3">Info</TabsTrigger>
                <TabsTrigger value="suppliers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-0 py-3">Suppliers</TabsTrigger>
                <TabsTrigger value="machines" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-0 py-3">Machines</TabsTrigger>
                <TabsTrigger value="specs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-0 py-3">Specs</TabsTrigger>
                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-0 py-3">History</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {/* INFO TAB */}
                <TabsContent value="info" className="mt-0 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase">On Hand</span>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-slate-800">{part.current_quantity}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Min Stock</span>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-slate-800">{part.min_stock_level}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Reorder</span>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-slate-800">{part.reorder_point}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Stock Health</span>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-blue-600">{stockPercentage}%</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</h3>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Warehouse</span>
                          <p className="font-medium">{part.warehouse?.name || "Main Warehouse"}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Building</span>
                          <p className="font-medium">{part.warehouse?.building?.name || "General Storage"}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Bin Location</span>
                          <p className="font-medium">{part.bin_location || "N/A"}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <h3 className="font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4" /> Valuation</h3>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Unit Price</span>
                          <p className="font-medium text-lg text-green-600">{formatPrice(unitPrice)}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Total Inventory</span>
                          <p className="font-medium text-lg text-blue-600">{formatPrice(totalValue)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* SUPPLIERS TAB */}
                <TabsContent value="suppliers" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Supplier Options</h3>
                      {!isAddingSupplier && isGodAdmin && (
                        <Button onClick={() => { setIsAddingSupplier(true); fetchSuppliers(); }} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto">
                          <Plus className="w-4 h-4 mr-2" /> Link Supplier
                        </Button>
                      )}
                    </div>

                    {isAddingSupplier && (
                      <Card className="border-teal-200 bg-teal-50">
                        <CardHeader>
                          <h4 className="font-semibold">Link New Supplier</h4>
                          <Button variant="outline" size="sm" onClick={() => setIsAddingSupplier(false)} className="mt-2">Cancel</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Find Supplier</Label>
                            <Input placeholder="Search suppliers..." value={supplierSearchTerm} onChange={(e) => setSupplierSearchTerm(e.target.value)} />
                          </div>

                          {supplierSearchTerm && (
                            <div className="border rounded max-h-48 overflow-y-auto">
                              {filteredSuppliers.length === 0 ? (
                                <div className="p-3 text-slate-400 text-sm">No suppliers found</div>
                              ) : (
                                filteredSuppliers.map(s => (
                                  <div key={s.id} onClick={() => { setNewSupplier({...newSupplier, supplier_id: s.id}); setSupplierSearchTerm(''); }} className="p-2 hover:bg-teal-50 cursor-pointer text-sm flex justify-between items-center">
                                    <span>{s.name}</span>
                                    {s.is_oem && <Badge>OEM</Badge>}
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {newSupplier.supplier_id && (
                            <div className="p-2 bg-white rounded border">
                              Selected: <strong>{availableSuppliers.find(s => s.id === newSupplier.supplier_id)?.name}</strong>
                            </div>
                          )}

                          <div>
                            <Label>Unit Price (€)</Label>
                            <Input type="number" placeholder="0.00" value={newSupplier.unit_price} onChange={(e) => setNewSupplier({...newSupplier, unit_price: e.target.value})} />
                          </div>

                          <div>
                            <Label>Lead Time (Days)</Label>
                            <Input type="number" placeholder="0" value={newSupplier.lead_time_days} onChange={(e) => setNewSupplier({...newSupplier, lead_time_days: e.target.value})} />
                          </div>

                          <div className="flex items-center gap-2">
                            <Checkbox id="is-preferred" checked={newSupplier.is_preferred} onChange={(e) => setNewSupplier({...newSupplier, is_preferred: e.target.checked})} />
                            <Label htmlFor="is-preferred">Preferred Supplier</Label>
                          </div>

                          <Button onClick={handleAddSupplier} className="w-full bg-green-600 hover:bg-green-700">
                            <Check className="w-4 h-4 mr-2" /> Save Link
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {!part.supplier_options?.length ? (
                      !isAddingSupplier && <p className="text-slate-400 text-sm">No suppliers linked.</p>
                    ) : (
                      <div className="space-y-2">
                        {part.supplier_options.map(opt => (
                          <Card key={opt.id} className="flex justify-between items-center p-4">
                            <div>
                              <p className="font-semibold">{opt.supplier?.name}</p>
                              <div className="flex gap-2 mt-2">
                                {opt.supplier?.is_oem && <Badge>OEM</Badge>}
                                {opt.is_preferred && <Badge className="bg-amber-600">Preferred</Badge>}
                              </div>
                              <p className="text-sm text-slate-600 mt-2">Lead Time: {opt.lead_time_days || 0} days</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-lg font-bold">{formatPrice(opt.unit_price)}</p>
                              {isGodAdmin && (
                                <Button size="sm" variant="ghost" onClick={() => handleRemoveSupplier(opt.id)} className="text-red-600 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* MACHINES TAB */}
                <TabsContent value="machines" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Linked Machines</h3>
                      {!isAddingMachine && isGodAdmin && (
                        <Button onClick={() => { setIsAddingMachine(true); fetchMachines(); }} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                          <Plus className="w-4 h-4 mr-2" /> Link Machine
                        </Button>
                      )}
                    </div>

                    {isAddingMachine && (
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                          <h4 className="font-semibold">Link New Machine</h4>
                          <Button variant="outline" size="sm" onClick={() => setIsAddingMachine(false)} className="mt-2">Cancel</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Find Machine</Label>
                            <Input placeholder="Search machines..." value={machineSearchTerm} onChange={(e) => setMachineSearchTerm(e.target.value)} />
                          </div>

                          {machineSearchTerm && (
                            <div className="border rounded max-h-48 overflow-y-auto">
                              {filteredMachines.length === 0 ? (
                                <div className="p-3 text-slate-400 text-sm">No machines found</div>
                              ) : (
                                filteredMachines.map(m => (
                                  <div key={m.id} onClick={() => { setNewMachine({...newMachine, machine_id: m.id}); setMachineSearchTerm(''); }} className="p-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between items-center">
                                    <span className="font-medium">{m.name}</span>
                                    <span className="text-slate-500">{m.machine_code}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {newMachine.machine_id && (
                            <div className="p-2 bg-white rounded border">
                              Selected: <strong>{availableMachines.find(m => m.id === newMachine.machine_id)?.name}</strong>
                            </div>
                          )}

                          <div>
                            <Label>Usage Frequency</Label>
                            <Select value={newMachine.usage_frequency} onValueChange={(v) => setNewMachine({...newMachine, usage_frequency: v})}>
                              <SelectTrigger>
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
                        </CardContent>
                      </Card>
                    )}

                    {!part.machine_associations?.length ? (
                      !isAddingMachine && <p className="text-slate-400 text-sm">No machines linked.</p>
                    ) : (
                      <div className="space-y-2">
                        {part.machine_associations.map(assoc => (
                          <Card key={assoc.id} className="flex justify-between items-center p-4">
                            <div>
                              <p className="font-semibold">{assoc.machine?.name}</p>
                              <p className="text-sm text-slate-600 mt-1 font-mono">{assoc.machine?.machine_code}</p>
                              <p className="text-sm text-slate-600 mt-2">Usage: <Badge variant="outline">{assoc.usage_frequency || "Standard"}</Badge></p>
                            </div>
                            {isGodAdmin && (
                              <Button size="sm" variant="ghost" onClick={() => handleRemoveMachine(assoc.id)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* SPECS TAB */}
                <TabsContent value="specs" className="mt-0">
                  <Card>
                    <CardHeader>
                      <h3 className="font-semibold flex items-center gap-2"><Wrench className="w-4 h-4" /> Technical Specifications</h3>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-6">
                      <div>
                        <span className="text-xs text-slate-500 uppercase">Manufacturer</span>
                        <p className="text-sm font-medium">{part.manufacturer || "Unknown"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase">Unit</span>
                        <p className="text-sm font-medium">{part.unit_of_measure || "Each"}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* HISTORY TAB */}
                <TabsContent value="history" className="mt-0">
                  <Card>
                    <CardHeader>
                      <h3 className="font-semibold flex items-center gap-2"><History className="w-4 h-4" /> Transaction History</h3>
                    </CardHeader>
                    <CardContent>
                      {loadingHistory ? <LoadingSpinner /> : (
                        <div className="space-y-2">
                          {historyError && <div className="p-4 bg-red-50 text-red-700 text-sm rounded">{historyError}</div>}
                          {history.length === 0 ? (
                            <p className="text-slate-400 text-sm">No history available.</p>
                          ) : (
                            history.map((tx) => (
                              <div
                                key={tx.id}
                                onClick={() => handleTransactionClick(tx)}
                                className="p-3 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer transition-colors flex justify-between items-center"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={tx.transaction_type === 'usage' ? 'destructive' : 'default'} className="capitalize">
                                      {tx.transaction_type}
                                    </Badge>
                                    <span className="text-sm text-slate-600">{new Date(tx.created_at).toLocaleDateString()}</span>
                                    {tx.notes && <span className="text-xs text-slate-500">{tx.notes}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold">{tx.transaction_type === 'usage' ? '-' : '+'}{Math.abs(tx.quantity)}</span>
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
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          {/* Footer */}
          <div className="border-t p-4 bg-slate-50 flex justify-end">
            <Button onClick={onClose}>Close Details</Button>
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
