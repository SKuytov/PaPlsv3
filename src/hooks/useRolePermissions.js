import { useContext } from 'react';
import { RolePermissionsContext } from '@/contexts/RolePermissionsContext';

export const useRolePermissions = () => {
  const context = useContext(RolePermissionsContext);
  if (!context) {
    throw new Error('useRolePermissions must be used within RolePermissionsProvider');
  }
  return context;
};

export default useRolePermissions;
