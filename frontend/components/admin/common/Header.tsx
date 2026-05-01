'use client';
import { motion } from 'framer-motion';
import { useAdminStore } from '@/lib/admin/store';
import { fmtDatetime } from '@/lib/admin/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminHeader({ title, subtitle, actions }: HeaderProps) {
  const { admin, sidebarCollapsed } = useAdminStore();
  const sidebarW = sidebarCollapsed ? 72 : 260;

  return (
    <motion.header
      animate={{ left: sidebarW }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100"
      style={{ left: sidebarW }}
    >
      <div className="flex items-center h-16 px-6 gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] font-bold text-slate-800 leading-none truncate">{title}</h1>
          {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}

          <div className="h-6 w-px bg-slate-200 mx-1" />

          {/* Date */}
          <div className="hidden md:flex items-center gap-2 text-[12px] text-slate-400 bg-slate-50 rounded-lg px-3 py-1.5">
            <i className="bi bi-calendar3 text-blue-500" />
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold shadow cursor-pointer">
              {admin?.name?.slice(0, 2).toUpperCase() ?? 'SA'}
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
