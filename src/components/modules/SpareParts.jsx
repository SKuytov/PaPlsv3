import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReorderQuoteOrders from './quotes/ReorderQuoteOrders';
import ManualQuoteRequestModal from './quotes/ManualQuoteRequestModal';
import BulkQuoteRequestCreator from './quotes/BulkQuoteRequestCreator';
import { AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, RefreshCw, MoreHorizontal, Box, RotateCcw, Settings,
  Download, Copy, FileText, AlertCircle, ShoppingCart, X, Eye, ChevronDown, ChevronUp,
  SlidersHorizontal
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

// --- FILTER PANEL COMPONENT ---
const FilterPanel = ({
  filters,
  onFilterChange,
  categories,
  buildings,
  warehouses,
  manufacturers,
  binLocations,
  isExpanded,
  onToggleExpand
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Filter Header */}
      <button
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-semibold text-slate-900">Advanced Filters</h2>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {/* Expandable Filter Content */}
      {isExpanded && (
        <>
          <div className="border-t border-slate-200 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase mb-1.5 block">Category</label>
                <Select value={filters.category} onValueChange={(value) => onFilterChange('category', value)}>
                  <SelectTrigger className="bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Building Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase mb-1.5 block">Building</label>
                <Select value={filters.building_id} onValueChange={(value) => onFilterChange('building_id', value)}>
                  <SelectTrigger className="bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Buildings</SelectItem>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Warehouse Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase mb-1.5 block">Warehouse</label>
                <Select value={filters.warehouse_id} onValueChange={(value) => onFilterChange('warehouse_id', value)}>
                  <SelectTrigger className="bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {warehouses
                      .filter(w => !filters.building_id || filters.building_id === 'all' || w.building_id.toString() === filters.building_id)
                      .map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bin Location Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase mb-1.5 block">Bin Location</label>
                <Select value={filters.bin_location} onValueChange={(value) => onFilterChange('bin_location', value)}>
                  <SelectTrigger className="bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-64">
                    <SelectItem value="all">All Locations</SelectItem>
                    {binLocations.map((loc, idx) => (
                      <SelectItem key={idx} value={loc}>{loc || '(Empty)'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Manufacturer Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase mb-1.5 block">Manufacturer</label>
                <Select value={filters.manufacturer} onValueChange={(value) => onFilterChange('manufacturer', value)}>
                  <SelectTrigger className="bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-64">
                    <SelectItem value="all">All Manufacturers</SelectItem>
                    {manufacturers.map((mfr, idx) => (
                      <SelectItem key={idx} value={mfr}>{mfr || '(Unknown)'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Status Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase mb-1.5 block">Stock Status</label>
                <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
                  <SelectTrigger className="bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {filters.category !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {filters.category}
                    <button onClick={() => onFilterChange('category', 'all')} className="ml-1 hover:opacity-70">
                      ✕
                    </button>
                  </Badge>
                )}
                {filters.building_id !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Building #{filters.building_id}
                    <button onClick={() => onFilterChange('building_id', 'all')} className="ml-1 hover:opacity-70">
                      ✕
                    </button>
                  </Badge>
                )}
                {filters.warehouse_id !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    WH: {filters.warehouse_id}
                    <button onClick={() => onFilterChange('warehouse_id', 'all')} className="ml-1 hover:opacity-70">
                      ✕
                    </button>
                  </Badge>
                )}
                {filters.bin_location !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Bin: {filters.bin_location}
                    <button onClick={() => onFilterChange('bin_location', 'all')} className="ml-1 hover:opacity-70">
                      ✕
                    </button>
                  </Badge>
                )}
                {filters.manufacturer !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {filters.manufacturer}
                    <button onClick={() => onFilterChange('manufacturer', 'all')} className="ml-1 hover:opacity-70">
                      ✕
                    </button>
                  </Badge>
                )}
                {filters.status !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {filters.status === 'in-stock' ? '📦 In Stock' : filters.status === 'low' ? '⚠️ Low' : filters.status === 'critical' ? '🔴 Critical' : '❌ Out'}
                    <button onClick={() => onFilterChange('status', 'all')} className="ml-1 hover:opacity-70">
                      ✕
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- REORDER MODAL COMPONENT (WITH CORRECT SUPPLIERS TABLE SCHEMA) ---
const ReorderModal = ({ open, onOpenChange, parts, onPartClick, onCreateQuoteRequests, isGodAdmin }) => {
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
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">Export & Actions</h3>
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
                      {isGodAdmin && (
                        <button
                          onClick={() => onCreateQuoteRequests(reorderParts)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium ml-auto"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Create Quote Requests
                        </button>
                      )}
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
  const [manufacturers, setManufacturers] = useState([]);
  const [binLocations, setBinLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showManualQuoteModal, setShowManualQuoteModal] = useState(false);
  const [showBulkQuoteCreator, setShowBulkQuoteCreator] = useState(false);
  const [bulkQuoteParts, setBulkQuoteParts] = useState([]);
  const [showReorderOrders, setShowReorderOrders] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedPart(null);
  };

  const handlePartClick = (part) => {
    setSelectedPart(part);
    setDetailsModalOpen(true);
  };

  const handlePartDelete = async () => {
    if (!selectedPart?.id) return;
    if (!isGodAdmin) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "Only God Admin can delete items."
      });
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedPart.name}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const { error } = await dbService.deletePart(selectedPart.id);
      if (error) throw error;
      
      toast({ title: "Deleted", description: "Part removed successfully" });
      handleCloseDetails();
      loadParts();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete part. It may be in use."
      });
    }
  };

  const handlePartEdit = (part) => {
    if (!isGodAdmin) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "Only God Admin can edit items."
      });
      return;
    }
    
    setEditingPart(part);
    handleCloseDetails();
    setIsFormOpen(true);
  };

  const handleCreateBulkQuoteRequests = (reorderParts) => {
    setBulkQuoteParts(reorderParts);
    setShowBulkQuoteCreator(true);
  };

  const pageSize = 12;
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
  }, [filters, page]);

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    try {
      const [catsRes, buildingsRes, warehousesRes] = await Promise.all([
        dbService.getCategories(),
        dbService.getBuildings(),
        dbService.getWarehouses()
      ]);

      setCategories(catsRes.data || []);
      setBuildings(buildingsRes.data || []);
      setWarehouses(warehousesRes.data || []);
    } catch (error) {
      console.error('Error loading references:', error);
    }
  };

  const loadParts = async () => {
    const requestId = ++lastRequestId.current;
    setLoading(true);
    try {
      let query = supabase
        .from('spare_parts')
        .select('*, warehouse:warehouses(name, building:buildings(name))', { count: 'exact' });

      // Text search
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,part_number.ilike.%${filters.search}%,barcode.eq.${filters.search}`);
      }

      // Exact field filters
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.building_id !== 'all') {
        query = query.eq('building_id', parseInt(filters.building_id));
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

      // Pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;

      if (requestId !== lastRequestId.current) return;
      if (error) throw error;

      let filteredData = data || [];

      // Status filter (client-side as it's calculated)
      if (filters.status !== 'all') {
        filteredData = filteredData.filter(p => {
          const status = getStockStatus(p.current_quantity, p.min_stock_level, p.reorder_point);
          return status === filters.status || (filters.status === 'critical' && status === 'out');
        });
      }

      setParts(filteredData);
      setTotalCount(count || 0);

      // Extract unique manufacturers and bin locations from all data for filter options
      if (filteredData.length > 0 && (manufacturers.length === 0 || binLocations.length === 0)) {
        const allManufacturers = new Set();
        const allBinLocations = new Set();
        
        // Add from current page
        filteredData.forEach(p => {
          if (p.manufacturer) allManufacturers.add(p.manufacturer);
          if (p.bin_location) allBinLocations.add(p.bin_location);
        });

        // For better UX, load these from all parts (not just current page)
        // This requires a separate query
        if (manufacturers.length === 0) {
          const { data: allData } = await supabase
            .from('spare_parts')
            .select('manufacturer, bin_location')
            .neq('manufacturer', null);
          
          if (allData) {
            allData.forEach(p => {
              if (p.manufacturer) allManufacturers.add(p.manufacturer);
              if (p.bin_location) allBinLocations.add(p.bin_location);
            });
          }
        }

        setManufacturers(Array.from(allManufacturers).sort());
        setBinLocations(Array.from(allBinLocations).sort());
      }
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

  const handleCreate = () => {
    if (!isGodAdmin) return;
    setEditingPart(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    loadParts();
    loadReferences();
  };

  const resetFilters = () => {
    setFilters({ search: '', category: 'all', status: 'all', building_id: 'all', warehouse_id: 'all', bin_location: 'all', manufacturer: 'all' });
    setPage(0);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  // Count items needing reorder
  const needsReorderCount = parts.filter(p =>
    p.current_quantity <= p.reorder_point
  ).length;

  // Count active filters
  const activeFilterCount = Object.values(filters).filter((v, idx) => idx > 0 && v !== 'all').length;

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
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">🔍 Search</h2>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 min-w-full sm:min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, part number, or barcode..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9 w-full text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        <div className="mb-4 sm:mb-6">
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={categories}
            buildings={buildings}
            warehouses={warehouses}
            manufacturers={manufacturers}
            binLocations={binLocations}
            isExpanded={showFilterPanel}
            onToggleExpand={() => setShowFilterPanel(!showFilterPanel)}
          />
        </div>

        {/* Action Bar - Only shown for God Admin */}
        {isGodAdmin && (
          <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-0">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">⚙️ Admin Actions</h2>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleCreate} size="sm" className="text-xs sm:text-sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Part
              </Button>
              <Button
                onClick={() => setShowManualQuoteModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">New Quote Request</span>
                <span className="sm:hidden">Quote Request</span>
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions Bar - Shown for all users */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-0">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">{isGodAdmin ? '📋 Quick Actions' : '🛠️ Inventory Actions'}</h2>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Reorder Button with Badge */}
            <button
              onClick={() => setShowReorderModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">View Reorder Items</span>
              <span className="sm:hidden">Reorder</span>
              {needsReorderCount > 0 && (
                <Badge className="ml-1 bg-red-500">{needsReorderCount}</Badge>
              )}
            </button>

            <Button
              onClick={resetFilters}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              title="Reset all filters"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Reset</span>
            </Button>

            {activeFilterCount > 0 && (
              <div className="text-xs text-amber-600 font-medium px-2 py-2 bg-amber-50 rounded-lg border border-amber-200">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </div>
            )}

            <ReorderQuoteOrders
              open={showReorderOrders}
              onOpenChange={setShowReorderOrders}
            />
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
                Click "View Reorder Items" to manage and export your reorder list by supplier
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
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium mt-2"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <AnimatePresence>
                {parts.map(part => (
                  <PartCard
                    key={part.id}
                    part={part}
                    onClick={() => handlePartClick(part)}
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

      {/* PartDetailsModal - SINGLE INSTANCE */}
      <PartDetailsModal
        open={detailsModalOpen}
        part={selectedPart}
        onClose={handleCloseDetails}
        onDeleteRequest={handlePartDelete}
        onEditRequest={handlePartEdit}
      />

      {/* PartForm */}
      {isFormOpen && (
        <PartForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          editPart={editingPart}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* CategoryManager */}
      {isCategoryManagerOpen && (
        <CategoryManager
          open={isCategoryManagerOpen}
          onOpenChange={setIsCategoryManagerOpen}
          onSuccess={() => { loadReferences(); }}
        />
      )}

      {/* Reorder Modal */}
      <ReorderModal
        open={showReorderModal}
        onOpenChange={setShowReorderModal}
        parts={parts.filter(p => p.current_quantity <= p.reorder_point)}
        onPartClick={handlePartClick}
        onCreateQuoteRequests={handleCreateBulkQuoteRequests}
        isGodAdmin={isGodAdmin}
      />

      {/* Manual Quote Request Modal */}
      <ManualQuoteRequestModal
        open={showManualQuoteModal}
        onOpenChange={setShowManualQuoteModal}
        onSuccess={() => {
          setShowManualQuoteModal(false);
          toast({
            title: "Quote Request Sent!",
            description: "Check the Pending Quotes tab to track status"
          });
        }}
      />

      {/* Bulk Quote Request Creator */}
      <BulkQuoteRequestCreator
        open={showBulkQuoteCreator}
        onOpenChange={setShowBulkQuoteCreator}
        selectedParts={bulkQuoteParts}
        onSuccess={() => {
          setShowBulkQuoteCreator(false);
          setShowReorderModal(false);
          toast({
            title: "Quote Requests Created!",
            description: "Check the Pending Quotes tab to track status"
          });
        }}
      />
    </>
  );
};

export default SpareParts;