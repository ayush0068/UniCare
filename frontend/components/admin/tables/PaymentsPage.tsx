'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPayments, getPaymentStats, getPayouts, markPayoutPaid, bulkMarkPayoutsPaid,
} from '@/lib/admin/api';
import type { Appointment, PaymentStats } from '@/lib/admin/types';
import {
  Badge, Table, TableRow, Td, UserCell, Pagination,
  SectionCard, CardHeader, FilterSelect, EmptyState, toast, StatCard,
} from '../common/UI';
import AdminHeader from '../common/Header';
import { fmtDate, fmtMoney } from '@/lib/admin/utils';

const PAYMENT_BADGE: Record<string, any> = {
  Paid:     { variant: 'green',  icon: 'bi-check-circle-fill' },
  Pending:  { variant: 'orange', icon: 'bi-clock' },
  refunded: { variant: 'red',    icon: 'bi-arrow-counterclockwise' },
};
const PAYOUT_BADGE: Record<string, any> = {
  Paid:      { variant: 'green',  icon: 'bi-check2' },
  Pending:   { variant: 'orange', icon: 'bi-hourglass-split' },
  Cancelled: { variant: 'red',    icon: 'bi-x' },
};

// ── Pay Doctor Modal ──────────────────────────────────────────
function PayDoctorModal({
  appointment,
  onClose,
  onSuccess,
}: {
  appointment: Appointment & { payoutAmount?: number };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading]           = useState(false);
  const [generatedUTR, setGeneratedUTR] = useState('');

  const bd         = (appointment.doctorId as any)?.bankDetails;
  const payoutAmt  = appointment.consultationFees;
  const guestExtra = appointment.guestSurcharge || 0;  // derived on backend — works for all appointments

  const handlePayout = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') || '' : '';
      const res   = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payment/payout-doctor`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ appointmentId: appointment._id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setGeneratedUTR(data.data.utr);
      toast(`Payout of ${fmtMoney(payoutAmt)} processed! UTR: ${data.data.utr}`, 'success');
      onSuccess();
    } catch (e: any) {
      toast(e.message || 'Payout failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div key="modal" initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest">Paying Doctor</p>
                <h2 className="text-white text-[18px] font-bold mt-0.5">Dr. {(appointment.doctorId as any)?.name}</h2>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <i className="bi bi-x-lg text-sm" />
              </button>
            </div>

            {/* Amount breakdown */}
            <div className="mt-4 bg-white/15 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-white/80">
                <span>Consultation fee</span>
                <span className="font-semibold">{fmtMoney(appointment.consultationFees)}</span>
              </div>
              <div className="flex justify-between text-sm text-white/80">
                <span>Platform fee (10%)</span>
                <span className="font-semibold">{fmtMoney(appointment.platformFees)}</span>
              </div>
              {guestExtra > 0 && (
                <div className="flex justify-between text-sm text-amber-200">
                  <span className="flex items-center gap-1">
                    <i className="bi bi-person-dash text-xs" />
                    Guest surcharge (Admin keeps)
                  </span>
                  <span className="font-semibold">{fmtMoney(guestExtra)}</span>
                </div>
              )}
              <div className="border-t border-white/20 pt-2 flex justify-between">
                <span className="text-white/80 text-sm">Patient paid (total)</span>
                <span className="text-white font-bold">{fmtMoney(appointment.totalAmount)}</span>
              </div>
              <div className="border-t border-white/30 pt-2 flex justify-between">
                <span className="text-white font-bold">Doctor receives</span>
                <span className="text-white font-extrabold text-[17px]">{fmtMoney(payoutAmt)}</span>
              </div>
            </div>
          </div>

          {/* Bank details */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Doctor Bank Details</p>
            {bd?.accountNumber ? (
              <div className="space-y-1.5">
                {[
                  ['Account Holder', bd.accountHolderName || '—'],
                  ['Bank',           bd.bankName          || '—'],
                  ['IFSC',           bd.ifscCode          || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">{label}</span>
                    <span className="text-[12.5px] font-semibold text-slate-800">{val}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">Account No.</span>
                  <span className="text-[12.5px] font-mono font-bold text-slate-800 tracking-wider">
                    {'*'.repeat(Math.max(0, (bd.accountNumber || '').length - 4))}{(bd.accountNumber || '').slice(-4)}
                  </span>
                </div>
                {bd.upiId && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">UPI ID</span>
                    <span className="text-[12.5px] font-semibold text-slate-800">{bd.upiId}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <i className="bi bi-exclamation-triangle-fill text-amber-500" />
                <p className="text-[12px] text-amber-700 font-medium">Doctor has not added bank details yet. Payout will still be processed and doctor will be notified.</p>
              </div>
            )}
          </div>

          {/* Action body */}
          <div className="px-6 py-5 space-y-4">
            {generatedUTR ? (
              <>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <i className="bi bi-check2-circle text-emerald-600 text-xl" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Payout Processed</p>
                  <p className="text-[11px] text-emerald-500">UTR Reference Number</p>
                  <p className="text-[20px] font-mono font-extrabold text-emerald-800 tracking-widest">{generatedUTR}</p>
                  <p className="text-[10px] text-emerald-400">Doctor has been notified</p>
                </div>
                <button onClick={onClose}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all">
                  Done
                </button>
              </>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-3">
                  <i className="bi bi-lightning-charge-fill text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[12px] font-semibold text-blue-800">Razorpay Payment</p>
                    <p className="text-[11px] text-blue-500 mt-0.5 leading-relaxed">
                      {fmtMoney(payoutAmt)} will be processed via Razorpay test mode. A unique UTR will be auto-generated and saved.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={onClose}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handlePayout} disabled={loading}
                    className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
                      : <><i className="bi bi-lightning-charge-fill" />Process Payout</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main PaymentsPage ─────────────────────────────────────────
export default function PaymentsPage() {
  const [activeTab, setActiveTab]       = useState<'transactions' | 'payouts'>('transactions');
  const [payments, setPayments]         = useState<Appointment[]>([]);
  const [payouts, setPayouts]           = useState<(Appointment & { payoutAmount?: number; payoutDate?: string | Date })[]>([]);
  const [stats, setStats]               = useState<PaymentStats | null>(null);
  const [payoutSummary, setPayoutSummary] = useState({ pendingAmount: 0, pendingCount: 0, paidAmount: 0, paidCount: 0 });
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [payoutFilter, setPayoutFilter]   = useState('Pending');
  const [selectedIds, setSelectedIds]     = useState<string[]>([]);
  const [payingAppt, setPayingAppt]       = useState<Appointment | null>(null);
  const [bulkLoading, setBulkLoading]     = useState(false);
  const [bulkRef, setBulkRef]             = useState('');
  const LIMIT = 15;

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data, meta }, { data: s }] = await Promise.all([
        getPayments({ page: String(page), limit: String(LIMIT), ...(paymentFilter ? { paymentStatus: paymentFilter } : {}) }),
        getPaymentStats(),
      ]);
      setPayments(data); setTotal(meta.total); setStats(s);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [page, paymentFilter]);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await getPayouts({
        page: String(page), limit: String(LIMIT),
        ...(payoutFilter ? { payoutStatus: payoutFilter } : {}),
      });
      setPayouts(data as any); setTotal(meta.total);
      if (meta.summary) setPayoutSummary(meta.summary);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [page, payoutFilter]);

  useEffect(() => {
    setPage(1); setSelectedIds([]);
    if (activeTab === 'transactions') loadTransactions();
    else loadPayouts();
  }, [activeTab, paymentFilter, payoutFilter]);

  useEffect(() => {
    if (activeTab === 'transactions') loadTransactions();
    else loadPayouts();
  }, [page]);

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectAllPending = () => {
    const pendingIds = payouts.filter(p => p.payoutStatus === 'Pending').map(p => p._id);
    setSelectedIds(prev => prev.length === pendingIds.length ? [] : pendingIds);
  };

  const handleBulkPay = async () => {
    if (selectedIds.length === 0) { toast('Select at least one appointment', 'error'); return; }
    setBulkLoading(true);
    try {
      const { data } = await bulkMarkPayoutsPaid(selectedIds, { transactionRef: bulkRef });
      toast(`${data.updated} payouts marked paid. Total: ${fmtMoney(data.totalPayout)}`, 'success');
      setSelectedIds([]); setBulkRef('');
      loadPayouts();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBulkLoading(false); }
  };

  return (
    <>
      <AdminHeader title="Payments & Payouts" subtitle="Transaction history, revenue and doctor payouts" />
      <div className="pt-16 p-4 sm:p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Revenue"   value={fmtMoney(stats?.totalRevenue)}       icon="bi-currency-rupee"        iconBg="bg-violet-50"  iconColor="text-violet-600" delay={0}    sub={`${stats?.totalPaid ?? 0} paid transactions`} />
          <StatCard label="Pending Payouts" value={fmtMoney(payoutSummary.pendingAmount)} icon="bi-hourglass-split"       iconBg="bg-amber-50"   iconColor="text-amber-600"  delay={0.06} sub={`${payoutSummary.pendingCount} doctors waiting`}
            trend={payoutSummary.pendingCount > 0 ? { value: `${payoutSummary.pendingCount} pending`, up: false } : undefined} />
          <StatCard label="Paid Out"        value={fmtMoney(payoutSummary.paidAmount)}  icon="bi-check2-all"            iconBg="bg-emerald-50" iconColor="text-emerald-600" delay={0.12} sub={`${payoutSummary.paidCount} completed`} />
          <StatCard label="Refunded"        value={fmtMoney(stats?.refundedAmount)}     icon="bi-arrow-counterclockwise" iconBg="bg-red-50"     iconColor="text-red-500"    delay={0.18} sub={`${stats?.refundedCount ?? 0} refunds`} />
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
          {(['transactions', 'payouts'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-[13px] font-semibold capitalize transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {tab === 'payouts' && payoutSummary.pendingCount > 0 && (
                <span className="mr-1.5 inline-flex items-center justify-center w-4 h-4 bg-amber-400 text-white text-[9px] font-bold rounded-full">
                  {payoutSummary.pendingCount > 9 ? '9+' : payoutSummary.pendingCount}
                </span>
              )}
              {tab === 'transactions' ? 'Transactions' : 'Doctor Payouts'}
            </button>
          ))}
        </div>

        {/* ── Transactions Tab ── */}
        {activeTab === 'transactions' && (
          <SectionCard>
            <CardHeader>
              <h3 className="text-[14px] font-bold text-slate-800 mr-auto">Transaction History</h3>
              <span className="text-[12px] font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">{total} total</span>
              <FilterSelect value={paymentFilter} onChange={setPaymentFilter} options={[
                { value: '', label: 'All Payments' },
                { value: 'Paid', label: 'Paid' },
                { value: 'refunded', label: 'Refunded' },
              ]} />
            </CardHeader>
            <div className="overflow-x-auto">
              <Table headers={['Patient', 'Doctor', 'Date', 'Method', 'Consult Fee', 'Platform Fee', 'Total', 'Payment', 'Payout']}
                loading={loading} colSpan={9}>
                {payments.length === 0 && !loading ? (
                  <tr><td colSpan={9}><EmptyState icon="bi-credit-card-2-front" title="No transactions found" desc="" /></td></tr>
                ) : payments.map((a, i) => (
                  <TableRow key={a._id} delay={i * 0.025}>
                    <Td><UserCell name={a.patientId?.name} email={a.patientId?.email} image={a.patientId?.profileImage} /></Td>
                    <Td><UserCell name={(a.doctorId as any)?.name} sub={(a.doctorId as any)?.specialization} image={(a.doctorId as any)?.profileImage} /></Td>
                    <Td className="text-slate-400 text-[12.5px] whitespace-nowrap">{fmtDate(a.paymentDate || a.date)}</Td>
                    <Td><Badge variant="gray">{a.paymentMethod || '—'}</Badge></Td>
                    <Td className="text-slate-700 font-semibold">{fmtMoney(a.consultationFees)}</Td>
                    <Td className="text-slate-400">{fmtMoney(a.platformFees)}</Td>
                    <Td className="font-bold text-slate-800">{fmtMoney(a.totalAmount)}</Td>
                    <Td><Badge {...(PAYMENT_BADGE[a.paymentStatus] || { variant: 'gray' })}>{a.paymentStatus}</Badge></Td>
                    <Td><Badge {...(PAYOUT_BADGE[a.payoutStatus]  || { variant: 'gray' })}>{a.payoutStatus}</Badge></Td>
                  </TableRow>
                ))}
              </Table>
            </div>
            <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
          </SectionCard>
        )}

        {/* ── Payouts Tab ── */}
        {activeTab === 'payouts' && (
          <SectionCard>
            <CardHeader>
              <h3 className="text-[14px] font-bold text-slate-800 mr-auto">Doctor Payouts</h3>
              <FilterSelect value={payoutFilter} onChange={setPayoutFilter} options={[
                { value: '',        label: 'All Payouts' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Paid',    label: 'Paid' },
              ]} />
            </CardHeader>

            {/* Bulk pay banner */}
            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mx-4 sm:mx-5 mb-3 overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <div className="flex items-center gap-2 flex-1">
                      <i className="bi bi-check2-circle text-emerald-500 text-lg" />
                      <span className="text-[13px] font-semibold text-emerald-800">
                        {selectedIds.length} appointment{selectedIds.length > 1 ? 's' : ''} selected
                        · Total: <strong>{fmtMoney(payouts.filter(p => selectedIds.includes(p._id)).reduce((s, p) => s + p.consultationFees, 0))}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input value={bulkRef} onChange={e => setBulkRef(e.target.value)}
                        placeholder="Transaction ref (optional)"
                        className="flex-1 sm:w-48 px-3 py-2 text-[12px] font-medium border border-emerald-200 rounded-xl bg-white text-slate-800 outline-none focus:border-emerald-400" />
                      <button onClick={handleBulkPay} disabled={bulkLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-bold rounded-xl shadow-md shadow-emerald-200 disabled:opacity-50 transition-all whitespace-nowrap">
                        {bulkLoading
                          ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <i className="bi bi-send-check-fill" />}
                        Pay All
                      </button>
                      <button onClick={() => setSelectedIds([])}
                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <i className="bi bi-x-lg text-sm" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-x-auto">
              <Table headers={['', 'Doctor', 'Patient', 'Consultation Date', 'Consult Fee', 'Platform Fee', 'Payout Amount', 'Bank Details', 'Payout Status', 'Action']}
                loading={loading} colSpan={10}>
                {payouts.length === 0 && !loading ? (
                  <tr><td colSpan={10}>
                    <EmptyState icon="bi-cash-stack" title="No payouts found"
                      desc={payoutFilter === 'Pending' ? 'All doctor payouts are up to date!' : 'No payout records match your filter'} />
                  </td></tr>
                ) : payouts.map((a, i) => {
                  const bd       = (a.doctorId as any)?.bankDetails;
                  const hasBD    = !!(bd?.accountNumber || bd?.upiId);
                  const isPending = a.payoutStatus === 'Pending';
                  const selected  = selectedIds.includes(a._id);

                  return (
                    <TableRow key={a._id} delay={i * 0.025}>
                      {/* Checkbox — only for pending */}
                      <Td>
                        {isPending ? (
                          <button onClick={() => toggleSelect(a._id)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'}`}>
                            {selected && <i className="bi bi-check text-white text-[11px] font-bold" />}
                          </button>
                        ) : <span />}
                      </Td>

                      {/* Doctor */}
                      <Td>
                        <div className="flex items-center gap-2.5 min-w-[160px]">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                            {((a.doctorId as any)?.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-800 leading-none truncate">{(a.doctorId as any)?.name || '—'}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{(a.doctorId as any)?.specialization || ''}</p>
                          </div>
                        </div>
                      </Td>

                      {/* Patient */}
                      <Td>
                        <p className="text-[12.5px] font-semibold text-slate-700 truncate max-w-[100px]">{a.patientId?.name || '—'}</p>
                      </Td>

                      {/* Date */}
                      <Td className="text-slate-400 text-[12px] whitespace-nowrap">{fmtDate(a.paymentDate || a.date)}</Td>

                      {/* Consult fee */}
                      <Td className="font-bold text-slate-800">{fmtMoney(a.consultationFees)}</Td>

                      {/* Platform fee */}
                      <Td>
                        <span className="text-[12px] font-semibold text-slate-400">{fmtMoney(a.platformFees)}</span>
                        <span className="ml-1 text-[10px] text-slate-300">(kept)</span>
                      </Td>

                      {/* Payout amount */}
                      <Td>
                        <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                          <i className="bi bi-currency-rupee text-sm" />{a.consultationFees}
                        </span>
                      </Td>

                      {/* Bank details status */}
                      <Td>
                        {hasBD ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                              <i className="bi bi-bank2 text-sm" /> Added
                            </span>
                            {bd.upiId && (
                              <p className="text-[10.5px] text-slate-400 pl-1">{bd.upiId}</p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                            <i className="bi bi-exclamation-triangle text-sm" /> Missing
                          </span>
                        )}
                      </Td>

                      {/* Payout status */}
                      <Td>
                        <Badge {...(PAYOUT_BADGE[a.payoutStatus] || { variant: 'gray' })}>{a.payoutStatus}</Badge>
                        {a.payoutStatus === 'Paid' && a.payoutDate && (
                          <p className="text-[10.5px] text-slate-400 mt-0.5">{fmtDate(a.payoutDate)}</p>
                        )}
                        {a.payoutStatus === 'Paid' && (a as any).payoutTransactionRef && (
                          <p className="text-[10px] font-mono text-emerald-600 mt-0.5 tracking-wide">
                            {(a as any).payoutTransactionRef}
                          </p>
                        )}
                        {(a.guestSurcharge || 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] font-semibold text-amber-700">
                            <i className="bi bi-person-dash" /> +{fmtMoney(a.guestSurcharge)} guest
                          </span>
                        )}
                      </Td>

                      {/* Action */}
                      <Td>
                        {isPending ? (
                          <button onClick={() => setPayingAppt(a)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-bold rounded-xl shadow-md shadow-emerald-200 transition-all whitespace-nowrap">
                            <i className="bi bi-send-check-fill text-sm" /> Pay Now
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-400">
                            <i className="bi bi-check2-all" /> Done
                          </span>
                        )}
                      </Td>
                    </TableRow>
                  );
                })}
              </Table>
            </div>

            {/* Select all pending shortcut */}
            {payouts.some(p => p.payoutStatus === 'Pending') && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <button onClick={selectAllPending}
                  className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors">
                  <i className="bi bi-check2-square" />
                  {selectedIds.length === payouts.filter(p => p.payoutStatus === 'Pending').length
                    ? 'Deselect All'
                    : 'Select All Pending'}
                </button>
                <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
              </div>
            )}
            {!payouts.some(p => p.payoutStatus === 'Pending') && (
              <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
            )}
          </SectionCard>
        )}
      </div>

      {/* Pay doctor modal */}
      {payingAppt && (
        <PayDoctorModal
          appointment={payingAppt}
          onClose={() => setPayingAppt(null)}
          onSuccess={loadPayouts}
        />
      )}
    </>
  );
}