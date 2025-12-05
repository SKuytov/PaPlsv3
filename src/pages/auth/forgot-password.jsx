'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function ForgotPassword() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    // Validation
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter your email'
      });
      return;
    }

    if (!email.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Invalid Email',
        description: 'Please enter a valid email address'
      });
      return;
    }

    setLoading(true);

    try {
      // Call Supabase to send password reset email
      // THIS IS THE IMPORTANT PART - includes redirectTo
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`
        // ✅ This redirectTo MUST match Supabase Redirect URLs setting
      });

      if (error) throw error;

      // Success - show confirmation message
      setSubmitted(true);

      toast({
        title: 'Success!',
        description: 'Password reset link sent to your email'
      });

    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send reset email'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        
        {/* Header */}
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Mail className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Reset Password</h1>
          </div>
          <p className="text-blue-100 text-sm mt-2">
            Enter your email to receive a password reset link
          </p>
        </CardHeader>

        {/* Content */}
        <CardContent className="pt-6">
          
          {!submitted ? (
            // Form - Before submission
            <form onSubmit={handleForgotPassword} className="space-y-4">
              
              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500">
                  We'll send a password reset link to this email
                </p>
              </div>

              {/* Send Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              {/* Back to Login */}
              <Link href="/login">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>

            </form>
          ) : (
            // Success Message - After submission
            <div className="space-y-4 text-center">
              
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Check Your Email
                </h2>
                <p className="text-slate-600 text-sm mb-1">
                  We've sent a password reset link to:
                </p>
                <p className="text-sm font-medium text-slate-800 mb-4">
                  {email}
                </p>
                <p className="text-xs text-slate-500">
                  The link will expire in 24 hours.
                </p>
              </div>

              {/* Resend Button */}
              <Button
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
                variant="outline"
                className="w-full"
              >
                Try Another Email
              </Button>

              {/* Back to Login */}
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="w-full text-blue-600 hover:text-blue-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>

            </div>
          )}

        </CardContent>

      </Card>
    </div>
  );
}
