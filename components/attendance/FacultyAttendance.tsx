import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, TimetableSlot, AttendanceSession, AttendanceRecord } from '../../types';
import {
  attendanceService,
  WEEKDAYS,
  weekdayNow,
  isFacultyOpenWindow,
  isWithinAttendanceWindow,
  attendanceWindowLabel,
  todayStr,
} from '../../services/attendanceService';
import { matchFaceToStudent } from '../../services/faceMatchService';

// ============================================================================
// Student Class Selector — shown to student on the faculty device
// ============================================================================

interface StudentSelectorProps {
  liveSessions: AttendanceSession[];
  onSelect: (session: AttendanceSession) => void;
  onCancel: () => void;
}

const StudentSelector: React.FC<StudentSelectorProps> = ({
  liveSessions, onSelect, onCancel,
}) => (
  <div className="fixed inset-0 z-50 bg-nfsu-navy flex flex-col items-center justify-center p-6">
    <div className="w-full max-w-sm">
      <div className="text-nfsu-gold text-[10px] font-black uppercase tracking-[0.3em] mb-2">
        Attendance
      </div>
      <h2 className="text-3xl font-black text-white uppercase italic tracking-tight mb-1">
        Select Your Class
      </h2>
      <p className="text-white/50 text-sm font-medium mb-8">
        Tap your ongoing subject, then scan your face.
      </p>

      <div className="space-y-3">
        {liveSessions.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full bg-white/10 hover:bg-white/20 border-2 border-white/20 rounded-2xl p-4 text-left transition-all group"
          >
            <div className="font-black text-white text-base group-hover:text-nfsu-gold transition-colors">
              {s.subjectName}
            </div>
            <div className="text-white/50 text-[11px] font-medium mt-0.5">
              {s.subjectCode} &middot; {s.startTime}&ndash;{s.endTime} &middot; {s.semester}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onCancel}
        className="mt-6 w-full py-3 bg-transparent border-2 border-white/20 text-white/50 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:border-white/40 hover:text-white/70 transition-all"
      >
        Cancel
      </button>
    </div>
  </div>
);

// ============================================================================
// Face Scanner Modal
// ============================================================================

type ScanState = 'idle' | 'scanning' | 'success' | 'failure' | 'duplicate';

interface FaceScannerProps {
  session: AttendanceSession;
  onClose: () => void;
  onMarked: () => void;
}

const FaceScanner: React.FC<FaceScannerProps> = ({ session, onClose, onMarked }) => {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanState,   setScanState]   = useState<ScanState>('idle');
  const [matchedName, setMatchedName] = useState('');
  const [resultMsg,   setResultMsg]   = useState('');
  const [camErr,      setCamErr]      = useState('');
  const [scanCount,   setScanCount]   = useState(0);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(err => {
        setCamErr(`Camera unavailable: ${err.message}. Allow camera permissions and try again.`);
      });
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const captureFrame = () => {
    const v = videoRef.current!;
    const c = canvasRef.current!;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext('2d')!;
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0);
    return c.toDataURL('image/jpeg', 0.85);
  };

  const handleScan = useCallback(async () => {
    if (scanState === 'scanning') return;
    setScanState('scanning');
    setScanCount(c => c + 1);
    setResultMsg('');
    setMatchedName('');

    try {
      // Time window check
      if (!isWithinAttendanceWindow(session.startTime)) {
        setResultMsg(`Attendance window is ${attendanceWindowLabel(session.startTime)}. Outside window — not permitted.`);
        setScanState('failure');
        setTimeout(() => setScanState('idle'), 3500);
        return;
      }

      const frame  = captureFrame();
      const result = await matchFaceToStudent(frame);

      if (!result.matched) {
        setResultMsg(result.reason ?? 'Face not recognised. Face the camera directly in good lighting.');
        setScanState('failure');
        setTimeout(() => setScanState('idle'), 3000);
        return;
      }

      // Duplicate guard
      const dup = attendanceService
        .getRecordsForSession(session.id)
        .find(r => r.studentEmail === result.studentEmail);

      if (dup) {
        setMatchedName(result.studentName ?? '');
        setResultMsg('Attendance already marked for this session.');
        setScanState('duplicate');
        setTimeout(() => setScanState('idle'), 3000);
        return;
      }

      const mark = attendanceService.markAttendance(session.id, {
        email:     result.studentEmail!,
        name:      result.studentName!,
        numericId: result.enrollmentId!,
      });

      if (mark.ok) {
        setMatchedName(result.studentName ?? '');
        setResultMsg(
          `Enr. ${result.enrollmentId}  —  ` +
          new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          }),
        );
        setScanState('success');
        onMarked();
        setTimeout(() => setScanState('idle'), 3000);
      } else {
        setResultMsg(mark.error ?? 'Could not record attendance.');
        setScanState('failure');
        setTimeout(() => setScanState('idle'), 3000);
      }
    } catch (err: any) {
      setResultMsg(`Error: ${err?.message ?? err}`);
      setScanState('failure');
      setTimeout(() => setScanState('idle'), 3000);
    }
  }, [scanState, session, onMarked]);

  const ovalBorder =
    scanState === 'success'   ? 'border-green-400 shadow-[0_0_28px_rgba(74,222,128,0.7)]'  :
    scanState === 'failure'   ? 'border-red-400   shadow-[0_0_28px_rgba(248,113,113,0.7)]' :
    scanState === 'duplicate' ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]'  :
    scanState === 'scanning'  ? 'border-blue-400  shadow-[0_0_20px_rgba(96,165,250,0.5)]'  :
    'border-white/40';

  const overlayBg =
    scanState === 'success'   ? 'bg-green-900/75'  :
    scanState === 'failure'   ? 'bg-red-900/75'    :
    scanState === 'duplicate' ? 'bg-amber-900/75'  : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl border-4 border-nfsu-gold w-full max-w-md">

        {/* Header */}
        <div className="bg-nfsu-navy px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-nfsu-gold text-[10px] font-black uppercase tracking-[0.25em]">
              Face Scan
            </div>
            <div className="text-white font-black text-sm mt-0.5">
              {session.subjectName} &middot; {session.startTime}&ndash;{session.endTime}
            </div>
            <div className="text-white/40 text-[10px]">
              Window: {attendanceWindowLabel(session.startTime)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white text-xl font-black hover:bg-white/20 transition-all"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Camera */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          {camErr ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <svg className="w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.899L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <p className="text-red-300 text-sm font-bold leading-relaxed">{camErr}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef} autoPlay playsInline muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-44 h-56 rounded-full border-4 transition-all duration-300 ${ovalBorder}`} />
              </div>

              {(scanState === 'success' || scanState === 'failure' || scanState === 'duplicate') && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center px-8 text-center ${overlayBg}`}>
                  {scanState === 'success' && (
                    <>
                      <svg className="w-14 h-14 text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-white font-black text-2xl">{matchedName}</div>
                      <div className="text-green-300 text-sm font-bold mt-1">Attendance Marked</div>
                      <div className="text-green-200/70 text-xs mt-1">{resultMsg}</div>
                    </>
                  )}
                  {scanState === 'failure' && (
                    <>
                      <svg className="w-14 h-14 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-white font-black text-lg">Not Recognised</div>
                      <div className="text-red-300 text-xs font-medium mt-2 leading-relaxed">{resultMsg}</div>
                    </>
                  )}
                  {scanState === 'duplicate' && (
                    <>
                      <svg className="w-14 h-14 text-amber-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-white font-black text-xl">{matchedName}</div>
                      <div className="text-amber-300 text-sm font-bold mt-1">Already Marked</div>
                    </>
                  )}
                </div>
              )}

              {scanState === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </div>

        {/* Scan button */}
        <div className="p-5 bg-slate-50 border-t-2 border-slate-100">
          <button
            onClick={handleScan}
            disabled={scanState === 'scanning' || !!camErr}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[13px] transition-all shadow-lg ${
              scanState === 'scanning'
                ? 'bg-blue-500 text-white cursor-not-allowed'
                : 'bg-nfsu-navy text-white hover:bg-nfsu-maroon active:scale-[0.98]'
            }`}
          >
            {scanState === 'scanning' ? 'Scanning...' : 'Scan Face'}
          </button>
          <div className="mt-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Scans this session: {scanCount}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Present List Panel
// ============================================================================

const PresentList: React.FC<{
  session: AttendanceSession;
  trigger: number;
}> = ({ session, trigger }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    setRecords(attendanceService.getRecordsForSession(session.id));
  }, [session.id, trigger]);

  useEffect(() => {
    const id = setInterval(() => {
      setRecords(attendanceService.getRecordsForSession(session.id));
    }, 5000);
    return () => clearInterval(id);
  }, [session.id]);

  return (
    <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b-2 border-slate-50 flex items-center justify-between">
        <div>
          <div className="font-black text-nfsu-navy uppercase italic">Present</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
            Polls every 5 s
          </div>
        </div>
        <div className="w-14 h-14 bg-nfsu-navy rounded-2xl flex items-center justify-center">
          <span className="text-nfsu-gold font-black text-2xl">{records.length}</span>
        </div>
      </div>
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-300">
          <svg className="w-9 h-9 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="text-[11px] font-black uppercase tracking-widest">No scans yet</div>
        </div>
      ) : (
        <div className="overflow-y-auto divide-y divide-slate-50" style={{ maxHeight: 380 }}>
          {records.map((r, i) => (
            <div key={r.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-7 h-7 bg-nfsu-navy rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-nfsu-gold text-[10px] font-black">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-nfsu-navy text-sm truncate">{r.studentName}</div>
                <div className="text-[10px] text-slate-400">
                  Enr.&nbsp;{r.enrollmentNo} &middot;{' '}
                  {new Date(r.markedAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </div>
              </div>
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main FacultyAttendance Component
// ============================================================================

type FacView = 'slots' | 'live';

export const FacultyAttendance: React.FC<{ user: User }> = ({ user }) => {
  const [mySlots,      setMySlots]      = useState<TimetableSlot[]>([]);
  const [liveSessions, setLiveSessions] = useState<AttendanceSession[]>([]);
  const [activeSession,setActiveSession]= useState<AttendanceSession | null>(null);
  const [view,         setView]         = useState<FacView>('slots');
  const [showSelector, setShowSelector] = useState(false);
  const [showScanner,  setShowScanner]  = useState(false);
  const [scanTrigger,  setScanTrigger]  = useState(0);
  const [scanSession,  setScanSession]  = useState<AttendanceSession | null>(null);

  const loadData = useCallback(() => {
    setMySlots(attendanceService.getSlotsForFaculty(user.email));
    const live = attendanceService.getLiveSessionsForFaculty(user.email);
    setLiveSessions(live);
    if (live.length > 0 && !activeSession) {
      setActiveSession(live[0]);
      setView('live');
    }
  }, [user.email]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 8000);
    return () => clearInterval(id);
  }, [loadData]);

  const openSlot = (slotId: string) => {
    const result = attendanceService.openSession(slotId, user.email);
    if (!result.ok) { alert(result.error); return; }
    setActiveSession(result.session!);
    setView('live');
    loadData();
  };

  const closeSession = () => {
    if (!activeSession) return;
    if (!confirm('Close this session? No further attendance can be accepted.')) return;
    attendanceService.closeSession(activeSession.id);
    setActiveSession(null);
    setView('slots');
    loadData();
  };

  // Student selects class on faculty device
  const handleStudentSelect = (session: AttendanceSession) => {
    setScanSession(session);
    setShowSelector(false);
    setShowScanner(true);
  };

  const today    = weekdayNow();
  const todaySlots = mySlots.filter(s => s.weekday === today).sort((a, b) => a.classOrder - b.classOrder);
  const otherSlots = mySlots.filter(s => s.weekday !== today);

  // ---- Live session view ---------------------------------------------------
  if (view === 'live' && activeSession) {
    return (
      <div className="w-full space-y-5 animate-fadeIn">

        {/* Session banner */}
        <div className="bg-nfsu-navy rounded-[2rem] p-6 md:p-8 border-b-4 border-nfsu-gold text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="px-3 py-1 bg-green-500 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                  Live
                </span>
                {activeSession.isExtra && (
                  <span className="px-3 py-1 bg-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Extra Class
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight">
                {activeSession.subjectName}
              </h2>
              <p className="text-nfsu-gold font-bold text-sm mt-1">
                {activeSession.subjectCode} &middot; {activeSession.startTime}&ndash;{activeSession.endTime}
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                {activeSession.branch} &middot; {activeSession.semester} &middot; {activeSession.date}
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                Attendance window: {attendanceWindowLabel(activeSession.startTime)}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap flex-shrink-0">
              {/* Pass device to student */}
              <button
                onClick={() => setShowSelector(true)}
                className="px-6 py-3 bg-nfsu-gold text-nfsu-navy rounded-2xl font-black uppercase tracking-widest text-[11px] hover:brightness-110 transition-all shadow-lg"
              >
                Pass to Student
              </button>
              <button
                onClick={closeSession}
                className="px-6 py-3 bg-nfsu-maroon text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-red-700 transition-all"
              >
                Close Session
              </button>
              <button
                onClick={() => { setView('slots'); }}
                className="px-4 py-3 bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-white/20 transition-all"
              >
                All Classes
              </button>
            </div>
          </div>
        </div>

        {/* Instructions + Live list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 shadow-sm">
            <h3 className="font-black text-nfsu-navy uppercase italic text-base mb-4">
              Attendance Workflow
            </h3>
            <ol className="space-y-4">
              {([
                ['Open Class',         'Press the class in the slot list to open the session. It becomes live automatically within the time window.'],
                ['Pass Device',        'Press "Pass to Student". The device switches to the student attendance screen.'],
                ['Student Selects',    'Student sees the list of live classes and taps their ongoing subject.'],
                ['Student Scans',      'The camera opens. Student faces it and presses Scan. The image is matched against the photo database.'],
                ['Auto-recorded',      'On a valid match the name, enrollment number, and timestamp are saved instantly. You see the update in the Present list.'],
              ] as [string, string][]).map(([title, desc], i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-nfsu-navy flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-nfsu-gold text-[11px] font-black">{i + 1}</span>
                  </div>
                  <div>
                    <div className="font-black text-nfsu-navy text-sm">{title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{desc}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
              <div className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">
                Time Window
              </div>
              <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                Attendance is accepted from {attendanceWindowLabel(activeSession.startTime)}.
                Scans outside this window are rejected automatically.
              </p>
            </div>
          </div>

          <PresentList session={activeSession} trigger={scanTrigger} />
        </div>

        {/* Other live sessions (if multiple) */}
        {liveSessions.length > 1 && (
          <div className="bg-slate-50 rounded-[2rem] p-5 border-2 border-slate-200">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Other Live Sessions
            </div>
            <div className="flex flex-wrap gap-2">
              {liveSessions.filter(s => s.id !== activeSession.id).map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSession(s)}
                  className="px-4 py-2 bg-white border-2 border-nfsu-navy/20 rounded-xl font-black text-nfsu-navy text-[11px] uppercase hover:border-nfsu-navy transition-all"
                >
                  {s.subjectName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Student selector overlay */}
        {showSelector && (
          <StudentSelector
            liveSessions={liveSessions}
            onSelect={handleStudentSelect}
            onCancel={() => setShowSelector(false)}
          />
        )}

        {/* Face scanner modal */}
        {showScanner && scanSession && (
          <FaceScanner
            session={scanSession}
            onClose={() => { setShowScanner(false); setScanSession(null); }}
            onMarked={() => { setScanTrigger(t => t + 1); setShowScanner(false); setScanSession(null); }}
          />
        )}
      </div>
    );
  }

  // ---- Slot picker ---------------------------------------------------------
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-nfsu-gold/30 shadow-sm">
        <h2 className="text-2xl md:text-3xl font-black text-nfsu-navy uppercase italic tracking-tight">
          My Classes
        </h2>
        <p className="text-slate-500 text-sm font-medium mt-1 max-w-xl">
          Classes assigned to you are shown below. Open a class within the time window
          to begin attendance. Students then select the subject and scan on this device.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-nfsu-paper rounded-xl border border-slate-200">
          <span className="text-[10px] font-black text-nfsu-navy uppercase tracking-widest">
            Today: {today} &middot; {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Today's slots */}
      <div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-4">
          <span>Today &mdash; {today}</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {todaySlots.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-10 text-center border-2 border-dashed border-slate-200">
            <p className="font-black text-slate-400 uppercase italic text-sm">
              No classes assigned for today.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todaySlots.map(slot => {
              const sess     = attendanceService.getSessions().find(
                s => s.slotId === slot.id && s.date === todayStr(),
              );
              const isClosed = sess?.status === 'Closed';
              const isLive   = sess?.status === 'Live';
              const canOpen  = isFacultyOpenWindow(slot.startTime, slot.endTime);
              const count    = sess ? attendanceService.getRecordsForSession(sess.id).length : 0;

              return (
                <div
                  key={slot.id}
                  className={`bg-white rounded-[1.5rem] border-2 overflow-hidden shadow-sm transition-all ${
                    isLive   ? 'border-green-400' :
                    canOpen  ? 'border-nfsu-gold/60' :
                    isClosed ? 'border-slate-100 opacity-60' :
                    'border-slate-100'
                  }`}
                >
                  {/* Status bar */}
                  <div className={`px-5 py-2 border-b flex items-center gap-2 ${
                    isLive   ? 'bg-green-50'      :
                    canOpen  ? 'bg-amber-50/40'   :
                    'bg-slate-50'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isLive   ? 'bg-green-500 animate-pulse' :
                      canOpen  ? 'bg-amber-400' :
                      'bg-slate-300'
                    }`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex-1">
                      {isLive   ? 'Session Live' :
                       isClosed ? 'Session Closed' :
                       canOpen  ? 'Ready to Open' :
                       `Opens ${slot.startTime}`}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-lg">
                        {count} present
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      Class {slot.classOrder} &middot; {slot.subjectCode}
                    </div>
                    <h4 className="font-black text-nfsu-navy text-lg leading-tight">
                      {slot.subjectName}
                    </h4>
                    <div className="text-[11px] text-slate-500 mt-2">
                      {slot.startTime}&ndash;{slot.endTime}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {slot.branch} &middot; {slot.semester}
                    </div>
                    {canOpen && !isClosed && (
                      <div className="text-[10px] text-amber-600 font-bold mt-1">
                        Window: {attendanceWindowLabel(slot.startTime)}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (isLive && sess) { setActiveSession(sess); setView('live'); return; }
                        openSlot(slot.id);
                      }}
                      disabled={!canOpen || isClosed}
                      className={`mt-4 w-full py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all ${
                        isClosed
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : canOpen
                          ? 'bg-nfsu-navy text-white hover:bg-nfsu-maroon shadow-md active:scale-[0.98]'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isClosed  ? 'Session Ended' :
                       isLive    ? 'Resume Session' :
                       canOpen   ? 'Open Class' :
                       `Opens at ${slot.startTime}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Other days */}
      {otherSlots.length > 0 && (
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-4">
            <span>Rest of Week</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherSlots
              .sort((a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday) || a.classOrder - b.classOrder)
              .map(s => (
                <div key={s.id} className="bg-white rounded-[1.5rem] border-2 border-slate-100 p-4 opacity-60">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {s.weekday} &middot; Class {s.classOrder} &middot; {s.startTime}&ndash;{s.endTime}
                  </div>
                  <div className="font-black text-nfsu-navy mt-1">{s.subjectName}</div>
                  <div className="text-[11px] text-slate-400">{s.subjectCode} &middot; {s.semester}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
