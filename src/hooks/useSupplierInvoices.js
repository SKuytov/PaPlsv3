import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const useSupplierInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthToken = () => localStorage.getItem('token');

  /**
   * Fetch all supplier invoices with optional filters
   */
  const fetchSupplierInvoices = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.order_id) params.append('order_id', filters.order_id);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const response = await fetch(
        `${API_URL}/api/supplier-invoices?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch supplier invoices');
      }

      const data = await response.json();
      setInvoices(data.data || []);
      return data.data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching supplier invoices:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch a single supplier invoice
   */
  const fetchSupplierInvoice = useCallback(async (invoiceId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/supplier-invoices/${invoiceId}`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch supplier invoice');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching supplier invoice:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new supplier invoice
   */
  const createSupplierInvoice = useCallback(async (invoiceData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/supplier-invoices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify(invoiceData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create supplier invoice');
      }

      const data = await response.json();
      setInvoices(prev => [data.data, ...prev]);
      return data.data;
    } catch (err) {
      setError(err.message);
      console.error('Error creating supplier invoice:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update a supplier invoice
   */
  const updateSupplierInvoice = useCallback(async (invoiceId, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/supplier-invoices/${invoiceId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify(updates)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update supplier invoice');
      }

      const data = await response.json();
      setInvoices(prev =>
        prev.map(inv => inv.id === invoiceId ? data.data : inv)
      );
      return data.data;
    } catch (err) {
      setError(err.message);
      console.error('Error updating supplier invoice:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Send invoice to accounting department
   */
  const sendToAccounting = useCallback(async (invoiceId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/supplier-invoices/${invoiceId}/send-to-accounting`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invoice to accounting');
      }

      const data = await response.json();
      setInvoices(prev =>
        prev.map(inv => inv.id === invoiceId ? data.data : inv)
      );
      return data.data;
    } catch (err) {
      setError(err.message);
      console.error('Error sending invoice to accounting:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete a supplier invoice
   */
  const deleteSupplierInvoice = useCallback(async (invoiceId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/supplier-invoices/${invoiceId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete supplier invoice');
      }

      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting supplier invoice:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch supplier invoice statistics
   */
  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/supplier-invoices/stats/summary`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching statistics:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    invoices,
    loading,
    error,
    fetchSupplierInvoices,
    fetchSupplierInvoice,
    createSupplierInvoice,
    updateSupplierInvoice,
    sendToAccounting,
    deleteSupplierInvoice,
    fetchStatistics
  };
};

export default useSupplierInvoices;
