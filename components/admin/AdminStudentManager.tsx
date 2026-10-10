import React, { useState, useEffect } from 'react';
import {
  getWhitelistEntries,
  addWhitelistEntry,
  removeWhitelistEntry,
  PRIVILEGE_ORDER,
} from '../../services/authService';
import { dbService } from '../../services/dbService';
import { AdminLog, Role, WhitelistEntry, User } from '../../types';

const ROLE_BADGE: Record<Role, string> = {
  admin:   'bg-red-100 text-red-800 border-red-200',
  faculty: 'bg-purple-100 text-purple-800 border-purple-200',
  canteen: 'bg-amber-100 text-amber-800 border-amber-200',
  student: 'bg-blue-100 text-blue-800 border-blue-200',
};

const EMPTY_FORM = { email: '', fullName: '', department: '', role: 'student' as Role, id: '' };

export const AdminStudentManager: React.FC<{ user: User }> = ({ user }) => {
  const [entries, setEntries]         = useState<WhitelistEntry[]>([]);
  const [logs, setLogs]               = useState<AdminLog[]>([]);
  const [search, setSearch]           = useState('');
  const [filterRole, setFilterRole]   = useState<Role | 'all'>('all');
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formError, setFormError]     = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<{ email: string; role: Role; name: string } | null>(null);

  const refresh = () => {
    setEntries(getWhitelistEntries());
    setLogs(dbService.getTable<AdminLog>('admin_logs'));
  };

  useEffect(() => {
    refresh();
    window.addEventListener('cw_db_update', refresh);
    window.addEventListener('cw_whitelist_update', refresh);
    return () => {
      window.removeEventListener('cw_db_update', refresh);
      window.removeEventListener('cw_whitelist_update', refresh);
    };
  }, []);

  // Deduplicated view — highest privilege per email
  const whitelist: WhitelistEntry[] = (() => {
    const map = new Map<string, WhitelistEntry>();
    for (const e of entries) {
      const k = e.email.toLowerCase();
      const ex = map.get(k);
      if (!ex || PRIVILEGE_ORDER[e.role] > PRIVILEGE_ORDER[ex.role]) map.set(k, e);
    }
    return Array.from(map.values()).sort(
      (a, b) => PRIVILEGE_ORDER[b.role] - PRIVILEGE_ORDER[a.role]
    );
  })();

  const filtered = whitelist.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.email.toLowerCase().includes(q) || e.fullName.toLowerCase().includes(q) || String(e.id).includes(q);
    const matchRole   = filterRole === 'all' || e.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleCounts: Record<string, number> = { all: whitelist.length };
  for (const e of whitelist) roleCounts[e.role] = (roleCounts[e.role] ?? 0) + 1;

  const handleAdd = () => {
    setFormError('');
    setFormSuccess('');
    if (!form.email.trim() || !form.fullName.trim() || !form.department.trim()) {
      setFormError('All fields are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }
    const result = addWhitelistEntry({
      email:      form.email.trim(),
      fullName:   form.fullName.trim(),
      department: form.department.trim(),
      role:       form.role,
      id:         form.id ? Number(form.id) : 0,
    });
    if (!result.success) {
      setFormError(result.error ?? 'Failed to add entry.');
      return;
    }
    const logEntry: AdminLog = {
      id:         `log_${Date.now()}`,
      adminId:    user.id,
      adminEmail: user.email,
      action:     'ADD_WHITELIST',
      targetId:   form.email.trim(),
      targetName: form.fullName.trim(),
      timestamp:  Date.now(),
    };
    const existingLogs = dbService.getTable<AdminLog>('admin_logs');
    dbService.saveTable('admin_logs', [logEntry, ...existingLogs]);
    window.dispatchEvent(new CustomEvent('cw_db_update'));
    setFormSuccess(`${form.fullName.trim()} added successfully.`);
    setForm(EMPTY_FORM);
    refresh();
    setTimeout(() => { setFormSuccess(''); setShowForm(false); }, 2000);
  };

  const handleRemove = () => {
    if (!confirmRemove) return;
    const result = removeWhitelistEntry(confirmRemove.email, confirmRemove.role);
    if (!result.success) { setConfirmRemove(null); return; }
    const logEntry: AdminLog = {
      id:         `log_${Date.now()}`,
      adminId:    user.id,
      adminEmail: user.email,
      action:     'REMOVE_WHITELIST',
      targetId:   confirmRemove.email,
      targetName: confirmRemove.name,
      timestamp:  Date.now(),
    };
    const existingLogs = dbService.getTable<AdminLog>('admin_logs');
    dbService.saveTable('admin_logs', [logEntry, ...existingLogs]);
    window.dispatchEvent(new CustomEvent('cw_db_update'));
    setConfirmRemove(null);
    refresh();
  };

  return (
    <div className="w-full max-w-6xl space-y-6 md:space-y-10 animate-fadeIn">

      <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border-2 border-nfsu-gold/20 overflow-hidden">

        {/* Header */}
        <div className="p-6 md:p-10 lg:p-12 border-b-2 border-nfsu-paper bg-gradient-to-br from-nfsu-paper to-white">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">System Administration</div>
              <h2 className="text-3xl md:text-4xl font-black text-nfsu-navy tracking-tighter italic uppercase">
                Identity <span className="text-nfsu-gold">Governance</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                Access whitelist — role and ID assignments managed by administrators only.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-5 py-3 bg-nfsu-navy text-white text-[10px] font-black rounded-2xl uppercase tracking-widest">
                {whitelist.length} Registered Entities
              </div>
              <button
                onClick={() => { setShowForm(v => !v); setFormError(''); setFormSuccess(''); setForm(EMPTY_FORM); }}
                className="flex items-center gap-2 px-5 py-3 bg-nfsu-gold text-nfsu-navy text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={showForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
                </svg>
                {showForm ? 'Cancel' : 'Add Person'}
              </button>
            </div>
          </div>

          {/* Add Form */}
          {showForm && (
            <div className="mt-8 bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 space-y-4">
              <p className="text-[9px] font-black text-nfsu-navy uppercase tracking-widest mb-2">New Whitelist Entry</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-nfsu-navy outline-none font-bold text-sm bg-white" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Full Name *</label>
                  <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    placeholder="First Last"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-nfsu-navy outline-none font-bold text-sm bg-white" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Department *</label>
                  <input type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    placeholder="e.g. Computer Science"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-nfsu-navy outline-none font-bold text-sm bg-white" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Role *</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-nfsu-navy outline-none font-bold text-sm bg-white">
                    {(['student', 'faculty', 'canteen', 'admin'] as Role[]).map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Numeric ID <span className="text-slate-300 normal-case font-bold">(optional)</span>
                  </label>
                  <input type="number" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                    placeholder="Auto-assigned if blank"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-nfsu-navy outline-none font-bold text-sm bg-white" />
                </div>
              </div>
              {formError   && <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{formError}</p>}
              {formSuccess && <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">{formSuccess}</p>}
              <button onClick={handleAdd}
                className="px-8 py-3 bg-nfsu-navy text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-nfsu-maroon transition-all">
                Confirm &amp; Add to Whitelist
              </button>
            </div>
          )}

          {/* Search */}
          <div className="mt-6 relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or ID..."
              className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-nfsu-navy outline-none font-bold text-sm placeholder-slate-300 transition-all" />
          </div>
        </div>

        {/* Role filters */}
        <div className="px-6 md:px-10 lg:px-12 py-5 border-b-2 border-nfsu-paper flex gap-2 flex-wrap">
          {(['all', 'admin', 'faculty', 'canteen', 'student'] as const).map(r => (
            <button key={r} onClick={() => setFilterRole(r)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                filterRole === r ? 'bg-nfsu-navy text-white border-nfsu-navy shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-navy/40'
              }`}>
              {r === 'all' ? 'All Roles' : r}
              {roleCounts[r] !== undefined && (
                <span className={`ml-2 ${filterRole === r ? 'text-nfsu-gold' : 'text-slate-400'}`}>{roleCounts[r]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="p-6 md:p-10 lg:p-12">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-6">
            <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-1">Whitelist Policy</p>
            <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
              Only administrators can add or remove whitelist entries. Google Sign-In verifies email identity;
              the whitelist determines access level and role assignment. Changes take effect immediately.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  {['ID', 'Full Name', 'Email', 'Department', 'Role', 'Privilege', ''].map(h => (
                    <th key={h} className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No records match</td></tr>
                ) : filtered.map(entry => (
                  <tr key={entry.email} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 pr-4"><span className="font-mono font-black text-nfsu-navy text-sm">{entry.id}</span></td>
                    <td className="py-4 pr-4"><span className="font-black text-nfsu-navy text-xs uppercase tracking-tight">{entry.fullName}</span></td>
                    <td className="py-4 pr-4"><span className="text-[10px] font-bold text-slate-600">{entry.email}</span></td>
                    <td className="py-4 pr-4"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{entry.department}</span></td>
                    <td className="py-4 pr-4">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${ROLE_BADGE[entry.role]}`}>{entry.role}</span>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex gap-0.5">
                        {[1,2,3,4].map(l => (
                          <div key={l} className={`w-4 h-1.5 rounded-full ${l <= PRIVILEGE_ORDER[entry.role] ? 'bg-nfsu-navy' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="py-4">
                      {entry.email.toLowerCase() !== user.email.toLowerCase() && (
                        <button
                          onClick={() => setConfirmRemove({ email: entry.email, role: entry.role, name: entry.fullName })}
                          className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-red-100">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirm Remove Modal */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-black text-nfsu-navy uppercase italic mb-2">Confirm Removal</h3>
            <p className="text-[11px] font-bold text-slate-600 mb-6">
              Remove <span className="text-nfsu-maroon font-black">{confirmRemove.name}</span> ({confirmRemove.role}) from the whitelist?
              They will lose access immediately.
            </p>
            <div className="flex gap-3">
              <button onClick={handleRemove}
                className="flex-1 py-3 bg-red-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-red-700 transition-all">
                Yes, Remove
              </button>
              <button onClick={() => setConfirmRemove(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-slate-200 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail */}
      <div className="bg-nfsu-maroon rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 text-white border-b-8 border-black/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-institutional-pattern opacity-5"></div>
        <div className="relative z-10">
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-nfsu-gold mb-4">Audit Trail</h3>
          {logs.length === 0 ? (
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">No admin activity recorded this session.</p>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {logs.slice(0, 20).map(log => (
                <div key={log.id} className="bg-black/20 p-4 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                      log.action === 'ADD_WHITELIST' ? 'bg-green-500/20 text-green-300' :
                      log.action === 'REMOVE_WHITELIST' ? 'bg-red-500/20 text-red-300' :
                      'bg-nfsu-gold/10 text-nfsu-gold'
                    }`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[8px] font-black text-white/30">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[10px] font-bold text-white/70 leading-relaxed uppercase tracking-tight">
                    {log.adminEmail.split('@')[0]} → {log.targetName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};