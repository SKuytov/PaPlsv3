import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 AuthCallback: Page loaded');
        console.log('📍 URL:', window.location.href);

        // Wait for Supabase to process the hash
        // The onAuthStateChange listener should pick it up automatically
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }

        console.log('Session check:', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        });

        if (session && session.user) {
          console.log('✅ Session found! User:', session.user.email);
          setHasSession(true);
          setLoading(false);
          
          // Give a moment for the session to propagate
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('🚀 Redirecting to reset password...');
          navigate('/reset-password', { replace: true });
        } else {
          console.warn('❌ No session found');
          
          // Try one more time with longer delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          
          if (retrySession && retrySession.user) {
            console.log('✅ Session found on retry!');
            setHasSession(true);
            setLoading(false);
            await new Promise(resolve => setTimeout(resolve, 500));
            navigate('/reset-password', { replace: true });
          } else {
            console.error('❌ Still no session after retry');
            setError('Could not establish session. The recovery link may have expired or is invalid.');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('❌ AuthCallback error:', err);
        setError(err.message || 'An unexpected error occurred');
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verifying Your Email</h1>
          <p className="text-slate-300">Processing your password recovery link...</p>
          <p className="text-slate-500 text-xs mt-3">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">Link Invalid or Expired</h1>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/forgot-password', { replace: true })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              Request New Recovery Link
            </button>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              Back to Login
            </button>
          </div>

          <p className="text-gray-500 text-xs text-center mt-6 border-t pt-4">
            Recovery links expire after 24 hours. If your link has expired, please request a new one from the login page.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
