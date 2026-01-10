import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRequestsApi } from '@/hooks/useRequestsApi';
import RequestStatusBadge from './RequestStatusBadge';

const RequestDetailsModal = ({
  isOpen,
  onClose,
  request,
  onRefresh
}) => {
  const { getActivityLog, loading } = useRequestsApi();
  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (isOpen && request?.id) {
      loadActivity();
    }
  }, [isOpen, request?.id]);

  const loadActivity = async () => {
    setLoadingActivity(true);
    const activityData = await getActivityLog(request.id);
    if (activityData) {
      setActivity(activityData);
    }
    setLoadingActivity(false);
  };

  if (!request) return null;

  const totalItemsCost = request.items?.reduce((sum, item) => {
    return sum + (item.quantity * item.estimated_unit_price);
  }, 0) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start w-full">
            <div>
              <DialogTitle>{request.request_number}</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Submitted by: {request.submitter_email}</p>
            </div>
            <RequestStatusBadge status={request.status} />
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="items">Items ({request.items?.length || 0})</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Request Information</CardTitle>
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
                  <label className="text-sm text-gray-500">Created</label>
                  <p className="font-semibold">{new Date(request.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Status</label>
                  <p className="font-semibold">{request.status}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{request.description || 'N/A'}</p>
              </CardContent>
            </Card>

            {request.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{request.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4 mt-4">
            {request.items && request.items.length > 0 ? (
              <>
                {request.items.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-sm text-gray-500">Item Name</label>
                          <p className="font-semibold">{item.item_name}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Quantity</label>
                          <p className="font-semibold">{item.quantity} {item.unit}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Unit Price</label>
                          <p className="font-semibold">€{item.estimated_unit_price?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Total</label>
                          <p className="font-semibold text-green-600">
                            €{(item.quantity * item.estimated_unit_price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {item.specs && (
                        <div className="border-t pt-4">
                          <label className="text-sm text-gray-500">Specifications</label>
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {JSON.stringify(item.specs, null, 2)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">Total Budget:</span>
                      <span className="text-2xl font-bold text-green-700">
                        €{totalItemsCost.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  No items added yet
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="space-y-4 mt-4">
            {request.approvals && request.approvals.length > 0 ? (
              request.approvals.map((approval) => (
                <Card key={approval.id} className={approval.status === 'APPROVED' ? 'border-green-200' : 'border-yellow-200'}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">Level</label>
                        <p className="font-semibold">{approval.approval_role}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Status</label>
                        <p className={`font-semibold ${
                          approval.status === 'APPROVED'
                            ? 'text-green-600'
                            : approval.status === 'REJECTED'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}>
                          {approval.status}
                        </p>
                      </div>
                    </div>
                    {approval.approver_email && (
                      <div>
                        <label className="text-sm text-gray-500">Approver</label>
                        <p className="font-semibold">{approval.approver_email}</p>
                      </div>
                    )}
                    {approval.approval_date && (
                      <div>
                        <label className="text-sm text-gray-500">Approval Date</label>
                        <p className="font-semibold">{new Date(approval.approval_date).toLocaleString()}</p>
                      </div>
                    )}
                    {approval.comments && (
                      <div className="border-t pt-3">
                        <label className="text-sm text-gray-500">Comments</label>
                        <p className="text-gray-700">{approval.comments}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  No approvals yet
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDetailsModal;
