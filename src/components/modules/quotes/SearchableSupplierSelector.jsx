import React, { useState, useEffect, useRef } from 'react';
import { Search, AlertCircle, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * SearchableSupplierSelector Component
 * Allows searching for suppliers with a dropdown
 * FIXED: Removed useMemo to prevent React #310 errors
 */
const SearchableSupplierSelector = ({ 
  value, 
  onChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch suppliers on mount
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: err } = await supabase
          .from('suppliers')
          .select('*')
          .order('name', { ascending: true });
        
        if (err) throw err;
        setSuppliers(data || []);
      } catch (err) {
        setError('Failed to load suppliers');
        console.error('Error loading suppliers:', err);
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    };

    loadSuppliers();
  }, []);

  // Filter suppliers based on search query - NO USEMEMO
  const filterSuppliers = () => {
    try {
      if (!Array.isArray(suppliers)) {
        return [];
      }
      
      if (!searchQuery || !searchQuery.trim()) {
        return suppliers;
      }

      const query = searchQuery.toLowerCase();
      return suppliers.filter((supplier) => {
        if (!supplier) return false;
        return (
          (supplier.name && supplier.name.toLowerCase().includes(query)) ||
          (supplier.email && supplier.email.toLowerCase().includes(query)) ||
          (supplier.phone && supplier.phone.toLowerCase().includes(query))
        );
      });
    } catch (err) {
      console.error('Filter error:', err);
      return suppliers || [];
    }
  };

  const filteredSuppliers = filterSuppliers();

  // Handle selection of supplier
  const handleSelectSupplier = (supplier) => {
    onChange(supplier);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedSupplier = value;
  const displayName = selectedSupplier?.name ? String(selectedSupplier.name) : 'Search suppliers...';
  const inputValue = isOpen ? searchQuery : (selectedSupplier?.name ? String(selectedSupplier.name) : '');

  return (
    <div className="w-full space-y-2" ref={dropdownRef}>
      {/* Main Input */}
      <div className="relative">
        <div
          className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg bg-white hover:border-slate-400 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all"
          onClick={() => !isOpen && setIsOpen(true)}
        >
          <Search className="w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={displayName}
            value={inputValue}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="flex-1 bg-transparent outline-none text-sm text-slate-900"
          />
          {selectedSupplier && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                setSearchQuery('');
              }}
              className="text-slate-400 hover:text-slate-600"
              type="button"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                <span className="ml-2 text-sm text-slate-500">Loading suppliers...</span>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="p-4 flex items-start gap-2 bg-red-50 border-b border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            {/* Suppliers List */}
            {!loading && Array.isArray(filteredSuppliers) && filteredSuppliers.length > 0 && (
              <div className="border-b border-slate-200">
                {filteredSuppliers.map((supplier) => {
                  if (!supplier?.id) return null;
                  return (
                    <button
                      key={supplier.id}
                      onClick={() => handleSelectSupplier(supplier)}
                      className="w-full text-left px-4 py-3 hover:bg-teal-50 border-b border-slate-100 last:border-b-0 transition-colors"
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900">
                            {supplier.name || 'Unknown'}
                          </p>
                          <div className="flex flex-col gap-1 mt-1">
                            {supplier.email && (
                              <span className="text-xs text-slate-500">
                                📧 {supplier.email}
                              </span>
                            )}
                            {supplier.phone && (
                              <span className="text-xs text-slate-500">
                                📞 {supplier.phone}
                              </span>
                            )}
                          </div>
                          {(supplier.quality_score || supplier.delivery_score) && (
                            <div className="flex items-center gap-3 mt-2">
                              {supplier.quality_score && (
                                <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                  Quality: ⭐ {supplier.quality_score}
                                </span>
                              )}
                              {supplier.delivery_score && (
                                <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                  Delivery: ⭐ {supplier.delivery_score}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {selectedSupplier?.id === supplier.id && (
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* No Results Message */}
            {!loading && (!Array.isArray(filteredSuppliers) || filteredSuppliers.length === 0) && !error && (
              <div className="p-4 text-center text-sm text-slate-500">
                No suppliers found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Supplier Display */}
      {selectedSupplier && !isOpen && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
          <p className="text-sm font-medium text-teal-900">{selectedSupplier.name}</p>
          {selectedSupplier.email && (
            <p className="text-xs text-teal-700 mt-1">📧 {selectedSupplier.email}</p>
          )}
          {selectedSupplier.phone && (
            <p className="text-xs text-teal-700">📞 {selectedSupplier.phone}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSupplierSelector;