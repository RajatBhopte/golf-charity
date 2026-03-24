import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Pencil, Trash2, X, Check, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export default function ScoreList({ scores = [], onEdit, onDelete, loading }) {
  const { isDark } = useTheme();
  const [editingId, setEditingId] = useState(null);
  const [editScore, setEditScore] = useState('');
  const [editDate, setEditDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate Relative Time
  const getRelativeTime = (dateString) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((new Date(dateString) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference === 0) return 'Today';
    return rtf.format(daysDifference, 'day');
  };

  const handleEditClick = (score) => {
    setErrorMsg('');
    setEditingId(score.id);
    setEditScore(score.score.toString());
    setEditDate(score.played_date);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setErrorMsg('');
  };

  const handleSaveEdit = async () => {
    setErrorMsg('');
    if (!editScore || !editDate) return setErrorMsg('Fields required');
    
    setActionLoading(true);
    const result = await onEdit(editingId, { 
      score: parseInt(editScore, 10), 
      played_date: editDate 
    });
    
    setActionLoading(false);
    if (result.success) {
      setEditingId(null);
    } else {
      setErrorMsg(result.error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this score?')) {
      setActionLoading(true);
      await onDelete(id);
      setActionLoading(false);
    }
  };

  // Find the oldest score to highlight it (the one that will be replaced next)
  // Assuming scores array is sorted newest first (played_date DESC, created_at DESC)
  // But wait, "oldest score" in terms of deletion is based on created_at ASC.
  // We'll calculate the oldest created_at explicitly if we have 5 scores.
  const oldestScoreId = scores.length === 5 
    ? [...scores].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0].id
    : null;

  return (
    <div className={`flex flex-col h-full rounded-2xl border backdrop-blur-xl ${
      isDark 
        ? 'bg-dark-card border-dark-border' 
        : 'bg-white border-light-border shadow-md'
    }`}>
      <div className="p-6 sm:p-8 border-b border-opacity-50 border-inherit">
        <h3 className="text-xl font-bold">Your Score History</h3>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
          {scores.length} / 5 scores logged for the upcoming draw
        </p>
      </div>

      <div className="p-6 sm:p-8 flex-1 flex flex-col gap-3">
        {loading && scores.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : scores.length === 0 ? (
          <div className={`flex flex-col items-center justify-center text-center py-10 rounded-xl border border-dashed ${isDark ? 'border-dark-border bg-dark-bg/50' : 'border-light-border bg-gray-50'}`}>
            <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center mb-3">
              <AlertCircle className="text-brand-500" size={24} />
            </div>
            <h4 className="font-semibold mb-1">No Scores Yet</h4>
            <p className={`text-sm max-w-[200px] mx-auto ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
              Add 5 scores to complete your draw entry for this month!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {errorMsg && (
               <div className="p-2 bg-red-500/10 text-red-500 text-xs rounded-lg text-center mb-2">
                 {errorMsg}
               </div>
            )}
            {scores.map((scoreObj) => {
              const isEditing = editingId === scoreObj.id;
              const isOldest = scoreObj.id === oldestScoreId;

              return (
                <div 
                  key={scoreObj.id} 
                  className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isEditing 
                      ? (isDark ? 'bg-dark-bg border-brand-500/50' : 'bg-brand-50 border-brand-500/50') 
                      : (isDark ? 'bg-dark-bg border-dark-border hover:border-brand-500/30' : 'bg-gray-50 border-light-border hover:border-brand-500/30')
                  } ${isOldest ? 'ring-1 ring-amber-500/30 border-amber-500/30 before:absolute before:-top-2 before:right-4 before:px-2 before:py-0.5 before:bg-amber-500/10 before:text-amber-500 before:text-[10px] before:font-bold before:rounded-full before:content-["Next_to_replace"]' : ''}`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-3 w-full">
                      <input 
                        type="number" 
                        value={editScore} 
                        onChange={e => setEditScore(e.target.value)}
                        className={`w-16 px-2 py-1 text-lg font-bold text-center rounded-lg border outline-none ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-300'}`}
                        min="1" max="45"
                      />
                      <input 
                        type="date" 
                        value={editDate} 
                        onChange={e => setEditDate(e.target.value)}
                        className={`flex-1 px-2 py-1 text-sm rounded-lg border outline-none ${isDark ? 'bg-dark-card border-dark-border [color-scheme:dark]' : 'bg-white border-gray-300 [color-scheme:light]'}`}
                      />
                      <div className="flex items-center gap-1">
                        <button onClick={handleSaveEdit} disabled={actionLoading} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors">
                          <Check size={18} />
                        </button>
                        <button onClick={handleCancelEdit} disabled={actionLoading} className="p-1.5 text-gray-400 hover:bg-gray-500/10 rounded-lg transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400/20 to-brand-600/20 border border-brand-500/20 flex items-center justify-center">
                          <span className="text-xl font-bold text-brand-500">{scoreObj.score}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {new Date(scoreObj.played_date).toLocaleDateString(undefined, {
                              weekday: 'short', month: 'short', day: 'numeric'
                            })}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {getRelativeTime(scoreObj.played_date)}
                          </p>
                        </div>
                      </div>

                      {/* Hover Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button onClick={() => handleEditClick(scoreObj)} disabled={actionLoading} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-card text-gray-400 hover:text-white' : 'hover:bg-white text-gray-500 hover:text-gray-900'}`}>
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(scoreObj.id)} disabled={actionLoading} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-card text-gray-400 hover:text-red-500' : 'hover:bg-white text-gray-500 hover:text-red-500'}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Draw Entry Status Footer */}
      <div className={`p-4 sm:p-6 mt-auto border-t rounded-b-2xl ${
        scores.length === 5 
          ? (isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-100')
          : (isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100')
      }`}>
        <div className="flex items-center gap-3">
          {scores.length === 5 ? (
            <>
              <CheckCircle2 className="text-green-500" size={24} />
              <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                ✅ You are entered in the next draw!
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="text-amber-500" size={24} />
              <p className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                ⚠️ Add {5 - scores.length} more score{scores.length === 4 ? '' : 's'} to enter the draw!
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
