// Blade Purchase Order Management Component
// File: src/components/blade/BladePurchaseOrder.jsx
// Purpose: Create, track, and manage blade purchase orders with automatic serial numbering

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Plus,
  Search,
  ChevronDown,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Trash2,
  Eye,
  Download,
} from 'lucide-react';
import bladePurchaseService from '../../api/bladePurchaseService';
import bladeService from '../../api/bladeService';
import { useAuth } from '../../hooks/useAuth';

const BladePurchaseOrder = () => {
  // State Management
  const { user, userRole } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [bladeTypes, setBladeTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Form State
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [formData, setFormData] = useState({
    bladeTypeId: '',
    quantityOrdered: '',
    supplierName: '',
    poNumber: '',
    unitCost: '',
    expectedDeliveryDate: '',
  });

  // Load data on mount
  useEffect(() => {
    loadPurchaseOrders();
    loadBladeTypes();
  }, []);

  /**
   * Load all purchase orders
   */
  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const orders = await bladePurchaseService.getAllPurchaseOrders({
        limit: 100,
      });
      setPurchaseOrders(orders);
    } catch (err) {
      setError('Failed to load purchase orders: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load blade types for dropdown
   */
  const loadBladeTypes = async () => {
    try {
      const types = await bladeService.bladeTypeService.getAll();
      setBladeTypes(types || []);
    } catch (err) {
      console.error('Failed to load blade types:', err);
    }
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Create new purchase order
   */
  const handleCreatePurchaseOrder = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !formData.bladeTypeId ||
      !formData.quantityOrdered ||
      !formData.supplierName
    ) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await bladePurchaseService.createPurchaseOrder({
        bladeTypeId: formData.bladeTypeId,
        quantityOrdered: parseInt(formData.quantityOrdered),
        supplierName: formData.supplierName,
        poNumber: formData.poNumber || null,
        unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
        expectedDeliveryDate: formData.expectedDeliveryDate || null,
      });

      setSuccess(
        `Purchase order created! Serial numbers: ${result.serialNumberStart} to ${result.serialNumberEnd}`
      );
      setFormData({
        bladeTypeId: '',
        quantityOrdered: '',
        supplierName: '',
        poNumber: '',
        unitCost: '',
        expectedDeliveryDate: '',
      });
      setShowNewOrderForm(false);

      // Reload orders
      await loadPurchaseOrders();
    } catch (err) {
      setError('Failed to create purchase order: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark order as received
   */
  const handleMarkReceived = async (orderId) => {
    try {
      setLoading(true);
      await bladePurchaseService.markPurchaseOrderReceived(orderId);
      setSuccess('Order marked as received');
      await loadPurchaseOrders();
    } catch (err) {
      setError('Failed to update order: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter orders based on search and status
   */
  const filteredOrders = purchaseOrders.filter((order) => {
    const matchesSearch =
      order.serial_number_start?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' || order.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  /**
   * Get selected blade type name
   */
  const getBladeTypeName = (bladeTypeId) => {
    const type = bladeTypes.find((t) => t.id === bladeTypeId);
    return type ? `${type.code} - ${type.name}` : 'Unknown';
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      received: 'bg-green-100 text-green-800',
      partial: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'received':
        return <CheckCircle className="w-5 h-5" />;
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'partial':
        return <AlertTriangle className="w-5 h-5" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
          <p className="text-gray-600 mt-1">
            Manage blade purchase orders with automatic serial number allocation
          </p>
        </div>
        {userRole !== 'operator' && (
          <button
            onClick={() => setShowNewOrderForm(!showNewOrderForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            New Order
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-900">Success</h3>
            <p className="text-green-700 text-sm">{success}</p>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-700 hover:text-green-900"
          >
            ×
          </button>
        </div>
      )}

      {/* New Order Form */}
      {showNewOrderForm && userRole !== 'operator' && (
        <form
          onSubmit={handleCreatePurchaseOrder}
          className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg space-y-4"
        >
          <h3 className="font-semibold text-gray-900">Create New Purchase Order</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blade Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blade Type *
              </label>
              <select
                name="bladeTypeId"
                value={formData.bladeTypeId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a blade type...</option>
                {bladeTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.code} - {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                name="quantityOrdered"
                value={formData.quantityOrdered}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 60"
                min="1"
                max="1000"
                required
              />
            </div>

            {/* Supplier Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Name *
              </label>
              <input
                type="text"
                name="supplierName"
                value={formData.supplierName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Supplier Inc."
                required
              />
            </div>

            {/* PO Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PO Number
              </label>
              <input
                type="text"
                name="poNumber"
                value={formData.poNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., PO-2026-001"
              />
            </div>

            {/* Unit Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Cost ($)
              </label>
              <input
                type="number"
                name="unitCost"
                value={formData.unitCost}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 150.00"
                step="0.01"
              />
            </div>

            {/* Expected Delivery */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Delivery
              </label>
              <input
                type="date"
                name="expectedDeliveryDate"
                value={formData.expectedDeliveryDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowNewOrderForm(false)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by serial number, PO number, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="received">Received</option>
          <option value="partial">Partial</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Purchase Orders Table */}
      {loading && !purchaseOrders.length ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading purchase orders...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <div className="text-gray-500">No purchase orders found</div>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Blade Type
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Serial Range
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOrders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {getBladeTypeName(order.blade_type_id)}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {order.serial_number_start} →
                      <br />
                      {order.serial_number_end}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.quantity_ordered}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.supplier_name}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setExpandedOrder(
                              expandedOrder === order.id ? null : order.id
                            )
                          }
                          className="p-1 text-gray-600 hover:text-blue-600"
                          title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {order.status === 'pending' && userRole !== 'operator' && (
                          <button
                            onClick={() => handleMarkReceived(order.id)}
                            className="p-1 text-gray-600 hover:text-green-600"
                            title="Mark as received"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedOrder === order.id && (
                    <tr className="bg-gray-50">
                      <td colSpan="7" className="px-6 py-4">
                        <div className="space-y-3 text-sm">
                          {order.po_number && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">PO Number:</span>
                              <span className="font-mono">{order.po_number}</span>
                            </div>
                          )}
                          {order.unit_cost && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Cost:</span>
                              <span>${order.total_cost?.toFixed(2)}</span>
                            </div>
                          )}
                          {order.expected_delivery_date && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Expected Delivery:</span>
                              <span>
                                {new Date(order.expected_delivery_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {order.actual_delivery_date && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Actual Delivery:</span>
                              <span>
                                {new Date(order.actual_delivery_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {order.notes && (
                            <div>
                              <span className="text-gray-600">Notes:</span>
                              <p className="mt-1 text-gray-700">{order.notes}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BladePurchaseOrder;
