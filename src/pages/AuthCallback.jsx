import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 AuthCallback: Processing email link...');
        console.log('📍 Current URL:', window.location.href);

        // CRITICAL: Wait for Supabase to process the hash
        // The hash contains the recovery token that Supabase needs to parse
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try to get the session multiple times
        let session = null;
        let attempts = 0;

        while (attempts < 5) {
          console.log(`🔍 AuthCallback: Checking session (attempt ${attempts + 1}/5)`);
          
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('⚠️ Session error:', sessionError);
          }

          if (currentSession) {
            console.log('✅ AuthCallback: Session found!', {
              userId: currentSession.user?.id,
              email: currentSession.user?.email
            });
            session = currentSession;
            break;
          }

          console.log(`⏳ AuthCallback: No session yet, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }

        if (session) {
          console.log('✅ AuthCallback: Redirecting to reset password...');
          // Give React a moment to render
          await new Promise(resolve => setTimeout(resolve, 300));
          navigate('/reset-password', { replace: true });
        } else {
          console.error('❌ AuthCallback: No session after 5 attempts');
          setError('Session could not be established. The recovery link may have expired.');
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ AuthCallback: Unexpected error:', err);
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verifying Your Email</h1>
          <p className="text-slate-300 text-sm">Processing your password recovery link...</p>
          <p className="text-slate-500 text-xs mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Link Expired or Invalid</h1>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/forgot-password', { replace: true })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Request New Link
            </button>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
            >
              Back to Login
            </button>
          </div>

          <p className="text-gray-500 text-xs text-center mt-6">
            Recovery links expire after 24 hours. If your link has expired, please request a new one.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
