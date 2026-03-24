import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Mail, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function ResetPassword() {
  const { resetPassword, updatePassword } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState('request'); // 'request' | 'update' | 'success'
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  // Check if we arrived here via an email link (URL fragment typically contains access_token)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setMode('update');
    }
  }, []);

  const onRequestSubmit = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await resetPassword(data.email);
      if (error) throw error;
      setMode('success');
    } catch (err) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  const onUpdateSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { error } = await updatePassword(data.password);
      if (error) throw error;
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-dark-bg' : 'bg-light-bg'}`}>
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-24">
        <div className={`w-full max-w-md p-8 sm:p-10 rounded-3xl glass-card shadow-2xl`}>
          
          <Link to="/login" className={`inline-flex items-center gap-1.5 text-sm font-medium mb-8 transition-colors ${
            isDark ? 'text-gray-400 hover:text-white' : 'text-light-subtext hover:text-light-text'
          }`}>
            <ArrowLeft size={16} /> Back to login
          </Link>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {mode === 'request' && (
            <>
              <div className="mb-8">
                <h1 className={`text-2xl font-bold mb-2 tracking-tight ${isDark ? 'text-white' : 'text-light-text'}`}>
                  Reset Password
                </h1>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit(onRequestSubmit)} className="space-y-5">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-light-text'}`}>
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={18} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                    </div>
                    <input
                      type="email"
                      {...register('email', { required: 'Email is required' })}
                      className={`block w-full pl-10 pr-3 py-3 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none ${
                        isDark
                          ? 'bg-dark-surface border-dark-border text-white focus:border-brand-500'
                          : 'bg-white border-light-border text-light-text focus:border-brand-500'
                      }`}
                      placeholder="you@example.com"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary flex justify-center py-3.5"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          )}

          {mode === 'update' && (
            <>
              <div className="mb-8">
                <h1 className={`text-2xl font-bold mb-2 tracking-tight ${isDark ? 'text-white' : 'text-light-text'}`}>
                  Create New Password
                </h1>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                  Please enter your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-5">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-light-text'}`}>
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={18} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                    </div>
                    <input
                      type="password"
                      {...register('password', { 
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Must be at least 8 characters' }
                      })}
                      className={`block w-full pl-10 pr-3 py-3 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none ${
                        isDark ? 'bg-dark-surface border-dark-border text-white focus:border-brand-500' : 'bg-white border-light-border text-light-text focus:border-brand-500'
                      }`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-light-text'}`}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={18} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                    </div>
                    <input
                      type="password"
                      {...register('confirmPassword', { required: 'Please confirm password' })}
                      className={`block w-full pl-10 pr-3 py-3 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none ${
                        isDark ? 'bg-dark-surface border-dark-border text-white focus:border-brand-500' : 'bg-white border-light-border text-light-text focus:border-brand-500'
                      }`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary flex justify-center py-3.5"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Update Password'
                  )}
                </button>
              </form>
            </>
          )}

          {mode === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-brand-500" />
              </div>
              <h1 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-light-text'}`}>
                Check Your Email
              </h1>
              <p className={`text-sm leading-relaxed mb-8 ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                We've sent password reset instructions to your email address. Please check your inbox and spam folder.
              </p>
              <button
                onClick={() => setMode('request')}
                className={`text-sm font-semibold transition-colors ${
                  isDark ? 'text-gray-400 hover:text-white' : 'text-light-subtext hover:text-light-text'
                }`}
              >
                Didn't receive it? Try again
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
