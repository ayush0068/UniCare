'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { getWithAuth, putWithAuth, deleteWithAuth } from '@/service/httpService';
import { AnimatePresence, motion } from 'framer-motion';

interface Notif {
  _id: string; type: string; title: string; message: string;
  isRead: boolean; link?: string; createdAt: string;
}

const TYPE_CFG: Record<string, { icon: string; bg: string; border: string }> = {
  verification_approved: { icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  verification_rejected: { icon: '❌', bg: 'bg-red-50',     border: 'border-red-100'     },
  account_activated:     { icon: '🟢', bg: 'bg-green-50',   border: 'border-green-100'   },
  account_deactivated:   { icon: '🔴', bg: 'bg-slate-50',   border: 'border-slate-100'   },
  appointment_booked:    { icon: '📅', bg: 'bg-sky-50',     border: 'border-sky-100'     },
  appointment_cancelled: { icon: '🚫', bg: 'bg-red-50',     border: 'border-red-100'     },
  appointment_completed: { icon: '🎉', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  prescription_ready:    { icon: '💊', bg: 'bg-violet-50',  border: 'border-violet-100'  },
  payment_received:      { icon: '💳', bg: 'bg-blue-50',    border: 'border-blue-100'    },
  general:               { icon: '🔔', bg: 'bg-slate-50',   border: 'border-slate-100'   },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function fullDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function NotifItem({ n, onDelete, onClick, full = false }: {
  n: Notif; onDelete: (id: string, e: React.MouseEvent) => void;
  onClick: (n: Notif) => void; full?: boolean;
}) {
  const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.general;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick(n)}
      className={`group relative flex gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0 cursor-pointer transition-colors duration-150 ${
        !n.isRead ? 'bg-sky-50/50 hover:bg-sky-50/80' : 'hover:bg-slate-50/80'
      }`}
    >
      {!n.isRead && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-sky-500 rounded-full flex-shrink-0" />
      )}
      <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0 text-base mt-0.5`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold leading-snug ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
        <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
        <p className="text-[10.5px] text-slate-400 mt-1 font-medium">{full ? fullDate(n.createdAt) : timeAgo(n.createdAt)}</p>
      </div>
      <button
        onClick={(e) => onDelete(n._id, e)}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 flex items-center justify-center transition-all duration-150 mt-0.5"
        aria-label="Dismiss"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
        <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      <p className="text-[13.5px] font-semibold text-slate-500">{label}</p>
      <p className="text-[11.5px] text-slate-400 mt-1">You're all caught up!</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PORTAL WRAPPER — renders children at document.body level,
   completely escaping the header's backdrop-filter stacking context
═══════════════════════════════════════════════════════════════ */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* ══════════════════════════════════════════════════════════════ */

export default function NotificationBell() {
  const [open, setOpen]         = useState(false);
  const [fullView, setFullView] = useState(false);
  const [notifs, setNotifs]     = useState<Notif[]>([]);
  const [unread, setUnread]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [fetched, setFetched]   = useState(false);
  const [filter, setFilter]     = useState<'all' | 'unread'>('all');
  // Dropdown anchor position (for desktop absolute positioning via portal)
  const [dropPos, setDropPos]   = useState({ top: 0, right: 0 });
  const bellRef                 = useRef<HTMLButtonElement>(null);
  const router                  = useRouter();

  /* ── API calls ────────────────────────────────────────────── */
  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithAuth('/notification');
      if (res.success) {
        setNotifs(res.data.notifications ?? []);
        setUnread(res.data.unreadCount ?? 0);
        setFetched(true);
      }
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(fetchNotifs, 60000);
    return () => clearInterval(id);
  }, [open, fetchNotifs]);

  /* ── Scroll lock when full view open ─────────────────────── */
  useEffect(() => {
    document.body.style.overflow = fullView ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [fullView]);

  /* ── Calculate desktop dropdown anchor ──────────────────── */
  const openDropdown = () => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(true);
  };

  /* ── Actions ─────────────────────────────────────────────── */
  const markAllRead = async () => {
    try {
      await putWithAuth('/notification/mark-all-read', {});
      setNotifs(p => p.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { }
  };

  const markRead = async (id: string) => {
    try {
      await putWithAuth(`/notification/${id}/read`, {});
      setNotifs(p => p.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnread(p => Math.max(0, p - 1));
    } catch { }
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteWithAuth(`/notification/${id}`);
      const wasUnread = notifs.find(n => n._id === id)?.isRead === false;
      setNotifs(p => p.filter(n => n._id !== id));
      if (wasUnread) setUnread(p => Math.max(0, p - 1));
    } catch { }
  };

  const handleClick = async (n: Notif) => {
    if (!n.isRead) await markRead(n._id);
    if (n.link) { router.push(n.link); setOpen(false); setFullView(false); }
  };

  const openFull = () => { setOpen(false); setFullView(true); };
  const displayed = filter === 'unread' ? notifs.filter(n => !n.isRead) : notifs;

  /* ── Shared panel header ─────────────────────────────────── */
  const PanelHeader = ({ onExpand }: { onExpand: () => void }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-bold text-slate-800">Notifications</span>
        {unread > 0 && (
          <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">{unread} new</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {unread > 0 && (
          <button onClick={markAllRead} className="text-[11.5px] font-semibold text-sky-500 hover:text-sky-700 transition-colors">
            Mark all read
          </button>
        )}
        <button
          onClick={onExpand}
          title="View all"
          className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <span className="hidden sm:inline">View all</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Bell button ─────────────────────────────────────── */}
      <button
        ref={bellRef}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100/80 transition-colors duration-200"
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

      {/* ════════════════════════════════════════════════════════
          PORTAL: all overlays render at document.body level
          → escapes backdrop-filter stacking context of the header
      ════════════════════════════════════════════════════════ */}
      <Portal>
        <AnimatePresence>
          {open && (
            <>
              {/* ── Backdrop (closes on click) ─────────────── */}
              <motion.div
                key="notif-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9998]"
                onClick={() => setOpen(false)}
              />

              {/* ── Mobile bottom sheet ───────────────────── */}
              <motion.div
                key="notif-mobile"
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                className="fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col sm:hidden"
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>
                <PanelHeader onExpand={openFull} />
                <div className="overflow-y-auto flex-1">
                  {loading && !fetched ? (
                    <div className="flex justify-center py-12">
                      <div className="w-6 h-6 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
                    </div>
                  ) : notifs.length === 0 ? (
                    <EmptyState label="No notifications yet" />
                  ) : (
                    notifs.slice(0, 8).map(n => (
                      <NotifItem key={n._id} n={n} onDelete={deleteNotif} onClick={handleClick} />
                    ))
                  )}
                  {notifs.length > 0 && (
                    <button onClick={openFull}
                      className="w-full flex items-center justify-center gap-2 py-4 text-[12.5px] font-semibold text-sky-600 hover:bg-sky-50 transition-colors border-t border-slate-100">
                      See all {notifs.length} notifications
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </motion.div>

              {/* ── Desktop dropdown (anchored via getBoundingClientRect) ── */}
              <motion.div
                key="notif-desktop"
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="hidden sm:flex fixed z-[9999] flex-col bg-white rounded-2xl border border-slate-200/80 shadow-2xl shadow-slate-200/60 overflow-hidden w-[380px] max-h-[520px]"
                style={{ top: dropPos.top, right: dropPos.right }}
              >
                <PanelHeader onExpand={openFull} />
                <div className="overflow-y-auto flex-1">
                  {loading && !fetched ? (
                    <div className="flex justify-center py-12">
                      <div className="w-6 h-6 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
                    </div>
                  ) : notifs.length === 0 ? (
                    <EmptyState label="No notifications yet" />
                  ) : (
                    notifs.slice(0, 8).map(n => (
                      <NotifItem key={n._id} n={n} onDelete={deleteNotif} onClick={handleClick} />
                    ))
                  )}
                  {notifs.length > 0 && (
                    <button onClick={openFull}
                      className="w-full flex items-center justify-center gap-2 py-3.5 text-[12.5px] font-semibold text-sky-600 hover:bg-sky-50 transition-colors border-t border-slate-100">
                      See all {notifs.length} notifications
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ════════════ FULL VIEW MODAL ════════════════════════ */}
        <AnimatePresence>
          {fullView && (
            <>
              <motion.div
                key="fv-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]"
                onClick={() => setFullView(false)}
              />
              <motion.div
                key="fv-modal"
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                className="fixed inset-x-0 bottom-0 top-[4%] z-[9999] bg-white flex flex-col rounded-t-3xl overflow-hidden sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl sm:max-h-[88vh] sm:rounded-3xl sm:shadow-2xl"
              >
                {/* Mobile handle */}
                <div className="sm:hidden flex justify-center pt-3 pb-1 bg-white flex-shrink-0">
                  <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                      <svg className="w-[17px] h-[17px] text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-slate-800 leading-none">All Notifications</h2>
                      <p className="text-[11.5px] text-slate-400 mt-0.5">{notifs.length} total · {unread} unread</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <button onClick={markAllRead}
                        className="text-[12px] font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-xl transition-colors">
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setFullView(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1.5 px-5 py-3 border-b border-slate-100 flex-shrink-0">
                  {(['all', 'unread'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`px-4 py-1.5 rounded-xl text-[12.5px] font-semibold transition-all duration-150 ${
                        filter === f ? 'bg-sky-500 text-white shadow-sm shadow-sky-200' : 'text-slate-500 hover:bg-slate-100'
                      }`}>
                      {f === 'all' ? `All (${notifs.length})` : `Unread (${unread})`}
                    </button>
                  ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                  {loading && !fetched ? (
                    <div className="flex justify-center py-16">
                      <div className="w-7 h-7 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
                    </div>
                  ) : displayed.length === 0 ? (
                    <EmptyState label={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} />
                  ) : (
                    displayed.map(n => (
                      <NotifItem key={n._id} n={n} onDelete={deleteNotif} onClick={handleClick} full />
                    ))
                  )}
                </div>

                <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
                  <p className="text-[11.5px] text-slate-400 text-center">Tap a notification to navigate</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}