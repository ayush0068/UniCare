'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAdminStore } from '@/lib/admin/store';
import { getAdminMe } from '@/lib/admin/api';
import AdminSidebar from './Sidebar';
import { ToastContainer } from './UI';

interface AdminLayoutProps { children: React.ReactNode }

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { token, sidebarCollapsed, setAdmin, clearAuth } = useAdminStore();

  // ── Two-phase ready state ──────────────────────────────────────
  // Phase 1: Zustand has hydrated from localStorage  (hydrated)
  // Phase 2: /auth/me call confirmed the token is valid (ready)
  const [hydrated, setHydrated] = useState(false);
  const [ready, setReady] = useState(false);

  // ── Step 1: wait for Zustand persist to hydrate ──
  // useAdminStore.persist.hasHydrated() returns true once localStorage
  // has been read. Without this wait, `token` is null on first render
  // even when a valid token is stored — causing a false redirect.
  useEffect(() => {
    // Zustand persist hydration is synchronous in newer versions but
    // we use onFinishHydration to be safe across versions.
    const unsub = useAdminStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If already hydrated (e.g. hot reload), set immediately
    if (useAdminStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => unsub();
  }, []);

  // ── Step 2: once hydrated, validate token with backend ──
  useEffect(() => {
    if (!hydrated) return;

    // Read token directly from localStorage as the most reliable source
    // (Zustand state is synced but this avoids any stale closure issues)
    const storedToken = typeof window !== 'undefined'
      ? localStorage.getItem('adminToken')
      : null;

    const effectiveToken = token || storedToken;

    if (!effectiveToken) {
      router.replace('/admin-login');
      return;
    }

    getAdminMe()
      .then(({ data }) => {
        setAdmin(data);
        setReady(true);
      })
      .catch(() => {
        clearAuth();
        localStorage.removeItem('adminToken');
        router.replace('/admin-login');
      });
  }, [hydrated, token]);

  // ── Loading spinner (shown during both phases) ──
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
      <AdminSidebar pendingDoctors={0} />
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