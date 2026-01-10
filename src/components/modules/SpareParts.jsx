import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, Plus, Filter, RefreshCw, MoreHorizontal, Box, RotateCcw, Settings,
  Download, Copy, FileText, AlertCircle, ShoppingCart, X, Eye, ChevronDown, ChevronUp, FilePlus
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
import BulkQuoteRequestCreator from './quotes/BulkQuoteRequestCreator';

// Filter color mapping
const FILTER_COLORS = {
  category: 'bg-blue-100 text-blue-800 border-blue-300',
  building_id: 'bg-green-100 text-green-800 border-green-300',
  warehouse_id: 'bg-purple-100 text-purple-800 border-purple-300',
  bin_location: 'bg-orange-100 text-orange-800 border-orange-300',
  manufacturer: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  status: 'bg-red-100 text-red-800 border-red-300'
};

const FILTER_LABELS = {
  category: '📁 Category',
  building_id: '🏢 Building',
  warehouse_id: '🏭 Warehouse',
  bin_location: '📍 Bin Location',
  manufacturer: '🏭 Manufacturer',
  status: '📊 Stock Status'
};

// --- REORDER MODAL COMPONENT (WITH CORRECT SUPPLIERS TABLE SCHEMA) ---
const ReorderModal = ({ open, onOpenChange, parts, onPartClick, onCreateQuotes }) => {
  const [selectedParts, setSelectedParts] = useState([]);
  const [copiedPart, setCopiedPart] = useState(null);
  const [expandedSuppliers, setExpandedSuppliers] = useState({});
  const [partsWithSuppliers, setPartsWithSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  // Fetch supplier data for all parts
  useEffect(() => {
    if (open) {
      console.log(`ReorderModal opened with ${parts.length} parts`);
      if (parts.length > 0) {
        loadPartsWithSuppliers();
      } else {
        setPartsWithSuppliers([]);
        setError('No parts available for reordering');
      }
    }
  }, [open, parts]);

  const loadPartsWithSuppliers = async () => {
    setLoadingSuppliers(true);
    setError(null);
    try {
      console.log(`Loading suppliers for ${parts.length} parts...`);
      
      // Get all part IDs
      const partIds = parts.map(p => p.id);
      console.log('Part IDs:', partIds);
      
      // FIX #2: Query existing quote requests to filter out already-quoted parts
      const { data: quotedData, error: quotedError } = await supabase
        .from('quote_requests')
        .select('part_id, status')
        .in('part_id', partIds)
        .in('status', ['pending', 'sent', 'quoted', 'accepted']); // Active quote statuses

      if (quotedError) {
        console.warn('Warning: Could not check existing quotes:', quotedError);
      }

      // Create a set of parts that already have active quotes
      const quotedPartIds = new Set(quotedData?.map(q => q.part_id) || []);
      console.log(`Filtering out ${quotedPartIds.size} parts with existing quotes`);

      // Query the junction table with supplier details
      // Using exact columns from suppliers table schema
      const { data, error } = await supabase
        .from('supplier_part_mappings')
        .select(`
          id,
          part_id,
          supplier_id,
          supplier_sku,
          supplier_part_number,
          min_order_qty,
          lead_time_days,
          price_per_unit,
          supplier:suppliers(
            id, 
            name, 
            contact_person,
            email,
            phone,
            address,
            is_oem
          )
        `)
        .in('part_id', partIds);

      if (error) {
        console.error('Supplier query error:', error);
        throw error;
      }

      console.log(`Retrieved ${data?.length || 0} supplier mappings`);

      // Map suppliers to parts
      const supplierMap = {};
      if (data) {
        data.forEach(mapping => {
          if (!supplierMap[mapping.part_id]) {
            supplierMap[mapping.part_id] = [];
          }
          supplierMap[mapping.part_id].push({
            ...mapping.supplier,
            supplier_sku: mapping.supplier_sku,
            supplier_part_number: mapping.supplier_part_number,
            min_order_qty: mapping.min_order_qty,
            lead_time_days: mapping.lead_time_days,
            unit_price: mapping.price_per_unit,
            is_preferred: false
          });
        });
      }

      // FIX #2: Filter out parts that already have active quotes
      const enrichedParts = parts
        .filter(part => !quotedPartIds.has(part.id)) // Remove already-quoted parts
        .map(part => ({
          ...part,
          suppliers: supplierMap[part.id] || []
        }));

      console.log(`After filtering: ${enrichedParts.length} parts remaining`);

      if (enrichedParts.length === 0) {
        setError('All parts already have quote requests or no suppliers assigned');
        setPartsWithSuppliers([]);
        toast({
          title: "Info",
          description: "All parts already have quote requests or no suppliers assigned"
        });
      } else {
        setPartsWithSuppliers(enrichedParts);

        // FIX #1: Start with EMPTY selection (user chooses what to quote)
        setSelectedParts([]);

        // Expand all supplier groups by default
        const suppliers = {};
        enrichedParts.forEach(p => {
          p.suppliers.forEach(s => {
            suppliers[s.name] = true;
          });
        });
        setExpandedSuppliers(suppliers);
      }

      if (quotedPartIds.size > 0) {
        toast({
          title: "Info",
          description: `${quotedPartIds.size} part(s) already have quote requests and were filtered out`
        });
      }

    } catch (error) {
      console.error('Error loading suppliers:', error);
      const errorMsg = error?.message || 'Unknown error occurred';
      setError(`Failed to load supplier information: ${errorMsg}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg
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

  const toggleSelectAll = () => {
    if (selectedParts.length === partsWithSuppliers.length) {
      setSelectedParts([]);
    } else {
      setSelectedParts(partsWithSuppliers.map(p => p.id));
    }
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
            ) : error ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-3" />
                <p className="text-amber-900 font-semibold">{error}</p>
                <p className="text-amber-700 text-sm mt-2">Check browser console for more details</p>
              </div>
            ) : partsWithSuppliers.length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <p className="text-blue-900 font-semibold">No parts available to reorder</p>
                <p className="text-blue-700 text-sm mt-2">All parts either have existing quotes or no suppliers assigned</p>
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
                      <p className="text-3xl font-bold text-teal-600">{partsWithSuppliers.length}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-600">Selected Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-slate-900">{selectedParts.length}</p>
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

                  <Card className="border-2 border-teal-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-600">Est. Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-teal-600">€{totalEstimatedCost.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Select All / Deselect All */}
                <div className="mb-4 flex gap-2">
                  <Button
                    onClick={toggleSelectAll}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {selectedParts.length === partsWithSuppliers.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                {/* Suppliers Grouped Items */}
                <div className="space-y-4 mb-6">
                  {Object.entries(groupedParts).length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 rounded-lg">
                      <p className="text-slate-600">Select items to build your reorder list</p>
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
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Export & Quote Options</h3>
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
                      <button
                        onClick={() => onCreateQuotes(reorderParts)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-300 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium ml-auto"
                      >
                        <FilePlus className="h-3.5 w-3.5" />
                        Create Quotes
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
  const [buildings, setBuildings] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [binLocations, setBinLocations] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDetails, setViewDetails] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showQuoteCreator, setShowQuoteCreator] = useState(false);
  const [selectedPartsForQuotes, setSelectedPartsForQuotes] = useState([]);
  const [allReorderParts, setAllReorderParts] = useState([]);
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
    building_id: 'all',
    warehouse_id: 'all',
    bin_location: 'all',
    manufacturer: 'all'
  });

  const lastRequestId = useRef(0);

  useEffect(() => {
    loadParts();
    loadAllReorderParts();
  }, [filters, page]);

  useEffect(() => {
    loadCategories();
    loadBuildingsAndWarehouses();
    loadBinLocationsAndManufacturers();
  }, []);

  const loadCategories = async () => {
    const { data } = await dbService.getCategories();
    if (data) setCategories(data);
  };

  const loadBuildingsAndWarehouses = async () => {
    try {
      const { data: buildingsData } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name');
      
      if (buildingsData) setBuildings(buildingsData);

      const { data: warehousesData } = await supabase
        .from('warehouses')
        .select('id, name')
        .order('name');
      
      if (warehousesData) setWarehouses(warehousesData);
    } catch (error) {
      console.error('Error loading buildings/warehouses:', error);
    }
  };

  const loadBinLocationsAndManufacturers = async () => {
    try {
      // Get unique bin locations from spare_parts
      const { data: binData } = await supabase
        .from('spare_parts')
        .select('bin_location')
        .neq('bin_location', null)
        .order('bin_location');
      
      if (binData) {
        const uniqueBins = Array.from(new Set(binData.map(item => item.bin_location)));
        setBinLocations(uniqueBins);
      }

      // Get unique manufacturers from spare_parts
      const { data: mfgData } = await supabase
        .from('spare_parts')
        .select('manufacturer')
        .neq('manufacturer', null)
        .order('manufacturer');
      
      if (mfgData) {
        const uniqueMfg = Array.from(new Set(mfgData.map(item => item.manufacturer)));
        setManufacturers(uniqueMfg);
      }
    } catch (error) {
      console.error('Error loading bin locations/manufacturers:', error);
    }
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

      if (filters.warehouse_id !== 'all') {
        query = query.eq('warehouse_id', filters.warehouse_id);
      }

      if (filters.bin_location !== 'all') {
        query = query.eq('bin_location', filters.bin_location);
      }

      if (filters.manufacturer !== 'all') {
        query = query.eq('manufacturer', filters.manufacturer);
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

  const loadAllReorderParts = async () => {
    try {
      console.log('Loading all reorder parts...');
      
      // Load ALL parts from database that need reordering
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .not('reorder_point', 'is', null)
        .not('current_quantity', 'is', null);

      if (error) {
        console.error('Error querying spare_parts:', error);
        throw error;
      }

      console.log(`Total parts in database: ${data?.length || 0}`);

      // Filter parts where current_quantity <= reorder_point
      const reorderPartsFiltered = (data || []).filter(p => p.current_quantity <= p.reorder_point);
      
      console.log(`Found ${reorderPartsFiltered.length} parts needing reorder (current <= reorder_point)`);
      console.log('Parts needing reorder:', reorderPartsFiltered.map(p => ({ id: p.id, name: p.name, current: p.current_quantity, reorder: p.reorder_point })));
      
      setAllReorderParts(reorderPartsFiltered);
    } catch (error) {
      console.error('Error loading all reorder parts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load all parts needing reorder"
      });
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
    loadAllReorderParts();
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      status: 'all',
      building_id: 'all',
      warehouse_id: 'all',
      bin_location: 'all',
      manufacturer: 'all'
    });
    setPage(0);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const removeFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: 'all' }));
    setPage(0);
  };

  const handleCardClick = useCallback((part) => {
    setViewDetails(part);
  }, []);

  const handleReorderPartClick = (part) => {
    setViewDetails(part);
  };

  const handleCreateQuotesClick = async (selectedReorderParts) => {
    setSelectedPartsForQuotes(allReorderParts);
    setShowQuoteCreator(true);
  };

  // Get active filters with their display values
  const getActiveFiltersDisplay = useMemo(() => {
    const active = [];
    
    if (filters.category !== 'all') {
      const categoryName = categories.find(c => c.name === filters.category)?.name || filters.category;
      active.push({ key: 'category', label: FILTER_LABELS.category, value: categoryName });
    }
    
    if (filters.building_id !== 'all') {
      const buildingName = buildings.find(b => b.id === filters.building_id)?.name || filters.building_id;
      active.push({ key: 'building_id', label: FILTER_LABELS.building_id, value: buildingName });
    }
    
    if (filters.warehouse_id !== 'all') {
      const warehouseName = warehouses.find(w => w.id === filters.warehouse_id)?.name || filters.warehouse_id;
      active.push({ key: 'warehouse_id', label: FILTER_LABELS.warehouse_id, value: warehouseName });
    }
    
    if (filters.bin_location !== 'all') {
      active.push({ key: 'bin_location', label: FILTER_LABELS.bin_location, value: filters.bin_location });
    }
    
    if (filters.manufacturer !== 'all') {
      active.push({ key: 'manufacturer', label: FILTER_LABELS.manufacturer, value: filters.manufacturer });
    }
    
    if (filters.status !== 'all') {
      const statusLabels = { 'in-stock': 'In Stock', 'low': 'Low Stock', 'critical': 'Critical' };
      active.push({ key: 'status', label: FILTER_LABELS.status, value: statusLabels[filters.status] || filters.status });
    }
    
    return active;
  }, [filters, categories, buildings, warehouses]);

  // Count active filters
  const activeFilterCount = getActiveFiltersDisplay.length;

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-2 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Spare Parts</h1>
          <p className="text-xs sm:text-sm text-slate-600">Manage spare parts, track stock levels, and monitor costs.</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex-1 min-w-full sm:min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search parts by name, number, or barcode..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9 w-full text-xs sm:text-sm"
                />
              </div>
            </div>
            <Button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters {activeFilterCount > 0 && <Badge className="ml-2 bg-teal-600">{activeFilterCount}</Badge>}
            </Button>
            <Button
              onClick={resetFilters}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        <AnimatePresence>
          {activeFilterCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-lg border border-slate-200 p-3 mb-4 sm:mb-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-slate-600" />
                <p className="text-xs font-medium text-slate-600">Active Filters ({activeFilterCount})</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {getActiveFiltersDisplay.map((filter) => (
                  <motion.div
                    key={filter.key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${FILTER_COLORS[filter.key]}`}
                  >
                    <span>{filter.label}: <strong>{filter.value}</strong></span>
                    <button
                      onClick={() => removeFilter(filter.key)}
                      className="ml-1 hover:opacity-70 transition-opacity"
                      title="Remove filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-lg border border-slate-200 p-4 mb-4 sm:mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Advanced Filters
                </h3>
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-2 flex items-center gap-1">
                    <span>📁</span> Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs bg-white hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Building Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-2 flex items-center gap-1">
                    <span>🏢</span> Building
                  </label>
                  <select
                    value={filters.building_id}
                    onChange={(e) => handleFilterChange('building_id', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs bg-white hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                  >
                    <option value="all">All Buildings</option>
                    {buildings.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Warehouse Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-2 flex items-center gap-1">
                    <span>🏭</span> Warehouse
                  </label>
                  <select
                    value={filters.warehouse_id}
                    onChange={(e) => handleFilterChange('warehouse_id', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs bg-white hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                  >
                    <option value="all">All Warehouses</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Bin Location Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-2 flex items-center gap-1">
                    <span>📍</span> Bin Location
                  </label>
                  <select
                    value={filters.bin_location}
                    onChange={(e) => handleFilterChange('bin_location', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs bg-white hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                  >
                    <option value="all">All Bin Locations</option>
                    {binLocations.map((bin, idx) => (
                      <option key={idx} value={bin}>{bin}</option>
                    ))}
                  </select>
                </div>

                {/* Manufacturer Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-2 flex items-center gap-1">
                    <span>🏭</span> Manufacturer
                  </label>
                  <select
                    value={filters.manufacturer}
                    onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs bg-white hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                  >
                    <option value="all">All Manufacturers</option>
                    {manufacturers.map((mfg, idx) => (
                      <option key={idx} value={mfg}>{mfg}</option>
                    ))}
                  </select>
                </div>

                {/* Stock Status Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-2 flex items-center gap-1">
                    <span>📊</span> Stock Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs bg-white hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                  >
                    <option value="all">All Status</option>
                    <option value="in-stock">In Stock</option>
                    <option value="low">Low Stock</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Actions Section */}
        {isGodAdmin && (
          <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              ⚙️ Admin Actions
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <Button onClick={handleCreate} size="sm" className="text-xs sm:text-sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Part
              </Button>

              <button
                onClick={() => setShowReorderModal(true)}
                className="px-4 py-2 bg-teal-50 border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Reorder Items
                {allReorderParts.length > 0 && (
                  <Badge className="bg-orange-500 text-white font-bold ml-1 px-2 py-0.5 text-xs">
                    {allReorderParts.length}
                  </Badge>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Reorder Alert */}
        {allReorderParts.length > 0 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {allReorderParts.length} item{allReorderParts.length !== 1 ? 's' : ''} need{allReorderParts.length !== 1 ? '' : 's'} reordering
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Click the "Reorder Items" button to manage and export your reorder list by supplier
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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t bg-white rounded-lg p-4">
              <p className="text-xs sm:text-sm text-slate-600 order-2 sm:order-1">
                Showing {totalCount === 0 ? 0 : (page * pageSize + 1)} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} results
              </p>
              <div className="flex gap-2 order-1 sm:order-2">
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
        onOpenChange={(open) => {
          if (!open) setViewDetails(null);
        }}
        onEdit={() => handleEdit(viewDetails)}
        onDelete={() => setDeleteId(viewDetails?.id)}
        isEditable={isGodAdmin}
      />

      {isFormOpen && (
        <PartForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          editPart={editingPart}
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

      {/* Reorder Modal */}
      <ReorderModal
        open={showReorderModal}
        onOpenChange={setShowReorderModal}
        parts={allReorderParts}
        onPartClick={handleReorderPartClick}
        onCreateQuotes={handleCreateQuotesClick}
      />

      {/* Bulk Quote Request Creator */}
      {showQuoteCreator && (
        <BulkQuoteRequestCreator
          open={showQuoteCreator}
          onOpenChange={setShowQuoteCreator}
          selectedParts={selectedPartsForQuotes}
          onSuccess={() => {
            setShowQuoteCreator(false);
            loadParts();
            loadAllReorderParts();
          }}
        />
      )}
    </>
  );
};

export default SpareParts;