import React, { useState } from 'react';
import { Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ScoreEntry({ onAddScore, loading }) {
  const { isDark } = useTheme();
  
  const [score, setScore] = useState('');
  const [playedDate, setPlayedDate] = useState(
    new Date().toISOString().split('T')[0] // default to today YYYY-MM-DD
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Frontend Validations
    if (!score || !playedDate) {
      return setErrorMsg('Both score and date are required.');
    }

    const numScore = parseInt(score, 10);
    if (isNaN(numScore) || numScore < 1 || numScore > 45) {
      return setErrorMsg('Score must be a number between 1 and 45.');
    }

    const playedDateObj = new Date(playedDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    if (playedDateObj > today) {
      return setErrorMsg('Date cannot be in the future.');
    }
    if (playedDateObj < oneYearAgo) {
      return setErrorMsg('Date cannot be more than 1 year old.');
    }

    const result = await onAddScore(numScore, playedDate);
    
    if (result.success) {
      setSuccessMsg('Score added successfully!');
      setScore('');
      // Keep playedDate as today to make multiple entries easier
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(result.error);
    }
  };

  return (
    <div className={`p-6 sm:p-8 rounded-2xl border backdrop-blur-xl ${
      isDark 
        ? 'bg-dark-card border-dark-border' 
        : 'bg-white border-light-border shadow-md'
    }`}>
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Log a Score</h3>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
          Enter your Stableford scores (1-45). We only keep your latest 5 rounds for the monthly draw.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Stableford Score
            </label>
            <input
              type="number"
              min="1"
              max="45"
              required
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 outline-none transition-all ${
                isDark 
                  ? 'bg-dark-bg border-dark-border text-white focus:border-brand-500 focus:ring-brand-500/20' 
                  : 'bg-gray-50 border-light-border text-light-text focus:border-brand-500 focus:ring-brand-500/20'
              }`}
              placeholder="e.g. 36"
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Date Played
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                required
                value={playedDate}
                max={new Date().toISOString().split('T')[0]} // Max date is today
                onChange={(e) => setPlayedDate(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:ring-2 outline-none transition-all ${
                  isDark 
                    ? 'bg-dark-bg border-dark-border text-white focus:border-brand-500 focus:ring-brand-500/20 [color-scheme:dark]' 
                    : 'bg-gray-50 border-light-border text-light-text focus:border-brand-500 focus:ring-brand-500/20 [color-scheme:light]'
                }`}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Add Score'
          )}
        </button>
      </form>
    </div>
  );
}
