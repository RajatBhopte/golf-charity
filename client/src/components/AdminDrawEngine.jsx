import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Trophy,
  Settings2,
  Play,
  Send,
  Loader2,
  Info,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { buildApiUrl } from "../utils/apiBase";
import { formatCurrencyINR } from "../utils/currency";

const TIER_ORDER = ["tier_5", "tier_4", "tier_3"];
const TIER_STYLES = {
  tier_5: {
    badge: "bg-amber-500/20 text-amber-500",
    text: "text-amber-500",
  },
  tier_4: {
    badge: "bg-slate-400/20 text-slate-400",
    text: "text-slate-400",
  },
  tier_3: {
    badge: "bg-orange-700/20 text-orange-700",
    text: "text-orange-700",
  },
};

const getCurrentMonthValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const toMonthStart = (monthValue) => {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) {
    return null;
  }
  return `${monthValue}-01`;
};

const formatNumberSeries = (numbers = []) =>
  Array.isArray(numbers) && numbers.length ? numbers.join(" · ") : "None";

export default function AdminDrawEngine({ isDark }) {
  const { session } = useAuth();
  const [config, setConfig] = useState({
    type: "algorithmic",
    weighting: "most",
    month_year: getCurrentMonthValue(),
  });
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const runSimulation = async () => {
    if (!session) return;
    const monthStart = toMonthStart(config.month_year);
    if (!monthStart) {
      setError(
        "Please choose a valid draw month before running the simulation.",
      );
      setSimulation(null);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl("/admin/draws/simulate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...config,
          month_year: monthStart,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to run simulation");
      }
      setSimulation(data);
      if (!data.eligible_participants) {
        setNotice(
          "No eligible participants have logged five scores for this draw month yet.",
        );
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const publishDraw = async () => {
    if (
      !simulation ||
      !session ||
      !confirm(
        "Are you sure you want to publish these results officialy? This will notify winners and lock the draw.",
      )
    )
      return;
    const monthStart = toMonthStart(config.month_year);
    if (!monthStart) {
      setError("Please choose a valid draw month before publishing.");
      return;
    }
    if (!simulation?.winning_numbers?.length) {
      setError(
        "Run a simulation before publishing the official winning numbers.",
      );
      return;
    }

    setPublishing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl("/admin/draws/publish"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          month_year: monthStart,
          winning_numbers: simulation.winning_numbers,
          settings: {
            type: config.type,
            weighting: config.weighting,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to publish draw");
      }
      setNotice(
        `Draw published successfully with ${data.winner_count || 0} recorded winners.`,
      );
      setSimulation(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Configuration Card */}
      <div
        className={`glass-card p-6 rounded-2xl border ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <Settings2 className="text-brand-500" size={24} />
          <h2 className="text-xl font-bold">Draw Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-wider opacity-50">
              Draw Month
            </label>
            <input
              type="month"
              value={config.month_year}
              onChange={(e) =>
                setConfig({ ...config, month_year: e.target.value })
              }
              className={`w-full px-4 py-4 rounded-xl border ${isDark ? "bg-dark-bg border-dark-border" : "bg-gray-50 border-light-border"}`}
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-wider opacity-50">
              Draw Methodology
            </label>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setConfig({ ...config, type: "random" })}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  config.type === "random"
                    ? "border-brand-500 bg-brand-500/5"
                    : isDark
                      ? "border-dark-border"
                      : "border-light-border"
                }`}
              >
                <div className="text-left">
                  <div className="font-bold">Pure Random</div>
                  <div className="text-xs opacity-60">
                    Equal chance for all eligible users
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${config.type === "random" ? "border-brand-500" : "border-gray-500"}`}
                >
                  {config.type === "random" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                  )}
                </div>
              </button>
              <button
                onClick={() => setConfig({ ...config, type: "algorithmic" })}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  config.type === "algorithmic"
                    ? "border-brand-500 bg-brand-500/5"
                    : isDark
                      ? "border-dark-border"
                      : "border-light-border"
                }`}
              >
                <div className="text-left">
                  <div className="font-bold">Algorithmic Weighted</div>
                  <div className="text-xs opacity-60">
                    Favors frequency or consistency
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${config.type === "algorithmic" ? "border-brand-500" : "border-gray-500"}`}
                >
                  {config.type === "algorithmic" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-wider opacity-50">
              Algorithmic Weighting
            </label>
            <div
              className={`flex flex-col gap-2 ${config.type !== "algorithmic" ? "opacity-30 pointer-events-none" : ""}`}
            >
              <button
                onClick={() => setConfig({ ...config, weighting: "most" })}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  config.weighting === "most"
                    ? "border-blue-500 bg-blue-500/5"
                    : isDark
                      ? "border-dark-border"
                      : "border-light-border"
                }`}
              >
                <div className="text-left">
                  <div className="font-bold text-blue-500">Most Frequent</div>
                  <div className="text-xs opacity-60">
                    Reward active users (More scores = More entries)
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${config.weighting === "most" ? "border-blue-500" : "border-gray-500"}`}
                >
                  {config.weighting === "most" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  )}
                </div>
              </button>
              <button
                onClick={() => setConfig({ ...config, weighting: "least" })}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  config.weighting === "least"
                    ? isDark
                      ? "border-amber-500 bg-amber-500/5"
                      : "border-amber-600 bg-amber-50"
                    : isDark
                      ? "border-dark-border"
                      : "border-light-border"
                }`}
              >
                <div className="text-left">
                  <div
                    className={`font-bold ${isDark ? "text-amber-400" : "text-amber-700"}`}
                  >
                    Least Frequent
                  </div>
                  <div className="text-xs opacity-60">
                    Anti-monopoly boost (Newer/Casual players get a tailwind)
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${config.weighting === "least" ? "border-amber-500" : "border-gray-500"}`}
                >
                  {config.weighting === "least" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}
        {notice && (
          <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
            {notice}
          </div>
        )}

        <button
          onClick={runSimulation}
          disabled={loading}
          className="btn-primary w-full mt-8 flex items-center justify-center gap-2 py-4 text-lg"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
          Run Simulation / Pre-Analysis
        </button>
      </div>

      {simulation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Pools Info */}
          <div className="lg:col-span-1 space-y-6 lg:space-y-0 lg:h-full lg:grid lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-6">
            <div
              className={`glass-card p-6 rounded-2xl border ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
            >
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Info size={18} className="text-blue-500" /> Draw Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="opacity-50">Draw Month:</span>{" "}
                  <span className="font-bold">{simulation.month_label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-50">Active Subs:</span>{" "}
                  <span className="font-bold">
                    {simulation.total_participants}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-50">
                    Eligible (5 stored scores):
                  </span>{" "}
                  <span className="font-bold text-brand-500">
                    {simulation.eligible_participants}
                  </span>
                </div>
                <div className="pt-3 border-t border-white/5">
                  <div className="text-xs uppercase tracking-widest opacity-50 mb-2">
                    Winning Numbers
                  </div>
                  <div className="font-black text-xl tracking-wide">
                    {formatNumberSeries(simulation.winning_numbers)}
                  </div>
                </div>
                {Number(simulation.incoming_jackpot_rollover || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="opacity-50">
                      Incoming Jackpot Rollover:
                    </span>
                    <span
                      className={`font-bold ${isDark ? "text-amber-400" : "text-amber-700"}`}
                    >
                      {formatCurrencyINR(simulation.incoming_jackpot_rollover)}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t border-white/5 flex justify-between items-end">
                  <span className="opacity-50">Total Prize Pool:</span>
                  <span className="text-2xl font-bold">
                    {formatCurrencyINR(simulation.total_pool || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`glass-card p-5 rounded-2xl border lg:h-full lg:flex lg:flex-col ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
            >
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-brand-500" /> Pool Splits
              </h3>
              <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-rows-3 lg:gap-2.5 lg:h-full">
                {TIER_ORDER.map((key) => {
                  const breakdown = simulation.prize_breakdown?.[key];
                  const percent = simulation.pool_split?.[key] || 0;
                  const accentClasses =
                    key === "tier_5"
                      ? isDark
                        ? "text-amber-400"
                        : "text-amber-700"
                      : key === "tier_4"
                        ? isDark
                          ? "text-slate-300"
                          : "text-slate-700"
                        : isDark
                          ? "text-orange-400"
                          : "text-orange-700";

                  const progressClasses =
                    key === "tier_5"
                      ? "bg-amber-500"
                      : key === "tier_4"
                        ? "bg-slate-500"
                        : "bg-orange-600";

                  return (
                    <div
                      key={key}
                      className={`rounded-xl border p-3 lg:h-full lg:flex lg:flex-col lg:justify-between ${isDark ? "bg-black/20 border-dark-border" : "bg-gray-50 border-light-border"}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span
                          className={`text-xs uppercase font-bold tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                          {key.replace("_", " ")} Match
                        </span>
                        <span className={`text-xs font-bold ${accentClasses}`}>
                          {percent * 100}%
                        </span>
                      </div>

                      <div
                        className={`h-1.5 rounded-full overflow-hidden mb-2.5 ${isDark ? "bg-white/10" : "bg-gray-200"}`}
                      >
                        <div
                          className={`h-full ${progressClasses}`}
                          style={{
                            width: `${Math.max(6, Math.round(percent * 100))}%`,
                          }}
                        />
                      </div>

                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="text-2xl font-black leading-none">
                            {formatCurrencyINR(
                              breakdown?.total_pool_amount || 0,
                            )}
                          </div>
                          <div
                            className={`mt-1.5 text-[11px] uppercase tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}
                          >
                            Per winner:{" "}
                            {formatCurrencyINR(
                              breakdown?.per_winner_amount || 0,
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}
                          >
                            {breakdown?.winner_count || 0} winner(s)
                          </div>
                        </div>
                      </div>

                      {Number(breakdown?.rollover_amount || 0) > 0 && (
                        <div
                          className={`mt-2 text-[11px] font-bold uppercase tracking-widest ${isDark ? "text-amber-400" : "text-amber-700"}`}
                        >
                          Rolls over:{" "}
                          {formatCurrencyINR(breakdown.rollover_amount)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Winners Simulation */}
          <div className="lg:col-span-2 space-y-6">
            <div
              className={`glass-card p-6 rounded-2xl border overflow-hidden relative ${isDark ? "bg-dark-card border-dark-border" : "bg-white border-light-border shadow-sm"}`}
            >
              <div
                className={`absolute top-0 right-0 p-3 text-[10px] uppercase font-black tracking-widest border-l border-b ${isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-100 text-amber-700 border-amber-200"}`}
              >
                Simulated Results
              </div>
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <Trophy
                  size={18}
                  className={isDark ? "text-amber-400" : "text-amber-700"}
                />{" "}
                Match Results
              </h3>
              <div className="space-y-4">
                {TIER_ORDER.map((tier) => {
                  const breakdown = simulation.prize_breakdown?.[tier];
                  const styles = TIER_STYLES[tier];
                  return (
                    <div
                      key={tier}
                      className={`p-4 rounded-xl border ${isDark ? "bg-black/20 border-white/5" : "bg-gray-50 border-gray-100"}`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black ${styles.badge}`}
                        >
                          {tier.split("_")[1]}
                        </div>
                        <div className="flex-grow">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <div className="font-bold">
                                {tier.replace("_", " ")} Match
                              </div>
                              <div className="text-xs opacity-50">
                                {breakdown?.winner_count || 0} winner(s) ·{" "}
                                {formatCurrencyINR(
                                  breakdown?.per_winner_amount || 0,
                                )}{" "}
                                each
                              </div>
                            </div>
                            <div className={`text-sm font-bold ${styles.text}`}>
                              Total tier pool:{" "}
                              {formatCurrencyINR(
                                breakdown?.total_pool_amount || 0,
                              )}
                            </div>
                          </div>

                          {breakdown?.winner_count ? (
                            <div className="mt-4 space-y-3">
                              {breakdown.winners.map((winner) => (
                                <div
                                  key={`${tier}-${winner.id}`}
                                  className={`rounded-xl border px-4 py-3 ${isDark ? "border-dark-border bg-dark-bg/50" : "border-light-border bg-white"}`}
                                >
                                  <div className="font-bold">
                                    {winner.full_name || "Unknown player"}
                                  </div>
                                  <div className="text-xs opacity-50">
                                    {winner.email || "No email"}
                                  </div>
                                  <div className="mt-2 text-xs opacity-70">
                                    Submitted Scores:{" "}
                                    {formatNumberSeries(
                                      winner.submitted_scores,
                                    )}
                                  </div>
                                  <div className="text-xs font-semibold text-brand-500">
                                    Matched Numbers:{" "}
                                    {formatNumberSeries(winner.matched_numbers)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 text-sm opacity-60">
                              No players matched this tier in the current
                              simulation.
                              {tier === "tier_5" &&
                              Number(breakdown?.rollover_amount || 0) > 0
                                ? ` Jackpot rollover: ${formatCurrencyINR(breakdown.rollover_amount)}.`
                                : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
                <AlertTriangle
                  className={`shrink-0 ${isDark ? "text-amber-400" : "text-amber-700"}`}
                  size={20}
                />
                <p
                  className={`text-xs leading-relaxed ${isDark ? "text-amber-300/90" : "text-amber-800"}`}
                >
                  <strong>Simulation Disclaimer:</strong> These numbers and
                  match groups are preview results only. Publishing stores the
                  winning numbers and recomputes winners from those official
                  numbers.
                </p>
              </div>

              <button
                onClick={publishDraw}
                disabled={
                  publishing ||
                  !simulation?.winning_numbers?.length ||
                  !simulation?.eligible_participants
                }
                className="w-full mt-6 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-brand-500/20 transition-all hover:scale-[1.01]"
              >
                {publishing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
                Publish Results & Notify Winners
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
