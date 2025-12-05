import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setUser(session?.user || null);
          
          if (session?.user) {
            try {
              const { data } = await supabase
                .from('users')
                .select('role:roles(id, name)')
                .eq('id', session.user.id)
                .single();
              
              if (data?.role) setUserRole(data.role);
            } catch (roleError) {
              console.warn('Could not fetch user role:', roleError);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // CRITICAL: Listen for auth state changes
    // This is what processes recovery tokens from email links
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth event:', event);
        
        if (!mounted) return;

        // Update user
        setUser(session?.user || null);

        // Fetch role if user exists
        if (session?.user) {
          try {
            const { data } = await supabase
              .from('users')
              .select('role:roles(id, name)')
              .eq('id', session.user.id)
              .single();
            
            if (mounted && data?.role) {
              setUserRole(data.role);
            }
          } catch (roleError) {
            console.warn('Error fetching role:', roleError);
            if (mounted) setUserRole(null);
          }
        } else {
          if (mounted) setUserRole(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, userRole, signIn }}>
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
