'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAdminStore } from '@/lib/admin/store';
import { getAdminMe } from '@/lib/admin/api';
import AdminSidebar from './Sidebar';
import { ToastContainer } from './UI';

interface AdminLayoutProps { children: React.ReactNode }

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, sidebarCollapsed, setAdmin, clearAuth } = useAdminStore();
  const [ready, setReady] = useState(false);
  const [pendingDoctors, setPendingDoctors] = useState(0);

  useEffect(() => {
    if (!token) { router.replace('/admin-login'); return; }
    getAdminMe()
      .then(({ data }) => { setAdmin(data); setReady(true); })
      .catch(() => { clearAuth(); router.replace('/admin-login'); });
  }, [token]);

  if (!ready) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
          <i className="bi bi-heart-pulse-fill text-white text-lg" />
        </div>
        <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
      </div>
    </div>
  );

  const sidebarW = sidebarCollapsed ? 72 : 260;

  return (
    <div className="min-h-screen bg-slate-50">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      <AdminSidebar pendingDoctors={pendingDoctors} />
      <motion.div
        animate={{ marginLeft: sidebarW }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="min-h-screen flex flex-col"
      >
        {children}
      </motion.div>
      <ToastContainer />
    </div>
  );
}
