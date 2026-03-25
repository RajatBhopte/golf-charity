/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useScores } from "../hooks/useScores";
import ScoreEntry from "../components/ScoreEntry";
import ScoreList from "../components/ScoreList";
import { buildApiUrl } from "../utils/apiBase";
import { formatCurrencyINR } from "../utils/currency";

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

const formatNumberSeries = (numbers = []) =>
  Array.isArray(numbers) && numbers.length ? numbers.join(", ") : "None";

import UserSidebar from "../components/UserSidebar";

export default function Dashboard() {
  const { user, session } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("overview");
  const [charities, setCharities] = useState([]);
  const [featuredCharity, setFeaturedCharity] = useState(null);
  const [wins, setWins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [uploadingWinnerId, setUploadingWinnerId] = useState(null);

  const charityPercentage = Number(user?.charity_percentage || 10);
  const subscriptionPlan = user?.subscription_plan || "monthly";
  const subscriptionLabel =
    subscriptionPlan === "yearly" ? "Yearly Plan" : "Monthly Plan";
  const subscriptionPrice = subscriptionPlan === "yearly" ? 15000 : 1500;

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
      if (!session?.access_token) return;
      setMetaLoading(true);
      setDashboardError("");

      try {
        const [charityResult, winsResult, notificationsResult] =
          await Promise.allSettled([
            fetch(buildApiUrl("/charities")),
            fetch(buildApiUrl("/draws/my-wins"), {
              headers: { Authorization: `Bearer ${session.access_token}` },
            }),
            fetch(buildApiUrl("/draws/notifications"), {
              headers: { Authorization: `Bearer ${session.access_token}` },
            }),
          ]);

        const loadErrors = [];
        if (charityResult.status === "fulfilled") {
          const charityPayload = await charityResult.value.json();
          if (charityResult.value.ok) {
            setCharities(
              Array.isArray(charityPayload?.charities)
                ? charityPayload.charities
                : [],
            );
            setFeaturedCharity(charityPayload?.featured || null);
          } else
            loadErrors.push(charityPayload.error || "Failed to load charities");
        }

        if (winsResult.status === "fulfilled") {
          const winsPayload = await winsResult.value.json();
          if (winsResult.value.ok)
            setWins(Array.isArray(winsPayload) ? winsPayload : []);
          else loadErrors.push(winsPayload.error || "Failed to load winners");
        }

        if (notificationsResult.status === "fulfilled") {
          const notificationsPayload = await notificationsResult.value.json();
          if (notificationsResult.value.ok)
            setNotifications(
              Array.isArray(notificationsPayload) ? notificationsPayload : [],
            );
          else
            loadErrors.push(
              notificationsPayload.error || "Failed to load notifications",
            );
        }

        if (loadErrors.length) setDashboardError(loadErrors[0]);
      } catch (error) {
        setDashboardError(error.message || "Failed to sync dashboard");
      } finally {
        setMetaLoading(false);
      }
    };
    fetchDashboardMeta();
  }, [session]);

  const chosenCharity = useMemo(
    () =>
      charities.find((charity) => charity.id === user?.charity_id) ||
      featuredCharity ||
      null,
    [charities, featuredCharity, user?.charity_id],
  );

  const drawTickets = scores.length >= 5 ? 1 : 0;
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;
  const latestFiveScores = scores.slice(0, 5);

  const markNotificationRead = async (notificationId) => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(
        buildApiUrl(`/draws/notifications/${notificationId}/read`),
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Update failed");
      setNotifications((current) =>
        current.map((n) => (n.id === notificationId ? payload : n)),
      );
    } catch (e) {
      setDashboardError(e.message);
    }
  };

  const submitProof = async (winnerId, file) => {
    if (!file || !session?.access_token) return;
    setUploadingWinnerId(winnerId);
    try {
      const fileData = await readFileAsDataUrl(file);
      const response = await fetch(
        buildApiUrl(`/draws/winners/${winnerId}/proof`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ file_name: file.name, file_data: fileData }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Upload failed");
      setWins((current) =>
        current.map((w) => (w.id === winnerId ? payload : w)),
      );
    } catch (e) {
      setDashboardError(e.message);
    } finally {
      setUploadingWinnerId(null);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 flex ${isDark ? "bg-dark-bg text-white" : "bg-light-bg text-light-text"}`}
    >
      <UserSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadNotifications={unreadNotifications}
      />

      <main className="flex-grow lg:ml-72 min-h-screen">
        <div className="container-max px-4 sm:px-6 lg:px-8 py-8 lg:py-12 mt-16 lg:mt-0">
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2.5 h-10 bg-brand-500 rounded-full" />
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight uppercase">
                  My{" "}
                  <span className="gradient-text">
                    {activeTab === "overview" ? "Terminal" : activeTab}
                  </span>
                </h1>
              </div>
              <p
                className={`text-sm lg:text-base ${isDark ? "text-gray-400" : "text-light-subtext"}`}
              >
                {activeTab === "overview" &&
                  "Welcome to your personalized golf charity portal."}
                {activeTab === "scores" &&
                  "Log and manage your 18-hole score performance."}
                {activeTab === "impact" &&
                  "See the difference your play makes for your chosen charity."}
                {activeTab === "wins" &&
                  "Your history of matched numbers and prize claims."}
                {activeTab === "notifications" &&
                  "System alerts, draw results, and verified payments."}
              </p>
            </div>

            <div
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${
                isDark
                  ? "bg-dark-card border-dark-border"
                  : "bg-white border-light-border"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${user?.subscription_status === "active" ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}
              />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {user?.subscription_status === "active"
                  ? "Active Supporter"
                  : "Pending Reactivation"}
              </span>
            </div>
          </header>

          {dashboardError && (
            <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-500 animate-slide-up flex items-center justify-between">
              <span>{dashboardError}</span>
              <button
                onClick={() => setDashboardError("")}
                className="p-1 hover:bg-black/10 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Tab Content Areas */}
          <div className="animate-fade-in space-y-10">
            {activeTab === "overview" && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <MetricCard
                    isDark={isDark}
                    title={subscriptionLabel}
                    icon={CreditCard}
                    iconClass="bg-blue-500/10 text-blue-500"
                    value={formatCurrencyINR(subscriptionPrice)}
                    caption={
                      subscriptionPlan === "yearly"
                        ? "Annual plan"
                        : "Monthly billing"
                    }
                  />
                  <MetricCard
                    isDark={isDark}
                    title="Impact Rate"
                    icon={Heart}
                    iconClass="bg-rose-500/10 text-rose-500"
                    value={`${charityPercentage}%`}
                    caption="of every entry fee goes to charity"
                  />
                  <MetricCard
                    isDark={isDark}
                    title="Active Tickets"
                    icon={Ticket}
                    iconClass="bg-amber-500/10 text-amber-500"
                    value={String(drawTickets)}
                    caption={
                      drawTickets
                        ? "Eligible for next draw"
                        : "Log 5 scores to enter"
                    }
                  />
                  <MetricCard
                    isDark={isDark}
                    title="Live Alerts"
                    icon={Bell}
                    iconClass="bg-brand-500/10 text-brand-500"
                    value={String(unreadNotifications)}
                    caption="Unread system updates"
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                  <div className="xl:col-span-3 space-y-4">
                    <LatestFiveScoreBoard
                      isDark={isDark}
                      scores={latestFiveScores}
                      loading={scoresLoading}
                    />
                    <button
                      onClick={() => setActiveTab("scores")}
                      className="w-full py-4 rounded-2xl border border-dashed border-gray-300 dark:border-dark-border text-sm font-bold uppercase tracking-widest hover:bg-brand-500/5 hover:text-brand-500 transition-all"
                    >
                      View and manage score history ({scores.length})
                    </button>
                  </div>
                  <div className="xl:col-span-2">
                    <ScoreEntry onAddScore={addScore} loading={scoresLoading} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "scores" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                  <ScoreList
                    scores={scores}
                    onEdit={editScore}
                    onDelete={deleteScore}
                    loading={scoresLoading}
                  />
                </div>
                <div className="xl:col-span-1">
                  <ScoreEntry onAddScore={addScore} loading={scoresLoading} />
                </div>
              </div>
            )}

            {activeTab === "impact" && (
              <section
                className={`glass-card rounded-2xl border overflow-hidden ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
              >
                <div className="p-8">
                  {metaLoading ? (
                    <div className="flex justify-center py-20">
                      <Loader2
                        className="animate-spin text-brand-500"
                        size={40}
                      />
                    </div>
                  ) : chosenCharity ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div>
                        {chosenCharity.image_url && (
                          <div className="mb-6 overflow-hidden rounded-3xl border border-white/5">
                            <img
                              src={chosenCharity.image_url}
                              alt={chosenCharity.name}
                              className="h-64 lg:h-80 w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20">
                            {chosenCharity.logo_url ? (
                              <img
                                src={chosenCharity.logo_url}
                                className="w-8 h-8 object-contain"
                              />
                            ) : (
                              <Heart size={24} />
                            )}
                          </div>
                          <h3 className="font-black text-2xl uppercase tracking-tight">
                            {chosenCharity.name}
                          </h3>
                        </div>
                        <p
                          className={`text-lg leading-relaxed mb-8 ${isDark ? "text-gray-400" : "text-light-subtext"}`}
                        >
                          {chosenCharity.description}
                        </p>
                      </div>
                      <div className="space-y-8">
                        <div className="bg-brand-500 p-8 rounded-3xl text-white shadow-xl shadow-brand-500/20">
                          <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">
                            Community Impact
                          </p>
                          <p className="text-4xl font-black mb-6">
                            {formatCurrencyINR(chosenCharity.total_raised || 0)}{" "}
                            <span className="text-lg font-bold opacity-80 italic">
                              raised
                            </span>
                          </p>
                          <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-white w-[75%] rounded-full" />
                          </div>
                          <p className="text-[10px] font-bold uppercase opacity-60">
                            Crowdfund Progress for current initiative
                          </p>
                        </div>

                        {chosenCharity.upcoming_events?.length > 0 && (
                          <div
                            className={`p-6 rounded-3xl border ${isDark ? "bg-dark-bg/60 border-dark-border" : "bg-gray-50 border-light-border"}`}
                          >
                            <h4 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                              <ArrowRight
                                className="text-brand-500"
                                size={16}
                              />{" "}
                              Upcoming Events
                            </h4>
                            <ul className="space-y-3">
                              {chosenCharity.upcoming_events.map((e) => (
                                <li
                                  key={e}
                                  className="flex items-center gap-3 text-sm font-semibold"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />{" "}
                                  {e}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-20 text-gray-500">
                      No charity assigned.
                    </p>
                  )}
                </div>
              </section>
            )}

            {activeTab === "wins" && (
              <div className="space-y-6">
                {metaLoading ? (
                  <div className="flex justify-center py-20">
                    <Loader2
                      className="animate-spin text-brand-500"
                      size={40}
                    />
                  </div>
                ) : wins.length === 0 ? (
                  <div className="text-center py-24 bg-dark-card/20 rounded-3xl border border-dashed border-dark-border">
                    <Trophy className="mx-auto text-gray-700 mb-4" size={48} />
                    <h3 className="text-xl font-bold mb-2">
                      No wins recorded yet
                    </h3>
                    <p className="text-gray-500">
                      Log scores to enter future draws. Your winning tickets
                      will appear here.
                    </p>
                  </div>
                ) : (
                  wins.map((win) => (
                    <div
                      key={win.id}
                      className={`p-8 rounded-3xl border ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
                    >
                      <div className="flex flex-col xl:flex-row justify-between gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="px-3 py-1 rounded-full bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest">
                              {win.draws?.month_year
                                ? new Date(
                                    win.draws.month_year,
                                  ).toLocaleDateString([], {
                                    month: "long",
                                    year: "numeric",
                                  })
                                : "Win"}
                            </div>
                            <StatusPill
                              label={win.verification_status}
                              tone={
                                win.verification_status === "approved"
                                  ? "green"
                                  : win.verification_status === "rejected"
                                    ? "red"
                                    : "amber"
                              }
                            />
                            <StatusPill
                              label={win.payment_status}
                              tone={
                                win.payment_status === "paid" ? "blue" : "slate"
                              }
                            />
                          </div>
                          <h3 className="text-3xl font-black">
                            {formatCurrencyINR(win.amount || 0)}
                          </h3>
                          <p className="text-gray-500 text-sm italic">
                            {win.prize_tier}-number match
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 xl:pt-4">
                            <WinBadge
                              label="Winning Numbers"
                              value={win.draws?.winning_numbers?.join(", ")}
                            />
                            <WinBadge
                              label="Your Match"
                              value={win.matched_numbers?.join(", ")}
                              color="text-brand-500"
                            />
                            <WinBadge
                              label="Ticket Hash"
                              value={win.id?.slice(0, 8)}
                            />
                          </div>
                        </div>

                        <div className="xl:w-80 space-y-4 pt-4 xl:pt-0">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                            Verification Action
                          </p>
                          {win.rejection_reason && (
                            <p className="text-sm font-bold text-red-500">
                              {win.rejection_reason}
                            </p>
                          )}

                          <label
                            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest cursor-pointer transition-all ${
                              isDark
                                ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                                : "bg-black text-white hover:bg-gray-800"
                            }`}
                          >
                            {uploadingWinnerId === win.id ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : win.screenshot_url ? (
                              <CheckCircle2 size={18} />
                            ) : (
                              <Upload size={18} />
                            )}
                            {win.screenshot_url
                              ? "Update Proof"
                              : "Upload Proof"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingWinnerId === win.id}
                              onChange={(e) =>
                                e.target.files?.[0] &&
                                submitProof(win.id, e.target.files[0])
                              }
                            />
                          </label>

                          {win.proof_signed_url && (
                            <a
                              href={win.proof_signed_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-center text-xs font-bold text-gray-500 hover:text-brand-500 underline decoration-dotted underline-offset-4"
                            >
                              View Current Proof
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="max-w-4xl space-y-4">
                {metaLoading ? (
                  <div className="flex justify-center py-20">
                    <Loader2
                      className="animate-spin text-brand-500"
                      size={40}
                    />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-24 bg-dark-card/20 rounded-3xl border border-dashed border-dark-border">
                    <Bell
                      className="mx-auto text-gray-700 mb-4 opacity-50"
                      size={48}
                    />
                    <p className="text-gray-500">
                      Inbox is empty. We will notify you here about results.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() =>
                        !n.is_read &&
                        typeof n.id === "string" &&
                        !n.id.startsWith("local-") &&
                        markNotificationRead(n.id)
                      }
                      className={`w-full text-left p-6 rounded-2xl border transition-all ${
                        n.is_read
                          ? isDark
                            ? "bg-dark-card/40 border-dark-border opacity-70"
                            : "bg-gray-50 border-light-border"
                          : "bg-brand-500/5 border-brand-500/30 shadow-lg shadow-brand-500/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="font-black uppercase tracking-tight text-lg">
                            {n.title || "System Alert"}
                          </div>
                          <p
                            className={`text-sm ${isDark ? "text-gray-400" : "text-light-subtext"}`}
                          >
                            {n.message}
                          </p>
                          <p className="text-[10px] font-bold text-gray-500 pt-2 uppercase tracking-widest">
                            {n.created_at
                              ? new Date(n.created_at).toLocaleString()
                              : "Recent"}
                          </p>
                        </div>
                        {!n.is_read && (
                          <div className="w-3 h-3 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title, icon: Icon, iconClass, value, caption, isDark }) {
  return (
    <div
      className={`p-6 rounded-3xl border transition-all duration-300 group hover:-translate-y-1 ${isDark ? "bg-dark-card border-dark-border hover:border-brand-500/40" : "bg-white border-light-border shadow-sm hover:shadow-xl hover:shadow-brand-500/5"}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-light-subtext"}`}
        >
          {title}
        </h3>
        <div className={`p-2.5 rounded-xl transition-colors ${iconClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p
        className={`text-sm ${isDark ? "text-gray-500" : "text-light-subtext"}`}
      >
        {caption}
      </p>
    </div>
  );
}

function StatusPill({ label, tone }) {
  const tones = {
    green: "bg-green-500 text-white",
    red: "bg-red-500 text-white",
    blue: "bg-blue-500 text-white",
    amber: "bg-amber-500 text-white",
    slate: "bg-slate-500/20 text-slate-400",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm ${tones[tone] || tones.slate}`}
    >
      {label}
    </span>
  );
}

function WinBadge({ label, value, color }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className={`text-sm font-bold ${color || "text-current"}`}>{value}</p>
    </div>
  );
}

function LatestFiveScoreBoard({ isDark, scores, loading }) {
  const slots = Array.from({ length: 5 }, (_, index) => scores[index] || null);

  return (
    <section
      className={`rounded-3xl border p-6 sm:p-8 ${isDark ? "bg-[#081538] border-[#1a2f5f]" : "bg-[#eef4ff] border-[#c9d9ff]"}`}
    >
      <div className="flex items-center justify-between gap-3 mb-6">
        <h3
          className={`flex items-center gap-3 text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-[#0d1f4a]"}`}
        >
          <Clock className="text-indigo-500" size={34} />
          Latest 5 Scores
        </h3>
        <span
          className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest border ${isDark ? "bg-[#020b27] border-[#1a2f5f] text-[#7f95d7]" : "bg-white border-[#c9d9ff] text-[#3354a8]"}`}
        >
          Stableford
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-5">
        {slots.map((slot, index) => (
          <div
            key={slot?.id || `score-slot-${index}`}
            className={`h-40 rounded-[28px] border-4 border-dashed flex items-center justify-center ${isDark ? "border-[#1d315f] bg-[#0a1a42]" : "border-[#b3c6f7] bg-[#e5edff]"}`}
          >
            {loading ? (
              <Loader2
                className={`animate-spin ${isDark ? "text-[#5473be]" : "text-[#4a67ae]"}`}
                size={28}
              />
            ) : slot ? (
              <div className="text-center">
                <p
                  className={`text-5xl font-black leading-none ${isDark ? "text-white" : "text-[#10295f]"}`}
                >
                  {slot.score}
                </p>
                <p
                  className={`mt-2 text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-[#7f95d7]" : "text-[#4a67ae]"}`}
                >
                  {new Date(slot.played_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ) : (
              <span
                className={`text-5xl font-black leading-none ${isDark ? "text-[#1d315f]" : "text-[#8aa1d8]"}`}
              >
                --
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
