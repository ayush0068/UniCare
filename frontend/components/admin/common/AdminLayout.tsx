'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminStore } from '@/lib/admin/store';
import { getAdminMe } from '@/lib/admin/api';
import AdminSidebar from './Sidebar';
import { ToastContainer } from './UI';

interface AdminLayoutProps { children: React.ReactNode }

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { token, sidebarCollapsed, setAdmin, clearAuth } = useAdminStore();
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/admin-login'); return; }
    getAdminMe()
      .then(({ data }) => { setAdmin(data); setReady(true); })
      .catch(() => { clearAuth(); router.replace('/admin-login'); });
  }, [token]);

  if (!ready) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
          <i className="bi bi-heart-pulse-fill text-white text-xl" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
          <span className="text-sm text-slate-400 font-medium">Loading admin panel…</span>
        </div>
      </div>
    </div>
  );

  const sidebarW = sidebarCollapsed ? 72 : 260;

  return (
    <div className="min-h-screen bg-slate-50">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div className="hidden lg:block">
        <AdminSidebar pendingDoctors={0} />
      </div>

      {/* ── Mobile top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center h-14 px-4 bg-white border-b border-slate-100 shadow-sm gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600"
          aria-label="Open menu"
        >
          <i className="bi bi-list text-xl" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md shadow-blue-200">
            <i className="bi bi-heart-pulse-fill text-white text-sm" />
          </div>
          <span className="font-bold text-slate-800 text-[15px]">UniCare <span className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">Admin</span></span>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)} />
            <motion.div key="drawer" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 350, damping: 32 }}
              className="lg:hidden fixed inset-y-0 left-0 z-[61] w-[260px] bg-white shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between h-14 px-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
                    <i className="bi bi-heart-pulse-fill text-white text-sm" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-[14px] leading-none">UniCare</p>
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Admin Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <i className="bi bi-x-lg text-sm" />
                </button>
              </div>
              <AdminSidebar pendingDoctors={0} mobileMode onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Page content ── */}
      {/* Desktop: respect sidebar margin; Mobile: full width with top padding */}
      <motion.div
        className="hidden lg:block min-h-screen"
        animate={{ marginLeft: sidebarW }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
      <div className="lg:hidden pt-14 min-h-screen">
        {children}
      </div>

      <ToastContainer />
    </div>
  );
}