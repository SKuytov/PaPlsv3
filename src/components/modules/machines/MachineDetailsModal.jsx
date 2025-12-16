import React, { useState, useEffect } from 'react';
import {
  X, Wrench, Activity, DollarSign, Calendar,
  BarChart3, AlertTriangle, Box, Eye, ChevronDown
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dbService } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/utils/calculations';
import { Badge } from '@/components/ui/badge';
import TransactionDetailsModal from './TransactionDetailsModal';

const MachineDetailsModal = ({ machine, open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [machineAssemblies, setMachineAssemblies] = useState([]); // Parts currently on machine
  const [loadingTx, setLoadingTx] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetailsOpen, setTransactionDetailsOpen] = useState(false);
  const [stats, setStats] = useState({
    totalParts: 0,
    uniqueParts: 0,
    uniquePartsOnMachine: 0, // NEW: Actual parts currently installed
    lastMaintenance: null
  });

  useEffect(() => {
    if (open && machine?.id) {
      loadTransactions();
      loadMachineAssemblies(); // NEW: Load parts currently on machine
    }
  }, [open, machine]);

  const loadTransactions = async () => {
    setLoadingTx(true);
    try {
      const { data } = await dbService.getMachineTransactions(machine.id);
      if (data) {
        setTransactions(data);
        const totalParts = data.reduce((acc, tx) => acc + Math.abs(tx.quantity), 0);
        const uniqueParts = new Set(data.map(tx => tx.part_id)).size;
        const lastMaintenance = data.length > 0 ? data[0].created_at : null;
        setStats(prev => ({ ...prev, totalParts, uniqueParts, lastMaintenance }));
      }
    } catch (error) {
      console.error("Failed to load machine history", error);
    } finally {
      setLoadingTx(false);
    }
  };

  // NEW: Load parts currently linked to this machine
  const loadMachineAssemblies = async () => {
    try {
      // This assumes you have a table that tracks which parts are currently on a machine
      // Options:
      // 1. Query machine_parts (current assembly)
      // 2. Query the latest transaction for each part (to see what's installed)
      // 3. Use a separate machine_assembly table
      
      // For now, we'll calculate from transactions:
      // Group transactions by part_id and only count the most recent state
      const { data } = await dbService.getMachineTransactions(machine.id);
      
      if (data && data.length > 0) {
        // Group by part_id and get the latest transaction for each
        const partsMap = new Map();
        
        // Sort by date descending (newest first)
        const sortedData = [...data].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        sortedData.forEach(tx => {
          if (!partsMap.has(tx.part_id)) {
            // Store the most recent transaction for each part
            partsMap.set(tx.part_id, {
              part_id: tx.part_id,
              part_name: tx.part?.name || 'Unknown',
              quantity: Math.abs(tx.quantity),
              last_date: tx.created_at,
              type: tx.type // 'in' or 'out'
            });
          }
        });
        
        // Filter to only parts that are "in" (installed on machine)
        // If last transaction is 'out', it was removed
        // If last transaction is 'in', it's currently installed
        const currentParts = Array.from(partsMap.values()).filter(p => {
          const lastTx = sortedData.find(tx => tx.part_id === p.part_id);
          return lastTx?.type === 'in' || lastTx?.type === 'maintenance'; // Currently on machine
        });
        
        setMachineAssemblies(currentParts);
        setStats(prev => ({ 
          ...prev, 
          uniquePartsOnMachine: currentParts.length 
        }));
      } else {
        setMachineAssemblies([]);
        setStats(prev => ({ ...prev, uniquePartsOnMachine: 0 }));
      }
    } catch (error) {
      console.error("Failed to load machine assemblies", error);
    }
  };

  const totalMaintenanceCost = transactions.reduce((sum, tx) => {
    const unit = tx.unit_cost || 0;
    return sum + Math.abs(tx.quantity) * unit;
  }, 0);

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setTransactionDetailsOpen(true);
  };

  if (!machine) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl h-screen sm:h-auto sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-teal-600" />
              <div>
                <p className="text-lg sm:text-xl font-bold">{machine.name}</p>
                <p className="text-xs sm:text-sm text-slate-600">{machine.machine_code}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 text-xs sm:text-sm">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="cost">Cost</TabsTrigger>
            </TabsList>

            {/* === OVERVIEW TAB === */}
            <TabsContent value="overview" className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Maintenance Cost */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-teal-600" />
                      Total Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {formatCurrency(totalMaintenanceCost)}
                    </p>
                  </CardContent>
                </Card>

                {/* Parts Replaced */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-teal-600" />
                      Parts Replaced
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {stats.totalParts}
                    </p>
                  </CardContent>
                </Card>

                {/* Unique Items Ever Used */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Box className="h-4 w-4 text-teal-600" />
                      Unique Types Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {stats.uniqueParts}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Different part types</p>
                  </CardContent>
                </Card>

                {/* NEW: Unique Items Currently On Machine */}
                <Card className="border-2 border-teal-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-teal-600" />
                      Current Parts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl sm:text-3xl font-bold text-teal-600">
                      {stats.uniquePartsOnMachine}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Parts on machine now</p>
                  </CardContent>
                </Card>
              </div>

              {/* Last Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    Last Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base font-semibold text-slate-900">
                    {stats.lastMaintenance 
                      ? new Date(stats.lastMaintenance).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'N/A'
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Currently Installed Parts */}
              {machineAssemblies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Wrench className="h-4 w-4 text-teal-600" />
                      Currently Installed Parts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {machineAssemblies.map((part, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-900">
                              {part.part_name}
                            </p>
                            <p className="text-xs text-slate-600">
                              Last updated: {new Date(part.last_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Qty: {part.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Technical Specs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Technical Specs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="text-slate-600 font-medium">Type</p>
                      <p className="font-semibold text-slate-900">{machine.type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">Manufacturer</p>
                      <p className="font-semibold text-slate-900">{machine.manufacturer || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">Production Rate</p>
                      <p className="font-semibold text-slate-900">
                        {machine.production_value_per_min ? `€${machine.production_value_per_min}/min` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">Capacity</p>
                      <p className="font-semibold text-slate-900">{machine.capacity || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* === INFO TAB === */}
            <TabsContent value="info" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Machine Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mb-1">Name</p>
                    <p className="text-sm sm:text-base font-semibold text-slate-900">{machine.name}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mb-1">Code</p>
                    <p className="text-sm sm:text-base font-semibold text-slate-900">{machine.machine_code}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mb-1">Location</p>
                    <p className="text-sm sm:text-base font-semibold text-slate-900">
                      {machine.building?.name} / {machine.warehouse?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mb-1">Status</p>
                    <Badge className="text-xs">
                      {machine.status || 'Unknown'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* === MAINTENANCE TAB === */}
            <TabsContent value="maintenance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Maintenance History</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTx ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : transactions.length === 0 ? (
                    <p className="text-xs sm:text-sm text-slate-600 text-center py-8">
                      No maintenance records found.
                    </p>
                  ) : (
                    <ScrollArea className="w-full h-96">
                      <div className="space-y-2 pr-4">
                        {transactions.map((tx, idx) => {
                          const total = Math.abs(tx.quantity) * (tx.unit_cost || 0);
                          return (
                            <div
                              key={idx}
                              onClick={() => handleTransactionClick(tx)}
                              className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                    {tx.part?.name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    {new Date(tx.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {formatCurrency(total)}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <p className="text-slate-600">Qty</p>
                                  <p className="font-semibold text-slate-900">{Math.abs(tx.quantity)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-600">Unit</p>
                                  <p className="font-semibold text-slate-900">{formatCurrency(tx.unit_cost)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-600">Type</p>
                                  <p className="font-semibold text-slate-900 capitalize">{tx.type}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* === COST TAB === */}
            <TabsContent value="cost" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTx ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : transactions.length === 0 ? (
                    <p className="text-xs sm:text-sm text-slate-600 text-center py-8">
                      No cost records found.
                    </p>
                  ) : (
                    <>
                      <ScrollArea className="w-full h-96 mb-4">
                        <div className="space-y-2 pr-4">
                          {transactions.map((tx, idx) => {
                            const total = Math.abs(tx.quantity) * (tx.unit_cost || 0);
                            return (
                              <div
                                key={idx}
                                onClick={() => handleTransactionClick(tx)}
                                className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                      {tx.part?.name || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                      {new Date(tx.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                  <div>
                                    <p className="text-slate-600">Quantity</p>
                                    <p className="font-semibold text-slate-900">{Math.abs(tx.quantity)}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-600">Unit Cost</p>
                                    <p className="font-semibold text-slate-900">{formatCurrency(tx.unit_cost)}</p>
                                  </div>
                                </div>
                                <div className="pt-2 border-t">
                                  <p className="text-xs text-slate-600">Total</p>
                                  <p className="text-sm font-bold text-teal-600">{formatCurrency(total)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>

                      {transactions.length > 0 && (
                        <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                          <p className="text-xs sm:text-sm text-slate-600 font-medium">Total Maintenance Cost</p>
                          <p className="text-2xl sm:text-3xl font-bold text-teal-600">
                            {formatCurrency(totalMaintenanceCost)}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="pt-4 border-t flex gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              className="flex-1"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          open={transactionDetailsOpen}
          onOpenChange={setTransactionDetailsOpen}
        />
      )}
    </>
  );
};

export default MachineDetailsModal;