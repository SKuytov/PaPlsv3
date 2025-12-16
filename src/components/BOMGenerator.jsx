import React, { useState, useEffect } from 'react';
import { Download, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const BOMGenerator = ({ machineId, selectedAssembly, onPartSelect }) => {
  const [bomData, setBomData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalParts: 0,
    totalQuantity: 0,
    totalCost: 0,
  });

  useEffect(() => {
    if (machineId) {
      fetchBOM();
    }
  }, [machineId, selectedAssembly]);

  const fetchBOM = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('assembly_parts')
        .select(`
          id,
          quantity,
          notes,
          assembly_id,
          sub_assembly_id,
          spare_parts:part_id (
            id,
            part_number,
            name,
            category,
            cost,
            stock_level
          ),
          assembly:assembly_id (
            id,
            name
          ),
          sub_assembly:sub_assembly_id (
            id,
            name
          )
        `);

      // If assembly selected, filter by it
      if (selectedAssembly) {
        query = query.eq('assembly_id', selectedAssembly.id);
      } else {
        // Otherwise, get parts for all assemblies of the machine
        const { data: assemblies } = await supabase
          .from('machine_assemblies')
          .select('id')
          .eq('machine_id', machineId);

        if (assemblies && assemblies.length > 0) {
          const assemblyIds = assemblies.map((a) => a.id);
          query = query.in('assembly_id', assemblyIds);
        }
      }

      const { data, error: fetchError } = await query.order('assembly_id');

      if (fetchError) throw fetchError;

      setBomData(data || []);

      // Calculate statistics
      const stats = (data || []).reduce(
        (acc, item) => {
          const cost = item.spare_parts?.cost || 0;
          return {
            totalParts: acc.totalParts + 1,
            totalQuantity: acc.totalQuantity + item.quantity,
            totalCost: acc.totalCost + cost * item.quantity,
          };
        },
        { totalParts: 0, totalQuantity: 0, totalCost: 0 }
      );

      setStats(stats);
    } catch (err) {
      console.error('Error fetching BOM:', err);
      setError('Failed to load bill of materials');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (stockLevel) => {
    if (stockLevel > 10) return { text: '✓ In Stock', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-500/30' };
    if (stockLevel > 0) return { text: '⚠ Low Stock', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-500/30' };
    return { text: '✗ Out of Stock', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-500/30' };
  };

  const exportToCSV = () => {
    const headers = ['Part Number', 'Part Name', 'Assembly', 'Sub-Assembly', 'Quantity', 'Unit Cost', 'Total Cost', 'Stock Status'];
    const rows = bomData.map((item) => [
      item.spare_parts?.part_number || '',
      item.spare_parts?.name || '',
      item.assembly?.name || '',
      item.sub_assembly?.name || '-',
      item.quantity,
      item.spare_parts?.cost || 0,
      (item.spare_parts?.cost || 0) * item.quantity,
      item.spare_parts?.stock_level || 0,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOM-${selectedAssembly?.name || 'Machine'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const printBOM = () => {
    const printWindow = window.open('', '', 'height=600,width=900');
    printWindow.document.write(`
      <html>
        <head>
          <title>BOM - ${selectedAssembly?.name || 'Machine'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #333; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background: #f9f9f9; }
            .total { font-weight: bold; background: #f0f0f0; }
            .summary { margin-top: 20px; padding: 10px; background: #f9f9f9; border-left: 4px solid #333; }
          </style>
        </head>
        <body>
          <h1>Bill of Materials</h1>
          <p><strong>Assembly:</strong> ${selectedAssembly?.name || 'All Assemblies'}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Part Number</th>
                <th>Part Name</th>
                <th>Assembly</th>
                <th>Sub-Assembly</th>
                <th>Qty</th>
                <th>Unit Cost</th>
                <th>Total Cost</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              ${bomData
                .map(
                  (item) => `
                <tr>
                  <td>${item.spare_parts?.part_number || ''}</td>
                  <td>${item.spare_parts?.name || ''}</td>
                  <td>${item.assembly?.name || ''}</td>
                  <td>${item.sub_assembly?.name || '-'}</td>
                  <td>${item.quantity}</td>
                  <td>€${(item.spare_parts?.cost || 0).toFixed(2)}</td>
                  <td>€${((item.spare_parts?.cost || 0) * item.quantity).toFixed(2)}</td>
                  <td>${item.spare_parts?.stock_level || 0} units</td>
                </tr>
              `
                )
                .join('')}
              <tr class="total">
                <td colspan="4">TOTAL</td>
                <td>${stats.totalQuantity}</td>
                <td></td>
                <td>€${stats.totalCost.toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div class="summary">
            <p><strong>Total Parts:</strong> ${stats.totalParts}</p>
            <p><strong>Total Quantity:</strong> ${stats.totalQuantity} units</p>
            <p><strong>Total Cost:</strong> €${stats.totalCost.toFixed(2)}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-400 text-sm">Loading bill of materials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (bomData.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-8 text-center">
        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">No parts found in bill of materials</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {selectedAssembly ? selectedAssembly.name : 'All Assemblies'}
          </h3>
          <p className="text-sm text-gray-400">{stats.totalParts} parts, {stats.totalQuantity} units total</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400 hover:bg-teal-500/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={printBOM}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400 hover:bg-teal-500/20 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* BOM Table */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Part #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Part Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Assembly</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Sub-Asm</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Unit Cost</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {bomData.map((item, idx) => {
                const status = getStockStatus(item.spare_parts?.stock_level || 0);
                const totalCost = (item.spare_parts?.cost || 0) * item.quantity;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-700/20 transition-colors cursor-pointer"
                    onClick={() => onPartSelect(item.spare_parts)}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-teal-400">{item.spare_parts?.part_number}</td>
                    <td className="px-6 py-4 text-sm text-white font-medium">{item.spare_parts?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{item.assembly?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{item.sub_assembly?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-center text-white font-semibold">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-300">€{(item.spare_parts?.cost || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-teal-400">€{totalCost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color} border ${status.border}`}>
                        {status.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="bg-slate-900/50 border-t border-slate-700/50 px-6 py-4 grid grid-cols-3 gap-8">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Parts</p>
            <p className="text-2xl font-bold text-white">{stats.totalParts}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Quantity</p>
            <p className="text-2xl font-bold text-white">{stats.totalQuantity}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Cost</p>
            <p className="text-2xl font-bold text-teal-400">€{stats.totalCost.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMGenerator;