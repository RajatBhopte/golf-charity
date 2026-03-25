import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, Clock, Eye, IndianRupee, Loader2, Search, Award } from 'lucide-react';
import { buildApiUrl } from '../utils/apiBase';
import { formatCurrencyINR } from '../utils/currency';

const formatAuditAction = (action) => action
  ?.replaceAll('_', ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase()) || 'Update';

const formatNumberSeries = (numbers = []) => (
  Array.isArray(numbers) && numbers.length ? numbers.join(', ') : 'None'
);

export default function AdminWinnerVerification({ isDark }) {
  const { session } = useAuth();
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, paid
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');

  const fetchWinners = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/admin/winners'), {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch winners');
      }
      setWinners(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchWinners();
    }
  }, [session, fetchWinners]);

  const updateStatus = async (winnerId, updates) => {
    if (!session) return;
    setUpdatingId(winnerId);
    setError('');
    try {
      const response = await fetch(buildApiUrl(`/admin/winners/${winnerId}`), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update winner');
      }

      setWinners((currentWinners) => currentWinners.map((winner) => (
        winner.id === winnerId ? data : winner
      )));
    } catch (error) {
      setError(error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredWinners = useMemo(() => winners.filter((winner) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch = !search
      || winner.users?.full_name?.toLowerCase().includes(search)
      || winner.users?.email?.toLowerCase().includes(search);

    if (filter === 'pending') return matchesSearch && winner.verification_status === 'pending';
    if (filter === 'approved') return matchesSearch && winner.verification_status === 'approved' && winner.payment_status === 'pending';
    if (filter === 'paid') return matchesSearch && winner.payment_status === 'paid';
    return matchesSearch;
  }), [winners, filter, searchTerm]);

  const rejectWinner = (winnerId) => {
    const rejectionReason = window.prompt('Add a rejection reason for audit visibility:', 'Rejected by admin');
    if (rejectionReason === null) {
      return;
    }
    updateStatus(winnerId, { verification_status: 'rejected', rejection_reason: rejectionReason });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-500" size={40} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-black/10 border border-white/5">
          {['pending', 'approved', 'paid', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                filter === f ? 'bg-brand-500 text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search winner"
            className={`w-full pl-11 pr-4 py-2.5 rounded-xl border ${
              isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-white border-light-border'
            }`}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className={`overflow-hidden rounded-2xl border ${isDark ? 'border-dark-border' : 'border-light-border shadow-sm'}`}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={isDark ? 'bg-white/5' : 'bg-gray-50'}>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Winner / Draw</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Tier</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Prize</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Verification</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Payment</th>
            </tr>
          </thead>
          <tbody className={isDark ? 'divide-y divide-dark-border' : 'divide-y divide-light-border bg-white'}>
            {filteredWinners.map((w) => (
              <tr key={w.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-bold flex items-center gap-2">
                       {w.users?.full_name || 'Unknown'} 
                       {w.proof_signed_url ? (
                         <a href={w.proof_signed_url} target="_blank" rel="noreferrer" className="text-brand-500 hover:text-brand-400" title="Open proof screenshot">
                           <Eye size={14} />
                         </a>
                       ) : (
                         <span className="text-gray-500" title="No screenshot uploaded"><Eye size={14} /></span>
                       )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Draw: {w.draws?.month_year
                        ? new Date(w.draws.month_year).toLocaleDateString([], { month: 'long', year: 'numeric' })
                        : 'Unknown draw'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Winning Numbers: {formatNumberSeries(w.draws?.winning_numbers)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Submitted Scores: {formatNumberSeries(w.submitted_scores)}
                    </div>
                    <div className="text-xs text-brand-500">
                      Matched Numbers: {formatNumberSeries(w.matched_numbers)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {w.users?.email || 'No email'} · Updated {w.updated_at ? new Date(w.updated_at).toLocaleString() : 'n/a'}
                    </div>
                    {w.rejection_reason && (
                      <div className="mt-2 text-xs text-red-400">
                        Rejection reason: {w.rejection_reason}
                      </div>
                    )}
                    {Array.isArray(w.audit_logs) && w.audit_logs.length > 0 && (
                      <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${isDark ? 'border-dark-border bg-dark-bg/70 text-gray-300' : 'border-light-border bg-gray-50 text-light-text'}`}>
                        <div className="mb-2 font-bold uppercase tracking-wider text-brand-500">Audit Trail</div>
                        <div className="space-y-2">
                          {w.audit_logs.slice(0, 3).map((log) => (
                            <div key={log.id} className="leading-relaxed">
                              <div className="font-semibold">{formatAuditAction(log.action)}</div>
                              <div className="text-gray-500">
                                {log.created_at ? new Date(log.created_at).toLocaleString() : 'Unknown time'}
                              </div>
                              {log.notes && <div>{log.notes}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                    w.prize_tier === 5 ? 'bg-amber-500/10 text-amber-500' : w.prize_tier === 4 ? 'bg-slate-400/20 text-slate-400' : 'bg-orange-700/20 text-orange-700'
                  }`}>
                    <Award size={12} /> {w.prize_tier}-MATCH
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-brand-500">
                  {formatCurrencyINR(w.amount)}
                </td>
                <td className="px-6 py-4">
                   <div className="flex justify-center gap-2">
                     <button 
                        onClick={() => updateStatus(w.id, { verification_status: 'approved' })}
                        disabled={updatingId === w.id}
                        className={`p-2 rounded-lg transition-all ${w.verification_status === 'approved' ? 'bg-green-500 text-white' : 'hover:bg-green-500/10 text-green-500'}`}
                        title="Approve Proof"
                     >
                       {updatingId === w.id ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                     </button>
                     <button 
                        onClick={() => rejectWinner(w.id)}
                        disabled={updatingId === w.id}
                        className={`p-2 rounded-lg transition-all ${w.verification_status === 'rejected' ? 'bg-red-500 text-white' : 'hover:bg-red-500/10 text-red-500'}`}
                        title="Reject Proof"
                     >
                       <XCircle size={18} />
                     </button>
                   </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    {(() => {
                      const isPaid = w.payment_status === 'paid';
                      const canProcessPayment = w.verification_status === 'approved' && !isPaid;
                      const isUpdating = updatingId === w.id;

                      return (
                     <button 
                        disabled={!canProcessPayment || isUpdating}
                        onClick={() => updateStatus(w.id, { payment_status: 'paid' })}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          w.payment_status === 'paid' 
                            ? 'bg-blue-500/10 text-blue-500' 
                            : canProcessPayment
                              ? 'bg-brand-500 text-white hover:scale-105' 
                              : 'bg-gray-500/10 text-gray-500 cursor-not-allowed opacity-30'
                        }`}
                     >
                       <IndianRupee size={14} /> {w.payment_status === 'paid' ? 'Marked Paid' : 'Process Payment'}
                     </button>
                      );
                    })()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredWinners.length === 0 && (
          <div className="py-20 text-center text-gray-500 opacity-50 flex flex-col items-center gap-4">
             <Clock size={48} />
             <p className="font-bold uppercase tracking-widest text-sm">No {filter} winners found</p>
          </div>
        )}
      </div>
    </div>
  );
}
