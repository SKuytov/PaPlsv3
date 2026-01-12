import React, { useState } from 'react';
import { ZapOff, Plus, Search, Filter, MoreVertical, Edit2, Trash2, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const BladeManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedBlade, setSelectedBlade] = useState(null);

  // Fetch blades data
  const { data: blades = [], isLoading, error } = useQuery({
    queryKey: ['blades'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/blades');
        return response.data || [];
      } catch (err) {
        console.error('Error fetching blades:', err);
        return [];
      }
    },
  });

  // Filter blades
  const filteredBlades = blades.filter(blade => {
    const matchesSearch = blade.blade_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blade.blade_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || blade.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const statusStyles = {
      'new': 'bg-green-100 text-green-800',
      'in-use': 'bg-blue-100 text-blue-800',
      'worn': 'bg-yellow-100 text-yellow-800',
      'damaged': 'bg-red-100 text-red-800',
      'archived': 'bg-gray-100 text-gray-800',
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'new': 'New',
      'in-use': 'In Use',
      'worn': 'Worn',
      'damaged': 'Damaged',
      'archived': 'Archived',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Blade Management</h1>
          <p className="text-slate-600 mt-1">Track turbine blade lifecycle and maintenance</p>
        </div>
        <button className="flex items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Plus size={20} />
          <span>Add Blade</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by blade code or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter size={20} className="text-slate-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="in-use">In Use</option>
              <option value="worn">Worn</option>
              <option value="damaged">Damaged</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Blades List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-600">
            <div className="inline-block animate-spin">
              <ZapOff size={32} className="text-teal-600" />
            </div>
            <p className="mt-4">Loading blades...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>Error loading blades. Please try again.</p>
          </div>
        ) : filteredBlades.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            <ZapOff size={48} className="mx-auto text-slate-300 mb-4" />
            <p>No blades found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Blade Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Installation Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Operating Hours</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBlades.map((blade) => (
                  <tr key={blade.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{blade.blade_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{blade.blade_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(blade.status)}`}>
                        {getStatusLabel(blade.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {blade.installation_date ? new Date(blade.installation_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{blade.operating_hours || 0}h</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <button className="p-1 hover:bg-slate-200 rounded transition-colors" title="View Details">
                          <Eye size={18} className="text-slate-600" />
                        </button>
                        <button className="p-1 hover:bg-slate-200 rounded transition-colors" title="Edit">
                          <Edit2 size={18} className="text-slate-600" />
                        </button>
                        <button className="p-1 hover:bg-slate-200 rounded transition-colors" title="Delete">
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                        <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                          <MoreVertical size={18} className="text-slate-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-slate-600">Total Blades</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">{blades.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-slate-600">In Use</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{blades.filter(b => b.status === 'in-use').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-slate-600">Maintenance Needed</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{blades.filter(b => b.status === 'worn').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-slate-600">Damaged</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{blades.filter(b => b.status === 'damaged').length}</p>
        </div>
      </div>
    </div>
  );
};

export default BladeManagement;
