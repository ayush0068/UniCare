'use client';
import { motion } from 'framer-motion';
import { useAdminStore } from '@/lib/admin/store';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminHeader({ title, subtitle, actions }: HeaderProps) {
  const { admin, sidebarCollapsed } = useAdminStore();
  const sidebarW = sidebarCollapsed ? 72 : 260;

  return (
    <>
      {/* ── Desktop header — shifts with sidebar ── */}
      <motion.header
        animate={{ left: sidebarW }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex fixed top-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 items-center"
        style={{ left: sidebarW, height: 64 }}
      >
        <div className="flex items-center w-full h-full px-6 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-bold text-slate-800 leading-none truncate">{title}</h1>
            {subtitle && <p className="text-[12px] text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <div className="flex items-center gap-2 text-[12px] text-slate-400 bg-slate-50 rounded-lg px-3 py-1.5">
              <i className="bi bi-calendar3 text-blue-500" />
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold shadow cursor-pointer">
              {admin?.name?.slice(0, 2).toUpperCase() ?? 'SA'}
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile sub-header — sits below the fixed top bar (h-14), not fixed itself ── */}
      {/* On mobile, the top bar (hamburger) is already fixed at top-0. This acts as a page title bar. */}
      <div className="lg:hidden sticky top-14 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold text-slate-800 leading-none truncate">{title}</h1>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </>
  );
}