import React, { useState, useEffect } from 'react';
import { 
  BookOpen, LayoutDashboard, Package, Wrench, Truck, ScanLine, 
  QrCode, Users, AlertTriangle, FileText, TrendingUp, Shield, 
  Smartphone, Keyboard, HelpCircle, Printer, FolderOpen, Upload, 
  Trash2, Download, File, Search, Plus, ChevronRight, Clock,
  Zap, AlertCircle, CheckCircle, BarChart3
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { dbService } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const DocSection = ({ title, icon: Icon, children }) => (
  <div className="mb-12 scroll-mt-20" id={title.toLowerCase().replace(/\s+/g, '-')}>
    <div className="flex items-center gap-3 mb-4 border-b pb-2">
      <div className="p-2 bg-teal-100 rounded-lg text-teal-700">
        <Icon className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
    </div>
    <div className="prose max-w-none text-slate-600 leading-relaxed">
      {children}
    </div>
  </div>
);

const Step = ({ num, title, children }) => (
  <div className="flex gap-4 mb-6">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
      {num}
    </div>
    <div>
      <h4 className="font-bold text-slate-800 mb-1">{title}</h4>
      <p className="text-sm text-slate-600">{children}</p>
    </div>
  </div>
);

const Documentation = () => {
  const [activeTab, setActiveTab] = useState('repository');
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const isGodAdmin = userRole?.name === 'God Admin' || userRole?.name === 'Technical Director';

  // File Repository
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [filters, setFilters] = useState({ search: '', category_id: 'all' });

  // Catalogs
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineParts, setMachineParts] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Forms
  const [forms, setForms] = useState([
    { id: 1, name: 'Downtime Report Form', icon: AlertTriangle, category: 'Operations', description: 'Log machine downtime incidents' },
    { id: 2, name: 'Part Replacement Form', icon: Wrench, category: 'Maintenance', description: 'Document part installation and removal' },
    { id: 3, name: 'Order Request Form', icon: Truck, category: 'Procurement', description: 'Request new parts to be ordered' },
    { id: 4, name: 'Maintenance Schedule', icon: Clock, category: 'Planning', description: 'Preventive maintenance calendar' },
    { id: 5, name: 'Safety Checklist', icon: CheckCircle, category: 'Safety', description: 'Daily safety inspection form' },
  ]);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', description: '', category_id: '', file: null });

  useEffect(() => {
    if (activeTab === 'repository') {
      loadDocuments();
    } else if (activeTab === 'catalog') {
      loadCatalog();
    }
  }, [activeTab, filters]);

  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      const [docsRes, catsRes] = await Promise.all([
        dbService.getDocuments(filters),
        dbService.getDocumentCategories()
      ]).catch(err => {
        console.warn('Document load error:', err);
        return [{ data: [] }, { data: [] }];
      });
      setDocuments(docsRes?.data || []);
      setCategories(catsRes?.data || []);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load documents." });
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const machinesRes = await dbService.getMachines({}, 0, 100);
      setMachines(machinesRes?.data || []);
      if (machinesRes?.data?.length > 0) {
        setSelectedMachine(machinesRes.data[0]);
        loadMachineParts(machinesRes.data[0].id);
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load machines." });
    } finally {
      setLoadingCatalog(false);
    }
  };

  const loadMachineParts = async (machineId) => {
    try {
      const partsRes = await dbService.getSpareParts({ machine_id: machineId }, 0, 100);
      setMachineParts(partsRes?.data || []);
    } catch (error) {
      console.error('Error loading machine parts:', error);
      setMachineParts([]);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!newDoc.file || !newDoc.name || !newDoc.category_id) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please fill all required fields." });
      return;
    }

    setUploading(true);
    try {
      const { error } = await dbService.uploadDocument(newDoc.file, {
        name: newDoc.name,
        description: newDoc.description,
        category_id: newDoc.category_id,
        uploaded_by: user.id
      });

      if (error) throw error;

      toast({ title: "Success", description: "Document uploaded successfully." });
      setIsUploadOpen(false);
      setNewDoc({ name: '', description: '', category_id: '', file: null });
      loadDocuments();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const { error } = await dbService.deleteDocument(doc.id, doc.file_path);
      if (error) throw error;
      toast({ title: "Deleted", description: "Document removed." });
      loadDocuments();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete document." });
    }
  };

  const handleDownload = async (doc) => {
    try {
      const url = await dbService.getDocumentUrl(doc.file_path);
      window.open(url, '_blank');
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not get download link." });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const sidebarLinks = [
    { id: 'repository', label: 'File Repository', icon: FolderOpen },
    { id: 'catalog', label: 'Spare Parts Catalog', icon: Package },
    { id: 'forms', label: 'Forms Library', icon: FileText },
    { id: 'modules', label: 'Module Guide', icon: LayoutDashboard },
    { id: 'workflows', label: 'Step-by-Step', icon: ScanLine },
    { id: 'roles', label: 'Access & Roles', icon: Shield },
    { id: 'tips', label: 'Tips & Tricks', icon: HelpCircle },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Doc Sidebar */}
      <div className="w-64 flex-shrink-0 bg-white rounded-xl shadow-sm border overflow-hidden h-full flex flex-col">
        <div className="p-4 bg-slate-50 border-b">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Documentation
          </h3>
        </div>
        <div className="p-2 space-y-1 flex-1 overflow-y-auto">
          {sidebarLinks.map(link => (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === link.id 
                  ? 'bg-teal-50 text-teal-700' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border h-full overflow-hidden flex flex-col">
        
        {/* --- FILE REPOSITORY TAB --- */}
        {activeTab === 'repository' && (
          <div className="flex flex-col h-full">
             <div className="p-6 border-b flex justify-between items-end gap-4 bg-slate-50/50">
                <div>
                   <h1 className="text-2xl font-bold text-slate-900">File Repository</h1>
                   <p className="text-slate-500 mt-1">Centralized storage for manuals, forms, and catalogues.</p>
                </div>
                {isGodAdmin && (
                  <Button onClick={() => setIsUploadOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                     <Upload className="w-4 h-4 mr-2" /> Upload File
                  </Button>
                )}
             </div>
             
             <div className="p-4 border-b flex gap-4 items-center bg-white">
                <div className="relative flex-1 max-w-md">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <Input 
                      placeholder="Search documents..." 
                      className="pl-9" 
                      value={filters.search}
                      onChange={e => setFilters({...filters, search: e.target.value})}
                   />
                </div>
                <Select value={filters.category_id} onValueChange={v => setFilters({...filters, category_id: v})}>
                  <SelectTrigger className="w-[200px]">
                     <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">All Categories</SelectItem>
                     {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
             </div>

             <div className="flex-1 overflow-hidden p-4 bg-slate-50/30">
                {loadingDocs ? <LoadingSpinner message="Loading files..." /> : (
                  <ScrollArea className="h-full">
                     {documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed rounded-xl m-4">
                           <FolderOpen className="w-12 h-12 mb-2 opacity-20" />
                           <p>No documents found.</p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {documents.map(doc => (
                              <div key={doc.id} className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow flex flex-col">
                                 <div className="flex items-start justify-between mb-2">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                       <FileText className="w-6 h-6" />
                                    </div>
                                    {isGodAdmin && (
                                       <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 -mt-1 -mr-1" onClick={() => handleDelete(doc)}>
                                          <Trash2 className="w-4 h-4" />
                                       </Button>
                                    )}
                                 </div>
                                 <h3 className="font-bold text-slate-800 mb-1 line-clamp-1" title={doc.name}>{doc.name}</h3>
                                 <p className="text-xs text-slate-500 mb-3 line-clamp-2 min-h-[2.5em]">{doc.description || 'No description provided.'}</p>
                                 
                                 <div className="mt-auto pt-3 border-t flex items-center justify-between text-xs text-slate-400">
                                    <span>{formatFileSize(doc.file_size)}</span>
                                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                 </div>
                                 <div className="mt-3">
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleDownload(doc)}>
                                       <Download className="w-3 h-3 mr-2" /> Download
                                    </Button>
                                 </div>
                                 <div className="mt-2 text-[10px] text-center text-slate-400 bg-slate-50 py-1 rounded">
                                    {doc.category?.name}
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </ScrollArea>
                )}
             </div>
          </div>
        )}

        {/* --- SPARE PARTS CATALOG TAB --- */}
        {activeTab === 'catalog' && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b bg-slate-50/50">
              <h1 className="text-2xl font-bold text-slate-900">Spare Parts Catalog by Machine</h1>
              <p className="text-slate-500 mt-1">Browse compatible parts for each machine</p>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Machine List */}
              <div className="w-64 border-r overflow-y-auto bg-slate-50">
                <div className="p-3 border-b bg-white sticky top-0 z-10">
                  <p className="text-xs font-semibold text-slate-600 uppercase">Machines ({machines.length})</p>
                </div>
                {loadingCatalog ? (
                  <div className="p-4"><LoadingSpinner size="sm" message="Loading..." /></div>
                ) : (
                  <div className="space-y-1 p-2">
                    {machines.map(machine => (
                      <button
                        key={machine.id}
                        onClick={() => {
                          setSelectedMachine(machine);
                          loadMachineParts(machine.id);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedMachine?.id === machine.id
                            ? 'bg-teal-100 text-teal-700 font-medium'
                            : 'text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <div className="font-medium truncate">{machine.name}</div>
                        <div className="text-xs opacity-75">{machine.machine_code}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Parts for Selected Machine */}
              <div className="flex-1 flex flex-col">
                {selectedMachine ? (
                  <>
                    <div className="p-4 border-b bg-white sticky top-0 z-10">
                      <h2 className="text-lg font-bold text-slate-900">{selectedMachine.name}</h2>
                      <p className="text-sm text-slate-500">Code: {selectedMachine.machine_code}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {loadingCatalog ? (
                        <LoadingSpinner message="Loading parts..." />
                      ) : machineParts.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-slate-400">
                          <div className="text-center">
                            <Package className="w-12 h-12 mx-auto opacity-20 mb-2" />
                            <p>No parts found for this machine</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {machineParts.map(part => (
                            <div key={part.id} className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="font-bold text-slate-900">{part.name}</h3>
                                  <p className="text-xs text-slate-500">SKU: {part.sku}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  part.quantity > part.reorder_point
                                    ? 'bg-green-100 text-green-700'
                                    : part.quantity > part.min_quantity
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  Stock: {part.quantity}
                                </span>
                              </div>
                              <div className="text-sm text-slate-600 grid grid-cols-2 gap-2">
                                <div>Category: {part.category}</div>
                                <div>Price: €{part.unit_price?.toFixed(2) || 'N/A'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <Wrench className="w-12 h-12 mx-auto opacity-20 mb-2" />
                      <p>Select a machine to view parts</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- FORMS LIBRARY TAB --- */}
        {activeTab === 'forms' && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b bg-slate-50/50">
              <h1 className="text-2xl font-bold text-slate-900">Forms Library</h1>
              <p className="text-slate-500 mt-1">Access templates and forms for daily operations</p>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
                {forms.map(form => {
                  const FormIcon = form.icon;
                  return (
                    <div key={form.id} className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <FormIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-teal-600">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">{form.name}</h3>
                      <p className="text-xs text-slate-500 mb-3">{form.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded">{form.category}</span>
                        <Button variant="outline" size="sm" className="text-teal-600 hover:text-teal-700">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* --- STATIC DOCUMENTATION --- */}
        {activeTab !== 'repository' && activeTab !== 'catalog' && activeTab !== 'forms' && (
          <div className="h-full overflow-hidden p-8">
            <ScrollArea className="h-full pr-4">
              
              {activeTab === 'modules' && (
                <div className="space-y-8 max-w-4xl">
                  <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Module Documentation</h1>
                    <p className="text-xl text-slate-500">Detailed breakdown of every feature in the WMS.</p>
                  </div>

                  <DocSection title="Dashboard" icon={LayoutDashboard}>
                    <p className="mb-4">The dashboard automatically adjusts based on your role:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>CEO / Executive:</strong> High-level financial KPIs, inventory valuation, and savings analysis.</li>
                      <li><strong>Technical Director:</strong> Operational overview, low stock alerts, and management tools.</li>
                      <li><strong>Building Tech:</strong> Quick actions for scanning, logging downtime, and checking machines.</li>
                    </ul>
                  </DocSection>

                  <DocSection title="Spare Parts" icon={Package}>
                    <p className="mb-4">The central inventory database. Parts are color-coded by stock status:</p>
                    <ul className="list-disc pl-5 space-y-2 mb-4">
                      <li><span className="text-green-600 font-bold">OK</span>: Quantity above reorder point.</li>
                      <li><span className="text-yellow-600 font-bold">Low Stock</span>: Below reorder point but above minimum.</li>
                      <li><span className="text-red-600 font-bold">Critical</span>: Below minimum safety stock.</li>
                    </ul>
                    <p><strong>Features:</strong> Full CRUD (Create, Read, Update, Delete), search by name/barcode, and filter by category/building.</p>
                  </DocSection>

                  <DocSection title="Orders" icon={Truck}>
                    <p className="mb-4">Procurement workflow management. Supports a strict lifecycle:</p>
                    <div className="flex items-center gap-2 text-sm mb-4 bg-slate-50 p-3 rounded border flex-wrap">
                      <span className="px-2 py-1 bg-slate-200 rounded">Draft</span>
                      <span>→</span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Pending Approval</span>
                      <span>→</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Approved</span>
                      <span>→</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Ordered</span>
                      <span>→</span>
                      <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded">Received</span>
                    </div>
                  </DocSection>

                  <DocSection title="Scanner" icon={ScanLine}>
                    <p>Two modes available:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>Camera Mode:</strong> Uses device camera (requires HTTPS). Scans QR Codes best, limited Code-128 support depending on camera resolution.</li>
                      <li><strong>USB Mode:</strong> For handheld laser scanners. Focus stays in the input field automatically. Pressing 'Enter' on the scanner triggers the lookup.</li>
                    </ul>
                  </DocSection>
                </div>
              )}

              {activeTab === 'workflows' && (
                <div className="space-y-8 max-w-4xl">
                   <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Step-by-Step Workflows</h1>
                    <p className="text-xl text-slate-500">Common tasks and how to perform them efficiently.</p>
                  </div>

                  <DocSection title="Creating an Order" icon={Truck}>
                    <Step num="1" title="Start Order">Navigate to <strong>Orders</strong> and click <strong>New Order</strong>.</Step>
                    <Step num="2" title="Select Supplier">Choose a supplier from the list. Only parts linked to this supplier will be available.</Step>
                    <Step num="3" title="Add Items">Click "+" on parts in the left panel. Adjust quantities in the right panel.</Step>
                    <Step num="4" title="Submit">Click <strong>Submit for Approval</strong>. Status changes to 'Pending Approval'.</Step>
                  </DocSection>

                  <DocSection title="Logging Downtime" icon={AlertTriangle}>
                     <Step num="1" title="Open Log">Go to <strong>Downtime Logs</strong> and click <strong>Log Event</strong>.</Step>
                     <Step num="2" title="Select Machine">Choose the affected machine. This links the cost to that specific asset.</Step>
                     <Step num="3" title="Enter Details">Set Start Time (when it broke) and End Time (when fixed). Duration is auto-calculated.</Step>
                  </DocSection>
                </div>
              )}

              {activeTab === 'roles' && (
                <div className="space-y-8 max-w-4xl">
                  <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Roles & Permissions</h1>
                    <p className="text-xl text-slate-500">Understanding what you can see and do.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="bg-slate-50 p-6 rounded-xl border">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-purple-600"/> God Admin / CEO</h3>
                        <ul className="list-disc pl-5 text-sm space-y-1 text-slate-600">
                           <li>View Executive Dashboards</li>
                           <li>Approve/Reject Orders</li>
                           <li>Full CRUD on all modules</li>
                           <li>Manage Documents</li>
                        </ul>
                     </div>
                     <div className="bg-slate-50 p-6 rounded-xl border">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Wrench className="w-5 h-5 text-blue-600"/> Technical Director</h3>
                        <ul className="list-disc pl-5 text-sm space-y-1 text-slate-600">
                           <li>View Technical Dashboard</li>
                           <li>Approve Orders</li>
                           <li>Manage Machines & Parts</li>
                           <li>Upload Documents</li>
                        </ul>
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'tips' && (
                <div className="space-y-8 max-w-4xl">
                   <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Tips & Troubleshooting</h1>
                    <p className="text-xl text-slate-500">Get the most out of the WMS.</p>
                  </div>
                  <DocSection title="Mobile Optimization" icon={Smartphone}>
                     <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Landscape Mode:</strong> Tables (like Inventory) are best viewed in landscape on tablets.</li>
                        <li><strong>PWA:</strong> Add this page to your Home Screen for a full-screen app experience.</li>
                     </ul>
                  </DocSection>
                </div>
              )}
            
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="bg-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFileUpload} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-name">Document Name</Label>
              <Input 
                id="doc-name" 
                placeholder="e.g. Hydraulic Pump Manual 2024"
                value={newDoc.name}
                onChange={e => setNewDoc({...newDoc, name: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="doc-category">Category</Label>
              <Select value={newDoc.category_id} onValueChange={v => setNewDoc({...newDoc, category_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category..." />
                </SelectTrigger>
                <SelectContent>
                   {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-desc">Description (Optional)</Label>
              <Input 
                id="doc-desc" 
                placeholder="Brief description of contents"
                value={newDoc.description}
                onChange={e => setNewDoc({...newDoc, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-file">File</Label>
              <Input 
                id="doc-file" 
                type="file"
                onChange={e => setNewDoc({...newDoc, file: e.target.files[0]})}
                required
                className="cursor-pointer"
              />
              <p className="text-xs text-slate-500">Supported: PDF, DOCX, XLSX, JPG, PNG</p>
            </div>

            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
               <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={uploading}>
                  {uploading && <LoadingSpinner className="w-4 h-4 mr-2 animate-spin" />}
                  {uploading ? 'Uploading...' : 'Upload'}
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documentation;