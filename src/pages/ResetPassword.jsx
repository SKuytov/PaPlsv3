import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        // Get token from URL - note: it's "token" not "access_token"
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        console.log('🔍 Recovery link check:', { hasToken: !!token, type });

        if (!token || type !== 'recovery') {
          console.error('❌ Invalid token or type:', { token: !!token, type });
          throw new Error('Invalid or missing recovery token');
        }

        console.log('✅ Recovery token found, ready to reset password');
        setHasValidToken(true);

      } catch (error) {
        console.error('❌ Token verification failed:', error);
        toast({
          variant: 'destructive',
          title: 'Invalid Link',
          description: 'This password reset link is invalid or expired. Please request a new one.'
        });
        setTimeout(() => navigate('/forgot-password', { replace: true }), 3000);
      } finally {
        setVerifying(false);
      }
    };

    verifyAccess();
  }, [searchParams, navigate, toast]);

  const calculatePasswordStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 12.5;
    if (/[!@#$%^&*]/.test(pwd)) strength += 12.5;
    return Math.min(strength, 100);
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please enter both passwords'
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords Do Not Match',
        description: 'Please check your passwords'
      });
      return;
    }

    if (password.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Weak Password',
        description: 'Password must be at least 8 characters'
      });
      return;
    }

    setLoading(true);

    try {
      const token = searchParams.get('token');
      
      console.log('🔄 Resetting password with token...');

      // For recovery flow, we need to use resetPasswordForEmail with the token
      // OR use the token to authenticate and then updateUser
      // The simplest is to just call updateUser() with the recovery token in context
      
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) {
        console.error('❌ Password update error:', error);
        throw error;
      }

      console.log('✅ Password updated successfully!');

      toast({
        title: 'Success! 🎉',
        description: 'Your password has been reset. Redirecting to login...'
      });

      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);

    } catch (error) {
      console.error('❌ Error:', error.message);
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update password. Link may have expired.'
      });
      
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white font-medium">Verifying reset link...</p>
          <p className="text-slate-400 text-sm mt-2">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!hasValidToken) {
    return null;
  }

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordValid = password.length >= 8;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <h1 className="text-2xl font-bold">Set New Password</h1>
          <p className="text-blue-100 text-sm mt-2">Enter a strong password</p>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {password && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Strength</span>
                    <span className={`font-semibold ${
                      passwordStrength < 50 ? 'text-red-600' :
                      passwordStrength < 75 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength < 50 ? 'Weak' :
                       passwordStrength < 75 ? 'Fair' :
                       'Strong'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        passwordStrength < 50 ? 'bg-red-500' :
                        passwordStrength < 75 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>

                  <div className="space-y-1 mt-2 text-xs">
                    <div className={`flex items-center gap-2 ${password.length >= 8 ? 'text-green-600' : 'text-slate-500'}`}>
                      {password.length >= 8 ? <Check size={14} /> : <X size={14} />}
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[a-z]/.test(password) && /[A-Z]/.test(password) ? 'text-green-600' : 'text-slate-500'}`}>
                      {/[a-z]/.test(password) && /[A-Z]/.test(password) ? <Check size={14} /> : <X size={14} />}
                      <span>Upper and lowercase</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-green-600' : 'text-slate-500'}`}>
                      {/[0-9]/.test(password) ? <Check size={14} /> : <X size={14} />}
                      <span>Number</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex="-1"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {confirmPassword && (
                <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordsMatch ? <Check size={16} /> : <X size={16} />}
                  <span>{passwordsMatch ? 'Match' : 'Do not match'}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !passwordValid || !passwordsMatch}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/login', { replace: true })}
              disabled={loading}
              className="w-full"
            >
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
