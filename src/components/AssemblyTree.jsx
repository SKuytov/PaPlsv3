import React, { useState, useEffect } from 'react';
import { ChevronRight, Package, Box, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const AssemblyTree = ({ machineId, onAssemblySelect, onPartSelect, selectedAssembly }) => {
  const [assemblies, setAssemblies] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (machineId) {
      fetchAssemblies();
    }
  }, [machineId]);

  const fetchAssemblies = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all assemblies for machine
      const { data: assembliesData, error: asmError } = await supabase
        .from('machine_assemblies')
        .select('id, name, description, position')
        .eq('machine_id', machineId)
        .order('position');

      if (asmError) throw asmError;

      // For each assembly, fetch its sub-assemblies and parts
      const assemblyDetails = await Promise.all(
        (assembliesData || []).map(async (assembly) => {
          // Get sub-assemblies
          const { data: subAsms } = await supabase
            .from('machine_sub_assemblies')
            .select('id, name, description, position')
            .eq('assembly_id', assembly.id)
            .order('position');

          // Get direct parts (no sub-assembly)
          const { data: directParts } = await supabase
            .from('assembly_parts')
            .select(`
              id,
              quantity,
              notes,
              spare_parts:part_id (
                id,
                part_number,
                name,
                cost,
                stock_level
              )
            `)
            .eq('assembly_id', assembly.id)
            .is('sub_assembly_id', null);

          // Get sub-assembly parts with their details
          const subAssemblyDetails = await Promise.all(
            (subAsms || []).map(async (subAsm) => {
              const { data: subAsmParts } = await supabase
                .from('assembly_parts')
                .select(`
                  id,
                  quantity,
                  notes,
                  spare_parts:part_id (
                    id,
                    part_number,
                    name,
                    cost,
                    stock_level
                  )
                `)
                .eq('sub_assembly_id', subAsm.id);

              return {
                ...subAsm,
                parts: subAsmParts || [],
              };
            })
          );

          return {
            ...assembly,
            subAssemblies: subAssemblyDetails || [],
            directParts: directParts || [],
          };
        })
      );

      setAssemblies(assemblyDetails);
      // Expand first assembly by default
      if (assemblyDetails.length > 0) {
        setExpandedItems({ [assemblyDetails[0].id]: true });
        onAssemblySelect(assemblyDetails[0]);
      }
    } catch (err) {
      console.error('Error fetching assemblies:', err);
      setError('Failed to load assemblies');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const calculateCost = (parts) => {
    return parts.reduce((sum, part) => {
      const unitCost = part.spare_parts?.cost || 0;
      return sum + unitCost * part.quantity;
    }, 0);
  };

  const getStockStatus = (stockLevel) => {
    if (stockLevel > 10) return { color: 'bg-green-500', text: '✓', title: 'In Stock' };
    if (stockLevel > 0) return { color: 'bg-yellow-500', text: '⚠', title: 'Low Stock' };
    return { color: 'bg-red-500', text: '✗', title: 'Out of Stock' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-400 text-sm">Loading assemblies...</p>
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

  if (assemblies.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-8 text-center">
        <Box className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">No assemblies found for this machine</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assemblies.map((assembly) => {
        const isExpanded = expandedItems[assembly.id];
        const assemblyParts = [...assembly.directParts, ...assembly.subAssemblies.flatMap((sa) => sa.parts)];
        const totalCost = calculateCost(assemblyParts);

        return (
          <div key={assembly.id} className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
            {/* Assembly Header */}
            <button
              onClick={() => {
                toggleExpanded(assembly.id);
                onAssemblySelect(assembly);
              }}
              className={`w-full px-6 py-4 flex items-start justify-between hover:bg-slate-700/20 transition-colors text-left ${
                selectedAssembly?.id === assembly.id ? 'bg-teal-500/10 border-b border-teal-500/20' : ''
              }`}
            >
              <div className="flex-1 flex items-start gap-3">
                <ChevronRight
                  className={`w-5 h-5 text-gray-500 mt-1 transition-transform flex-shrink-0 ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white">{assembly.name}</h3>
                  {assembly.description && (
                    <p className="text-gray-400 text-sm mt-1 truncate">{assembly.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6 ml-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-2xl font-bold text-teal-400">€{totalCost.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 mt-1">{assemblyParts.length} parts</p>
                </div>
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="bg-slate-900/20 border-t border-slate-700/30">
                {/* Direct Parts */}
                {assembly.directParts.length > 0 && (
                  <div className="px-6 py-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Direct Parts ({assembly.directParts.length})</h4>
                    <div className="space-y-2">
                      {assembly.directParts.map((part) => {
                        const status = getStockStatus(part.spare_parts?.stock_level || 0);
                        return (
                          <button
                            key={part.id}
                            onClick={() => onPartSelect(part.spare_parts)}
                            className="w-full flex items-center justify-between px-4 py-2 bg-slate-700/30 hover:bg-slate-600/30 rounded transition-colors text-left group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium group-hover:text-teal-300 transition-colors">
                                {part.spare_parts?.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {part.spare_parts?.part_number} • Qty: {part.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                              <div className="text-right">
                                <p className="text-sm font-semibold text-teal-300">
                                  €{(part.spare_parts?.cost * part.quantity).toFixed(2)}
                                </p>
                              </div>
                              <div className={`w-3 h-3 rounded-full ${status.color}`} title={status.title} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-Assemblies */}
                {assembly.subAssemblies.length > 0 && (
                  <div className="px-6 py-3 border-t border-slate-700/30">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sub-Assemblies ({assembly.subAssemblies.length})</h4>
                    <div className="space-y-2">
                      {assembly.subAssemblies.map((subAsm) => {
                        const subAsmCost = calculateCost(subAsm.parts);
                        return (
                          <div key={subAsm.id}>
                            <div className="px-3 py-2 bg-slate-700/20 rounded">
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium text-gray-300">{subAsm.name}</h5>
                                <span className="text-sm text-teal-300 font-semibold">€{subAsmCost.toFixed(2)}</span>
                              </div>
                            </div>
                            {/* Sub-Assembly Parts */}
                            <div className="pl-3 mt-2 space-y-1 border-l border-slate-600/30">
                              {subAsm.parts.map((part) => {
                                const status = getStockStatus(part.spare_parts?.stock_level || 0);
                                return (
                                  <button
                                    key={part.id}
                                    onClick={() => onPartSelect(part.spare_parts)}
                                    className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-700/20 hover:bg-slate-600/30 rounded transition-colors text-left group text-sm"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white font-medium group-hover:text-teal-300 transition-colors">
                                        {part.spare_parts?.name}
                                      </p>
                                      <p className="text-xs text-gray-500">Qty: {part.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                      <span className="text-teal-300 font-medium whitespace-nowrap">
                                        €{(part.spare_parts?.cost * part.quantity).toFixed(2)}
                                      </span>
                                      <div className={`w-2 h-2 rounded-full ${status.color}`} />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AssemblyTree;