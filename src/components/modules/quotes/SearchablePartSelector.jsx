import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, AlertCircle, Loader2, Check } from 'lucide-react';
import { dbService } from '../../../utils/dbService';

/**
 * SearchablePartSelector Component
 * Allows searching for existing parts or creating new ones inline
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
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch parts on mount and when supplier filter changes
  useEffect(() => {
    const loadParts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await dbService.get('/api/parts', {
          params: supplierFilter ? { supplier_id: supplierFilter } : {},
        });
        setParts(response.data || []);
      } catch (err) {
        setError('Failed to load parts');
        console.error('Error loading parts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadParts();
  }, [supplierFilter]);

  // Filter parts based on search query
  const filteredParts = useMemo(() => {
    if (!searchQuery.trim()) return parts;

    const query = searchQuery.toLowerCase();
    return parts.filter(
      (part) =>
        part.name?.toLowerCase().includes(query) ||
        part.sku?.toLowerCase().includes(query) ||
        part.category?.toLowerCase().includes(query) ||
        part.description?.toLowerCase().includes(query)
    );
  }, [parts, searchQuery]);

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

      const response = await dbService.post('/api/parts', {
        name: newPart.name || searchQuery,
        sku: newPart.sku || `SKU-${Date.now()}`,
        category: newPart.category || 'Custom',
        description: `Custom part created on ${new Date().toLocaleDateString()}`,
      });

      const createdPart = response.data;
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

  return (
    <div className="w-full space-y-2" ref={dropdownRef}>
      {/* Main Input */}
      <div className="relative">
        <div
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
          onClick={() => !isOpen && setIsOpen(true)}
        >
          <Search className="w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={selectedPart ? selectedPart.name : 'Search or create part...'}
            value={isOpen ? searchQuery : selectedPart?.name || ''}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100"
          />
          {selectedPart && (
            <button
              onClick={() => {
                onChange(null);
                setSearchQuery('');
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Loading parts...</span>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="p-4 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}

            {/* Parts List */}
            {!loading && filteredParts.length > 0 && (
              <div className="border-b border-gray-200 dark:border-gray-700">
                {filteredParts.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => handleSelectPart(part)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {part.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {part.sku && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              SKU: {part.sku}
                            </span>
                          )}
                          {part.category && showCategoryInfo && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              {part.category}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedPart?.id === part.id && (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {!loading && filteredParts.length === 0 && !isNewPartQuery && (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No parts found
              </div>
            )}

            {/* Create New Part Option */}
            {isNewPartQuery && (
              <div className="border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="w-full px-4 py-3 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
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
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Part Name *
                  </label>
                  <input
                    type="text"
                    value={newPart.name || searchQuery}
                    onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter part name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    SKU (Optional)
                  </label>
                  <input
                    type="text"
                    value={newPart.sku}
                    onChange={(e) => setNewPart({ ...newPart, sku: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., PART-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Category (Optional)
                  </label>
                  <select
                    value={newPart.category}
                    onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
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
                    className="flex-1 px-3 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 text-sm font-medium rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Part Display */}
      {selectedPart && !isOpen && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{selectedPart.name}</p>
          {selectedPart.sku && (
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">SKU: {selectedPart.sku}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchablePartSelector;
