'use client';
import { useCallback, useEffect, useState } from 'react';
import { getAppointments } from '@/lib/admin/api';
import type { Appointment } from '@/lib/admin/types';
import {
  Badge, Table, TableRow, Td, UserCell, Pagination,
  SectionCard, CardHeader, SearchBar, FilterSelect, EmptyState, toast,
} from '../common/UI';
import AdminHeader from '../common/Header';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/admin/utils';

const STATUS_BADGE: Record<string, any> = {
  Scheduled: { variant: 'blue', icon: 'bi-clock' },
  Completed: { variant: 'green', icon: 'bi-check2-circle' },
  Cancelled: { variant: 'red', icon: 'bi-x-circle' },
  'In Progress': { variant: 'orange', icon: 'bi-arrow-repeat' },
};

const PAYMENT_BADGE: Record<string, any> = {
  Paid: { variant: 'green', icon: 'bi-check-circle-fill' },
  Pending: { variant: 'orange', icon: 'bi-clock' },
  refunded: { variant: 'red', icon: 'bi-arrow-counterclockwise' },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await getAppointments({
        page: String(page), limit: String(LIMIT),
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(paymentFilter ? { paymentStatus: paymentFilter } : {}),
      });
      setAppointments(data); setTotal(meta.total);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, paymentFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter, paymentFilter]);

  return (
    <>
      <AdminHeader title="Appointments" subtitle="All scheduled and completed appointments" />
      <div className="pt-16 p-6">
        <SectionCard>
          <CardHeader>
            <h3 className="text-[14px] font-bold text-slate-800 mr-auto">All Appointments</h3>
            <span className="text-[12px] font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">{total} total</span>
            <SearchBar value={search} onChange={setSearch} placeholder="Search patient or doctor…" />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
              { value: '', label: 'All Status' },
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Cancelled', label: 'Cancelled' },
              { value: 'In Progress', label: 'In Progress' },
            ]} />
            <FilterSelect value={paymentFilter} onChange={setPaymentFilter} options={[
              { value: '', label: 'All Payments' },
              { value: 'Paid', label: 'Paid' },
              { value: 'Pending', label: 'Pending' },
              { value: 'refunded', label: 'Refunded' },
            ]} />
          </CardHeader>

          <Table
            headers={['Patient', 'Doctor', 'Date & Time', 'Type', 'Status', 'Payment', 'Amount']}
            loading={loading} colSpan={7}
          >
            {appointments.length === 0 && !loading ? (
              <tr><td colSpan={7}><EmptyState icon="bi-calendar2-x" title="No appointments found" desc="Try adjusting filters" /></td></tr>
            ) : appointments.map((a, i) => (
              <TableRow key={a._id} delay={i * 0.025}>
                <Td><UserCell name={a.patientId?.name} email={a.patientId?.email} image={a.patientId?.profileImage} /></Td>
                <Td><UserCell name={a.doctorId?.name} sub={a.doctorId?.specialization} image={a.doctorId?.profileImage} /></Td>
                <Td>
                  <p className="text-[13px] font-semibold text-slate-700">{fmtDate(a.date)}</p>
                  <p className="text-[11.5px] text-slate-400">{fmtTime(a.slotStartIso)} – {fmtTime(a.slotEndIso)}</p>
                </Td>
                <Td>
                  <Badge variant={a.consultationType === 'Video Consultation' ? 'blue' : 'purple'}
                    icon={a.consultationType === 'Video Consultation' ? 'bi-camera-video-fill' : 'bi-telephone-fill'}>
                    {a.consultationType === 'Video Consultation' ? 'Video' : 'Voice'}
                  </Badge>
                </Td>
                <Td>
                  <Badge {...(STATUS_BADGE[a.status] || { variant: 'gray' })}>{a.status}</Badge>
                </Td>
                <Td>
                  <Badge {...(PAYMENT_BADGE[a.paymentStatus] || { variant: 'gray' })}>{a.paymentStatus}</Badge>
                </Td>
                <Td className="font-bold text-slate-800">{fmtMoney(a.totalAmount)}</Td>
              </TableRow>
            ))}
          </Table>
          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
        </SectionCard>
      </div>
    </>
  );
}
