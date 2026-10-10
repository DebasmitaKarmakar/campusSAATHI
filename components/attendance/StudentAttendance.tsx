import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord } from '../../types';
import { attendanceService } from '../../services/attendanceService';

// ---- Types ------------------------------------------------------------------

interface SubjectStat {
  name: string;
  code: string;
  total: number;
  present: number;
}

interface Summary {
  bySubject: SubjectStat[];
  weekly:  { attended: number; total: number; pct: number | null };
  monthly: { attended: number; total: number; pct: number | null };
  overall: { attended: number; total: number; pct: number | null };
}

const LOW_THRESHOLD = 70;

// ---- Percentage ring --------------------------------------------------------

const Ring: React.FC<{ pct: number | null; size?: number }> = ({ pct, size = 64 }) => {
  const r    = size * 0.42;
  const circ = 2 * Math.PI * r;
  const safe = pct ?? 0;
  const clr  = safe >= 75 ? '#16a34a' : safe >= LOW_THRESHOLD ? '#d97706' : '#dc2626';
  const dash = circ * (1 - safe / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={size * 0.07} />
      {pct !== null && (
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={clr} strokeWidth={size * 0.07}
          strokeDasharray={circ} strokeDashoffset={dash}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s' }}
        />
      )}
      <text
        x={size / 2} y={size / 2 + size * 0.09}
        textAnchor="middle"
        fontSize={size * 0.19}
        fontWeight={900}
        fill="#002147"
      >
        {pct === null ? 'N/A' : `${Math.round(pct)}%`}
      </text>
    </svg>
  );
};

// ---- Period card ------------------------------------------------------------

const PeriodCard: React.FC<{
  label: string;
  data: { attended: number; total: number; pct: number | null };
  low: boolean;
}> = ({ label, data, low }) => (
  <div
    className={`bg-white rounded-[1.5rem] border-2 p-5 flex items-center gap-4 shadow-sm transition-all ${
      low && data.pct !== null ? 'border-red-200 bg-red-50/30' :
      data.pct !== null && data.pct < 75 ? 'border-amber-200' :
      'border-slate-100'
    }`}
  >
    <Ring pct={data.pct} size={60} />
    <div>
      <div className="font-black text-nfsu-navy uppercase italic">{label}</div>
      <div className="text-[13px] font-black text-nfsu-navy mt-0.5">
        {data.attended}
        <span className="text-slate-400 font-bold"> / {data.total} classes</span>
      </div>
      {data.pct !== null && data.pct < LOW_THRESHOLD && (
        <div className="text-[10px] font-black text-red-600 mt-0.5 uppercase tracking-widest">
          Low attendance
        </div>
      )}
    </div>
  </div>
);

// ---- Main component ---------------------------------------------------------

type Tab = 'summary' | 'history';

export const StudentAttendance: React.FC<{ user: User }> = ({ user }) => {
  const [summary,    setSummary]   = useState<Summary | null>(null);
  const [records,    setRecords]   = useState<AttendanceRecord[]>([]);
  const [filterCode, setFilter]    = useState('All');
  const [tab,        setTab]       = useState<Tab>('summary');

  const load = () => {
    setSummary(attendanceService.getFullAttendanceSummary(user.email));
    setRecords(attendanceService.getRecordsForStudent(user.email));
  };

  useEffect(() => { load(); }, [user.email]);

  const subjectCodes = Array.from(new Set(records.map(r => r.subjectCode)));
  const visible      = filterCode === 'All' ? records : records.filter(r => r.subjectCode === filterCode);

  // Low attendance for any period?
  const overallLow =
    summary !== null &&
    summary.overall.pct !== null &&
    summary.overall.pct < LOW_THRESHOLD;

  return (
    <div className="w-full space-y-6 animate-fadeIn">

      {/* Header */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-nfsu-gold/30 shadow-sm">
        <h2 className="text-2xl md:text-3xl font-black text-nfsu-navy uppercase italic tracking-tight">
          My Attendance
        </h2>
        <p className="text-slate-500 text-sm font-medium mt-1 max-w-xl">
          Attendance is marked by face recognition during class time on the faculty device.
          You do not need to do anything from your own device other than check your records here.
        </p>
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 inline-flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[11px] font-black text-amber-700">
            Marking is only possible during class time ({LOW_THRESHOLD}% minimum required).
          </span>
        </div>
      </div>

      {/* Low attendance alert */}
      {overallLow && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl px-6 py-4 flex items-start gap-4">
          <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <div className="font-black text-red-700 uppercase tracking-widest text-sm">
              Low Attendance Warning
            </div>
            <div className="text-[11px] text-red-600 font-medium mt-0.5 leading-relaxed">
              Your overall attendance is below {LOW_THRESHOLD}%.
              Minimum requirement is {LOW_THRESHOLD}%. Contact your faculty or department if needed.
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2">
        {([
          { id: 'summary', label: 'Subject Summary' },
          { id: 'history', label: 'Full History'    },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[11px] border-2 transition-all ${
              tab === t.id
                ? 'bg-nfsu-navy text-white border-nfsu-navy shadow-md'
                : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-navy/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---- Summary Tab --------------------------------------------------- */}
      {tab === 'summary' && (
        <div className="space-y-5">
          {!summary || summary.bySubject.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-10 text-center border-2 border-dashed border-slate-200">
              <p className="font-black text-slate-400 uppercase italic text-sm">
                No attendance data yet.
              </p>
              <p className="text-slate-300 text-sm mt-1">
                Your attendance will appear here after your faculty conducts a class.
              </p>
            </div>
          ) : (
            <>
              {/* Period cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PeriodCard
                  label="This Week"
                  data={summary.weekly}
                  low={summary.weekly.pct !== null && summary.weekly.pct < LOW_THRESHOLD}
                />
                <PeriodCard
                  label="This Month"
                  data={summary.monthly}
                  low={summary.monthly.pct !== null && summary.monthly.pct < LOW_THRESHOLD}
                />
                <PeriodCard
                  label="Overall"
                  data={summary.overall}
                  low={summary.overall.pct !== null && summary.overall.pct < LOW_THRESHOLD}
                />
              </div>

              {/* Per-subject cards */}
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-4">
                  <span>By Subject</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {summary.bySubject.map(s => {
                    const pct = s.total > 0 ? (s.present / s.total) * 100 : null;
                    return (
                      <div
                        key={s.code}
                        className={`bg-white rounded-[2rem] border-2 p-5 flex gap-4 items-center shadow-sm ${
                          pct !== null && pct < LOW_THRESHOLD ? 'border-red-200' :
                          pct !== null && pct < 75            ? 'border-amber-200' :
                          'border-slate-100'
                        }`}
                      >
                        <div className="flex-shrink-0"><Ring pct={pct} size={60} /></div>
                        <div className="min-w-0">
                          <div className="font-black text-nfsu-navy text-sm leading-tight">{s.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">{s.code}</div>
                          <div className="mt-1.5 text-[12px] font-black">
                            <span className="text-green-700">{s.present}</span>
                            <span className="text-slate-400"> / {s.total} classes</span>
                          </div>
                          {pct !== null && pct < LOW_THRESHOLD && (
                            <div className="text-[10px] font-black text-red-600 mt-0.5 uppercase tracking-wide">
                              Below {LOW_THRESHOLD}% — critical
                            </div>
                          )}
                          {pct !== null && pct >= LOW_THRESHOLD && pct < 75 && (
                            <div className="text-[10px] font-black text-amber-600 mt-0.5 uppercase tracking-wide">
                              Below 75%
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- History Tab --------------------------------------------------- */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['All', ...subjectCodes] as const).map(c => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black border-2 transition-all ${
                  filterCode === c
                    ? 'bg-nfsu-gold text-nfsu-navy border-nfsu-gold'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-gold/60'
                }`}
              >
                {c === 'All' ? 'All Subjects' : c}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-10 text-center border-2 border-dashed border-slate-200">
              <p className="font-black text-slate-400 uppercase italic text-sm">No records found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-sm">
              <div className="divide-y divide-slate-50">
                {visible.map(r => (
                  <div key={r.id} className="px-5 py-4 flex items-center gap-4 hover:bg-green-50/20 transition-all">
                    <div className="w-9 h-9 bg-nfsu-navy rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-nfsu-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-nfsu-navy text-sm">
                        {r.subjectName}
                        <span className="ml-2 text-[10px] font-bold text-slate-400">{r.subjectCode}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {r.date} &middot;{' '}
                        {new Date(r.markedAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                        &nbsp;&middot;&nbsp;{r.branch} &middot; {r.semester}
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-lg uppercase">
                      Present
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
