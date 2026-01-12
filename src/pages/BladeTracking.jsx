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
  const [showCreateForm, setShowCreateForm] = useState(false);

  const tabs = [
    { id: 'blades', label: 'Blades', icon: AlertTriangle }, // Using AlertTriangle as placeholder
    { id: 'types', label: 'Blade Types', icon: Settings },
    { id: 'usage', label: 'Usage Logs', icon: Clock },
    { id: 'sharpening', label: 'Sharpening', icon: AlertTriangle },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
  ];

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
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Blade</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Blade Type
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option>Select blade type...</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Serial Number
              </label>
              <input
                type="text"
                placeholder="e.g., BLD-001"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option>new</option>
                <option>active</option>
                <option>sharpening</option>
                <option>retired</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
              Create Blade
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
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
              <tr className="hover:bg-slate-50">
                <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                  No blades yet. Create one to get started!
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Blade Types Tab
  const renderBladeTypesTab = () => (
    <div className="space-y-4">
      <button className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors">
        <Plus className="w-4 h-4" />
        Add Blade Type
      </button>
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
              <tr className="hover:bg-slate-50">
                <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                  No blade types yet. Create one to get started!
                </td>
              </tr>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="hover:bg-slate-50">
                <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                  No sharpening records yet.
                </td>
              </tr>
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
          { label: 'Total Blades', value: '0', color: 'bg-blue-50' },
          { label: 'Active', value: '0', color: 'bg-green-50' },
          { label: 'In Sharpening', value: '0', color: 'bg-yellow-50' },
          { label: 'Retired', value: '0', color: 'bg-red-50' },
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
