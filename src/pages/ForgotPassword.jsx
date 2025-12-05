import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth-callback`
        // IMPORTANT: Must match Supabase Redirect URLs setting
      });

      if (error) throw error;

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
        
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Mail className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Reset Password</h1>
          </div>
          <p className="text-blue-100 text-sm mt-2">
            Enter your email to receive a password reset link
          </p>
        </CardHeader>

        <CardContent className="pt-6">
          
          {!submitted ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <Link to="/login">
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

              <Link to="/login">
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
