import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  Trophy, Heart, Target, ArrowRight, Users, Calendar,
  TrendingUp, Shield, Zap, Star, ChevronRight, Gift,
  CircleDollarSign, Sparkles
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } }
};

export default function Home() {
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg' : 'bg-light-bg'}`}>
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl ${
            isDark ? 'bg-brand-500/5' : 'bg-brand-200/30'
          }`} />
          <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl ${
            isDark ? 'bg-brand-600/5' : 'bg-brand-100/40'
          }`} />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl ${
            isDark ? 'bg-brand-500/3' : 'bg-brand-50/50'
          }`} />
        </div>

        {/* Grid Pattern */}
        <div className={`absolute inset-0 ${isDark ? 'opacity-[0.03]' : 'opacity-[0.04]'}`}
          style={{
            backgroundImage: `linear-gradient(${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        <div className="container-max px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-8"
            >
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${
                isDark
                  ? 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                  : 'bg-brand-50 border-brand-200 text-brand-700'
              }`}>
                <Sparkles size={14} className="inline mr-1.5 -mt-0.5" />
                India's First Golf Charity Lottery Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6 ${
                isDark ? 'text-white' : 'text-light-text'
              }`}
            >
              Your Golf Scores{' '}
              <span className="gradient-text">Win Prizes</span>{' '}
              <br className="hidden sm:block" />
              & Fund Charities
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`text-lg sm:text-xl max-w-2xl mx-auto mb-4 leading-relaxed ${
                isDark ? 'text-gray-400' : 'text-light-subtext'
              }`}
            >
              Subscribe, log your last 5 Stableford scores — they become your lottery numbers.
              Match the monthly draw to win big, while a portion of every subscription
              goes to a charity you choose.
            </motion.p>

            {/* Value Props */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10"
            >
              {[
                { icon: Target, text: 'Log 5 Scores' },
                { icon: Trophy, text: 'Win Monthly Prizes' },
                { icon: Heart, text: '10%+ to Charity' },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className={`flex items-center gap-2 text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-light-subtext'
                }`}>
                  <Icon size={16} className="text-brand-500" />
                  {text}
                </span>
              ))}
            </motion.div>

            {/* CTA */}
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
                Start Playing & Giving
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex flex-col items-center gap-1">
                <span className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-light-subtext'}`}>
                  Starting at <span className="text-brand-500">₹1,500/month</span>
                </span>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-light-subtext/70'}`}>
                  Cancel anytime · No commitment
                </span>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className={`mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto py-6 px-8 rounded-2xl border ${
                isDark
                  ? 'bg-dark-card/50 border-dark-border'
                  : 'bg-white/80 border-light-border shadow-sm'
              }`}
            >
              {[
                { value: '₹3L+', label: 'Jackpot Prize' },
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

      {/* How It Works */}
      <section id="how-it-works" className={`section-padding border-t ${
        isDark ? 'border-dark-border' : 'border-light-border'
      }`}>
        <div className="container-max">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeInUp} className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-4 ${
              isDark
                ? 'bg-brand-500/10 text-brand-400'
                : 'bg-brand-50 text-brand-700'
            }`}>
              Simple & Transparent
            </motion.span>
            <motion.h2 variants={fadeInUp} className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-light-text'}`}>
              How It <span className="gradient-text">Works</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Your golf scores become your lottery numbers. Play golf, log your scores,
              and let them work for you every month.
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
                title: 'Subscribe & Choose',
                desc: 'Pick a monthly (₹1,500) or yearly plan, then select a charity you want to support. At least 10% of your fee goes directly to them.',
                highlight: '₹1,500/month',
              },
              {
                step: '02',
                icon: Target,
                title: 'Log Your Scores',
                desc: 'Enter your latest Stableford scores (1–45). Your 5 most recent scores automatically become your lottery numbers for the monthly draw.',
                highlight: '5 scores = 5 lottery numbers',
              },
              {
                step: '03',
                icon: Trophy,
                title: 'Win & Give Back',
                desc: 'Every month, a draw runs. Match 3, 4, or 5 numbers to win up to 40% of the prize pool. The jackpot rolls over if unclaimed!',
                highlight: 'Up to ₹3L+ jackpot',
              },
            ].map(({ step, icon: Icon, title, desc, highlight }, i) => (
              <motion.div
                key={step}
                variants={fadeInUp}
                className={`glass-card p-8 relative group`}
              >
                {/* Step Number */}
                <div className={`absolute top-6 right-6 text-5xl font-black ${
                  isDark ? 'text-dark-border' : 'text-gray-100'
                } group-hover:text-brand-500/10 transition-colors`}>
                  {step}
                </div>

                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
                  isDark
                    ? 'bg-brand-500/10'
                    : 'bg-brand-50'
                }`}>
                  <Icon size={28} className="text-brand-500" />
                </div>

                <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-light-text'}`}>
                  {title}
                </h3>
                <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                  {desc}
                </p>
                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${
                  isDark ? 'text-brand-400' : 'text-brand-600'
                }`}>
                  <Zap size={14} />
                  {highlight}
                </span>

                {/* Connector Arrow (between cards) */}
                {i < 2 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight size={24} className={isDark ? 'text-dark-border' : 'text-gray-300'} />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Unique Hook callout */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className={`mt-12 text-center p-6 rounded-2xl border ${
              isDark
                ? 'bg-brand-500/5 border-brand-500/20'
                : 'bg-brand-50/50 border-brand-200'
            }`}
          >
            <p className={`text-lg font-semibold ${isDark ? 'text-brand-400' : 'text-brand-700'}`}>
              🎯 The Magic: Your real golf scores are your real lottery numbers.{' '}
              <span className={isDark ? 'text-gray-400' : 'text-light-subtext'}>
                No random tickets — your game on the course is your game in the draw.
              </span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Prize Tiers */}
      <section id="prizes" className={`section-padding ${
        isDark ? 'bg-dark-surface' : 'bg-white'
      }`}>
        <div className="container-max">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeInUp} className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-4 ${
              isDark ? 'bg-brand-500/10 text-brand-400' : 'bg-brand-50 text-brand-700'
            }`}>
              Monthly Prizes
            </motion.span>
            <motion.h2 variants={fadeInUp} className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-light-text'}`}>
              Prize <span className="gradient-text">Tiers</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              The more scores you match, the bigger your prize. Unclaimed jackpots roll over, growing bigger every month.
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
                match: '5',
                title: 'Jackpot',
                pool: '40%',
                amount: '₹3,00,000',
                rollover: true,
                icon: '🏆',
                gradient: 'from-yellow-500/20 to-amber-600/20',
                borderColor: isDark ? 'border-yellow-500/30' : 'border-yellow-400',
                featured: true,
              },
              {
                match: '4',
                title: 'Grand Prize',
                pool: '35%',
                amount: '₹2,62,500',
                rollover: false,
                icon: '🥈',
                gradient: 'from-brand-500/10 to-brand-700/10',
                borderColor: isDark ? 'border-brand-500/30' : 'border-brand-300',
                featured: false,
              },
              {
                match: '3',
                title: 'Winner',
                pool: '25%',
                amount: '₹1,87,500',
                rollover: false,
                icon: '🥉',
                gradient: 'from-brand-500/5 to-brand-700/5',
                borderColor: isDark ? 'border-dark-border' : 'border-light-border',
                featured: false,
              },
            ].map(({ match, title, pool, amount, rollover, icon, gradient, borderColor, featured }) => (
              <motion.div
                key={match}
                variants={fadeInUp}
                className={`relative rounded-2xl border p-8 text-center transition-all duration-300 hover:-translate-y-1 ${borderColor} ${
                  featured ? `bg-gradient-to-b ${gradient} ${isDark ? '' : 'shadow-lg'}` : isDark ? 'bg-dark-card' : 'bg-light-card shadow-sm'
                }`}
              >
                {featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg">
                      JACKPOT
                    </span>
                  </div>
                )}

                <div className="text-5xl mb-4">{icon}</div>
                <h3 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-light-text'}`}>{title}</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>
                  Match {match} Numbers
                </p>

                <div className={`text-4xl font-black mb-2 ${
                  featured ? 'text-yellow-500' : 'gradient-text'
                }`}>
                  {pool}
                </div>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>of prize pool</p>

                <div className={`py-3 px-4 rounded-xl mb-4 ${
                  isDark ? 'bg-dark-bg/50' : 'bg-light-bg'
                }`}>
                  <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-light-text'}`}>{amount}</span>
                  <span className={`text-xs block mt-1 ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>
                    Example with 500 subscribers
                  </span>
                </div>

                {rollover && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    isDark ? 'text-yellow-400' : 'text-yellow-600'
                  }`}>
                    <TrendingUp size={14} />
                    Rolls over if unclaimed!
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Prize Calculation */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className={`mt-12 rounded-2xl border p-8 ${
              isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-sm'
            }`}
          >
            <h3 className={`text-lg font-bold mb-4 text-center ${isDark ? 'text-white' : 'text-light-text'}`}>
              How the Prize Pool is Calculated
            </h3>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              {[
                '500 subscribers',
                '×',
                '₹1,500/month',
                '=',
                '₹7,50,000 prize pool',
              ].map((item, i) => (
                <span key={i} className={`px-4 py-2 rounded-lg font-mono font-semibold ${
                  item === '×' || item === '='
                    ? isDark ? 'text-brand-400' : 'text-brand-600'
                    : isDark ? 'bg-dark-bg text-gray-300' : 'bg-light-bg text-light-text'
                }`}>
                  {item}
                </span>
              ))}
            </div>
            <p className={`text-xs text-center mt-4 ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>
              If multiple winners match the same tier, the pool is split equally between them
            </p>
          </motion.div>
        </div>
      </section>

      {/* Charity Spotlight */}
      <section id="charities" className={`section-padding border-t ${
        isDark ? 'border-dark-border' : 'border-light-border'
      }`}>
        <div className="container-max">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeInUp} className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-4 ${
              isDark ? 'bg-brand-500/10 text-brand-400' : 'bg-brand-50 text-brand-700'
            }`}>
              Make a Difference
            </motion.span>
            <motion.h2 variants={fadeInUp} className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-light-text'}`}>
              Charity <span className="gradient-text">Spotlight</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Every subscription supports a cause you believe in. At least 10% of your fee goes directly to your chosen charity.
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
                name: 'Green Earth Foundation',
                desc: 'Dedicated to environmental conservation through sustainable golf course management and tree planting initiatives across India.',
                image: '🌍',
                color: 'from-emerald-400 to-teal-500',
                event: 'Charity Golf Day — April 12, 2026',
                raised: '₹4,52,000',
                featured: true,
              },
              {
                name: 'Youth Sports Academy',
                desc: 'Bringing golf and other sports to underprivileged youth, providing equipment, coaching, and opportunities to compete.',
                image: '⛳',
                color: 'from-blue-400 to-indigo-500',
                event: 'Junior Golf Tournament — May 5, 2026',
                raised: '₹2,18,000',
                featured: false,
              },
              {
                name: 'Healthbridge India',
                desc: 'Funding medical research and providing healthcare access to rural communities. Every round you play helps save lives.',
                image: '❤️',
                color: 'from-rose-400 to-pink-500',
                event: 'Wellness Golf Marathon — June 20, 2026',
                raised: '₹3,85,000',
                featured: false,
              },
            ].map(({ name, desc, image, color, event, raised, featured }) => (
              <motion.div
                key={name}
                variants={fadeInUp}
                className={`glass-card overflow-hidden group ${featured ? (isDark ? 'ring-1 ring-brand-500/30' : 'ring-2 ring-brand-500/20') : ''}`}
              >
                {/* Image Banner */}
                <div className={`h-40 bg-gradient-to-br ${color} flex items-center justify-center text-6xl relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10" />
                  <span className="relative z-10">{image}</span>
                  {featured && (
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isDark
                          ? 'bg-brand-500 text-white'
                          : 'bg-brand-500 text-white'
                      }`}>
                        <Star size={10} className="inline mr-1 -mt-0.5" />
                        Featured
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-light-text'}`}>
                    {name}
                  </h3>
                  <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                    {desc}
                  </p>

                  {/* Event */}
                  <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${
                    isDark ? 'bg-dark-bg/50' : 'bg-light-bg'
                  }`}>
                    <Calendar size={16} className="text-brand-500 shrink-0" />
                    <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-light-text'}`}>
                      {event}
                    </span>
                  </div>

                  {/* Raised */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>
                      Total raised
                    </span>
                    <span className={`text-sm font-bold ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>
                      {raised}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Charity Impact Bar */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className={`mt-12 grid grid-cols-2 md:grid-cols-4 gap-4`}
          >
            {[
              { icon: Heart, value: '₹10.5L+', label: 'Total Donated' },
              { icon: Users, value: '12', label: 'Partner Charities' },
              { icon: Gift, value: '850+', label: 'Active Donors' },
              { icon: Shield, value: '100%', label: 'Transparent Tracking' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className={`text-center p-6 rounded-2xl border ${
                isDark ? 'bg-dark-card/50 border-dark-border' : 'bg-white border-light-border shadow-sm'
              }`}>
                <Icon size={24} className="text-brand-500 mx-auto mb-2" />
                <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-light-text'}`}>{value}</div>
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How Matching Works */}
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
            className={`max-w-2xl mx-auto rounded-2xl border p-8 ${
              isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-lg'
            }`}
          >
            <div className="space-y-6">
              {/* Draw Numbers */}
              <div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>
                  Monthly Draw Numbers
                </span>
                <div className="flex gap-3 mt-3">
                  {[12, 18, 25, 31, 40].map(n => (
                    <div key={n} className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/20">
                      {n}
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className={`border-t border-dashed ${isDark ? 'border-dark-border' : 'border-light-border'}`} />

              {/* Your Scores */}
              <div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>
                  Your Scores (Lottery Numbers)
                </span>
                <div className="flex gap-3 mt-3">
                  {[
                    { score: 10, match: false },
                    { score: 18, match: true },
                    { score: 25, match: true },
                    { score: 31, match: true },
                    { score: 38, match: false },
                  ].map(({ score, match }) => (
                    <div key={score} className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg border-2 transition-all ${
                      match
                        ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                        : isDark
                          ? 'border-dark-border bg-dark-bg text-gray-500'
                          : 'border-light-border bg-light-bg text-light-subtext'
                    }`}>
                      {score}
                    </div>
                  ))}
                </div>
              </div>

              {/* Result */}
              <div className={`flex items-center gap-3 p-4 rounded-xl ${
                isDark ? 'bg-brand-500/10' : 'bg-brand-50'
              }`}>
                <Trophy className="text-brand-500" size={24} />
                <div>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-light-text'}`}>
                    3-Number Match! 🎉
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                    You win a share of 25% of the prize pool
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding relative overflow-hidden">
        <div className={`absolute inset-0 ${
          isDark
            ? 'bg-gradient-to-b from-dark-bg via-brand-900/20 to-dark-bg'
            : 'bg-gradient-to-b from-light-bg via-brand-50 to-light-bg'
        }`} />
        <div className="container-max relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.h2 variants={fadeInUp} className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 ${isDark ? 'text-white' : 'text-light-text'}`}>
              Ready to Make Your{' '}
              <span className="gradient-text">Game Count?</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className={`text-lg mb-10 ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Join golfers across India who are turning their scores into prizes and their subscriptions into charitable impact. Start today.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col items-center gap-3">
              <Link
                to="/signup"
                className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-xl shadow-brand-500/25 hover:shadow-2xl hover:shadow-brand-500/35 hover:-translate-y-0.5"
              >
                Start Playing & Giving
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>
                Starting at ₹1,500/month · Cancel anytime
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
