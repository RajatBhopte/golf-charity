import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Heart, HandCoins, Loader2 } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { formatCurrencyINR } from "../utils/currency";

export default function Charities() {
  const { isDark } = useTheme();
  const { session } = useAuth();
  const navigate = useNavigate();

  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [spotlightOnly, setSpotlightOnly] = useState(false);
  const [minRaised, setMinRaised] = useState(0);

  const [donationValues, setDonationValues] = useState({});
  const [donatingId, setDonatingId] = useState("");
  const [donationMsg, setDonationMsg] = useState("");
  const [donations, setDonations] = useState([]);

  const fetchCharities = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/charities", {
        params: {
          q: query || undefined,
          spotlight: spotlightOnly ? "true" : undefined,
          min_raised: minRaised > 0 ? String(minRaised) : undefined,
        },
      });
      setCharities(
        Array.isArray(response.data?.charities) ? response.data.charities : [],
      );
    } catch (fetchError) {
      setError(fetchError.response?.data?.error || "Failed to load charities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchDonations = async () => {
      if (!session?.access_token) {
        setDonations([]);
        return;
      }

      try {
        const response = await api.get("/charities/donations/mine");
        setDonations(
          Array.isArray(response.data?.donations)
            ? response.data.donations
            : [],
        );
      } catch {
        setDonations([]);
      }
    };

    fetchDonations();
  }, [session?.access_token]);

  const spotlightCount = useMemo(
    () => charities.filter((c) => c.is_spotlight).length,
    [charities],
  );

  const submitDonation = async (charityId) => {
    const rawValue = donationValues[charityId];
    const amount = Number(rawValue);

    if (!session?.access_token) {
      navigate("/login");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setDonationMsg("Enter a valid donation amount.");
      return;
    }

    setDonationMsg("");
    setDonatingId(charityId);

    try {
      const response = await api.post(`/charities/${charityId}/donate`, {
        amount,
        currency: "INR",
      });

      setDonationMsg(
        response.data?.message || "Donation submitted successfully.",
      );
      setDonationValues((prev) => ({ ...prev, [charityId]: "" }));
      await fetchCharities();
      if (session?.access_token) {
        const donationHistory = await api.get("/charities/donations/mine");
        setDonations(
          Array.isArray(donationHistory.data?.donations)
            ? donationHistory.data.donations
            : [],
        );
      }
    } catch (donationError) {
      setDonationMsg(
        donationError.response?.data?.error ||
          "Donation failed. Please try again.",
      );
    } finally {
      setDonatingId("");
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-dark-bg" : "bg-light-bg"}`}>
      <Navbar />

      <main className="container-max px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <section className="mb-6">
            <h1
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                isDark ? "text-white" : "text-light-text"
              }`}
            >
              Charity Directory
            </h1>
            <p
              className={`mt-1.5 text-xs sm:text-sm ${
                isDark ? "text-gray-400" : "text-light-subtext"
              }`}
            >
              Discover vetted causes, filter by impact, and make one-time
              donations anytime.
            </p>
          </section>

          <section
            className={`rounded-xl border p-3.5 sm:p-4 mb-5 ${
              isDark
                ? "bg-dark-card border-dark-border"
                : "bg-white border-light-border"
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              <div className="md:col-span-2 relative">
                <Search
                  size={14}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by charity name"
                  className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs sm:text-sm outline-none transition ${
                    isDark
                      ? "bg-dark-bg border-dark-border text-white placeholder:text-gray-500"
                      : "bg-light-bg border-light-border text-light-text placeholder:text-gray-400"
                  }`}
                />
              </div>

              <input
                type="number"
                min="0"
                value={minRaised}
                onChange={(e) => setMinRaised(Number(e.target.value || 0))}
                placeholder="Min raised"
                className={`w-full px-3 py-2 rounded-lg border text-xs sm:text-sm outline-none transition ${
                  isDark
                    ? "bg-dark-bg border-dark-border text-white"
                    : "bg-light-bg border-light-border text-light-text"
                }`}
              />

              <label
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs sm:text-sm ${
                  isDark
                    ? "border-dark-border text-gray-300"
                    : "border-light-border text-light-subtext"
                }`}
              >
                Spotlight only
                <input
                  type="checkbox"
                  checked={spotlightOnly}
                  onChange={(e) => setSpotlightOnly(e.target.checked)}
                />
              </label>
            </div>

            <div className="mt-2.5 flex items-center gap-2.5">
              <button
                onClick={fetchCharities}
                className="btn-primary !px-4 !py-2 text-xs sm:text-sm"
                disabled={loading}
              >
                {loading ? "Searching..." : "Apply Filters"}
              </button>
              <span
                className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}
              >
                Spotlight results: {spotlightCount}
              </span>
            </div>
          </section>

          {error && (
            <div className="mb-3.5 rounded-lg border border-red-300/40 bg-red-500/10 px-3.5 py-2.5 text-xs sm:text-sm text-red-500">
              {error}
            </div>
          )}

          {donationMsg && (
            <div className="mb-3.5 rounded-lg border border-brand-300/40 bg-brand-500/10 px-3.5 py-2.5 text-xs sm:text-sm text-brand-500">
              {donationMsg}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-brand-500">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {charities.map((charity) => (
                <article
                  key={charity.id}
                  className={`rounded-xl border p-4 ${
                    isDark
                      ? "bg-dark-card border-dark-border"
                      : "bg-white border-light-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2
                        className={`text-base font-bold ${isDark ? "text-white" : "text-light-text"}`}
                      >
                        {charity.name}
                      </h2>
                      <p
                        className={`text-xs sm:text-sm mt-1 ${isDark ? "text-gray-400" : "text-light-subtext"}`}
                      >
                        {charity.description || "No description available."}
                      </p>
                    </div>
                    {charity.is_spotlight && (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-500">
                        Spotlight
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div
                      className={`rounded-lg px-2.5 py-1.5 ${
                        isDark
                          ? "bg-dark-bg text-gray-300"
                          : "bg-light-bg text-light-subtext"
                      }`}
                    >
                      <div className="opacity-70">Raised</div>
                      <div className="font-semibold mt-0.5">
                        {formatCurrencyINR(Number(charity.total_raised || 0))}
                      </div>
                    </div>
                    <div
                      className={`rounded-lg px-2.5 py-1.5 ${
                        isDark
                          ? "bg-dark-bg text-gray-300"
                          : "bg-light-bg text-light-subtext"
                      }`}
                    >
                      <div className="opacity-70">Subscribers</div>
                      <div className="font-semibold mt-0.5">
                        {charity.subscriber_count || 0}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Amount"
                      value={donationValues[charity.id] || ""}
                      onChange={(e) =>
                        setDonationValues((prev) => ({
                          ...prev,
                          [charity.id]: e.target.value,
                        }))
                      }
                      className={`flex-1 px-3 py-1.5 rounded-lg border text-xs sm:text-sm outline-none ${
                        isDark
                          ? "bg-dark-bg border-dark-border text-white"
                          : "bg-light-bg border-light-border text-light-text"
                      }`}
                    />
                    <button
                      onClick={() => submitDonation(charity.id)}
                      disabled={donatingId === charity.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs sm:text-sm font-semibold disabled:opacity-70"
                    >
                      {donatingId === charity.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <HandCoins size={15} />
                      )}
                      Donate
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && charities.length === 0 && (
            <div
              className={`rounded-xl border p-6 text-center ${
                isDark
                  ? "bg-dark-card border-dark-border text-gray-400"
                  : "bg-white border-light-border text-light-subtext"
              }`}
            >
              <Heart className="mx-auto mb-3 text-brand-500" size={22} />
              <p className="font-medium text-sm">
                No charities match these filters right now.
              </p>
            </div>
          )}

          {!session?.access_token && (
            <div
              className={`mt-5 rounded-xl border p-3.5 text-xs sm:text-sm ${
                isDark
                  ? "bg-dark-card border-dark-border text-gray-300"
                  : "bg-white border-light-border text-light-subtext"
              }`}
            >
              To make a donation, please{" "}
              <Link to="/login" className="text-brand-500 font-semibold">
                log in
              </Link>{" "}
              first.
            </div>
          )}

          {session?.access_token && donations.length > 0 && (
            <section
              className={`mt-5 rounded-xl border p-4 ${
                isDark
                  ? "bg-dark-card border-dark-border"
                  : "bg-white border-light-border"
              }`}
            >
              <h3
                className={`text-sm sm:text-base font-bold mb-2.5 ${isDark ? "text-white" : "text-light-text"}`}
              >
                Your Recent Donations
              </h3>
              <div className="space-y-1.5">
                {donations.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs sm:text-sm ${
                      isDark
                        ? "bg-dark-bg text-gray-300"
                        : "bg-light-bg text-light-subtext"
                    }`}
                  >
                    <span className="truncate pr-3">{entry.charity_name}</span>
                    <span className="font-semibold">
                      {formatCurrencyINR(Number(entry.amount || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
