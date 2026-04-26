/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { buildApiUrl } from "../utils/apiBase";
import { formatCurrencyINR } from "../utils/currency";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

export default function Home() {
  const { isDark } = useTheme();
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const [charities, setCharities] = useState([]);
  const [featuredCharity, setFeaturedCharity] = useState(null);
  const [isYearly, setIsYearly] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    // Set target date to the end of the current month
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const updateTimer = () => {
      const currentTime = new Date();
      const difference = targetDate - currentTime;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        mins: Math.floor((difference / 1000 / 60) % 60),
        secs: Math.floor((difference / 1000) % 60),
      });
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading || !session?.user) return;

    if (user?.role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }

    if (!user?.charity_id) {
      navigate("/signup?oauth=google", { replace: true });
      return;
    }

    navigate("/dashboard", { replace: true });
  }, [loading, navigate, session?.user, user?.charity_id, user?.role]);

  useEffect(() => {
    const fetchCharities = async () => {
      try {
        const response = await fetch(buildApiUrl("/charities"));
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch charities");
        }

        const charityList = Array.isArray(data?.charities)
          ? data.charities
          : [];
        setCharities(charityList);
        setFeaturedCharity(data?.featured || charityList[0] || null);
      } catch (error) {
        console.error("Failed to load homepage charities:", error);
      }
    };

    fetchCharities();
  }, []);

  const spotlightCards = useMemo(() => {
    if (!charities.length) return [];
    const spotlightId = featuredCharity?.id;
    return spotlightId
      ? [
          ...charities.filter((charity) => charity.id === spotlightId),
          ...charities.filter((charity) => charity.id !== spotlightId),
        ]
      : charities;
  }, [charities, featuredCharity]);

  const totalRaised = charities.reduce(
    (sum, charity) => sum + Number(charity.total_raised || 0),
    0
  );

  return (
    <div className={`min-h-screen font-inter ${isDark ? "bg-dark-bg text-white" : "bg-surface text-on-surface"}`}>
      <Navbar />
      
      <main className="mesh-gradient min-h-screen pt-20 overflow-hidden">
        {/* Hero Section */}
        <section className="relative h-[85vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <motion.img 
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: isDark ? 0.9 : 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="w-full h-full object-cover"
              src="https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&q=80&w=2000" 
              alt="Premium Golf Experience"
              loading="eager"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? "from-dark-bg via-dark-bg/20" : "from-surface/60 via-surface/10"} to-transparent`}></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="max-w-3xl"
            >
              <motion.span variants={fadeInUp} className="inline-block bg-brand-500/10 text-brand-500 px-4 py-1 rounded-full text-xs font-bold mb-6 border border-brand-500/20 tracking-widest uppercase backdrop-blur-sm">
                THE FUTURE OF PHILANTHROPY
              </motion.span>
              <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tight drop-shadow-sm">
                Play for Glory.<br />
                Give for Good.<br />
                <span className="text-brand-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">Win for Life.</span>
              </motion.h1>
              <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
                <Link to="/signup" className="bg-brand-500 text-white px-8 py-4 rounded-xl font-bold text-lg glow-primary active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-brand-500/20">
                  Join the Draw
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <a href="#charities" className={`backdrop-blur-md border ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white/40 border-black/10 text-on-surface"} px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/60 active:scale-95 transition-all`}>
                  Explore Charities
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Live Stats Section */}
        <section className="max-w-7xl mx-auto px-8 -mt-20 relative z-20">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className={`glass-card p-8 rounded-2xl flex flex-col items-center text-center shadow-lg ${isDark ? "bg-dark-card/90" : "bg-white/90"}`}>
              <span className="material-symbols-outlined text-brand-500 mb-4 text-4xl">volunteer_activism</span>
              <span className="text-4xl md:text-5xl font-black text-on-surface mb-2 tracking-tighter">
                {formatCurrencyINR(totalRaised).split('.')[0]}
              </span>
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Raised for Charity</span>
            </div>
            <div className={`glass-card p-8 rounded-2xl flex flex-col items-center text-center border-brand-500/30 glow-primary shadow-xl ${isDark ? "bg-dark-card/90" : "bg-white/90"}`}>
              <span className="material-symbols-outlined text-brand-500 mb-4 text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>payments</span>
              <span className="text-4xl md:text-5xl font-black text-brand-500 mb-2 tracking-tighter">₹40 Lakh</span>
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Active Jackpot</span>
            </div>
            <div className={`glass-card p-8 rounded-2xl flex flex-col items-center text-center shadow-lg ${isDark ? "bg-dark-card/90" : "bg-white/90"}`}>
              <span className="material-symbols-outlined text-brand-500 mb-4 text-4xl">groups</span>
              <span className="text-4xl md:text-5xl font-black text-on-surface mb-2 tracking-tighter">15k+</span>
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Global Golfers</span>
            </div>
          </motion.div>
        </section>

        {/* How It Works */}
        <section className="py-24 max-w-7xl mx-auto px-8 relative overflow-hidden" id="how-it-works">
          {/* Decorative background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[120px]"></div>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="relative z-10"
          >
            <div className="text-center mb-16">
              <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-black text-on-surface mb-4 tracking-tight">Precision Engineering, Purposeful Impact</motion.h2>
              <motion.p variants={fadeInUp} className="text-on-surface-variant text-lg max-w-2xl mx-auto">SwingSave turns every round of golf into an opportunity to change lives through a seamless technical platform.</motion.p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: "01", title: "Subscribe", desc: "Choose your tier and join the elite community of philanthropic athletes." },
                { step: "02", title: "Tee Off", desc: "Log your rounds on our partner apps or directly in our terminal." },
                { step: "03", title: "Impact", desc: "A portion of your fees goes directly to verified global charities." },
                { step: "04", title: "Win", desc: "Qualify for monthly jackpots, luxury prizes, and exclusive events.", active: true }
              ].map((item, idx) => (
                <motion.div 
                  key={item.step}
                  variants={fadeInUp}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className={`glass-card p-8 rounded-3xl h-full flex flex-col items-start transition-all shadow-sm relative ${item.active ? "border-brand-500/40 shadow-xl shadow-brand-500/10 z-10" : "hover:border-brand-500/50"}`}
                >
                  {item.active && (
                    <motion.div 
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 bg-brand-500/5 rounded-3xl pointer-events-none"
                    ></motion.div>
                  )}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 font-bold relative z-10 ${item.active ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30" : "bg-brand-500/10 text-brand-500"}`}>{item.step}</div>
                  <h3 className="text-2xl font-bold text-on-surface mb-4 tracking-tight relative z-10">{item.title}</h3>
                  <p className="text-on-surface-variant leading-relaxed relative z-10">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Charities Section */}
        <section className={`py-24 ${isDark ? "bg-dark-surface/50" : "bg-surface-container-low/50"}`} id="charities">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <h2 className="text-4xl md:text-5xl font-black text-on-surface mb-2 tracking-tight">Partner Charities</h2>
                <p className="text-on-surface-variant">Real-time transparency of where your contributions flow.</p>
              </div>
              <Link to="/charities" className="text-brand-500 font-bold flex items-center gap-2 group">
                VIEW ALL <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">chevron_right</span>
              </Link>
            </div>
            <div className="overflow-hidden relative group">
              <div 
                className="charity-marquee-track hover:[animation-play-state:paused]"
                style={{ '--charity-marquee-duration': `${spotlightCards.length * 5}s` }}
              >
                {/* First Set */}
                <div className="charity-marquee-group">
                  {spotlightCards.length > 0 ? (
                    spotlightCards.map((charity) => (
                      <div key={`charity-1-${charity.id}`} className="charity-marquee-card">
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          className={`glass-card rounded-2xl overflow-hidden shadow-md h-full ${isDark ? "bg-dark-card/90" : "bg-white/90"}`}
                        >
                          <div className="h-48 w-full relative overflow-hidden bg-brand-500/20">
                            {charity.image_url && (
                              <img src={charity.image_url} alt={charity.name} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute top-4 right-4 bg-brand-500/10 text-brand-500 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-brand-500/20">
                              {charity.is_spotlight ? 'FEATURED' : 'PARTNER'}
                            </div>
                          </div>
                          <div className="p-6">
                            <h4 className="text-xl font-bold text-on-surface mb-2">{charity.name}</h4>
                            <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">{charity.description}</p>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-xs text-on-surface-variant font-medium">RAISED</span>
                              <span className="text-sm font-bold text-brand-500">{formatCurrencyINR(charity.total_raised || 0)}</span>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    ))
                  ) : (
                    <div className="w-full text-center py-10 opacity-50">No charities available at the moment.</div>
                  )}
                </div>
                
                {/* Duplicate Set for Infinite Marquee */}
                <div className="charity-marquee-group">
                  {spotlightCards.length > 0 && spotlightCards.map((charity) => (
                    <div key={`charity-2-${charity.id}`} className="charity-marquee-card">
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className={`glass-card rounded-2xl overflow-hidden shadow-md h-full ${isDark ? "bg-dark-card/90" : "bg-white/90"}`}
                      >
                        <div className="h-48 w-full relative overflow-hidden bg-brand-500/20">
                          {charity.image_url && (
                            <img src={charity.image_url} alt={charity.name} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute top-4 right-4 bg-brand-500/10 text-brand-500 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-brand-500/20">
                            {charity.is_spotlight ? 'FEATURED' : 'PARTNER'}
                          </div>
                        </div>
                        <div className="p-6">
                          <h4 className="text-xl font-bold text-on-surface mb-2">{charity.name}</h4>
                          <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">{charity.description}</p>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-xs text-on-surface-variant font-medium">RAISED</span>
                            <span className="text-sm font-bold text-brand-500">{formatCurrencyINR(charity.total_raised || 0)}</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Preview */}
        <section className="py-24 max-w-7xl mx-auto px-8 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -top-20 -left-20 w-80 h-80 bg-brand-500/10 rounded-full blur-[120px]"></div>
              <div className={`glass-card rounded-[3rem] p-4 border-black/5 shadow-2xl relative z-10 aspect-[9/16] max-w-[320px] mx-auto ${isDark ? "bg-dark-bg" : "bg-white"}`}>
                <div className={`${isDark ? "bg-dark-card" : "bg-surface-container-lowest"} w-full h-full rounded-[2.5rem] overflow-hidden border border-black/5 flex flex-col p-6`}>
                  <div className="flex justify-between items-center mb-8">
                    <span className="material-symbols-outlined text-on-surface">menu</span>
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-black/5 overflow-hidden"></div>
                  </div>
                  <h5 className="text-on-surface font-bold text-xl mb-1">My Dashboard</h5>
                  <p className="text-on-surface-variant text-[10px] mb-6 uppercase tracking-widest font-bold">Live Performance</p>
                  
                  <div className="space-y-4">
                    <div className={`${isDark ? "bg-dark-bg/50" : "bg-surface-container-high"} p-4 rounded-2xl border border-black/5`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-on-surface-variant text-[10px] font-bold">HANDICAP</span>
                        <span className="bg-brand-500/10 text-brand-500 text-[9px] px-2 py-0.5 rounded-full font-black tracking-tighter">TOP 5%</span>
                      </div>
                      <div className="text-2xl font-black text-on-surface">4.2</div>
                    </div>
                    <div className={`${isDark ? "bg-dark-bg/50" : "bg-surface-container-high"} p-4 rounded-2xl border border-black/5`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-on-surface-variant text-[10px] font-bold">TOTAL IMPACT</span>
                        <span className="text-brand-500 text-[9px] font-black tracking-tighter">12 TREES PLANTED</span>
                      </div>
                      <div className="text-2xl font-black text-on-surface">₹1,05,000</div>
                    </div>
                  </div>
                  
                  <div className="mt-auto h-24 flex items-end gap-1.5 px-2">
                    {[40, 60, 50, 90, 75, 45, 80].map((h, i) => (
                      <div key={i} className="bg-brand-500/30 w-full rounded-t-sm" style={{height: `${h}%`}}>
                        <div className="bg-brand-500 w-full h-1/2 rounded-t-sm"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-6xl font-black text-on-surface mb-8 tracking-tighter leading-tight">Intelligence meets <span className="text-brand-500">Elegance</span>.</h2>
              <ul className="space-y-8">
                {[
                  { icon: "query_stats", title: "Precision Analytics", desc: "Track every drive, putt, and eagle with forensic accuracy across 40,000 global courses." },
                  { icon: "security", title: "Blockchain Verification", desc: "Every donation is cryptographically signed and tracked for 100% transparency." },
                  { icon: "trophy", title: "Real-time Leaderboards", desc: "Compete in global daily brackets for jackpot eligibility and exclusive rankings." }
                ].map((feature) => (
                  <li key={feature.title} className="flex gap-6 group">
                    <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-all">
                      <span className="material-symbols-outlined text-brand-500 group-hover:text-white">{feature.icon}</span>
                    </div>
                    <div>
                      <h6 className="text-on-surface font-black text-xl mb-2 tracking-tight">{feature.title}</h6>
                      <p className="text-on-surface-variant leading-relaxed">{feature.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        {/* Prize Draw Section - The Champions Draw */}
        <section className="py-32 relative overflow-hidden bg-slate-950" id="prizes">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 z-0 opacity-40">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>

          <div className="max-w-7xl mx-auto px-8 relative z-10">
            <motion.div 
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="relative group"
            >
           

              <div className="glass-card p-12 md:p-16 rounded-[3rem] border-white/10 overflow-hidden relative shadow-[0_0_100px_rgba(8,145,178,0.15)] bg-slate-900/80 backdrop-blur-3xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-none">
                        The Champions <br /> <span className="text-brand-500">Draw.</span>
                      </h2>
                      <p className="text-slate-400 text-xl leading-relaxed max-w-md">
                        Our algorithm-backed pool grows with every swing. This month's jackpot has rolled over 3 times—making it the largest in history.
                      </p>
                    </div>
                    
                    {/* Digital Countdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Days', val: String(timeLeft.days).padStart(2, '0') },
                        { label: 'Hours', val: String(timeLeft.hours).padStart(2, '0') },
                        { label: 'Mins', val: String(timeLeft.mins).padStart(2, '0') },
                        { label: 'Secs', val: String(timeLeft.secs).padStart(2, '0') }
                      ].map((t) => (
                        <div key={t.label} className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl text-center backdrop-blur-md">
                          <div className="text-3xl md:text-4xl font-black text-brand-500 tracking-tighter mb-1 font-mono">{t.val}</div>
                          <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{t.label}</div>
                        </div>
                      ))}
                    </div>
                    
                    <Link to="/signup" className="group bg-brand-500 text-white px-10 py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 active:scale-95 transition-all w-full md:w-auto shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40">
                      SECURE YOUR ENTRY
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { tier: "PLATINUM", prize: "Riviera Country Club VIP Trip", icon: "emoji_events", color: "from-amber-400 to-amber-600" },
                      { tier: "GOLD", prize: "Full Custom TaylorMade Stealth 2 Set", icon: "golf_course", color: "from-slate-300 to-slate-500" },
                      { tier: "SILVER", prize: "₹15,000 Pro Shop Digital Credit", icon: "payments", color: "from-orange-400 to-orange-600" }
                    ].map((item, i) => (
                      <motion.div 
                        key={item.tier}
                        initial={{ x: 40, opacity: 0 }}
                        whileInView={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ x: -10 }}
                        className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md flex items-center gap-6 group cursor-default"
                      >
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                          <span className="material-symbols-outlined text-white text-3xl">{item.icon}</span>
                        </div>
                        <div>
                          <div className="text-[10px] font-black tracking-[0.2em] text-slate-500 mb-1">{item.tier} REWARD</div>
                          <div className="text-white font-bold text-lg leading-tight">{item.prize}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Subscription Tiers */}
        <section className="py-24 max-w-5xl mx-auto px-8" id="pricing">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-on-surface mb-4 tracking-tight">Choose Your Impact Tier</h2>
            <p className="text-on-surface-variant text-lg">Simple pricing. No hidden fees. Cancel anytime.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Card */}
            <motion.div 
              whileHover={{ y: -10 }}
              className={`glass-card p-10 rounded-[2.5rem] flex flex-col h-full shadow-lg border-brand-500/20`}
            >
              <h3 className="text-on-surface font-black text-4xl mb-4 tracking-tighter">Monthly</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-black text-on-surface tracking-tighter">₹1,500</span>
                <span className="text-on-surface-variant font-bold text-lg tracking-tighter">/month</span>
              </div>
              <p className="text-on-surface-variant font-medium mb-8">Flexible plan billed every month.</p>
              
              <ul className="space-y-4 mb-10 flex-grow">
                {[
                  "Up to 5 rolling scores",
                  "Monthly draw eligibility",
                  "Charity donations",
                  "Cancel anytime"
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-on-surface text-base font-semibold">
                    <span className="material-symbols-outlined text-brand-500 font-black">done</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="w-full py-4 rounded-2xl font-black text-lg transition-all text-center border-2 border-brand-500 text-on-surface hover:bg-brand-500 hover:text-white">
                Get Started
              </Link>
            </motion.div>

            {/* Yearly Card */}
            <motion.div 
              whileHover={{ y: -10 }}
              className={`glass-card p-10 rounded-[2.5rem] flex flex-col h-full shadow-2xl relative overflow-visible border-brand-500/40 glow-primary bg-brand-500/5`}
            >
              <div className="absolute -top-4 -right-4 bg-brand-500 text-white text-xs font-black px-4 py-2 uppercase tracking-widest rounded-full shadow-lg shadow-brand-500/20 z-20">
                Save Rs 3,000
              </div>
              
              <h3 className="text-on-surface font-black text-4xl mb-4 tracking-tighter">Yearly</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-black text-on-surface tracking-tighter">₹15,000</span>
                <span className="text-on-surface-variant font-bold text-lg tracking-tighter">/year</span>
              </div>
              <p className="text-on-surface-variant font-medium mb-8">Save with annual billing.</p>
              
              <ul className="space-y-4 mb-10 flex-grow">
                {[
                  "Everything in Monthly",
                  "2 months free",
                  "Premium leaderboard badge",
                  "Exclusive event invites"
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-on-surface text-base font-semibold">
                    <span className="material-symbols-outlined text-brand-500 font-black">done</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="w-full py-4 rounded-2xl font-black text-lg transition-all text-center bg-brand-500 text-white shadow-xl shadow-brand-500/30 hover:scale-105 active:scale-95">
                Join Yearly
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative py-40 overflow-hidden mt-20">
          <div className="absolute inset-0 z-0">
            <img 
              className="w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?auto=format&fit=crop&q=80&w=2076" 
              alt="CTA BG" 
              loading="lazy"
            />
            <div className={`absolute inset-0 ${isDark ? "bg-dark-bg/50" : "bg-black/40"} backdrop-blur-sm`}></div>
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-8 text-center text-white">
            <motion.h2 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="text-5xl md:text-7xl font-black mb-8 leading-tight tracking-tighter"
            >
              Ready to Change <br /> the Game?
            </motion.h2>
            <p className="text-xl md:text-2xl mb-12 opacity-90 font-bold tracking-tight">Join thousands of golfers worldwide who are playing for a purpose. Your next birdie could feed a village or save a forest.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link to="/signup" className="bg-brand-500 text-white px-12 py-5 rounded-2xl font-black text-xl active:scale-95 transition-all shadow-2xl shadow-brand-500/40">
                Join the Club
              </Link>
              <button className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-white/20 active:scale-95 transition-all">
                Talk to Sales
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
