import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { RolePermissionsContext } from '@/contexts/RolePermissionsContext';
import RestockModal from '@/components/technician/RestockModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Plus, LogOut } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const MaintenanceSpareParts = ({ 
  onLogout, 
  technicianName, 
  userId,
  userRole,
  userPermissions = []
}) => {
  const [spareParts, setSpareParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  
  const roleContext = useContext(RolePermissionsContext);
  const canRestock = userPermissions.includes('restock_inventory');
  const canEdit = userPermissions.includes('edit_inventory');

  useEffect(() => {
    fetchSpareParts();
  }, []);

  useEffect(() => {
    const filtered = spareParts.filter(part =>
      part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.part_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredParts(filtered);
  }, [searchTerm, spareParts]);

  const fetchSpareParts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSpareParts(data || []);
    } catch (err) {
      console.error('Error fetching spare parts:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestockClick = (part) => {
    setSelectedPart(part);
    setIsRestockModalOpen(true);
  };

  const handleExportCSV = () => {
    if (filteredParts.length === 0) return;

    const headers = ['Part Number', 'Name', 'Quantity', 'Unit', 'Location', 'Status'];
    const data = filteredParts.map(part => [
      part.part_number || '',
      part.name || '',
      part.quantity_on_hand || 0,
      part.unit || '',
      part.location || '',
      (part.quantity_on_hand || 0) > 0 ? 'In Stock' : 'Out of Stock'
    ]);

    const csv = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spare-parts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">📦 Spare Parts Inventory</h1>
        <Button
          onClick={onLogout}
          variant="outline"
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ❌ Error: {error}
        </div>
      )}

      {/* Search and Export */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search by name or part number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Parts</p>
          <p className="text-2xl font-bold text-blue-900">{spareParts.length}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600 font-medium">In Stock</p>
          <p className="text-2xl font-bold text-green-900">
            {spareParts.filter(p => (p.quantity_on_hand || 0) > 0).length}
          </p>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">Out of Stock</p>
          <p className="text-2xl font-bold text-red-900">
            {spareParts.filter(p => (p.quantity_on_hand || 0) === 0).length}
          </p>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Part Number</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Qty</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Unit</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Location</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                {(canRestock || canEdit) && (
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    No spare parts found
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => {
                  const isLowStock = (part.quantity_on_hand || 0) < (part.minimum_quantity || 5);
                  const isOutOfStock = (part.quantity_on_hand || 0) === 0;

                  return (
                    <tr key={part.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {part.part_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {part.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${
                          isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {part.quantity_on_hand || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {part.unit || 'pcs'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {part.location || 'TBD'}
                      </td>
                      <td className="px-4 py-3">
                        {isOutOfStock ? (
                          <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                            🔴 Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            🟡 Low Stock
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            🟢 In Stock
                          </span>
                        )}
                      </td>
                      {(canRestock || canEdit) && (
                        <td className="px-4 py-3">
                          {canRestock && (
                            <Button
                              onClick={() => handleRestockClick(part)}
                              size="sm"
                              className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700"
                            >
                              <Plus className="w-4 h-4" />
                              Restock
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Counter */}
      <div className="text-sm text-slate-600">
        Showing {filteredParts.length} of {spareParts.length} spare parts
      </div>

      {/* Restock Modal */}
      {selectedPart && (
        <RestockModal
          isOpen={isRestockModalOpen}
          onClose={() => {
            setIsRestockModalOpen(false);
            setSelectedPart(null);
          }}
          sparePart={selectedPart}
          userId={userId}
          userName={technicianName}
          building="TBD"
          onRestockSuccess={() => {
            // Refresh spare parts list
            fetchSpareParts();
          }}
        />
      )}
    </div>
  );
};

export default MaintenanceSpareParts;
