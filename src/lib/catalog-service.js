import { supabase } from './customSupabaseClient';

const handleRequest = async (promise) => {
  try {
    const { data, error } = await promise;
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Database error:', error);
    return { data: null, error };
  }
};

export const catalogService = {
  // ===== MACHINE PARTS CATALOGS =====

  /**
   * Get catalog for a specific machine
   */
  async getCatalog(machineId) {
    return handleRequest(
      supabase
        .from('machine_parts_catalogs')
        .select(`
          *,
          hotspots:machine_hotspots(
            id,
            position_data,
            part_id,
            label,
            color,
            border_color,
            created_at,
            part:spare_parts(
              id,
              name,
              part_number,
              current_quantity,
              unit_of_measure,
              category
            )
          )
        `)
        .eq('machine_id', machineId)
        .single()
    );
  },

  /**
   * Get all catalogs with pagination
   */
  async getAllCatalogs(page = 1, limit = 10) {
    const from = (page - 1) * limit;
    return handleRequest(
      supabase
        .from('machine_parts_catalogs')
        .select('*, hotspots:machine_hotspots(count)', { count: 'exact' })
        .range(from, from + limit - 1)
    );
  },

  /**
   * Create or update a catalog
   */
  async saveCatalog(machineId, catalogData) {
    // Check if catalog exists
    const { data: existing } = await supabase
      .from('machine_parts_catalogs')
      .select('id')
      .eq('machine_id', machineId)
      .single();

    if (existing) {
      return handleRequest(
        supabase
          .from('machine_parts_catalogs')
          .update({
            ...catalogData,
            updated_at: new Date().toISOString()
          })
          .eq('machine_id', machineId)
          .select()
          .single()
      );
    } else {
      return handleRequest(
        supabase
          .from('machine_parts_catalogs')
          .insert({
            machine_id: machineId,
            ...catalogData
          })
          .select()
          .single()
      );
    }
  },

  /**
   * Delete a catalog
   */
  async deleteCatalog(catalogId) {
    return handleRequest(
      supabase
        .from('machine_parts_catalogs')
        .delete()
        .eq('id', catalogId)
    );
  },

  // ===== MACHINE HOTSPOTS =====

  /**
   * Get hotspots for a catalog
   */
  async getHotspots(catalogId) {
    return handleRequest(
      supabase
        .from('machine_hotspots')
        .select(`
          *,
          part:spare_parts(
            id,
            name,
            part_number,
            current_quantity,
            unit_of_measure,
            category
          )
        `)
        .eq('catalog_id', catalogId)
    );
  },

  /**
   * Get a single hotspot with details
   */
  async getHotspot(hotspotId) {
    return handleRequest(
      supabase
        .from('machine_hotspots')
        .select(`
          *,
          part:spare_parts(
            id,
            name,
            part_number,
            current_quantity,
            unit_of_measure,
            category,
            suppliers:part_supplier_options(
              supplier_id,
              supplier_part_number,
              supplier:suppliers(name, contact_email)
            )
          )
        `)
        .eq('id', hotspotId)
        .single()
    );
  },

  /**
   * Create a new hotspot
   */
  async createHotspot(hotspotData) {
    return handleRequest(
      supabase
        .from('machine_hotspots')
        .insert(hotspotData)
        .select()
        .single()
    );
  },

  /**
   * Create multiple hotspots at once
   */
  async createHotspots(hotspotDataArray) {
    return handleRequest(
      supabase
        .from('machine_hotspots')
        .insert(hotspotDataArray)
        .select()
    );
  },

  /**
   * Update a hotspot
   */
  async updateHotspot(hotspotId, updates) {
    return handleRequest(
      supabase
        .from('machine_hotspots')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', hotspotId)
        .select()
        .single()
    );
  },

  /**
   * Delete a hotspot
   */
  async deleteHotspot(hotspotId) {
    return handleRequest(
      supabase
        .from('machine_hotspots')
        .delete()
        .eq('id', hotspotId)
    );
  },

  /**
   * Delete all hotspots for a catalog
   */
  async deleteHotspotsByName(catalogId) {
    return handleRequest(
      supabase
        .from('machine_hotspots')
        .delete()
        .eq('catalog_id', catalogId)
    );
  },

  // ===== STORAGE OPERATIONS =====

  /**
   * Upload diagram image to Supabase Storage
   */
  async uploadDiagram(file, machineId) {
    try {
      const fileName = `machine-${machineId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage
        .from('machine-diagrams')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('machine-diagrams')
        .getPublicUrl(fileName);

      return { data: { url: urlData.publicUrl, name: fileName }, error: null };
    } catch (error) {
      console.error('Upload error:', error);
      return { data: null, error };
    }
  },

  /**
   * Delete diagram from storage
   */
  async deleteDiagram(fileName) {
    return handleRequest(
      supabase.storage
        .from('machine-diagrams')
        .remove([fileName])
    );
  },

  // ===== ANALYTICS & REPORTING =====

  /**
   * Get catalog statistics
   */
  async getCatalogStats(machineId) {
    try {
      const { data: hotspotData } = await supabase
        .from('machine_hotspots')
        .select('id')
        .eq('catalog_id', machineId);

      const { data: partData } = await supabase
        .from('machine_hotspots')
        .select('part_id, part:spare_parts(current_quantity)')
        .eq('catalog_id', machineId);

      const totalHotspots = hotspotData?.length || 0;
      const totalStockValue = partData?.reduce(
        (sum, item) => sum + (item.part?.current_quantity || 0),
        0
      ) || 0;

      return {
        data: {
          totalHotspots,
          totalStockValue,
          lastUpdated: new Date().toISOString()
        },
        error: null
      };
    } catch (error) {
      console.error('Stats error:', error);
      return { data: null, error };
    }
  },

  /**
   * Export catalog as JSON
   */
  async exportCatalog(catalogId) {
    return handleRequest(
      supabase
        .from('machine_parts_catalogs')
        .select(`
          *,
          hotspots:machine_hotspots(
            *,
            part:spare_parts(*)
          )
        `)
        .eq('id', catalogId)
        .single()
    );
  },

  /**
   * Import catalog from JSON
   */
  async importCatalog(machineId, catalogJson) {
    try {
      // Create catalog
      const { data: newCatalog, error: catalogError } = await supabase
        .from('machine_parts_catalogs')
        .insert({
          machine_id: machineId,
          diagram_url: catalogJson.diagram_url,
          diagram_name: catalogJson.diagram_name || 'Imported Catalog',
          is_active: true
        })
        .select()
        .single();

      if (catalogError) throw catalogError;

      // Create hotspots
      if (catalogJson.hotspots && catalogJson.hotspots.length > 0) {
        const hotspots = catalogJson.hotspots.map(h => ({
          catalog_id: newCatalog.id,
          part_id: h.part_id,
          position_data: h.position_data,
          label: h.label,
          color: h.color,
          border_color: h.border_color
        }));

        const { error: hotspotsError } = await supabase
          .from('machine_hotspots')
          .insert(hotspots);

        if (hotspotsError) throw hotspotsError;
      }

      return { data: newCatalog, error: null };
    } catch (error) {
      console.error('Import error:', error);
      return { data: null, error };
    }
  },

  /**
   * Search hotspots by part name
   */
  async searchHotspots(catalogId, searchTerm) {
    return handleRequest(
      supabase
        .from('machine_hotspots')
        .select(`
          *,
          part:spare_parts(
            id,
            name,
            part_number
          )
        `)
        .eq('catalog_id', catalogId)
        .ilike('part.name', `%${searchTerm}%`)
    );
  }
};

export default catalogService;
