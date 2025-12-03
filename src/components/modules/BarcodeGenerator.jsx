import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, Search, QrCode, Barcode as BarcodeIcon, RefreshCcw, 
  Download, FileText, CheckCircle, AlertCircle, Layers, PlusSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { dbService } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import ReactToPrint from 'react-to-print';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// --- SUB-COMPONENTS ---

const LabelPreview = ({ part, format = 'CODE128' }) => {
  if (!part) return null;

  const barcodeValue = part.barcode || part.part_number || 'NO-DATA';

  return (
    <div className="w-[380px] h-[240px] bg-white border border-slate-300 rounded p-4 flex flex-col justify-between relative shadow-sm mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg text-slate-900 line-clamp-2 leading-tight w-48">{part.name}</h3>
          <p className="text-xs text-slate-500 mt-1">{part.category} • {part.manufacturer}</p>
        </div>
        <div className="text-right">
           <div className="text-2xl font-bold text-slate-800">€{part.average_cost || 0}</div>
           <div className="text-xs text-slate-400">Unit Price</div>
        </div>
      </div>
      
      <div className="flex items-center justify-center py-2 flex-1">
         {format === 'QR' ? (
           <QRCodeSVG value={barcodeValue} size={100} level="H" />
         ) : (
           <Barcode value={barcodeValue} width={1.8} height={60} fontSize={14} />
         )}
      </div>

      <div className="flex justify-between items-end border-t pt-2">
         <div>
            <p className="text-[10px] text-slate-400 uppercase">Part Number</p>
            <p className="font-mono font-bold text-sm">{part.part_number}</p>
         </div>
         <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase">Location</p>
            <p className="font-mono font-bold text-sm">{part.warehouse?.name || 'Gen'} - {part.bin_location || 'N/A'}</p>
         </div>
      </div>
    </div>
  );
};

const PrintableLabels = React.forwardRef(({ parts, format }, ref) => {
  return (
    <div ref={ref} className="print-container p-4">
      <style type="text/css" media="print">
        {`
          @page { size: auto; margin: 0mm; }
          .print-container { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .label-item { page-break-inside: avoid; break-inside: avoid; border: 1px solid #ddd; margin-bottom: 10px; }
        `}
      </style>
      {parts.map(part => (
         <div key={part.id} className="label-item mb-4">
            <LabelPreview part={part} format={format} />
         </div>
      ))}
    </div>
  );
});

// --- MAIN COMPONENT ---

const BarcodeGenerator = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const printRef = useRef();
  
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: 'all', status: 'all' });
  const [format, setFormat] = useState('CODE128'); // CODE128, QR
  const [view, setView] = useState('list'); // list, print_queue
  const [printQueue, setPrintQueue] = useState([]);
  const [stats, setStats] = useState({ total: 0, withBarcode: 0, withoutBarcode: 0 });

  // Permissions
  const canGenerate = ['Admin', 'God Admin', 'Technical Director', 'Head Technician'].includes(userRole?.name);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    // Fetch parts
    const { data } = await dbService.getSpareParts(filters, 0, 1000);
    if (data) {
       setParts(data);
       
       // Calculate stats from full list (approximate if paginated, but here we fetched 1000)
       const total = data.length;
       const withBC = data.filter(p => p.barcode).length;
       setStats({ total, withBarcode: withBC, withoutBarcode: total - withBC });
    }
    setLoading(false);
  };

  const generateUniqueBarcode = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `SP-${timestamp}-${random}`;
  };

  const handleGenerateSingle = async (part) => {
    if (part.barcode) {
      const confirm = window.confirm("This part already has a barcode. Regenerate and overwrite?");
      if (!confirm) return;
    }

    const newBarcode = generateUniqueBarcode();
    try {
      await dbService.updatePartBarcode(part.id, newBarcode);
      toast({ title: "Generated", description: `New Barcode: ${newBarcode}` });
      
      // Update local state
      setParts(prev => prev.map(p => p.id === part.id ? { ...p, barcode: newBarcode } : p));
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate barcode." });
    }
  };

  const handleBulkGenerate = async () => {
    const targetIds = selectedIds.length > 0 ? selectedIds : parts.filter(p => !p.barcode).map(p => p.id);
    
    if (targetIds.length === 0) {
      toast({ title: "No Parts Selected", description: "Select parts or filter for parts without barcodes." });
      return;
    }

    if (!window.confirm(`Generate unique barcodes for ${targetIds.length} parts?`)) return;

    setLoading(true);
    let successCount = 0;

    for (const id of targetIds) {
       try {
         const newBarcode = generateUniqueBarcode();
         await dbService.updatePartBarcode(id, newBarcode);
         successCount++;
       } catch (e) { console.error(e); }
    }

    setLoading(false);
    toast({ title: "Batch Complete", description: `Generated ${successCount} barcodes.` });
    loadData();
    setSelectedIds([]);
  };

  const addToPrintQueue = (items) => {
    const newItems = items.filter(i => !printQueue.find(pq => pq.id === i.id));
    setPrintQueue([...printQueue, ...newItems]);
    setView('print_queue');
    toast({ title: "Added to Queue", description: `${newItems.length} labels added to print queue.` });
  };

  const exportToPDF = async () => {
    // This is a simplified PDF export. Real implementation might render hidden divs and canvas them.
    // For now, we'll use window.print() via ReactToPrint which is more reliable for labels.
    toast({ title: "Info", description: "For PDF, please use the 'Save as PDF' option in the print dialog." });
  };

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Barcode Generator</h1>
          <p className="text-slate-600 mt-1">Manage, generate, and print inventory labels</p>
        </div>
        <div className="flex gap-2">
           <Button 
             variant={view === 'list' ? 'default' : 'outline'}
             onClick={() => setView('list')}
           >
             <Layers className="w-4 h-4 mr-2" /> Parts List
           </Button>
           <Button 
             variant={view === 'print_queue' ? 'default' : 'outline'}
             onClick={() => setView('print_queue')}
             className="relative"
           >
             <Printer className="w-4 h-4 mr-2" /> Print Queue
             {printQueue.length > 0 && (
               <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                 {printQueue.length}
               </span>
             )}
           </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between">
            <div>
               <p className="text-slate-500 text-sm">Total Parts</p>
               <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Layers className="w-6 h-6" /></div>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between">
            <div>
               <p className="text-slate-500 text-sm">Barcoded</p>
               <p className="text-2xl font-bold text-green-600">{stats.withBarcode}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full text-green-600"><CheckCircle className="w-6 h-6" /></div>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between">
            <div>
               <p className="text-slate-500 text-sm">Missing Barcodes</p>
               <p className="text-2xl font-bold text-orange-600">{stats.withoutBarcode}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full text-orange-600"><AlertCircle className="w-6 h-6" /></div>
         </div>
      </div>

      {/* Content Area */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
           {/* Toolbar */}
           <div className="p-4 border-b bg-slate-50 flex flex-wrap gap-4 justify-between items-center">
              <div className="flex gap-2 items-center flex-1 min-w-[300px]">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      className="w-full pl-9 pr-4 py-2 text-sm border rounded-md"
                      placeholder="Search parts..."
                      value={filters.search}
                      onChange={e => setFilters({...filters, search: e.target.value})}
                    />
                 </div>
                 <select 
                   className="p-2 text-sm border rounded-md bg-white"
                   value={filters.status}
                   onChange={e => setFilters({...filters, status: e.target.value})}
                 >
                   <option value="all">All Status</option>
                   <option value="missing">Missing Barcode</option>
                   <option value="has">Has Barcode</option>
                 </select>
              </div>

              <div className="flex gap-2">
                 {canGenerate && (
                   <Button onClick={handleBulkGenerate} disabled={selectedIds.length === 0 && filters.status !== 'missing'} className="bg-teal-600 hover:bg-teal-700">
                      <RefreshCcw className="w-4 h-4 mr-2" /> Generate {selectedIds.length > 0 ? `(${selectedIds.length})` : 'All Missing'}
                   </Button>
                 )}
                 <Button variant="secondary" onClick={() => addToPrintQueue(parts.filter(p => selectedIds.includes(p.id)))} disabled={selectedIds.length === 0}>
                    <PlusSquare className="w-4 h-4 mr-2" /> Add to Queue
                 </Button>
              </div>
           </div>

           {/* Table */}
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-500 uppercase font-medium text-xs">
                    <tr>
                       <th className="p-4 w-10"><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? parts.map(p => p.id) : [])} checked={selectedIds.length === parts.length && parts.length > 0} /></th>
                       <th className="p-4">Part Details</th>
                       <th className="p-4">Category</th>
                       <th className="p-4">Barcode</th>
                       <th className="p-4">Status</th>
                       <th className="p-4 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {loading ? (
                       <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr>
                    ) : parts.length === 0 ? (
                       <tr><td colSpan={6} className="p-8 text-center text-slate-400">No parts found.</td></tr>
                    ) : parts.filter(p => filters.status === 'all' || (filters.status === 'missing' ? !p.barcode : p.barcode)).map(part => (
                       <tr key={part.id} className="hover:bg-slate-50">
                          <td className="p-4">
                             <input 
                               type="checkbox" 
                               checked={selectedIds.includes(part.id)}
                               onChange={e => {
                                  if(e.target.checked) setSelectedIds([...selectedIds, part.id]);
                                  else setSelectedIds(selectedIds.filter(id => id !== part.id));
                               }}
                             />
                          </td>
                          <td className="p-4">
                             <div className="font-bold text-slate-800">{part.name}</div>
                             <div className="text-xs text-slate-500">{part.part_number}</div>
                          </td>
                          <td className="p-4 text-slate-600">{part.category}</td>
                          <td className="p-4 font-mono text-slate-700">{part.barcode || '-'}</td>
                          <td className="p-4">
                             {part.barcode ? 
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1"/> Active</span> : 
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"><AlertCircle className="w-3 h-3 mr-1"/> Missing</span>
                             }
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                             {canGenerate && (
                               <Button size="sm" variant="ghost" onClick={() => handleGenerateSingle(part)} title="Generate/Regenerate">
                                  <RefreshCcw className="w-4 h-4 text-blue-600" />
                               </Button>
                             )}
                             <Button size="sm" variant="ghost" onClick={() => addToPrintQueue([part])} title="Add to Print Queue">
                                <Printer className="w-4 h-4 text-slate-600" />
                             </Button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {view === 'print_queue' && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white rounded-xl shadow-lg border p-6">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-xl font-bold text-slate-800">Print Preview ({printQueue.length} items)</h2>
                     <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                           <button onClick={() => setFormat('CODE128')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${format === 'CODE128' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Code 128</button>
                           <button onClick={() => setFormat('QR')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${format === 'QR' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>QR Code</button>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => setPrintQueue([])} disabled={printQueue.length === 0}>Clear</Button>
                     </div>
                  </div>

                  {printQueue.length === 0 ? (
                     <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed">
                        <Printer className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-400">Queue is empty. Add parts from the list.</p>
                     </div>
                  ) : (
                     <div className="space-y-4 max-h-[600px] overflow-y-auto p-4 bg-slate-50 rounded-lg border">
                        {printQueue.map((item, idx) => (
                           <div key={`${item.id}-${idx}`} className="relative group">
                              <LabelPreview part={item} format={format} />
                              <button 
                                onClick={() => setPrintQueue(printQueue.filter((_, i) => i !== idx))}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                              >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            <div className="space-y-6">
               <div className="bg-white rounded-xl shadow-lg border p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Print Settings</h3>
                  
                  <div className="space-y-4">
                     <div>
                        <label className="text-sm font-medium text-slate-600">Printer Type</label>
                        <select className="w-full mt-1 p-2 border rounded-md bg-white">
                           <option>Thermal (4x6 inch)</option>
                           <option>A4 Sheet (Avery)</option>
                        </select>
                     </div>
                     
                     <div className="pt-4 border-t">
                        <ReactToPrint
                          trigger={() => <Button className="w-full bg-slate-900 hover:bg-slate-800" disabled={printQueue.length === 0}><Printer className="w-4 h-4 mr-2" /> Print Now</Button>}
                          content={() => printRef.current}
                        />
                        <Button variant="outline" className="w-full mt-2" onClick={exportToPDF} disabled={printQueue.length === 0}>
                           <FileText className="w-4 h-4 mr-2" /> Save as PDF
                        </Button>
                     </div>
                  </div>
               </div>

               {/* Hidden Printable Component */}
               <div className="hidden">
                  <PrintableLabels ref={printRef} parts={printQueue} format={format} />
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default BarcodeGenerator;