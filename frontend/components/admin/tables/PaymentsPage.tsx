'use client';
import { useCallback, useEffect, useState } from 'react';
import { getPayments, getPaymentStats } from '@/lib/admin/api';
import type { Appointment, PaymentStats } from '@/lib/admin/types';
import {
  Badge, Table, TableRow, Td, UserCell, Pagination,
  SectionCard, CardHeader, FilterSelect, EmptyState, toast, StatCard,
} from '../common/UI';
import AdminHeader from '../common/Header';
import { fmtDate, fmtMoney } from '@/lib/admin/utils';

const PAYMENT_BADGE: Record<string, any> = {
  Paid: { variant: 'green', icon: 'bi-check-circle-fill' },
  Pending: { variant: 'orange', icon: 'bi-clock' },
  refunded: { variant: 'red', icon: 'bi-arrow-counterclockwise' },
};
const PAYOUT_BADGE: Record<string, any> = {
  Paid: { variant: 'green', icon: 'bi-check2' },
  Pending: { variant: 'orange', icon: 'bi-hourglass-split' },
  Cancelled: { variant: 'red', icon: 'bi-x' },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [payoutFilter, setPayoutFilter] = useState('');
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data, meta }, { data: s }] = await Promise.all([
        getPayments({
          page: String(page), limit: String(LIMIT),
          ...(paymentFilter ? { paymentStatus: paymentFilter } : {}),
          ...(payoutFilter ? { payoutStatus: payoutFilter } : {}),
        }),
        getPaymentStats(),
      ]);
      setPayments(data); setTotal(meta.total); setStats(s);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [page, paymentFilter, payoutFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [paymentFilter, payoutFilter]);

  return (
    <>
      <AdminHeader title="Payments & Revenue" subtitle="Transaction history and financial analytics" />
      <div className="pt-16 p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Revenue"    value={fmtMoney(stats?.totalRevenue)}      icon="bi-currency-rupee"       iconBg="bg-violet-50"  iconColor="text-violet-600" delay={0}    sub={`${stats?.totalPaid ?? 0} paid transactions`} />
          <StatCard label="Pending Payouts"  value={fmtMoney(stats?.pendingPayoutAmount)} icon="bi-hourglass-split"      iconBg="bg-amber-50"   iconColor="text-amber-600"  delay={0.06} sub={`${stats?.pendingPayoutCount ?? 0} doctors awaiting payout`} />
          <StatCard label="Refunded"         value={fmtMoney(stats?.refundedAmount)}     icon="bi-arrow-counterclockwise" iconBg="bg-red-50"   iconColor="text-red-500"    delay={0.12} sub={`${stats?.refundedCount ?? 0} refund transactions`} />
        </div>

        <SectionCard>
          <CardHeader>
            <h3 className="text-[14px] font-bold text-slate-800 mr-auto">Transaction History</h3>
            <span className="text-[12px] font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">{total} total</span>
            <FilterSelect value={paymentFilter} onChange={setPaymentFilter} options={[
              { value: '', label: 'All Payments' },
              { value: 'Paid', label: 'Paid' },
              { value: 'refunded', label: 'Refunded' },
            ]} />
            <FilterSelect value={payoutFilter} onChange={setPayoutFilter} options={[
              { value: '', label: 'All Payouts' },
              { value: 'Pending', label: 'Payout Pending' },
              { value: 'Paid', label: 'Payout Paid' },
              { value: 'Cancelled', label: 'Payout Cancelled' },
            ]} />
          </CardHeader>

          <Table
            headers={['Patient', 'Doctor', 'Date', 'Method', 'Consult Fee', 'Platform Fee', 'Total', 'Payment', 'Payout']}
            loading={loading} colSpan={9}
          >
            {payments.length === 0 && !loading ? (
              <tr><td colSpan={9}><EmptyState icon="bi-credit-card-2-front" title="No transactions found" /></td></tr>
            ) : payments.map((a, i) => (
              <TableRow key={a._id} delay={i * 0.025}>
                <Td><UserCell name={a.patientId?.name} email={a.patientId?.email} image={a.patientId?.profileImage} /></Td>
                <Td><UserCell name={a.doctorId?.name} sub={a.doctorId?.specialization} image={a.doctorId?.profileImage} /></Td>
                <Td className="text-slate-400 text-[12.5px] whitespace-nowrap">{fmtDate(a.paymentDate || a.date)}</Td>
                <Td>
                  <Badge variant="gray">{a.paymentMethod || '—'}</Badge>
                </Td>
                <Td className="text-slate-700">{fmtMoney(a.consultationFees)}</Td>
                <Td className="text-slate-500">{fmtMoney(a.platformFees)}</Td>
                <Td className="font-bold text-slate-800">{fmtMoney(a.totalAmount)}</Td>
                <Td><Badge {...(PAYMENT_BADGE[a.paymentStatus] || { variant: 'gray' })}>{a.paymentStatus}</Badge></Td>
                <Td><Badge {...(PAYOUT_BADGE[a.payoutStatus] || { variant: 'gray' })}>{a.payoutStatus}</Badge></Td>
              </TableRow>
            ))}
          </Table>
          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
        </SectionCard>
      </div>
    </>
  );
}
