import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, AlertCircle, Loader2, Check, Scan, Edit2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import BarcodeScanner from './BarcodeScanner';

/**
 * SearchablePartSelector Component
 * Enhanced to:
 * - Load supplier_part_number and supplier_sku from supplier_part_mappings
 * - Display warnings when supplier data is missing
 * - Allow users to add missing supplier information
 */
const SearchablePartSelector = ({ 
  value, 
  onChange, 
  supplierFilter = null,
  showCategoryInfo = true,
  onScanComplete = null,
  selectedSupplier = null
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [newPart, setNewPart] = useState({ name: '', sku: '', category: '' });
  const [creating, setCreating] = useState(false);
  const [supplierPartData, setSupplierPartData] = useState({});
  const { user } = useAuth();
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch parts with supplier mappings
  useEffect(() => {
    const loadParts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load parts with their preferred supplier and supplier mappings
        const { data, error: err } = await supabase
          .from('spare_parts')
          .select(`
            *,
            preferred_supplier:preferred_supplier_id(
              id,
              name,
              email,
              phone
            ),
            supplier_part_mappings(
              id,
              supplier_id,
              supplier_part_number,
              supplier_sku,
              supplier:supplier_id(
                id,
                name
              )
            )
          `)
          .order('name', { ascending: true });
        
        if (err) throw err;
        setParts(data || []);
        
        // Build supplier part data lookup
        const supplierData = {};
        data?.forEach(part => {
          if (part.supplier_part_mappings && part.supplier_part_mappings.length > 0) {
            supplierData[part.id] = part.supplier_part_mappings;
          }
        });
        setSupplierPartData(supplierData);
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

  // Get supplier part info for selected supplier
  const getSupplierPartInfo = (partId, supplierId) => {
    if (!supplierPartData[partId]) return null;
    return supplierPartData[partId].find(m => m.supplier_id === supplierId);
  };

  // Enhanced filter - searches by name, SKU, barcode, and part_number
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
          (part.barcode && part.barcode.toLowerCase().includes(query)) ||
          (part.part_number && part.part_number.toLowerCase().includes(query)) ||
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

  // Handle barcode/QR scan
  const handleScan = async (scannedData) => {
    const scanValue = scannedData.value.toLowerCase();
    
    // Search for part by barcode, part_number, or SKU
    const matchedPart = parts.find(p => 
      (p.barcode && p.barcode.toLowerCase() === scanValue) ||
      (p.part_number && p.part_number.toLowerCase() === scanValue) ||
      (p.sku && p.sku.toLowerCase() === scanValue)
    );

    if (matchedPart) {
      // Found matching part by scan
      handleSelectPart(matchedPart);
      if (onScanComplete) {
        onScanComplete(matchedPart);
      }
      setShowScanner(false);
    } else {
      // No match found
      setError(`No part found with barcode/QR: ${scanValue}`);
      setTimeout(() => setError(null), 3000);
      setShowScanner(false);
    }
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

  // Get supplier info for selected part
  const selectedSupplierInfo = selectedPart && selectedSupplier?.id 
    ? getSupplierPartInfo(selectedPart.id, selectedSupplier.id)
    : null;
  const hasSupplierData = selectedSupplierInfo?.supplier_part_number || selectedSupplierInfo?.supplier_sku;

  return (
    <div className="w-full space-y-2" ref={dropdownRef}>
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Main Input with Scanner Button */}
      <div className="relative">
        <div className="flex gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg bg-white hover:border-slate-400 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all"
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
          {/* Scanner Button */}
          <button
            onClick={() => setShowScanner(true)}
            className="px-3 py-2 bg-teal-100 hover:bg-teal-200 border border-teal-300 rounded-lg text-teal-700 font-semibold transition-colors flex items-center gap-2"
            title="Scan barcode or QR code"
            type="button"
          >
            <Scan className="w-4 h-4" />
            <span className="hidden sm:inline">Scan</span>
          </button>
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

            {/* Search Hint */}
            {searchQuery && (
              <div className="p-3 bg-blue-50 border-b border-blue-200 text-xs text-blue-700">
                🔍 Searching by: Name, SKU, Barcode, Part Number
              </div>
            )}

            {/* Parts List */}
            {!loading && Array.isArray(filteredParts) && filteredParts.length > 0 && (
              <div className="border-b border-slate-200">
                {filteredParts.map((part) => {
                  if (!part?.id) return null;
                  const hasPreferredSupplier = part.preferred_supplier && part.preferred_supplier.id;
                  const supplierInfo = selectedSupplier?.id ? getSupplierPartInfo(part.id, selectedSupplier.id) : null;
                  const hasMissingSupplierData = selectedSupplier && !supplierInfo?.supplier_part_number && !supplierInfo?.supplier_sku;
                  
                  return (
                    <button
                      key={part.id}
                      onClick={() => handleSelectPart(part)}
                      className={`w-full text-left px-4 py-3 hover:bg-teal-50 border-b border-slate-100 last:border-b-0 transition-colors ${
                        hasPreferredSupplier ? 'bg-gradient-to-r from-white to-teal-50/50' : ''
                      } ${hasMissingSupplierData ? 'ring-1 ring-amber-200 bg-amber-50/30' : ''}`}
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
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {part.sku && (
                              <span className="text-xs text-slate-500">
                                SKU: {part.sku}
                              </span>
                            )}
                            {part.barcode && (
                              <span className="text-xs text-slate-500">
                                📦 {part.barcode}
                              </span>
                            )}
                            {part.part_number && (
                              <span className="text-xs text-slate-500">
                                # {part.part_number}
                              </span>
                            )}
                            {part.category && showCategoryInfo && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 text-teal-700">
                                {part.category}
                              </span>
                            )}
                          </div>
                          
                          {/* Supplier Part Info */}
                          {selectedSupplier && (
                            <div className="mt-2 pt-2 border-t border-slate-200">
                              {supplierInfo ? (
                                <div className="space-y-1">
                                  {supplierInfo.supplier_part_number && (
                                    <p className="text-xs text-slate-600">Supplier Part #: <span className="font-semibold text-slate-900">{supplierInfo.supplier_part_number}</span></p>
                                  )}
                                  {supplierInfo.supplier_sku && (
                                    <p className="text-xs text-slate-600">Supplier SKU: <span className="font-semibold text-slate-900">{supplierInfo.supplier_sku}</span></p>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-xs text-amber-700 font-medium">⚠️ No supplier mapping for {selectedSupplier.name}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
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

      {/* Selected Part Display - WITH Supplier Data */}
      {selectedPart && !isOpen && (
        <div className={`p-3 rounded-lg border ${
          hasSupplierData
            ? 'bg-teal-50 border-teal-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <p className="text-sm font-medium text-slate-900">{selectedPart.name}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {selectedPart.sku && (
              <p className="text-xs text-slate-600">SKU: {selectedPart.sku}</p>
            )}
            {selectedPart.barcode && (
              <p className="text-xs text-slate-600">📦 {selectedPart.barcode}</p>
            )}
            {selectedPart.part_number && (
              <p className="text-xs text-slate-600">#{selectedPart.part_number}</p>
            )}
          </div>
          {selectedPart.category && (
            <p className="text-xs text-slate-600 mt-1">Category: {selectedPart.category}</p>
          )}
          
          {/* Supplier Data Section */}
          {selectedSupplier && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <p className="text-xs font-semibold text-slate-700 mb-2">Supplier: {selectedSupplier.name}</p>
              {selectedSupplierInfo ? (
                <div className="space-y-1">
                  {selectedSupplierInfo.supplier_part_number ? (
                    <p className="text-xs text-slate-600">Supplier Part #: <span className="font-semibold text-slate-900">{selectedSupplierInfo.supplier_part_number}</span></p>
                  ) : (
                    <p className="text-xs text-amber-700 font-medium">⚠️ No Supplier Part Number</p>
                  )}
                  {selectedSupplierInfo.supplier_sku ? (
                    <p className="text-xs text-slate-600">Supplier SKU: <span className="font-semibold text-slate-900">{selectedSupplierInfo.supplier_sku}</span></p>
                  ) : (
                    <p className="text-xs text-amber-700 font-medium">⚠️ No Supplier SKU</p>
                  )}
                </div>
              ) : (
                <div className="p-2 bg-amber-100 border border-amber-300 rounded">
                  <p className="text-xs text-amber-800 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    No supplier mapping for this supplier
                  </p>
                  <p className="text-xs text-amber-700 mt-1">You can add supplier part number and SKU during quote creation if needed.</p>
                </div>
              )}
            </div>
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
