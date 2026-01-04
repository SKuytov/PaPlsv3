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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '@/contexts/AuthContext';

// Imported Components
import PartCard from './spare-parts/PartCard';
import PartDetailsModal from './spare-parts/PartDetailsModal';

// --- MAIN MAINTENANCE SPARE PARTS COMPONENT (TECHNICIAN VERSION - READ ONLY) ---
const MaintenanceSpareParts = () => {
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDetails, setViewDetails] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const { userRole } = useAuth();

  const pageSize = 12;

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

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-2 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">🔍 Spare Parts Catalog</h1>
          <p className="text-xs sm:text-sm text-slate-600">Browse spare parts and track stock levels (Read-Only View).</p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-0">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">🔎 Search & Filter</h2>
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

            {/* Reset Button */}
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

        {/* Information Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 sm:mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">
              📚 Read-Only Catalog View
            </p>
            <p className="text-xs text-blue-700 mt-1">
              You can browse and search spare parts. For reordering or modifications, contact your administrator.
            </p>
          </div>
        </div>

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

      {/* Part Details Modal - READ ONLY */}
      <PartDetailsModal
        part={viewDetails}
        open={!!viewDetails}
        onOpenChange={(open) => !open && setViewDetails(null)}
        isEditable={false}
      />
    </>
  );
};

export default MaintenanceSpareParts;
