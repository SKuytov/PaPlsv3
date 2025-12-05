import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Verify session exists
  useEffect(() => {
    const verifySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.warn('⚠️ No session found');
          toast({
            variant: 'destructive',
            title: 'Session Expired',
            description: 'Please request a new recovery link'
          });
          
          setTimeout(() => {
            navigate('/forgot-password', { replace: true });
          }, 1500);
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        navigate('/login', { replace: true });
      } finally {
        setIsCheckingAuth(false);
      }
    };

    verifySession();
  }, [navigate, toast]);

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
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Password updated. Redirecting to login...'
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);

    } catch (error) {
      console.error('Password update error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update password'
      });
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Verifying session...</p>
        </div>
      </div>
    );
  }

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordValid = password.length >= 8;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-blue-100 text-sm mt-2">Enter a new secure password</p>
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
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
              {loading ? 'Updating...' : 'Update Password'}
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
