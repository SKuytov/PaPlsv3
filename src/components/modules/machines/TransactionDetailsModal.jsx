import React, { useState } from 'react';
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-2xl sm:max-w-3xl h-screen sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col p-3 sm:p-6 rounded-lg sm:rounded-2xl">
          <DialogHeader className="pb-3 sm:pb-4 border-b">
            <DialogTitle className="text-lg sm:text-2xl">Transaction Details</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 py-3 sm:py-4">
            {/* Transaction Header */}
            <Card>
              <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-slate-600 font-medium mb-1">Transaction ID</p>
                  <p className="font-mono font-semibold">{id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium mb-1">Type</p>
                  <Badge variant="outline">{transaction_type}</Badge>
                </div>
                <div>
                  <p className="text-slate-600 font-medium mb-1">Date</p>
                  <p className="font-semibold">{transactionDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium mb-1">Total Cost</p>
                  <p className="font-bold text-lg">{formatCurrency(totalCost)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Part Information */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Part Information</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPartDetails(true)}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Full
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                <div>
                  <p className="text-slate-600 font-medium mb-1">Part Name</p>
                  <p className="font-semibold">{part?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium mb-1">Part Number</p>
                  <p className="font-mono font-semibold">{part?.part_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium mb-1">Barcode</p>
                  <p className="font-mono font-semibold text-xs">{part?.barcode || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium mb-1">Category</p>
                  <p className="font-semibold">{part?.category || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between font-semibold p-2 bg-slate-50 rounded">
                  <span>Quantity</span>
                  <span>{Math.abs(quantity)} units</span>
                </div>
                <div className="flex justify-between font-semibold p-2 bg-slate-50 rounded">
                  <span>Unit Cost</span>
                  <span>{formatCurrency(unit_cost || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold p-2 bg-blue-50 rounded text-blue-900">
                  <span>Total Cost</span>
                  <span>{formatCurrency(totalCost)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Performed By */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Performed By</CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm">
                <p className="font-semibold">{user?.full_name || 'Unknown User'}</p>
                <p className="text-slate-600 text-xs">
                  {transactionDate.toLocaleDateString()} at {transactionDate.toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>

            {/* Notes */}
            {notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Notes & Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">{notes}</p>
                </CardContent>
              </Card>
            )}

            {!notes && (
              <Card className="bg-slate-50">
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-slate-600">No notes provided for this transaction</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-4 border-t">
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

      {showPartDetails && part && (
        <PartDetailsModal
          part={part}
          open={showPartDetails}
          onOpenChange={setShowPartDetails}
          onEditRequest={() => {}}
        />
      )}
    </>
  );
};

export default TransactionDetailsModal;