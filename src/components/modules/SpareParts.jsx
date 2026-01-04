import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, RefreshCw, MoreHorizontal, Box, RotateCcw, Settings,
  Download, Copy, FileText, AlertCircle, ShoppingCart, X, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { dbService } from '@/lib/supabase';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { getStockStatus } from '@/utils/calculations';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as Dialog from '@radix-ui/react-dialog';

// Imported Components
import PartCard from './spare-parts/PartCard';
import PartDetailsModal from './spare-parts/PartDetailsModal';
import PartForm from './spare-parts/PartForm';
import CategoryManager from './spare-parts/CategoryManager';

// --- REORDER MODAL COMPONENT (WITH CORRECT SUPPLIERS TABLE SCHEMA) ---
const ReorderModal = ({ open, onOpenChange, parts, onPartClick }) => {
  const [selectedParts, setSelectedParts] = useState([]);
  const [copiedPart, setCopiedPart] = useState(null);
  const [expandedSuppliers, setExpandedSuppliers] = useState({});
  const [partsWithSuppliers, setPartsWithSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const { toast } = useToast();

  // Fetch supplier data for all parts
  useEffect(() => {
    if (open && parts.length > 0) {
      loadPartsWithSuppliers();
    }
  }, [open, parts]);

  const loadPartsWithSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      // Get all part IDs
      const partIds = parts.map(p => p.id);
      
      // Query the junction table with supplier details
      // Using exact columns from suppliers table schema
      const { data, error } = await supabase
        .from('part_supplier_options')
        .select(`
          id,
          part_id,
          unit_price,
          lead_time_days,
          is_preferred,
          supplier:suppliers(
            id, 
            name, 
            contact_person,
            email,
            phone,
            address,
            is_oem,
            quality_score,
            delivery_score,
            price_stability_score
          )
        `)
        .in('part_id', partIds);

      if (error) throw error;

      // Map suppliers to parts
      const supplierMap = {};
      if (data) {
        data.forEach(option => {
          if (!supplierMap[option.part_id]) {
            supplierMap[option.part_id] = [];
          }
          supplierMap[option.part_id].push({
            ...option.supplier,
            unit_price: option.unit_price,
            is_preferred: option.is_preferred,
            lead_time_days: option.lead_time_days
          });
        });
      }

      // Merge supplier data with parts
      const enrichedParts = parts.map(part => ({
        ...part,
        suppliers: supplierMap[part.id] || []
      }));

      setPartsWithSuppliers(enrichedParts);

      // Pre-select all parts
      setSelectedParts(enrichedParts.map(p => p.id));

      // Expand all supplier groups by default
      const suppliers = {};
      enrichedParts.forEach(p => {
        p.suppliers.forEach(s => {
          suppliers[s.name] = true;
        });
      });
      setExpandedSuppliers(suppliers);

    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load supplier information"
      });
    } finally {
      setLoadingSuppliers(false);
    }
  };

  // Group parts by supplier (preferred supplier for each part)
  const groupedBySupplier = () => {
    const groups = {};
    const reorderParts = partsWithSuppliers.filter(p => selectedParts.includes(p.id));
    
    reorderParts.forEach(part => {
      // Get preferred supplier or first supplier
      let preferredSupplier = part.suppliers.find(s => s.is_preferred);
      if (!preferredSupplier && part.suppliers.length > 0) {
        preferredSupplier = part.suppliers[0];
      }

      const supplierName = preferredSupplier?.name || 'No Supplier';
      if (!groups[supplierName]) {
        groups[supplierName] = [];
      }
      groups[supplierName].push({
        ...part,
        selectedSupplier: preferredSupplier
      });
    });

    return groups;
  };

  const getReorderParts = () => {
    return partsWithSuppliers.filter(p => selectedParts.includes(p.id));
  };

  const generateTableFormat = (supplier = null) => {
    let reorderParts = getReorderParts();
    if (supplier) {
      reorderParts = reorderParts.filter(p => {
        const preferred = p.suppliers.find(s => s.is_preferred) || p.suppliers[0];
        return (preferred?.name || 'No Supplier') === supplier;
      });
    }

    const rows = reorderParts.map(p => {
      const preferred = p.suppliers.find(s => s.is_preferred) || p.suppliers[0];
      return [
        p.part_number || '-',
        p.name,
        p.category || '-',
        p.current_quantity,
        p.reorder_point,
        Math.max(0, p.reorder_point - p.current_quantity),
        preferred?.unit_price || p.unit_cost || '0.00'
      ];
    });

    return {
      header: ['Part Number', 'Name', 'Category', 'Current Qty', 'Reorder Point', 'Qty Needed', 'Unit Cost'],
      rows
    };
  };

  const generateCSV = (supplier = null) => {
    const { header, rows } = generateTableFormat(supplier);
    const csvContent = [
      header.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    return csvContent;
  };

  const generateList = (supplier = null) => {
    let reorderParts = getReorderParts();
    if (supplier) {
      reorderParts = reorderParts.filter(p => {
        const preferred = p.suppliers.find(s => s.is_preferred) || p.suppliers[0];
        return (preferred?.name || 'No Supplier') === supplier;
      });
    }
    return reorderParts.map(p => {
      const qtyNeeded = Math.max(0, p.reorder_point - p.current_quantity);
      const preferred = p.suppliers.find(s => s.is_preferred) || p.suppliers[0];
      return `${p.part_number || '-'} | ${p.name} | Qty: ${qtyNeeded} | Unit Cost: €${(preferred?.unit_price || p.unit_cost || 0).toFixed(2)}`;
    }).join('\n');
  };

  const generateHTML = (supplier = null) => {
    const { header, rows } = generateTableFormat(supplier);
    let reorderParts = getReorderParts();
    if (supplier) {
      reorderParts = reorderParts.filter(p => {
        const preferred = p.suppliers.find(s => s.is_preferred) || p.suppliers[0];
        return (preferred?.name || 'No Supplier') === supplier;
      });
    }
    const total = reorderParts.reduce((sum, p) => {
      const qtyNeeded = Math.max(0, p.reorder_point - p.current_quantity);
      const preferred = p.suppliers.find(s => s.is_preferred) || p.suppliers[0];
      return sum + (qtyNeeded * (preferred?.unit_price || p.unit_cost || 0));
    }, 0);

    let html = `
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: Arial;">
  <thead>
    <tr style="background-color: #f0f0f0; font-weight: bold;">
      ${header.map(h => `<th>${h}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
    ${rows.map((row, idx) => `
      <tr style="background-color: ${idx % 2 ? '#ffffff' : '#f9f9f9'};">
        ${row.map(cell => `<td>${cell}</td>`).join('')}
      </tr>
    `).join('')}
  </tbody>
</table>
<p style="margin-top: 20px; font-weight: bold;">Total Estimated Cost: €${total.toFixed(2)}</p>
<p>Supplier: ${supplier || 'All Suppliers'}</p>
<p>Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    `;
    return html;
  };

  const handleCopyToClipboard = (format, supplier = null) => {
    let content = '';
    switch (format) {
      case 'csv':
        content = generateCSV(supplier);
        break;
      case 'list':
        content = generateList(supplier);
        break;
      case 'table':
        content = generateTableFormat(supplier).rows.map(row => row.join('\t')).join('\n');
        break;
      default:
        content = '';
    }

    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: "Copied!",
        description: `${supplier ? `${supplier} - ` : ''}Items copied to clipboard`
      });
      setCopiedPart(format);
      setTimeout(() => setCopiedPart(null), 2000);
    }).catch(() => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy to clipboard"
      });
    });
  };

  const handleDownloadCSV = (supplier = null) => {
    const csv = generateCSV(supplier);
    const element = document.createElement('a');
    const filename = supplier 
      ? `reorder-${supplier}-${new Date().toISOString().split('T')[0]}.csv`
      : `reorder-list-${new Date().toISOString().split('T')[0]}.csv`;
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: "Downloaded!",
      description: "CSV file downloaded successfully"
    });
  };

  const handleDownloadHTML = (supplier = null) => {
    const html = generateHTML(supplier);
    const element = document.createElement('a');
    const filename = supplier
      ? `reorder-${supplier}-${new Date().toISOString().split('T')[0]}.html`
      : `reorder-list-${new Date().toISOString().split('T')[0]}.html`;
    const blob = new Blob([html], { type: 'text/html' });
    element.setAttribute('href', URL.createObjectURL(blob));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: "Downloaded!",
      description: "HTML file downloaded successfully"
    });
  };

  const togglePartSelection = (partId) => {
    setSelectedParts(prev =>
      prev.includes(partId)
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
  };

  const toggleSupplierExpanded = (supplier) => {
    setExpandedSuppliers(prev => ({
      ...prev,
      [supplier]: !prev[supplier]
    }));
  };

  const groupedParts = groupedBySupplier();
  const reorderParts = getReorderParts();
  const totalEstimatedCost = reorderParts.reduce((sum, p) => {
    const qtyNeeded = Math.max(0, p.reorder_point - p.current_quantity);
    const preferred = p.suppliers.find(s => s.is_preferred) || p.suppliers[0];
    return sum + (qtyNeeded * (preferred?.unit_price || p.unit_cost || 0));
  }, 0);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <Dialog.Content className="w-full h-screen sm:h-auto sm:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-lg overflow-y-auto sm:max-h-[90vh]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <Dialog.Title className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-3">
                <ShoppingCart className="h-6 w-6 text-teal-600" />
                Reorder Management
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {loadingSuppliers ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-600">Items to Reorder</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-teal-600">{reorderParts.length}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-600">Total Quantity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-slate-900">
                        {reorderParts.reduce((sum, p) => sum + Math.max(0, p.reorder_point - p.current_quantity), 0)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-600">Suppliers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-slate-900">
                        {Object.keys(groupedParts).length}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-teal-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-600">Est. Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-teal-600">€{totalEstimatedCost.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Suppliers Grouped Items */}
                <div className="space-y-4 mb-6">
                  {Object.entries(groupedParts).length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 rounded-lg">
                      <p className="text-slate-600">No items to reorder</p>
                    </div>
                  ) : (
                    Object.entries(groupedParts).map(([supplier, supplierParts]) => {
                      const supplierTotal = supplierParts.reduce((sum, p) => {
                        const qtyNeeded = Math.max(0, p.reorder_point - p.current_quantity);
                        const preferred = p.selectedSupplier;
                        return sum + (qtyNeeded * (preferred?.unit_price || p.unit_cost || 0));
                      }, 0);

                      return (
                        <div key={supplier} className="border border-slate-200 rounded-lg overflow-hidden">
                          {/* Supplier Header */}
                          <button
                            onClick={() => toggleSupplierExpanded(supplier)}
                            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-teal-50 hover:from-teal-100 hover:to-teal-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 text-left">
                              {expandedSuppliers[supplier] ? (
                                <ChevronUp className="h-5 w-5 text-teal-600" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-teal-600" />
                              )}
                              <div className="flex-1">
                                <h3 className="font-bold text-slate-900 text-lg">{supplier}</h3>
                                <p className="text-xs text-slate-600">
                                  {supplierParts.length} items • €{supplierTotal.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Quick Export Buttons */}
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyToClipboard('list', supplier);
                                }}
                                className="p-2 text-slate-600 hover:bg-white rounded transition-colors"
                                title="Copy list"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadCSV(supplier);
                                }}
                                className="p-2 text-slate-600 hover:bg-white rounded transition-colors"
                                title="Download CSV"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </button>

                          {/* Supplier Items */}
                          {expandedSuppliers[supplier] && (
                            <div className="max-h-96 overflow-y-auto border-t">
                              <table className="w-full text-xs sm:text-sm">
                                <thead className="bg-slate-50 sticky top-0">
                                  <tr>
                                    <th className="px-4 py-3 text-left">
                                      <input
                                        type="checkbox"
                                        checked={supplierParts.every(p => selectedParts.includes(p.id))}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedParts(prev => [...new Set([...prev, ...supplierParts.map(p => p.id)])]);
                                          } else {
                                            setSelectedParts(prev => prev.filter(id => !supplierParts.find(p => p.id === id)));
                                          }
                                        }}
                                        className="rounded"
                                      />
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Part #</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Name</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Current</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Needed</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Cost</th>
                                    <th className="px-4 py-3 text-center font-semibold text-slate-900">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {supplierParts.map((part, idx) => {
                                    const qtyNeeded = Math.max(0, part.reorder_point - part.current_quantity);
                                    const totalCost = qtyNeeded * (part.selectedSupplier?.unit_price || part.unit_cost || 0);
                                    return (
                                      <tr key={part.id} className={`border-b ${idx % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                                        <td className="px-4 py-3">
                                          <input
                                            type="checkbox"
                                            checked={selectedParts.includes(part.id)}
                                            onChange={() => togglePartSelection(part.id)}
                                            className="rounded"
                                          />
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-900">{part.part_number || '-'}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900">{part.name}</td>
                                        <td className="px-4 py-3">
                                          <Badge variant={part.current_quantity <= 0 ? 'destructive' : 'secondary'}>
                                            {part.current_quantity}
                                          </Badge>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-teal-600">{qtyNeeded}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900">€{totalCost.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-center">
                                          <button
                                            onClick={() => onPartClick(part)}
                                            className="p-2 text-teal-600 hover:bg-teal-50 rounded transition-colors inline-flex items-center gap-1"
                                            title="View part details"
                                          >
                                            <Eye className="h-4 w-4" />
                                            <span className="hidden sm:inline text-xs">View</span>
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Global Export Options */}
                {Object.keys(groupedParts).length > 0 && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Export All Items</h3>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleCopyToClipboard('list')}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-xs"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy List
                        {copiedPart === 'list' && <span className="text-green-600">✓</span>}
                      </button>
                      <button
                        onClick={() => handleCopyToClipboard('table')}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-xs"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy Table
                        {copiedPart === 'table' && <span className="text-green-600">✓</span>}
                      </button>
                      <button
                        onClick={() => handleDownloadCSV()}
                        className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-xs font-medium"
                      >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                      </button>
                      <button
                        onClick={() => handleDownloadHTML()}
                        className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-xs font-medium"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        HTML
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex gap-2 border-t pt-4">
                  <Dialog.Close asChild>
                    <Button variant="outline" className="flex-1">
                      Close
                    </Button>
                  </Dialog.Close>
                </div>
              </>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// --- MAIN SPARE PARTS COMPONENT ---
const SpareParts = () => {
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDetails, setViewDetails] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();

  const pageSize = 12;
  const [deleteId, setDeleteId] = useState(null);
  const isGodAdmin = userRole?.name === 'God Admin';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    building_id: 'all'
  });

  const lastRequestId = useRef(0);

  useEffect(() => {
    loadParts();
  }, [filters, page]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await dbService.getCategories();
    if (data) setCategories(data);
  };

  const loadParts = async () => {
    const requestId = ++lastRequestId.current;
    setLoading(true);
    try {
      let query = supabase
        .from('spare_parts')
        .select('*, warehouse:warehouses(name, building:buildings(name))', { count: 'exact' });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,part_number.ilike.%${filters.search}%,barcode.eq.${filters.search}`);
      }

      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.building_id !== 'all') {
        query = query.eq('building_id', filters.building_id);
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;

      if (requestId !== lastRequestId.current) return;
      if (error) throw error;

      let filteredData = data || [];

      if (filters.status !== 'all') {
        filteredData = filteredData.filter(p => {
          const status = getStockStatus(p.current_quantity, p.min_stock_level, p.reorder_point);
          return status === filters.status || (filters.status === 'critical' && status === 'out');
        });
      }

      setParts(filteredData);
      setTotalCount(count || 0);
    } catch (error) {
      if (requestId === lastRequestId.current) {
        console.error(error);
        const message = error.message || "Failed to load inventory. Please try again.";
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: message
        });
      }
    } finally {
      if (requestId === lastRequestId.current) {
        setLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (!isGodAdmin) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "Only God Admin can delete items."
      });
      return;
    }

    try {
      const { error } = await dbService.deletePart(deleteId);
      if (error) throw error;
      toast({
        title: "Deleted",
        description: "Part removed successfully"
      });
      setDeleteId(null);
      setViewDetails(null);
      loadParts();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete part. It may be in use."
      });
    }
  };

  const handleCreate = () => {
    if (!isGodAdmin) return;
    setEditingPart(null);
    setIsFormOpen(true);
  };

  const handleEdit = (part) => {
    if (!isGodAdmin) return;
    setEditingPart(part);
    setViewDetails(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    loadParts();
  };

  const resetFilters = () => {
    setFilters({ search: '', category: 'all', status: 'all', building_id: 'all' });
    setPage(0);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handleCardClick = useCallback((part) => {
    setViewDetails(part);
  }, []);

  const handleReorderPartClick = (part) => {
    setViewDetails(part);
  };

  // Count items needing reorder
  const needsReorderCount = parts.filter(p =>
    p.current_quantity <= p.reorder_point
  ).length;

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-2 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Spare Parts</h1>
          <p className="text-xs sm:text-sm text-slate-600">Manage spare parts, track stock levels, and monitor costs.</p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-0">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Controls</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Search */}
            <div className="flex-1 min-w-full sm:min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search parts..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9 w-full text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="in-stock">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="critical">Critical</option>
            </select>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isGodAdmin && (
                <Button onClick={handleCreate} size="sm" className="text-xs sm:text-sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Part
                </Button>
              )}

              {/* Reorder Button with Badge */}
              <button
                onClick={() => setShowReorderModal(true)}
                className="relative px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Reorder</span>
                {needsReorderCount > 0 && (
                  <Badge className="ml-1 bg-red-500">{needsReorderCount}</Badge>
                )}
              </button>

              <Button
                onClick={resetFilters}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Reorder Alert */}
        {needsReorderCount > 0 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {needsReorderCount} item{needsReorderCount !== 1 ? 's' : ''} need{needsReorderCount !== 1 ? '' : 's'} reordering
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Click the "Reorder" button to manage and export your reorder list by supplier
              </p>
            </div>
          </div>
        )}

        {/* Parts Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : parts.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-slate-200">
            <Box className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No parts found matching your filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <AnimatePresence>
                {parts.map(part => (
                  <PartCard
                    key={part.id}
                    part={part}
                    onClick={() => handleCardClick(part)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center pt-4 border-t bg-white rounded-lg p-4">
              <p className="text-xs sm:text-sm text-slate-600">
                Showing {totalCount === 0 ? 0 : (page * pageSize + 1)} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} results
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize + parts.length >= totalCount}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      <PartDetailsModal
        part={viewDetails}
        open={!!viewDetails}
        onOpenChange={(open) => !open && setViewDetails(null)}
        onEdit={() => handleEdit(viewDetails)}
        onDelete={() => setDeleteId(viewDetails?.id)}
        isEditable={isGodAdmin}
      />

      {isFormOpen && (
        <PartForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          part={editingPart}
          onSuccess={handleFormSuccess}
        />
      )}

      {isCategoryManagerOpen && (
        <CategoryManager
          open={isCategoryManagerOpen}
          onOpenChange={setIsCategoryManagerOpen}
          onSuccess={loadCategories}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Part</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this part? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reorder Modal - WITH CORRECT SUPPLIERS TABLE SCHEMA */}
      <ReorderModal
        open={showReorderModal}
        onOpenChange={setShowReorderModal}
        parts={parts.filter(p => p.current_quantity <= p.reorder_point)}
        onPartClick={handleReorderPartClick}
      />
    </>
  );
};

export default SpareParts;
