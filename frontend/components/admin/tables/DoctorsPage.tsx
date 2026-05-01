'use client';
import { useCallback, useEffect, useState } from 'react';
import { getDoctors, verifyDoctor, toggleDoctorActive } from '@/lib/admin/api';
import type { Doctor } from '@/lib/admin/types';
import {
  Badge, Table, TableRow, Td, Avatar, ActionButton,
  Pagination, SectionCard, CardHeader, SearchBar,
  FilterSelect, ConfirmModal, EmptyState, toast, StatCard,
} from '../common/UI';
import AdminHeader from '../common/Header';
import { fmtMoney, fmtDate } from '@/lib/admin/utils';
import { motion } from 'framer-motion';

type ConfirmType = 'verify' | 'active';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [confirm, setConfirm] = useState<{ doctor: Doctor; type: ConfirmType } | null>(null);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await getDoctors({
        page: String(page), limit: String(LIMIT),
        ...(search ? { search } : {}),
        ...(verifiedFilter !== '' ? { isVerified: verifiedFilter } : {}),
        ...(activeFilter !== '' ? { isActive: activeFilter } : {}),
      });
      setDoctors(data); setTotal(meta.total);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [page, search, verifiedFilter, activeFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, verifiedFilter, activeFilter]);

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.type === 'verify') {
        await verifyDoctor(confirm.doctor._id);
        toast(`Doctor ${confirm.doctor.isVerified ? 'unverified' : 'verified'}`, 'success');
      } else {
        await toggleDoctorActive(confirm.doctor._id);
        toast(`Doctor ${confirm.doctor.isActive ? 'deactivated' : 'activated'}`, 'success');
      }
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const pendingCount  = doctors.filter((d) => !d.isVerified).length;
  const verifiedCount = doctors.filter((d) => d.isVerified).length;
  const activeCount   = doctors.filter((d) => d.isActive).length;

  const confirmInfo = () => {
    if (!confirm) return { title: '', message: '', danger: false };
    const { doctor: d, type } = confirm;
    if (type === 'verify') return {
      title: d.isVerified ? 'Unverify Doctor' : 'Verify Doctor',
      message: d.isVerified
        ? `Unverifying "${d.name}" will also deactivate their profile. Patients will no longer see them. Continue?`
        : `Mark "${d.name}" as a verified, certified doctor on the UniCare platform?`,
      danger: d.isVerified,
    };
    return {
      title: d.isActive ? 'Deactivate Doctor' : 'Activate Doctor',
      message: d.isActive
        ? `Deactivate "${d.name}"? They won't appear to patients until re-activated.`
        : `Activate "${d.name}"? They will become visible to patients.`,
      danger: d.isActive,
    };
  };

  const ci = confirmInfo();

  return (
    <>
      <AdminHeader title="Doctor Management" subtitle="Verify and manage all registered doctors" />
      <div className="pt-16 p-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Doctors"    value={total}         icon="bi-hospital-fill"    iconBg="bg-blue-50"    iconColor="text-blue-600"    delay={0}    sub="" />
          <StatCard label="Verified"         value={verifiedCount} icon="bi-patch-check-fill" iconBg="bg-emerald-50" iconColor="text-emerald-600" delay={0.06} sub="" />
          <StatCard label="Pending Verify"   value={pendingCount}  icon="bi-hourglass-split"  iconBg="bg-amber-50"   iconColor="text-amber-600"   delay={0.12}
            trend={pendingCount > 0 ? { value: `${pendingCount} pending`, up: false } : undefined} sub="" />
          <StatCard label="Active"           value={activeCount}   icon="bi-activity"         iconBg="bg-violet-50"  iconColor="text-violet-600"  delay={0.18} sub="" />
        </div>

        {/* Pending verification banner */}
        {pendingCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-[13px] font-medium text-amber-800">
            <i className="bi bi-exclamation-triangle-fill text-amber-500 text-base" />
            <span><strong>{pendingCount}</strong> doctor{pendingCount > 1 ? 's' : ''} pending verification. Review and approve to activate their profiles.</span>
          </motion.div>
        )}

        <SectionCard>
          <CardHeader>
            <h3 className="text-[14px] font-bold text-slate-800 mr-auto">All Doctors</h3>
             <SearchBar value={search} onChange={setSearch} placeholder="Search name, email, UC ID, city…" />
            <FilterSelect value={verifiedFilter} onChange={setVerifiedFilter} options={[
              { value: '', label: 'All Verification' },
              { value: 'true', label: 'Verified' },
              { value: 'false', label: 'Unverified' },
            ]} />
            <FilterSelect value={activeFilter} onChange={setActiveFilter} options={[
              { value: '', label: 'All Status' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]} />
          </CardHeader>

          <Table
            headers={['UC ID', 'Doctor', 'Specialization', 'Hospital / City', 'Fees', 'Experience', 'Verified', 'Active', 'Actions']}
            loading={loading} colSpan={9}
          >
             {doctors.length === 0 && !loading ? (
               <tr><td colSpan={9}><EmptyState icon="bi-hospital" title="No doctors found" desc="Try adjusting your filters" /></td></tr>
             ) : doctors.map((d, i) => (
               <TableRow key={d._id} delay={i * 0.03}>
                 <Td className="font-mono text-[11.5px] text-slate-500">{d.ucId}</Td>
                 <Td>
                   <div className="flex items-center gap-3">
                     <Avatar name={d.name} src={d.profileImage} size={34} />
                     <div>
                       <p className="text-[13.5px] font-semibold text-slate-800 leading-none">{d.name || '—'}</p>
                       <p className="text-[11.5px] text-slate-400 mt-0.5">{d.email}</p>
                     </div>
                   </div>
                 </Td>
                <Td>
                  {d.specialization
                    ? <Badge variant="blue">{d.specialization}</Badge>
                    : <span className="text-slate-300">—</span>}
                </Td>
                <Td>
                  {d.hospitalInfo?.name ? (
                    <div>
                      <p className="text-[13px] font-semibold text-slate-700 truncate max-w-[160px]">{d.hospitalInfo.name}</p>
                      <p className="text-[11.5px] text-slate-400">{d.hospitalInfo.city || ''}</p>
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </Td>
                <Td className="font-bold text-slate-800">{d.fees ? fmtMoney(d.fees) : '—'}</Td>
                <Td className="text-slate-500">{d.experience ? `${d.experience} yrs` : '—'}</Td>
                <Td>
                  <Badge
                    variant={d.isVerified ? 'green' : 'orange'}
                    icon={d.isVerified ? 'bi-patch-check-fill' : 'bi-hourglass-split'}
                  >
                    {d.isVerified ? 'Verified' : 'Pending'}
                  </Badge>
                </Td>
                <Td>
                  <Badge
                    variant={d.isActive ? 'green' : 'gray'}
                    icon={d.isActive ? 'bi-circle-fill' : 'bi-circle'}
                  >
                    {d.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <ActionButton
                      icon={d.isVerified ? 'bi-patch-minus' : 'bi-patch-check'}
                      label={d.isVerified ? 'Unverify' : 'Verify'}
                      variant={d.isVerified ? 'danger' : 'success'}
                      onClick={() => setConfirm({ doctor: d, type: 'verify' })}
                    />
                    <ActionButton
                      icon={d.isActive ? 'bi-slash-circle' : 'bi-play-circle'}
                      label={d.isActive ? 'Deactivate' : 'Activate'}
                      variant={d.isActive ? 'danger' : d.isVerified ? 'success' : 'default'}
                      onClick={() => {
                        if (!d.isVerified && !d.isActive) {
                          toast('Doctor must be verified before being activated', 'error');
                        } else {
                          setConfirm({ doctor: d, type: 'active' });
                        }
                      }}
                    />
                  </div>
                </Td>
              </TableRow>
            ))}
          </Table>

          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
        </SectionCard>
      </div>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={ci.title}
        message={ci.message}
        danger={ci.danger}
      />
    </>
  );
}
