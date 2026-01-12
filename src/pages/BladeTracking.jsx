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
  Filter
} from 'lucide-react';

const BladeTracking = () => {
  const [activeTab, setActiveTab] = useState('blades');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Blade Tab State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [bladeForm, setBladeForm] = useState({
    type: '',
    serialNumber: '',
    purchaseDate: '',
    status: 'new'
  });
  const [blades, setBlades] = useState([]);

  // Blade Types Tab State
  const [showCreateTypeForm, setShowCreateTypeForm] = useState(false);
  const [typeForm, setTypeForm] = useState({
    code: '',
    machineType: '',
    description: ''
  });
  const [bladeTypes, setBladeTypes] = useState([
    { id: 1, code: 'BT-001', machineType: 'Circular Saw', description: 'Standard circular saw blade' },
    { id: 2, code: 'BT-002', machineType: 'Band Saw', description: 'Band saw cutting blade' },
  ]);

  // Sharpening Tab State
  const [showSharpeningForm, setShowSharpeningForm] = useState(false);
  const [sharpeningForm, setSharpeningForm] = useState({
    blade: '',
    date: '',
    method: 'professional',
    cost: '',
    provider: ''
  });
  const [sharpenings, setSharpenings] = useState([]);

  const tabs = [
    { id: 'blades', label: 'Blades', icon: AlertTriangle },
    { id: 'types', label: 'Blade Types', icon: Settings },
    { id: 'usage', label: 'Usage Logs', icon: Clock },
    { id: 'sharpening', label: 'Sharpening', icon: AlertTriangle },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
  ];

  // ==================== BLADE HANDLERS ====================
  const handleAddBlade = (e) => {
    e.preventDefault();
    if (bladeForm.serialNumber && bladeForm.type) {
      setBlades([...blades, { id: Date.now(), ...bladeForm }]);
      setBladeForm({ type: '', serialNumber: '', purchaseDate: '', status: 'new' });
      setShowCreateForm(false);
    }
  };

  const handleDeleteBlade = (id) => {
    setBlades(blades.filter(b => b.id !== id));
  };

  // ==================== BLADE TYPE HANDLERS ====================
  const handleAddBladeType = (e) => {
    e.preventDefault();
    if (typeForm.code && typeForm.machineType) {
      setBladeTypes([...bladeTypes, { id: Date.now(), ...typeForm }]);
      setTypeForm({ code: '', machineType: '', description: '' });
      setShowCreateTypeForm(false);
    }
  };

  const handleDeleteBladeType = (id) => {
    setBladeTypes(bladeTypes.filter(t => t.id !== id));
  };

  // ==================== SHARPENING HANDLERS ====================
  const handleAddSharpening = (e) => {
    e.preventDefault();
    if (sharpeningForm.blade && sharpeningForm.date) {
      setSharpenings([...sharpenings, { id: Date.now(), ...sharpeningForm }]);
      setSharpeningForm({ blade: '', date: '', method: 'professional', cost: '', provider: '' });
      setShowSharpeningForm(false);
    }
  };

  const handleDeleteSharpening = (id) => {
    setSharpenings(sharpenings.filter(s => s.id !== id));
  };

  // ==================== TAB RENDERS ====================

  // Render Blades Tab
  const renderBladesTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search blades by serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100">
            <Filter className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Blade
        </button>
      </div>

      {/* Create Blade Form */}
      {showCreateForm && (
        <form onSubmit={handleAddBlade} className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Blade</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Blade Type
              </label>
              <select 
                value={bladeForm.type}
                onChange={(e) => setBladeForm({ ...bladeForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select blade type...</option>
                {bladeTypes.map(t => (
                  <option key={t.id} value={t.code}>{t.machineType} ({t.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Serial Number
              </label>
              <input
                type="text"
                placeholder="e.g., BLD-001"
                value={bladeForm.serialNumber}
                onChange={(e) => setBladeForm({ ...bladeForm, serialNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                value={bladeForm.purchaseDate}
                onChange={(e) => setBladeForm({ ...bladeForm, purchaseDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select 
                value={bladeForm.status}
                onChange={(e) => setBladeForm({ ...bladeForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option>new</option>
                <option>active</option>
                <option>sharpening</option>
                <option>retired</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
              Create Blade
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Blades Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Serial Number</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Usage Hours</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Sharpenings</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Last Sharpened</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {blades.length === 0 ? (
                <tr className="hover:bg-slate-50">
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    No blades yet. Create one to get started!
                  </td>
                </tr>
              ) : (
                blades.map(blade => (
                  <tr key={blade.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-900 font-medium">{blade.serialNumber}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{blade.type}</td>
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
                    <td className="px-6 py-3 text-sm text-slate-700">0</td>
                    <td className="px-6 py-3 text-sm text-slate-700">0</td>
                    <td className="px-6 py-3 text-sm text-slate-700">-</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button className="text-blue-600 hover:text-blue-700">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteBlade(blade.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
      <button 
        onClick={() => setShowCreateTypeForm(!showCreateTypeForm)}
        className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Blade Type
      </button>

      {/* Create Blade Type Form */}
      {showCreateTypeForm && (
        <form onSubmit={handleAddBladeType} className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Blade Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Code
              </label>
              <input
                type="text"
                placeholder="e.g., BT-001"
                value={typeForm.code}
                onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Machine Type
              </label>
              <input
                type="text"
                placeholder="e.g., Circular Saw"
                value={typeForm.machineType}
                onChange={(e) => setTypeForm({ ...typeForm, machineType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                placeholder="Describe the blade type..."
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                rows="3"
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Description</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bladeTypes.length === 0 ? (
                <tr className="hover:bg-slate-50">
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                    No blade types yet. Create one to get started!
                  </td>
                </tr>
              ) : (
                bladeTypes.map(type => (
                  <tr key={type.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{type.code}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{type.machineType}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{type.description}</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button className="text-blue-600 hover:text-blue-700">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteBladeType(type.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Usage Logs Tab
  const renderUsageTab = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Blade</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Operation</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Hours Used</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Logged By</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="hover:bg-slate-50">
                <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                  No usage logs yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Sharpening Tab
  const renderSharpeningTab = () => (
    <div className="space-y-4">
      <button 
        onClick={() => setShowSharpeningForm(!showSharpeningForm)}
        className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Sharpening Record
      </button>

      {/* Create Sharpening Form */}
      {showSharpeningForm && (
        <form onSubmit={handleAddSharpening} className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Log Sharpening Record</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Blade
              </label>
              <select 
                value={sharpeningForm.blade}
                onChange={(e) => setSharpeningForm({ ...sharpeningForm, blade: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select blade...</option>
                {blades.map(b => (
                  <option key={b.id} value={b.serialNumber}>{b.serialNumber}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={sharpeningForm.date}
                onChange={(e) => setSharpeningForm({ ...sharpeningForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Method
              </label>
              <select 
                value={sharpeningForm.method}
                onChange={(e) => setSharpeningForm({ ...sharpeningForm, method: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option>professional</option>
                <option>in-house</option>
                <option>external</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cost
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={sharpeningForm.cost}
                onChange={(e) => setSharpeningForm({ ...sharpeningForm, cost: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Provider
              </label>
              <input
                type="text"
                placeholder="Company name or technician"
                value={sharpeningForm.provider}
                onChange={(e) => setSharpeningForm({ ...sharpeningForm, provider: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
              Log Sharpening
            </button>
            <button
              type="button"
              onClick={() => setShowSharpeningForm(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Sharpening Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Blade</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Method</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Cost</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Provider</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sharpenings.length === 0 ? (
                <tr className="hover:bg-slate-50">
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    No sharpening records yet.
                  </td>
                </tr>
              ) : (
                sharpenings.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-900 font-medium">{record.blade}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{record.date}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{record.method}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">${record.cost || '0.00'}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{record.provider}</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button className="text-blue-600 hover:text-blue-700">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteSharpening(record.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
              <h4 className="font-semibold text-yellow-900">No Active Alerts</h4>
              <p className="text-sm text-yellow-700">All blades are in good condition.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Stats Tab
  const renderStatsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Blades', value: blades.length, color: 'bg-blue-50' },
          { label: 'Active', value: blades.filter(b => b.status === 'active').length, color: 'bg-green-50' },
          { label: 'In Sharpening', value: blades.filter(b => b.status === 'sharpening').length, color: 'bg-yellow-50' },
          { label: 'Retired', value: blades.filter(b => b.status === 'retired').length, color: 'bg-red-50' },
        ].map((stat, idx) => (
          <div key={idx} className={`${stat.color} rounded-lg border p-4`}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
          </div>
        ))}
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
      case 'usage':
        return renderUsageTab();
      case 'sharpening':
        return renderSharpeningTab();
      case 'alerts':
        return renderAlertsTab();
      case 'stats':
        return renderStatsTab();
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
          <p className="text-slate-600">Manage blade inventory, usage, and maintenance</p>
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
    </div>
  );
};

export default BladeTracking;
