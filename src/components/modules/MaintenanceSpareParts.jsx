import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  Search, 
  AlertCircle, 
  Eye, 
  ChevronRight, 
  RefreshCw, 
  Loader2,
  LogOut,
  Globe
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import ImageWithFallback from '@/components/common/ImageWithFallback';
import ErrorBoundary from '@/components/ErrorBoundary';
import PartDetailsModal from '@/components/modules/spare-parts/PartDetailsModal';

const MaintenanceSpareParts = ({ onLogout, technicianName, userRole, userPermissions }) => {
  const { toast } = useToast();
  const { language, setLanguage } = useTranslation();
  
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPart, setSelectedPart] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'stock', 'cost'

  // Translation dictionary for technician spare parts
  const translations = {
    en: {
      title: 'Spare Parts Catalog',
      loggedInAs: 'Logged in as',
      readOnlyView: 'Read-Only View',
      logout: 'Logout',
      searchPlaceholder: 'Search by name, part number, or barcode...',
      sortBy: 'Sort by',
      name: 'Name',
      stock: 'Stock',
      cost: 'Cost',
      refresh: 'Refresh',
      showing: 'Showing',
      of: 'of',
      parts: 'parts',
      loading: 'Loading spare parts...',
      noPartsFound: 'No parts found',
      tryDifferentSearch: 'Try a different search',
      loadingParts: 'Loading parts...',
      minStock: 'Min Stock',
      avgCost: 'Avg Cost',
      outOfStock: 'Out of Stock',
      lowStock: 'Low Stock',
      inStock: 'In Stock',
      viewDetails: 'View Details',
      errorLoading: 'Error loading spare parts',
      failedLoadParts: 'Failed to load spare parts'
    },
    bg: {
      title: 'Каталог на резервни части',
      loggedInAs: 'Вход като',
      readOnlyView: 'Преглед само за четене',
      logout: 'Изход',
      searchPlaceholder: 'Търсене по име, номер на част или баркод...',
      sortBy: 'Сортирай по',
      name: 'Име',
      stock: 'Наличност',
      cost: 'Цена',
      refresh: 'Обновяване',
      showing: 'Показва се',
      of: 'от',
      parts: 'части',
      loading: 'Зареждане на резервни части...',
      noPartsFound: 'Намерени са 0 части',
      tryDifferentSearch: 'Опитайте друго търсене',
      loadingParts: 'Зареждане на части...',
      minStock: 'Мин. наличност',
      avgCost: 'Среда. цена',
      outOfStock: 'Няма наличност',
      lowStock: 'Ниска наличност',
      inStock: 'В наличност',
      viewDetails: 'Преглед детайли',
      errorLoading: 'Грешка при зареждане',
      failedLoadParts: 'Неуспешно зареждане на резервни части'
    }
  };

  const lang = language === 'bg' ? 'bg' : 'en';
  const t = translations[lang];

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
        title: t.errorLoading,
        description: t.failedLoadParts
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
      return { label: t.outOfStock, variant: 'destructive', icon: '🔴' };
    }
    if (part.current_quantity <= part.min_stock_level) {
      return { label: t.lowStock, variant: 'warning', icon: '🟡' };
    }
    return { label: t.inStock, variant: 'success', icon: '🟢' };
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
                  📦 {t.title}
                </CardTitle>
                <p className="text-sm text-slate-500 mt-2">
                  {t.loggedInAs}: <span className="font-semibold text-slate-700">{technicianName}</span> ({t.readOnlyView})
                </p>
              </div>
              <div className="flex gap-2">
                {/* Language Switcher */}
                <div className="flex gap-1 bg-white rounded-lg p-1 border border-slate-200">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      language === 'en'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage('bg')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      language === 'bg'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    БГ
                  </button>
                </div>
                {/* Logout Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={onLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t.logout}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-slate-50 border-slate-200"
              />
            </div>

            {/* Controls */}
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-sm text-slate-600 font-medium">{t.sortBy}:</span>
              <div className="flex gap-1">
                {['name', 'stock', 'cost'].map(option => (
                  <Button
                    key={option}
                    variant={sortBy === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy(option)}
                    className="capitalize"
                  >
                    {option === 'name' && t.name}
                    {option === 'stock' && t.stock}
                    {option === 'cost' && t.cost}
                  </Button>
                ))}
              </div>
              <div className="ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchParts}
                  disabled={loading}
                  title={t.refresh}
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
              {t.showing} <span className="font-semibold text-slate-800">{filteredParts.length}</span> {t.of} <span className="font-semibold text-slate-800">{parts.length}</span> {t.parts}
            </div>
          </CardContent>
        </Card>

        {/* Parts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
              <p className="text-slate-600">{t.loading}</p>
            </div>
          </div>
        ) : filteredParts.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">{t.noPartsFound}</p>
              <p className="text-sm text-slate-500 mt-1">
                {searchQuery ? t.tryDifferentSearch : t.loadingParts}
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
                        <p className="text-slate-500 font-medium mb-0.5">{t.minStock}</p>
                        <p className="font-semibold text-slate-800">{part.min_stock_level}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-slate-500 font-medium mb-0.5">{t.avgCost}</p>
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
                      {t.viewDetails}
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