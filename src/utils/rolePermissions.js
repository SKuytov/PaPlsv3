/**
 * Role Permissions Utility Functions
 * Helper functions for role-based access control
 */

// Role definitions with their default permissions
export const ROLE_DEFINITIONS = {
  'Building 1 Technician': {
    canRestock: true,
    canEditInventory: false,
    canApproveRestock: false,
    permissions: ['view_inventory', 'restock_inventory']
  },
  'Building 2 Technician': {
    canRestock: true,
    canEditInventory: false,
    canApproveRestock: false,
    permissions: ['view_inventory', 'restock_inventory']
  },
  'Building 3/5 Technician': {
    canRestock: true,
    canEditInventory: false,
    canApproveRestock: false,
    permissions: ['view_inventory', 'restock_inventory']
  },
  'Building 4 Technician': {
    canRestock: true,
    canEditInventory: false,
    canApproveRestock: false,
    permissions: ['view_inventory', 'restock_inventory']
  },
  'Maintenance Organizer': {
    canRestock: true,
    canEditInventory: true,
    canApproveRestock: false,
    permissions: ['view_inventory', 'restock_inventory', 'edit_inventory', 'view_reports']
  },
  'Head Technician': {
    canRestock: true,
    canEditInventory: true,
    canApproveRestock: true,
    permissions: ['view_inventory', 'restock_inventory', 'edit_inventory', 'view_reports', 'approve_restock', 'manage_users']
  },
  'Technical Director': {
    canRestock: true,
    canEditInventory: true,
    canApproveRestock: true,
    permissions: ['view_inventory', 'restock_inventory', 'edit_inventory', 'view_reports', 'approve_restock', 'manage_users', 'view_audit_logs']
  },
  'CEO': {
    canRestock: false,
    canEditInventory: false,
    canApproveRestock: false,
    permissions: ['view_reports', 'view_executive_dashboard']
  },
  'God Admin': {
    canRestock: true,
    canEditInventory: true,
    canApproveRestock: true,
    permissions: ['system_admin']
  }
};

/**
 * Extract permissions from role object
 * Supports both database role objects and permission arrays
 */
export const extractPermissions = (role) => {
  if (!role) return [];

  // If role has permissions array
  if (Array.isArray(role.permissions)) {
    return role.permissions;
  }

  // If role has permissions object (from JSONB)
  if (typeof role.permissions === 'object' && role.permissions !== null) {
    return Object.keys(role.permissions).filter(key => role.permissions[key] === true);
  }

  // Fall back to role name lookup
  if (role.name && ROLE_DEFINITIONS[role.name]) {
    return ROLE_DEFINITIONS[role.name].permissions;
  }

  return [];
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (permissions, requiredPermission) => {
  if (!permissions) return false;
  if (Array.isArray(permissions)) {
    return permissions.includes(requiredPermission);
  }
  return false;
};

/**
 * Check if user can restock based on role
 */
export const canRestock = (role) => {
  if (!role) return false;
  const permissions = extractPermissions(role);
  return hasPermission(permissions, 'restock_inventory');
};

/**
 * Check if user can edit inventory
 */
export const canEditInventory = (role) => {
  if (!role) return false;
  const permissions = extractPermissions(role);
  return hasPermission(permissions, 'edit_inventory');
};

/**
 * Check if user can view reports
 */
export const canViewReports = (role) => {
  if (!role) return false;
  const permissions = extractPermissions(role);
  return hasPermission(permissions, 'view_reports');
};

/**
 * Check if user can approve restock
 */
export const canApproveRestock = (role) => {
  if (!role) return false;
  const permissions = extractPermissions(role);
  return hasPermission(permissions, 'approve_restock');
};

/**
 * Check if user is system admin
 */
export const isSystemAdmin = (role) => {
  if (!role) return false;
  const permissions = extractPermissions(role);
  return hasPermission(permissions, 'system_admin');
};

/**
 * Get role display information
 */
export const getRoleDisplayInfo = (roleName) => {
  const roleColors = {
    'Building 1 Technician': { bg: 'bg-blue-500', text: 'text-blue-700', icon: '🔧' },
    'Building 2 Technician': { bg: 'bg-blue-600', text: 'text-blue-800', icon: '🔧' },
    'Building 3/5 Technician': { bg: 'bg-blue-700', text: 'text-blue-900', icon: '🔧' },
    'Building 4 Technician': { bg: 'bg-blue-800', text: 'text-blue-950', icon: '🔧' },
    'Maintenance Organizer': { bg: 'bg-purple-600', text: 'text-purple-700', icon: '📋' },
    'Head Technician': { bg: 'bg-orange-500', text: 'text-orange-700', icon: '👑' },
    'Technical Director': { bg: 'bg-red-600', text: 'text-red-700', icon: '⚡' },
    'CEO': { bg: 'bg-green-600', text: 'text-green-700', icon: '📈' },
    'God Admin': { bg: 'bg-slate-800', text: 'text-slate-100', icon: '🛡️' }
  };

  return roleColors[roleName] || { bg: 'bg-slate-600', text: 'text-slate-700', icon: '👤' };
};

/**
 * Check if building is accessible to user
 */
export const canAccessBuilding = (assignedBuildings, buildingId) => {
  if (!assignedBuildings || assignedBuildings.length === 0) return false;
  return assignedBuildings.includes(buildingId);
};

/**
 * Extract building list from JSONB or array
 */
export const extractBuildingList = (buildingData) => {
  if (!buildingData) return [];
  if (Array.isArray(buildingData)) return buildingData;
  if (typeof buildingData === 'string') return [buildingData];
  return [];
};

export default {
  ROLE_DEFINITIONS,
  extractPermissions,
  hasPermission,
  canRestock,
  canEditInventory,
  canViewReports,
  canApproveRestock,
  isSystemAdmin,
  getRoleDisplayInfo,
  canAccessBuilding,
  extractBuildingList
};
