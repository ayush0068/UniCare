'use client';
import { motion } from 'framer-motion';
import { cn, initials } from '@/lib/admin/utils';
import { useEffect, useState } from 'react';

// ── Badge ─────────────────────────────────────────────────────
type BadgeVariant = 'blue'|'green'|'red'|'orange'|'purple'|'gray'|'teal';
interface BadgeProps { variant: BadgeVariant; children: React.ReactNode; icon?: string; className?: string }

const badgeStyles: Record<BadgeVariant, string> = {
  blue:   'bg-blue-50 text-blue-700 border border-blue-200/80',
  green:  'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  red:    'bg-red-50 text-red-600 border border-red-200/80',
  orange: 'bg-amber-50 text-amber-700 border border-amber-200/80',
  purple: 'bg-violet-50 text-violet-700 border border-violet-200/80',
  gray:   'bg-slate-100 text-slate-600 border border-slate-200/80',
  teal:   'bg-teal-50 text-teal-700 border border-teal-200/80',
};

export function Badge({ variant, children, icon, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full', badgeStyles[variant], className)}>
      {icon && <i className={cn('bi', icon, 'text-[10px]')} />}
      {children}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────
const avatarColors = [
  'from-blue-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
];

export function Avatar({ name, src, size = 32, className }: { name?: string; src?: string; size?: number; className?: string }) {
  const idx = name ? name.charCodeAt(0) % avatarColors.length : 0;
  const style = { width: size, height: size };
  if (src) return (
    <div style={style} className={cn('rounded-full overflow-hidden flex-shrink-0 bg-slate-100', className)}>
      <img src={src} alt={name} className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    </div>
  );
  return (
    <div style={style} className={cn(`rounded-full bg-gradient-to-br ${avatarColors[idx]} flex items-center justify-center flex-shrink-0`, className)}>
      <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>{initials(name)}</span>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center py-10">
      <motion.div
        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        style={{ width: size, height: size }}
        className="rounded-full border-2 border-slate-200 border-t-blue-600"
      />
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────
interface StatCardProps {
  label: string; value: string | number; sub?: string; icon: string;
  iconColor: string; iconBg: string; delay?: number; trend?: { value: string; up: boolean };
}

export function StatCard({ label, value, sub, icon, iconColor, iconBg, delay = 0, trend }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(15,23,42,0.1)' }}
      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm cursor-default"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}>
          <i className={cn('bi text-lg', icon, iconColor)} />
        </div>
        {trend && (
          <span className={cn('text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg',
            trend.up ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50')}>
            <i className={cn('bi text-[10px]', trend.up ? 'bi-arrow-up-right' : 'bi-arrow-down-right')} />
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[26px] font-extrabold text-slate-800 leading-none mb-1.5">{value}</p>
      {sub && <p className="text-[12px] text-slate-400">{sub}</p>}
    </motion.div>
  );
}

// ── EmptyState ────────────────────────────────────────────────
export function EmptyState({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <i className={cn('bi text-3xl text-slate-300', icon)} />
      </div>
      <p className="text-[14px] font-semibold text-slate-500">{title}</p>
      {desc && <p className="text-[12.5px] text-slate-400 mt-1">{desc}</p>}
    </div>
  );
}

// ── Toast (global) ────────────────────────────────────────────
export interface ToastItem { id: string; msg: string; type: 'success'|'error'|'info' }

let pushToast: ((t: Omit<ToastItem,'id'>) => void) | null = null;
export function toast(msg: string, type: ToastItem['type'] = 'info') {
  pushToast?.({ msg, type });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushToast = (t) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((p) => [...p, { ...t, id }]);
      setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3500);
    };
    return () => { pushToast = null; };
  }, []);

  const styles: Record<string, string> = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };
  const icons: Record<string, string> = {
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    info: 'bi-info-circle-fill',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <motion.div key={t.id}
          initial={{ opacity: 0, x: 60, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60 }}
          className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-white text-[13.5px] font-medium min-w-[260px]', styles[t.type])}
        >
          <i className={cn('bi text-sm', icons[t.type])} />
          {t.msg}
        </motion.div>
      ))}
    </div>
  );
}

// ── ActionButton ──────────────────────────────────────────────
interface ActionButtonProps {
  icon: string; label: string; variant?: 'default'|'danger'|'success'|'primary';
  onClick: () => void; disabled?: boolean;
}

const actionStyles = {
  default:  'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700',
  danger:   'border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600',
  success:  'border-slate-200 text-slate-400 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600',
  primary:  'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-300',
};

export function ActionButton({ icon, label, variant = 'default', onClick, disabled }: ActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
      onClick={onClick} disabled={disabled} title={label}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-xl border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
        actionStyles[variant]
      )}
    >
      <i className={cn('bi text-[13px]', icon)} />
    </motion.button>
  );
}

// ── Button ────────────────────────────────────────────────────
interface ButtonProps {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary'|'secondary'|'danger'|'ghost';
  size?: 'sm'|'md'; icon?: string; disabled?: boolean; type?: 'button'|'submit';
}

const btnStyles = {
  primary:   'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200/80 border-transparent',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300',
  danger:    'bg-red-600 hover:bg-red-700 text-white border-transparent shadow-sm',
  ghost:     'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent',
};
const btnSizes = {
  sm: 'px-3 py-1.5 text-[12.5px] rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-[13px] rounded-xl gap-2',
};

export function Button({ children, onClick, variant = 'secondary', size = 'md', icon, disabled, type = 'button' }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
      type={type} onClick={onClick} disabled={disabled}
      className={cn(
        'inline-flex items-center font-semibold border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        btnStyles[variant], btnSizes[size]
      )}
    >
      {icon && <i className={cn('bi', icon)} />}
      {children}
    </motion.button>
  );
}

// ── Modal ─────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; width?: string }

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 20 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={cn('relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh]', width)}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-[16px] font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors">
            <i className="bi bi-x-lg text-[13px]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 flex-shrink-0">{footer}</div>}
      </motion.div>
    </div>
  );
}

// ── ConfirmModal ──────────────────────────────────────────────
interface ConfirmProps { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; danger?: boolean }

export function ConfirmModal({ open, onClose, onConfirm, title, message, danger = false }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={() => { onConfirm(); onClose(); }}>
          {danger ? 'Confirm' : 'Yes, proceed'}
        </Button>
      </>}
    >
      <p className="text-[14px] text-slate-500 leading-relaxed">{message}</p>
    </Modal>
  );
}

// ── FormField ─────────────────────────────────────────────────
export function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 text-[13.5px] text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-300';
export const inputClass = inputCls;

// ── SearchBar ─────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]" />
      <input
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-4 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-64 placeholder:text-slate-300 text-slate-700"
      />
    </div>
  );
}

// ── FilterSelect ──────────────────────────────────────────────
export function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-600 transition-all cursor-pointer"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Table ─────────────────────────────────────────────────────
export function Table({ headers, children, loading, colSpan }: { headers: string[]; children: React.ReactNode; loading?: boolean; colSpan: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-100">
            {headers.map((h) => (
              <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap first:pl-5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={colSpan} className="py-16 text-center"><Spinner /></td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

// ── TableRow ──────────────────────────────────────────────────
export function TableRow({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group"
    >
      {children}
    </motion.tr>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-5 py-3.5 text-[13.5px] text-slate-700 align-middle', className)}>{children}</td>;
}

// ── UserCell ──────────────────────────────────────────────────
export function UserCell({ name, email, image, sub }: { name: string; email?: string; image?: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} src={image} size={34} />
      <div>
        <p className="text-[13.5px] font-semibold text-slate-800 leading-none">{name || '—'}</p>
        <p className="text-[11.5px] text-slate-400 mt-0.5">{sub || email || ''}</p>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────
interface PaginationProps { page: number; total: number; limit: number; onChange: (p: number) => void }

export function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages: (number | '…')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i);
    else if (i === 2 || i === totalPages - 1) pages.push('…');
  }

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
      <p className="text-[12.5px] text-slate-400">Showing <span className="font-semibold text-slate-600">{start}–{end}</span> of <span className="font-semibold text-slate-600">{total}</span></p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors text-sm">
          <i className="bi bi-chevron-left text-[11px]" />
        </button>
        {pages.map((p, i) => p === '…' ? (
          <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-slate-300 text-sm">…</span>
        ) : (
          <button key={p} onClick={() => onChange(p as number)}
            className={cn('w-8 h-8 flex items-center justify-center rounded-lg text-[12.5px] font-semibold border transition-all',
              p === page ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors text-sm">
          <i className="bi bi-chevron-right text-[11px]" />
        </button>
      </div>
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────
export function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn('bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden', className)}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center flex-wrap gap-3 px-5 py-4 border-b border-slate-100">{children}</div>;
}
