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
  X,
  Lock,
  Search,
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

const formatMatchedNumbersForWin = (win) => {
  if (Array.isArray(win?.matched_numbers) && win.matched_numbers.length) {
    return win.matched_numbers.join(", ");
  }

  if (Number.isFinite(Number(win?.prize_tier))) {
    return `Matched ${win.prize_tier} numbers`;
  }

  return "None";
};

import UserSidebar from "../components/UserSidebar";

export default function Dashboard() {
  const { user, session, refreshUserData } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("overview");
  const [charities, setCharities] = useState([]);
  const [featuredCharity, setFeaturedCharity] = useState(null);
  const [wins, setWins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [uploadingWinnerId, setUploadingWinnerId] = useState(null);
  const [selectedCharityId, setSelectedCharityId] = useState("");
  const [selectedCharityPercentage, setSelectedCharityPercentage] =
    useState(10);
  const [impactCharitySearch, setImpactCharitySearch] = useState("");
  const [impactSpotlightOnly, setImpactSpotlightOnly] = useState(false);
  const [impactMinRaised, setImpactMinRaised] = useState(0);
  const [savingImpactSettings, setSavingImpactSettings] = useState(false);
  const [impactSuccessMsg, setImpactSuccessMsg] = useState("");
  const [subscriptionActionLoading, setSubscriptionActionLoading] =
    useState(false);
  const [subscriptionActionMsg, setSubscriptionActionMsg] = useState("");
  const [isClearingNotifications, setIsClearingNotifications] = useState(false);
  const [notificationActionMsg, setNotificationActionMsg] = useState("");
  const isActiveSubscriber = user?.subscription_status === "active";

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
    if (isActiveSubscriber) {
      fetchScores();
    }
  }, [fetchScores, isActiveSubscriber]);

  useEffect(() => {
    const fetchDashboardMeta = async () => {
      if (!session?.access_token) return;
      setMetaLoading(true);
      setDashboardError("");

      try {
        const requests = [fetch(buildApiUrl("/charities"))];
        if (isActiveSubscriber) {
          requests.push(
            fetch(buildApiUrl("/draws/my-wins"), {
              headers: { Authorization: `Bearer ${session.access_token}` },
            }),
          );
          requests.push(
            fetch(buildApiUrl("/draws/notifications"), {
              headers: { Authorization: `Bearer ${session.access_token}` },
            }),
          );
        }

        const [charityResult, winsResult, notificationsResult] =
          await Promise.allSettled(requests);

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

        if (isActiveSubscriber && winsResult?.status === "fulfilled") {
          const winsPayload = await winsResult.value.json();
          if (winsResult.value.ok)
            setWins(Array.isArray(winsPayload) ? winsPayload : []);
          else loadErrors.push(winsPayload.error || "Failed to load winners");
        }

        if (isActiveSubscriber && notificationsResult?.status === "fulfilled") {
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
  }, [session, isActiveSubscriber]);

  const chosenCharity = useMemo(
    () =>
      charities.find((charity) => charity.id === user?.charity_id) ||
      featuredCharity ||
      null,
    [charities, featuredCharity, user?.charity_id],
  );

  const impactFilteredCharities = useMemo(() => {
    const searchTerm = impactCharitySearch.trim().toLowerCase();

    return charities.filter((charity) => {
      if (impactSpotlightOnly && !charity?.is_spotlight) {
        return false;
      }

      if (
        impactMinRaised > 0 &&
        Number(charity?.total_raised || 0) < impactMinRaised
      ) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const name = String(charity?.name || "").toLowerCase();
      const description = String(charity?.description || "").toLowerCase();
      return name.includes(searchTerm) || description.includes(searchTerm);
    });
  }, [charities, impactCharitySearch, impactSpotlightOnly, impactMinRaised]);

  const drawTickets = isActiveSubscriber && scores.length >= 5 ? 1 : 0;
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;
  const latestFiveScores = scores.slice(0, 5);
  const scoreCompletion = Math.min(scores.length, 5);
  const scoreCompletionPct = Math.round((scoreCompletion / 5) * 100);
  const scoresToUnlock = Math.max(0, 5 - scoreCompletion);
  const impactThisCycle = Math.round(
    (subscriptionPrice * charityPercentage) / 100,
  );
  const projectedYearlyImpact =
    subscriptionPlan === "yearly" ? impactThisCycle : impactThisCycle * 12;
  const nextDrawDate = useMemo(() => {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    ).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }, []);

  const firstScoreDate = useMemo(() => {
    if (!scores.length) return "No scores yet";
    const earliest = scores.reduce((previous, current) => {
      const prevTime = new Date(previous.played_date).getTime();
      const currTime = new Date(current.played_date).getTime();
      return currTime < prevTime ? current : previous;
    });
    return new Date(earliest.played_date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [scores]);

  useEffect(() => {
    setSelectedCharityId(user?.charity_id || "");
    setSelectedCharityPercentage(Number(user?.charity_percentage || 10));
  }, [user?.charity_id, user?.charity_percentage]);

  const saveImpactSettings = async () => {
    if (!session?.access_token) return;

    try {
      setSavingImpactSettings(true);
      setDashboardError("");
      setImpactSuccessMsg("");

      const response = await fetch(buildApiUrl("/auth/me"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          charity_id: selectedCharityId || null,
          charity_percentage: Number(selectedCharityPercentage),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update charity settings");
      }

      await refreshUserData();
      setImpactSuccessMsg("Charity preferences updated successfully.");
    } catch (error) {
      setDashboardError(error.message || "Failed to update charity settings");
    } finally {
      setSavingImpactSettings(false);
    }
  };

  const cancelSubscription = async () => {
    if (!session?.access_token) return;

    if (!window.confirm("Cancel your subscription now?")) {
      return;
    }

    try {
      setSubscriptionActionLoading(true);
      setDashboardError("");
      setSubscriptionActionMsg("");

      const response = await fetch(buildApiUrl("/payments/cancel"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to cancel subscription");
      }

      setSubscriptionActionMsg(
        "Subscription cancelled. You can reactivate anytime.",
      );
      await refreshUserData();
    } catch (error) {
      setDashboardError(error.message || "Failed to cancel subscription");
    } finally {
      setSubscriptionActionLoading(false);
    }
  };

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

  const clearAllNotifications = async () => {
    if (!session?.access_token || isClearingNotifications) return;

    if (!notifications.length) {
      setNotificationActionMsg("No notifications to clear.");
      return;
    }

    if (!window.confirm("Clear all notifications? This cannot be undone.")) {
      return;
    }

    try {
      setIsClearingNotifications(true);
      setDashboardError("");
      setNotificationActionMsg("");

      const response = await fetch(
        buildApiUrl("/draws/notifications/clear-all"),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to clear notifications");
      }

      setNotifications([]);
      setNotificationActionMsg(
        `Cleared ${payload.deleted_count || 0} notifications.`,
      );
    } catch (error) {
      setDashboardError(error.message || "Failed to clear notifications");
    } finally {
      setIsClearingNotifications(false);
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
        <div className="container-max px-4 sm:px-6 lg:px-8 py-6 lg:py-8 mt-16 lg:mt-0">
          <header className="mb-7 flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-2 h-8 bg-brand-500 rounded-full" />
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight uppercase">
                  My{" "}
                  <span className="gradient-text">
                    {activeTab === "overview" ? "Terminal" : activeTab}
                  </span>
                </h1>
              </div>
              <p
                className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-light-subtext"}`}
              >
                {activeTab === "overview" &&
                  "Welcome to your personalized SwingSave portal."}
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
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${
                isDark
                  ? "bg-dark-card border-dark-border"
                  : "bg-white border-light-border"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${user?.subscription_status === "active" ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}
              />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {user?.subscription_status === "active"
                  ? "Active Supporter"
                  : "Pending Reactivation"}
              </span>
            </div>
          </header>

          {!isActiveSubscriber && (
            <div
              className={`mb-8 rounded-2xl border px-6 py-5 ${
                isDark
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-amber-400/40 bg-amber-50"
              }`}
            >
              <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-500 mb-1">
                Limited Access Mode
              </p>
              <p
                className={`text-sm ${isDark ? "text-gray-300" : "text-slate-700"}`}
              >
                You can explore the dashboard and manage your charity settings.
                Score entry, draw history, and notifications unlock after
                subscription activation.
              </p>
              <button
                onClick={() => window.location.assign("/subscribe")}
                className="mt-4 btn-primary !py-2.5 !px-5 text-xs uppercase tracking-[0.14em]"
              >
                Reactivate Subscription
              </button>
            </div>
          )}

          {subscriptionActionMsg && (
            <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4 text-sm text-emerald-500">
              {subscriptionActionMsg}
            </div>
          )}

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
          <div className="animate-fade-in space-y-7">
            {activeTab === "overview" && (
              <div className="space-y-7">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MetricCard
                    isDark={isDark}
                    title={
                      isActiveSubscriber ? subscriptionLabel : "Subscription"
                    }
                    icon={CreditCard}
                    iconClass="bg-blue-500/10 text-blue-500"
                    value={
                      isActiveSubscriber
                        ? formatCurrencyINR(subscriptionPrice)
                        : "Pending"
                    }
                    caption={
                      isActiveSubscriber
                        ? subscriptionPlan === "yearly"
                          ? "Annual plan"
                          : "Monthly billing"
                        : "Activate to start billing"
                    }
                  />
                  <MetricCard
                    isDark={isDark}
                    title={isActiveSubscriber ? "Impact Rate" : "Chosen Impact"}
                    icon={Heart}
                    iconClass="bg-rose-500/10 text-rose-500"
                    value={`${charityPercentage}%`}
                    caption={
                      isActiveSubscriber
                        ? "of every entry fee goes to charity"
                        : "Set now, applied after activation"
                    }
                  />
                  <MetricCard
                    isDark={isDark}
                    title="Active Tickets"
                    icon={Ticket}
                    iconClass="bg-amber-500/10 text-amber-500"
                    value={isActiveSubscriber ? String(drawTickets) : "Locked"}
                    caption={
                      isActiveSubscriber
                        ? drawTickets
                          ? "Eligible for next draw"
                          : "Log 5 scores to enter"
                        : "Unlock after subscription"
                    }
                  />
                  <MetricCard
                    isDark={isDark}
                    title="Live Alerts"
                    icon={Bell}
                    iconClass="bg-brand-500/10 text-brand-500"
                    value={
                      isActiveSubscriber
                        ? String(unreadNotifications)
                        : "Locked"
                    }
                    caption={
                      isActiveSubscriber
                        ? "Unread system updates"
                        : "Unlock after subscription"
                    }
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">
                  <div className="xl:col-span-3 h-full flex flex-col gap-4">
                    <LatestFiveScoreBoard
                      isDark={isDark}
                      scores={latestFiveScores}
                      loading={scoresLoading}
                      className="flex-1"
                    />
                    {isActiveSubscriber ? (
                      <button
                        onClick={() => setActiveTab("scores")}
                        className="w-full py-3 rounded-xl border border-dashed border-gray-300 dark:border-dark-border text-xs font-bold uppercase tracking-widest hover:bg-brand-500/5 hover:text-brand-500 transition-all"
                      >
                        View and manage score history ({scores.length})
                      </button>
                    ) : (
                      <AccessLockedPanel isDark={isDark} compact />
                    )}
                  </div>
                  <div className="xl:col-span-2 h-full">
                    {isActiveSubscriber ? (
                      <ScoreEntry
                        onAddScore={addScore}
                        loading={scoresLoading}
                        stretch
                        className="h-full"
                      />
                    ) : (
                      <AccessLockedPanel isDark={isDark} />
                    )}
                  </div>
                </div>

                {isActiveSubscriber && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg sm:text-xl font-black tracking-tight">
                        Winning History
                      </h3>
                      <button
                        onClick={() => setActiveTab("notifications")}
                        className="text-[10px] font-bold uppercase tracking-wider text-brand-500 hover:text-brand-400"
                      >
                        View Alerts
                      </button>
                    </div>

                    {metaLoading ? (
                      <div className="flex justify-center py-16">
                        <Loader2
                          className="animate-spin text-brand-500"
                          size={32}
                        />
                      </div>
                    ) : wins.length === 0 ? (
                      <div className="text-center py-12 bg-dark-card/20 rounded-2xl border border-dashed border-dark-border">
                        <Trophy
                          className="mx-auto text-gray-700 mb-3"
                          size={32}
                        />
                        <h4 className="text-base font-bold mb-1">
                          No wins recorded yet
                        </h4>
                        <p className="text-sm text-gray-500">
                          Log scores to enter future draws. Your winning tickets
                          will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {wins.map((win) => (
                          <div
                            key={win.id}
                            className={`p-5 rounded-2xl border ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
                          >
                            <div className="flex flex-col xl:flex-row justify-between gap-5">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2.5">
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
                                      win.payment_status === "paid"
                                        ? "blue"
                                        : "slate"
                                    }
                                  />
                                </div>
                                <h3 className="text-2xl font-black">
                                  {formatCurrencyINR(win.amount || 0)}
                                </h3>
                                <p className="text-gray-500 text-xs sm:text-sm italic">
                                  {win.prize_tier}-number match
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:pt-2">
                                  <WinBadge
                                    label="Winning Numbers"
                                    value={formatNumberSeries(
                                      win.draws?.winning_numbers,
                                    )}
                                  />
                                  <WinBadge
                                    label="Your Match"
                                    value={formatMatchedNumbersForWin(win)}
                                    color="text-brand-500"
                                  />
                                  <WinBadge
                                    label="Ticket Hash"
                                    value={win.id?.slice(0, 8)}
                                  />
                                </div>
                              </div>

                              <div className="xl:w-72 space-y-3 pt-2 xl:pt-0">
                                {win.payment_status === "paid" ? (
                                  <div
                                    className={`rounded-xl border px-4 py-3 text-center text-xs font-black uppercase tracking-widest ${
                                      isDark
                                        ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                        : "border-blue-200 bg-blue-50 text-blue-600"
                                    }`}
                                  >
                                    Payment Completed
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                      Verification Action
                                    </p>
                                    {win.rejection_reason && (
                                      <p className="text-sm font-bold text-red-500">
                                        {win.rejection_reason}
                                      </p>
                                    )}

                                    <label
                                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest cursor-pointer transition-all ${
                                        isDark
                                          ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                                          : "bg-black text-white hover:bg-gray-800"
                                      }`}
                                    >
                                      {uploadingWinnerId === win.id ? (
                                        <Loader2
                                          className="animate-spin"
                                          size={18}
                                        />
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
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}

            {activeTab === "scores" &&
              (isActiveSubscriber ? (
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
              ) : (
                <AccessLockedPanel isDark={isDark} />
              ))}

            {activeTab === "impact" && (
              <section
                className={`glass-card rounded-2xl border overflow-hidden ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
              >
                <div className="p-5 sm:p-6">
                  {metaLoading ? (
                    <div className="flex justify-center py-20">
                      <Loader2
                        className="animate-spin text-brand-500"
                        size={40}
                      />
                    </div>
                  ) : chosenCharity ? (
                    <div className="mx-auto w-full max-w-3xl space-y-4">
                      <article
                        className={`rounded-2xl border overflow-hidden ${
                          isDark
                            ? "bg-[#0f1a34] border-emerald-500/40"
                            : "bg-white border-emerald-300 shadow-sm"
                        }`}
                      >
                        <div className="relative border-b border-black/10">
                          <div className="aspect-[16/7] sm:aspect-[16/6]">
                            {chosenCharity.image_url ? (
                              <img
                                src={chosenCharity.image_url}
                                alt={chosenCharity.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div
                                className={`h-full w-full ${
                                  isDark
                                    ? "bg-[linear-gradient(130deg,#1d3b66_0%,#355f94_50%,#264b79_100%)]"
                                    : "bg-[linear-gradient(130deg,#bfdbfe_0%,#93c5fd_60%,#bfdbfe_100%)]"
                                }`}
                              />
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/5" />
                        </div>

                        <div className="px-4 py-3 sm:px-5 sm:py-4">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg sm:text-xl font-black tracking-tight truncate">
                              {chosenCharity.name}
                            </h3>
                            <p
                              className={`text-lg sm:text-xl font-black shrink-0 ${
                                isDark ? "text-emerald-400" : "text-emerald-600"
                              }`}
                            >
                              {formatCurrencyINR(
                                chosenCharity.total_raised || 0,
                              )}
                            </p>
                          </div>
                          <p
                            className={`mt-1 text-[11px] uppercase tracking-[0.14em] font-bold ${
                              isDark ? "text-gray-500" : "text-gray-500"
                            }`}
                          >
                            Community total raised
                          </p>
                        </div>
                      </article>

                      <article
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "bg-dark-card border-dark-border"
                            : "bg-white border-light-border shadow-sm"
                        }`}
                      >
                        <h4 className="font-black text-xs uppercase tracking-[0.14em] mb-3 flex items-center gap-2">
                          <Heart className="text-brand-500" size={15} />
                          My Charity Settings
                        </h4>

                        <div className="mb-3 rounded-xl border p-3 bg-black/[0.02] dark:bg-white/[0.02] border-black/10 dark:border-white/10 space-y-3">
                          <div className="relative">
                            <Search
                              size={14}
                              className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                                isDark ? "text-gray-500" : "text-gray-400"
                              }`}
                            />
                            <input
                              value={impactCharitySearch}
                              onChange={(e) =>
                                setImpactCharitySearch(e.target.value)
                              }
                              placeholder="Search charities"
                              className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm outline-none ${
                                isDark
                                  ? "bg-[#0a132b] border-dark-border text-white"
                                  : "bg-white border-light-border text-slate-800"
                              }`}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <label
                              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold ${
                                isDark
                                  ? "border-dark-border text-gray-300"
                                  : "border-light-border text-slate-700"
                              }`}
                            >
                              Spotlight only
                              <input
                                type="checkbox"
                                checked={impactSpotlightOnly}
                                onChange={(e) =>
                                  setImpactSpotlightOnly(e.target.checked)
                                }
                              />
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={impactMinRaised}
                              onChange={(e) =>
                                setImpactMinRaised(Number(e.target.value) || 0)
                              }
                              placeholder="Min raised"
                              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                                isDark
                                  ? "bg-[#0a132b] border-dark-border text-white"
                                  : "bg-white border-light-border text-slate-800"
                              }`}
                            />
                          </div>

                          <p
                            className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-500"}`}
                          >
                            {impactFilteredCharities.length} charities match
                            your filters.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label
                              className={`text-[11px] font-bold uppercase tracking-[0.12em] ${isDark ? "text-gray-500" : "text-gray-500"}`}
                            >
                              Selected Charity
                            </label>
                            <select
                              value={selectedCharityId}
                              onChange={(e) =>
                                setSelectedCharityId(e.target.value)
                              }
                              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none ${
                                isDark
                                  ? "bg-[#0a132b] border-dark-border text-white"
                                  : "bg-white border-light-border text-slate-800"
                              }`}
                            >
                              <option value="">No charity selected</option>
                              {impactFilteredCharities.map((charity) => (
                                <option key={charity.id} value={charity.id}>
                                  {charity.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label
                              className={`text-[11px] font-bold uppercase tracking-[0.12em] ${isDark ? "text-gray-500" : "text-gray-500"}`}
                            >
                              Contribution %
                            </label>
                            <input
                              type="number"
                              min="10"
                              max="100"
                              value={selectedCharityPercentage}
                              onChange={(e) =>
                                setSelectedCharityPercentage(
                                  Math.max(
                                    10,
                                    Math.min(100, Number(e.target.value) || 10),
                                  ),
                                )
                              }
                              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none ${
                                isDark
                                  ? "bg-[#0a132b] border-dark-border text-white"
                                  : "bg-white border-light-border text-slate-800"
                              }`}
                            />
                          </div>
                        </div>

                        <button
                          onClick={saveImpactSettings}
                          disabled={savingImpactSettings}
                          className="w-full sm:w-auto btn-primary !py-2.5 !px-5 text-xs uppercase tracking-[0.14em] disabled:opacity-60"
                        >
                          {savingImpactSettings
                            ? "Saving..."
                            : "Update Charity"}
                        </button>
                        {impactSuccessMsg && (
                          <p className="mt-2 text-xs text-green-500 font-semibold">
                            {impactSuccessMsg}
                          </p>
                        )}
                        <p
                          className={`mt-2 text-[11px] ${isDark ? "text-gray-500" : "text-gray-500"}`}
                        >
                          You can switch charity and adjust contribution
                          percentage here (minimum 10%).
                        </p>
                      </article>
                    </div>
                  ) : (
                    <p className="text-center py-20 text-gray-500">
                      No charity assigned.
                    </p>
                  )}
                </div>
              </section>
            )}

            {activeTab === "wins" &&
              (isActiveSubscriber ? (
                <div className="space-y-6">
                  {metaLoading ? (
                    <div className="flex justify-center py-20">
                      <Loader2
                        className="animate-spin text-brand-500"
                        size={40}
                      />
                    </div>
                  ) : wins.length === 0 ? (
                    <div className="text-center py-16 bg-dark-card/20 rounded-2xl border border-dashed border-dark-border">
                      <Trophy
                        className="mx-auto text-gray-700 mb-4"
                        size={36}
                      />
                      <h3 className="text-lg font-bold mb-2">
                        No wins recorded yet
                      </h3>
                      <p className="text-sm text-gray-500">
                        Log scores to enter future draws. Your winning tickets
                        will appear here.
                      </p>
                    </div>
                  ) : (
                    wins.map((win) => (
                      <div
                        key={win.id}
                        className={`p-5 rounded-2xl border ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
                      >
                        <div className="flex flex-col xl:flex-row justify-between gap-5">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
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
                                  win.payment_status === "paid"
                                    ? "blue"
                                    : "slate"
                                }
                              />
                            </div>
                            <h3 className="text-2xl font-black">
                              {formatCurrencyINR(win.amount || 0)}
                            </h3>
                            <p className="text-gray-500 text-xs sm:text-sm italic">
                              {win.prize_tier}-number match
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:pt-2">
                              <WinBadge
                                label="Winning Numbers"
                                value={formatNumberSeries(
                                  win.draws?.winning_numbers,
                                )}
                              />
                              <WinBadge
                                label="Your Match"
                                value={formatMatchedNumbersForWin(win)}
                                color="text-brand-500"
                              />
                              <WinBadge
                                label="Ticket Hash"
                                value={win.id?.slice(0, 8)}
                              />
                            </div>
                          </div>

                          <div className="xl:w-72 space-y-3 pt-2 xl:pt-0">
                            {win.payment_status === "paid" ? (
                              <div
                                className={`rounded-xl border px-4 py-3 text-center text-xs font-black uppercase tracking-widest ${
                                  isDark
                                    ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                    : "border-blue-200 bg-blue-50 text-blue-600"
                                }`}
                              >
                                Payment Completed
                              </div>
                            ) : (
                              <>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                  Verification Action
                                </p>
                                {win.rejection_reason && (
                                  <p className="text-sm font-bold text-red-500">
                                    {win.rejection_reason}
                                  </p>
                                )}

                                <label
                                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest cursor-pointer transition-all ${
                                    isDark
                                      ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                                      : "bg-black text-white hover:bg-gray-800"
                                  }`}
                                >
                                  {uploadingWinnerId === win.id ? (
                                    <Loader2
                                      className="animate-spin"
                                      size={18}
                                    />
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
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <AccessLockedPanel isDark={isDark} />
              ))}

            {activeTab === "notifications" &&
              (isActiveSubscriber ? (
                <div className="max-w-4xl space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={clearAllNotifications}
                      disabled={
                        isClearingNotifications || notifications.length === 0
                      }
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                        isDark
                          ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-40"
                          : "bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"
                      }`}
                    >
                      {isClearingNotifications
                        ? "Clearing..."
                        : "Clear All Notifications"}
                    </button>
                  </div>

                  {notificationActionMsg && (
                    <p className="text-xs font-semibold text-green-500">
                      {notificationActionMsg}
                    </p>
                  )}

                  {metaLoading ? (
                    <div className="flex justify-center py-20">
                      <Loader2
                        className="animate-spin text-brand-500"
                        size={40}
                      />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-16 bg-dark-card/20 rounded-2xl border border-dashed border-dark-border">
                      <Bell
                        className="mx-auto text-gray-700 mb-4 opacity-50"
                        size={34}
                      />
                      <p className="text-sm text-gray-500">
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
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          n.is_read
                            ? isDark
                              ? "bg-dark-card/40 border-dark-border opacity-70"
                              : "bg-gray-50 border-light-border"
                            : "bg-brand-500/5 border-brand-500/30 shadow-lg shadow-brand-500/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="font-black uppercase tracking-tight text-sm sm:text-base">
                              {n.title || "System Alert"}
                            </div>
                            <p
                              className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-light-subtext"}`}
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
              ) : (
                <AccessLockedPanel isDark={isDark} />
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function AccessLockedPanel({ isDark, compact = false }) {
  return (
    <div
      className={`rounded-xl border p-5 ${compact ? "" : "min-h-[220px]"} flex flex-col items-start justify-center gap-2.5 ${
        isDark
          ? "bg-dark-card border-dark-border"
          : "bg-white border-light-border shadow-sm"
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
        <Lock size={16} />
      </div>
      <h3 className="text-base font-black">Locked Until Subscription</h3>
      <p
        className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
      >
        You can explore this dashboard section now. Activate your subscription
        to unlock score management, winner history, and notifications.
      </p>
      <a
        href="/subscribe"
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-brand-500 hover:text-brand-400"
      >
        Go to Subscribe <ArrowRight size={14} />
      </a>
    </div>
  );
}

function MetricCard({ title, icon: Icon, iconClass, value, caption, isDark }) {
  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-300 group ${isDark ? "bg-dark-card border-dark-border hover:border-brand-500/40" : "bg-white border-light-border shadow-sm hover:shadow-lg hover:shadow-brand-500/5"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className={`text-xs sm:text-sm font-medium ${isDark ? "text-gray-400" : "text-light-subtext"}`}
        >
          {title}
        </h3>
        <div className={`p-2 rounded-lg transition-colors ${iconClass}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-0.5">
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p
        className={`text-xs sm:text-sm ${isDark ? "text-gray-500" : "text-light-subtext"}`}
      >
        {caption}
      </p>
    </div>
  );
}

function ImpactMiniCard({ isDark, label, value, icon: Icon, iconTone }) {
  return (
    <div
      className={`rounded-2xl border p-3.5 ${
        isDark
          ? "bg-dark-card border-dark-border"
          : "bg-white border-light-border shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className={`text-[10px] font-black uppercase tracking-[0.14em] ${isDark ? "text-gray-500" : "text-gray-500"}`}
        >
          {label}
        </p>
        <Icon size={15} className={iconTone} />
      </div>
      <p className="text-lg font-black leading-none">{value}</p>
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
      <p className={`text-xs sm:text-sm font-bold ${color || "text-current"}`}>
        {value}
      </p>
    </div>
  );
}

function LatestFiveScoreBoard({ isDark, scores, loading, className = "" }) {
  const slots = Array.from({ length: 5 }, (_, index) => scores[index] || null);

  return (
    <section
      className={`rounded-2xl border p-4 sm:p-5 ${isDark ? "bg-[#081538] border-[#1a2f5f]" : "bg-[#eef4ff] border-[#c9d9ff]"} ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3
          className={`flex items-center gap-2 text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-[#0d1f4a]"}`}
        >
          <Clock className="text-indigo-500" size={24} />
          Latest 5 Scores
        </h3>
        <span
          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isDark ? "bg-[#020b27] border-[#1a2f5f] text-[#7f95d7]" : "bg-white border-[#c9d9ff] text-[#3354a8]"}`}
        >
          Stableford
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-3.5">
        {slots.map((slot, index) => (
          <div
            key={slot?.id || `score-slot-${index}`}
            className={`h-32 rounded-2xl border-2 border-dashed flex items-center justify-center ${isDark ? "border-[#1d315f] bg-[#0a1a42]" : "border-[#b3c6f7] bg-[#e5edff]"}`}
          >
            {loading ? (
              <Loader2
                className={`animate-spin ${isDark ? "text-[#5473be]" : "text-[#4a67ae]"}`}
                size={22}
              />
            ) : slot ? (
              <div className="text-center">
                <p
                  className={`text-3xl sm:text-4xl font-black leading-none ${isDark ? "text-white" : "text-[#10295f]"}`}
                >
                  {slot.score}
                </p>
                <p
                  className={`mt-1.5 text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7f95d7]" : "text-[#4a67ae]"}`}
                >
                  {new Date(slot.played_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ) : (
              <span
                className={`text-3xl sm:text-4xl font-black leading-none ${isDark ? "text-[#1d315f]" : "text-[#8aa1d8]"}`}
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
