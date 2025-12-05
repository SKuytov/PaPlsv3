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
        console.log('🔄 AuthCallback: Processing recovery link...');

        // Wait for onAuthStateChange to process the hash
        // This is crucial - Supabase needs time to parse the recovery token
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if session was created by the listener
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          console.log('✅ Session created! User:', session.user.email);
          setLoading(false);
          
          // Small delay to ensure state propagates
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Redirect to reset password
          navigate('/reset-password', { replace: true });
        } else {
          console.error('❌ No session found');
          
          // Try once more after longer delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          
          if (retrySession?.user) {
            console.log('✅ Session found on retry');
            setLoading(false);
            await new Promise(resolve => setTimeout(resolve, 500));
            navigate('/reset-password', { replace: true });
          } else {
            setError('Recovery link invalid or expired. Please request a new one.');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('❌ AuthCallback error:', err);
        setError(err.message || 'Authentication error');
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
          <p className="text-slate-300">Processing your recovery link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
            Invalid Link
          </h1>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/forgot-password', { replace: true })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              Request New Link
            </button>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 px-4 rounded-lg transition"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
