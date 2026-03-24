import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // If redirected from a protected route, preserve the intend location
  const from = location.state?.from?.pathname || '/dashboard';

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await login(data.email, data.password);
      if (authError) throw authError;
      
      // Navigate to intended page or dashboard
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error: authError } = await loginWithGoogle();
      if (authError) throw authError;
    } catch (err) {
      setError(err.message || 'Failed to login with Google');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-dark-bg' : 'bg-light-bg'}`}>
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-24">
        <div className={`w-full max-w-md p-8 sm:p-10 rounded-3xl glass-card shadow-2xl`}>
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold mb-2 tracking-tight ${isDark ? 'text-white' : 'text-light-text'}`}>
              Welcome <span className="gradient-text">Back</span>
            </h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Log in to track your scores and see the latest draw.
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border font-medium transition-all hover:-translate-y-0.5 ${
              isDark
                ? 'bg-dark-surface border-dark-border text-white hover:bg-dark-hover shadow-lg shadow-black/20'
                : 'bg-white border-light-border text-light-text hover:bg-light-hover shadow-sm'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative my-8">
            <div className={`absolute inset-0 flex items-center`}>
              <div className={`w-full border-t ${isDark ? 'border-dark-border' : 'border-light-border'}`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-4 ${isDark ? 'bg-dark-card text-gray-500' : 'bg-white text-light-subtext'}`}>
                Or continue with email
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                      : 'bg-white border-light-border text-light-text fill-white focus:border-brand-500'
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-light-text'}`}>
                  Password
                </label>
                <Link
                  to="/reset-password"
                  className="text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                </div>
                <input
                  type="password"
                  {...register('password', { required: 'Password is required' })}
                  className={`block w-full pl-10 pr-3 py-3 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none ${
                    isDark
                      ? 'bg-dark-surface border-dark-border text-white focus:border-brand-500'
                      : 'bg-white border-light-border text-light-text focus:border-brand-500'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex justify-center py-3.5 mt-2"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Log In'
              )}
            </button>
          </form>

          <p className={`mt-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-brand-500 hover:text-brand-400 transition-colors">
              Sign up today <ArrowRight size={14} className="inline ml-0.5 -mt-0.5" />
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
