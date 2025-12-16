import { supabase } from '@/lib/customSupabaseClient';

// RESILIENCE: Standardized Error Class
class AppError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.originalError = originalError;
  }
}

// RESILIENCE: Retry Logic with Exponential Backoff
const withRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    // Don't retry client errors (4xx)
    if (retries === 0 || (error.code && error.code.startsWith('4'))) {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

// RESILIENCE: Timeout Wrapper
const withTimeout = (promise, ms = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new AppError('Request timed out', 'TIMEOUT')), ms), ms)
    ]
  );
};

// RESILIENCE: Centralized Request Handler
const handleRequest = async (requestPromise, options = {}) => {
  const { useRetry = true, timeout = 15000 } = options;

  try {
    const execute = () => withTimeout(requestPromise, timeout);
    const result = useRetry ? await withRetry(execute) : await execute();
    
    const { data, error } = result;
    
    if (error) {
      // Transform Supabase error to AppError
      throw new AppError(error.message, error.code, error);
    }
    
    return { data, error: null };
  } catch (err) {
    // Downgrade network errors to warnings to reduce noise in error logs
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
       console.warn("Safe Request Network Warning:", err.message);
    } else {
       console.error("Safe Request Error:", err);
    }
    
    // Return a safe error object for the UI to consume
    return { 
      data: null, 
      error: {
        message: err.code === 'TIMEOUT' ? 'Network request timed out. Please check your connection.' : (err.message || "An unexpected error occurred."),
        code: err.code || 'UNKNOWN'
      }
    };
  }
};

// Auth functions
export const authService = {
  async signIn(email, password) {
    console.log(`[Auth Debug] Supabase URL being used: ${supabase.supabaseUrl}`);
    try {
      const timeoutMs = 10000;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Login request timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const loginPromise = supabase.auth.signInWithPassword({ email, password });
      const result = await Promise.race([loginPromise, timeoutPromise]);
      
      const { data, error } = result;
      if (error) {
        console.error('[Auth Debug] Login Failed Details:', error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error('[Auth Debug] Unexpected Exception during sign in:', err);
      return { data: null, error: { message: err.message || 'An unexpected error occurred.', code: 'AUTH_EXCEPTION' }};
    }
  },
  async signOut() {
    return handleRequest(supabase.auth.signOut(), { useRetry: false });
  },
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data?.session;
  },
  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data?.user;
  }
};

// Backend API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:5000';

export const dbService = {
  // #region User & Profile
  async getUserWithRole(userId) {
    return handleRequest(supabase
      .from('users')
      .select('id, email, full_name, role_id, is_active, last_login, role:roles(id, name, permissions)')
      .eq('id', userId)
      .maybeSingle());
  },
  async createProfile(profile) {
    return handleRequest(supabase.from('users').insert(profile).select().single());
  },
  async getRoles() {
    return handleRequest(supabase.from('roles').select('id, name, description, permissions').order('name'));
  },
  
  // Notifications (stub for compatibility)
  async getNotifications(userId) {
    // Placeholder for future notification system
    return { data: [], error: null };
  },
  async getNotificationCount(userId) {
    return { data: 0, error: null };
  },
  
// #region Quote Management & Approvals - NEW
  async getQuoteRequests(status = null) {
    let query = supabase.from('quote_requests').select(`
      *,
      part:spare_parts(id, name, part_number, category),
      supplier:suppliers(id, name, email),
      quotes:quotes(*),
      approvals:quote_approvals(*)
    `).order('created_at', { ascending: false });
    
    if (status) query = query.eq('status', status);
    
    return handleRequest(query);
  },

  async getQuoteRequest(id) {
    return handleRequest(supabase.from('quote_requests')
      .select(`
        *,
        part:spare_parts(*),
        supplier:suppliers(*),
        quotes:quotes(*),
        approvals:quote_approvals(*),
        purchase_orders:purchase_orders(*),
        created_user:users!created_by(id, full_name, email)
      `)
      .eq('id', id)
      .single());
  },

  async updateQuoteRequestStatus(id, status) {
    return handleRequest(supabase.from('quote_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single());
  },

  // Quote Approvals
  async createQuoteApproval(quoteRequestId, approvalLevel, userId) {
    return handleRequest(supabase.from('quote_approvals')
      .insert({
        quote_request_id: quoteRequestId,
        approval_level: approvalLevel,
        created_by: userId,
        approval_status: 'pending'
      })
      .select()
      .single());
  },

  async getQuoteApprovalsForUser(userId, approvalLevel) {
    return handleRequest(supabase.from('quote_approvals')
      .select(`
        *,
        quote_request:quote_requests(
          id,
          quantity_requested,
          requested_unit_price,
          request_notes,
          created_at,
          part:spare_parts(id, name, part_number),
          supplier:suppliers(id, name, email),
          quotes(id, total_quote_price, quoted_unit_price)
        )
      `)
      .eq('approval_level', approvalLevel)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false }));
  },

  async approveQuote(approvalId, notes, userId) {
    return handleRequest(supabase.from('quote_approvals')
      .update({
        approval_status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        notes: notes
      })
      .eq('id', approvalId)
      .select()
      .single());
  },

  async rejectQuote(approvalId, rejectionReason, userId) {
    return handleRequest(supabase.from('quote_approvals')
      .update({
        approval_status: 'rejected',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectionReason
      })
      .eq('id', approvalId)
      .select()
      .single());
  },

  // Purchase Orders
  async generatePONumber() {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `PO-${date}-${random}`;
  },

  async createPurchaseOrder(poData, userId) {
    const poNumber = await this.generatePONumber();
    return handleRequest(supabase.from('purchase_orders')
      .insert({
        ...poData,
        po_number: poNumber,
        placed_by: userId,
        placed_at: new Date().toISOString(),
        po_status: 'draft'
      })
      .select(`
        *,
        supplier:suppliers(*),
        part:spare_parts(name, part_number),
        quote_request:quote_requests(*)
      `)
      .single());
  },

  async getPurchaseOrder(poId) {
    return handleRequest(supabase.from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(*),
        part:spare_parts(name, part_number),
        quote_request:quote_requests(*),
        tracking:order_tracking(*),
        delivery:delivery_verification(*)
      `)
      .eq('id', poId)
      .single());
  },

  async getPurchaseOrders(status = null) {
    let query = supabase.from('purchase_orders').select(`
      *,
      supplier:suppliers(name),
      part:spare_parts(name, part_number),
      tracking:order_tracking(*),
      placed_user:users!placed_by(full_name)
    `).order('placed_at', { ascending: false });

    if (status) query = query.eq('po_status', status);
    
    return handleRequest(query);
  },

  async updatePurchaseOrderStatus(poId, status) {
    return handleRequest(supabase.from('purchase_orders')
      .update({
        po_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', poId)
      .select()
      .single());
  },

  // Order Tracking
  async addOrderTracking(poId, trackingData, userId) {
    const { data: trackingRecord, error } = await handleRequest(supabase.from('order_tracking')
      .insert({
        po_id: poId,
        status: trackingData.status,
        tracking_number: trackingData.tracking_number,
        carrier: trackingData.carrier,
        estimated_delivery: trackingData.estimated_delivery,
        notes: trackingData.notes,
        updated_by: userId
      })
      .select()
      .single());

    if (!error && trackingRecord) {
      await this.updatePurchaseOrderStatus(poId, trackingData.status);
    }

    return { data: trackingRecord, error };
  },

  async getOrderTracking(poId) {
    return handleRequest(supabase.from('order_tracking')
      .select('*')
      .eq('po_id', poId)
      .order('status_date', { ascending: false }));
  },

  // Delivery Verification
  async verifyDelivery(poId, verificationData, userId) {
    // Create verification record
    const { data: verification, error } = await handleRequest(supabase.from('delivery_verification')
      .insert({
        po_id: poId,
        received_quantity: verificationData.received_quantity,
        received_date: verificationData.received_date,
        received_by: userId,
        condition_notes: verificationData.condition_notes,
        verification_status: verificationData.verification_status
      })
      .select()
      .single());

    if (!error && verification && verificationData.verification_status === 'verified') {
      // Get PO details
      const { data: po } = await this.getPurchaseOrder(poId);
      
      if (po) {
        // Update PO status to delivered
        await this.updatePurchaseOrderStatus(poId, 'delivered');

        // Update spare parts inventory
        const { data: part } = await supabase.from('spare_parts')
          .select('current_quantity')
          .eq('id', po.part_id)
          .single();

        if (part) {
          const newQuantity = (part.current_quantity || 0) + verificationData.received_quantity;
          await supabase.from('spare_parts')
            .update({
              current_quantity: newQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', po.part_id);
        }
      }
    }

    return { data: verification, error };
  },

  async getDeliveryVerification(poId) {
    return handleRequest(supabase.from('delivery_verification')
      .select('*')
      .eq('po_id', poId)
      .single());
  },

  async getActiveOrders() {
    return handleRequest(supabase.from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(name),
        part:spare_parts(name, part_number),
        tracking:order_tracking(*)
      `)
      .in('po_status', ['sent', 'confirmed', 'shipped', 'in_transit'])
      .order('expected_arrival_date', { ascending: true }));
  },

// #endregion

  
  // #endregion

  // #region Documents & Files - UPDATED FOR SERVER UPLOAD
  async getDocumentCategories() {
    return handleRequest(supabase.from('document_categories').select('*').order('name'));
  },
  
  async createDocumentCategory(name, description = '') {
    return handleRequest(supabase.from('document_categories').insert({ name, description }).select().single());
  },

  async deleteDocumentCategory(id) {
    return handleRequest(supabase.from('document_categories').delete().eq('id', id));
  },

  async getDocuments(filters = {}) {
    let query = supabase
      .from('document_files')
      .select(`*, category:document_categories(name), uploader:users!uploaded_by(full_name)`)
      .order('created_at', { ascending: false });

    if (filters.category_id && filters.category_id !== 'all') {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    return handleRequest(query);
  },

  // NEW: Upload document to server (backend)
  async uploadDocument(file, metadata) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', metadata.name);
      formData.append('description', metadata.description || '');
      formData.append('category_id', metadata.category_id);
      formData.append('uploaded_by', metadata.uploaded_by);

      // Upload to backend server
      const uploadResponse = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || `Upload failed with status ${uploadResponse.status}`);
      }

      const serverData = await uploadResponse.json();
      
      // Create database record in Supabase
      const { data: dbRecord, error: dbError } = await supabase
        .from('document_files')
        .insert({
          name: metadata.name,
          description: metadata.description || null,
          category_id: metadata.category_id,
          file_path: serverData.data.file_path, // Store filename from server
          file_type: serverData.data.file_type,
          file_size: serverData.data.file_size,
          uploaded_by: metadata.uploaded_by,
          server_path: serverData.data.server_path // Store full server path for reference
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database Error:', dbError);
        // Note: File is already on server, but DB record failed
        throw new Error(`Database error: ${dbError.message}. File uploaded but not registered.`);
      }

      return { data: dbRecord };
    } catch (error) {
      console.error('Upload error:', error);
      return { error: { message: error.message || 'File upload failed' } };
    }
  },

  async deleteDocument(id, filePath) {
    try {
      // 1. Delete from Server
      try {
        const deleteResponse = await fetch(`${API_BASE_URL}/api/documents/delete/${filePath}`, {
          method: 'DELETE'
        });
        
        if (!deleteResponse.ok) {
          console.warn(`Warning: Could not delete file from server: ${deleteResponse.statusText}`);
        }
      } catch (serverError) {
        console.warn('Warning: Server deletion error:', serverError);
      }

      // 2. Delete from DB
      return await handleRequest(supabase.from('document_files').delete().eq('id', id));
    } catch (error) {
      return { error };
    }
  },

  async getDocumentUrl(filePath) {
    // Return server URL instead of Supabase URL
    return `${API_BASE_URL}/api/documents/download/${filePath}`;
  },
  // #endregion

  // #region Spare Parts
  async getSpareParts(filters = {}, page = 0, pageSize = 50) {
    try {
      let query = supabase.from('spare_parts').select(`
        *, 
        warehouse:warehouses(id, name, building:buildings(id, name)),
        supplier_options:part_supplier_options(count)
      `, { count: 'exact' });
      
      if (filters.search) {
        const safeTerm = filters.search.replace(/[^\w\s\-\.]/gi, ''); 
        const term = `%${safeTerm}%`;
        query = query.or(`name.ilike.${term},part_number.ilike.${term},barcode.ilike.${term},manufacturer.ilike.${term}`);
      }
      if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
      if (filters.building_id && filters.building_id !== 'all') query = query.eq('building_id', filters.building_id);
      if (filters.no_barcode) query = query.is('barcode', null);
      if (filters.status === 'out') query = query.lte('current_quantity', 0);
      
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      return await handleRequest(query.order('created_at', { ascending: false }).range(from, to), { useRetry: true });
    } catch (error) {
      return { data: [], count: 0, error };
    }
  },
  async getPartDetails(id) {
    const request = supabase
      .from('spare_parts')
      .select(`
        *,
        warehouse:warehouses(id, name, building:buildings(id, name)),
        supplier_options:part_supplier_options(*, supplier:suppliers(*)),
        machine_associations:part_machine_associations(*, machine:machines(id, name, machine_code)),
        equivalent_parts_orig:equivalent_parts!original_part_id(*, part:spare_parts!equivalent_part_id(id, name, part_number)),
        equivalent_parts_equiv:equivalent_parts!equivalent_part_id(*, part:spare_parts!original_part_id(id, name, part_number))
      `)
      .eq('id', id)
      .single();

    const { data: part, error } = await handleRequest(request);
    if (part) {
      part.equivalent_parts = [
          ...(part.equivalent_parts_orig || []).map(e => ({ ...e, related_part: e.part })),
          ...(part.equivalent_parts_equiv || []).map(e => ({ ...e, related_part: e.part }))
      ];
    }
    return { data: part, error };
  },
  
  // FIX: Add missing createSparePart method
  async createSparePart(partData) {
    return handleRequest(supabase.from('spare_parts').insert(partData).select().single());
  },
  
  async createSparePartFull(partData, suppliers, machines, equivalents) {
    let partId = null;
    try {
      const { data: part, error: partError } = await supabase.from('spare_parts').insert(partData).select().single();
      if (partError) throw partError;
      partId = part.id;

      const promises = [];
      if (suppliers?.length) promises.push(supabase.from('part_supplier_options').insert(suppliers.map(s => ({ ...s, part_id: partId }))));
      if (machines?.length) promises.push(supabase.from('part_machine_associations').insert(machines.map(m => ({ ...m, part_id: partId }))));
      if (equivalents?.length) promises.push(supabase.from('equivalent_parts').insert(equivalents.map(e => ({ original_part_id: partId, equivalent_part_id: e.id }))));

      const results = await Promise.all(promises);
      if (results.some(r => r.error)) throw new Error("Association error");

      return { data: part };
    } catch (error) {
      if (partId) await supabase.from('spare_parts').delete().eq('id', partId);
      return { error: { message: "Failed to create part. Changes rolled back.", details: error.message } };
    }
  },
  async updateSparePart(partId, partData) {
    return handleRequest(supabase.from('spare_parts').update({ ...partData, updated_at: new Date().toISOString() }).eq('id', partId).select().single());
  },
  async deletePart(id) {
     try {
       await supabase.from('part_supplier_options').delete().eq('part_id', id);
       await supabase.from('part_machine_associations').delete().eq('part_id', id);
       await supabase.from('equivalent_parts').delete().or(`original_part_id.eq.${id},equivalent_part_id.eq.${id}`);
       await supabase.from('inventory_transactions').delete().eq('part_id', id);
       return await supabase.from('spare_parts').delete().eq('id', id);
     } catch(e) { return { error: e }; }
  },
  async updatePartBarcode(id, barcode) {
    return handleRequest(supabase.from('spare_parts').update({ barcode, updated_at: new Date().toISOString() }).eq('id', id).select());
  },
  async getSparePartByBarcode(barcode) {
    return handleRequest(supabase.from('spare_parts').select('*').eq('barcode', barcode).maybeSingle());
  },
  async createTransaction(transactionData) {
    return handleRequest(supabase.from('inventory_transactions').insert(transactionData).select().single());
  },
  async updateSparePartQuantity(id, newQuantity) {
    return handleRequest(supabase.from('spare_parts').update({ current_quantity: newQuantity, updated_at: new Date().toISOString() }).eq('id', id));
  },
  async getRecentTransactions(limit = 20) {
    return handleRequest(supabase.from('inventory_transactions').select(`*, part:spare_parts(name, part_number, barcode, unit_of_measure), machine:machines(machine_code, name), user:users(full_name)`).order('created_at', { ascending: false }).limit(limit));
  },
  async getPartTransactions(partId, limit = 10) {
     return handleRequest(supabase.from('inventory_transactions').select('*, user:users(full_name), machine:machines(machine_code)').eq('part_id', partId).order('created_at', { ascending: false }).limit(limit));
  },
  // #endregion

  // #region Categories
  async getCategories() { return handleRequest(supabase.from('categories').select('*').order('name')); },
  async createCategory(name, description = '') { return handleRequest(supabase.from('categories').insert({ name, description }).select().single()); },
  async updateCategory(id, updates) { return handleRequest(supabase.from('categories').update(updates).eq('id', id).select().single()); },
  async deleteCategory(id) { return handleRequest(supabase.from('categories').delete().eq('id', id)); },
  // #endregion

  // #region Part Associations
  async addPartSupplier(data) { return handleRequest(supabase.from('part_supplier_options').insert(data).select().single()); },
  async removePartSupplier(id) { return handleRequest(supabase.from('part_supplier_options').delete().eq('id', id)); },
  async addPartMachine(data) { return handleRequest(supabase.from('part_machine_associations').insert(data).select().single()); },
  async removePartMachine(id) { return handleRequest(supabase.from('part_machine_associations').delete().eq('id', id)); },
  // #endregion

  // #region Machines
  async getMachines(filters = {}, page = 0, pageSize = 50) {
    let query = supabase.from('machines').select(`
      *, building:buildings(id, name), warehouse:warehouses(id, name),
      downtime_events:downtime_events(count), part_associations:part_machine_associations(count)
    `, { count: 'exact' });

    if (filters.search) {
       const term = `%${filters.search}%`;
       query = query.or(`machine_code.ilike.${term},name.ilike.${term},type.ilike.${term}`);
    }
    if (filters.building_id && filters.building_id !== 'all') query = query.eq('building_id', filters.building_id);
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

    const from = page * pageSize;
    const to = from + pageSize - 1;

    return handleRequest(query.order('machine_code', { ascending: true }).range(from, to));
  },
  
  async getMachineDetails(id) {
    const { data, error } = await handleRequest(supabase.from('machines')
      .select(`*, building:buildings(name), warehouse:warehouses(name), downtime_events(*, technician:users(full_name)), part_associations(*, part:spare_parts(*))`)
      .eq('id', id)
      .single());
    
    if (data && data.downtime_events) {
      data.downtime_events.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
      if (data.downtime_events.length > 50) data.downtime_events.length = 50; 
    }
    return { data, error };
  },
  async getMachineTransactions(machineId) {
  return handleRequest(supabase.from('inventory_transactions').select(`
    id, 
    created_at, 
    quantity, 
    unit_cost, 
    notes, 
    transaction_type,
    part:spare_parts(id, name, part_number, barcode, category, average_cost, current_quantity, unit_of_measure),
    user:users(id, full_name, email)
  `).eq('machine_id', machineId).eq('transaction_type', 'usage').order('created_at', { ascending: false }));
},
  async createMachine(machineData) { return handleRequest(supabase.from('machines').insert(machineData).select().single()); },
  async updateMachine(id, updates) { return handleRequest(supabase.from('machines').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()); },
  async deleteMachine(id) {
    try {
      await supabase.from('part_machine_associations').delete().eq('machine_id', id);
      await supabase.from('downtime_events').delete().eq('machine_id', id);
      await supabase.from('inventory_transactions').delete().eq('machine_id', id);
      return await supabase.from('machines').delete().eq('id', id);
    } catch(e) { return { error: e } }
  },
  async logDowntime(eventData) { return handleRequest(supabase.from('downtime_events').insert(eventData).select().single()); },
  async getDowntimeEvents(filters = {}) {
    let query = supabase.from('downtime_events').select(`*, machine:machines(machine_code, name, building:buildings(name)), technician:users(full_name)`);
    if (filters.machine_id) query = query.eq('machine_id', filters.machine_id);
    return handleRequest(query.order('start_time', { ascending: false }));
  },
  async deleteDowntimeEvent(id) { return await supabase.from('downtime_events').delete().eq('id', id); },
  // #endregion

  // #region Orders - FIXED: Return safe default data
  async getOrders(filters = {}) {
    try {
      let query = supabase.from('orders').select(`*, creator:users!created_by(full_name), approver:users!approved_by(full_name), items:order_items(id, supplier_id, supplier:suppliers(name))`);
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.search) query = query.ilike('order_number', `%${filters.search}%`);
      const { data, error } = await handleRequest(query.order('created_at', { ascending: false }));
      return { data: data || [], error };
    } catch (error) {
      console.warn('Error loading orders:', error);
      return { data: [], error };
    }
  },
  async getOrderDetails(id) { 
    try {
      const { data, error } = await handleRequest(supabase.from('orders').select(`*, creator:users!created_by(full_name), approver:users!approved_by(full_name), items:order_items(*, part:spare_parts(name, part_number, unit_of_measure), supplier:suppliers(*))`).eq('id', id).single());
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },
  async createOrder(orderData, items) {
    const { data: order, error: orderError } = await supabase.from('orders').insert(orderData).select().single();
    if (orderError) return { error: orderError };
    try {
      const itemsWithOrderId = items.map(item => ({ ...item, order_id: order.id }));
      const { error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId);
      if (itemsError) throw itemsError;
      return { data: order };
    } catch (e) {
      await supabase.from('orders').delete().eq('id', order.id);
      return { error: { message: "Order creation failed", details: e.message } };
    }
  },
  async updateOrderStatus(id, status, updates = {}) { 
    try {
      const { data, error } = await handleRequest(supabase.from('orders').update({ status, updated_at: new Date().toISOString(), ...updates }).eq('id', id).select().single());
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },
  async getNextOrderNumber() {
    const { data } = await supabase.from('orders').select('order_number').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const year = new Date().getFullYear();
    let nextNum = 1;
    if (data && data.order_number) {
       const parts = data.order_number.split('-');
       if (parts.length === 3 && parts[1] === year.toString()) nextNum = parseInt(parts[2]) + 1;
    }
    return `ORD-${year}-${nextNum.toString().padStart(3, '0')}`;
  },
  // #endregion

  // #region Analytics - FIXED: Safe queries that won't crash
  async getDashboardStats(timeRange = 'month') {
    try {
      const { data: parts } = await supabase.from('spare_parts').select('current_quantity, average_cost, min_stock_level').limit(1000);
      const inventoryValue = parts?.reduce((sum, p) => sum + (p.current_quantity * (p.average_cost || 0)), 0) || 0;
      const lowStock = parts?.filter(p => p.current_quantity <= p.min_stock_level).length || 0;

      // Safe fallback for analytics
      return {
        inventory: { value: inventoryValue, count: parts?.length || 0, lowStock },
        finance: { totalSpend: 0, orderCount: 0 },
        maintenance: { cost: 0, minutes: 0 }
      };
    } catch (error) {
      console.warn('Error getting dashboard stats:', error);
      return {
        inventory: { value: 0, count: 0, lowStock: 0 },
        finance: { totalSpend: 0, orderCount: 0 },
        maintenance: { cost: 0, minutes: 0 }
      };
    }
  },
  
  // NEW: Get spend breakdown by category - SAFE VERSION
  async getSpendByCategory() {
    try {
      // Try to get from spare_parts directly
      const { data: parts } = await supabase
        .from('spare_parts')
        .select('category, average_cost, current_quantity')
        .limit(1000);
      
      if (!parts || parts.length === 0) {
        return {};
      }
      
      // Group by category and calculate spend
      const categorySpend = {};
      parts.forEach(part => {
        const category = part.category || 'Uncategorized';
        const spend = (part.current_quantity || 0) * (part.average_cost || 0);
        categorySpend[category] = (categorySpend[category] || 0) + spend;
      });
      
      return categorySpend;
    } catch (error) {
      console.warn('Error getting spend by category:', error);
      return {};
    }
  },
  
  async getSavingsAnalysisData() {
    try {
      const { data: parts } = await supabase.from('spare_parts').select(`id, name, part_number, category, current_quantity, specifications, supplier_options:part_supplier_options(id, unit_price, lead_time_days, is_preferred, last_price_update, supplier:suppliers(id, name, is_oem, quality_score))`);
      return { parts: parts || [], orderItems: [] };
    } catch (error) {
      console.warn('Error getting savings analysis data:', error);
      return { parts: [], orderItems: [] };
    }
  },
  // #endregion

  // #region Suppliers
  async getSuppliers() { 
    try {
      const { data, error } = await handleRequest(supabase.from('suppliers').select('*').order('name'));
      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  },
  async createSupplier(data) { return handleRequest(supabase.from('suppliers').insert(data).select().single()); },
  async updateSupplier(id, data) { return handleRequest(supabase.from('suppliers').update(data).eq('id', id).select().single()); },
  async deleteSupplier(id) { return handleRequest(supabase.from('suppliers').delete().eq('id', id)); },
  async getPartsBySupplier(supplierId) { return await supabase.from('part_supplier_options').select(`unit_price, part:spare_parts(*)`).eq('supplier_id', supplierId); },
  // #endregion

  // #region Utils
  async getBuildings() { 
    try {
      const { data, error } = await handleRequest(supabase.from('buildings').select('*').order('id'));
      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  },
  async getWarehouses(buildingId = null) {
    try {
      let query = supabase.from('warehouses').select('*, building:buildings(name)');
      if (buildingId) query = query.eq('building_id', buildingId);
      const { data, error } = await handleRequest(query.order('name'));
      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }
  // #endregion
};

// Export supabase instance
export { supabase };