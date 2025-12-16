import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronRight, Copy, Download,
  Upload, Search, Filter, Save, X, AlertCircle, CheckCircle2,
  Layers, Package, DollarSign, Settings, Eye, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Assembly Form Dialog
const AssemblyFormDialog = ({ isOpen, onClose, onSave, editingAssembly, title }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (editingAssembly) {
      setFormData(editingAssembly);
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [editingAssembly, isOpen]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    onSave(formData);
    setFormData({ name: '', description: '' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Spindle, Bearing Housing"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of this assembly"
              className="w-full mt-1 p-2 border rounded text-sm"
              rows="3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// BOM Item Dialog
const BOMItemDialog = ({ isOpen, onClose, onSave, allParts, editingItem, title }) => {
  const [formData, setFormData] = useState({ part_id: '', quantity: 1, notes: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({ part_id: '', quantity: 1, notes: '' });
    }
  }, [editingItem, isOpen]);

  const handleSave = () => {
    if (!formData.part_id) {
      alert('Please select a part');
      return;
    }
    onSave(formData);
    setFormData({ part_id: '', quantity: 1, notes: '' });
  };

  const filteredParts = allParts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.part_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Search & Select Part *</label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or part number"
              className="mt-1 mb-2"
            />
            <div className="border rounded max-h-40 overflow-y-auto">
              {filteredParts.length === 0 ? (
                <div className="p-3 text-center text-sm text-slate-500">No parts found</div>
              ) : (
                filteredParts.map(part => (
                  <button
                    key={part.id}
                    onClick={() => {
                      setFormData({ ...formData, part_id: part.id });
                      setSearchTerm('');
                    }}
                    className={`w-full text-left p-2 border-b hover:bg-blue-50 transition-colors text-sm ${
                      formData.part_id === part.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    <p className="font-medium">{part.name}</p>
                    <p className="text-xs text-slate-600">{part.part_number} • €{part.average_cost}</p>
                  </button>
                ))
              )}
            </div>
            {formData.part_id && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Part selected
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Quantity *</label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g., Premium grade, High precision"
              className="w-full mt-1 p-2 border rounded text-sm"
              rows="2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main Assembly Manager Component
const AssemblyManager = ({ machineId, machineName, userRole }) => {
  const { toast } = useToast();
  const [assemblies, setAssemblies] = useState([]);
  const [allParts, setAllParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAssembly, setExpandedAssembly] = useState(null);
  const [expandedSubAssembly, setExpandedSubAssembly] = useState(null);

  // Dialog states
  const [assemblyDialogOpen, setAssemblyDialogOpen] = useState(false);
  const [subAssemblyDialogOpen, setSubAssemblyDialogOpen] = useState(false);
  const [bomDialogOpen, setBOMDialogOpen] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState(null);
  const [editingSubAssembly, setEditingSubAssembly] = useState(null);
  const [editingBOMItem, setEditingBOMItem] = useState(null);
  const [selectedAssembly, setSelectedAssembly] = useState(null);
  const [selectedSubAssembly, setSelectedSubAssembly] = useState(null);

  const isAdmin = ['God Admin', 'Technical Director', 'Head Technician'].includes(userRole);

  useEffect(() => {
    if (isAdmin) {
      loadAssemblies();
      loadAllParts();
    }
  }, [machineId]);

  const loadAssemblies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('machine_assemblies')
        .select(`
          *,
          sub_assemblies:machine_sub_assemblies(
            *,
            parts:assembly_parts(
              *,
              spare_part:spare_parts(id, name, part_number, average_cost, current_quantity, unit_of_measure)
            )
          ),
          parts:assembly_parts(
            *,
            spare_part:spare_parts(id, name, part_number, average_cost, current_quantity, unit_of_measure)
          )
        `)
        .eq('machine_id', machineId)
        .order('position');

      if (error && error.code !== 'PGRST116') throw error;
      setAssemblies(data || []);
    } catch (err) {
      console.error('Error loading assemblies:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load assemblies'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllParts = async () => {
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('id, name, part_number, average_cost, current_quantity, unit_of_measure, category')
        .order('name');

      if (error) throw error;
      setAllParts(data || []);
    } catch (err) {
      console.error('Error loading parts:', err);
    }
  };

  const handleCreateAssembly = async (data) => {
    try {
      const maxPosition = Math.max(...assemblies.map(a => a.position || 0), 0);

      const { error } = await supabase
        .from('machine_assemblies')
        .insert({
          machine_id: machineId,
          name: data.name,
          description: data.description,
          position: maxPosition + 1
        });

      if (error) throw error;
      await loadAssemblies();
      setAssemblyDialogOpen(false);
      toast({ title: 'Success', description: 'Assembly created' });
    } catch (err) {
      console.error('Error:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create assembly'
      });
    }
  };

  const handleDeleteAssembly = async (assemblyId) => {
    if (!confirm('Delete this assembly and all sub-assemblies?')) return;

    try {
      const { error } = await supabase
        .from('machine_assemblies')
        .delete()
        .eq('id', assemblyId);

      if (error) throw error;
      await loadAssemblies();
      toast({ title: 'Deleted', description: 'Assembly removed' });
    } catch (err) {
      console.error('Error:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete assembly'
      });
    }
  };

  const calculateAssemblyCost = (assembly) => {
    let cost = 0;
    if (assembly.parts) {
      cost += assembly.parts.reduce((sum, p) => sum + ((p.spare_part?.average_cost || 0) * (p.quantity || 1)), 0);
    }
    if (assembly.sub_assemblies) {
      cost += assembly.sub_assemblies.reduce((sum, sa) => {
        return sum + (sa.parts?.reduce((s, p) => s + ((p.spare_part?.average_cost || 0) * (p.quantity || 1)), 0) || 0);
      }, 0);
    }
    return cost;
  };

  const totalMachineCost = assemblies.reduce((sum, a) => sum + calculateAssemblyCost(a), 0);
  const totalPartCount = assemblies.reduce((sum, a) => {
    let count = a.parts?.length || 0;
    count += a.sub_assemblies?.reduce((s, sa) => s + (sa.parts?.length || 0), 0) || 0;
    return sum + count;
  }, 0);

  const filteredAssemblies = assemblies.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-700">
            <Lock className="h-5 w-5" />
            <p className="font-semibold">Admin access required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading assemblies..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Assembly Manager - {machineName}
              </CardTitle>
            </div>
            <Button
              onClick={() => {
                setEditingAssembly(null);
                setAssemblyDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Assembly
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-3">
                <p className="text-sm text-slate-600">Total Assemblies</p>
                <p className="text-2xl font-bold">{assemblies.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3">
                <p className="text-sm text-slate-600">Total Parts</p>
                <p className="text-2xl font-bold">{totalPartCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3">
                <p className="text-sm text-slate-600 flex items-center gap-1">
                  <DollarSign className="h-4 w-4" /> Total Value
                </p>
                <p className="text-2xl font-bold">€{totalMachineCost.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search assemblies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Assemblies List */}
      <div className="space-y-2">
        {filteredAssemblies.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-slate-500">
              No assemblies found. Create one to get started!
            </CardContent>
          </Card>
        ) : (
          filteredAssemblies.map((assembly) => (
            <Card key={assembly.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => setExpandedAssembly(
                        expandedAssembly === assembly.id ? null : assembly.id
                      )}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      {expandedAssembly === assembly.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <div>
                      <h4 className="font-semibold text-sm">{assembly.name}</h4>
                      {assembly.description && (
                        <p className="text-xs text-slate-600">{assembly.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {(assembly.parts?.length || 0) + (assembly.sub_assemblies?.reduce((s, sa) => s + (sa.parts?.length || 0), 0) || 0)} Parts
                    </Badge>
                    <Badge className="text-xs bg-green-100 text-green-800">
                      €{calculateAssemblyCost(assembly).toFixed(2)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAssembly(assembly.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedAssembly === assembly.id && (
                <CardContent className="space-y-3 border-t pt-3">
                  {/* Direct Parts in Assembly */}
                  {assembly.parts && assembly.parts.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-xs mb-2">Direct Parts</h5>
                      <div className="space-y-1">
                        {assembly.parts.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-slate-50 p-2 rounded text-xs"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{item.spare_part?.name}</p>
                              <p className="text-slate-600">{item.spare_part?.part_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">Qty: {item.quantity}</p>
                              <p className="text-slate-600">€{((item.spare_part?.average_cost || 0) * item.quantity).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-Assemblies */}
                  {assembly.sub_assemblies && assembly.sub_assemblies.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-xs mb-2">Sub-Assemblies</h5>
                      <div className="space-y-1 ml-4 border-l-2 border-slate-300 pl-3">
                        {assembly.sub_assemblies.map((subAsm) => (
                          <div key={subAsm.id} className="space-y-1">
                            <p className="font-semibold text-xs bg-blue-50 p-1 rounded">
                              {subAsm.name}
                            </p>
                            {subAsm.parts && subAsm.parts.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between bg-slate-50 p-1 rounded text-xs"
                              >
                                <div className="flex-1">
                                  <p className="font-medium">{item.spare_part?.name}</p>
                                  <p className="text-slate-600 text-xs">{item.spare_part?.part_number}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">Qty: {item.quantity}</p>
                                  <p className="text-slate-600 text-xs">€{((item.spare_part?.average_cost || 0) * item.quantity).toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      <AssemblyFormDialog
        isOpen={assemblyDialogOpen}
        onClose={() => {
          setAssemblyDialogOpen(false);
          setEditingAssembly(null);
        }}
        onSave={handleCreateAssembly}
        editingAssembly={editingAssembly}
        title={editingAssembly ? 'Edit Assembly' : 'Create New Assembly'}
      />
    </div>
  );
};

export default AssemblyManager;
