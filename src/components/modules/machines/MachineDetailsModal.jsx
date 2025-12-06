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
  const [loadingTx, setLoadingTx] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetailsOpen, setTransactionDetailsOpen] = useState(false);
  const [stats, setStats] = useState({
    totalParts: 0,
    uniqueParts: 0,
    lastMaintenance: null
  });

  useEffect(() => {
    if (open && machine?.id) {
      loadTransactions();
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
        setStats({ totalParts, uniqueParts, lastMaintenance });
      }
    } catch (error) {
      console.error("Failed to load machine history", error);
    } finally {
      setLoadingTx(false);
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
        <DialogContent className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl h-screen sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col p-3 sm:p-6 rounded-lg sm:rounded-2xl">
          <DialogHeader className="pb-3 sm:pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <DialogTitle className="text-lg sm:text-2xl">{machine.name}</DialogTitle>
                <p className="text-xs sm:text-sm text-slate-600 font-mono">{machine.machine_code}</p>
              </div>
              <Badge className="w-fit">{machine.building?.name || 'N/A'}</Badge>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">
                <Activity className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="costs" className="text-xs sm:text-sm">
                <DollarSign className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Maintenance</span>
                <span className="sm:hidden">Cost</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto space-y-3 sm:space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Total Maintenance Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {formatCurrency(totalMaintenanceCost)}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">Parts Replaced</p>
                    <p className="text-lg sm:text-2xl font-bold">{stats.totalParts}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">Unique Items</p>
                    <p className="text-lg sm:text-2xl font-bold">{stats.uniqueParts}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">Last Activity</p>
                    <p className="text-xs sm:text-sm font-bold">
                      {stats.lastMaintenance ? new Date(stats.lastMaintenance).toLocaleDateString() : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Technical Specs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600 font-medium text-xs">Type</p>
                      <p className="font-semibold">{machine.type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium text-xs">Manufacturer</p>
                      <p className="font-semibold">{machine.manufacturer || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium text-xs">Production Rate</p>
                      <p className="font-semibold">{machine.production_value_per_min ? `€${machine.production_value_per_min}/min` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium text-xs">Capacity</p>
                      <p className="font-semibold">{machine.capacity || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Maintenance Cost Tab */}
            <TabsContent value="costs" className="flex-1 flex flex-col overflow-hidden">
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base sm:text-lg">Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-3 sm:p-6">
                  {loadingTx ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : transactions.length === 0 ? (
                    <p className="text-sm text-slate-600 text-center py-8">No maintenance records found.</p>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map(tx => {
                        const total = Math.abs(tx.quantity) * (tx.unit_cost || 0);
                        return (
                          <div
                            key={tx.id}
                            onClick={() => handleTransactionClick(tx)}
                            className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer transition-colors"
                          >
                            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mb-2">
                              <div>
                                <p className="text-slate-600 font-medium">Date</p>
                                <p className="font-semibold">{new Date(tx.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-slate-600 font-medium">Total</p>
                                <p className="font-semibold">{formatCurrency(total)}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                              <div>
                                <p className="text-slate-600">Part</p>
                                <p className="font-semibold line-clamp-1">{tx.part?.name || 'Unknown'}</p>
                              </div>
                              <div>
                                <p className="text-slate-600">Qty</p>
                                <p className="font-semibold">{Math.abs(tx.quantity)}</p>
                              </div>
                              <div>
                                <p className="text-slate-600">Unit Cost</p>
                                <p className="font-semibold">{formatCurrency(tx.unit_cost)}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTransactionClick(tx);
                              }}
                              className="w-full text-xs h-7"
                            >
                              View Details
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {transactions.length > 0 && (
                <div className="mt-4 p-3 sm:p-4 bg-slate-100 rounded-lg">
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">Total Maintenance Cost:</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">
                    {formatCurrency(totalMaintenanceCost)}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="flex gap-2 pt-4 border-t mt-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
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