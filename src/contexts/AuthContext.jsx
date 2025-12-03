import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, dbService } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  // Helper to ensure user profile exists
  const ensureUserProfile = async (authSessionUser) => {
    let { data: userData } = await dbService.getUserWithRole(authSessionUser.id);
    
    if (!userData) {
      // Profile missing - attempt to create it on the fly
      console.log("Profile missing for user, creating default profile...");
      try {
        await dbService.createProfile({
          id: authSessionUser.id,
          email: authSessionUser.email,
          full_name: authSessionUser.user_metadata?.full_name || authSessionUser.email.split('@')[0],
          password_hash: 'managed_by_supabase_auth', // Placeholder required by schema constraint
          role_id: null, // Default to no role until assigned
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Retry fetching the user with role after creation
        const result = await dbService.getUserWithRole(authSessionUser.id);
        userData = result.data;
      } catch (err) {
        console.error("Failed to create user profile:", err);
      }
    }
    return userData;
  };

  const checkUser = async () => {
    try {
      const session = await authService.getSession();
      if (session?.user) {
        const userData = await ensureUserProfile(session.user);
        setUser(userData);
        setUserRole(userData?.role);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await authService.signIn(email, password);
      if (error) throw error;
      
      if (data?.user) {
        const userData = await ensureUserProfile(data.user);
        
        setUser(userData);
        setUserRole(userData?.role);
        toast({
          title: "Welcome back!",
          description: `Logged in as ${userData?.full_name || email}`,
        });
        return { success: true };
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
      return { success: false, error };
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setUserRole(null);
      toast({
        title: "Signed out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const hasPermission = (permission) => {
    if (!userRole?.permissions) return false;
    if (userRole.permissions.all) return true;
    return userRole.permissions[permission] === true;
  };

  const canAccessBuilding = (buildingId) => {
    if (!userRole?.permissions) return false;
    if (userRole.permissions.all || userRole.permissions.view_all) return true;
    
    const allowedBuilding = userRole.permissions.building;
    if (Array.isArray(allowedBuilding)) {
      return allowedBuilding.includes(buildingId);
    }
    return allowedBuilding === buildingId;
  };

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      loading,
      signIn,
      signOut,
      hasPermission,
      canAccessBuilding
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};