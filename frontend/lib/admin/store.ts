'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from './types';

interface AdminStore {
  token: string | null;
  admin: AdminUser | null;
  sidebarCollapsed: boolean;
  setAuth: (token: string, admin: AdminUser) => void;
  setAdmin: (admin: AdminUser) => void;
  clearAuth: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      sidebarCollapsed: false,
      setAuth: (token, admin) => set({ token, admin }),
      setAdmin: (admin) => set({ admin }),
      clearAuth: () => set({ token: null, admin: null }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    { name: 'uc-admin-store', partialize: (s) => ({ token: s.token, admin: s.admin, sidebarCollapsed: s.sidebarCollapsed }) }
  )
);
