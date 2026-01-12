import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  AlertTriangle,
  BarChart3,
  Settings,
  Search,
  Filter,
  X,
  ChevronDown,
  Calendar,
  Home,
  Loader
} from 'lucide-react';
import bladeService from '../api/bladeService';

const BladeTracking = () => {
  const [activeTab, setActiveTab] = useState('blades');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBladeDetail, setSelectedBladeDetail] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  
  // Blade Type State
  const [showCreateTypeForm, setShowCreateTypeForm] = useState(false);
  const [typeForm, setTypeForm] = useState({
    code: '',
    machineType: '',
    description: '',
    totalQuantity: ''
  });
  const [bladeTypes, setBladeTypes] = useState([]);

  // Blade State
  const [blades, setBlades] = useState([]);

  // Purchase Order State
  const [showBulkPurchaseForm, setShowBulkPurchaseForm] = useState(false);
  const [bulkPurchaseForm, setBulkPurchaseForm] = useState({
    typeId: '',
    quantity: ''
  });

  // Event State
  const [showEventForm, setShowEventForm] = useState(false);
  const [bladeSearchTerm, setBladeSearchTerm] = useState('');
  const [selectedBladeForEvent, setSelectedBladeForEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    bladeId: '',
    eventType: 'mounted',
    machine: '',
    notes: ''
  });
  const [eventSubmitting, setEventSubmitting] = useState(false);

  // Machine Management State
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [machineForm, setMachineForm] = useState({
    bladeId: '',
    defaultMachine: ''
  });

  const tabs = [
    { id: 'blades', label: 'Blades', icon: AlertTriangle },
    { id: 'types', label: 'Blade Types', icon: Settings },
    { id: 'inventory', label: 'Inventory', icon: BarChart3 },
    { id: 'events', label: 'Events Log', icon: Clock },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  ];

  // ==================== DATA LOADING ====================
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load blade types
        const types = await bladeService.fetchBladeTypes();
        setBladeTypes(types);

        // Load blades
        const bladesData = await bladeService.fetchAllBlades();
        setBlades(bladesData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load blade data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ==================== UTILITY FUNCTIONS ====================
  
  const getBladeType = (typeId) => bladeTypes.find(t => t.id === typeId);
  const getTypeBlades = (typeId) => blades.filter(b => b.type_id === typeId);

  // ==================== BLADE SEARCH FUNCTION ====================
  const filteredBlades = bladeSearchTerm.trim() === '' 
    ? blades 
    : blades.filter(blade => 
        blade.serial_number.toLowerCase().includes(bladeSearchTerm.toLowerCase())
      );

  // ==================== BLADE TYPE HANDLERS ====================
  const handleAddBladeType = async (e) => {
    e.preventDefault();
    if (typeForm.code && typeForm.machineType && typeForm.totalQuantity) {
      try {
        setSyncing(true);
        const newType = await bladeService.createBladeType(typeForm);
        setBladeTypes([...bladeTypes, newType]);
        setTypeForm({ code: '', machineType: '', description: '', totalQuantity: '' });
        setShowCreateTypeForm(false);
      } catch (err) {
        console.error('Error creating blade type:', err);
        setError('Failed to create blade type');
      } finally {
        setSyncing(false);
      }
    }
  };

  const handleDeleteBladeType = async (id) => {
    const hasBlades = blades.some(b => b.type_id === id);
    if (!hasBlades) {
      try {
        setSyncing(true);
        await bladeService.deleteBladeType(id);
        setBladeTypes(bladeTypes.filter(t => t.id !== id));
      } catch (err) {
        console.error('Error deleting blade type:', err);
        setError('Cannot delete blade type with existing blades');
      } finally {
        setSyncing(false);
      }
    }
  };

  // ==================== BULK PURCHASE HANDLER ====================
  const handleBulkPurchase = async (e) => {
    e.preventDefault();
    if (bulkPurchaseForm.typeId && bulkPurchaseForm.quantity) {
      try {
        setSyncing(true);
        const typeId = parseInt(bulkPurchaseForm.typeId);
        const quantity = parseInt(bulkPurchaseForm.quantity);

        const newBlades = await bladeService.createBladesBulk(typeId, quantity);
        setBlades([...blades, ...newBlades]);
        
        // Update blade type quantity
        const updatedTypes = await bladeService.fetchBladeTypes();
        setBladeTypes(updatedTypes);

        setBulkPurchaseForm({ typeId: '', quantity: '' });
        setShowBulkPurchaseForm(false);
      } catch (err) {
        console.error('Error purchasing blades:', err);
        setError('Failed to create blades');
      } finally {
        setSyncing(false);
      }
    }
  };

  // ==================== EVENT HANDLERS ====================
  const handleAddEvent = async (e) => {
    e.preventDefault();
    const bladeToUse = selectedBladeForEvent || eventForm.bladeId;
    if (bladeToUse && eventForm.eventType) {
      try {
        setEventSubmitting(true);
        const blade = blades.find(b => b.id === parseInt(bladeToUse));
        const machineToUse = eventForm.machine || blade?.default_machine || '';

        await bladeService.logBladeEvent(parseInt(bladeToUse), {
          eventType: eventForm.eventType,
          machine: machineToUse,
          notes: eventForm.notes
        });

        // Refresh blades data
        const updatedBlades = await bladeService.fetchAllBlades();
        setBlades(updatedBlades);
        
        setEventForm({ bladeId: '', eventType: 'mounted', machine: '', notes: '' });
        setBladeSearchTerm('');
        setSelectedBladeForEvent(null);
        setShowEventForm(false);
      } catch (err) {
        console.error('Error logging event:', err);
        setError('Failed to log event');
      } finally {
        setEventSubmitting(false);
      }
    }
  };

  // ==================== MACHINE HANDLER ====================
  const handleUpdateDefaultMachine = async (e) => {
    e.preventDefault();
    if (machineForm.bladeId && machineForm.defaultMachine) {
      try {
        setSyncing(true);
        await bladeService.updateBladeDefaultMachine(
          parseInt(machineForm.bladeId),
          machineForm.defaultMachine
        );

        // Refresh blades
        const updatedBlades = await bladeService.fetchAllBlades();
        setBlades(updatedBlades);
        
        setMachineForm({ bladeId: '', defaultMachine: '' });
        setShowMachineForm(false);
      } catch (err) {
        console.error('Error updating machine:', err);
        setError('Failed to update machine');
      } finally {
        setSyncing(false);
      }
    }
  };

  const handleDeleteBlade = async (id) => {
    try {
      setSyncing(true);
      await bladeService.deleteBlade(id);
      setBlades(blades.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting blade:', err);
      setError('Failed to delete blade');
    } finally {
      setSyncing(false);
    }
  };

  // ==================== TAB RENDERS ====================

  // Render Blades Tab
  const renderBladesTab = () => (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Add Event Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">📋 Quick Add Event with Smart Search</h3>
        {!showEventForm ? (
          <button
            onClick={() => setShowEventForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Log Blade Event
          </button>
        ) : (
          <form onSubmit={handleAddEvent} className="bg-white rounded-lg p-4 border border-blue-200">
            {/* BLADE SEARCH BAR */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">🔍 Search Blade by Serial Number</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type serial number (e.g., B400001)"
                  value={bladeSearchTerm}
                  onChange={(e) => setBladeSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Search Results */}
              {bladeSearchTerm.trim() !== '' && (
                <div className="mt-2 bg-slate-50 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                  {filteredBlades.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 text-center">
                      No blades found matching "{bladeSearchTerm}"
                    </div>
                  ) : (
                    filteredBlades.map(blade => {
                      const type = getBladeType(blade.type_id);
                      return (
                        <button
                          key={blade.id}
                          type="button"
                          onClick={() => {
                            setSelectedBladeForEvent(blade.id);
                            setEventForm({ ...eventForm, machine: blade.default_machine });
                            setBladeSearchTerm('');
                          }}
                          className="w-full px-4 py-3 text-left border-b border-slate-200 hover:bg-blue-50 transition-colors flex justify-between items-center last:border-b-0"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{blade.serial_number}</p>
                            <p className="text-xs text-slate-600">{type?.code} • {type?.machine_type}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              blade.status === 'active' ? 'bg-green-100 text-green-700' :
                              blade.status === 'sharpening' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {blade.status}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Selected Blade Display */}
            {selectedBladeForEvent && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold text-green-900">✅ Selected: {blades.find(b => b.id === selectedBladeForEvent)?.serial_number}</p>
                  <p className="text-sm text-green-700">Machine: {blades.find(b => b.id === selectedBladeForEvent)?.default_machine}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBladeForEvent(null);
                    setBladeSearchTerm('');
                  }}
                  className="text-green-600 hover:text-green-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Event Type, Machine, Notes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Event Type</label>
                <select
                  value={eventForm.eventType}
                  onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mounted">🔧 Mounted on Machine</option>
                  <option value="removed">❌ Removed from Machine</option>
                  <option value="sharpened">🪡 Sharpened</option>
                  <option value="inspected">👁️ Inspected</option>
                  <option value="maintenance">🔨 Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Machine (Auto-filled)</label>
                <input
                  type="text"
                  placeholder="Auto-filled from default"
                  value={eventForm.machine}
                  onChange={(e) => setEventForm({ ...eventForm, machine: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Production run"
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={eventSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {eventSubmitting ? 'Logging...' : 'Log Event'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEventForm(false);
                  setSelectedBladeForEvent(null);
                  setBladeSearchTerm('');
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Set Default Machine Section */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-purple-900 mb-3">🏭 Set Default Machine Per Blade</h3>
        {!showMachineForm ? (
          <button
            onClick={() => setShowMachineForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Set Default Machine
          </button>
        ) : (
          <form onSubmit={handleUpdateDefaultMachine} className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Blade</label>
                <select
                  value={machineForm.bladeId}
                  onChange={(e) => setMachineForm({ ...machineForm, bladeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select blade...</option>
                  {blades.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.serial_number} (Current: {b.default_machine})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Default Machine</label>
                <input
                  type="text"
                  placeholder="e.g., Machine A"
                  value={machineForm.defaultMachine}
                  onChange={(e) => setMachineForm({ ...machineForm, defaultMachine: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={syncing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {syncing ? 'Updating...' : 'Update Machine'}
              </button>
              <button
                type="button"
                onClick={() => setShowMachineForm(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Blades Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Serial Number</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Default Machine</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Events</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-600">
                      <Loader className="w-4 h-4 animate-spin" />
                      Loading blades...
                    </div>
                  </td>
                </tr>
              ) : blades.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    No blades yet. Create blade types and order them first!
                  </td>
                </tr>
              ) : (
                blades.map(blade => {
                  const type = getBladeType(blade.type_id);
                  return (
                    <tr key={blade.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm font-bold text-slate-900">{blade.serial_number}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">{type?.code}</td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          blade.status === 'active' ? 'bg-green-100 text-green-700' :
                          blade.status === 'sharpening' ? 'bg-yellow-100 text-yellow-700' :
                          blade.status === 'retired' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {blade.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-700">{blade.default_machine || '-'}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium">0 events</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => setSelectedBladeDetail(blade)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleDeleteBlade(blade.id)}
                            disabled={syncing}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Blade Types Tab
  const renderBladeTypesTab = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button 
          onClick={() => setShowCreateTypeForm(!showCreateTypeForm)}
          disabled={syncing}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Blade Type
        </button>
      </div>

      {showCreateTypeForm && (
        <form onSubmit={handleAddBladeType} className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Blade Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Code (e.g., BT-005)</label>
              <input
                type="text"
                placeholder="BT-005"
                value={typeForm.code}
                onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Machine Type</label>
              <input
                type="text"
                placeholder="e.g., Circular Saw"
                value={typeForm.machineType}
                onChange={(e) => setTypeForm({ ...typeForm, machineType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Initial Quantity</label>
              <input
                type="number"
                placeholder="e.g., 50"
                value={typeForm.totalQuantity}
                onChange={(e) => setTypeForm({ ...typeForm, totalQuantity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <input
                type="text"
                placeholder="Optional description"
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button 
              type="submit" 
              disabled={syncing}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {syncing ? 'Creating...' : 'Create Type'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateTypeForm(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Machine Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Total Qty</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Used</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Available</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Description</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bladeTypes.map(type => {
                const usedBlades = getTypeBlades(type.id).filter(b => b.status !== 'new').length;
                const availableBlades = getTypeBlades(type.id).length;
                return (
                  <tr key={type.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-bold text-slate-900">{type.code}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{type.machine_type}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{type.total_quantity}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{usedBlades}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{availableBlades}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{type.description}</td>
                    <td className="px-6 py-3 text-center">
                      <button 
                        onClick={() => handleDeleteBladeType(type.id)}
                        disabled={syncing}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Inventory Tab
  const renderInventoryTab = () => (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-purple-900 mb-3">📦 Order New Blade Batch</h3>
        {!showBulkPurchaseForm ? (
          <button
            onClick={() => setShowBulkPurchaseForm(true)}
            disabled={syncing}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Order New Blades
          </button>
        ) : (
          <form onSubmit={handleBulkPurchase} className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Blade Type</label>
                <select
                  value={bulkPurchaseForm.typeId}
                  onChange={(e) => setBulkPurchaseForm({ ...bulkPurchaseForm, typeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select blade type...</option>
                  {bladeTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.code} - {t.machine_type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quantity to Order</label>
                <input
                  type="number"
                  placeholder="e.g., 32"
                  value={bulkPurchaseForm.quantity}
                  onChange={(e) => setBulkPurchaseForm({ ...bulkPurchaseForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            {bulkPurchaseForm.typeId && bulkPurchaseForm.quantity && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                ✨ Will create {bulkPurchaseForm.quantity} new blades with auto-generated serial numbers
              </div>
            )}
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={syncing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {syncing ? 'Creating...' : 'Confirm Order'}
              </button>
              <button
                type="button"
                onClick={() => setShowBulkPurchaseForm(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bladeTypes.map(type => {
          const typeBlades = getTypeBlades(type.id);
          const activeBlades = typeBlades.filter(b => b.status === 'active').length;
          const sharpeningBlades = typeBlades.filter(b => b.status === 'sharpening').length;
          const newBlades = typeBlades.filter(b => b.status === 'new').length;
          const retiredBlades = typeBlades.filter(b => b.status === 'retired').length;

          return (
            <div key={type.id} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{type.code}</h3>
                  <p className="text-xs text-slate-600">{type.machine_type}</p>
                </div>
                <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-sm font-bold">
                  {typeBlades.length} units
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">🟢 Active:</span>
                  <span className="font-medium">{activeBlades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">🟡 Sharpening:</span>
                  <span className="font-medium">{sharpeningBlades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">🔵 New:</span>
                  <span className="font-medium">{newBlades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">🔴 Retired:</span>
                  <span className="font-medium">{retiredBlades}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Events Log Tab
  const renderEventsTab = () => (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center text-slate-600">
        Events will appear here as they are logged. Start logging events from the Blades tab!
      </div>
    </div>
  );

  // Render Alerts Tab
  const renderAlertsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900">Blades Needing Sharpening</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {blades.filter(b => b.status === 'sharpening').length} blades
              </p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Home className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Active Blades on Machines</h4>
              <p className="text-sm text-blue-700 mt-1">
                {blades.filter(b => b.status === 'active').length} blades
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'blades':
        return renderBladesTab();
      case 'types':
        return renderBladeTypesTab();
      case 'inventory':
        return renderInventoryTab();
      case 'events':
        return renderEventsTab();
      case 'alerts':
        return renderAlertsTab();
      default:
        return renderBladesTab();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="w-8 h-8 text-teal-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">⚡ Blade Lifecycle Tracking</h1>
          <p className="text-slate-600">Professional blade management with smart search and real-time database sync</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 md:flex-none px-4 md:px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 justify-center ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">{renderContent()}</div>
      </div>

      {/* Blade Detail Modal */}
      {selectedBladeDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">{selectedBladeDetail.serial_number}</h2>
              <button onClick={() => setSelectedBladeDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Blade Type</p>
                  <p className="text-lg font-bold text-slate-900">{getBladeType(selectedBladeDetail.type_id)?.code}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Status</p>
                  <p className="text-lg font-bold capitalize text-slate-900">{selectedBladeDetail.status}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Default Machine</p>
                  <p className="text-lg font-bold text-slate-900">{selectedBladeDetail.default_machine || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Created</p>
                  <p className="text-lg font-bold text-slate-900">{new Date(selectedBladeDetail.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-6 bg-slate-50">
              <button
                onClick={() => setSelectedBladeDetail(null)}
                className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BladeTracking;