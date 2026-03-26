import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Users,
  Trophy,
  Heart,
  CheckCircle,
  BarChart3,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Ticket,
  Loader2,
  Wallet,
  CalendarDays,
} from "lucide-react";
import { buildApiUrl } from "../utils/apiBase";
import { formatCurrencyINR } from "../utils/currency";

import AdminUserList from "../components/AdminUserList";
import AdminCharityManager from "../components/AdminCharityManager";
import AdminDrawEngine from "../components/AdminDrawEngine";
import AdminWinnerVerification from "../components/AdminWinnerVerification";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");
  const { isDark } = useTheme();

  const tabs = [
    { id: "analytics", name: "Analytics", icon: BarChart3 },
    { id: "users", name: "Users", icon: Users },
    { id: "draws", name: "Draw Engine", icon: Trophy },
    { id: "charities", name: "Charities", icon: Heart },
    { id: "winners", name: "Verification", icon: CheckCircle },
  ];

  return (
    <div
      className={`min-h-screen transition-colors duration-300 flex ${isDark ? "bg-dark-bg text-white" : "bg-light-bg text-light-text"}`}
    >
      {/* New Responsive Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
      />

      {/* Main Content Area */}
      <main className="flex-grow lg:ml-72 min-h-screen">
        <div className="container-max px-4 sm:px-6 lg:px-8 py-6 lg:py-8 mt-16 lg:mt-0">
          <header className="mb-7 flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-8 bg-brand-500 rounded-full" />
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight uppercase">
                  Dashboard <span className="gradient-text">{activeTab}</span>
                </h1>
              </div>
              <p
                className={`text-sm ${isDark ? "text-gray-400" : "text-light-subtext"}`}
              >
                Managing the platform infrastructure and player rewards.
              </p>
            </div>

            <div
              className={`hidden md:block px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest ${
                isDark
                  ? "bg-dark-card border-dark-border"
                  : "bg-white border-light-border"
              }`}
            >
              {new Date().toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
          </header>

          {/* Render Tab Content */}
          <div className="animate-fade-in">
            {activeTab === "analytics" && <AnalyticsOverview isDark={isDark} />}
            {activeTab === "users" && <AdminUserList isDark={isDark} />}
            {activeTab === "draws" && <AdminDrawEngine isDark={isDark} />}
            {activeTab === "charities" && (
              <AdminCharityManager isDark={isDark} />
            )}
            {activeTab === "winners" && (
              <AdminWinnerVerification isDark={isDark} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function AnalyticsOverview({ isDark }) {
  const { session } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl("/admin/stats"), {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load analytics");
      }
      setStats(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [session, fetchStats]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-500" size={40} />
      </div>
    );

  const winnersSummary = stats?.winners_summary || {};
  const payoutPipelineItems = [
    {
      key: "pending",
      label: "Pending verification",
      value: Number(winnersSummary.pending_verification || 0),
      tone: "amber",
    },
    {
      key: "approved",
      label: "Approved, awaiting payout",
      value: Number(winnersSummary.approved_unpaid || 0),
      tone: "sky",
    },
    {
      key: "paid",
      label: "Paid winners",
      value: Number(winnersSummary.paid_count || 0),
      tone: "emerald",
    },
  ];
  const payoutPipelineTotal = payoutPipelineItems.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const cards = [
    {
      name: "Current Prize Pool",
      value: formatCurrencyINR(stats?.total_pool || 0),
      detail: stats?.current_month,
      icon: CreditCard,
      color: "text-brand-500",
    },
    {
      name: "Active Subscribers",
      value: String(stats?.active_subscribers || 0),
      detail: "Billing-ready accounts",
      icon: Users,
      color: "text-blue-500",
    },
    {
      name: "Total Score Entries",
      value: String(stats?.total_scores || 0),
      detail: "Recorded score history",
      icon: Ticket,
      color: "text-amber-500",
    },
    {
      name: "Lifetime Charity Total",
      value: formatCurrencyINR(stats?.overall_charity_total || 0),
      detail: `${stats?.charity_totals?.length || 0} charities`,
      icon: Heart,
      color: "text-rose-500",
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((stat) => (
          <div
            key={stat.name}
            className={`glass-card p-5 rounded-2xl border ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
          >
            <div className="flex items-start justify-between mb-3.5">
              <div
                className={`p-2 rounded-xl ${isDark ? "bg-white/5" : "bg-gray-50"} ${stat.color}`}
              >
                <stat.icon size={20} />
              </div>
              <span className="flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full bg-brand-500/10 text-brand-500">
                <TrendingUp size={12} /> Live
              </span>
            </div>
            <h3
              className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-light-subtext"}`}
            >
              {stat.name}
            </h3>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p
              className={`mt-1.5 text-sm ${isDark ? "text-gray-500" : "text-light-subtext"}`}
            >
              {stat.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`glass-card p-5 rounded-2xl border ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="text-brand-500" size={20} />
                <h3 className="text-lg font-bold">Payout Pipeline</h3>
              </div>
              <p
                className={`mt-1 text-xs ${isDark ? "text-gray-400" : "text-light-subtext"}`}
              >
                Winner verification and payout status at a glance
              </p>
            </div>
            <div
              className={`rounded-lg px-3 py-1.5 text-right ${isDark ? "bg-white/5 border border-dark-border" : "bg-gray-50 border border-light-border"}`}
            >
              <div
                className={`text-[11px] uppercase tracking-wider ${isDark ? "text-gray-400" : "text-light-subtext"}`}
              >
                Total cases
              </div>
              <div className="text-lg font-black leading-tight">
                {payoutPipelineTotal}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {payoutPipelineItems.map((item) => (
              <SummaryRow
                key={item.key}
                label={item.label}
                value={item.value}
                tone={item.tone}
                ratio={
                  payoutPipelineTotal > 0 ? item.value / payoutPipelineTotal : 0
                }
                isDark={isDark}
              />
            ))}
          </div>

          <div
            className={`mt-3.5 rounded-xl px-3.5 py-2.5 border ${isDark ? "bg-black/20 border-dark-border" : "bg-gray-50 border-light-border"}`}
          >
            <div className="flex items-center justify-between gap-4">
              <span
                className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
              >
                Paid amount total
              </span>
              <span className="text-lg font-black text-brand-500">
                {formatCurrencyINR(winnersSummary.paid_amount_total || 0)}
              </span>
            </div>
          </div>
        </div>

        <div
          className={`glass-card p-5 rounded-2xl border ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
        >
          <div className="flex items-center gap-2 mb-4">
            <Heart className="text-rose-500" size={20} />
            <h3 className="text-lg font-bold">Charity Contribution Totals</h3>
          </div>
          <div className="space-y-3">
            {(stats?.charity_totals || []).slice(0, 5).map((charity) => (
              <div
                key={charity.id}
                className={`rounded-xl border px-3.5 py-2.5 flex items-center justify-between ${isDark ? "border-dark-border bg-black/20" : "border-light-border bg-gray-50"}`}
              >
                <div>
                  <div className="font-semibold">{charity.name}</div>
                  <div className="text-xs text-gray-500">
                    {charity.is_spotlight
                      ? "Homepage spotlight charity"
                      : "Directory listing"}
                  </div>
                </div>
                <div className="text-right font-bold text-brand-500">
                  {formatCurrencyINR(charity.total_raised || 0)}
                </div>
              </div>
            ))}
            {!stats?.charity_totals?.length && (
              <div className="text-sm text-gray-500">
                No charity totals are available yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`glass-card p-5 rounded-2xl border ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
      >
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="text-amber-500" size={20} />
          <h3 className="text-lg font-bold">Recent Draw History</h3>
        </div>

        <div className="space-y-3">
          {(stats?.draw_history || []).map((draw) => (
            <div
              key={draw.id}
              className={`rounded-xl border px-3.5 py-3 flex items-center justify-between ${isDark ? "border-dark-border bg-black/20" : "border-light-border bg-gray-50"}`}
            >
              <div>
                <div className="font-semibold">
                  {draw.month_year
                    ? new Date(draw.month_year).toLocaleDateString([], {
                        month: "long",
                        year: "numeric",
                      })
                    : "Unknown month"}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">
                  {draw.status}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-brand-500">
                  {formatCurrencyINR(draw.total_pool || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  {draw.published_at
                    ? `Published ${new Date(draw.published_at).toLocaleDateString()}`
                    : "Not yet published"}
                </div>
              </div>
            </div>
          ))}
          {!stats?.draw_history?.length && (
            <div className="text-sm text-gray-500">
              No draw history has been published yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, tone = "brand", ratio = 0, isDark }) {
  const toneClasses = {
    amber: {
      dot: "bg-amber-500",
      text: "text-amber-500",
      track: isDark ? "bg-amber-500/20" : "bg-amber-100",
      fill: "bg-amber-500",
    },
    sky: {
      dot: "bg-sky-500",
      text: "text-sky-500",
      track: isDark ? "bg-sky-500/20" : "bg-sky-100",
      fill: "bg-sky-500",
    },
    emerald: {
      dot: "bg-emerald-500",
      text: "text-emerald-500",
      track: isDark ? "bg-emerald-500/20" : "bg-emerald-100",
      fill: "bg-emerald-500",
    },
    brand: {
      dot: "bg-brand-500",
      text: "text-brand-500",
      track: isDark ? "bg-brand-500/20" : "bg-brand-100",
      fill: "bg-brand-500",
    },
  };

  const activeTone = toneClasses[tone] || toneClasses.brand;

  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 ${isDark ? "border-dark-border bg-black/20" : "border-light-border bg-gray-50"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full ${activeTone.dot}`} />
          <span
            className={`text-sm truncate ${isDark ? "text-gray-300" : "text-gray-700"}`}
          >
            {label}
          </span>
        </div>
        <span className={`text-lg font-black leading-none ${activeTone.text}`}>
          {value}
        </span>
      </div>
      <div
        className={`mt-2 h-1.5 rounded-full overflow-hidden ${activeTone.track}`}
      >
        <div
          className={`h-full ${activeTone.fill}`}
          style={{
            width: `${Math.max(6, Math.min(100, Math.round(ratio * 100)))}%`,
          }}
        />
      </div>
    </div>
  );
}
