import React, { useState, useEffect, useCallback } from 'react';
import { User, Notice, NoticePriority, NoticeAudience } from '../../types';
import { dbService } from '../../services/dbService';

const PRIORITY_STYLES: Record<NoticePriority, string> = {
  Normal:    'bg-slate-100 text-slate-700 border-slate-200',
  Important: 'bg-amber-100 text-amber-800 border-amber-200',
  Urgent:    'bg-red-100 text-red-800 border-red-200',
};

const PRIORITY_ACCENT: Record<NoticePriority, string> = {
  Normal:    'border-slate-200',
  Important: 'border-amber-300',
  Urgent:    'border-red-400',
};

const inputCls =
  'w-full px-4 py-3.5 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-nfsu-navy focus:bg-white outline-none font-bold text-sm text-slate-700 placeholder-slate-300 transition-all';

interface PostNoticeModalProps {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}

const PostNoticeModal: React.FC<PostNoticeModalProps> = ({ user, onClose, onSaved }) => {
  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [priority, setPriority]   = useState<NoticePriority>('Normal');
  const [audience, setAudience]   = useState<NoticeAudience>('all');
  const [attachment, setAttachment] = useState('');
  const [errors, setErrors]       = useState<{ title?: string; body?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!title.trim())  e.title = 'Title is required.';
    if (!body.trim())   e.body  = 'Notice body is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePost = () => {
    if (!validate()) return;
    const notice: Notice = {
      id:             `NTC-${Date.now()}`,
      title:          title.trim(),
      body:           body.trim(),
      publishedBy:    user.fullName,
      publisherEmail: user.email,
      publisherRole:  user.role,
      audience,
      priority,
      attachmentUrl:  attachment.trim() || undefined,
      createdAt:      Date.now(),
      isArchived:     false,
    };
    dbService.addRow<Notice>('notices', notice);

    // Broadcast to all campus users
    dbService.pushNotification(
      '__all__',
      'new_notice',
      `New Notice: ${notice.title}`,
      `${notice.publishedBy} published a ${notice.priority.toLowerCase()} notice.`,
      notice.id
    );

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-nfsu-navy/90 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-4 border-nfsu-gold overflow-hidden animate-slideUp">
        <div className="bg-nfsu-navy px-8 py-6 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-[9px] font-black text-nfsu-gold/60 uppercase tracking-[0.3em] mb-1">
              Official Publication
            </div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Post Notice</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-8 py-7 space-y-5 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Notice Title <span className="text-nfsu-maroon">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: undefined })); }}
              placeholder="e.g. Examination Rescheduling — November 2025"
              className={inputCls}
            />
            {errors.title && <p className="text-[8px] text-nfsu-maroon font-black uppercase tracking-widest mt-1">{errors.title}</p>}
          </div>

          {/* Priority & Audience */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as NoticePriority)} className={inputCls}>
                <option value="Normal">Normal</option>
                <option value="Important">Important</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Audience</label>
              <select value={audience} onChange={e => setAudience(e.target.value as NoticeAudience)} className={inputCls}>
                <option value="all">All Campus</option>
                <option value="student">Students Only</option>
                <option value="faculty">Faculty Only</option>
              </select>
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Notice Content <span className="text-nfsu-maroon">*</span>
            </label>
            <textarea
              value={body}
              onChange={e => { setBody(e.target.value); setErrors(p => ({ ...p, body: undefined })); }}
              placeholder="Full notice text..."
              rows={6}
              className={`${inputCls} resize-none`}
            />
            {errors.body && <p className="text-[8px] text-nfsu-maroon font-black uppercase tracking-widest mt-1">{errors.body}</p>}
          </div>

          {/* Attachment URL */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Attachment URL <span className="text-slate-300 font-bold normal-case text-[8px]">(optional)</span>
            </label>
            <input
              type="url"
              value={attachment}
              onChange={e => setAttachment(e.target.value)}
              placeholder="https://..."
              className={inputCls}
            />
          </div>
        </div>

        <div className="px-8 py-5 border-t-2 border-slate-100 flex gap-3 bg-slate-50 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-500 font-black rounded-2xl uppercase text-[9px] tracking-widest hover:border-slate-400 transition-all">
            Cancel
          </button>
          <button onClick={handlePost} className="flex-[2] py-4 bg-nfsu-navy text-white font-black rounded-2xl uppercase text-[9px] tracking-widest shadow-xl hover:bg-nfsu-maroon transition-all border-b-4 border-black/20">
            Publish Notice
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface NoticeBoardProps {
  user: User;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ user }) => {
  const [notices, setNotices]     = useState<Notice[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [filter, setFilter]       = useState<'all' | 'Normal' | 'Important' | 'Urgent'>('all');
  const [toast, setToast]         = useState<string | null>(null);

  const canPost = user.role === 'faculty' || user.role === 'admin';

  const load = useCallback(() => {
    const all = dbService.getTable<Notice>('notices').filter(n => !n.isArchived);
    // Filter by audience
    const visible = all.filter(n => {
      if (n.audience === 'all') return true;
      if (n.audience === 'student' && user.role === 'student') return true;
      if (n.audience === 'faculty' && (user.role === 'faculty' || user.role === 'admin')) return true;
      if (user.role === 'admin') return true;
      return false;
    });
    setNotices(visible.sort((a, b) => b.createdAt - a.createdAt));
  }, [user.role]);

  useEffect(() => {
    load();
    window.addEventListener('cw_db_update', load);
    return () => window.removeEventListener('cw_db_update', load);
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleArchive = (id: string) => {
    dbService.updateRow<Notice>('notices', id, { isArchived: true });
    showToast('Notice archived.');
  };

  const filtered = filter === 'all' ? notices : notices.filter(n => n.priority === filter);

  return (
    <>
      <div className="w-full max-w-6xl space-y-6 md:space-y-10 animate-fadeIn">
        <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border-2 border-nfsu-gold/20 overflow-hidden">

          {/* Header */}
          <div className="p-6 md:p-10 lg:p-12 border-b-2 border-nfsu-paper bg-gradient-to-br from-nfsu-paper to-white">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">
                  Institutional Communications
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-nfsu-navy tracking-tighter italic uppercase">
                  Notice <span className="text-nfsu-gold">Board</span>
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                  {canPost
                    ? 'Publish and manage official campus notices.'
                    : 'Official notices from faculty and administration.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-nfsu-navy text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg">
                  {filtered.length} Notices
                </div>
                {canPost && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-nfsu-gold text-nfsu-navy text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-yellow-400 transition-all border-b-4 border-black/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Post Notice
                  </button>
                )}
              </div>
            </div>

            {/* Priority filter tabs */}
            <div className="mt-6 flex gap-2 flex-wrap">
              {(['all', 'Normal', 'Important', 'Urgent'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                    filter === f
                      ? 'bg-nfsu-navy text-white border-nfsu-navy shadow-lg'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-navy/40 hover:text-nfsu-navy'
                  }`}
                >
                  {f === 'all' ? 'All' : f}
                  <span className={`ml-1.5 ${filter === f ? 'text-nfsu-gold' : 'text-slate-400'}`}>
                    {f === 'all' ? notices.length : notices.filter(n => n.priority === f).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notice list */}
          <div className="p-6 md:p-10 lg:p-12 space-y-4">
            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  No notices available.
                </p>
                {canPost && (
                  <button onClick={() => setShowModal(true)} className="mt-4 text-[9px] font-black text-nfsu-gold uppercase tracking-widest underline">
                    Post the first notice
                  </button>
                )}
              </div>
            ) : (
              filtered.map(notice => (
                <div
                  key={notice.id}
                  className={`bg-white rounded-[1.5rem] border-2 transition-all shadow-sm hover:shadow-md ${PRIORITY_ACCENT[notice.priority]}`}
                >
                  <div className="p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${PRIORITY_STYLES[notice.priority]}`}>
                            {notice.priority}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {notice.audience === 'all' ? 'All Campus' : notice.audience === 'student' ? 'Students' : 'Faculty'}
                          </span>
                        </div>
                        <h4 className="font-black text-nfsu-navy uppercase text-sm tracking-tight leading-snug">
                          {notice.title}
                        </h4>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {notice.publishedBy} &middot; {notice.publisherRole.toUpperCase()} &middot; {new Date(notice.createdAt).toLocaleDateString()}
                        </div>
                        {expanded === notice.id && (
                          <p className="text-[11px] font-bold text-slate-600 leading-relaxed pt-2 whitespace-pre-wrap">
                            {notice.body}
                          </p>
                        )}
                        {expanded === notice.id && notice.attachmentUrl && (
                          <a
                            href={notice.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[9px] font-black text-nfsu-navy uppercase tracking-widest border border-nfsu-navy/20 bg-nfsu-paper px-3 py-1.5 rounded-lg hover:bg-nfsu-navy hover:text-white transition-all mt-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            View Attachment
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setExpanded(expanded === notice.id ? null : notice.id)}
                          className="px-4 py-2.5 bg-nfsu-paper text-nfsu-navy text-[9px] font-black rounded-xl uppercase tracking-widest border-2 border-nfsu-navy/10 hover:border-nfsu-navy/30 transition-all"
                        >
                          {expanded === notice.id ? 'Collapse' : 'Read'}
                        </button>
                        {canPost && (
                          <button
                            onClick={() => handleArchive(notice.id)}
                            className="px-4 py-2.5 bg-slate-50 text-slate-500 text-[9px] font-black rounded-xl uppercase tracking-widest border-2 border-slate-200 hover:bg-slate-100 transition-all"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-nfsu-navy rounded-[2rem] p-6 md:p-10 text-white border-b-8 border-nfsu-gold relative overflow-hidden">
          <div className="absolute inset-0 bg-institutional-pattern opacity-5"></div>
          <div className="relative z-10">
            <div className="text-[9px] font-black text-nfsu-gold/60 uppercase tracking-[0.4em] mb-2">Notice Board Policy</div>
            <p className="text-[10px] font-bold text-nfsu-gold/70 uppercase tracking-wider leading-relaxed max-w-xl">
              All notices are published by verified faculty or administrative personnel.
              {canPost
                ? ' Archive outdated notices to maintain board clarity.'
                : ' For queries regarding any notice, contact the publishing authority directly.'}
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <PostNoticeModal
          user={user}
          onClose={() => setShowModal(false)}
          onSaved={() => showToast('Notice published successfully.')}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] animate-slideUp">
          <div className="bg-nfsu-navy text-white px-6 py-3.5 rounded-2xl shadow-2xl border-2 border-nfsu-gold flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-nfsu-gold flex-shrink-0"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">{toast}</span>
          </div>
        </div>
      )}
    </>
  );
};
