import React, { useState } from 'react';
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
  Home
} from 'lucide-react';

const BladeTracking = () => {
  const [activeTab, setActiveTab] = useState('blades');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBladeDetail, setSelectedBladeDetail] = useState(null);
  
  // Blade Type State
  const [showCreateTypeForm, setShowCreateTypeForm] = useState(false);
  const [typeForm, setTypeForm] = useState({
    code: '',
    machineType: '',
    description: '',
    totalQuantity: ''
  });
  const [bladeTypes, setBladeTypes] = useState([
    { 
      id: 1, 
      code: 'BT-001', 
      machineType: 'Circular Saw', 
      description: 'Standard circular saw blade',
      totalQuantity: 50,
      nextSerialNumber: 1 // BT001001
    },
    { 
      id: 2, 
      code: 'BT-002', 
      machineType: 'Band Saw', 
      description: 'Band saw cutting blade',
      totalQuantity: 40,
      nextSerialNumber: 1 // BT002001
    },
    { 
      id: 3, 
      code: 'BT-004', 
      machineType: 'Circular Saw Type 4', 
      description: 'Industrial circular saw blade',
      totalQuantity: 72,
      nextSerialNumber: 44 // Starting from 43 + 1
    },
  ]);

  // Blade State
  const [blades, setBlades] = useState([
    // Sample data for BT-004
    { id: 1, typeId: 3, serialNumber: 'B400001', status: 'active', purchaseDate: '2025-12-01', events: [] },
    { id: 2, typeId: 3, serialNumber: 'B400002', status: 'active', purchaseDate: '2025-12-01', events: [] },
    { id: 3, typeId: 3, serialNumber: 'B400003', status: 'sharpening', purchaseDate: '2025-12-01', events: [
      { type: 'mounted', date: '2026-01-01', machine: 'Machine A', notes: 'Production run' },
      { type: 'removed', date: '2026-01-10', machine: 'Machine A', notes: 'Dull, needs sharpening' }
    ] },
  ]);

  // Purchase Order State
  const [showBulkPurchaseForm, setShowBulkPurchaseForm] = useState(false);
  const [bulkPurchaseForm, setBulkPurchaseForm] = useState({
    typeId: '',
    quantity: ''
  });

  // Event State
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    bladeId: '',
    eventType: 'mounted',
    machine: '',
    notes: ''
  });

  const tabs = [
    { id: 'blades', label: 'Blades', icon: AlertTriangle },
    { id: 'types', label: 'Blade Types', icon: Settings },
    { id: 'inventory', label: 'Inventory', icon: BarChart3 },
    { id: 'events', label: 'Events Log', icon: Clock },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  ];

  // ==================== UTILITY FUNCTIONS ====================
  const generateSerialNumber = (type) => {
    const codeNum = type.code.split('-')[1]; // "001" from "BT-001"
    const serial = String(type.nextSerialNumber).padStart(5, '0'); // "00001"
    return `B${codeNum}${serial}`; // "B001000001"
  };

  const getBladeType = (typeId) => bladeTypes.find(t => t.id === typeId);
  const getTypeBlades = (typeId) => blades.filter(b => b.typeId === typeId);

  // ==================== BLADE TYPE HANDLERS ====================
  const handleAddBladeType = (e) => {
    e.preventDefault();
    if (typeForm.code && typeForm.machineType && typeForm.totalQuantity) {
      const newType = {
        id: Date.now(),
        code: typeForm.code,
        machineType: typeForm.machineType,
        description: typeForm.description,
        totalQuantity: parseInt(typeForm.totalQuantity),
        nextSerialNumber: 1
      };
      setBladeTypes([...bladeTypes, newType]);
      setTypeForm({ code: '', machineType: '', description: '', totalQuantity: '' });
      setShowCreateTypeForm(false);
    }
  };

  const handleDeleteBladeType = (id) => {
    // Only allow delete if no blades exist for this type
    const hasBlades = blades.some(b => b.typeId === id);
    if (!hasBlades) {
      setBladeTypes(bladeTypes.filter(t => t.id !== id));
    }
  };

  // ==================== BULK PURCHASE HANDLER ====================
  const handleBulkPurchase = (e) => {
    e.preventDefault();
    if (bulkPurchaseForm.typeId && bulkPurchaseForm.quantity) {
      const typeId = parseInt(bulkPurchaseForm.typeId);
      const quantity = parseInt(bulkPurchaseForm.quantity);
      const type = getBladeType(typeId);

      // Create new blades with auto-generated serial numbers
      const newBlades = [];
      for (let i = 0; i < quantity; i++) {
        const serialNumber = generateSerialNumber({ ...type, nextSerialNumber: type.nextSerialNumber + i });
        newBlades.push({
          id: Date.now() + i,
          typeId: typeId,
          serialNumber: serialNumber,
          status: 'new',
          purchaseDate: new Date().toISOString().split('T')[0],
          events: []
        });
      }

      // Update blade type with new next serial number
      setBladeTypes(bladeTypes.map(t => 
        t.id === typeId 
          ? { ...t, nextSerialNumber: t.nextSerialNumber + quantity, totalQuantity: t.totalQuantity + quantity }
          : t
      ));

      setBlades([...blades, ...newBlades]);
      setBulkPurchaseForm({ typeId: '', quantity: '' });
      setShowBulkPurchaseForm(false);
    }
  };

  // ==================== EVENT HANDLERS ====================
  const handleAddEvent = (e) => {
    e.preventDefault();
    if (eventForm.bladeId && eventForm.eventType) {
      const now = new Date().toISOString().split('T')[0];
      setBlades(blades.map(blade =>
        blade.id === parseInt(eventForm.bladeId)
          ? {
              ...blade,
              events: [
                ...blade.events,
                {
                  type: eventForm.eventType,
                  date: now,
                  machine: eventForm.machine,
                  notes: eventForm.notes
                }
              ],
              status: eventForm.eventType === 'mounted' ? 'active' : 
                      eventForm.eventType === 'removed' ? 'inactive' :
                      eventForm.eventType === 'sharpened' ? 'active' : blade.status
            }
          : blade
      ));
      setEventForm({ bladeId: '', eventType: 'mounted', machine: '', notes: '' });
      setShowEventForm(false);
    }
  };

  const handleDeleteBlade = (id) => {
    setBlades(blades.filter(b => b.id !== id));
  };

  // ==================== TAB RENDERS ====================

  // Render Blades Tab
  const renderBladesTab = () => (
    <div className="space-y-4">
      {/* Add Event Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">Quick Add Event</h3>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Blade</label>
                <select
                  value={eventForm.bladeId}
                  onChange={(e) => setEventForm({ ...eventForm, bladeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select blade...</option>
                  {blades.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.serialNumber} ({getBladeType(b.typeId)?.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Event Type</label>
                <select
                  value={eventForm.eventType}
                  onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mounted">Mounted on Machine</option>
                  <option value="removed">Removed from Machine</option>
                  <option value="sharpened">Sharpened</option>
                  <option value="inspected">Inspected</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Machine</label>
                <input
                  type="text"
                  placeholder="e.g., Machine A"
                  value={eventForm.machine}
                  onChange={(e) => setEventForm({ ...eventForm, machine: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <textarea
                placeholder="Add details about this event..."
                value={eventForm.notes}
                onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="2"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Log Event
              </button>
              <button
                type="button"
                onClick={() => setShowEventForm(false)}
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Events</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Purchase Date</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {blades.length === 0 ? (
                <tr className="hover:bg-slate-50">
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    No blades yet. Create blade types and order them first!
                  </td>
                </tr>
              ) : (
                blades.map(blade => {
                  const type = getBladeType(blade.typeId);
                  return (
                    <tr key={blade.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm font-bold text-slate-900">{blade.serialNumber}</td>
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
                      <td className="px-6 py-3 text-sm text-slate-700">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium">
                          {blade.events.length} events
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700">{blade.purchaseDate}</td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => setSelectedBladeDetail(blade)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                          >
                            View
                          </button>
                          <button onClick={() => handleDeleteBlade(blade.id)} className="text-red-600 hover:text-red-700">
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
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Blade Type
        </button>
      </div>

      {/* Create Blade Type Form */}
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
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
              Create Type
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

      {/* Blade Types Table */}
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
                    <td className="px-6 py-3 text-sm text-slate-700">{type.machineType}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{type.totalQuantity}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{usedBlades}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{availableBlades}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{type.description}</td>
                    <td className="px-6 py-3 text-center">
                      <button onClick={() => handleDeleteBladeType(type.id)} className="text-red-600 hover:text-red-700">
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
      {/* Order New Blades */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-purple-900 mb-3">📦 Order New Blade Batch</h3>
        {!showBulkPurchaseForm ? (
          <button
            onClick={() => setShowBulkPurchaseForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
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
                      {t.code} - {t.machineType}
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
                ✨ Will create {bulkPurchaseForm.quantity} new blades with auto-generated serial numbers starting from the next available number for {bladeTypes.find(t => t.id == bulkPurchaseForm.typeId)?.code}
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Confirm Order
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

      {/* Inventory Overview */}
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
                  <p className="text-xs text-slate-600">{type.machineType}</p>
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
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-600 mb-2">Next Serial: <span className="font-bold text-slate-900">{generateSerialNumber(type)}</span></p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Events Log Tab
  const renderEventsTab = () => {
    const allEvents = [];
    blades.forEach(blade => {
      blade.events.forEach(event => {
        allEvents.push({
          ...event,
          bladeId: blade.id,
          serialNumber: blade.serialNumber,
          typeCode: getBladeType(blade.typeId)?.code
        });
      });
    });

    const sortedEvents = [...allEvents].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="space-y-4">
        {sortedEvents.length === 0 ? (
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center text-slate-600">
            No events logged yet. Add events from the Blades tab to track blade lifecycle.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map((event, idx) => {
              const eventColors = {
                mounted: 'bg-green-50 border-green-200 text-green-900',
                removed: 'bg-red-50 border-red-200 text-red-900',
                sharpened: 'bg-blue-50 border-blue-200 text-blue-900',
                inspected: 'bg-purple-50 border-purple-200 text-purple-900',
                maintenance: 'bg-orange-50 border-orange-200 text-orange-900',
              };
              const eventEmojis = {
                mounted: '📌',
                removed: '❌',
                sharpened: '🪨',
                inspected: '👁️',
                maintenance: '🔧',
              };

              return (
                <div key={idx} className={`rounded-lg border p-4 ${eventColors[event.type] || 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 flex-1">
                      <span className="text-2xl">{eventEmojis[event.type]}</span>
                      <div>
                        <p className="font-semibold">
                          {event.serialNumber} ({event.typeCode})
                        </p>
                        <p className="text-sm font-medium capitalize">{event.type}</p>
                        {event.machine && <p className="text-sm mt-1">🤖 {event.machine}</p>}
                        {event.notes && <p className="text-sm mt-1 italic">"{event.notes}"</p>}
                      </div>
                    </div>
                    <p className="text-sm font-medium whitespace-nowrap ml-4">{event.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
          <p className="text-slate-600">Professional blade management with auto-generated serial numbers and event tracking</p>
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
              <h2 className="text-2xl font-bold text-slate-900">{selectedBladeDetail.serialNumber}</h2>
              <button onClick={() => setSelectedBladeDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Blade Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Blade Type</p>
                  <p className="text-lg font-bold text-slate-900">{getBladeType(selectedBladeDetail.typeId)?.code}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Status</p>
                  <p className="text-lg font-bold capitalize text-slate-900">{selectedBladeDetail.status}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Purchase Date</p>
                  <p className="text-lg font-bold text-slate-900">{selectedBladeDetail.purchaseDate}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Events</p>
                  <p className="text-lg font-bold text-slate-900">{selectedBladeDetail.events.length}</p>
                </div>
              </div>

              {/* Events Timeline */}
              <div>
                <h3 className="font-bold text-slate-900 mb-4">Event History</h3>
                {selectedBladeDetail.events.length === 0 ? (
                  <p className="text-slate-500 text-sm">No events logged for this blade yet.</p>
                ) : (
                  <div className="space-y-3">
                    {[...selectedBladeDetail.events].reverse().map((event, idx) => (
                      <div key={idx} className="border-l-4 border-teal-500 pl-4 py-2">
                        <p className="font-semibold text-slate-900 capitalize">{event.type}</p>
                        <p className="text-xs text-slate-600 mt-1">📅 {event.date}</p>
                        {event.machine && <p className="text-sm text-slate-700 mt-1">🤖 {event.machine}</p>}
                        {event.notes && <p className="text-sm text-slate-700 mt-1 italic">"{event.notes}"</p>}
                      </div>
                    ))}
                  </div>
                )}
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
