import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Filter, RefreshCw, MoreHorizontal, Box, RotateCcw, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
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

// Imported Components
import PartCard from './spare-parts/PartCard';
import PartDetailsModal from './spare-parts/PartDetailsModal';
import PartForm from './spare-parts/PartForm';
import CategoryManager from './spare-parts/CategoryManager';

const SpareParts = () => {
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDetails, setViewDetails] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const { userRole } = useAuth();
  const pageSize = 12;
  const [deleteId, setDeleteId] = useState(null);

  // Access Control - RESTRICTED TO GOD ADMIN ONLY
  const isGodAdmin = userRole?.name === 'God Admin';

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  // Filter State
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    building_id: 'all'
  });

  // Request tracking
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
      // Direct query to ensure correct count and pagination logic
      let query = supabase
        .from('spare_parts')
        .select('*, warehouse:warehouses(name, building:buildings(name))', { count: 'exact' });

      // Apply Search
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,part_number.ilike.%${filters.search}%,barcode.eq.${filters.search}`);
      }

      // Apply Category Filter
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      // Apply Building Filter
      if (filters.building_id !== 'all') {
        query = query.eq('building_id', filters.building_id);
      }
      
      // Apply Pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      
      if (requestId !== lastRequestId.current) return;

      if (error) throw error;
      
      let filteredData = data || [];
      
      // Client-side Status Filtering
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
        toast({ variant: "destructive", title: "Connection Error", description: message });
      }
    } finally {
      if (requestId === lastRequestId.current) {
        setLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    // Double check permission
    if (!isGodAdmin) {
       toast({ variant: "destructive", title: "Unauthorized", description: "Only God Admin can delete items." });
       return;
    }

    try {
      const { error } = await dbService.deletePart(deleteId);
      if (error) throw error;
      
      toast({ title: "Deleted", description: "Part removed successfully" });
      setDeleteId(null);
      setViewDetails(null);
      loadParts();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete part. It may be in use." });
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
    setPage(0); // Reset to first page on filter change
  };
  
  const handleCardClick = useCallback((part) => {
    setViewDetails(part);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
         <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Inventory Management</h1>
            <p className="text-slate-600 mt-1">Manage spare parts, track stock levels, and monitor costs.</p>
         </div>
         <div className="flex gap-2 w-full md:w-auto">
            {isGodAdmin && (
              <Button variant="outline" onClick={() => setIsCategoryManagerOpen(true)} className="bg-white">
                 <Settings className="w-4 h-4 mr-2" /> Categories
              </Button>
            )}
            <Button variant="outline" onClick={loadParts} className="bg-white">
               <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 
               Refresh
            </Button>
            {isGodAdmin && (
              <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-200">
                <Plus className="w-4 h-4 mr-2" /> Add New Part
              </Button>
            )}
         </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4 md:space-y-0 md:flex md:items-center gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              className="pl-9 bg-white border-slate-200 focus:bg-white transition-colors" 
              placeholder="Search by name, part number, or barcode..." 
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
            />
         </div>
         
         <div className="grid grid-cols-2 md:flex gap-2 md:w-auto w-full">
            <Select value={filters.category} onValueChange={v => handleFilterChange('category', v)}>
              <SelectTrigger className="w-full md:w-[160px] bg-white border-slate-200">
                <Box className="w-3.5 h-3.5 mr-2 text-slate-500" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50 shadow-lg border border-slate-200">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                   <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={v => handleFilterChange('status', v)}>
              <SelectTrigger className="w-full md:w-[160px] bg-white border-slate-200">
                <Filter className="w-3.5 h-3.5 mr-2 text-slate-500" />
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50 shadow-lg border border-slate-200">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ok">
                   <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /> Healthy</span>
                </SelectItem>
                <SelectItem value="low">
                   <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Low Stock</span>
                </SelectItem>
                <SelectItem value="critical">
                   <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
                </SelectItem>
                <SelectItem value="out">
                   <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300" /> Out of Stock</span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {(filters.category !== 'all' || filters.status !== 'all' || filters.search !== '') && (
               <Button variant="ghost" size="icon" onClick={resetFilters} className="text-slate-400 hover:text-red-500" title="Reset Filters">
                  <RotateCcw className="w-4 h-4" />
               </Button>
            )}
            
            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto px-3 bg-white border-slate-200">
                     <MoreHorizontal className="w-4 h-4" />
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="bg-white z-50 shadow-lg border border-slate-200">
                  <DropdownMenuLabel>More Filters</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>By Warehouse</DropdownMenuItem>
                  <DropdownMenuItem>By Manufacturer</DropdownMenuItem>
                  <DropdownMenuItem>Price: High to Low</DropdownMenuItem>
                  <DropdownMenuItem>Price: Low to High</DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
         </div>
      </div>

      {/* Content Grid */}
      {loading ? (
         <div className="h-64 flex items-center justify-center">
            <LoadingSpinner message="Loading inventory data..." />
         </div>
      ) : (
         <>
            {parts.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                  <Box className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">No parts found matching your filters.</p>
                  <Button variant="link" onClick={resetFilters}>
                     Clear all filters
                  </Button>
               </div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AnimatePresence>
                     {parts.map(part => (
                        <PartCard key={part.id} part={part} onClick={handleCardClick} />
                     ))}
                  </AnimatePresence>
               </div>
            )}
            
            {/* Pagination */}
            {(totalCount > 0 || page > 0) && (
               <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-slate-500">
                     Showing <span className="font-medium">{totalCount === 0 ? 0 : (page * pageSize + 1)}</span> to <span className="font-medium">{Math.min((page + 1) * pageSize, totalCount)}</span> of <span className="font-medium">{totalCount}</span> results
                  </p>
                  <div className="flex gap-2">
                     <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                     <Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
               </div>
            )}
         </>
      )}

      {/* Details Modal */}
      <PartDetailsModal 
        part={viewDetails} 
        onClose={() => setViewDetails(null)} 
        onDeleteRequest={(id) => setDeleteId(id)}
        onEditRequest={handleEdit}
      />

      {/* Part Form (Create/Edit) */}
      {isGodAdmin && (
        <PartForm 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          editPart={editingPart} 
          onSuccess={handleFormSuccess} 
        />
      )}

      {/* Category Manager */}
      {isGodAdmin && (
        <CategoryManager 
          open={isCategoryManagerOpen}
          onOpenChange={setIsCategoryManagerOpen}
          onSuccess={loadCategories}
        />
      )}

      {/* Delete Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
         <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
               <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
               <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this spare part and remove it from the inventory.
               </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
               <AlertDialogCancel>Cancel</AlertDialogCancel>
               <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SpareParts;