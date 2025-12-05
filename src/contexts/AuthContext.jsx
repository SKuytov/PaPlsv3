import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        if (session?.user) {
          // Fetch user role if needed
          // You might need to adjust this based on your DB structure
          const { data } = await supabase
            .from('users')
            .select('role:roles(id, name)')
            .eq('id', session.user.id)
            .single();
          
          if (data?.role) setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // CRITICAL: Listen for auth changes
    // This processes the recovery token from email links automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        console.log('📊 Session:', session?.user?.email);
        
        setUser(session?.user || null);
        
        if (session?.user) {
          // Fetch user role
          try {
            const { data } = await supabase
              .from('users')
              .select('role:roles(id, name)')
              .eq('id', session.user.id)
              .single();
            
            if (data?.role) setUserRole(data.role);
          } catch (error) {
            console.error('Error fetching user role:', error);
          }
        } else {
          setUserRole(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
