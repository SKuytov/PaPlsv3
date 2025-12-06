import React, { useState, useEffect } from 'react';
import {
  X, User, Calendar, FileText, Package, DollarSign, 
  Info, ExternalLink, AlertCircle
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/utils/calculations';
import PartDetailsModal from '@/components/modules/spare-parts/PartDetailsModal';

const TransactionDetailsModal = ({ transaction, open, onOpenChange }) => {
  const [showPartDetails, setShowPartDetails] = useState(false);

  if (!transaction) return null;

  const {
    id,
    created_at,
    quantity,
    unit_cost,
    notes,
    transaction_type,
    part,
    user,
  } = transaction;

  const totalCost = Math.abs(quantity) * (unit_cost || 0);
  const transactionDate = new Date(created_at);
  const formattedDate = transactionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            
            {/* Transaction Header */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Transaction ID</span>
                    <p className="text-sm font-mono text-slate-800">{id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Type</span>
                    <Badge variant={transaction_type === 'usage' ? 'destructive' : 'default'} className="capitalize">
                      {transaction_type}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Date & Time</span>
                    <p className="text-sm text-slate-800">{transactionDate.toLocaleDateString()}</p>
                    <p className="text-xs text-slate-600">{transactionDate.toLocaleTimeString()}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Total Cost</span>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(totalCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Part Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    Part Information
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPartDetails(true)}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full Details
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Part Name</span>
                    <p className="text-sm font-medium text-slate-800">{part?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Part Number</span>
                    <p className="text-sm font-mono text-slate-600">{part?.part_number || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Barcode</span>
                    <p className="text-sm font-mono text-slate-600">{part?.barcode || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Category</span>
                    <p className="text-sm text-slate-800">{part?.category || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quantity & Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                  <span className="font-medium text-slate-700">Quantity</span>
                  <span className="font-bold text-lg">{Math.abs(quantity)} units</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                  <span className="font-medium text-slate-700">Unit Cost</span>
                  <span className="font-bold text-lg">{formatCurrency(unit_cost || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-200">
                  <span className="font-bold text-slate-800">Total Cost</span>
                  <span className="font-bold text-2xl text-blue-600">{formatCurrency(totalCost)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Performed By */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Performed By
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-purple-50 rounded border border-purple-200">
                  <p className="font-semibold text-slate-800">
                    {user?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {formattedDate}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    Notes & Comments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-amber-50 rounded border border-amber-200">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!notes && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-slate-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">No notes provided for this transaction</span>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Part Details Modal */}
      {showPartDetails && part && (
        <PartDetailsModal
          part={part}
          open={showPartDetails}
          onOpenChange={setShowPartDetails}
          onDeleteRequest={() => {}}
          onEditRequest={() => {}}
        />
      )}
    </>
  );
};

export default TransactionDetailsModal;