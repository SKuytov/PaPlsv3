import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '@/contexts/AuthContext';

// Imported Components
import PartCard from './spare-parts/PartCard';
import PartDetailsModal from './spare-parts/PartDetailsModal';

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

// --- MAIN MAINTENANCE SPARE PARTS COMPONENT (TECHNICIAN VERSION - READ ONLY) ---
const MaintenanceSpareParts = () => {
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();

  const pageSize = 12;

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
      const { data: binData } = await supabase
        .from('spare_parts')
        .select('bin_location')
        .neq('bin_location', null)
        .order('bin_location');
      
      if (binData) {
        const uniqueBins = Array.from(new Set(binData.map(item => item.bin_location)));
        setBinLocations(uniqueBins);
      }

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

  const activeFilterCount = getActiveFiltersDisplay.length;

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-2 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">🔍 Spare Parts Catalog</h1>
          <p className="text-xs sm:text-sm text-slate-600">Browse and search spare parts inventory (Read-Only Mode)</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
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
              className="bg-white rounded-lg border border-slate-200 p-3 mb-4 sm:mb-6 shadow-sm"
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
              className="bg-white rounded-lg border border-slate-200 p-4 mb-4 sm:mb-6 shadow-sm"
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

        {/* Read-Only Mode Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex items-start gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <p className="font-semibold text-blue-900">📖 Read-Only Mode</p>
            <p className="text-blue-800 mt-1">You can browse and search spare parts, but cannot add, edit, delete, or export reorder lists.</p>
          </div>
        </div>

        {/* Parts Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : parts.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-slate-200 shadow-sm">
            <Box className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No parts found matching your filters.</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your search criteria.</p>
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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t bg-white rounded-lg p-4 shadow-sm">
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

      {/* Part Details Modal - FULLY READ ONLY FOR TECHNICIANS */}
      {/* Technicians cannot: */}
      {/* ❌ Add new parts */}
      {/* ❌ Edit parts */}
      {/* ❌ Delete parts */}
      {/* ❌ View reorder items */}
      {/* ❌ Export reorder lists */}
      {/* ❌ Create quote requests */}
      {/* ❌ Any modification/management features */}
      <PartDetailsModal
        part={viewDetails}
        open={!!viewDetails}
        onOpenChange={(open) => !open && setViewDetails(null)}
        isEditable={false}
        onEdit={null}
        onDelete={null}
      />
    </>
  );
};

export default MaintenanceSpareParts;