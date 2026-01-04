import React, { useState, useEffect } from 'react';
import { 
  Box, Wrench, History, AlertTriangle, 
  Trash2, Ruler, MapPin, FileText, Pencil, Users, Monitor,
  Plus, Save, DollarSign, X, Search, Check, Link as LinkIcon, Eye, Tag, ZoomIn
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
import { supabase } from '@/lib/customSupabaseClient';
import { getStockStatus } from '@/utils/calculations';
import StatusBadge from '@/components/common/StatusBadge';
import ImageWithFallback from '@/components/common/ImageWithFallback';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import TransactionDetailsModal from '@/components/modules/machines/TransactionDetailsModal';
import ImageViewer from '@/components/modules/spare-parts/ImageViewer';


const PartDetailsModal = ({ open, part: initialPart, onOpenChange, onDelete, onEdit, isEditable }) => {
  const [part, setPart] = useState(initialPart);
  const [activeTab, setActiveTab] = useState('info');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [loadingFullDetails, setLoadingFullDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetailsOpen, setTransactionDetailsOpen] = useState(false);
  const [supplierMappings, setSupplierMappings] = useState([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();


  const isGodAdmin = isEditable || userRole?.name === 'God Admin';


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

  const loadSupplierMappings = async () => {
    if (!part?.id) return;
    setLoadingMappings(true);
    try {
      const { data, error } = await supabase
        .from('supplier_part_mappings')
        .select(`
          id,
          supplier_id,
          supplier_sku,
          supplier_part_number,
          min_order_qty,
          lead_time_days,
          price_per_unit,
          supplier:suppliers(id, name, email)
        `)
        .eq('part_id', part.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupplierMappings(data || []);
    } catch (error) {
      console.error('Error loading supplier mappings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load supplier mappings"
      });
    } finally {
      setLoadingMappings(false);
    }
  };

  const handleRemoveSupplierMapping = async (mappingId) => {
    if (!isGodAdmin) return;
    
    try {
      const { error } = await supabase
        .from('supplier_part_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;
      setSupplierMappings(prev => prev.filter(m => m.id !== mappingId));
      toast({
        title: "Removed",
        description: "Supplier mapping removed successfully"
      });
    } catch (error) {
      console.error('Error removing mapping:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove supplier mapping"
      });
    }
  };

  // Tab Switching Logic
  useEffect(() => {
    if (part && activeTab === 'history') {
      fetchHistory();
    }
    if (activeTab === 'mappings') {
      loadSupplierMappings();
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

  // Handle close button click
  const handleCloseClick = () => {
    onOpenChange(false);
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] h-[95vh] md:w-full md:h-auto md:max-w-4xl md:max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white rounded-lg md:rounded-xl border shadow-lg md:shadow-2xl">
          <DialogTitle className="sr-only">{part?.name || 'Part Details'}</DialogTitle>
          <DialogDescription className="sr-only">Part details and information</DialogDescription>    
          
          {/* --- HEADER SECTION --- */}
          <div className="relative bg-slate-900 overflow-hidden shrink-0 min-h-[160px] md:min-h-[192px] flex flex-col justify-end">
            <div className="absolute inset-0 opacity-40">
              <ImageWithFallback src={part.photo_url} alt={part.name} className="w-full h-full object-cover blur-sm scale-105" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/20" />
            
            {/* Header Actions */}
            <div className="absolute top-2 right-2 md:top-4 md:right-4 z-20 flex flex-col md:flex-row gap-1 md:gap-2">
               {part.photo_url && (
                  <Button size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border-white/20 h-7 md:h-8 text-xs px-2 md:px-3" onClick={() => setImageViewerOpen(true)}>
                    <ZoomIn className="w-3 h-3" /> <span className="hidden sm:inline ml-1">View</span>
                  </Button>
               )}
               <Button size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border-white/20 h-7 md:h-8 text-xs px-2 md:px-3" onClick={() => window.open(part.specifications?.datasheet_url || '#', '_blank')}>
                 <FileText className="w-3 h-3" /> <span className="hidden sm:inline ml-1">Sheet</span>
               </Button>
               {isGodAdmin && (
                  <Button size="sm" variant="secondary" className="bg-white/90 text-slate-900 hover:bg-white h-7 md:h-8 text-xs px-2 md:px-3" onClick={() => onEdit?.(part)}>
                    <Pencil className="w-3 h-3" /> <span className="hidden sm:inline ml-1">Edit</span>
                  </Button>
               )}
            </div>

            {/* Header Content */}
            <div className="relative z-10 p-3 md:p-6 w-full flex flex-col gap-3 items-start">
              <div className="w-16 h-16 md:w-32 md:h-32 rounded-lg bg-white shadow-xl overflow-hidden border-2 md:border-4 border-white shrink-0 cursor-pointer hover:shadow-2xl transition-shadow" onClick={() => setImageViewerOpen(true)}>
                 <ImageWithFallback src={part.photo_url} alt={part.name} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-1 min-w-0 w-full">
                 <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <Badge variant="secondary" className="bg-slate-700 text-slate-100 hover:bg-slate-600 border-0 text-[8px] md:text-xs px-1.5 md:px-2 py-0.5">
                      {part.category || "Uncategorized"}
                    </Badge>
                    <StatusBadge status={status} />
                 </div>
                 
                 <h2 className="text-base md:text-2xl lg:text-3xl font-bold text-white leading-tight shadow-black drop-shadow-md break-words mb-1.5">
                   {part.name}
                 </h2>
                 
                 <div className="text-slate-300 font-mono text-[10px] md:text-xs lg:text-sm flex flex-col gap-1 opacity-90">
                    <div className="flex items-center gap-1.5 flex-wrap"><span className="opacity-70">PN:</span> <span className="break-all">{part.part_number}</span></div>
                    <div className="flex items-center gap-1.5 flex-wrap"><span className="opacity-70">BC:</span> <span className="break-all">{part.barcode}</span></div>
                 </div>
              </div>
            </div>
          </div>

          {/* --- TABS & CONTENT --- */}
          <div className="flex-1 overflow-hidden flex flex-col bg-white">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
              {/* Tab List */}
              <div className="bg-white border-b overflow-x-auto no-scrollbar">
                 <div className="px-2 md:px-6 pt-1 md:pt-4">
                    <TabsList className="flex w-full justify-start bg-transparent p-0 h-auto gap-0.5 md:gap-0 mb-0">
                      <TabsTrigger value="info" className="flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none px-2.5 md:px-4 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none">Info</TabsTrigger>
                      <TabsTrigger value="mappings" className="flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none px-2.5 md:px-4 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none">IDs</TabsTrigger>
                      <TabsTrigger value="suppliers" className="flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none px-2.5 md:px-4 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none">Suppliers</TabsTrigger>
                      <TabsTrigger value="machines" className="flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none px-2.5 md:px-4 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none">Machines</TabsTrigger>
                      <TabsTrigger value="specs" className="flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none px-2.5 md:px-4 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none">Specs</TabsTrigger>
                      <TabsTrigger value="history" className="flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none px-2.5 md:px-4 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none">History</TabsTrigger>
                    </TabsList>
                 </div>
              </div>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1 bg-slate-50/50">
                <div className="p-3 md:p-6 space-y-4 md:space-y-6">
                  
                  {/* INFO TAB */}
                  <TabsContent value="info" className="mt-0 space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
                      {/* Main Card */}
                      <Card className="lg:col-span-2 bg-white shadow-sm">
                        <CardHeader className="pb-2 md:pb-3">
                          <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
                            <Box className="w-4 md:w-5 h-4 md:h-5 text-teal-600" /> Inventory Status
                          </h3>
                        </CardHeader>
                        <CardContent className="space-y-4 md:space-y-6">
                          <div className="grid grid-cols-3 gap-2 md:gap-4">
                            <div className="p-2 md:p-4 bg-slate-50 rounded-lg border text-center">
                               <div className="text-[8px] md:text-xs uppercase font-bold text-slate-400 mb-1">On Hand</div>
                               <div className="text-lg md:text-2xl font-bold text-slate-900">{part.current_quantity}</div>
                            </div>
                            <div className="p-2 md:p-4 bg-slate-50 rounded-lg border text-center">
                               <div className="text-[8px] md:text-xs uppercase font-bold text-slate-400 mb-1">Min Stock</div>
                               <div className="text-lg md:text-2xl font-bold text-slate-700">{part.min_stock_level}</div>
                            </div>
                            <div className="p-2 md:p-4 bg-slate-50 rounded-lg border text-center">
                               <div className="text-[8px] md:text-xs uppercase font-bold text-slate-400 mb-1">Reorder</div>
                               <div className="text-lg md:text-2xl font-bold text-blue-600">{part.reorder_point}</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                             <div className="flex justify-between text-xs md:text-sm">
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

                      {/* Side Cards */}
                      <div className="space-y-3 md:space-y-6">
                        {/* Location Card */}
                        <Card className="bg-white shadow-sm">
                          <CardHeader className="pb-2 md:pb-3"><h3 className="font-semibold text-xs md:text-sm uppercase text-slate-500 tracking-wide">Location</h3></CardHeader>
                          <CardContent className="space-y-2 md:space-y-4 text-xs md:text-sm">
                             <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                   <div className="font-medium text-slate-900 break-words">{part.warehouse?.name || "Main Warehouse"}</div>
                                   <div className="text-xs text-slate-500 break-words">{part.warehouse?.building?.name || "General Storage"}</div>
                                </div>
                             </div>
                             <div className="p-2 md:p-3 bg-slate-100 rounded-md text-center border border-dashed border-slate-300">
                                <div className="text-[10px] md:text-xs text-slate-500 uppercase mb-1">Bin</div>
                                <div className="text-base md:text-xl font-mono font-bold text-slate-800">{part.bin_location || "N/A"}</div>
                             </div>
                          </CardContent>
                        </Card>

                        {/* Valuation Card */}
                        <Card className="bg-slate-900 text-white shadow-sm border-slate-800">
                          <CardHeader className="pb-2 md:pb-3">
                             <h3 className="font-semibold text-xs md:text-sm uppercase text-emerald-400 tracking-wide flex items-center gap-2">
                                <DollarSign className="w-3 md:w-4 h-3 md:h-4" /> Value
                             </h3>
                          </CardHeader>
                          <CardContent className="space-y-2 md:space-y-3 text-xs md:text-sm">
                             <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-slate-400">Unit Price</span>
                                <span className="font-mono font-bold">{formatPrice(unitPrice)}</span>
                             </div>
                             <div className="flex justify-between items-center pt-1">
                                <span className="text-emerald-400 font-bold">Total</span>
                                <span className="font-mono font-bold text-base md:text-lg">{formatPrice(totalValue)}</span>
                             </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  {/* SUPPLIER MAPPINGS TAB */}
                  <TabsContent value="mappings" className="mt-0">
                    <Card className="bg-white shadow-sm">
                      <CardHeader className="pb-2 md:pb-3">
                        <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
                          <Tag className="w-4 md:w-5 h-4 md:h-5 text-purple-600" /> Supplier IDs
                        </h3>
                        <p className="text-xs md:text-sm text-slate-600 mt-2">Unique identifiers for each supplier</p>
                      </CardHeader>
                      <CardContent>
                        {loadingMappings ? (
                          <div className="flex justify-center py-8"><LoadingSpinner /></div>
                        ) : supplierMappings.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-xl">
                            <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs md:text-sm">No supplier mappings yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 md:space-y-3">
                            {supplierMappings.map((mapping) => (
                              <div key={mapping.id} className="border border-slate-200 rounded-lg p-3 md:p-4 bg-gradient-to-br from-slate-50 to-white hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-2 md:gap-4 mb-2 md:mb-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm md:text-lg text-slate-900 break-words">{mapping.supplier?.name || 'Unknown'}</h4>
                                    <p className="text-[10px] md:text-xs text-slate-500 break-all">{mapping.supplier?.email || ''}</p>
                                  </div>
                                  {isGodAdmin && (
                                    <button
                                      onClick={() => handleRemoveSupplierMapping(mapping.id)}
                                      className="p-1 md:p-2 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                      title="Remove"
                                    >
                                      <Trash2 className="h-3 md:h-4 w-3 md:w-4" />
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 bg-white rounded-lg p-2 md:p-3 border border-slate-100 text-xs md:text-sm">
                                  <div>
                                    <p className="text-[9px] md:text-xs font-semibold text-slate-600 uppercase mb-0.5">SKU</p>
                                    <p className="font-mono font-bold text-teal-700 break-all text-xs">{mapping.supplier_sku}</p>
                                  </div>
                                  {mapping.supplier_part_number && (
                                    <div>
                                      <p className="text-[9px] md:text-xs font-semibold text-slate-600 uppercase mb-0.5">Part #</p>
                                      <p className="font-mono font-bold text-slate-800 break-all text-xs">{mapping.supplier_part_number}</p>
                                    </div>
                                  )}
                                  {mapping.lead_time_days && (
                                    <div>
                                      <p className="text-[9px] md:text-xs font-semibold text-slate-600 uppercase mb-0.5">Lead</p>
                                      <p className="font-mono text-slate-800">{mapping.lead_time_days}d</p>
                                    </div>
                                  )}
                                  {mapping.price_per_unit && (
                                    <div>
                                      <p className="text-[9px] md:text-xs font-semibold text-slate-600 uppercase mb-0.5">Price</p>
                                      <p className="font-mono font-bold text-emerald-700">€{mapping.price_per_unit.toFixed(2)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* SUPPLIERS TAB */}
                  <TabsContent value="suppliers" className="mt-0">
                     <Card className="bg-white shadow-sm">
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 md:pb-3 gap-2">
                           <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
                              <Users className="w-4 md:w-5 h-4 md:h-5 text-teal-600" /> Suppliers
                           </h3>
                           {!isAddingSupplier && isGodAdmin && (
                               <Button size="sm" onClick={() => { setIsAddingSupplier(true); fetchSuppliers(); }} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto text-xs md:text-sm h-8 md:h-9 px-2 md:px-4">
                                   <LinkIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Link
                               </Button>
                           )}
                        </CardHeader>
                        <CardContent className="space-y-3 md:space-y-4 text-xs md:text-sm">
                           {isAddingSupplier && (
                              <div className="mb-4 md:mb-6 p-3 md:p-4 bg-slate-50 rounded-lg border border-teal-100 animate-in slide-in-from-top-2">
                                 <div className="flex justify-between items-center mb-3 md:mb-4">
                                    <h4 className="font-bold text-teal-800 text-xs md:text-sm">Link Supplier</h4>
                                    <Button variant="ghost" size="sm" onClick={() => setIsAddingSupplier(false)} className="h-6 w-6 p-0"><X className="w-3 h-3 md:w-4 md:h-4" /></Button>
                                 </div>
                                 
                                 <div className="space-y-3 md:space-y-4">
                                    <div className="space-y-1.5 md:space-y-2">
                                      <Label className="text-xs md:text-sm">Find Supplier</Label>
                                      <div className="relative">
                                         <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-slate-400"/>
                                         <Input 
                                            placeholder="Search..." 
                                            className="pl-8 md:pl-9 bg-white h-8 md:h-9 text-xs"
                                            value={supplierSearchTerm}
                                            onChange={e => setSupplierSearchTerm(e.target.value)}
                                         />
                                      </div>
                                      
                                      {supplierSearchTerm && (
                                         <div className="max-h-40 overflow-y-auto border rounded-md bg-white shadow-sm">
                                            {filteredSuppliers.length === 0 ? (
                                               <div className="p-2 md:p-3 text-xs text-slate-500 text-center">No suppliers</div>
                                            ) : (
                                               filteredSuppliers.map(s => (
                                                  <div 
                                                     key={s.id} 
                                                     onClick={() => { setNewSupplier({...newSupplier, supplier_id: s.id}); setSupplierSearchTerm(''); }}
                                                     className="p-2 hover:bg-teal-50 cursor-pointer text-xs flex justify-between items-center"
                                                  >
                                                     <span className="break-words">{s.name}</span>
                                                     {s.is_oem && <Badge variant="secondary" className="text-[8px] ml-1 flex-shrink-0">OEM</Badge>}
                                                  </div>
                                               ))
                                            )}
                                         </div>
                                      )}
                                      
                                      {newSupplier.supplier_id && (
                                         <div className="text-xs font-medium text-teal-700 bg-teal-50 p-1.5 md:p-2 rounded flex items-center gap-1 md:gap-2">
                                            <Check className="w-3 h-3" />
                                            <span className="truncate">{availableSuppliers.find(s => s.id === newSupplier.supplier_id)?.name}</span>
                                         </div>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                                       <div className="space-y-1 md:space-y-2">
                                          <Label className="text-xs">Unit Price (€)</Label>
                                          <Input type="number" step="0.01" className="bg-white h-8 md:h-9 text-xs" value={newSupplier.unit_price} onChange={e => setNewSupplier({...newSupplier, unit_price: e.target.value})} />
                                       </div>
                                       <div className="space-y-1 md:space-y-2">
                                          <Label className="text-xs">Lead Time (Days)</Label>
                                          <Input type="number" className="bg-white h-8 md:h-9 text-xs" value={newSupplier.lead_time_days} onChange={e => setNewSupplier({...newSupplier, lead_time_days: e.target.value})} />
                                       </div>
                                    </div>
                                    
                                    <Button className="w-full bg-teal-600 hover:bg-teal-700 h-8 md:h-9 text-xs" onClick={handleAddSupplier} disabled={!newSupplier.supplier_id}>Save</Button>
                                 </div>
                              </div>
                           )}

                           {/* Linked Suppliers */}
                           <div className="space-y-2 md:space-y-3">
                             {!part.supplier_options?.length ? (
                               !isAddingSupplier && <div className="text-center py-6 md:py-8 text-slate-400 border-2 border-dashed rounded-xl text-xs md:text-sm">No suppliers</div>
                             ) : (
                               part.supplier_options.map(opt => (
                                  <div key={opt.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 md:p-4 border rounded-lg bg-white gap-2 hover:shadow-sm transition-shadow">
                                     <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-800 flex items-center gap-1 md:gap-2 flex-wrap">
                                           <span className="break-words text-sm md:text-base">{opt.supplier?.name}</span>
                                           {opt.supplier?.is_oem && <Badge className="bg-purple-100 text-purple-700 border-0 text-[8px] md:text-[10px] flex-shrink-0">OEM</Badge>}
                                           {opt.is_preferred && <Badge className="bg-green-100 text-green-700 border-0 text-[8px] md:text-[10px] flex-shrink-0">Pref</Badge>}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">Lead: {opt.lead_time_days || 0}d</div>
                                     </div>
                                     <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                                        <div className="font-bold text-slate-700 text-sm md:text-lg">€{Number(opt.unit_price).toFixed(2)}</div>
                                        {isGodAdmin && (
                                           <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 h-7 w-7 md:h-8 md:w-8" onClick={() => handleRemoveSupplier(opt.id)}>
                                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
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
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 md:pb-3 gap-2">
                           <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
                              <Monitor className="w-4 md:w-5 h-4 md:h-5 text-blue-600" /> Machines
                           </h3>
                           {!isAddingMachine && isGodAdmin && (
                               <Button size="sm" onClick={() => { setIsAddingMachine(true); fetchMachines(); }} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-xs md:text-sm h-8 md:h-9 px-2 md:px-4">
                                   <LinkIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Link
                               </Button>
                           )}
                        </CardHeader>
                        <CardContent className="space-y-3 md:space-y-4 text-xs md:text-sm">
                           {isAddingMachine && (
                              <div className="mb-4 md:mb-6 p-3 md:p-4 bg-slate-50 rounded-lg border border-blue-100 animate-in slide-in-from-top-2">
                                 <div className="flex justify-between items-center mb-3 md:mb-4">
                                    <h4 className="font-bold text-blue-800 text-xs md:text-sm">Link Machine</h4>
                                    <Button variant="ghost" size="sm" onClick={() => setIsAddingMachine(false)} className="h-6 w-6 p-0"><X className="w-3 h-3 md:w-4 md:h-4" /></Button>
                                 </div>

                                 <div className="space-y-3 md:space-y-4">
                                    <div className="space-y-1.5 md:space-y-2">
                                      <Label className="text-xs md:text-sm">Find Machine</Label>
                                      <div className="relative">
                                         <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-slate-400"/>
                                         <Input 
                                            placeholder="Search..." 
                                            className="pl-8 md:pl-9 bg-white h-8 md:h-9 text-xs"
                                            value={machineSearchTerm}
                                            onChange={e => setMachineSearchTerm(e.target.value)}
                                         />
                                      </div>
                                      
                                      {machineSearchTerm && (
                                         <div className="max-h-40 overflow-y-auto border rounded-md bg-white shadow-sm">
                                            {filteredMachines.length === 0 ? (
                                               <div className="p-2 md:p-3 text-xs text-slate-500 text-center">No machines</div>
                                            ) : (
                                               filteredMachines.map(m => (
                                                  <div 
                                                     key={m.id} 
                                                     onClick={() => { setNewMachine({...newMachine, machine_id: m.id}); setMachineSearchTerm(''); }}
                                                     className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center"
                                                  >
                                                     <span className="break-words">{m.name}</span>
                                                     <span className="font-mono text-[9px] text-slate-400 flex-shrink-0 ml-1">{m.machine_code}</span>
                                                  </div>
                                               ))
                                            )}
                                         </div>
                                      )}
                                      
                                      {newMachine.machine_id && (
                                         <div className="text-xs font-medium text-blue-700 bg-blue-50 p-1.5 md:p-2 rounded flex items-center gap-1 md:gap-2">
                                            <Check className="w-3 h-3" />
                                            <span className="truncate">{availableMachines.find(m => m.id === newMachine.machine_id)?.name}</span>
                                         </div>
                                      )}
                                    </div>

                                    <div className="space-y-1.5 md:space-y-2">
                                       <Label className="text-xs">Usage Frequency</Label>
                                       <Select value={newMachine.usage_frequency} onValueChange={v => setNewMachine({...newMachine, usage_frequency: v})}>
                                          <SelectTrigger className="bg-white h-8 md:h-9 text-xs">
                                             <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-white">
                                             <SelectItem value="High" className="text-xs">High (Daily)</SelectItem>
                                             <SelectItem value="Medium" className="text-xs">Medium (Weekly)</SelectItem>
                                             <SelectItem value="Low" className="text-xs">Low (Monthly)</SelectItem>
                                             <SelectItem value="On Demand" className="text-xs">On Demand</SelectItem>
                                          </SelectContent>
                                       </Select>
                                    </div>
                                    
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 h-8 md:h-9 text-xs" onClick={handleAddMachine} disabled={!newMachine.machine_id}>Save</Button>
                                 </div>
                              </div>
                           )}

                           {/* Linked Machines */}
                           <div className="space-y-2 md:space-y-3">
                             {!part.machine_associations?.length ? (
                                !isAddingMachine && <div className="text-center py-6 md:py-8 text-slate-400 border-2 border-dashed rounded-xl text-xs md:text-sm">No machines</div>
                             ) : (
                                part.machine_associations.map(assoc => (
                                   <div key={assoc.id} className="p-2 md:p-4 border rounded-lg bg-white flex justify-between items-start md:items-center hover:shadow-sm transition-shadow gap-2">
                                      <div className="min-w-0">
                                         <div className="font-bold text-slate-800 text-sm md:text-base break-words">{assoc.machine?.name}</div>
                                         <div className="text-xs text-slate-500 font-mono">{assoc.machine?.machine_code}</div>
                                         <Badge variant="outline" className="mt-1 text-[8px] md:text-[10px]">{assoc.usage_frequency || "Std"}</Badge>
                                      </div>
                                      {isGodAdmin && (
                                         <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 h-7 w-7 md:h-8 md:w-8 flex-shrink-0" onClick={() => handleRemoveMachine(assoc.id)}>
                                            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
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
                        <CardHeader className="pb-2 md:pb-3">
                           <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
                              <Ruler className="w-4 md:w-5 h-4 md:h-5 text-blue-600" /> Specs
                           </h3>
                        </CardHeader>
                        <CardContent>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 text-xs md:text-sm">
                              <div className="border-b pb-2">
                                 <span className="block text-[9px] md:text-xs font-semibold text-slate-500 uppercase mb-1">Manufacturer</span>
                                 <span className="text-slate-800 font-medium">{part.manufacturer || "Unknown"}</span>
                              </div>
                              <div className="border-b pb-2">
                                 <span className="block text-[9px] md:text-xs font-semibold text-slate-500 uppercase mb-1">Unit</span>
                                 <span className="text-slate-800 font-medium capitalize">{part.unit_of_measure || "Each"}</span>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  </TabsContent>

                  {/* HISTORY TAB */}
                  <TabsContent value="history" className="mt-0">
                     <Card className="bg-white shadow-sm">
                        <CardHeader className="pb-2 md:pb-3">
                           <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
                              <History className="w-4 md:w-5 h-4 md:h-5 text-purple-600" /> History
                           </h3>
                        </CardHeader>
                        <CardContent className="text-xs md:text-sm">
                           {loadingHistory ? <LoadingSpinner /> : (
                              <div className="space-y-2 md:space-y-4">
                                 {history.length === 0 ? <div className="text-slate-500 text-center py-6 md:py-8">No history</div> :
                                 history.map((tx) => (
                                    <div 
                                      key={tx.id} 
                                      onClick={() => handleTransactionClick(tx)}
                                      className="flex gap-2 md:gap-4 pb-2 md:pb-4 border-b last:border-0 hover:bg-slate-50 p-1.5 md:p-2 rounded cursor-pointer transition-colors"
                                    >
                                       <div className="flex-1 min-w-0">
                                          <div className="font-semibold capitalize flex items-center gap-1 md:gap-2">
                                            {tx.transaction_type}
                                            <Eye className="w-3 h-3 md:w-4 md:h-4 text-slate-400 flex-shrink-0" />
                                          </div>
                                          <div className="text-[10px] md:text-xs text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</div>
                                          <div className="text-xs text-slate-600 break-words">{tx.notes}</div>
                                       </div>
                                       <div className={`font-bold flex-shrink-0 ${tx.transaction_type === 'usage' ? 'text-red-600' : 'text-green-600'}`}>
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

              {/* Footer */}
              <div className="p-2 md:p-4 bg-slate-50 border-t flex justify-end gap-1 md:gap-2 flex-shrink-0">
                 <Button variant="outline" size="sm" onClick={handleCloseClick} className="w-full md:w-auto bg-white h-8 md:h-9 text-xs md:text-sm">
                    <X className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Close
                 </Button>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      {part.photo_url && (
        <ImageViewer
          open={imageViewerOpen}
          imageUrl={part.photo_url}
          imageName={part.name}
          onClose={() => setImageViewerOpen(false)}
        />
      )}

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