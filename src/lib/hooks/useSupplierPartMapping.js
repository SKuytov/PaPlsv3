import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Custom hook to load supplier part mappings (part number, SKU, etc.)
 * Handles auto-population of supplier-specific part information
 * 
 * @param {string} partId - The spare part ID
 * @param {string} supplierId - The supplier ID
 * @param {Function} onMappingFound - Callback when mapping is loaded
 * @returns {Object} { mapping, loading, error }
 * 
 * @example
 * const { mapping, loading, error } = useSupplierPartMapping(
 *   partId,
 *   supplierId,
 *   (data) => setSupplierPartNumber(data.supplier_part_number)
 * );
 */
export const useSupplierPartMapping = (partId, supplierId, onMappingFound) => {
  const [mapping, setMapping] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadMapping = useCallback(async () => {
    // Clear if either ID is missing
    if (!partId || !supplierId) {
      setMapping(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use maybeSingle() instead of single() to avoid errors when no match
      // maybeSingle() returns null if no match instead of throwing an error
      const { data, error: queryError } = await supabase
        .from('supplier_part_mappings')
        .select('supplier_part_number, supplier_sku, lead_time_days, unit_price')
        .eq('part_id', partId)
        .eq('supplier_id', supplierId)
        .maybeSingle();

      // Check for actual query errors (not "no result" errors)
      // PGRST116 is the "no rows" error which we handle gracefully
      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError;
      }

      setMapping(data);
      
      // Trigger callback if mapping found
      if (data && onMappingFound) {
        onMappingFound(data);
      }
    } catch (err) {
      console.error('Error loading supplier mapping:', err);
      setError(err.message);
      setMapping(null);
    } finally {
      setLoading(false);
    }
  }, [partId, supplierId, onMappingFound]);

  useEffect(() => {
    loadMapping();
  }, [loadMapping]);

  return { mapping, loading, error };
};

export default useSupplierPartMapping;