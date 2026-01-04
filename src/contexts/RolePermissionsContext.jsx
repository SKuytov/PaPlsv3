import React, { createContext, useState, useCallback } from 'react';

export const RolePermissionsContext = createContext();

export const RolePermissionsProvider = ({ children }) => {
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [assignedBuildings, setAssignedBuildings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  const hasPermission = useCallback((permission) => {
    if (!permissions) return false;
    return permissions.includes(permission);
  }, [permissions]);

  const canRestock = useCallback(() => {
    return hasPermission('restock_inventory');
  }, [hasPermission]);

  const canEditInventory = useCallback(() => {
    return hasPermission('edit_inventory');
  }, [hasPermission]);

  const canViewReports = useCallback(() => {
    return hasPermission('view_reports');
  }, [hasPermission]);

  const canApproveRestock = useCallback(() => {
    return hasPermission('approve_restock');
  }, [hasPermission]);

  const canManageUsers = useCallback(() => {
    return hasPermission('manage_users');
  }, [hasPermission]);

  const isSystemAdmin = useCallback(() => {
    return hasPermission('system_admin');
  }, [hasPermission]);

  const canAccessBuilding = useCallback((buildingId) => {
    if (isSystemAdmin()) return true;
    if (!assignedBuildings || assignedBuildings.length === 0) return false;
    return assignedBuildings.includes(buildingId);
  }, [assignedBuildings, isSystemAdmin]);

  const value = {
    role,
    setRole,
    permissions,
    setPermissions,
    assignedBuildings,
    setAssignedBuildings,
    userProfile,
    setUserProfile,
    hasPermission,
    canRestock,
    canEditInventory,
    canViewReports,
    canApproveRestock,
    canManageUsers,
    isSystemAdmin,
    canAccessBuilding
  };

  return (
    <RolePermissionsContext.Provider value={value}>
      {children}
    </RolePermissionsContext.Provider>
  );
};

export default RolePermissionsProvider;
