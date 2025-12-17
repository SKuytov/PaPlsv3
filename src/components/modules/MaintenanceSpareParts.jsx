import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Search, 
  AlertCircle, 
  Eye, 
  ChevronRight, 
  RefreshCw, 
  Loader2,
  LogOut 
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import ImageWithFallback from '@/components/common/ImageWithFallback';
import ErrorBoundary from '@/components/ErrorBoundary';
import PartDetailsModal from '@/components/modules/spare-parts/PartDetailsModal';

const MaintenanceSpareParts = ({ onLogout, technicianName }) => {
  const { toast } = useToast();
  
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPart, setSelectedPart] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'stock', 'cost'

  // Fetch all spare parts (read-only for technician)
  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select(`
          *,
          part_supplier_options (
            supplier:suppliers (id, name, email, phone)
          ),
          warehouse:warehouses(name)
        `)
        .order('name');

      if (error) throw error;

      setParts(data || []);
      setFilteredParts(data || []);
    } catch (error) {
      console.error('[MaintenanceSpareParts] Error fetching parts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load spare parts'
      });
    } finally {
      setLoading(false);
    }
  };

  // Search and filter parts
  useEffect(() => {
    let results = [...parts];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(part => 
        part.name.toLowerCase().includes(query) ||
        part.part_number.toLowerCase().includes(query) ||
        part.barcode.toLowerCase().includes(query) ||
        part.description?.toLowerCase().includes(query)
      );
    }

    // Sort results
    switch (sortBy) {
      case 'stock':
        results.sort((a, b) => b.current_quantity - a.current_quantity);
        break;
      case 'cost':
        results.sort((a, b) => (b.average_cost || 0) - (a.average_cost || 0));
        break;
      case 'name':
      default:
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredParts(results);
  }, [searchQuery, parts, sortBy]);

  const handleViewDetails = (part) => {
    setSelectedPart(part);
    setDetailsModalOpen(true);
  };

  const getStockStatus = (part) => {
    if (part.current_quantity === 0) {
      return { label: 'Out of Stock', variant: 'destructive', icon: '🔴' };
    }
    if (part.current_quantity <= part.min_stock_level) {
      return { label: 'Low Stock', variant: 'warning', icon: '🟡' };
    }
    return { label: 'In Stock', variant: 'success', icon: '🟢' };
  };

  return (
    <ErrorBoundary>
      <div className="w-full max-w-5xl mx-auto">
        {/* Header Card */}
        <Card className="mb-6 border-slate-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-slate-800 flex items-center gap-2">
                  📦 Spare Parts Catalog
                </CardTitle>
                <p className="text-sm text-slate-500 mt-2">
                  Logged in as: <span className="font-semibold text-slate-700">{technicianName}</span> (Read-Only View)
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by name, part number, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-slate-50 border-slate-200"
              />
            </div>

            {/* Controls */}
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-sm text-slate-600 font-medium">Sort by:</span>
              <div className="flex gap-1">
                {['name', 'stock', 'cost'].map(option => (
                  <Button
                    key={option}
                    variant={sortBy === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy(option)}
                    className="capitalize"
                  >
                    {option === 'name' && 'Name'}
                    {option === 'stock' && 'Stock'}
                    {option === 'cost' && 'Cost'}
                  </Button>
                ))}
              </div>
              <div className="ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchParts}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Results Summary */}
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-800">{filteredParts.length}</span> of <span className="font-semibold text-slate-800">{parts.length}</span> parts
            </div>
          </CardContent>
        </Card>

        {/* Parts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
              <p className="text-slate-600">Loading spare parts...</p>
            </div>
          </div>
        ) : filteredParts.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No parts found</p>
              <p className="text-sm text-slate-500 mt-1">
                {searchQuery ? 'Try a different search' : 'Loading parts...'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParts.map(part => {
              const stockStatus = getStockStatus(part);
              return (
                <Card key={part.id} className="hover:shadow-lg transition-shadow border-slate-200">
                  <CardContent className="p-4 space-y-3">
                    {/* Part Image */}
                    <div className="relative bg-slate-100 rounded-lg overflow-hidden h-32 flex items-center justify-center">
                      <ImageWithFallback
                        src={part.photo_url}
                        alt={part.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Part Name and Number */}
                    <div>
                      <h3 className="font-semibold text-slate-900 truncate text-sm">
                        {part.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {part.part_number}
                      </p>
                    </div>

                    {/* Stock Status */}
                    <div className="flex items-center gap-2">
                      <Badge variant={stockStatus.variant === 'destructive' ? 'destructive' : 'default'} className="text-xs">
                        {stockStatus.icon} {stockStatus.label}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-700">
                        {part.current_quantity} {part.unit_of_measure}
                      </span>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-slate-500 font-medium mb-0.5">Min Stock</p>
                        <p className="font-semibold text-slate-800">{part.min_stock_level}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-slate-500 font-medium mb-0.5">Avg Cost</p>
                        <p className="font-semibold text-slate-800">
                          {part.average_cost ? `$${part.average_cost.toFixed(2)}` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Warehouse Info */}
                    {part.warehouse && (
                      <div className="bg-blue-50 p-2 rounded text-xs">
                        <p className="text-blue-600 font-medium">
                          📍 {part.warehouse.name}
                        </p>
                      </div>
                    )}

                    {/* Barcode */}
                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded font-mono break-words">
                      {part.barcode}
                    </div>

                    {/* View Details Button */}
                    <Button
                      onClick={() => handleViewDetails(part)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-9"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedPart && (
        <PartDetailsModal
          open={detailsModalOpen}
          part={selectedPart}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedPart(null);
          }}
          onDeleteRequest={() => {}}
          onEditRequest={() => {}}
        />
      )}
    </ErrorBoundary>
  );
};

export default MaintenanceSpareParts;
