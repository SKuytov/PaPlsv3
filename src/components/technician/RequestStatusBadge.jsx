import React from 'react';

const statusConfig = {
  'DRAFT': { bg: 'bg-gray-100', text: 'text-gray-800', label: '📝 Draft' },
  'SUBMITTED': { bg: 'bg-blue-100', text: 'text-blue-800', label: '📤 Submitted' },
  'BUILDING_APPROVED': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: '✓ Building Approved' },
  'MAINTENANCE_APPROVED': { bg: 'bg-purple-100', text: 'text-purple-800', label: '✓ Maintenance Approved' },
  'DIRECTOR_APPROVED': { bg: 'bg-violet-100', text: 'text-violet-800', label: '✓ Director Approved' },
  'EXECUTED': { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Executed' },
  'REJECTED': { bg: 'bg-red-100', text: 'text-red-800', label: '✗ Rejected' }
};

/**
 * RequestStatusBadge Component
 * Displays the current status of a request with visual styling
 */
const RequestStatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig['DRAFT'];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default RequestStatusBadge;
