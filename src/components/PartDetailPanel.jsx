import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const PartDetailPanel = ({ part, onClose }) => {
  const [machineUsage, setMachineUsage] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (part) {
      fetchMachineUsage();
    }
  }, [part]);

  const fetchMachineUsage = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assembly_parts')
        .select(`
          quantity,
          assembly:assembly_id (
            machine_id,
            name
          )
        `)
        .eq('part_id', part.id);

      if (error) throw error;

      // Group by machine
      const machineGroups = {};
      (data || []).forEach((item) => {
        const machineId = item.assembly?.machine_id;
        if (machineId) {
          if (!machineGroups[machineId]) {
            machineGroups[machineId] = {
              id: machineId,
              total: 0,
              assemblies: [],
            };
          }
          machineGroups[machineId].total += item.quantity;
          machineGroups[machineId].assemblies.push(item.assembly?.name);
        }
      });

      setMachineUsage(Object.values(machineGroups));
    } catch (err) {
      console.error('Error fetching machine usage:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStockStatus = () => {
    const stock = part.stock_level || 0;
    if (stock > 10) return { status: 'In Stock', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 };
    if (stock > 0) return { status: 'Low Stock', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertCircle };
    return { status: 'Out of Stock', color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle };
  };

  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/50">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Part Details</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Part Name & Number */}
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{part.name}</h2>
            <div className="flex items-center justify-between">
              <p className="text-sm font-mono text-teal-400">{part.part_number}</p>
              <button
                onClick={() => copyToClipboard(part.part_number)}
                className="p-1 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-teal-400"
                title="Copy part number"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copied && <p className="text-xs text-teal-400 mt-2">Copied!</p>}
          </div>

          {/* Basic Info */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</h4>
            <div className="space-y-2 text-sm">
              {part.category && (
                <div>
                  <span className="text-gray-400">Category</span>
                  <p className="text-white font-medium mt-1">{part.category}</p>
                </div>
              )}
              {part.description && (
                <div>
                  <span className="text-gray-400">Description</span>
                  <p className="text-white text-sm mt-1 leading-relaxed">{part.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pricing & Availability */}
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Pricing & Stock</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Unit Cost</span>
                <span className="text-xl font-bold text-teal-400">€{(part.cost || 0).toFixed(2)}</span>
              </div>
              <div className="h-px bg-teal-500/20"></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Current Stock</span>
                <span className="font-semibold text-white">{part.stock_level || 0} units</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status</span>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${stockStatus.bg}`}>
                  <StatusIcon className={`w-4 h-4 ${stockStatus.color}`} />
                  <span className={`text-xs font-medium ${stockStatus.color}`}>{stockStatus.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Info */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Supplier</h4>
            <div className="space-y-2 text-sm">
              {part.supplier && (
                <div>
                  <span className="text-gray-400">Supplier</span>
                  <p className="text-white font-medium mt-1">{part.supplier}</p>
                </div>
              )}
              {part.lead_time && (
                <div>
                  <span className="text-gray-400">Lead Time</span>
                  <p className="text-white font-medium mt-1">{part.lead_time}</p>
                </div>
              )}
              {!part.supplier && (
                <p className="text-gray-500 italic">No supplier information available</p>
              )}
            </div>
          </div>

          {/* Usage Across Machines */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Usage</h4>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : machineUsage.length > 0 ? (
              <div className="space-y-2">
                {machineUsage.map((usage, idx) => (
                  <div key={idx} className="bg-slate-700/30 border border-slate-600/30 rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-white truncate">Machine {idx + 1}</p>
                      <span className="text-xs font-semibold text-teal-400 bg-teal-500/20 px-2 py-1 rounded">
                        {usage.total} units
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      {usage.assemblies.map((assembly, aIdx) => (
                        <p key={aIdx} className="text-gray-400 truncate">
                          • {assembly}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">Not used in any machine assemblies</p>
            )}
          </div>

          {/* Additional Info */}
          {(part.sku || part.min_stock) && (
            <div className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-4 space-y-2 text-sm">
              {part.sku && (
                <div>
                  <span className="text-gray-400">SKU</span>
                  <p className="text-white font-mono text-xs mt-1">{part.sku}</p>
                </div>
              )}
              {part.min_stock && (
                <div>
                  <span className="text-gray-400">Minimum Stock Level</span>
                  <p className="text-white font-medium mt-1">{part.min_stock} units</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 border-t border-slate-700/50 bg-slate-900/50 px-6 py-4 space-y-2">
        <button className="w-full px-4 py-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400 hover:bg-teal-500/20 transition-colors font-medium text-sm">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            View Full Details
          </div>
        </button>
      </div>
    </div>
  );
};

export default PartDetailPanel;