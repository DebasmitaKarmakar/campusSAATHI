import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppNotification, NotificationCategory } from '../../types';
import { dbService } from '../../services/dbService';

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  food_served: 'Food Ready',
  new_notice: 'New Notice',
  event_declared: 'Event',
  lostfound_action: 'Lost & Found',
  skill_help_request: 'Skill Help',

  grievance_reported: 'Grievance Update',
  opportunity_deadline: 'Opportunity Deadline',
};

const CATEGORY_ACCENT: Record<NotificationCategory, string> = {
  food_served: 'bg-green-100 text-green-800 border-green-200',
  new_notice: 'bg-amber-100 text-amber-800 border-amber-200',
  event_declared: 'bg-blue-100 text-blue-800 border-blue-200',
  lostfound_action: 'bg-purple-100 text-purple-800 border-purple-200',
  skill_help_request: 'bg-teal-100 text-teal-800 border-teal-200',

  grievance_reported: 'bg-red-100 text-red-800 border-red-200',
  opportunity_deadline: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationBellProps {
  userEmail: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userEmail }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    const raw = dbService.getNotificationsForUser(userEmail);
    // For broadcast notifications, check local read-set
    const enriched = raw.map(n => {
      if (n.recipientEmail === '__all__') {
        return { ...n, isRead: dbService.isBroadcastRead(n.id) };
      }
      return n;
    });
    setNotifications(enriched);
  }, [userEmail]);

  useEffect(() => {
    load();
    window.addEventListener('cw_db_update', load);
    return () => window.removeEventListener('cw_db_update', load);
  }, [load]);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleOpen = () => {
    setOpen(o => !o);
  };

  const handleMarkRead = (n: AppNotification) => {
    if (n.recipientEmail === '__all__') {
      dbService.markNotificationRead(n.id); // updates read-set
    } else {
      dbService.markNotificationRead(n.id);
    }
    load();
  };

  const handleMarkAllRead = () => {
    dbService.markAllNotificationsRead(userEmail);
    load();
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-3 rounded-2xl bg-white border-2 border-nfsu-paper hover:border-nfsu-gold transition-all shadow-sm"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-nfsu-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-nfsu-maroon text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-3 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-[1.5rem] shadow-2xl border-2 border-nfsu-gold/30 z-[500] overflow-hidden animate-slideUp">

          {/* Panel header */}
          <div className="px-5 py-4 bg-nfsu-navy flex items-center justify-between">
            <div>
              <div className="text-[8px] font-black text-nfsu-gold/60 uppercase tracking-widest">Activity Feed</div>
              <h4 className="text-sm font-black text-white uppercase tracking-tight">Notifications</h4>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[8px] font-black text-nfsu-gold/80 uppercase tracking-widest hover:text-nfsu-gold transition-all"
              >
                Mark All Read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No notifications yet.</p>
              </div>
            ) : (
              notifications.slice(0, 30).map(n => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n)}
                  className={`px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all ${
                    !n.isRead ? 'bg-nfsu-paper/60' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {!n.isRead && (
                        <div className="w-2 h-2 rounded-full bg-nfsu-maroon mt-1"></div>
                      )}
                      {n.isRead && (
                        <div className="w-2 h-2 rounded-full bg-slate-200 mt-1"></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${CATEGORY_ACCENT[n.category]}`}>
                          {CATEGORY_LABELS[n.category]}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-[10px] font-black text-nfsu-navy uppercase tracking-tight leading-snug">{n.title}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed mt-0.5">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t-2 border-slate-100 text-center">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                {notifications.length} total &middot; {unreadCount} unread
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
