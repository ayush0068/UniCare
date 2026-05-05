'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getWithAuth, putWithAuth, deleteWithAuth } from '@/service/httpService';
import { AnimatePresence, motion } from 'framer-motion';

interface Notif {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  verification_approved: { icon: '✅', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  verification_rejected: { icon: '❌', color: 'text-red-700',     bg: 'bg-red-50'     },
  account_activated:     { icon: '🟢', color: 'text-green-700',   bg: 'bg-green-50'   },
  account_deactivated:   { icon: '🔴', color: 'text-slate-700',   bg: 'bg-slate-50'   },
  appointment_booked:    { icon: '📅', color: 'text-sky-700',     bg: 'bg-sky-50'     },
  appointment_cancelled: { icon: '🚫', color: 'text-red-700',     bg: 'bg-red-50'     },
  appointment_completed: { icon: '🎉', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  prescription_ready:    { icon: '💊', color: 'text-violet-700',  bg: 'bg-violet-50'  },
  payment_received:      { icon: '💳', color: 'text-blue-700',    bg: 'bg-blue-50'    },
  general:               { icon: '🔔', color: 'text-slate-700',   bg: 'bg-slate-50'   },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function NotificationBell() {
  const [open, setOpen]               = useState(false);
  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [unread, setUnread]           = useState(0);
  const [loading, setLoading]         = useState(false);
  const [hasFetched, setHasFetched]   = useState(false);
  const panelRef                       = useRef<HTMLDivElement>(null);
  const router                         = useRouter();

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await getWithAuth('/notification');
      if (res.success) {
        setNotifs(res.data.notifications || []);
        setUnread(res.data.unreadCount  || 0);
        setHasFetched(true);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  // Poll every 60s when open, fetch once on mount
  useEffect(() => { fetch(); }, []);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(fetch, 60000);
    return () => clearInterval(id);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await putWithAuth('/notification/mark-all-read', {});
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  const markRead = async (id: string) => {
    try {
      await putWithAuth(`/notification/${id}/read`, {});
      setNotifs(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteWithAuth(`/notification/${id}`);
      const wasUnread = notifs.find(n => n._id === id)?.isRead === false;
      setNotifs(prev => prev.filter(n => n._id !== id));
      if (wasUnread) setUnread(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleNotifClick = async (n: Notif) => {
    if (!n.isRead) await markRead(n._id);
    if (n.link) { router.push(n.link); setOpen(false); }
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors duration-200"
        aria-label="Notifications"
      >
        <svg className="w-[18px] h-[18px] text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm shadow-red-300"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-2xl shadow-2xl shadow-slate-200/70 border border-slate-100 overflow-hidden z-50"
            style={{ maxHeight: '520px' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-slate-800">Notifications</span>
                {unread > 0 && (
                  <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="text-[12px] font-semibold text-sky-500 hover:text-sky-700 transition-colors">
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
              {loading && !hasFetched ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
                </div>
              ) : notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-slate-300">
                  <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-[13px] font-medium text-slate-400">No notifications yet</p>
                  <p className="text-[11px] text-slate-300 mt-1">You're all caught up!</p>
                </div>
              ) : (
                notifs.map((n, i) => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
                  return (
                    <motion.div
                      key={n._id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => handleNotifClick(n)}
                      className={`group relative flex gap-3 px-4 py-3.5 border-b border-slate-50 cursor-pointer transition-colors duration-150 ${
                        !n.isRead ? 'bg-sky-50/40 hover:bg-sky-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Unread dot */}
                      {!n.isRead && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-sky-500 rounded-full flex-shrink-0" />
                      )}

                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 text-base mt-0.5`}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold leading-snug ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                          {n.title}
                        </p>
                        <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10.5px] text-slate-400 mt-1 font-medium">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={(e) => deleteNotif(n._id, e)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all duration-150 mt-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}