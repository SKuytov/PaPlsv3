import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequestsApi } from '@/hooks/useRequestsApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RequestFormModal from './RequestFormModal';
import RequestDetailsModal from './RequestDetailsModal';
import RequestApprovalPanel from './RequestApprovalPanel';
import RequestStatusBadge from './RequestStatusBadge';

/**
 * RequestsTab Component
 * Main interface for the Requests feature in technician dashboard
 * Handles request creation, viewing, and approval workflow
 */
const RequestsTab = ({ technicianInfo, onLogout }) => {
  const { t } = useTranslation();
  const {
    loading,
    error,
    createRequest,
    getMyRequests,
    getPendingApprovals,
    approveRequest,
    rejectRequest,
    getRequestDetails
  } = useRequestsApi();

  const [myRequests, setMyRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Load requests on component mount
  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoadingRequests(true);
    
    // Load user's own requests
    const requests = await getMyRequests();
    if (requests) {
      setMyRequests(requests);
    }

    // Load pending approvals if user is a manager
    if (technicianInfo?.role && technicianInfo.role.includes('Technician')) {
      const approvals = await getPendingApprovals();
      if (approvals) {
        setPendingApprovals(approvals);
      }
    }

    setLoadingRequests(false);
  };

  const handleCreateRequest = async (requestData) => {
    const newRequest = await createRequest(
      requestData.building_id,
      requestData.priority,
      requestData.description,
      requestData.notes
    );

    if (newRequest) {
      setShowFormModal(false);
      await loadRequests();
    }
  };

  const handleViewDetails = async (request) => {
    const details = await getRequestDetails(request.id);
    if (details) {
      setSelectedRequest(details);
      setShowDetailsModal(true);
    }
  };

  const handleApprove = async (requestId, comments, moveToNextLevel) => {
    const result = await approveRequest(requestId, comments, moveToNextLevel);
    if (result) {
      setShowApprovalPanel(false);
      await loadRequests();
    }
  };

  const handleReject = async (requestId, reason) => {
    const result = await rejectRequest(requestId, reason);
    if (result) {
      setShowApprovalPanel(false);
      await loadRequests();
    }
  };

  const pendingCount = pendingApprovals.length;

  return (
    <div className="w-full space-y-6 py-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            📋 {t('requests.title', 'Requests')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('requests.subtitle', 'Manage item requests and approvals')}
          </p>
        </div>
        <Button
          onClick={() => setShowFormModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          ✨ {t('requests.createNew', 'Create New Request')}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="my-requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-requests">
            {t('requests.myRequests', 'My Requests')} ({myRequests.length})
          </TabsTrigger>
          {technicianInfo?.role && technicianInfo.role.includes('Technician') && (
            <TabsTrigger value="pending-approvals">
              {t('requests.pendingApprovals', 'Pending Approvals')}
              {pendingCount > 0 && (
                <span className="ml-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* My Requests Tab */}
        <TabsContent value="my-requests" className="space-y-4">
          {loadingRequests ? (
            <div className="text-center py-8 text-gray-500">
              Loading requests...
            </div>
          ) : myRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <p>{t('requests.noRequests', 'No requests yet')}</p>
                  <Button
                    onClick={() => setShowFormModal(true)}
                    variant="outline"
                    className="mt-4"
                  >
                    Create your first request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            myRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {request.request_number}
                      </CardTitle>
                      <CardDescription>
                        {request.description}
                      </CardDescription>
                    </div>
                    <RequestStatusBadge status={request.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Building:</span>
                      <p className="font-semibold">{request.building_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Priority:</span>
                      <p className="font-semibold">{request.priority}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Budget:</span>
                      <p className="font-semibold">€{request.estimated_budget?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-semibold">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleViewDetails(request)}
                    variant="outline"
                    className="w-full"
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Pending Approvals Tab */}
        {technicianInfo?.role && technicianInfo.role.includes('Technician') && (
          <TabsContent value="pending-approvals" className="space-y-4">
            {loadingRequests ? (
              <div className="text-center py-8 text-gray-500">
                Loading pending approvals...
              </div>
            ) : pendingApprovals.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    {t('requests.noPending', 'No pending approvals')}
                  </div>
                </CardContent>
              </Card>
            ) : (
              pendingApprovals.map((approval) => (
                <Card key={approval.id} className="hover:shadow-lg transition-shadow border-blue-200 border-l-4">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {approval.item_requests?.request_number}
                        </CardTitle>
                        <CardDescription>
                          Submitted by: {approval.item_requests?.submitter_email}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-semibold">
                          Approval Level {approval.approval_level}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Building:</span>
                        <p className="font-semibold">{approval.item_requests?.building_id}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Priority:</span>
                        <p className="font-semibold">{approval.item_requests?.priority}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Budget:</span>
                        <p className="font-semibold">
                          €{approval.item_requests?.estimated_budget?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Description:</span>
                        <p className="font-semibold truncate">
                          {approval.item_requests?.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedRequest(approval.item_requests);
                        setShowApprovalPanel(true);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      Review & Approve
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Modals */}
      {showFormModal && (
        <RequestFormModal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleCreateRequest}
          technicianInfo={technicianInfo}
          isLoading={loading}
        />
      )}

      {showDetailsModal && selectedRequest && (
        <RequestDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          request={selectedRequest}
          onRefresh={loadRequests}
        />
      )}

      {showApprovalPanel && selectedRequest && (
        <RequestApprovalPanel
          isOpen={showApprovalPanel}
          onClose={() => setShowApprovalPanel(false)}
          request={selectedRequest}
          onApprove={handleApprove}
          onReject={handleReject}
          isLoading={loading}
        />
      )}
    </div>
  );
};

export default RequestsTab;
