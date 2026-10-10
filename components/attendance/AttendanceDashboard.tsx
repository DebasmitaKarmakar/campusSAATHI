import React, { useState } from 'react';
import { User } from '../../types';
import { AdminTimetable }    from './AdminTimetable';
import { FacultyAttendance } from './FacultyAttendance';
import { FacultyManageClass }from './FacultyManageClass';
import { StudentAttendance } from './StudentAttendance';

type FacultyTab = 'take' | 'manage';

export const AttendanceDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [facTab, setFacTab] = useState<FacultyTab>('take');

  if (user.role === 'admin') return <AdminTimetable user={user} />;

  if (user.role === 'faculty') {
    return (
      <div className="w-full space-y-5">
        <div className="flex gap-2">
          {([
            { id: 'take',   label: 'Take Attendance' },
            { id: 'manage', label: 'Manage Classes'  },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setFacTab(t.id)}
              className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[11px] border-2 transition-all ${
                facTab === t.id
                  ? 'bg-nfsu-navy text-white border-nfsu-navy shadow-md'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-navy/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {facTab === 'take'   && <FacultyAttendance  user={user} />}
        {facTab === 'manage' && <FacultyManageClass user={user} />}
      </div>
    );
  }

  if (user.role === 'student') return <StudentAttendance user={user} />;

  return (
    <div className="bg-white rounded-[2rem] p-10 text-center border-2 border-dashed border-slate-200">
      <p className="font-black text-slate-400 uppercase italic text-sm">
        Attendance module is not available for your role.
      </p>
    </div>
  );
};
