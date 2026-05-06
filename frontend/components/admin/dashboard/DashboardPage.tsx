'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDashboardStats } from '@/lib/admin/api';
import type { DashboardStats } from '@/lib/admin/types';
import { StatCard, Avatar, Badge, Spinner } from '../common/UI';
import { fmtMoney, fmtNumber, fmtDate, MONTHS } from '@/lib/admin/utils';
import { toast } from '../common/UI';
import Link from 'next/link';

// ── Responsive MiniBarChart ────────────────────────────────────
function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 sm:gap-1.5 h-20 sm:h-24 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 truncate w-full text-center">
            {d.value > 0 ? fmtMoney(d.value).replace('₹', '') : ''}
          </span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${Math.max((d.value / max) * 64, d.value > 0 ? 6 : 2)}px` }}
            transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 min-h-[2px]"
          />
          <span className="text-[9px] text-slate-400 font-medium truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Donut chart SVG ────────────────────────────────────────────
const DONUT_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];
function DonutChart({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 44; const cx = 56; const cy = 56; const stroke = 16;
  let acc = 0;
  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const start = acc; acc += pct;
    const a1 = start * 2 * Math.PI - Math.PI / 2;
    const a2 = acc * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(a1); const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2); const y2 = cy + r * Math.sin(a2);
    const large = pct > 0.5 ? 1 : 0;
    return { ...d, path: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color: DONUT_COLORS[i % DONUT_COLORS.length], pct };
  });
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
      <svg width="112" height="112" viewBox="0 0 112 112" className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {slices.map((s, i) => (
          <motion.path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }} />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#1e293b" fontSize="16" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="9">Total</text>
      </svg>
      <div className="flex flex-col gap-1.5 flex-1 w-full">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[11.5px] text-slate-500 flex-1 truncate">{s.label}</span>
            <span className="text-[12px] font-bold text-slate-700">{s.value}</span>
            <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top Doctor row ─────────────────────────────────────────────
function TopDoctorRow({ doc, rank, delay }: { doc: DashboardStats['charts']['topDoctors'][0]; rank: number; delay: number }) {
  const pct = Math.max(20, 90 - rank * 14);
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay }}
      className="flex items-center gap-2.5 py-2.5 border-b border-slate-50 last:border-0">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${rank === 1 ? 'bg-amber-100 text-amber-600' : rank === 2 ? 'bg-slate-100 text-slate-500' : 'bg-orange-50 text-orange-400'}`}>
        {rank}
      </span>
      <Avatar name={doc.name} src={doc.profileImage} size={30} />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-slate-800 truncate">{doc.name}</p>
        <div className="mt-0.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: delay + 0.2 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[12px] font-bold text-slate-700">{doc.appointments}</p>
        <p className="text-[10px] text-slate-400">appts</p>
      </div>
    </motion.div>
  );
}

// ── Status maps ────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = { Scheduled: 'blue', Completed: 'green', Cancelled: 'red', 'In Progress': 'orange' };
const STATUS_ICONS:  Record<string, string> = { Scheduled: 'bi-clock', Completed: 'bi-check2-circle', Cancelled: 'bi-x-circle', 'In Progress': 'bi-arrow-repeat' };

// ── Quick action button ────────────────────────────────────────
function QuickAction({ icon, label, href, color }: { icon: string; label: string; href: string; color: string }) {
  return (
    <Link href={href}>
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
        className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 cursor-pointer">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${color} flex items-center justify-center`}>
          <i className={`bi ${icon} text-base sm:text-lg`} />
        </div>
        <span className="text-[10.5px] sm:text-[11.5px] font-semibold text-slate-600 text-center leading-tight">{label}</span>
      </motion.div>
    </Link>
  );
}

// ── Live pulse indicator ───────────────────────────────────────
function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-[10.5px] font-semibold text-emerald-600">Live</span>
    </div>
  );
}

// ── Mobile appointment card (instead of table row) ─────────────
function AppointmentCard({ a, delay }: { a: any; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar name={a.patientId?.name} src={a.patientId?.profileImage} size={32} />
          <div>
            <p className="text-[13px] font-semibold text-slate-800 leading-none">{a.patientId?.name || '—'}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">with {a.doctorId?.name || '—'}</p>
          </div>
        </div>
        <Badge variant={(STATUS_COLORS[a.status] as any) || 'gray'} icon={STATUS_ICONS[a.status]}>
          {a.status}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-[11.5px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <i className="bi bi-calendar3 text-slate-400" />
          {fmtDate(a.date)}
        </div>
        <Badge variant={a.consultationType === 'Video Consultation' ? 'blue' : 'purple'}
          icon={a.consultationType === 'Video Consultation' ? 'bi-camera-video-fill' : 'bi-telephone-fill'}>
          {a.consultationType === 'Video Consultation' ? 'Video' : 'Voice'}
        </Badge>
        <span className="font-bold text-slate-800">{fmtMoney(a.totalAmount)}</span>
      </div>
    </motion.div>
  );
}

// ── Platform health score ──────────────────────────────────────
function HealthScore({ ov }: { ov: any }) {
  const verifiedPct  = ov.totalDoctors > 0 ? (ov.verifiedDoctors / ov.totalDoctors) * 100 : 0;
  const completedPct = ov.totalAppointments > 0 ? (ov.completedAppointments / ov.totalAppointments) * 100 : 0;
  const activePct    = ov.totalUsers > 0 ? (ov.activeUsers / ov.totalUsers) * 100 : 0;
  const score        = Math.round((verifiedPct + completedPct + activePct) / 3);

  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Attention';

  const r = 36; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
          <motion.circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={`${circ}`}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transform="rotate(-90 44 44)"
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
          <text x="44" y="40" textAnchor="middle" fill="#1e293b" fontSize="16" fontWeight="800">{score}</text>
          <text x="44" y="54" textAnchor="middle" fill="#94a3b8" fontSize="9">/ 100</text>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-800">Platform Health</p>
        <p className="text-[11px] font-semibold mt-0.5" style={{ color }}>{label}</p>
        <div className="mt-2 space-y-1.5">
          {[
            { label: 'Doctor Verified', pct: verifiedPct },
            { label: 'Completion Rate', pct: completedPct },
            { label: 'Active Patients', pct: activePct },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-24 truncate flex-shrink-0">{m.label}</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${m.pct}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                  className="h-full rounded-full" style={{ background: color }} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 w-7 text-right">{Math.round(m.pct)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ── Main DashboardPage ─────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<'table' | 'cards'>('table');

  useEffect(() => {
    getDashboardStats()
      .then(({ data }) => setStats(data))
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!stats)  return <div className="p-6 text-center text-red-500 text-sm">Failed to load dashboard. Please refresh.</div>;

  const { overview: ov, charts, recentAppointments } = stats;

  const revenueChartData = (charts.revenueByMonth || []).map((r) => ({
    label: MONTHS[r._id.month - 1],
    value: r.revenue,
  }));

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 pb-8">

      {/* ── Quick Actions (mobile-first row) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Quick Actions</h2>
          <LiveBadge />
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-3">
          <QuickAction icon="bi-people-fill"         label="Patients"     href="/admin/users"        color="bg-blue-50 text-blue-600" />
          <QuickAction icon="bi-hospital-fill"       label="Doctors"      href="/admin/doctors"      color="bg-emerald-50 text-emerald-600" />
          <QuickAction icon="bi-calendar2-week-fill" label="Appointments" href="/admin/appointments" color="bg-amber-50 text-amber-600" />
          <QuickAction icon="bi-credit-card-fill"    label="Payments"     href="/admin/payments"     color="bg-violet-50 text-violet-600" />
        </div>
      </div>

      {/* ── Main stat cards — 2×2 on mobile, 4 on desktop ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Patients" value={fmtNumber(ov.totalUsers)} icon="bi-people-fill"
          iconBg="bg-blue-50" iconColor="text-blue-600"
          sub={`${fmtNumber(ov.activeUsers)} active · ${fmtNumber(ov.inactiveUsers)} inactive`}
          trend={{ value: `${fmtNumber(ov.activeUsers)} active`, up: true }} delay={0} />
        <StatCard label="Total Doctors" value={fmtNumber(ov.totalDoctors)} icon="bi-hospital-fill"
          iconBg="bg-emerald-50" iconColor="text-emerald-600"
          sub={`${fmtNumber(ov.verifiedDoctors)} verified · ${fmtNumber(ov.pendingVerification)} pending`}
          trend={{ value: `${fmtNumber(ov.pendingVerification)} pending`, up: ov.pendingVerification === 0 }} delay={0.06} />
        <StatCard label="Total Revenue" value={fmtMoney(ov.totalRevenue)} icon="bi-currency-rupee"
          iconBg="bg-violet-50" iconColor="text-violet-600"
          sub={`${fmtMoney(ov.thisMonthRevenue)} this month`}
          trend={{ value: fmtMoney(ov.thisMonthRevenue), up: true }} delay={0.12} />
        <StatCard label="Appointments" value={fmtNumber(ov.totalAppointments)} icon="bi-calendar2-check-fill"
          iconBg="bg-amber-50" iconColor="text-amber-600"
          sub={`Today: ${fmtNumber(ov.todayAppointments)} · Month: ${fmtNumber(ov.monthlyAppointments)}`}
          trend={{ value: `${fmtNumber(ov.todayAppointments)} today`, up: true }} delay={0.18} />
      </div>

      {/* ── Mini stat pills ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'Completed',       value: ov.completedAppointments, icon: 'bi-check2-circle',  color: 'text-emerald-600', bg: 'bg-emerald-50', isMoney: false },
          { label: 'Cancelled',       value: ov.cancelledAppointments,  icon: 'bi-x-circle',       color: 'text-red-500',     bg: 'bg-red-50',     isMoney: false },
          { label: 'This Month',      value: null, mVal: ov.thisMonthRevenue, icon: 'bi-graph-up-arrow', color: 'text-blue-600', bg: 'bg-blue-50', isMoney: true },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + i * 0.06 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4 flex items-center gap-2 sm:gap-4">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              <i className={`bi ${s.icon} ${s.color} text-base sm:text-lg`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[12px] font-semibold text-slate-400 truncate">{s.label}</p>
              <p className="text-[16px] sm:text-[22px] font-extrabold text-slate-800 leading-none">
                {s.isMoney ? fmtMoney(s.mVal) : fmtNumber(s.value ?? 0)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Platform health + Revenue chart ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Platform Health Score */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <HealthScore ov={ov} />
        </motion.div>

        {/* Revenue bar chart (2 cols on lg) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}
          className="sm:col-span-1 lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-800">Revenue Overview</h3>
              <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5">Last {revenueChartData.length} months</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-blue-600 bg-blue-50 px-2.5 sm:px-3 py-1.5 rounded-lg">
              <i className="bi bi-bar-chart-fill" /> Revenue
            </div>
          </div>
          {revenueChartData.length > 0
            ? <MiniBarChart data={revenueChartData} />
            : <div className="h-20 flex items-center justify-center text-slate-300 text-[13px]">No revenue data yet</div>}
        </motion.div>
      </div>

      {/* ── Donut chart + Top Doctors ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Appointment Status donut */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-800 mb-4">Appointments by Status</h3>
          <DonutChart data={(charts.appointmentsByStatus || []).map((s) => ({ label: s._id, value: s.count }))} />
        </motion.div>

        {/* Top Doctors */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-800">Top Doctors</h3>
            <span className="text-[10.5px] sm:text-[11px] text-slate-400">By appointments</span>
          </div>
          {(charts.topDoctors || []).length === 0
            ? <p className="text-[13px] text-slate-300 text-center py-6">No data</p>
            : charts.topDoctors.map((doc, i) => (
                <TopDoctorRow key={i} doc={doc} rank={i + 1} delay={0.48 + i * 0.06} />
              ))}
        </motion.div>
      </div>

      {/* ── Recent Appointments — table on desktop, cards on mobile ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100">
          <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-800">Recent Appointments</h3>
          <div className="flex items-center gap-2">
            {/* Toggle cards/table on small screens */}
            <div className="flex sm:hidden items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => setTab('cards')}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${tab === 'cards' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
                Cards
              </button>
              <button onClick={() => setTab('table')}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${tab === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
                Table
              </button>
            </div>
            <Link href="/admin/appointments" className="text-[11.5px] sm:text-[12px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        {/* Mobile cards view */}
        <div className={`sm:hidden ${tab === 'cards' ? 'block' : 'hidden'} p-3 space-y-2`}>
          {(recentAppointments || []).length === 0
            ? <p className="text-center text-slate-300 text-sm py-8">No appointments yet</p>
            : (recentAppointments || []).map((a, i) => (
                <AppointmentCard key={a._id} a={a} delay={0.54 + i * 0.05} />
              ))}
        </div>

        {/* Table view — always visible on sm+, toggled on mobile */}
        <div className={`${tab === 'table' ? 'block' : 'hidden'} sm:block overflow-x-auto`}>
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {['Patient', 'Doctor', 'Date', 'Type', 'Status', 'Amount'].map(h => (
                  <th key={h} className="px-3 sm:px-4 py-2.5 text-left text-[10px] sm:text-[10.5px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentAppointments || []).map((a, i) => (
                <motion.tr key={a._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.54 + i * 0.05 }}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={a.patientId?.name} src={a.patientId?.profileImage} size={26} />
                      <span className="text-[12px] sm:text-[12.5px] font-semibold text-slate-700 truncate max-w-[80px] sm:max-w-[100px]">{a.patientId?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[11.5px] sm:text-[12.5px] text-slate-600 truncate max-w-[80px]">{a.doctorId?.name || '—'}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-[12px] text-slate-400 whitespace-nowrap">{fmtDate(a.date)}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                    <Badge variant={a.consultationType === 'Video Consultation' ? 'blue' : 'purple'}
                      icon={a.consultationType === 'Video Consultation' ? 'bi-camera-video-fill' : 'bi-telephone-fill'}>
                      {a.consultationType === 'Video Consultation' ? 'Video' : 'Voice'}
                    </Badge>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                    <Badge variant={(STATUS_COLORS[a.status] as any) || 'gray'} icon={STATUS_ICONS[a.status]}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[12px] sm:text-[13px] font-bold text-slate-800 whitespace-nowrap">{fmtMoney(a.totalAmount)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}