'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, ChevronRight, Wrench, AlertTriangle
} from 'lucide-react';
import { dbService } from '@/lib/supabase';
import EnhancedMachineCatalog from '@/components/modules/machines/EnhancedMachineCatalog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const MachinesCatalogPage = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Load machines on mount
  useEffect(() => {
    loadMachines();
  }, []);

  // Set first machine as selected
  useEffect(() => {
    if (machines.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machines[0].id);
      setSelectedMachine(machines[0]);
    }
  }, [machines]);

  // Update selected machine when ID changes
  useEffect(() => {
    if (selectedMachineId) {
      const machine = machines.find(m => m.id === selectedMachineId);
      setSelectedMachine(machine);
    }
  }, [selectedMachineId, machines]);

  const loadMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await dbService.getMachines({}, 0, 1000);
      if (queryError) throw queryError;
      setMachines(data || []);
    } catch (err) {
      console.error('Error loading machines:', err);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load machines'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter machines by search
  const filteredMachines = machines.filter(machine =>
    machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.machine_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner message="Loading catalogue..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 h-full bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Industrial Spare Parts Catalogue</h1>
          <p className="text-slate-600 mt-1">Multi-level assembly system with interactive diagrams</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Wrench className="w-4 h-4 mr-2" />
          {machines.length} Machines
        </Badge>
      </div>

      {/* Error State */}
      {error && (
        <Card className="bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error loading machines</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-220px)]">
        {/* Left Sidebar - Machine Selector */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search machines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Machine List */}
          <div className="flex-1 overflow-y-auto space-y-2 rounded-lg border border-slate-200 bg-white p-2">
            {filteredMachines.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No machines found
              </div>
            ) : (
              filteredMachines.map((machine) => (
                <button
                  key={machine.id}
                  onClick={() => setSelectedMachineId(machine.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-all ${
                    selectedMachineId === machine.id
                      ? 'bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-blue-600 text-blue-900 font-semibold shadow-sm'
                      : 'hover:bg-slate-100 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{machine.name}</p>
                      <p className="text-xs text-slate-500 truncate">{machine.machine_code}</p>
                    </div>
                    {selectedMachineId === machine.id && (
                      <ChevronRight className="w-4 h-4 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Info Card */}
          {selectedMachine && (
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-25">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Selected Machine</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div>
                  <p className="text-slate-600 font-medium">Name</p>
                  <p className="font-semibold text-slate-900">{selectedMachine.name}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium">Type</p>
                  <p className="font-semibold text-slate-900">{selectedMachine.type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium">Status</p>
                  <Badge className="text-xs mt-1">{selectedMachine.status || 'Unknown'}</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Content - Enhanced Catalog */}
        <div className="lg:col-span-3 flex flex-col">
          {selectedMachine ? (
            <EnhancedMachineCatalog
              machineId={selectedMachine.id}
              machineName={selectedMachine.name}
              userRole={userRole?.name}
            />
          ) : (
            <Card className="flex-1 flex items-center justify-center border-2 border-dashed">
              <div className="text-center text-slate-500">
                <Wrench className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No machine selected</p>
                <p className="text-sm mt-1">Select a machine from the list to view its complete catalogue</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MachinesCatalogPage;
