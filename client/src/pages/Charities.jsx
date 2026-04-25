import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Heart, HandCoins, Loader2, Filter, Info, TrendingUp, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { formatCurrencyINR } from "../utils/currency";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.05 } }
};

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
    <div className={`min-h-screen ${isDark ? "bg-dark-bg text-white" : "bg-light-bg text-on-surface"}`}>
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="mesh-gradient opacity-30 h-full"></div>
          <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-b from-transparent to-dark-bg" : "bg-gradient-to-b from-transparent to-light-bg"}`}></div>
        </div>

        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInUp}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-on-surface to-on-surface-variant leading-tight">
              Impact at Every <br /> <span className="text-brand-500">Tee-Off.</span>
            </h1>
            <p className="text-xl text-on-surface-variant mb-10 leading-relaxed">
              Discover verified global causes. Our precision-engineered platform ensures that every rupee contributed drives measurable, purposeful impact.
            </p>

            {/* Search Bar Widget */}
            <div className="glass-card p-2 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-2 shadow-2xl shadow-brand-500/5 max-w-2xl border-brand-500/20">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search charities..."
                  className="w-full pl-12 pr-4 py-3 bg-transparent outline-none text-on-surface"
                />
              </div>
              <button 
                onClick={fetchCharities}
                className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} /> Search</>}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-8 pb-24 relative z-10">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-8">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
                  <Filter size={16} /> Filters
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface">Min. Raised (₹)</label>
                    <input
                      type="number"
                      value={minRaised}
                      onChange={(e) => setMinRaised(Number(e.target.value || 0))}
                      className="w-full bg-brand-500/5 border border-brand-500/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500/40 transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <label className="flex items-center justify-between p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 cursor-pointer hover:border-brand-500/30 transition-all">
                    <span className="text-sm font-bold">Spotlight Only</span>
                    <input
                      type="checkbox"
                      checked={spotlightOnly}
                      onChange={(e) => setSpotlightOnly(e.target.checked)}
                      className="w-5 h-5 accent-brand-500"
                    />
                  </label>
                  <button 
                    onClick={fetchCharities}
                    className="w-full py-2 bg-on-surface text-surface-bright rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>

              {/* Stats Widget */}
              <div className="glass-card p-6 rounded-2xl border-brand-500/10">
                <h4 className="text-xs font-black text-brand-500 uppercase tracking-widest mb-4">Network Activity</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">Featured</span>
                    <span className="font-bold text-on-surface">{spotlightCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">Total Causes</span>
                    <span className="font-bold text-on-surface">{charities.length}</span>
                  </div>
                </div>
              </div>

              {session?.access_token && donations.length > 0 && (
                <div className="glass-card p-6 rounded-2xl border-brand-500/10">
                  <h4 className="text-xs font-black text-brand-500 uppercase tracking-widest mb-4">Your Recent Impact</h4>
                  <div className="space-y-3">
                    {donations.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold truncate text-on-surface">{entry.charity_name}</span>
                        <span className="text-[10px] font-medium text-brand-500">{formatCurrencyINR(Number(entry.amount || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Charity Grid */}
          <div className="flex-1">
            {error && (
              <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
                <Info size={20} /> {error}
              </div>
            )}

            {donationMsg && (
              <div className="mb-8 p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-500 flex items-center gap-3">
                <Heart size={20} className="fill-current" /> {donationMsg}
              </div>
            )}

            <motion.div 
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <AnimatePresence mode='popLayout'>
                {charities.map((charity) => (
                  <motion.article
                    layout
                    key={charity.id}
                    variants={fadeInUp}
                    whileHover={{ y: -4 }}
                    className="glass-card rounded-3xl overflow-hidden flex flex-col group h-full border-brand-500/5"
                  >
                    {/* Card Header/Image Area */}
                    <div className="h-48 w-full relative bg-brand-500/10 overflow-hidden">
                      {charity.image_url ? (
                        <img 
                          src={charity.image_url} 
                          alt={charity.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20">
                          <Heart size={48} />
                        </div>
                      )}
                      
                      <div className="absolute top-4 left-4 flex gap-2">
                        {charity.is_spotlight && (
                          <div className="bg-brand-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-500/20 flex items-center gap-1">
                            <Award size={12} /> Spotlight
                          </div>
                        )}
                        <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                          Vetted
                        </div>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                         <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                            <TrendingUp size={14} className="text-brand-500" />
                            <span className="text-white text-xs font-bold">{formatCurrencyINR(charity.total_raised || 0)} <span className="opacity-50 font-medium">RAISED</span></span>
                         </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-8 flex flex-col flex-1">
                      <h2 className="text-2xl font-bold text-on-surface mb-3 tracking-tight group-hover:text-brand-500 transition-colors">
                        {charity.name}
                      </h2>
                      <p className="text-on-surface-variant text-sm leading-relaxed mb-8 line-clamp-3">
                        {charity.description || "Leading transformation through purposeful community engagement and sustainable engineering."}
                      </p>

                      {/* Quick Donate Widget */}
                      <div className="mt-auto space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                           <HandCoins size={12} /> Support this cause
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">₹</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="500"
                              value={donationValues[charity.id] || ""}
                              onChange={(e) =>
                                setDonationValues((prev) => ({
                                  ...prev,
                                  [charity.id]: e.target.value,
                                }))
                              }
                              className="w-full pl-8 pr-4 py-3 bg-brand-500/5 border border-brand-500/10 rounded-xl text-sm font-bold outline-none focus:border-brand-500/40 transition-all"
                            />
                          </div>
                          <button
                            onClick={() => submitDonation(charity.id)}
                            disabled={donatingId === charity.id}
                            className="bg-on-surface text-surface-bright p-3.5 rounded-xl hover:bg-brand-500 hover:text-white transition-all disabled:opacity-50"
                          >
                            {donatingId === charity.id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Heart size={18} />
                            )}
                          </button>
                        </div>
                        {!session?.access_token && (
                          <p className="text-[10px] text-on-surface-variant text-center italic">Log in to enable quick donations</p>
                        )}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>

              {charities.length === 0 && !loading && (
                <div className="col-span-full py-24 text-center">
                  <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-500">
                    <Heart size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-on-surface mb-2">No charities found</h3>
                  <p className="text-on-surface-variant max-w-sm mx-auto">Try adjusting your filters or search keywords to find a cause to support.</p>
                  <button 
                    onClick={() => { setQuery(""); setMinRaised(0); setSpotlightOnly(false); fetchCharities(); }}
                    className="mt-8 text-brand-500 font-bold border-b-2 border-brand-500/20 hover:border-brand-500 transition-all"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
