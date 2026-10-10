import {
  TimetableSlot,
  AttendanceSession,
  AttendanceRecord,
  ClassReschedule,
  StudentAcademicMeta,
  Weekday,
} from '../types';
import { dbService } from './dbService';
import { getWhitelistEntries, addWhitelistEntry } from './authService';

// Storage table keys
const T_SLOTS      = 'att_timetable';
const T_SESSIONS   = 'att_sessions';
const T_RECORDS    = 'att_records';
const T_RESCHEDULE = 'att_reschedule';
const T_META       = 'att_student_meta';

// ---- Constants --------------------------------------------------------------

export const WEEKDAYS: Weekday[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export const SEMESTERS = [
  'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4',
  'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8',
];

export const BRANCHES = [
  'Cyber Security',
  'Digital Forensics',
  'Forensic Science',
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Other',
];

export const BATCHES = [
  '2021-2025', '2022-2026', '2023-2027', '2024-2028', '2025-2029',
];

/** Maximum semester number before a student is archived */
const MAX_SEMESTER = 8;

// ---- Time helpers -----------------------------------------------------------

export const todayStr = (): string =>
  new Date().toISOString().split('T')[0];

export const weekdayNow = (): Weekday => {
  const map: Weekday[] = [
    'Sunday' as any,
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ];
  return map[new Date().getDay()];
};

/**
 * Attendance window rule (from specification):
 *   Opens:  startTime - 5 minutes
 *   Closes: startTime + 20 minutes
 *
 * Faculty open-session grace: startTime - 15 minutes (wider so they can set up).
 */
export const isWithinAttendanceWindow = (startTime: string): boolean => {
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const startMs  = (sh * 60 + sm) * 60_000;
  const nowMs    = (now.getHours() * 60 + now.getMinutes()) * 60_000;
  const openMs   = startMs - 5  * 60_000;   // 5 min before
  const closeMs  = startMs + 20 * 60_000;   // 20 min after start
  return nowMs >= openMs && nowMs < closeMs;
};

export const isFacultyOpenWindow = (startTime: string, endTime: string): boolean => {
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const nowMs    = (now.getHours() * 60 + now.getMinutes()) * 60_000;
  const openMs   = (sh * 60 + sm - 15) * 60_000;
  const closeMs  = (eh * 60 + em) * 60_000;
  return nowMs >= openMs && nowMs < closeMs;
};

/** Human-readable window e.g. "10:55 - 11:20" */
export const attendanceWindowLabel = (startTime: string): string => {
  const [sh, sm] = startTime.split(':').map(Number);
  const openMin  = sh * 60 + sm - 5;
  const closeMin = sh * 60 + sm + 20;
  const fmt = (m: number) => {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };
  return `${fmt(openMin)} to ${fmt(closeMin)}`;
};

// ---- Student academic metadata -----------------------------------------------

const getMetaAll = (): StudentAcademicMeta[] =>
  dbService.getTable<StudentAcademicMeta>(T_META);

const saveMeta = (all: StudentAcademicMeta[]) =>
  dbService.saveTable(T_META, all);

export const getStudentMeta = (email: string): StudentAcademicMeta | null =>
  getMetaAll().find(m => m.email.toLowerCase() === email.toLowerCase()) ?? null;

export const setStudentMeta = (meta: StudentAcademicMeta) => {
  const all = getMetaAll().filter(
    m => m.email.toLowerCase() !== meta.email.toLowerCase(),
  );
  saveMeta([...all, meta]);
};

// ---- Service ----------------------------------------------------------------

export const attendanceService = {

  // ---- Timetable (Admin) ----------------------------------------------------

  getSlots: (): TimetableSlot[] =>
    dbService
      .getTable<TimetableSlot>(T_SLOTS)
      .filter(s => s.isActive)
      .sort((a, b) =>
        WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday) ||
        a.classOrder - b.classOrder,
      ),

  getAllSlots: (): TimetableSlot[] =>
    dbService.getTable<TimetableSlot>(T_SLOTS),

  /**
   * Create a single class block inside a routine.
   * All routine-level fields (branch, semester, weekday) are passed together.
   */
  createSlot: (
    slot: Omit<TimetableSlot, 'id' | 'isActive' | 'createdAt'>,
  ): TimetableSlot => {
    const newSlot: TimetableSlot = {
      ...slot,
      id: `SLOT-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      isActive: true,
      createdAt: Date.now(),
    };
    dbService.addRow<TimetableSlot>(T_SLOTS, newSlot);
    return newSlot;
  },

  deleteSlot: (id: string) =>
    dbService.updateRow<TimetableSlot>(T_SLOTS, id, { isActive: false }),

  getSlotsForFaculty: (email: string): TimetableSlot[] =>
    attendanceService.getSlots().filter(s => s.facultyEmail === email),

  /** Get all slots for a given branch + semester combination */
  getSlotsForBranchSemester: (branch: string, semester: string): TimetableSlot[] =>
    attendanceService.getSlots().filter(
      s => s.branch === branch && s.semester === semester,
    ),

  // ---- Sessions -------------------------------------------------------------

  getSessions: (): AttendanceSession[] =>
    dbService.getTable<AttendanceSession>(T_SESSIONS),

  getAllSessionsForFaculty: (email: string): AttendanceSession[] =>
    attendanceService
      .getSessions()
      .filter(s => s.facultyEmail === email)
      .sort((a, b) => b.date.localeCompare(a.date)),

  getTodaySessionsForFaculty: (email: string): AttendanceSession[] => {
    const today = todayStr();
    return attendanceService
      .getSessions()
      .filter(s => s.facultyEmail === email && s.date === today);
  },

  /**
   * Faculty opens a session from a timetable slot.
   * Enforces: correct weekday, faculty open window.
   */
  openSession: (
    slotId: string,
    facultyEmail: string,
  ): { ok: boolean; session?: AttendanceSession; error?: string } => {
    const slot = attendanceService.getSlots().find(s => s.id === slotId);
    if (!slot) return { ok: false, error: 'Slot not found.' };
    if (slot.facultyEmail !== facultyEmail)
      return { ok: false, error: 'You are not assigned to this slot.' };
    if (slot.weekday !== weekdayNow())
      return {
        ok: false,
        error: `This class runs on ${slot.weekday}s. Today is ${weekdayNow()}.`,
      };
    if (!isFacultyOpenWindow(slot.startTime, slot.endTime))
      return {
        ok: false,
        error: `You may open this session from ${
          (() => {
            const [h, m] = slot.startTime.split(':').map(Number);
            const t = h * 60 + m - 15;
            return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
          })()
        } (15 min before class start).`,
      };

    const today = todayStr();
    const existing = attendanceService.getSessions().find(
      s => s.slotId === slotId && s.date === today && s.status !== 'Cancelled',
    );

    if (existing) {
      if (existing.status === 'Closed')
        return { ok: false, error: 'This session has already been closed for today.' };
      return { ok: true, session: existing };
    }

    const session: AttendanceSession = {
      id: `SES-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      slotId,
      date: today,
      branch: slot.branch,
      semester: slot.semester,
      weekday: slot.weekday,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectName: slot.subjectName,
      subjectCode: slot.subjectCode,
      facultyEmail: slot.facultyEmail,
      facultyName: slot.facultyName,
      status: 'Live',
      openedAt: Date.now(),
    };
    dbService.addRow<AttendanceSession>(T_SESSIONS, session);
    return { ok: true, session };
  },

  openApprovedSession: (
    sessionId: string,
    facultyEmail: string,
  ): { ok: boolean; session?: AttendanceSession; error?: string } => {
    const session = attendanceService.getSessions().find(s => s.id === sessionId);
    if (!session) return { ok: false, error: 'Session not found.' };
    if (session.facultyEmail !== facultyEmail)
      return { ok: false, error: 'This session is not assigned to you.' };
    if (session.date !== todayStr())
      return { ok: false, error: 'This session is not scheduled for today.' };
    if (!isFacultyOpenWindow(session.startTime, session.endTime))
      return {
        ok: false,
        error: `Session window is ${session.startTime} to ${session.endTime}.`,
      };
    if (session.status === 'Live') return { ok: true, session };
    if (session.status === 'Closed')
      return { ok: false, error: 'Session is already closed.' };

    dbService.updateRow<AttendanceSession>(T_SESSIONS, sessionId, {
      status: 'Live',
      openedAt: Date.now(),
    });
    return { ok: true, session: { ...session, status: 'Live' } };
  },

  closeSession: (sessionId: string) => {
    dbService.updateRow<AttendanceSession>(T_SESSIONS, sessionId, {
      status: 'Closed',
      closedAt: Date.now(),
    });
  },

  getLiveSessionsForFaculty: (email: string): AttendanceSession[] =>
    attendanceService
      .getSessions()
      .filter(s => s.facultyEmail === email && s.status === 'Live'),

  // ---- Attendance records ---------------------------------------------------

  /**
   * Mark attendance after face verification.
   * Attendance window: startTime - 5 min to startTime + 20 min.
   * Student identity always comes from the whitelist — no manual entry.
   */
  markAttendance: (
    sessionId: string,
    student: { email: string; name: string; numericId: number },
  ): { ok: boolean; error?: string } => {
    const session = attendanceService.getSessions().find(s => s.id === sessionId);

    if (!session || session.status !== 'Live')
      return {
        ok: false,
        error: 'No live session. The class may not have started or has already ended.',
      };

    if (!isWithinAttendanceWindow(session.startTime))
      return {
        ok: false,
        error: `Attendance window is ${attendanceWindowLabel(session.startTime)}. Marking outside this window is not permitted.`,
      };

    const duplicate = dbService
      .getTable<AttendanceRecord>(T_RECORDS)
      .find(r => r.sessionId === sessionId && r.studentEmail === student.email);

    if (duplicate)
      return {
        ok: false,
        error: 'Attendance has already been marked for this student in this session.',
      };

    const record: AttendanceRecord = {
      id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      sessionId,
      slotId: session.slotId,
      studentEmail: student.email,
      studentName: student.name,
      enrollmentNo: String(student.numericId),
      markedAt: Date.now(),
      date: session.date,
      subjectName: session.subjectName,
      subjectCode: session.subjectCode,
      branch: session.branch,
      semester: session.semester,
    };
    dbService.addRow<AttendanceRecord>(T_RECORDS, record);

    dbService.pushNotification(
      student.email,
      'new_notice',
      'Attendance Marked',
      `${session.subjectName} (${session.subjectCode}) - ${session.date}`,
      sessionId,
    );

    return { ok: true };
  },

  getRecordsForSession: (sessionId: string): AttendanceRecord[] =>
    dbService
      .getTable<AttendanceRecord>(T_RECORDS)
      .filter(r => r.sessionId === sessionId)
      .sort((a, b) => a.markedAt - b.markedAt),

  getRecordsForStudent: (email: string): AttendanceRecord[] =>
    dbService
      .getTable<AttendanceRecord>(T_RECORDS)
      .filter(r => r.studentEmail === email)
      .sort((a, b) => b.markedAt - a.markedAt),

  // ---- Attendance analytics -------------------------------------------------

  /**
   * Returns per-subject summary + weekly / monthly / overall percentages.
   * All sessions with status Closed or Live are counted as conducted.
   */
  getFullAttendanceSummary: (email: string) => {
    const records  = attendanceService.getRecordsForStudent(email);
    const sessions = attendanceService
      .getSessions()
      .filter(s => s.status === 'Closed' || s.status === 'Live');

    // Per-subject
    const subjectMap: Record<string, {
      name: string; code: string; total: number; present: number;
    }> = {};
    for (const s of sessions) {
      if (!subjectMap[s.subjectCode]) {
        subjectMap[s.subjectCode] = {
          name: s.subjectName, code: s.subjectCode, total: 0, present: 0,
        };
      }
      subjectMap[s.subjectCode].total++;
    }
    for (const r of records) {
      if (subjectMap[r.subjectCode]) subjectMap[r.subjectCode].present++;
    }

    // Time-bounded helpers
    const now = Date.now();
    const weekAgo  = now - 7  * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const sessionsThisWeek  = sessions.filter(s => new Date(s.date).getTime() >= weekAgo);
    const sessionsThisMonth = sessions.filter(s => new Date(s.date).getTime() >= monthAgo);

    const pct = (present: number, total: number) =>
      total === 0 ? null : Math.round((present / total) * 100);

    const recordsThisWeek  = records.filter(r => r.markedAt >= weekAgo);
    const recordsThisMonth = records.filter(r => r.markedAt >= monthAgo);

    // Count attended sessions per period
    const sessionIdSet = (rs: AttendanceRecord[]) =>
      new Set(rs.map(r => r.sessionId));

    const weekAttended  = sessionsThisWeek.filter(s =>
      sessionIdSet(recordsThisWeek).has(s.id),
    ).length;
    const monthAttended = sessionsThisMonth.filter(s =>
      sessionIdSet(recordsThisMonth).has(s.id),
    ).length;
    const totalAttended = sessions.filter(s =>
      sessionIdSet(records).has(s.id),
    ).length;

    return {
      bySubject: Object.values(subjectMap),
      weekly: {
        attended: weekAttended,
        total: sessionsThisWeek.length,
        pct: pct(weekAttended, sessionsThisWeek.length),
      },
      monthly: {
        attended: monthAttended,
        total: sessionsThisMonth.length,
        pct: pct(monthAttended, sessionsThisMonth.length),
      },
      overall: {
        attended: totalAttended,
        total: sessions.length,
        pct: pct(totalAttended, sessions.length),
      },
    };
  },

  // ---- Reschedule / Extra class --------------------------------------------

  requestReschedule: (
    req: Omit<ClassReschedule, 'id' | 'status' | 'createdAt'>,
  ): ClassReschedule => {
    const newReq: ClassReschedule = {
      ...req,
      id: `RSC-${Date.now()}`,
      status: 'Pending',
      createdAt: Date.now(),
    };
    dbService.addRow<ClassReschedule>(T_RESCHEDULE, newReq);

    const whitelist: { email: string; role: string }[] =
      JSON.parse(localStorage.getItem('cw_whitelist') ?? '[]');
    const adminEmails = whitelist
      .filter(w => w.role === 'admin')
      .map(w => w.email);

    if (adminEmails.length) {
      dbService.broadcastNotification(
        adminEmails,
        'new_notice',
        `Class ${req.type} Request`,
        `${req.requestedBy} — ${req.newDate} ${req.newStartTime}–${req.newEndTime}`,
        newReq.id,
      );
    }

    return newReq;
  },

  getRescheduleRequests: (): ClassReschedule[] =>
    dbService
      .getTable<ClassReschedule>(T_RESCHEDULE)
      .sort((a, b) => b.createdAt - a.createdAt),

  getRescheduleForFaculty: (email: string): ClassReschedule[] =>
    attendanceService.getRescheduleRequests().filter(r => r.requestedBy === email),

  approveReschedule: (reqId: string, adminEmail: string) => {
    const req = attendanceService.getRescheduleRequests().find(r => r.id === reqId);
    if (!req) return;

    dbService.updateRow<ClassReschedule>(T_RESCHEDULE, reqId, {
      status: 'Approved',
      reviewedBy: adminEmail,
      reviewedAt: Date.now(),
    });

    const slot = attendanceService.getAllSlots().find(s => s.id === req.slotId);
    const dayIndex = new Date(req.newDate + 'T12:00:00').getDay();
    const days: Weekday[] = [
      'Sunday' as any, 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday',
    ];

    const session: AttendanceSession = {
      id: `SES-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      slotId: req.slotId,
      date: req.newDate,
      branch: slot?.branch ?? '',
      semester: slot?.semester ?? '',
      weekday: days[dayIndex],
      startTime: req.newStartTime,
      endTime: req.newEndTime,
      subjectName: slot?.subjectName ?? '',
      subjectCode: slot?.subjectCode ?? '',
      facultyEmail: req.requestedBy,
      facultyName: slot?.facultyName ?? req.requestedBy,
      status: 'Scheduled',
      isExtra: req.type === 'Extra',
      rescheduledFrom: req.type === 'Reschedule' ? req.slotId : undefined,
      note: req.reason,
    };
    dbService.addRow<AttendanceSession>(T_SESSIONS, session);

    dbService.pushNotification(
      req.requestedBy,
      'new_notice',
      `${req.type} Request Approved`,
      `Your ${req.type.toLowerCase()} for ${req.newDate} has been approved.`,
      reqId,
    );
  },

  rejectReschedule: (reqId: string, adminEmail: string, reason: string) => {
    const req = attendanceService.getRescheduleRequests().find(r => r.id === reqId);
    if (!req) return;

    dbService.updateRow<ClassReschedule>(T_RESCHEDULE, reqId, {
      status: 'Rejected',
      reviewedBy: adminEmail,
      reviewNote: reason,
      reviewedAt: Date.now(),
    });

    dbService.pushNotification(
      req.requestedBy,
      'new_notice',
      `${req.type} Request Rejected`,
      `Reason: ${reason}`,
      reqId,
    );
  },

  // ---- New Session Refresh --------------------------------------------------

  /**
   * Increment all active students' semesters by 1.
   * Students at max semester (Sem 8) are archived.
   * Timetable slots are not deleted — they carry semester labels
   * so old history remains correct.
   * Attendance records are never deleted.
   */
  runSessionRefresh: (): { promoted: number; archived: number } => {
    const students = getWhitelistEntries().filter(e => e.role === 'student');
    let promoted = 0;
    let archived = 0;

    for (const stu of students) {
      const meta = getStudentMeta(stu.email);
      const currentSem = meta?.semester ?? 'Sem 1';
      const semNum = parseInt(currentSem.replace('Sem ', ''), 10);

      if (isNaN(semNum)) continue;

      if (semNum >= MAX_SEMESTER) {
        // Archive
        setStudentMeta({
          email: stu.email,
          semester: `Sem ${semNum}`,
          branch: meta?.branch ?? '',
          isArchived: true,
        });
        archived++;
      } else {
        const nextSem = `Sem ${semNum + 1}`;
        setStudentMeta({
          email: stu.email,
          semester: nextSem,
          branch: meta?.branch ?? '',
          isArchived: false,
        });
        promoted++;
      }
    }

    return { promoted, archived };
  },
};
