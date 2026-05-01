'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getDashboardStats } from '@/lib/admin/api';
import type { DashboardStats } from '@/lib/admin/types';
import { StatCard, Avatar, Badge, Spinner } from '../common/UI';
import { fmtMoney, fmtNumber, fmtDate, fmtTime, MONTHS } from '@/lib/admin/utils';
import { toast } from '../common/UI';

// ── Inline mini bar chart ──────────────────────────────────────
function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }} animate={{ height: `${(d.value / max) * 56}px` }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 min-h-[4px]"
          />
          <span className="text-[9px] text-slate-400 font-medium truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Donut chart SVG ───────────────────────────────────────────
const DONUT_COLORS = ['#3b82f6','#10b981','#ef4444','#f59e0b','#8b5cf6'];
function DonutChart({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 52; const cx = 68; const cy = 68; const stroke = 18;
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
    <div className="flex items-center gap-5">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {slices.map((s, i) => (
          <motion.path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
        <text x={cx} y={cy - 5} textAnchor="middle" fill="#1e293b" fontSize="18" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fill="#94a3b8" fontSize="10">Total</text>
      </svg>
      <div className="flex flex-col gap-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[12px] text-slate-500">{s.label}</span>
            <span className="ml-auto text-[12px] font-bold text-slate-700 ml-3">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top Doctors List ───────────────────────────────────────────
function TopDoctorRow({ doc, rank, delay }: { doc: DashboardStats['charts']['topDoctors'][0]; rank: number; delay: number }) {
  const pct = 80 - rank * 12;
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay }}
      className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <span className="w-5 text-[11px] font-bold text-slate-300 text-center">{rank}</span>
      <Avatar name={doc.name} src={doc.profileImage} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 truncate">{doc.name}</p>
        <div className="mt-0.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: delay + 0.2 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[12px] font-bold text-slate-700">{doc.appointments}</p>
        <p className="text-[10.5px] text-slate-400">appts</p>
      </div>
    </motion.div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Scheduled: 'blue', Completed: 'green', Cancelled: 'red', 'In Progress': 'orange',
};
const STATUS_ICONS: Record<string, string> = {
  Scheduled: 'bi-clock', Completed: 'bi-check2-circle', Cancelled: 'bi-x-circle', 'In Progress': 'bi-arrow-repeat',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(({ data }) => setStats(data))
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

if (loading) return <Spinner />;
   if (!stats) return <div className="p-6 text-center text-red-500">Failed to load dashboard data. Please try again later.</div>;

  const { overview: ov, charts, recentAppointments } = stats;

  const revenueChartData = (charts.revenueByMonth || []).map((r) => ({
    label: MONTHS[r._id.month - 1],
    value: r.revenue,
  }));

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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

      {/* Second row: mini stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Completed',  value: ov.completedAppointments, icon: 'bi-check2-circle',  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cancelled',  value: ov.cancelledAppointments,  icon: 'bi-x-circle',       color: 'text-red-500',     bg: 'bg-red-50' },
          { label: 'This Month Revenue', value: null, isMoney: true, mVal: ov.thisMonthRevenue, icon: 'bi-graph-up-arrow', color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 + i * 0.06 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
              <i className={`bi ${s.icon} ${s.color} text-lg`} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-slate-400">{s.label}</p>
              <p className="text-[22px] font-extrabold text-slate-800 leading-none">
                {s.isMoney ? fmtMoney(s.mVal) : fmtNumber(s.value ?? 0)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue bar chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-slate-800">Revenue Overview</h3>
              <p className="text-[12px] text-slate-400 mt-0.5">Last {revenueChartData.length} months</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
              <i className="bi bi-bar-chart-fill" /> Revenue
            </div>
          </div>
          {revenueChartData.length > 0 ? (
            <MiniBarChart data={revenueChartData} />
          ) : (
            <div className="h-16 flex items-center justify-center text-slate-300 text-[13px]">No revenue data yet</div>
          )}
        </motion.div>

        {/* Appointment donut */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-slate-800 mb-4">By Status</h3>
          <DonutChart data={(charts.appointmentsByStatus || []).map((s) => ({ label: s._id, value: s.count }))} />
        </motion.div>
      </div>

      {/* Bottom Row: Top Doctors + Recent Appointments */}
      <div className="grid grid-cols-3 gap-4">
        {/* Top Doctors */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-slate-800">Top Doctors</h3>
            <span className="text-[11px] text-slate-400">By appointments</span>
          </div>
          {(charts.topDoctors || []).length === 0 ? (
            <p className="text-[13px] text-slate-300 text-center py-6">No data</p>
          ) : (
            charts.topDoctors.map((doc, i) => (
              <TopDoctorRow key={i} doc={doc} rank={i + 1} delay={0.48 + i * 0.06} />
            ))
          )}
        </motion.div>

        {/* Recent Appointments */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
          className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-[14px] font-bold text-slate-800">Recent Appointments</h3>
            <a href="/admin/appointments" className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <i className="bi bi-arrow-right" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {['Patient','Doctor','Date','Type','Status','Amount'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(recentAppointments || []).map((a, i) => (
                  <motion.tr key={a._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.54 + i * 0.05 }}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={a.patientId?.name} src={a.patientId?.profileImage} size={28} />
                        <span className="text-[12.5px] font-semibold text-slate-700 truncate max-w-[100px]">{a.patientId?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-slate-600">{a.doctorId?.name || '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-400 whitespace-nowrap">{fmtDate(a.date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={a.consultationType === 'Video Consultation' ? 'blue' : 'purple'}
                        icon={a.consultationType === 'Video Consultation' ? 'bi-camera-video-fill' : 'bi-telephone-fill'}>
                        {a.consultationType === 'Video Consultation' ? 'Video' : 'Voice'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={(STATUS_COLORS[a.status] as any) || 'gray'} icon={STATUS_ICONS[a.status]}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-800">{fmtMoney(a.totalAmount)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
