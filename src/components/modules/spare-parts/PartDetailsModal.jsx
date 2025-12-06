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
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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


const PartDetailsModal = ({ open, part: initialPart, onClose, onDeleteRequest, onEditRequest }) => {
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

  // Handle close - properly close the modal
  const handleClose = () => {
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  // Handle open change from Dialog component
  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      handleClose();
    }
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
      <Dialog open={open} onOpenChange={handleOpenChange}>
  <DialogContent className="max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white sm:rounded-xl border shadow-2xl">
    <DialogTitle className="sr-only">{part?.name || 'Part Details'}</DialogTitle>
      <DialogDescription className="sr-only">Part details and information</DialogDescription>    
          {/* --- HEADER SECTION --- */}
          <div className="relative bg-slate-900 overflow-hidden shrink-0 min-h-[200px] sm:min-h-[192px] flex flex-col justify-end">
            <div className="absolute inset-0 opacity-40">
              <ImageWithFallback src={part.photo_url} alt={part.name} className="w-full h-full object-cover blur-sm scale-105" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/20" />
            
            <div className="absolute top-4 right-4 z-20 flex gap-2">
               <Button size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border-white/20 h-8 text-xs px-3" onClick={() => window.open(part.specifications?.datasheet_url || '#', '_blank')}>
                 <FileText className="w-3 h-3 mr-2" /> <span className="hidden sm:inline">Datasheet</span>
               </Button>
               {isGodAdmin && (
                  <Button size="sm" variant="secondary" className="bg-white/90 text-slate-900 hover:bg-white h-8 text-xs px-3" onClick={() => onEditRequest(part)}>
                    <Pencil className="w-3 h-3 mr-2" /> Edit
                  </Button>
               )}
            </div>


            <div className="relative z-10 p-4 sm:p-6 w-full flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-lg bg-white shadow-xl overflow-hidden border-2 sm:border-4 border-white shrink-0">
                 <ImageWithFallback src={part.photo_url} alt={part.name} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-1 min-w-0 w-full">
                 <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-slate-700 text-slate-100 hover:bg-slate-600 border-0 text-[10px] sm:text-xs px-2 py-0.5">
                      {part.category || "Uncategorized"}
                    </Badge>
                    <StatusBadge status={status} />
                 </div>
                 
                 <h2 className="text-xl sm:text-3xl font-bold text-white leading-tight shadow-black drop-shadow-md break-words mb-2">
                   {part.name}
                 </h2>
                 
                 <div className="text-slate-300 font-mono text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 opacity-90">
                    <div className="flex items-center gap-2"><span className="opacity-70">PN:</span> {part.part_number}</div>
                    <span className="hidden sm:block w-1 h-1 bg-slate-500 rounded-full" />
                    <div className="flex items-center gap-2"><span className="opacity-70">BC:</span> {part.barcode}</div>
                 </div>
              </div>
            </div>
          </div>


          {/* --- TABS & CONTENT --- */}
          <div className="flex-1 overflow-hidden flex flex-col bg-white">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
              <div className="bg-white border-b">
                 <div className="px-4 sm:px-6 pt-2 sm:pt-4 overflow-x-auto no-scrollbar">
                    <TabsList className="flex w-full justify-start bg-transparent p-0 h-auto gap-2 sm:gap-0 mb-0">
                      <TabsTrigger value="info" className="flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Info</TabsTrigger>
                      <TabsTrigger value="suppliers" className="flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Suppliers</TabsTrigger>
                      <TabsTrigger value="machines" className="flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Machines</TabsTrigger>
                      <TabsTrigger value="specs" className="flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Specs</TabsTrigger>
                      <TabsTrigger value="history" className="flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none">History</TabsTrigger>
                    </TabsList>
                 </div>
              </div>


              <ScrollArea className="flex-1 bg-slate-50/50">
                <div className="p-4 sm:p-6">
                  
                  {/* INFO TAB */}
                  <TabsContent value="info" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="md:col-span-2 bg-white shadow-sm">
                        <CardHeader className="pb-3">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Box className="w-5 h-5 text-teal-600" /> Inventory Status
                          </h3>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-slate-50 rounded-lg border flex sm:block justify-between items-center sm:justify-center">
                               <div className="text-xs uppercase font-bold text-slate-400 mb-0 sm:mb-1">On Hand</div>
                               <div className="text-2xl font-bold text-slate-900">{part.current_quantity}</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border flex sm:block justify-between items-center sm:justify-center">
                               <div className="text-xs uppercase font-bold text-slate-400 mb-0 sm:mb-1">Min Stock</div>
                               <div className="text-2xl font-bold text-slate-700">{part.min_stock_level}</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border flex sm:block justify-between items-center sm:justify-center">
                               <div className="text-xs uppercase font-bold text-slate-400 mb-0 sm:mb-1">Reorder</div>
                               <div className="text-2xl font-bold text-blue-600">{part.reorder_point}</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Stock Health</span>
                                <span className="font-medium text-slate-700">{stockPercentage}%</span>
                             </div>
                             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    status === 'out' ? 'bg-red-500' : 
                                    status === 'critical' ? 'bg-orange-500' : 
                                    status === 'low' ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${stockPercentage}%` }}
                                />
                             </div>
                          </div>
                        </CardContent>
                      </Card>


                      <div className="space-y-6">
                        <Card className="bg-white shadow-sm">
                          <CardHeader className="pb-3"><h3 className="font-semibold text-sm uppercase text-slate-500 tracking-wide">Location</h3></CardHeader>
                          <CardContent className="space-y-4">
                             <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                   <div className="font-medium text-slate-900 break-words">{part.warehouse?.name || "Main Warehouse"}</div>
                                   <div className="text-sm text-slate-500 break-words">{part.warehouse?.building?.name || "General Storage"}</div>
                                </div>
                             </div>
                             <div className="p-3 bg-slate-100 rounded-md text-center border border-dashed border-slate-300">
                                <div className="text-xs text-slate-500 uppercase mb-1">Bin Location</div>
                                <div className="text-xl font-mono font-bold text-slate-800">{part.bin_location || "N/A"}</div>
                             </div>
                          </CardContent>
                        </Card>


                        <Card className="bg-slate-900 text-white shadow-sm border-slate-800">
                          <CardHeader className="pb-3">
                             <h3 className="font-semibold text-sm uppercase text-emerald-400 tracking-wide flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Valuation
                             </h3>
                          </CardHeader>
                          <CardContent className="space-y-3">
                             <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-slate-400 text-sm">Unit Price</span>
                                <span className="font-mono font-bold">{formatPrice(unitPrice)}</span>
                             </div>
                             <div className="flex justify-between items-center pt-1">
                                <span className="text-emerald-400 font-bold text-sm">Total Inventory</span>
                                <span className="font-mono font-bold text-lg">{formatPrice(totalValue)}</span>
                             </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>


                  {/* SUPPLIERS TAB */}
                  <TabsContent value="suppliers" className="mt-0">
                     <Card className="bg-white shadow-sm">
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-2">
                           <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Users className="w-5 h-5 text-teal-600" /> Supplier Options
                           </h3>
                           {!isAddingSupplier && isGodAdmin && (
                               <Button size="sm" onClick={() => { setIsAddingSupplier(true); fetchSuppliers(); }} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto">
                                   <LinkIcon className="w-4 h-4 mr-2" /> Link Supplier
                               </Button>
                           )}
                        </CardHeader>
                        <CardContent>
                           {isAddingSupplier && (
                              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-teal-100 animate-in slide-in-from-top-2">
                                 <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-teal-800 text-sm">Link New Supplier</h4>
                                    <Button variant="ghost" size="sm" onClick={() => setIsAddingSupplier(false)}><X className="w-4 h-4" /></Button>
                                 </div>
                                 
                                 {/* Searchable Supplier List */}
                                 <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Find Supplier</Label>
                                      <div className="relative">
                                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                         <Input 
                                            placeholder="Search by name..." 
                                            className="pl-9 bg-white"
                                            value={supplierSearchTerm}
                                            onChange={e => setSupplierSearchTerm(e.target.value)}
                                         />
                                      </div>
                                      
                                      {supplierSearchTerm && (
                                         <div className="max-h-40 overflow-y-auto border rounded-md bg-white shadow-sm">
                                            {filteredSuppliers.length === 0 ? (
                                               <div className="p-3 text-sm text-slate-500 text-center">No suppliers found</div>
                                            ) : (
                                               filteredSuppliers.map(s => (
                                                  <div 
                                                     key={s.id} 
                                                     onClick={() => { setNewSupplier({...newSupplier, supplier_id: s.id}); setSupplierSearchTerm(''); }}
                                                     className="p-2 hover:bg-teal-50 cursor-pointer text-sm flex justify-between items-center"
                                                  >
                                                     <span>{s.name}</span>
                                                     {s.is_oem && <Badge variant="secondary" className="text-[10px]">OEM</Badge>}
                                                  </div>
                                               ))
                                            )}
                                         </div>
                                      )}
                                      
                                      {newSupplier.supplier_id && (
                                         <div className="text-sm font-medium text-teal-700 bg-teal-50 p-2 rounded flex items-center gap-2">
                                            <Check className="w-4 h-4" />
                                            Selected: {availableSuppliers.find(s => s.id === newSupplier.supplier_id)?.name}
                                         </div>
                                      )}
                                    </div>


                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <Label>Unit Price (€)</Label>
                                          <Input type="number" step="0.01" className="bg-white" value={newSupplier.unit_price} onChange={e => setNewSupplier({...newSupplier, unit_price: e.target.value})} />
                                       </div>
                                       <div className="space-y-2">
                                          <Label>Lead Time (Days)</Label>
                                          <Input type="number" className="bg-white" value={newSupplier.lead_time_days} onChange={e => setNewSupplier({...newSupplier, lead_time_days: e.target.value})} />
                                       </div>
                                    </div>
                                    
                                    <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleAddSupplier} disabled={!newSupplier.supplier_id}>Save Link</Button>
                                 </div>
                              </div>
                           )}


                           {/* Linked Suppliers List */}
                           <div className="space-y-3">
                             {!part.supplier_options?.length ? (
                               !isAddingSupplier && <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-xl">No suppliers linked.</div>
                             ) : (
                               part.supplier_options.map(opt => (
                                  <div key={opt.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg bg-white gap-2 hover:shadow-sm transition-shadow">
                                     <div className="flex-1">
                                        <div className="font-bold text-slate-800 flex items-center gap-2">
                                           {opt.supplier?.name}
                                           {opt.supplier?.is_oem && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 text-[10px]">OEM</Badge>}
                                           {opt.is_preferred && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-[10px]">Preferred</Badge>}
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1">Lead Time: {opt.lead_time_days || 0} days</div>
                                     </div>
                                     <div className="flex items-center gap-4">
                                        <div className="font-bold text-lg text-slate-700">€{Number(opt.unit_price).toFixed(2)}</div>
                                        {isGodAdmin && (
                                           <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => handleRemoveSupplier(opt.id)}>
                                              <Trash2 className="w-4 h-4" />
                                           </Button>
                                        )}
                                     </div>
                                  </div>
                               ))
                             )}
                           </div>
                        </CardContent>
                     </Card>
                  </TabsContent>


                  {/* MACHINES TAB */}
                  <TabsContent value="machines" className="mt-0">
                      <Card className="bg-white shadow-sm">
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-2">
                           <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Monitor className="w-5 h-5 text-blue-600" /> Linked Machines
                           </h3>
                           {!isAddingMachine && isGodAdmin && (
                               <Button size="sm" onClick={() => { setIsAddingMachine(true); fetchMachines(); }} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                                   <LinkIcon className="w-4 h-4 mr-2" /> Link Machine
                               </Button>
                           )}
                        </CardHeader>
                        <CardContent>
                           {isAddingMachine && (
                              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-blue-100 animate-in slide-in-from-top-2">
                                 <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-blue-800 text-sm">Link New Machine</h4>
                                    <Button variant="ghost" size="sm" onClick={() => setIsAddingMachine(false)}><X className="w-4 h-4" /></Button>
                                 </div>


                                 {/* Searchable Machine List */}
                                 <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Find Machine</Label>
                                      <div className="relative">
                                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                         <Input 
                                            placeholder="Search by code or name..." 
                                            className="pl-9 bg-white"
                                            value={machineSearchTerm}
                                            onChange={e => setMachineSearchTerm(e.target.value)}
                                         />
                                      </div>
                                      
                                      {machineSearchTerm && (
                                         <div className="max-h-40 overflow-y-auto border rounded-md bg-white shadow-sm">
                                            {filteredMachines.length === 0 ? (
                                               <div className="p-3 text-sm text-slate-500 text-center">No machines found</div>
                                            ) : (
                                               filteredMachines.map(m => (
                                                  <div 
                                                     key={m.id} 
                                                     onClick={() => { setNewMachine({...newMachine, machine_id: m.id}); setMachineSearchTerm(''); }}
                                                     className="p-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between items-center"
                                                  >
                                                     <span>{m.name}</span>
                                                     <span className="font-mono text-xs text-slate-400">{m.machine_code}</span>
                                                  </div>
                                               ))
                                            )}
                                         </div>
                                      )}
                                      
                                      {newMachine.machine_id && (
                                         <div className="text-sm font-medium text-blue-700 bg-blue-50 p-2 rounded flex items-center gap-2">
                                            <Check className="w-4 h-4" />
                                            Selected: {availableMachines.find(m => m.id === newMachine.machine_id)?.name}
                                         </div>
                                      )}
                                    </div>


                                    <div className="space-y-2">
                                       <Label>Usage Frequency</Label>
                                       <Select value={newMachine.usage_frequency} onValueChange={v => setNewMachine({...newMachine, usage_frequency: v})}>
                                          <SelectTrigger className="bg-white">
                                             <SelectValue placeholder="Select..." />
                                          </SelectTrigger>
                                          <SelectContent className="bg-white">
                                             <SelectItem value="High">High (Daily)</SelectItem>
                                             <SelectItem value="Medium">Medium (Weekly)</SelectItem>
                                             <SelectItem value="Low">Low (Monthly)</SelectItem>
                                             <SelectItem value="On Demand">On Demand</SelectItem>
                                          </SelectContent>
                                       </Select>
                                    </div>
                                    
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleAddMachine} disabled={!newMachine.machine_id}>Save Link</Button>
                                 </div>
                              </div>
                           )}


                           {/* Linked Machines List */}
                           <div className="space-y-3">
                             {!part.machine_associations?.length ? (
                                !isAddingMachine && <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-xl">No machines linked.</div>
                             ) : (
                                part.machine_associations.map(assoc => (
                                   <div key={assoc.id} className="p-4 border rounded-lg bg-white mb-2 flex justify-between items-center hover:shadow-sm transition-shadow">
                                      <div>
                                         <div className="font-bold text-slate-800">{assoc.machine?.name}</div>
                                         <div className="text-xs text-slate-500 font-mono">{assoc.machine?.machine_code}</div>
                                         <Badge variant="outline" className="mt-1 text-[10px]">{assoc.usage_frequency || "Standard"}</Badge>
                                      </div>
                                      {isGodAdmin && (
                                         <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => handleRemoveMachine(assoc.id)}>
                                            <Trash2 className="w-4 h-4" />
                                         </Button>
                                      )}
                                   </div>
                                ))
                             )}
                           </div>
                        </CardContent>
                      </Card>
                  </TabsContent>
                  
                  {/* SPECS TAB */}
                  <TabsContent value="specs" className="mt-0">
                     <Card className="bg-white shadow-sm">
                        <CardHeader>
                           <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Ruler className="w-5 h-5 text-blue-600" /> Technical Specifications
                           </h3>
                        </CardHeader>
                        <CardContent>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                              <div className="border-b pb-2">
                                 <span className="block text-xs font-semibold text-slate-500 uppercase mb-1">Manufacturer</span>
                                 <span className="text-slate-800 font-medium">{part.manufacturer || "Unknown"}</span>
                              </div>
                              <div className="border-b pb-2">
                                 <span className="block text-xs font-semibold text-slate-500 uppercase mb-1">Unit</span>
                                 <span className="text-slate-800 font-medium capitalize">{part.unit_of_measure || "Each"}</span>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  </TabsContent>


                  {/* HISTORY TAB */}
                  <TabsContent value="history" className="mt-0">
                     <Card className="bg-white shadow-sm">
                        <CardHeader>
                           <h3 className="text-lg font-semibold flex items-center gap-2">
                              <History className="w-5 h-5 text-purple-600" /> Transaction History
                           </h3>
                        </CardHeader>
                        <CardContent>
                           {loadingHistory ? <LoadingSpinner /> : (
                              <div className="space-y-4">
                                 {history.length === 0 ? <div className="text-slate-500 text-center py-4">No history available.</div> :
                                 history.map((tx) => (
                                    <div 
                                      key={tx.id} 
                                      onClick={() => handleTransactionClick(tx)}
                                      className="flex gap-4 pb-4 border-b last:border-0 hover:bg-slate-50 p-2 rounded cursor-pointer transition-colors"
                                    >
                                       <div className="flex-1">
                                          <div className="font-semibold capitalize flex items-center gap-2">
                                            {tx.transaction_type}
                                            <Eye className="w-4 h-4 text-slate-400" />
                                          </div>
                                          <div className="text-sm text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</div>
                                          <div className="text-sm text-slate-600">{tx.notes}</div>
                                       </div>
                                       <div className={`font-bold ${tx.transaction_type === 'usage' ? 'text-red-600' : 'text-green-600'}`}>
                                          {tx.transaction_type === 'usage' ? '-' : '+'}{Math.abs(tx.quantity)}
                                       </div>
                                    </div>
                                 ))}     
                              </div>
                           )}
                        </CardContent>
                     </Card>
                  </TabsContent>
                </div>
              </ScrollArea>


              <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                 <Button variant="outline" size="lg" onClick={handleClose} className="w-full sm:w-auto bg-white">
                    <X className="w-4 h-4 mr-2" /> Close Details
                 </Button>
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