import React, { useState, useEffect } from 'react';
import { ChevronDown, Package, Grid, Layers, Settings, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import AssemblyTree from './AssemblyTree';
import BOMGenerator from './BOMGenerator';
import PartDetailPanel from './PartDetailPanel';

const EnhancedMachineCatalogueUI = () => {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [activeTab, setActiveTab] = useState('assemblies');
  const [selectedAssembly, setSelectedAssembly] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalAssemblies: 0,
    totalParts: 0,
    totalValue: 0,
    subAssemblies: 0,
  });
  const [machineDropdownOpen, setMachineDropdownOpen] = useState(false);

  // Fetch machines
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('machines')
          .select('id, name, machine_code, type, status')
          .order('name');

        if (fetchError) throw fetchError;
        setMachines(data || []);
        if (data && data.length > 0) {
          setSelectedMachine(data[0]);
        }
      } catch (err) {
        console.error('Error fetching machines:', err);
        setError('Failed to load machines');
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();
  }, []);

  // Fetch statistics when machine changes
  useEffect(() => {
    if (selectedMachine) {
      fetchStatistics();
    }
  }, [selectedMachine]);

  const fetchStatistics = async () => {
    try {
      if (!selectedMachine) return;

      // Get assemblies
      const { data: assemblies } = await supabase
        .from('machine_assemblies')
        .select('id')
        .eq('machine_id', selectedMachine.id);

      // Get sub-assemblies
      const { data: subAsms } = await supabase
        .from('machine_sub_assemblies')
        .select('id');

      // Get all parts with costs
      const { data: parts } = await supabase
        .from('assembly_parts')
        .select(`
          id,
          quantity,
          spare_parts:part_id (
            cost
          )
        `);

      let totalValue = 0;
      if (parts) {
        totalValue = parts.reduce((sum, part) => {
          const cost = part.spare_parts?.cost || 0;
          return sum + (cost * part.quantity);
        }, 0);
      }

      setStats({
        totalAssemblies: assemblies?.length || 0,
        subAssemblies: subAsms?.length || 0,
        totalParts: parts?.length || 0,
        totalValue: totalValue,
      });
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Machine Catalogue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-red-400 font-semibold">Error</h3>
              <p className="text-red-300/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* LEFT SIDEBAR - Machine Selector */}
      <div className="w-72 border-r border-slate-700/50 bg-slate-900/50 backdrop-blur flex flex-col">
        <div className="p-6 border-b border-slate-700/50">
          <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Grid className="w-6 h-6 text-teal-400" />
            Machines Catalogue
          </h1>

          {/* Machine Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMachineDropdownOpen(!machineDropdownOpen)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600/50 rounded-lg text-white text-left flex items-center justify-between hover:border-slate-500 transition-colors"
            >
              <div>
                <div className="text-sm font-medium">{selectedMachine?.name || 'Select Machine'}</div>
                <div className="text-xs text-gray-400 mt-1">{selectedMachine?.machine_code}</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${machineDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {machineDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50">
                {machines.map((machine) => (
                  <button
                    key={machine.id}
                    onClick={() => {
                      setSelectedMachine(machine);
                      setMachineDropdownOpen(false);
                      setSelectedAssembly(null);
                      setSelectedPart(null);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                  >
                    <div className="text-sm font-medium text-white">{machine.name}</div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        machine.status === 'Active' ? 'bg-green-400' : 'bg-gray-400'
                      }`}></span>
                      {machine.machine_code} • {machine.type}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        {selectedMachine && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border border-teal-500/20 rounded-lg p-4">
              <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-3">Statistics</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Assemblies</span>
                  <span className="font-semibold text-white">{stats.totalAssemblies}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sub-Assemblies</span>
                  <span className="font-semibold text-white">{stats.subAssemblies}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Parts</span>
                  <span className="font-semibold text-white">{stats.totalParts}</span>
                </div>
                <div className="pt-2 border-t border-slate-700/50 flex justify-between">
                  <span className="text-gray-400">Total Value</span>
                  <span className="font-semibold text-teal-400">€{stats.totalValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TAB NAVIGATION */}
        <div className="border-b border-slate-700/50 bg-slate-900/30 backdrop-blur">
          <div className="flex items-center px-6">
            {[
              { id: 'assemblies', label: 'Assemblies', icon: Layers },
              { id: 'diagram', label: 'Diagram', icon: Grid },
              { id: 'bom', label: 'BOM', icon: Package },
              { id: 'specs', label: 'Specs', icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all ${
                  activeTab === id
                    ? 'border-teal-500 text-teal-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'assemblies' && selectedMachine && (
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Assemblies</h2>
                  <p className="text-gray-400">Hierarchical view of all machine assemblies and components</p>
                </div>
                <AssemblyTree
                  machineId={selectedMachine.id}
                  onAssemblySelect={setSelectedAssembly}
                  onPartSelect={setSelectedPart}
                  selectedAssembly={selectedAssembly}
                />
              </div>
            )}

            {activeTab === 'bom' && selectedMachine && (
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Bill of Materials</h2>
                  <p className="text-gray-400">Complete parts list with quantities and costs</p>
                </div>
                <BOMGenerator
                  machineId={selectedMachine.id}
                  selectedAssembly={selectedAssembly}
                  onPartSelect={setSelectedPart}
                />
              </div>
            )}

            {activeTab === 'diagram' && (
              <div className="p-8">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-8 text-center">
                  <Grid className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Diagram Editor</h3>
                  <p className="text-gray-400">Phase 2: Interactive diagram with hotspots</p>
                  <p className="text-gray-500 text-sm mt-2">Upload machine diagrams and create interactive hotspots</p>
                </div>
              </div>
            )}

            {activeTab === 'specs' && selectedMachine && (
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-4">Machine Details</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-400">Name</p>
                        <p className="text-white font-medium">{selectedMachine.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Code</p>
                        <p className="text-white font-medium">{selectedMachine.machine_code}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Type</p>
                        <p className="text-white font-medium">{selectedMachine.type}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Status</p>
                        <p className="text-white font-medium flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            selectedMachine.status === 'Active' ? 'bg-green-400' : 'bg-gray-400'
                          }`}></span>
                          {selectedMachine.status}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-4">Assembly Statistics</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-400">Total Assemblies</p>
                        <p className="text-white font-medium">{stats.totalAssemblies}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Sub-Assemblies</p>
                        <p className="text-white font-medium">{stats.subAssemblies}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Total Parts</p>
                        <p className="text-white font-medium">{stats.totalParts}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Catalogue Value</p>
                        <p className="text-teal-400 font-medium">€{stats.totalValue.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL - Part Details */}
          {selectedPart && (
            <div className="w-96 border-l border-slate-700/50 bg-slate-900/50 backdrop-blur">
              <PartDetailPanel
                part={selectedPart}
                onClose={() => setSelectedPart(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedMachineCatalogueUI;