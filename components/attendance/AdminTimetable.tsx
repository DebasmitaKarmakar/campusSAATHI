import React, { useState, useEffect, useCallback } from 'react';
import { User, TimetableSlot, Weekday, ClassReschedule } from '../../types';
import {
  attendanceService,
  WEEKDAYS,
  SEMESTERS,
  BRANCHES,
  getStudentMeta,
  setStudentMeta,
} from '../../services/attendanceService';
import { getWhitelistEntries } from '../../services/authService';

// ---- Constants ---------------------------------------------------------------

const DAY_COLOR: Record<Weekday, string> = {
  Monday:    'bg-blue-50   border-blue-200   text-blue-800',
  Tuesday:   'bg-violet-50 border-violet-200 text-violet-800',
  Wednesday: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  Thursday:  'bg-amber-50  border-amber-200  text-amber-800',
  Friday:    'bg-rose-50   border-rose-200   text-rose-800',
  Saturday:  'bg-slate-50  border-slate-200  text-slate-600',
};

const EMPTY_BLOCK = {
  subjectName: '',
  subjectCode: '',
  facultyEmail: '',
  facultyName: '',
  startTime: '',
  endTime: '',
};

type ClassBlock = typeof EMPTY_BLOCK;
type AdminTab = 'timetable' | 'approvals';

// ---- Component ---------------------------------------------------------------

export const AdminTimetable: React.FC<{ user: User }> = ({ user }) => {
  const [tab,          setTab]       = useState<AdminTab>('timetable');
  const [slots,        setSlots]     = useState<TimetableSlot[]>([]);
  const [requests,     setRequests]  = useState<ClassReschedule[]>([]);
  const [facultyList,  setFacList]   = useState<{ email: string; name: string }[]>([]);
  const [rejectNotes,  setRNotes]    = useState<Record<string, string>>({});

  // Step 1 state
  const [showRoutine,  setShowRoutine] = useState(false);
  const [step1Done,    setStep1Done]   = useState(false);
  const [selDay,       setSelDay]      = useState<Weekday>('Monday');
  const [selBranch,    setSelBranch]   = useState('');
  const [selSemester,  setSelSem]      = useState('');

  // Step 2 — class blocks
  const [blocks, setBlocks] = useState<ClassBlock[]>([{ ...EMPTY_BLOCK }]);

  // Filter
  const [filterDay,    setFilterDay]  = useState<Weekday | 'All'>('All');
  const [filterBranch, setFBranch]    = useState('All');
  const [filterSem,    setFSem]       = useState('All');

  // Session refresh
  const [refreshResult, setRefreshResult] = useState<{ promoted: number; archived: number } | null>(null);
  const [confirmRefresh, setConfirmRefresh] = useState(false);

  const refresh = useCallback(() => {
    setSlots(attendanceService.getSlots());
    setRequests(attendanceService.getRescheduleRequests());
    setFacList(
      getWhitelistEntries()
        .filter(e => e.role === 'faculty')
        .map(e => ({ email: e.email, name: e.fullName })),
    );
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ---- Step 1 lock-in -------------------------------------------------------
  const handleStep1 = () => {
    if (!selBranch || !selSemester) { alert('Select Branch and Semester to continue.'); return; }
    setStep1Done(true);
  };

  // ---- Block helpers --------------------------------------------------------
  const setBlock = (idx: number, key: keyof ClassBlock, value: string) => {
    setBlocks(prev => {
      const next = [...prev];
      if (key === 'facultyEmail') {
        const fac = facultyList.find(f => f.email === value);
        next[idx] = { ...next[idx], facultyEmail: value, facultyName: fac?.name ?? '' };
      } else {
        next[idx] = { ...next[idx], [key]: value };
      }
      return next;
    });
  };

  const addBlock = () => {
    if (blocks.length >= 6) return;
    setBlocks(prev => [...prev, { ...EMPTY_BLOCK }]);
  };

  const removeBlock = (idx: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  // ---- Save routine ---------------------------------------------------------
  const handleSaveRoutine = () => {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b.subjectName || !b.subjectCode || !b.facultyEmail || !b.startTime || !b.endTime) {
        alert(`Class ${i + 1}: all fields are required.`);
        return;
      }
      if (b.startTime >= b.endTime) {
        alert(`Class ${i + 1}: end time must be after start time.`);
        return;
      }
    }

    blocks.forEach((b, idx) => {
      attendanceService.createSlot({
        branch:      selBranch,
        semester:    selSemester,
        weekday:     selDay,
        classOrder:  idx + 1,
        subjectName: b.subjectName,
        subjectCode: b.subjectCode,
        facultyEmail: b.facultyEmail,
        facultyName:  b.facultyName,
        startTime:   b.startTime,
        endTime:     b.endTime,
      });
    });

    setShowRoutine(false);
    setStep1Done(false);
    setBlocks([{ ...EMPTY_BLOCK }]);
    setSelBranch('');
    setSelSem('');
    refresh();
  };

  const cancelRoutine = () => {
    setShowRoutine(false);
    setStep1Done(false);
    setBlocks([{ ...EMPTY_BLOCK }]);
    setSelBranch('');
    setSelSem('');
  };

  // ---- Session refresh ------------------------------------------------------
  const handleRefresh = () => {
    const result = attendanceService.runSessionRefresh();
    setRefreshResult(result);
    setConfirmRefresh(false);
    refresh();
  };

  // ---- Filtered slots -------------------------------------------------------
  const filtered = slots.filter(s =>
    (filterDay    === 'All' || s.weekday  === filterDay) &&
    (filterBranch === 'All' || s.branch   === filterBranch) &&
    (filterSem    === 'All' || s.semester === filterSem),
  );

  const pending = requests.filter(r => r.status === 'Pending');

  // ---- Render ---------------------------------------------------------------
  return (
    <div className="w-full space-y-6 animate-fadeIn">

      {/* ---- Header -------------------------------------------------------- */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-nfsu-gold/30 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">
              Admin Panel
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-nfsu-navy uppercase italic tracking-tight">
              Timetable &amp; Session Control
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1 max-w-xl">
              Build the weekly class routine by selecting Day, Branch, and Semester once — then
              add up to 6 class blocks. Faculty see their assigned classes automatically.
            </p>
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            {/* Tab buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setTab('timetable')}
                className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 transition-all ${
                  tab === 'timetable'
                    ? 'bg-nfsu-navy text-white border-nfsu-navy'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-navy/40'
                }`}
              >
                Timetable
              </button>
              <button
                onClick={() => setTab('approvals')}
                className={`relative px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 transition-all ${
                  tab === 'approvals'
                    ? 'bg-nfsu-navy text-white border-nfsu-navy'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-navy/40'
                }`}
              >
                Approvals
                {pending.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-nfsu-maroon text-white rounded-full text-[9px] font-black flex items-center justify-center">
                    {pending.length}
                  </span>
                )}
              </button>
            </div>

            {/* New Session Refresh */}
            <button
              onClick={() => setConfirmRefresh(true)}
              className="px-4 py-2.5 bg-nfsu-maroon text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-800 transition-all shadow-sm"
            >
              New Session Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ---- Session Refresh Modal ----------------------------------------- */}
      {confirmRefresh && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border-4 border-nfsu-maroon">
            <h3 className="text-xl font-black text-nfsu-navy uppercase italic mb-3">
              New Session Refresh
            </h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-2">
              This will increment every active student's semester by +1.
              Students at Sem 8 will be marked as graduated.
            </p>
            <p className="text-[11px] text-slate-400 mb-6">
              Attendance records, student IDs, and timetable history are never deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                className="flex-1 py-3 bg-nfsu-maroon text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all"
              >
                Confirm Refresh
              </button>
              <button
                onClick={() => setConfirmRefresh(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[10px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Refresh Result ------------------------------------------------- */}
      {refreshResult && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <div className="font-black text-green-800 text-sm uppercase tracking-widest">
              Session Refresh Complete
            </div>
            <div className="text-[11px] text-green-700 font-medium mt-0.5">
              {refreshResult.promoted} student(s) advanced &middot; {refreshResult.archived} archived (Sem 8 completed)
            </div>
          </div>
          <button
            onClick={() => setRefreshResult(null)}
            className="w-7 h-7 rounded-lg bg-green-200 text-green-700 font-black text-lg flex items-center justify-center hover:bg-green-300 transition-all"
          >
            &times;
          </button>
        </div>
      )}

      {/* ==== TIMETABLE TAB ================================================= */}
      {tab === 'timetable' && (
        <>
          {/* Add Routine button */}
          <div className="flex justify-end">
            <button
              onClick={() => { setShowRoutine(v => !v); setStep1Done(false); setBlocks([{ ...EMPTY_BLOCK }]); }}
              className="px-6 py-3 bg-nfsu-navy text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-nfsu-maroon transition-all shadow-md"
            >
              {showRoutine ? 'Cancel' : '+ Add Routine'}
            </button>
          </div>

          {/* ---- Routine Builder ------------------------------------------- */}
          {showRoutine && (
            <div className="bg-white rounded-[2rem] border-2 border-nfsu-navy/20 shadow-md overflow-hidden">

              {/* Step 1 */}
              <div className="p-6 md:p-8 border-b-2 border-slate-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                    step1Done ? 'bg-green-500 text-white' : 'bg-nfsu-navy text-white'
                  }`}>1</div>
                  <div>
                    <div className="font-black text-nfsu-navy uppercase italic">
                      Basic Selection
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      These three values apply to all classes in this routine.
                    </div>
                  </div>
                  {step1Done && (
                    <div className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-200 rounded-xl">
                      <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                        {selDay} &middot; {selBranch} &middot; {selSemester}
                      </span>
                      <button
                        onClick={() => setStep1Done(false)}
                        className="text-green-500 hover:text-green-700 font-black text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {!step1Done && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="blk-lbl">Day *</label>
                      <select value={selDay} onChange={e => setSelDay(e.target.value as Weekday)} className="blk-sel">
                        {WEEKDAYS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="blk-lbl">Branch *</label>
                      <select value={selBranch} onChange={e => setSelBranch(e.target.value)} className="blk-sel">
                        <option value="">Select Branch</option>
                        {BRANCHES.map(b => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="blk-lbl">Semester *</label>
                      <select value={selSemester} onChange={e => setSelSem(e.target.value)} className="blk-sel">
                        <option value="">Select Semester</option>
                        {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {!step1Done && (
                  <button
                    onClick={handleStep1}
                    className="mt-4 px-6 py-2.5 bg-nfsu-navy text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-nfsu-maroon transition-all shadow-sm"
                  >
                    Confirm &amp; Continue to Step 2
                  </button>
                )}
              </div>

              {/* Step 2 — class blocks */}
              {step1Done && (
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-full bg-nfsu-navy text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <div className="font-black text-nfsu-navy uppercase italic">
                        Class Blocks
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Add up to 6 classes. Day, Branch, and Semester are inherited automatically.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {blocks.map((b, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 rounded-2xl border-2 border-slate-200 p-4 md:p-5"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-nfsu-navy text-nfsu-gold rounded-xl flex items-center justify-center font-black text-[11px]">
                              {idx + 1}
                            </div>
                            <span className="font-black text-nfsu-navy text-sm uppercase italic">
                              {idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : `${idx + 1}th'`} Class
                            </span>
                          </div>
                          {blocks.length > 1 && (
                            <button
                              onClick={() => removeBlock(idx)}
                              className="text-[10px] font-black text-red-500 bg-red-50 border border-red-200 px-3 py-1 rounded-xl hover:bg-red-100 transition-all"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="blk-lbl">Subject Name *</label>
                            <input
                              type="text" value={b.subjectName}
                              onChange={e => setBlock(idx, 'subjectName', e.target.value)}
                              placeholder="e.g. Data Structures"
                              className="blk-inp"
                            />
                          </div>
                          <div>
                            <label className="blk-lbl">Subject Code *</label>
                            <input
                              type="text" value={b.subjectCode}
                              onChange={e => setBlock(idx, 'subjectCode', e.target.value)}
                              placeholder="e.g. CS301"
                              className="blk-inp"
                            />
                          </div>
                          <div>
                            <label className="blk-lbl">Faculty *</label>
                            <select
                              value={b.facultyEmail}
                              onChange={e => setBlock(idx, 'facultyEmail', e.target.value)}
                              className="blk-sel"
                            >
                              <option value="">Select Faculty</option>
                              {facultyList.map(f => (
                                <option key={f.email} value={f.email}>
                                  {f.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="blk-lbl">Start Time *</label>
                            <input
                              type="time" value={b.startTime}
                              onChange={e => setBlock(idx, 'startTime', e.target.value)}
                              className="blk-inp"
                            />
                          </div>
                          <div>
                            <label className="blk-lbl">End Time *</label>
                            <input
                              type="time" value={b.endTime}
                              onChange={e => setBlock(idx, 'endTime', e.target.value)}
                              className="blk-inp"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-5">
                    {blocks.length < 6 && (
                      <button
                        onClick={addBlock}
                        className="px-5 py-2.5 bg-slate-100 text-nfsu-navy border-2 border-slate-300 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                      >
                        + Add Class {blocks.length + 1}
                      </button>
                    )}
                    <button
                      onClick={handleSaveRoutine}
                      className="px-8 py-3 bg-nfsu-navy text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-nfsu-maroon transition-all shadow-md"
                    >
                      Save Routine ({blocks.length} class{blocks.length > 1 ? 'es' : ''})
                    </button>
                    <button
                      onClick={cancelRoutine}
                      className="px-5 py-2.5 bg-white text-slate-500 border-2 border-slate-200 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- Filters --------------------------------------------------- */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex flex-wrap gap-1">
              {(['All', ...WEEKDAYS] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setFilterDay(d as Weekday | 'All')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black border-2 transition-all ${
                    filterDay === d
                      ? 'bg-nfsu-navy text-white border-nfsu-navy'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-navy/40'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <select
              value={filterBranch}
              onChange={e => setFBranch(e.target.value)}
              className="px-3 py-1.5 rounded-xl border-2 border-slate-200 text-[10px] font-black focus:outline-none bg-white uppercase"
            >
              <option value="All">All Branches</option>
              {BRANCHES.map(b => <option key={b}>{b}</option>)}
            </select>
            <select
              value={filterSem}
              onChange={e => setFSem(e.target.value)}
              className="px-3 py-1.5 rounded-xl border-2 border-slate-200 text-[10px] font-black focus:outline-none bg-white uppercase"
            >
              <option value="All">All Semesters</option>
              {SEMESTERS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* ---- Slot List ------------------------------------------------- */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
              <p className="font-black text-slate-400 uppercase italic text-sm">
                No timetable slots configured yet.
              </p>
              <p className="text-slate-300 text-sm mt-1">
                Use the Add Routine button to build the weekly schedule.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {WEEKDAYS
                .filter(d => filterDay === 'All' || d === filterDay)
                .map(day => {
                  const daySlots = filtered.filter(s => s.weekday === day);
                  if (!daySlots.length) return null;
                  return (
                    <div key={day} className="bg-white rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-sm">
                      <div className={`px-6 py-3 border-b-2 flex items-center gap-3 ${DAY_COLOR[day]}`}>
                        <span className="font-black uppercase tracking-widest text-sm">{day}</span>
                        <span className="text-[10px] font-bold opacity-60">
                          {daySlots.length} class{daySlots.length > 1 ? 'es' : ''}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {daySlots
                          .sort((a, b) => a.classOrder - b.classOrder)
                          .map(s => (
                            <div
                              key={s.id}
                              className="px-5 py-4 flex flex-wrap gap-3 items-center justify-between hover:bg-slate-50/50"
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="bg-nfsu-navy text-white rounded-xl px-3 py-2 text-center flex-shrink-0 min-w-[4.5rem]">
                                  <div className="text-[11px] font-black">{s.startTime}</div>
                                  <div className="text-[9px] text-nfsu-gold font-bold">&ndash;{s.endTime}</div>
                                </div>
                                <div className="min-w-0">
                                  <div className="font-black text-nfsu-navy">
                                    {s.subjectName}
                                    <span className="ml-2 text-[10px] text-slate-400 font-bold">{s.subjectCode}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                    {s.facultyName} &middot; {s.branch} &middot; {s.semester}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  if (confirm('Remove this slot?')) {
                                    attendanceService.deleteSlot(s.id);
                                    refresh();
                                  }
                                }}
                                className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-all"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}

      {/* ==== APPROVALS TAB ================================================= */}
      {tab === 'approvals' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-10 text-center border-2 border-dashed border-slate-200">
              <p className="font-black text-slate-400 uppercase italic text-sm">
                No reschedule or extra class requests yet.
              </p>
            </div>
          ) : requests.map(r => {
            const slot = attendanceService.getAllSlots().find(s => s.id === r.slotId);
            return (
              <div
                key={r.id}
                className={`bg-white rounded-[2rem] border-2 overflow-hidden shadow-sm ${
                  r.status === 'Pending'  ? 'border-amber-200' :
                  r.status === 'Approved' ? 'border-green-200' : 'border-red-200'
                }`}
              >
                <div className={`px-6 py-3 border-b flex items-center gap-3 flex-wrap ${
                  r.status === 'Pending'  ? 'bg-amber-50' :
                  r.status === 'Approved' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                    r.status === 'Pending'  ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    r.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-300' :
                    'bg-red-100 text-red-700 border-red-300'
                  }`}>{r.status}</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                    r.type === 'Extra'
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-purple-100 text-purple-700 border-purple-200'
                  }`}>{r.type}</span>
                  <span className="text-[10px] text-slate-400 font-bold ml-auto">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="p-5 flex flex-wrap gap-4 justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="font-black text-nfsu-navy">
                      {slot ? `${slot.subjectName} (${slot.subjectCode})` : 'Extra Class'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Requested by: <strong className="text-nfsu-navy">{r.requestedBy}</strong>
                    </div>
                    {r.originalDate && (
                      <div className="text-[11px] text-slate-500">
                        Original date: <strong className="text-nfsu-maroon">{r.originalDate}</strong>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-700 font-medium">
                      New: <strong>{r.newDate}</strong> &nbsp; {r.newStartTime}&ndash;{r.newEndTime}
                    </div>
                    <div className="text-[11px] text-slate-400 italic">&ldquo;{r.reason}&rdquo;</div>
                    {r.reviewedBy && (
                      <div className="text-[10px] text-slate-400">
                        Reviewed by {r.reviewedBy}
                        {r.reviewNote && ` — "${r.reviewNote}"`}
                      </div>
                    )}
                  </div>

                  {r.status === 'Pending' && (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <input
                        placeholder="Rejection reason (required to reject)..."
                        value={rejectNotes[r.id] ?? ''}
                        onChange={e => setRNotes(n => ({ ...n, [r.id]: e.target.value }))}
                        className="px-3 py-2 rounded-xl border-2 border-slate-200 text-[11px] font-medium focus:outline-none focus:border-nfsu-navy"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { attendanceService.approveReschedule(r.id, user.email); refresh(); }}
                          className="flex-1 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const note = rejectNotes[r.id]?.trim();
                            if (!note) { alert('Enter a rejection reason first.'); return; }
                            attendanceService.rejectReschedule(r.id, user.email, note);
                            refresh();
                          }}
                          className="flex-1 py-2 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .blk-lbl { display:block; font-size:9px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:.12em; margin-bottom:5px; }
        .blk-inp { width:100%; padding:9px 13px; border-radius:10px; border:2px solid #e2e8f0; font-size:13px; font-weight:500; outline:none; background:white; }
        .blk-inp:focus { border-color:#002147; }
        .blk-sel { width:100%; padding:9px 13px; border-radius:10px; border:2px solid #e2e8f0; font-size:13px; font-weight:500; outline:none; background:white; }
        .blk-sel:focus { border-color:#002147; }
      `}</style>
    </div>
  );
};
