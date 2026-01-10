import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Custom hook for all request API operations
 * Handles authentication, loading states, and error management
 */
export const useRequestsApi = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`
    };
  }, [session?.access_token]);

  const handleError = useCallback((err) => {
    console.error('API Error:', err);
    const errorMessage = err?.response?.data?.error || err?.message || 'An error occurred';
    setError(errorMessage);
    return null;
  }, []);

  // =========================================================================
  // METHOD 1: Create Draft Request
  // =========================================================================
  const createRequest = useCallback(async (buildingId, priority = 'NORMAL', description = '', notes = '') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          building_id: buildingId,
          priority,
          description,
          notes
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create request');
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [getHeaders, handleError]);

  // =========================================================================
  // METHOD 2: Add Item to Request
  // =========================================================================
  const addItemToRequest = useCallback(async (requestId, itemName, quantity, unit, estimatedUnitPrice, specs = null) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/requests/${requestId}/items`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          item_name: itemName,
          quantity: parseFloat(quantity),
          unit,
          estimated_unit_price: parseFloat(estimatedUnitPrice),
          specs
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add item');
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [getHeaders, handleError]);

  // =========================================================================
  // METHOD 3: Submit Request for Approval
  // =========================================================================
  const submitRequest = useCallback(async (requestId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/requests/${requestId}/submit`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [getHeaders, handleError]);

  // =========================================================================
  // METHOD 4: Get Request Details
  // =========================================================================
  const getRequestDetails = useCallback(async (requestId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/requests/${requestId}`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch request');
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [getHeaders, handleError]);

  // =========================================================================
  // METHOD 5: Get My Requests
  // =========================================================================
  const getMyRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/requests`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch requests');
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [getHeaders, handleError]);

  // =========================================================================
  // METHOD 6: Get Pending Approvals
  // =========================================================================
  const getPendingApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/requests/pending-approvals`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch pending approvals');
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [getHeaders, handleError]);

  // =========================================================================
  // METHOD 7: Approve Request
  // =========================================================================
  const approveRequest = useCallback(async (requestId, comments = '', moveToNextLevel = true, editedFields = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/requests/${requestId}/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          comments,
          move_to_next_level: moveToNextLevel,
          edited_fields: editedFields
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve request');
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [getHeaders, handleError]);

  // =========================================================================
  // METHOD 8: Reject Request
  // =========================================================================
  const rejectRequest = useCallback(async (requestId, reason = '') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/requests/${requestId}/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          reason
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject request');
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [getHeaders, handleError]);

  // =========================================================================
  // METHOD 9: Edit Request
  // =========================================================================
  const editRequest = useCallback(async (requestId, description, priority, notes, items = []) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/requests/${requestId}/edit`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          description,
          priority,
          notes,
          items
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to edit request');
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [getHeaders, handleError]);

  // =========================================================================
  // METHOD 10: Get Activity Log
  // =========================================================================
  const getActivityLog = useCallback(async (requestId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/requests/${requestId}/activity`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch activity log');
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [getHeaders, handleError]);

  // =========================================================================
  // METHOD 11: Execute Request (Admin only)
  // =========================================================================
  const executeRequest = useCallback(async (requestId, supplierId = null, quoteId = null, assignedToEmail = null) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/requests/${requestId}/execute`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          supplier_id: supplierId,
          quote_id: quoteId,
          assigned_to_email: assignedToEmail
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to execute request');
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [getHeaders, handleError]);

  return {
    loading,
    error,
    setError,
    createRequest,
    addItemToRequest,
    submitRequest,
    getRequestDetails,
    getMyRequests,
    getPendingApprovals,
    approveRequest,
    rejectRequest,
    editRequest,
    getActivityLog,
    executeRequest
  };
};
