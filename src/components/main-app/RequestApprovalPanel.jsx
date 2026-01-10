import React, { useState } from 'react';
import { useRequestsApi } from '@/hooks/useRequestsApi';
import './ApprovalPanelStyles.css';

/**
 * RequestApprovalPanel Component
 * 
 * Handles the approval workflow:
 * - Add approval comments
 * - Approve request (moves to next level)
 * - Reject request (returns to submitter)
 * - Shows approval status
 */
export const RequestApprovalPanel = ({
  request,
  userRole,
  approvalLevel,
  onApprovalComplete,
  onClose
}) => {
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const { approveRequest, rejectRequest } = useRequestsApi();

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await approveRequest(request.id, {
        approval_level: approvalLevel,
        approval_role: userRole,
        approval_comments: comments || null,
        approved_by: userRole
      });

      setSuccess('Request approved successfully! Moving to next level...');
      setTimeout(() => {
        onApprovalComplete && onApprovalComplete();
        onClose && onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to approve request');
      console.error('Approval error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await rejectRequest(request.id, {
        rejection_level: approvalLevel,
        rejection_role: userRole,
        rejection_reason: comments,
        rejected_by: userRole
      });

      setSuccess('Request rejected and returned to submitter');
      setTimeout(() => {
        onApprovalComplete && onApprovalComplete();
        onClose && onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to reject request');
      console.error('Rejection error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="approval-panel">
      {/* Status Messages */}
      {error && <div className="alert alert-error">❌ {error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      {/* Comments Section */}
      <div className="approval-section">
        <label htmlFor="approval-comments">Approval Comments (Optional for Approval, Required for Rejection)</label>
        <textarea
          id="approval-comments"
          className="approval-textarea"
          placeholder="Add any comments or feedback about this request..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          disabled={loading}
          rows={4}
        />
      </div>

      {/* Budget Summary */}
      <div className="approval-section budget-preview">
        <h4>📄 Budget Summary</h4>
        <div className="budget-breakdown">
          <div className="budget-line">
            <span>Items Count:</span>
            <span className="value">{request.items?.length || 0}</span>
          </div>
          <div className="budget-line">
            <span>Total Amount:</span>
            <span className="value strong">${request.total_amount?.toLocaleString()}</span>
          </div>
          {request.quote && (
            <div className="budget-line quoted">
              <span>Supplier Quote:</span>
              <span className="value">${request.quote.total_amount?.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="approval-actions">
        <button
          className="btn btn-success"
          onClick={handleApprove}
          disabled={loading}
          title="Approve this request and move it to the next approval level"
        >
          {loading ? 'Processing...' : '✅ Approve & Move to Next Level'}
        </button>
        <button
          className="btn btn-danger"
          onClick={handleReject}
          disabled={loading}
          title="Reject this request and return it to the submitter"
        >
          {loading ? 'Processing...' : '❌ Reject & Return to Submitter'}
        </button>
      </div>

      {/* Approval Flow Info */}
      <div className="approval-info">
        <p>👁️ <strong>Current Level:</strong> {approvalLevel}</p>
        <p>👨‍💼 <strong>Your Role:</strong> {userRole}</p>
        <p className="info-small">
          ✅ Approving moves request to next approval level
          <br />
          ❌ Rejecting returns request to submitter for revision
        </p>
      </div>
    </div>
  );
};

export default RequestApprovalPanel;