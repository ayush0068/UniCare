'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getUsers, toggleUserActive } from '@/lib/admin/api';
import type { Patient } from '@/lib/admin/types';
import {
  Badge, Table, TableRow, Td, ActionButton,
  Pagination, SectionCard, CardHeader, SearchBar,
  FilterSelect, ConfirmModal, EmptyState, toast,
  Avatar,
} from '../common/UI';
import AdminHeader from '../common/Header';
import { fmtDate, fmtNumber } from '@/lib/admin/utils';

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-semibold ${color}`}>
      <span>{fmtNumber(value)}</span>
      <span className="font-normal opacity-70">{label}</span>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirm, setConfirm] = useState<{ user: Patient } | null>(null);

  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await getUsers({
        page: String(page), limit: String(LIMIT),
        ...(search ? { search } : {}),
        ...(statusFilter !== '' ? { isActive: statusFilter } : {}),
      });
      setUsers(data); setTotal(meta.total);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleToggle = async () => {
    if (!confirm) return;
    try {
      await toggleUserActive(confirm.user._id);
      toast(`Patient ${confirm.user.isActive ? 'deactivated' : 'activated'}`, 'success');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const activeCount  = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  return (
    <>
      <AdminHeader
        title="Patient Management"
        subtitle="View and manage all registered patients"
      />
      <div className="pt-16 p-6 space-y-5">
        {/* Quick stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatPill label="Total" value={total} color="bg-blue-50 text-blue-700 border-blue-200" />
          <StatPill label="Active" value={activeCount} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
          <StatPill label="Inactive" value={inactiveCount} color="bg-slate-100 text-slate-600 border-slate-200" />
        </div>

        <SectionCard>
          <CardHeader>
            <h3 className="text-[14px] font-bold text-slate-800 mr-auto">All Patients</h3>
             <SearchBar value={search} onChange={(v) => setSearch(v)} placeholder="Search name, email, phone, UC ID…" />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
              { value: '', label: 'All Status' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]} />
          </CardHeader>

          <Table
            headers={['UC ID', 'Patient', 'Phone', 'Blood Group', 'Age / Gender', 'Joined', 'Status', 'Actions']}
            loading={loading} colSpan={8}
          >
             {users.length === 0 && !loading ? (
               <tr><td colSpan={8}><EmptyState icon="bi-people" title="No patients found" desc="Try adjusting your filters" /></td></tr>
             ) : users.map((u, i) => (
               <TableRow key={u._id} delay={i * 0.03}>
                 <Td className="font-mono text-[11.5px] text-slate-500">{u.ucId}</Td>
                 <Td>
                   <div className="flex items-center gap-3">
                     <Avatar name={u.name} src={u.profileImage} size={34} />
                     <div>
                       <p className="text-[13.5px] font-semibold text-slate-800 leading-none">{u.name || '—'}</p>
                       <p className="text-[11.5px] text-slate-400 mt-0.5">{u.email}</p>
                     </div>
                   </div>
                 </Td>
                <Td className="text-slate-500">{u.phone || '—'}</Td>
                <Td>
                  {u.bloodGroup
                    ? <Badge variant="red" icon="bi-droplet-fill">{u.bloodGroup}</Badge>
                    : <span className="text-slate-300">—</span>}
                </Td>
                <Td className="text-slate-500">
                  {u.age ? `${u.age} yrs` : '—'}{u.gender ? `, ${u.gender}` : ''}
                </Td>
                <Td className="text-slate-400 text-[12.5px]">{fmtDate(u.createdAt)}</Td>
                <Td>
                  <Badge variant={u.isActive ? 'green' : 'gray'} icon={u.isActive ? 'bi-check-circle-fill' : 'bi-dash-circle'}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <ActionButton
                      icon={u.isActive ? 'bi-slash-circle' : 'bi-check-circle'}
                      label={u.isActive ? 'Deactivate' : 'Activate'}
                      variant={u.isActive ? 'danger' : 'success'}
                      onClick={() => setConfirm({ user: u })}
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
        onConfirm={handleToggle}
        title={confirm?.user.isActive ? 'Deactivate Patient' : 'Activate Patient'}
        message={`${confirm?.user.isActive ? 'Deactivate' : 'Activate'} patient "${confirm?.user.name}"? ${confirm?.user.isActive ? 'They will no longer be able to log in.' : 'They will regain full access.'}`}
        danger={confirm?.user.isActive}
      />
    </>
  );
}
