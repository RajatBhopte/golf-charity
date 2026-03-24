/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from 'react';
import {
  Heart,
  Trophy,
  CreditCard,
  ArrowRight,
  Clock,
  CheckCircle2,
  Ticket,
  Bell,
  Upload,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useScores } from '../hooks/useScores';
import ScoreEntry from '../components/ScoreEntry';
import ScoreList from '../components/ScoreList';
import { buildApiUrl } from '../utils/apiBase';
import { formatCurrencyINR } from '../utils/currency';
import { supabase } from '../utils/supabase';

export default function Dashboard() {
  const { user, session } = useAuth();
  const { isDark } = useTheme();
  const [charities, setCharities] = useState([]);
  const [featuredCharity, setFeaturedCharity] = useState(null);
  const [wins, setWins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [uploadingWinnerId, setUploadingWinnerId] = useState(null);

  const charityPercentage = Number(user?.charity_percentage || 10);
  const subscriptionPlan = user?.subscription_plan || 'monthly';
  const subscriptionLabel = subscriptionPlan === 'yearly' ? 'Yearly Plan' : 'Monthly Plan';
  const subscriptionPrice = subscriptionPlan === 'yearly' ? 15000 : 1500;

  const {
    scores,
    loading: scoresLoading,
    fetchScores,
    addScore,
    editScore,
    deleteScore,
  } = useScores();

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  useEffect(() => {
    const fetchDashboardMeta = async () => {
      if (!session?.access_token) {
        return;
      }

      setMetaLoading(true);
      setDashboardError('');

      try {
        const [charityResult, winsResult, notificationsResult] = await Promise.allSettled([
          fetch(buildApiUrl('/charities')),
          fetch(buildApiUrl('/draws/my-wins'), {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch(buildApiUrl('/draws/notifications'), {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);

        const loadErrors = [];

        if (charityResult.status === 'fulfilled') {
          const charityPayload = await charityResult.value.json();
          if (charityResult.value.ok) {
            setCharities(Array.isArray(charityPayload?.charities) ? charityPayload.charities : []);
            setFeaturedCharity(charityPayload?.featured || null);
          } else {
            loadErrors.push(charityPayload.error || 'Failed to load charities');
          }
        } else {
          loadErrors.push('Failed to load charities');
        }

        if (winsResult.status === 'fulfilled') {
          const winsPayload = await winsResult.value.json();
          if (winsResult.value.ok) {
            setWins(Array.isArray(winsPayload) ? winsPayload : []);
          } else {
            loadErrors.push(winsPayload.error || 'Failed to load winner history');
          }
        } else {
          loadErrors.push('Failed to load winner history');
        }

        if (notificationsResult.status === 'fulfilled') {
          const notificationsPayload = await notificationsResult.value.json();
          if (notificationsResult.value.ok) {
            setNotifications(Array.isArray(notificationsPayload) ? notificationsPayload : []);
          } else {
            loadErrors.push(notificationsPayload.error || 'Failed to load notifications');
          }
        } else {
          loadErrors.push('Failed to load notifications');
        }

        if (loadErrors.length) {
          setDashboardError(loadErrors[0]);
        }
      } catch (error) {
        setDashboardError(error.message || 'Failed to load dashboard data');
      } finally {
        setMetaLoading(false);
      }
    };

    fetchDashboardMeta();
  }, [session]);

  const chosenCharity = useMemo(() => (
    charities.find((charity) => charity.id === user?.charity_id) || featuredCharity || null
  ), [charities, featuredCharity, user?.charity_id]);

  const drawTickets = scores.length >= 5 ? 1 : 0;
  const unreadNotifications = notifications.filter((notification) => !notification.is_read).length;

  const markNotificationRead = async (notificationId) => {
    if (!session?.access_token) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`/draws/notifications/${notificationId}/read`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update notification');
      }

      setNotifications((current) => current.map((notification) => (
        notification.id === notificationId ? payload : notification
      )));
    } catch (error) {
      setDashboardError(error.message || 'Failed to update notification');
    }
  };

  const submitProof = async (winnerId, file) => {
    if (!file || !session?.access_token || !session?.user?.id) {
      return;
    }

    setUploadingWinnerId(winnerId);
    setDashboardError('');

    try {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const storagePath = `${session.user.id}/${winnerId}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase
        .storage
        .from('winner-proofs')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const response = await fetch(buildApiUrl(`/draws/winners/${winnerId}/proof`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ screenshot_url: storagePath }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to submit proof');
      }

      setWins((current) => current.map((win) => (
        win.id === winnerId ? payload : win
      )));

      setNotifications((current) => [{
        id: `local-${Date.now()}`,
        title: 'Proof submitted',
        message: 'Your proof was uploaded and sent for admin review.',
        is_read: false,
        created_at: new Date().toISOString(),
      }, ...current]);
    } catch (error) {
      setDashboardError(error.message || 'Failed to upload proof');
    } finally {
      setUploadingWinnerId(null);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-light-text'}`}>
      <main className="container-max px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">
              Welcome back, <span className="gradient-text">{user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Golfer'}</span>
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Track your impact, draw eligibility, and any winner actions from one place.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              user?.subscription_status === 'active'
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
            }`}>
              {user?.subscription_status === 'active' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
              {user?.subscription_status === 'active' ? 'Active Supporter' : 'Pending Reactivation'}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              unreadNotifications ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20' : 'bg-white/5 text-gray-400 border border-white/10'
            }`}>
              <Bell size={16} />
              {unreadNotifications} unread
            </span>
          </div>
        </div>

        {dashboardError && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {dashboardError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            isDark={isDark}
            title={subscriptionLabel}
            icon={CreditCard}
            iconClass="bg-blue-500/10 text-blue-500"
            value={formatCurrencyINR(subscriptionPrice)}
            caption={subscriptionPlan === 'yearly' ? 'Annual billing plan' : 'Billed monthly'}
          />
          <MetricCard
            isDark={isDark}
            title="Charity Impact"
            icon={Heart}
            iconClass="bg-rose-500/10 text-rose-500"
            value={`${charityPercentage}%`}
            caption="of your contribution goes to charity"
          />
          <MetricCard
            isDark={isDark}
            title="Draw Entries"
            icon={Ticket}
            iconClass="bg-amber-500/10 text-amber-500"
            value={String(drawTickets)}
            caption={drawTickets ? 'Eligible for the next draw' : 'Add up to 5 scores to qualify'}
          />
          <MetricCard
            isDark={isDark}
            title="Notifications"
            icon={Bell}
            iconClass="bg-brand-500/10 text-brand-500"
            value={String(unreadNotifications)}
            caption="updates on draws, proof review, and payments"
          />
        </div>

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

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-8">
          <div className="space-y-8">
            <section className={`glass-card rounded-2xl border overflow-hidden ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-sm'}`}>
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Heart className="text-rose-500" size={24} />
                    Your Chosen Charity
                  </h2>
                  <span className="text-sm font-medium text-brand-500 flex items-center gap-1">
                    Spotlight <ArrowRight size={16} />
                  </span>
                </div>

                {metaLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-brand-500" size={28} />
                  </div>
                ) : chosenCharity ? (
                  <>
                    {chosenCharity.image_url && (
                      <div className="mb-5 overflow-hidden rounded-2xl border border-white/10">
                        <img src={chosenCharity.image_url} alt={chosenCharity.name} className="h-44 w-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rose-500/20 to-brand-500/20 flex items-center justify-center shrink-0 border border-white/10">
                        {chosenCharity.logo_url ? (
                          <img src={chosenCharity.logo_url} alt={chosenCharity.name} className="w-10 h-10 object-contain" />
                        ) : (
                          <Heart className="text-rose-500" size={24} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-1">{chosenCharity.name}</h3>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                          {chosenCharity.description}
                        </p>
                      </div>
                    </div>

                    <div className="bg-brand-500/10 p-4 rounded-xl border border-brand-500/20 mb-4">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium text-brand-400">Total Community Impact</span>
                        <span className="text-lg font-bold text-brand-500">{formatCurrencyINR(chosenCharity.total_raised || 0)} Raised</span>
                      </div>
                      <div className="w-full h-2 bg-brand-950 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 w-[60%] rounded-full shadow-[0_0_10px_rgba(20,184,166,0.6)]" />
                      </div>
                    </div>

                    {Array.isArray(chosenCharity.upcoming_events) && chosenCharity.upcoming_events.length > 0 && (
                      <div className={`rounded-xl border px-4 py-3 ${isDark ? 'border-dark-border bg-dark-bg/60' : 'border-light-border bg-gray-50'}`}>
                        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Upcoming Events</div>
                        <div className="space-y-1 text-sm">
                          {chosenCharity.upcoming_events.slice(0, 3).map((event) => (
                            <div key={event}>{event}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`rounded-xl border px-4 py-5 text-sm ${isDark ? 'border-dark-border bg-dark-bg/60 text-gray-400' : 'border-light-border bg-gray-50 text-light-subtext'}`}>
                    No charity is assigned to your profile yet.
                  </div>
                )}
              </div>
            </section>

            <section className={`glass-card rounded-2xl border overflow-hidden ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-sm'}`}>
              <div className="p-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-5">
                  <Trophy className="text-amber-500" size={24} />
                  Winner History
                </h2>

                {metaLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-brand-500" size={28} />
                  </div>
                ) : wins.length === 0 ? (
                  <div className={`rounded-xl border px-4 py-5 text-sm ${isDark ? 'border-dark-border bg-dark-bg/60 text-gray-400' : 'border-light-border bg-gray-50 text-light-subtext'}`}>
                    You have not won a draw yet. Keep logging scores to stay eligible.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wins.map((win) => (
                      <div key={win.id} className={`rounded-2xl border p-4 ${isDark ? 'border-dark-border bg-dark-bg/40' : 'border-light-border bg-gray-50'}`}>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div>
                            <div className="font-bold text-lg">
                              {win.draws?.month_year
                                ? new Date(win.draws.month_year).toLocaleDateString([], { month: 'long', year: 'numeric' })
                                : 'Monthly Draw'}
                            </div>
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                              {win.prize_tier}-number match for {formatCurrencyINR(win.amount || 0)}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusPill label={win.verification_status || 'pending'} tone={
                              win.verification_status === 'approved' ? 'green' : win.verification_status === 'rejected' ? 'red' : 'amber'
                            } />
                            <StatusPill label={win.payment_status || 'pending'} tone={win.payment_status === 'paid' ? 'blue' : 'slate'} />
                          </div>
                        </div>

                        {win.rejection_reason && (
                          <div className="mt-3 text-sm text-red-500">
                            Rejection reason: {win.rejection_reason}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-3 items-center">
                          {win.proof_signed_url && (
                            <a
                              href={win.proof_signed_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-semibold text-brand-500 hover:text-brand-400"
                            >
                              View uploaded proof
                            </a>
                          )}

                          <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer ${
                            isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-light-border hover:bg-gray-100'
                          }`}>
                            {uploadingWinnerId === win.id ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                            {win.screenshot_url ? 'Replace Proof' : 'Upload Proof'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingWinnerId === win.id}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  submitProof(win.id, file);
                                }
                                event.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className={`glass-card rounded-2xl border overflow-hidden ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-sm'}`}>
            <div className="p-6">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-5">
                <Bell className="text-brand-500" size={24} />
                Notifications
              </h2>

              {metaLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-brand-500" size={28} />
                </div>
              ) : notifications.length === 0 ? (
                <div className={`rounded-xl border px-4 py-5 text-sm ${isDark ? 'border-dark-border bg-dark-bg/60 text-gray-400' : 'border-light-border bg-gray-50 text-light-subtext'}`}>
                  No updates yet. Draw and proof notifications will show up here.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        if (!notification.is_read && typeof notification.id === 'string' && !notification.id.startsWith('local-')) {
                          markNotificationRead(notification.id);
                        }
                      }}
                      className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${
                        notification.is_read
                          ? isDark ? 'border-dark-border bg-dark-bg/30' : 'border-light-border bg-gray-50'
                          : 'border-brand-500/20 bg-brand-500/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{notification.title || 'Update'}</div>
                          <div className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                            {notification.message}
                          </div>
                        </div>
                        {!notification.is_read && (
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-500 shrink-0" />
                        )}
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        {notification.created_at ? new Date(notification.created_at).toLocaleString() : 'Just now'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title, icon: Icon, iconClass, value, caption, isDark }) {
  return (
    <div className={`glass-card p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-sm'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold ${isDark ? 'text-gray-300' : 'text-light-subtext'}`}>{title}</h3>
        <div className={`p-2.5 rounded-xl ${iconClass}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold">{value}</span>
      </div>
      <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
        {caption}
      </p>
    </div>
  );
}

function StatusPill({ label, tone }) {
  const className = tone === 'green'
    ? 'bg-green-500/10 text-green-500'
    : tone === 'red'
      ? 'bg-red-500/10 text-red-500'
      : tone === 'blue'
        ? 'bg-blue-500/10 text-blue-500'
        : tone === 'amber'
          ? 'bg-amber-500/10 text-amber-500'
          : 'bg-slate-500/10 text-slate-400';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${className}`}>
      {label}
    </span>
  );
}
