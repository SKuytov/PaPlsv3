import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import RequestStatusBadge from './RequestStatusBadge';

const RequestApprovalPanel = ({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
  isLoading = false
}) => {
  const [action, setAction] = useState(null); // 'approve' or 'reject'
  const [comments, setComments] = useState('');
  const [moveToNext, setMoveToNext] = useState(true);

  if (!request) return null;

  const totalBudget = request.items?.reduce((sum, item) => {
    return sum + (item.quantity * item.estimated_unit_price);
  }, 0) || 0;

  const handleApprove = async () => {
    await onApprove(request.id, comments, moveToNext);
    resetForm();
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    await onReject(request.id, comments);
    resetForm();
  };

  const resetForm = () => {
    setAction(null);
    setComments('');
    setMoveToNext(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start w-full">
            <div>
              <DialogTitle>{request.request_number}</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">From: {request.submitter_email}</p>
            </div>
            <RequestStatusBadge status={request.status} />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500">Building</label>
                <p className="font-semibold text-lg">{request.building_id}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Priority</label>
                <p className="font-semibold text-lg">{request.priority}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Description</label>
                <p className="font-semibold">{request.description}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Estimated Budget</label>
                <p className="font-semibold text-green-600 text-lg">€{totalBudget.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <div>
            <h3 className="font-semibold mb-3">Items ({request.items?.length || 0})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {request.items?.map((item) => (
                <Card key={item.id} className="border-gray-200">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Item</p>
                        <p className="font-semibold">{item.item_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Quantity</p>
                        <p className="font-semibold">{item.quantity} {item.unit}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Unit Price</p>
                        <p className="font-semibold">€{item.estimated_unit_price?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total</p>
                        <p className="font-semibold text-green-600">
                          €{(item.quantity * item.estimated_unit_price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Selection */}
          {!action ? (
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setAction('approve')}
                className="bg-green-600 hover:bg-green-700 text-white h-16 text-lg"
              >
                ✓ Approve Request
              </Button>
              <Button
                onClick={() => setAction('reject')}
                variant="destructive"
                className="h-16 text-lg"
              >
                ✗ Reject Request
              </Button>
            </div>
          ) : (
            <Card className={action === 'approve' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardHeader>
                <CardTitle className="text-base">
                  {action === 'approve' ? '✓ Approve Request' : '✗ Reject Request'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {action === 'approve' ? 'Approval Comments' : 'Rejection Reason'} *
                  </label>
                  <Textarea
                    placeholder={action === 'approve'
                      ? 'Add comments or notes...',
                      : 'Please explain why you are rejecting this request...'
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="h-24"
                  />
                </div>

                {action === 'approve' && (
                  <div className="flex items-center space-x-2 border-t pt-4">
                    <Checkbox
                      id="move-next"
                      checked={moveToNext}
                      onCheckedChange={setMoveToNext}
                    />
                    <label htmlFor="move-next" className="text-sm cursor-pointer">
                      Move to next approval level
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          {action && (
            <Button
              onClick={() => setAction(null)}
              variant="outline"
              disabled={isLoading}
            >
              Back
            </Button>
          )}

          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isLoading}
          >
            Close
          </Button>

          {action === 'approve' && (
            <Button
              onClick={handleApprove}
              disabled={isLoading || !comments.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Processing...' : '✓ Approve'}
            </Button>
          )}

          {action === 'reject' && (
            <Button
              onClick={handleReject}
              disabled={isLoading || !comments.trim()}
              variant="destructive"
            >
              {isLoading ? 'Processing...' : '✗ Reject'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestApprovalPanel;
