'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminStore } from '@/lib/admin/store';
import { cn } from '@/lib/admin/utils';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  perm?: keyof NonNullable<ReturnType<typeof useAdminStore.getState>['admin']>['permissions'];
  badge?: number;
  superOnly?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Dashboard',      href: '/admin',              icon: 'bi-grid-1x2-fill' },
  { label: 'Patients',       href: '/admin/users',        icon: 'bi-people-fill',              perm: 'userManagement' },
  { label: 'Doctors',        href: '/admin/doctors',      icon: 'bi-hospital-fill',             perm: 'doctorManagement' },
  { label: 'Appointments',   href: '/admin/appointments', icon: 'bi-calendar2-week-fill',       perm: 'analytics' },
  { label: 'Payments',       href: '/admin/payments',     icon: 'bi-credit-card-2-front-fill',  perm: 'paymentManagement' },
  { label: 'Admin Accounts', href: '/admin/accounts',     icon: 'bi-shield-lock-fill',          superOnly: true },
];

interface SidebarProps {
  pendingDoctors?: number;
  /** When true: renders without the motion.aside wrapper (used inside mobile drawer) */
  mobileMode?: boolean;
  onNavigate?: () => void;
}

function SidebarContent({ pendingDoctors = 0, mobileMode = false, onNavigate }: SidebarProps) {
  const pathname   = usePathname();
  const { admin, sidebarCollapsed, toggleSidebar, clearAuth } = useAdminStore();

  // In mobile mode always treat as expanded
  const collapsed = mobileMode ? false : sidebarCollapsed;

  const visibleNav = NAV.filter((item) => {
    if (item.superOnly) return admin?.role === 'super_admin';
    if (!item.perm) return true;
    if (admin?.role === 'super_admin') return true;
    return admin?.permissions?.[item.perm] ?? false;
  });

  const inner = (
    <>
      {/* Logo (desktop only — mobile has it in drawer header) */}
      {!mobileMode && (
        <div className="flex items-center h-16 px-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex-shrink-0 shadow-lg shadow-blue-200">
            <i className="bi bi-heart-pulse-fill text-white text-base" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }} className="ml-3 overflow-hidden whitespace-nowrap">
                <p className="font-bold text-slate-800 text-[15px] leading-none tracking-tight">UniCare</p>
                <p className="text-[10.5px] text-slate-400 mt-0.5 font-medium tracking-wide uppercase">Admin Portal</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={toggleSidebar}
            className={cn('ml-auto flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors', collapsed && 'mx-auto')}>
            <i className={cn('bi text-sm transition-transform duration-300', collapsed ? 'bi-chevron-right' : 'bi-chevron-left')} />
          </button>
        </div>
      )}

      {/* Admin info */}
      <div className={cn('flex items-center gap-3 px-3 py-3 border-b border-slate-100 flex-shrink-0', collapsed && !mobileMode && 'justify-center px-0')}>
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
            {admin?.name?.slice(0, 2).toUpperCase() ?? 'SA'}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }} className="min-w-0 overflow-hidden">
              <p className="text-[13px] font-semibold text-slate-800 truncate leading-none">{admin?.name ?? 'Admin'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                  admin?.role === 'super_admin' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700')}>
                  <i className={cn('bi text-[9px]', admin?.role === 'super_admin' ? 'bi-stars' : 'bi-person-gear')} />
                  {admin?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-3 pb-1.5 pt-1">Menu</p>
        )}
        {visibleNav.map((item) => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          const hasBadge = item.href === '/admin/doctors' && pendingDoctors > 0;
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
              onClick={onNavigate}>
              <motion.div whileHover={{ x: collapsed ? 0 : 2 }}
                className={cn('relative flex items-center rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 group cursor-pointer',
                  collapsed && !mobileMode && 'justify-center px-0 mx-1',
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}>
                <div className={cn('flex items-center justify-center w-5 h-5 flex-shrink-0', !collapsed && 'mr-3')}>
                  <i className={cn('bi text-[15px]', item.icon)} />
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }} className="whitespace-nowrap flex-1">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {hasBadge && !collapsed && (
                  <span className={cn('ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                    isActive ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700')}>
                    {pendingDoctors}
                  </span>
                )}
                {hasBadge && collapsed && !mobileMode && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />
                )}
                {isActive && !collapsed && (
                  <i className="bi bi-chevron-right text-[10px] text-white/60 ml-1" />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className={cn('border-t border-slate-100 p-2 flex-shrink-0', collapsed && !mobileMode && 'flex justify-center')}>
        <button
          onClick={() => { clearAuth(); window.location.href = '/admin-login'; }}
          title={collapsed ? 'Sign out' : undefined}
          className={cn('flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors',
            collapsed && !mobileMode && 'justify-center w-10 h-10 px-0')}>
          <i className="bi bi-box-arrow-left text-[15px] flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );

  // Mobile mode: just render content inside the drawer div (no aside wrapper)
  if (mobileMode) {
    return <div className="flex flex-col h-full">{inner}</div>;
  }

  // Desktop mode: full fixed aside with motion
  const w = collapsed ? 72 : 260;
  return (
    <motion.aside animate={{ width: w }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-100 overflow-hidden"
      style={{ boxShadow: '4px 0 24px rgba(15,23,42,0.06)' }}>
      {inner}
    </motion.aside>
  );
}

export default function AdminSidebar(props: SidebarProps) {
  return <SidebarContent {...props} />;
}