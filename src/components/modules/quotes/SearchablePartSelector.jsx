import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, AlertCircle, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';

/**
 * SearchablePartSelector Component
 * Allows searching for existing parts or creating new ones inline
 * NOW: Loads preferred_supplier data for smart matching
 */
const SearchablePartSelector = ({ 
  value, 
  onChange, 
  supplierFilter = null,
  showCategoryInfo = true 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPart, setNewPart] = useState({ name: '', sku: '', category: '' });
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch parts on mount - NOW INCLUDES preferred_supplier data
  useEffect(() => {
    const loadParts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load parts with their preferred supplier info
        const { data, error: err } = await supabase
          .from('spare_parts')
          .select(`
            *,
            preferred_supplier:preferred_supplier_id(
              id,
              name,
              email,
              phone
            )
          `)
          .order('name', { ascending: true });
        
        if (err) throw err;
        setParts(data || []);
      } catch (err) {
        setError('Failed to load parts');
        console.error('Error loading parts:', err);
        setParts([]);
      } finally {
        setLoading(false);
      }
    };

    loadParts();
  }, [supplierFilter]);

  // Filter parts based on search query - NO USEMEMO
  const filterParts = () => {
    try {
      if (!Array.isArray(parts)) {
        return [];
      }
      
      if (!searchQuery || !searchQuery.trim()) {
        return parts;
      }

      const query = searchQuery.toLowerCase();
      return parts.filter((part) => {
        if (!part) return false;
        return (
          (part.name && part.name.toLowerCase().includes(query)) ||
          (part.sku && part.sku.toLowerCase().includes(query)) ||
          (part.category && part.category.toLowerCase().includes(query)) ||
          (part.description && part.description.toLowerCase().includes(query))
        );
      });
    } catch (err) {
      console.error('Filter error:', err);
      return parts || [];
    }
  };

  const filteredParts = filterParts();

  // Check if search query could be a new part
  const isNewPartQuery = searchQuery.trim().length > 0 && 
    !filteredParts.some(p => p.name?.toLowerCase() === searchQuery.toLowerCase());

  // Handle selection of existing part
  const handleSelectPart = (part) => {
    onChange(part);
    setIsOpen(false);
    setSearchQuery('');
    setShowCreateForm(false);
  };

  // Handle creation of new part
  const handleCreatePart = async () => {
    if (!newPart.name.trim()) {
      setError('Part name is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('spare_parts')
        .insert({
          name: newPart.name || searchQuery,
          sku: newPart.sku || `SKU-${Date.now()}`,
          category: newPart.category || 'Custom',
          description: `Custom part created on ${new Date().toLocaleDateString()}`,
          current_quantity: 0,
          reorder_point: 0,
          unit_cost: 0,
          created_at: new Date().toISOString()
        })
        .select();

      if (err) throw err;

      const createdPart = data[0];
      setParts((prev) => [createdPart, ...prev]);
      handleSelectPart(createdPart);
      setNewPart({ name: '', sku: '', category: '' });
    } catch (err) {
      setError('Failed to create part');
      console.error('Error creating part:', err);
    } finally {
      setCreating(false);
    }
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

  const selectedPart = value;
  const displayName = selectedPart?.name ? String(selectedPart.name) : 'Search or create part...';
  const inputValue = isOpen ? searchQuery : (selectedPart?.name ? String(selectedPart.name) : '');

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
          {selectedPart && (
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
                <span className="ml-2 text-sm text-slate-500">Loading parts...</span>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="p-4 flex items-start gap-2 bg-red-50 border-b border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            {/* Parts List */}
            {!loading && Array.isArray(filteredParts) && filteredParts.length > 0 && (
              <div className="border-b border-slate-200">
                {filteredParts.map((part) => {
                  if (!part?.id) return null;
                  const hasPreferredSupplier = part.preferred_supplier && part.preferred_supplier.id;
                  return (
                    <button
                      key={part.id}
                      onClick={() => handleSelectPart(part)}
                      className={`w-full text-left px-4 py-3 hover:bg-teal-50 border-b border-slate-100 last:border-b-0 transition-colors ${
                        hasPreferredSupplier ? 'bg-gradient-to-r from-white to-teal-50/50' : ''
                      }`}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-slate-900">
                              {part.name || 'Unknown'}
                            </p>
                            {hasPreferredSupplier && (
                              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-semibold">
                                ⭐ {part.preferred_supplier.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {part.sku && (
                              <span className="text-xs text-slate-500">
                                SKU: {part.sku}
                              </span>
                            )}
                            {part.category && showCategoryInfo && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 text-teal-700">
                                {part.category}
                              </span>
                            )}
                          </div>
                          {hasPreferredSupplier && (
                            <p className="text-xs text-teal-600 mt-1 font-medium">
                              📧 {part.preferred_supplier.email}
                            </p>
                          )}
                        </div>
                        {selectedPart?.id === part.id && (
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* No Results Message */}
            {!loading && (!Array.isArray(filteredParts) || filteredParts.length === 0) && !isNewPartQuery && (
              <div className="p-4 text-center text-sm text-slate-500">
                No parts found
              </div>
            )}

            {/* Create New Part Option */}
            {isNewPartQuery && (
              <div className="border-b border-slate-200">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="w-full px-4 py-3 flex items-center gap-2 text-teal-600 hover:bg-teal-50 transition-colors"
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Create new part: "{searchQuery}"
                  </span>
                </button>
              </div>
            )}

            {/* Create Form */}
            {showCreateForm && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Part Name *
                  </label>
                  <input
                    type="text"
                    value={newPart.name || searchQuery}
                    onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter part name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SKU (Optional)
                  </label>
                  <input
                    type="text"
                    value={newPart.sku}
                    onChange={(e) => setNewPart({ ...newPart, sku: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., PART-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category (Optional)
                  </label>
                  <select
                    value={newPart.category}
                    onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select category...</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCreatePart}
                    disabled={creating}
                    className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
                    type="button"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Part
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewPart({ name: '', sku: '', category: '' });
                    }}
                    className="flex-1 px-3 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 text-sm font-medium rounded transition-colors"
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Part Display - WITH Preferred Supplier */}
      {selectedPart && !isOpen && (
        <div className={`p-3 rounded-lg border ${
          selectedPart.preferred_supplier
            ? 'bg-teal-50 border-teal-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <p className="text-sm font-medium text-slate-900">{selectedPart.name}</p>
          {selectedPart.sku && (
            <p className="text-xs text-slate-600 mt-1">SKU: {selectedPart.sku}</p>
          )}
          {selectedPart.category && (
            <p className="text-xs text-slate-600">Category: {selectedPart.category}</p>
          )}
          {selectedPart.preferred_supplier && (
            <div className="mt-2 pt-2 border-t border-teal-200">
              <p className="text-xs font-semibold text-teal-700">Preferred Supplier:</p>
              <p className="text-sm text-teal-600 font-medium">{selectedPart.preferred_supplier.name}</p>
              <p className="text-xs text-teal-600">📧 {selectedPart.preferred_supplier.email}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchablePartSelector;