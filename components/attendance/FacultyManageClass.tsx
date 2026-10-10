import React, { useState, useEffect } from 'react';
import { User, TimetableSlot, ClassReschedule, AttendanceSession } from '../../types';
import { attendanceService, todayStr } from '../../services/attendanceService';

const STATUS_PILL: Record<ClassReschedule['status'], string> = {
  Pending:  'bg-amber-100 text-amber-800 border-amber-300',
  Approved: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100   text-red-700   border-red-300',
};

const EMPTY_FORM = {
  slotId: '', originalDate: '', newDate: '',
  newStartTime: '', newEndTime: '', reason: '',
};

type Mode = 'Reschedule' | 'Extra';

export const FacultyManageClass: React.FC<{ user: User }> = ({ user }) => {
  const [slots,    setSlots]    = useState<TimetableSlot[]>([]);
  const [requests, setRequests] = useState<ClassReschedule[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [mode,     setMode]     = useState<Mode>('Reschedule');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);

  const refresh = () => {
    setSlots(attendanceService.getSlotsForFaculty(user.email));
    setRequests(attendanceService.getRescheduleForFaculty(user.email));
    setSessions(attendanceService.getAllSessionsForFaculty(user.email).slice(0, 40));
  };

  useEffect(() => { refresh(); }, [user.email]);

  const f = (k: keyof typeof EMPTY_FORM, v: string) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    const { newDate, newStartTime, newEndTime, reason } = form;
    if (!newDate || !newStartTime || !newEndTime || !reason.trim()) {
      alert('Date, start time, end time, and reason are all required.');
      return;
    }
    if (mode === 'Reschedule' && !form.slotId) {
      alert('Select which class you are rescheduling.');
      return;
    }
    if (newStartTime >= newEndTime) {
      alert('End time must be after start time.');
      return;
    }

    attendanceService.requestReschedule({
      slotId:       form.slotId || 'EXTRA',
      requestedBy:  user.email,
      type:         mode,
      originalDate: form.originalDate || undefined,
      newDate,
      newStartTime,
      newEndTime,
      reason:       reason.trim(),
    });

    setShowForm(false);
    setForm(EMPTY_FORM);
    refresh();
    alert('Request submitted to admin for approval.');
  };

  // Subject statistics
  const stats: Record<string, { name: string; code: string; sessions: number; students: number }> = {};
  for (const s of sessions) {
    if (!stats[s.subjectCode]) {
      stats[s.subjectCode] = { name: s.subjectName, code: s.subjectCode, sessions: 0, students: 0 };
    }
    stats[s.subjectCode].sessions++;
    stats[s.subjectCode].students += attendanceService.getRecordsForSession(s.id).length;
  }

  return (
    <div className="w-full space-y-7 animate-fadeIn">

      {/* Header */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-nfsu-gold/30 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-nfsu-navy uppercase italic tracking-tight">
              Manage Classes
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1 max-w-xl">
              Request a class reschedule or extra session. All requests go to the admin.
              Approved sessions appear in your Take Attendance dashboard on the scheduled date.
            </p>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
            className="px-6 py-3 bg-nfsu-navy text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-nfsu-maroon transition-all shadow-md flex-shrink-0"
          >
            {showForm ? 'Cancel' : '+ New Request'}
          </button>
        </div>
      </div>

      {/* Request form */}
      {showForm && (
        <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-nfsu-navy/20 shadow-md">
          <div className="flex gap-2 mb-6">
            {(['Reschedule', 'Extra'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[11px] border-2 transition-all ${
                  mode === m
                    ? 'bg-nfsu-navy text-white border-nfsu-navy'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-navy/40'
                }`}
              >
                {m === 'Reschedule' ? 'Reschedule Class' : 'Extra Class'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="frm-lbl">
                {mode === 'Reschedule' ? 'Class to Reschedule *' : 'Related Class (optional)'}
              </label>
              <select value={form.slotId} onChange={e => f('slotId', e.target.value)} className="frm-sel">
                <option value="">
                  {mode === 'Reschedule' ? 'Select class...' : 'No specific class'}
                </option>
                {slots.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.subjectName} ({s.subjectCode}) — {s.weekday} {s.startTime}–{s.endTime}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'Reschedule' && (
              <div>
                <label className="frm-lbl">Original Cancelled Date</label>
                <input type="date" value={form.originalDate} onChange={e => f('originalDate', e.target.value)} className="frm-inp" />
              </div>
            )}
            <div>
              <label className="frm-lbl">New Date *</label>
              <input type="date" value={form.newDate} min={todayStr()} onChange={e => f('newDate', e.target.value)} className="frm-inp" />
            </div>
            <div>
              <label className="frm-lbl">Start Time *</label>
              <input type="time" value={form.newStartTime} onChange={e => f('newStartTime', e.target.value)} className="frm-inp" />
            </div>
            <div>
              <label className="frm-lbl">End Time *</label>
              <input type="time" value={form.newEndTime} onChange={e => f('newEndTime', e.target.value)} className="frm-inp" />
            </div>
            <div className="md:col-span-2">
              <label className="frm-lbl">Reason *</label>
              <textarea
                value={form.reason} onChange={e => f('reason', e.target.value)} rows={3}
                placeholder="Explain why..."
                className="frm-inp resize-none"
              />
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-nfsu-navy text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-nfsu-maroon transition-all shadow-md"
            >
              Submit to Admin
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subject stats */}
      {Object.values(stats).length > 0 && (
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3 flex items-center gap-4">
            <span>My Subjects</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.values(stats).map(s => (
              <div key={s.code} className="bg-white rounded-[1.5rem] border-2 border-slate-100 p-4 text-center">
                <div className="text-2xl font-black text-nfsu-navy">{s.sessions}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">sessions</div>
                <div className="text-lg font-black text-green-700 mt-1">{s.students}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">students marked</div>
                <div className="font-black text-nfsu-navy text-xs mt-2 leading-tight">{s.name}</div>
                <div className="text-[10px] text-slate-400">{s.code}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requests */}
      <div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-4">
          <span>My Requests</span>
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-nfsu-gold">{requests.length} total</span>
        </div>
        {requests.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-8 text-center border-2 border-dashed border-slate-200">
            <p className="font-black text-slate-400 uppercase italic text-sm">No requests yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => {
              const slot = slots.find(s => s.id === r.slotId);
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-[1.5rem] border-2 p-5 ${
                    r.status === 'Pending'  ? 'border-amber-200' :
                    r.status === 'Approved' ? 'border-green-200' : 'border-red-200'
                  }`}
                >
                  <div className="flex flex-wrap gap-3 items-start justify-between">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${STATUS_PILL[r.status]}`}>
                          {r.status}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                          r.type === 'Extra'
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : 'bg-purple-100 text-purple-700 border-purple-200'
                        }`}>{r.type}</span>
                      </div>
                      <div className="font-black text-nfsu-navy">
                        {slot ? `${slot.subjectName} (${slot.subjectCode})` : 'Extra Class'}
                      </div>
                      {r.originalDate && (
                        <div className="text-[11px] text-slate-500">
                          Original: <strong className="text-nfsu-maroon">{r.originalDate}</strong>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-700 font-medium">
                        New: <strong>{r.newDate}</strong>&nbsp; {r.newStartTime}&ndash;{r.newEndTime}
                      </div>
                      <div className="text-[11px] text-slate-400 italic">&ldquo;{r.reason}&rdquo;</div>
                      {r.reviewedBy && (
                        <div className="text-[10px] text-slate-400">
                          Reviewed by {r.reviewedBy}
                          {r.reviewNote && ` — "${r.reviewNote}"`}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 flex-shrink-0">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .frm-lbl { display:block; font-size:9px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:.12em; margin-bottom:5px; }
        .frm-inp { width:100%; padding:9px 13px; border-radius:10px; border:2px solid #e2e8f0; font-size:13px; font-weight:500; outline:none; }
        .frm-inp:focus { border-color:#002147; }
        .frm-sel { width:100%; padding:9px 13px; border-radius:10px; border:2px solid #e2e8f0; font-size:13px; font-weight:500; outline:none; background:white; }
        .frm-sel:focus { border-color:#002147; }
      `}</style>
    </div>
  );
};
