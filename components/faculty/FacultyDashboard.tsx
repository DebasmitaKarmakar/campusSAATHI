import React, { useState, useEffect } from 'react';
import { User, VerificationRequest, VerificationStatus } from '../../types';
import { dbService } from '../../services/dbService';

interface FacultyDashboardProps {
  user: User;
}

const STATUS_STYLES: Record<VerificationStatus, string> = {
  Pending:  'bg-amber-100 text-amber-800 border-amber-200',
  Approved: 'bg-green-100 text-green-800 border-green-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
};

const TYPE_LABELS: Record<VerificationRequest['type'], string> = {
  event:           'Event',
  coordinator:     'Coordinator',
  notice:          'Notice',
  org_detail:      'Org Detail',
  flagged_content: 'Flagged Content',
};

// Two example verification requests — real data comes from student/faculty actions
const SEED_REQUESTS: VerificationRequest[] = [
  {
    id: 'VR-001', type: 'event', targetId: 'EVT-001', targetName: 'Annual Hackathon — Sample Request',
    requestedBy: 'student@nfsu.ac.in', requestedAt: Date.now() - 86400000 * 2, status: 'Pending',
  },
  {
    id: 'VR-002', type: 'org_detail', targetId: 'ORG-001', targetName: 'Coding Club Description Update — Sample',
    requestedBy: 'student@nfsu.ac.in', requestedAt: Date.now() - 86400000 * 5, status: 'Approved',
    facultyId: '3000', comment: 'Content verified and accurate.', reviewedAt: Date.now() - 86400000 * 4,
  },
];

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ user }) => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [filter, setFilter] = useState<VerificationStatus | 'all'>('all');
  const [comment, setComment] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let stored = dbService.getTable<VerificationRequest>('verification_requests');
    if (stored.length === 0) {
      dbService.saveTable('verification_requests', SEED_REQUESTS);
      stored = SEED_REQUESTS;
    }
    setRequests(stored);
  }, []);

  const refresh = () => {
    setRequests(dbService.getTable<VerificationRequest>('verification_requests'));
  };

  const decide = (id: string, status: 'Approved' | 'Rejected') => {
    dbService.updateRow<VerificationRequest>('verification_requests', id, {
      status,
      facultyId: user.id,
      reviewedAt: Date.now(),
      comment: comment[id] ?? '',
    });
    setActiveId(null);
    refresh();
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  return (
    <div className="w-full max-w-6xl space-y-6 md:space-y-10 animate-fadeIn">
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border-2 border-nfsu-gold/20 overflow-hidden">
        <div className="p-6 md:p-10 lg:p-12 border-b-2 border-nfsu-paper bg-gradient-to-br from-nfsu-paper to-white">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">
                Institutional Verification Authority
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-nfsu-navy tracking-tighter italic uppercase">
                Faculty <span className="text-nfsu-gold">Review Panel</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                Approve or reject events, coordinators, notices, and flagged content.
              </p>
            </div>
            {pendingCount > 0 && (
              <div className="px-5 py-3 bg-amber-100 border-2 border-amber-300 text-amber-800 text-[10px] font-black rounded-2xl uppercase tracking-widest">
                {pendingCount} Pending Review
              </div>
            )}
          </div>
        </div>

        <div className="px-6 md:px-10 lg:px-12 py-5 border-b-2 border-nfsu-paper flex gap-2 flex-wrap">
          {(['all', 'Pending', 'Approved', 'Rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                filter === f
                  ? 'bg-nfsu-navy text-white border-nfsu-navy shadow-lg'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-navy/40'
              }`}
            >
              {f === 'all' ? 'All' : f}
              <span className={`ml-2 ${filter === f ? 'text-nfsu-gold' : 'text-slate-400'}`}>
                {f === 'all' ? requests.length : requests.filter(r => r.status === f).length}
              </span>
            </button>
          ))}
        </div>

        <div className="p-6 md:p-10 lg:p-12 space-y-4">
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No requests in this category.</p>
            </div>
          )}
          {filtered.map(req => (
            <div key={req.id} className={`bg-slate-50 rounded-[1.5rem] border-2 transition-all ${
              req.status === 'Pending' ? 'border-amber-200 hover:border-amber-400' : 'border-slate-100'
            }`}>
              <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[8px] font-black text-nfsu-navy uppercase tracking-widest bg-nfsu-navy/10 px-2.5 py-1 rounded-lg border border-nfsu-navy/10">
                      {TYPE_LABELS[req.type]}
                    </span>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${STATUS_STYLES[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                  <h4 className="font-black text-nfsu-navy uppercase text-sm tracking-tight">{req.targetName}</h4>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Requested by {req.requestedBy} &middot; {new Date(req.requestedAt).toLocaleDateString()}
                  </div>
                  {req.comment && (
                    <div className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl uppercase tracking-wider">
                      Comment: {req.comment}
                    </div>
                  )}
                </div>

                {req.status === 'Pending' && (
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => setActiveId(activeId === req.id ? null : req.id)}
                      className="px-5 py-3 bg-nfsu-navy text-white text-[9px] font-black rounded-xl uppercase tracking-widest hover:bg-nfsu-maroon transition-all border-b-4 border-black/15"
                    >
                      {activeId === req.id ? 'Close' : 'Review'}
                    </button>
                  </div>
                )}
              </div>

              {activeId === req.id && req.status === 'Pending' && (
                <div className="px-5 md:px-6 pb-6 space-y-4 border-t-2 border-slate-200 pt-5">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Review Comment (Optional)
                    </label>
                    <textarea
                      value={comment[req.id] ?? ''}
                      onChange={e => setComment(prev => ({ ...prev, [req.id]: e.target.value }))}
                      className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-nfsu-navy transition-all resize-none h-20 uppercase"
                      placeholder="ADD REVIEW NOTES..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => decide(req.id, 'Rejected')}
                      className="flex-1 py-3 bg-red-50 text-red-700 border-2 border-red-200 font-black text-[9px] rounded-xl uppercase tracking-widest hover:bg-red-100 transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => decide(req.id, 'Approved')}
                      className="flex-1 py-3 bg-green-600 text-white font-black text-[9px] rounded-xl uppercase tracking-widest hover:bg-green-700 transition-all border-b-4 border-green-800/20 shadow-md"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
