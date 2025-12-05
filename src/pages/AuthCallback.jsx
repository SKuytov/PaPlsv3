import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Let Supabase process the URL hash automatically
        // Just check if we have a session after a small delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to retrieve session');
          setLoading(false);
          return;
        }

        if (session) {
          console.log('✅ Session found, user authenticated');
          // Success - redirect to reset password page
          navigate('/reset-password', { replace: true });
        } else {
          console.log('❌ No session found');
          setError('Authentication failed - no session');
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication error');
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Verifying your authentication...</p>
          <p className="text-slate-400 text-sm mt-2">Please wait...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-800 mb-4">❌ Authentication Error</h1>
          <p className="text-red-700 mb-2">{error}</p>
          <p className="text-red-600 text-sm mb-6">
            The recovery link may have expired. Please request a new one.
          </p>
          <button
            onClick={() => navigate('/forgot-password', { replace: true })}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mb-2"
          >
            Try Another Email
          </button>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
}
