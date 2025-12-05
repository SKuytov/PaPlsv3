'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash from URL
        const hash = window.location.hash;
        
        if (!hash) {
          setError('No authentication data received');
          setLoading(false);
          return;
        }

        // Supabase automatically processes the hash
        // Just wait a moment for it to process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if user is now authenticated
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // Success - redirect to reset password page
          router.push('/reset-password');
        } else {
          setError('Authentication failed');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication error');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router]);

  if (loading) {
    return <LoadingSpinner message="Verifying authentication..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Authentication Error</h1>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <LoadingSpinner message="Processing authentication..." />
    </div>
  );
}
