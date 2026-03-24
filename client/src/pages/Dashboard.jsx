import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { 
  Heart, 
  Trophy, 
  CreditCard, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Ticket, 
  TrendingUp 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useScores } from '../hooks/useScores';
import { useEffect } from 'react';
import ScoreEntry from '../components/ScoreEntry';
import ScoreList from '../components/ScoreList';

export default function Dashboard() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  
  // Placeholder specific variables since actual DB integrations aren't fully present yet
  const charityPercentage = user?.charity_percentage || 10;
  
  const { 
    scores, 
    loading: scoresLoading, 
    fetchScores, 
    addScore, 
    editScore, 
    deleteScore 
  } = useScores();

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const drawTickets = scores.length === 5 ? 1 : 0;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-light-text'}`}>
      <Navbar variant="dashboard" />
      
      <main className="container-max px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">
              Welcome back, <span className="gradient-text">{user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Golfer'}</span>
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Here is your impact summary for this month.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              user?.subscription_status === 'active' 
                ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
            }`}>
              {user?.subscription_status === 'active' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
              {user?.subscription_status === 'active' ? 'Active Supporter' : 'Pending Reactivation'}
            </span>
          </div>
        </div>

        {/* Impact Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Monthly Sub */}
          <div className={`glass-card p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${isDark ? 'text-gray-300' : 'text-light-subtext'}`}>Monthly Tier</h3>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                <CreditCard size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">$25</span>
              <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>/mo</span>
            </div>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Billed securely via Stripe
            </p>
          </div>

          {/* Charity Allocation */}
          <div className={`glass-card p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${isDark ? 'text-gray-300' : 'text-light-subtext'}`}>Charity Impact</h3>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                <Heart size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{charityPercentage}%</span>
            </div>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              of your contribution goes directly to causes
            </p>
          </div>

          {/* Prize Tickets */}
          <div className={`glass-card p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border border-l-4 border-l-amber-500' : 'bg-white border-light-border shadow-sm border-l-4 border-l-brand-500'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${isDark ? 'text-gray-300' : 'text-light-subtext'}`}>Draw Entries</h3>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <Ticket size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{drawTickets}</span>
              <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>Ticket{drawTickets !== 1 && 's'}</span>
            </div>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Secured for the upcoming draw
            </p>
          </div>
        </div>

        {/* Scores Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <ScoreList 
              scores={scores} 
              onEdit={editScore} 
              onDelete={deleteScore} 
              loading={scoresLoading} 
            />
          </div>
          <div className="lg:col-span-1">
            <ScoreEntry 
              onAddScore={addScore} 
              loading={scoresLoading} 
            />
          </div>
        </div>

        {/* Content Modules row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Charity Spotlight */}
          <div className={`glass-card rounded-2xl border overflow-hidden flex flex-col ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-sm'}`}>
            <div className="p-6 border-b border-white/5 flex-grow">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Heart className="text-rose-500" size={24} />
                  Your Chosen Charity
                </h2>
                <button className="text-sm font-medium text-brand-500 hover:text-brand-400 flex items-center gap-1 transition-colors">
                  Change <ArrowRight size={16} />
                </button>
              </div>
              
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rose-500/20 to-brand-500/20 flex items-center justify-center shrink-0 border border-white/10">
                  <span className="font-bold text-2xl text-rose-500">TGR</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">TGR Foundation</h3>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                    Empowering students to pursue their passions through education, STEM learning, and unique career preparation programs. 
                  </p>
                </div>
              </div>

              <div className="bg-brand-500/10 p-4 rounded-xl border border-brand-500/20">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-brand-400">Total Community Impact</span>
                  <span className="text-lg font-bold text-brand-500">$12,450 Raised</span>
                </div>
                <div className="w-full h-2 bg-brand-950 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 w-[60%] rounded-full shadow-[0_0_10px_rgba(20,184,166,0.6)]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Draw Section */}
          <div className={`glass-card rounded-2xl border overflow-hidden flex flex-col relative ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-sm'}`}>
            {/* Background flourish */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/20 blur-3xl rounded-full pointer-events-none"></div>
            
            <div className="p-6 relative z-10 flex-grow flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="text-amber-500" size={24} />
                  Upcoming Draw
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5">
                  <Clock size={12} /> Ends in 5 Days
                </span>
              </div>
              
              <div className={`flex flex-col items-center justify-center py-6 px-4 mb-4 rounded-xl flex-grow ${isDark ? 'bg-black/40' : 'bg-gray-50'}`}>
                {/* Visual Placeholder for a prize */}
                <div className="w-32 h-32 mb-4 relative drop-shadow-2xl hover:scale-105 transition-transform duration-300">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" className="text-amber-500/30" />
                    <rect x="35" y="20" width="30" height="60" rx="10" fill="url(#grad)" />
                    <circle cx="50" cy="35" r="8" fill="#1f2937" />
                    <path d="M40 70 L60 70 L55 80 L45 80 Z" fill="#1f2937" />
                    <defs>
                      <linearGradient id="grad" x1="35" y1="20" x2="65" y2="80" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#f59e0b" />
                        <stop offset="1" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <h3 className="font-bold text-2xl mb-1 text-center">TaylorMade Stealth 2</h3>
                <p className={`text-center mb-0 ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                  Carbonwood driver featuring advanced aerodynamics.
                </p>
              </div>

              <div className="flex gap-3 mt-auto">
                <button className="flex-1 btn-primary text-sm !py-2.5">
                  View Prize Details
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
