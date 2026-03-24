import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, logout, user, session } = useAuth();
  const navigate = useNavigate();

  // If already logged in as admin, redirect immediately
  useEffect(() => {
    if (session && user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
    if (session && user && user.role !== 'admin') {
      setError('This account does not have admin access.');
      setLoading(false);
      logout();
    }
  }, [session, user, navigate, logout]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: loginError } = await login(email, password);
      
      if (loginError) throw loginError;

      // The AuthContext will fetch the profile, so we wait or depend on the useEffect above
      // But we can add a manual check here if needed.
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center p-4">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo/Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-2xl shadow-brand-500/20 mb-6 border border-white/10">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">
            Admin <span className="text-brand-500">Portal</span>
          </h1>
          <p className="text-gray-400 text-sm font-medium tracking-wide uppercase opacity-60"> Restricted Access Layer </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 bg-white/5 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-500 transition-colors" size={20} />
                <input
                  required
                  type="email"
                  placeholder="Admin Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/20 border border-white/5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-600 font-medium"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-500 transition-colors" size={20} />
                <input
                  required
                  type="password"
                  placeholder="Secret Key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/20 border border-white/5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-600 font-medium"
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full btn-primary !py-5 flex items-center justify-center gap-3 text-lg font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  Authenticate <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => navigate('/')} 
              className="text-xs text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest"
            >
              Return to Public Site
            </button>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-10 flex items-center justify-center gap-6 opacity-30 grayscale">
           <div className="text-[10px] font-bold uppercase tracking-[0.2em]">Verified SSL</div>
           <div className="text-[10px] font-bold uppercase tracking-[0.2em]">End-to-End Encrypted</div>
           <div className="text-[10px] font-bold uppercase tracking-[0.2em]">Authorized Personnel Only</div>
        </div>
      </div>
    </div>
  );
}
