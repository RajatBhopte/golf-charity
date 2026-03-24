/* eslint-disable no-unused-vars */
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  Trophy,
  Heart,
  Target,
  ArrowRight,
  Users,
  Calendar,
  Shield,
  Zap,
  Star,
  ChevronRight,
  Gift,
  CircleDollarSign,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { buildApiUrl } from '../utils/apiBase';
import { formatCurrencyINR } from '../utils/currency';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const prizeTiers = [
  { match: '5', title: 'Jackpot', pool: '40%', amount: formatCurrencyINR(300000), featured: true },
  { match: '4', title: 'Grand Prize', pool: '35%', amount: formatCurrencyINR(262500), featured: false },
  { match: '3', title: 'Winner', pool: '25%', amount: formatCurrencyINR(187500), featured: false },
];

export default function Home() {
  const { isDark } = useTheme();
  const [charities, setCharities] = useState([]);
  const [featuredCharity, setFeaturedCharity] = useState(null);

  useEffect(() => {
    const fetchCharities = async () => {
      try {
        const response = await fetch(buildApiUrl('/charities'));
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch charities');
        }

        const charityList = Array.isArray(data?.charities) ? data.charities : [];
        setCharities(charityList);
        setFeaturedCharity(data?.featured || charityList[0] || null);
      } catch (error) {
        console.error('Failed to load homepage charities:', error);
      }
    };

    fetchCharities();
  }, []);

  const spotlightCards = useMemo(() => {
    if (!charities.length) {
      return [];
    }

    const spotlightId = featuredCharity?.id;
    const ordered = spotlightId
      ? [
          ...charities.filter((charity) => charity.id === spotlightId),
          ...charities.filter((charity) => charity.id !== spotlightId),
        ]
      : charities;

    return ordered.slice(0, 3);
  }, [charities, featuredCharity]);

  const totalRaised = charities.reduce((sum, charity) => sum + Number(charity.total_raised || 0), 0);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg' : 'bg-light-bg'}`}>
      <Navbar />

      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl ${isDark ? 'bg-brand-500/5' : 'bg-brand-200/30'}`} />
          <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl ${isDark ? 'bg-brand-600/5' : 'bg-brand-100/40'}`} />
        </div>

        <div className="container-max px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-8"
            >
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${
                isDark ? 'bg-brand-500/10 border-brand-500/20 text-brand-400' : 'bg-brand-50 border-brand-200 text-brand-700'
              }`}>
                <Sparkles size={14} className="inline mr-1.5 -mt-0.5" />
                Golf scores that fund real causes
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6 ${isDark ? 'text-white' : 'text-light-text'}`}
            >
              Play Your Round.
              <br className="hidden sm:block" />
              <span className="gradient-text">Power A Cause.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`text-lg sm:text-xl max-w-2xl mx-auto mb-4 leading-relaxed ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}
            >
              Subscribe, log your last five Stableford scores, and turn them into monthly draw numbers.
              Win prizes while a portion of every subscription supports a charity you choose.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10"
            >
              {[
                { icon: Target, text: 'Log 5 Scores' },
                { icon: Trophy, text: 'Win Monthly Prizes' },
                { icon: Heart, text: 'Support a Charity' },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-light-subtext'}`}>
                  <Icon size={16} className="text-brand-500" />
                  {text}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col items-center gap-3"
            >
              <Link
                to="/signup"
                className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-xl shadow-brand-500/25 hover:shadow-2xl hover:shadow-brand-500/35 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Start Playing and Giving
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex flex-col items-center gap-1">
                <span className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-light-subtext'}`}>
                  Starting at <span className="text-brand-500">{formatCurrencyINR(1500)}/month</span>
                </span>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-light-subtext/70'}`}>
                  Cancel anytime
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className={`mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto py-6 px-8 rounded-2xl border ${
                isDark ? 'bg-dark-card/50 border-dark-border' : 'bg-white/80 border-light-border shadow-sm'
              }`}
            >
              {[
                { value: formatCurrencyINR(300000), label: 'Jackpot Prize' },
                { value: '10%+', label: 'To Charity' },
                { value: '5', label: 'Scores to Play' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-bold gradient-text">{value}</div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>{label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className={`section-padding border-t ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
        <div className="container-max">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeInUp} className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-4 ${isDark ? 'bg-brand-500/10 text-brand-400' : 'bg-brand-50 text-brand-700'}`}>
              Simple and Transparent
            </motion.span>
            <motion.h2 variants={fadeInUp} className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-light-text'}`}>
              How It <span className="gradient-text">Works</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Your real scores become your real draw numbers, so your game on the course drives your shot at the prize pool.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6 lg:gap-8"
          >
            {[
              {
                step: '01',
                icon: CircleDollarSign,
                title: 'Subscribe and Choose',
                desc: 'Pick a monthly or yearly plan and select a charity to support with every contribution.',
                highlight: `${formatCurrencyINR(1500)}/month`,
              },
              {
                step: '02',
                icon: Target,
                title: 'Log Your Scores',
                desc: 'Enter your latest Stableford rounds. Your five most recent scores become your lottery numbers.',
                highlight: '5 scores = 5 numbers',
              },
              {
                step: '03',
                icon: Trophy,
                title: 'Win and Give Back',
                desc: 'Monthly draws reward 3, 4, and 5 number matches while charities receive an ongoing share of subscriptions.',
                highlight: 'Monthly prize pool',
              },
            ].map(({ step, icon: Icon, title, desc, highlight }, index) => (
              <motion.div key={step} variants={fadeInUp} className="glass-card p-8 relative group">
                <div className={`absolute top-6 right-6 text-5xl font-black ${isDark ? 'text-dark-border' : 'text-gray-100'} group-hover:text-brand-500/10 transition-colors`}>
                  {step}
                </div>
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${isDark ? 'bg-brand-500/10' : 'bg-brand-50'}`}>
                  <Icon size={28} className="text-brand-500" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-light-text'}`}>{title}</h3>
                <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>{desc}</p>
                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>
                  <Zap size={14} />
                  {highlight}
                </span>
                {index < 2 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight size={24} className={isDark ? 'text-dark-border' : 'text-gray-300'} />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="prizes" className={`section-padding ${isDark ? 'bg-dark-surface' : 'bg-white'}`}>
        <div className="container-max">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeInUp} className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-4 ${isDark ? 'bg-brand-500/10 text-brand-400' : 'bg-brand-50 text-brand-700'}`}>
              Monthly Prizes
            </motion.span>
            <motion.h2 variants={fadeInUp} className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-light-text'}`}>
              Prize <span className="gradient-text">Tiers</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6 lg:gap-8"
          >
            {prizeTiers.map((tier) => (
              <motion.div
                key={tier.match}
                variants={fadeInUp}
                className={`relative rounded-2xl border p-8 text-center transition-all duration-300 hover:-translate-y-1 ${
                  tier.featured
                    ? isDark
                      ? 'border-yellow-500/30 bg-gradient-to-b from-yellow-500/20 to-amber-600/20'
                      : 'border-yellow-400 bg-gradient-to-b from-yellow-500/10 to-amber-500/10 shadow-lg'
                    : isDark
                      ? 'border-dark-border bg-dark-card'
                      : 'border-light-border bg-light-card shadow-sm'
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg">
                      JACKPOT
                    </span>
                  </div>
                )}
                <div className={`text-4xl font-black mb-2 ${tier.featured ? 'text-yellow-500' : 'gradient-text'}`}>{tier.pool}</div>
                <h3 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-light-text'}`}>{tier.title}</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>Match {tier.match} numbers</p>
                <div className={`py-3 px-4 rounded-xl ${isDark ? 'bg-dark-bg/50' : 'bg-light-bg'}`}>
                  <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-light-text'}`}>{tier.amount}</span>
                  <span className={`text-xs block mt-1 ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>Illustrative monthly prize amount</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="charities" className={`section-padding border-t ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
        <div className="container-max">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeInUp} className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-4 ${isDark ? 'bg-brand-500/10 text-brand-400' : 'bg-brand-50 text-brand-700'}`}>
              Make a Difference
            </motion.span>
            <motion.h2 variants={fadeInUp} className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-light-text'}`}>
              Charity <span className="gradient-text">Spotlight</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Admin spotlight selections now flow straight to the homepage, so featured causes and upcoming events stay current.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6 lg:gap-8"
          >
            {spotlightCards.map((charity, index) => (
              <motion.div
                key={charity.id}
                variants={fadeInUp}
                className={`glass-card overflow-hidden group ${charity.is_spotlight ? (isDark ? 'ring-1 ring-brand-500/30' : 'ring-2 ring-brand-500/20') : ''}`}
              >
                <div className={`h-44 relative overflow-hidden ${charity.image_url ? '' : 'bg-gradient-to-br from-brand-500 to-brand-700'} flex items-center justify-center`}>
                  {charity.image_url ? (
                    <img src={charity.image_url} alt={charity.name} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <Heart size={56} className="relative z-10 text-white" />
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                  {charity.is_spotlight && (
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-500 text-white">
                        <Star size={10} className="inline mr-1 -mt-0.5" />
                        Featured
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-light-text'}`}>{charity.name}</h3>
                  <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>{charity.description}</p>
                  <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${isDark ? 'bg-dark-bg/50' : 'bg-light-bg'}`}>
                    <Calendar size={16} className="text-brand-500 shrink-0" />
                    <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-light-text'}`}>
                      {Array.isArray(charity.upcoming_events) && charity.upcoming_events[0]
                        ? charity.upcoming_events[0]
                        : `Community update #${index + 1} coming soon`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>Total raised</span>
                    <span className={`text-sm font-bold ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>
                      {formatCurrencyINR(charity.total_raised || 0)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {spotlightCards.length === 0 && (
            <div className={`mt-8 rounded-2xl border px-6 py-10 text-center text-sm ${isDark ? 'border-dark-border bg-dark-card text-gray-400' : 'border-light-border bg-white text-light-subtext shadow-sm'}`}>
              Charity cards will appear here as soon as an admin adds charities and marks one as featured.
            </div>
          )}

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { icon: Heart, value: formatCurrencyINR(totalRaised), label: 'Total Donated' },
              { icon: Users, value: String(charities.length), label: 'Partner Charities' },
              { icon: Gift, value: featuredCharity ? 'Live' : 'Soon', label: 'Spotlight Status' },
              { icon: Shield, value: '100%', label: 'Transparent Tracking' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className={`text-center p-6 rounded-2xl border ${isDark ? 'bg-dark-card/50 border-dark-border' : 'bg-white border-light-border shadow-sm'}`}>
                <Icon size={24} className="text-brand-500 mx-auto mb-2" />
                <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-light-text'}`}>{value}</div>
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className={`section-padding ${isDark ? 'bg-dark-surface' : 'bg-white'}`}>
        <div className="container-max">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeInUp} className={`text-3xl sm:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-light-text'}`}>
              See How <span className="gradient-text">Matching</span> Works
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className={`max-w-2xl mx-auto rounded-2xl border p-8 ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-lg'}`}
          >
            <div className="space-y-6">
              <div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>
                  Monthly Draw Numbers
                </span>
                <div className="flex gap-3 mt-3">
                  {[12, 18, 25, 31, 40].map((number) => (
                    <div key={number} className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/20">
                      {number}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`border-t border-dashed ${isDark ? 'border-dark-border' : 'border-light-border'}`} />

              <div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>
                  Your Scores
                </span>
                <div className="flex gap-3 mt-3">
                  {[
                    { score: 10, match: false },
                    { score: 18, match: true },
                    { score: 25, match: true },
                    { score: 31, match: true },
                    { score: 38, match: false },
                  ].map(({ score, match }) => (
                    <div
                      key={score}
                      className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg border-2 ${
                        match
                          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                          : isDark
                            ? 'border-dark-border bg-dark-bg text-gray-500'
                            : 'border-light-border bg-light-bg text-light-subtext'
                      }`}
                    >
                      {score}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`flex items-center gap-3 p-4 rounded-xl ${isDark ? 'bg-brand-500/10' : 'bg-brand-50'}`}>
                <Trophy className="text-brand-500" size={24} />
                <div>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-light-text'}`}>3-number match</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>You win a share of 25% of the prize pool.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding relative overflow-hidden">
        <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-b from-dark-bg via-brand-900/20 to-dark-bg' : 'bg-gradient-to-b from-light-bg via-brand-50 to-light-bg'}`} />
        <div className="container-max relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.h2 variants={fadeInUp} className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 ${isDark ? 'text-white' : 'text-light-text'}`}>
              Ready to Make Your <span className="gradient-text">Game Count?</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className={`text-lg mb-10 ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Join golfers who are turning their scores into prizes and their subscriptions into charitable impact.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col items-center gap-3">
              <Link
                to="/signup"
                className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-xl shadow-brand-500/25 hover:shadow-2xl hover:shadow-brand-500/35 hover:-translate-y-0.5"
              >
                Start Playing and Giving
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>
                Starting at {formatCurrencyINR(1500)}/month
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
