'use client';
import { useCallback, useEffect, useState } from 'react';
import { getDoctors, verifyDoctor, toggleDoctorActive, getDoctorDetail } from '@/lib/admin/api';
import type { Doctor } from '@/lib/admin/types';
import {
  Badge, Table, TableRow, Td, Avatar, ActionButton,
  Pagination, SectionCard, CardHeader, SearchBar,
  FilterSelect, ConfirmModal, EmptyState, toast, StatCard,
} from '../common/UI';
import AdminHeader from '../common/Header';
import { fmtMoney } from '@/lib/admin/utils';
import { motion, AnimatePresence } from 'framer-motion';

type ConfirmType = 'verify' | 'active';

interface VerifDoc { _id: string; type: string; url: string; uploadedAt: string; }
interface DoctorWithDocs extends Doctor {
  verificationDocuments?: VerifDoc[];
  qualification?: string;
  experience?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Document Viewer Modal
// ────────────────────────────────────────────────────────────────────────────
function DocViewerModal({ doctor, onClose, onVerify, verifying }: {
  doctor: DoctorWithDocs;
  onClose: () => void;
  onVerify: () => void;
  verifying: boolean;
}) {
  const [activeDoc, setActiveDoc] = useState<VerifDoc | null>(doctor.verificationDocuments?.[0] ?? null);
  const docs = doctor.verificationDocuments ?? [];
  const isImage = (u: string) => u.startsWith('data:image') || /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u);
  const isPdf   = (u: string) => u.startsWith('data:application/pdf') || /\.pdf(\?|$)/i.test(u);

  return (
    <AnimatePresence>
      <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div key="panel" initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {doctor.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-bold text-slate-800">{doctor.name}</h2>
                  {doctor.isVerified && <i className="bi bi-patch-check-fill text-emerald-500 text-sm" />}
                </div>
                <p className="text-[12px] text-slate-400">{doctor.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onVerify} disabled={verifying}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 ${
                  doctor.isVerified
                    ? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200'
                }`}>
                {verifying
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <i className={`bi ${doctor.isVerified ? 'bi-patch-minus' : 'bi-patch-check-fill'} text-base`} />}
                {doctor.isVerified ? 'Revoke Verification' : 'Mark as Verified'}
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <i className="bi bi-x-lg text-slate-500 text-sm" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Left sidebar */}
            <div className="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col overflow-hidden">
              {/* Doctor meta */}
              <div className="px-5 py-4 border-b border-slate-50 space-y-2 flex-shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-lg ${
                    doctor.isVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                    <i className={`bi ${doctor.isVerified ? 'bi-patch-check-fill' : 'bi-hourglass-split'} text-xs`} />
                    {doctor.isVerified ? 'Verified' : 'Pending Review'}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-lg ${
                    doctor.isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-100 text-slate-500'}`}>
                    <i className={`bi ${doctor.isActive ? 'bi-circle-fill' : 'bi-circle'} text-[8px]`} />
                    {doctor.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {doctor.specialization && <p className="text-[12px] text-slate-600 font-semibold">{doctor.specialization}{doctor.experience ? ` · ${doctor.experience} yrs` : ''}</p>}
                {doctor.qualification && <p className="text-[12px] text-slate-500">{doctor.qualification}</p>}
                {doctor.hospitalInfo?.name && (
                  <p className="text-[12px] text-slate-500">
                    <i className="bi bi-hospital mr-1" />{doctor.hospitalInfo.name}{doctor.hospitalInfo.city ? `, ${doctor.hospitalInfo.city}` : ''}
                  </p>
                )}
              </div>

              {/* Doc list */}
              <div className="flex-1 overflow-y-auto">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400 px-5 pt-4 pb-2">
                  Documents ({docs.length})
                </p>
                {docs.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <i className="bi bi-file-earmark-x text-4xl text-slate-200" />
                    <p className="text-[12px] text-slate-400 mt-2 font-medium">No documents uploaded</p>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">Doctor has not submitted any verification documents yet.</p>
                  </div>
                ) : (
                  <div className="px-3 pb-4 space-y-1.5">
                    {docs.map(doc => (
                      <button key={doc._id} onClick={() => setActiveDoc(doc)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 ${
                          activeDoc?._id === doc._id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activeDoc?._id === doc._id ? 'bg-blue-500' : 'bg-slate-100'}`}>
                          <i className={`bi ${isPdf(doc.url) ? 'bi-file-earmark-pdf' : 'bi-file-earmark-image'} text-sm ${activeDoc?._id === doc._id ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[12.5px] font-semibold truncate ${activeDoc?._id === doc._id ? 'text-blue-700' : 'text-slate-700'}`}>{doc.type}</p>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">
                            {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        {activeDoc?._id === doc._id && <i className="bi bi-chevron-right text-blue-400 text-xs flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: preview */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
              {activeDoc ? (
                <>
                  <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between flex-shrink-0">
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800">{activeDoc.type}</p>
                      <p className="text-[11px] text-slate-400">
                        Uploaded {new Date(activeDoc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <a href={activeDoc.url} download={`${activeDoc.type.replace(/\s+/g, '_')}.${isPdf(activeDoc.url) ? 'pdf' : 'jpg'}`}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                      <i className="bi bi-download text-sm" />Download
                    </a>
                  </div>
                  <div className="flex-1 overflow-auto flex items-start justify-center p-6">
                    {isImage(activeDoc.url) ? (
                      <img src={activeDoc.url} alt={activeDoc.type}
                        className="max-w-full rounded-2xl shadow-lg border border-slate-200 object-contain" style={{ maxHeight: '65vh' }} />
                    ) : isPdf(activeDoc.url) ? (
                      <iframe src={activeDoc.url} className="w-full rounded-2xl shadow-lg border border-slate-200" style={{ height: '65vh' }} title={activeDoc.type} />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-slate-400 py-16">
                        <i className="bi bi-file-earmark-question text-5xl" />
                        <p className="text-[13px] font-medium">Cannot preview this file type</p>
                        <a href={activeDoc.url} download className="text-[12px] text-blue-600 hover:underline">Download to view</a>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-300">
                  <i className="bi bi-file-earmark-text text-5xl" />
                  <p className="text-[13px] font-medium text-slate-400">
                    {docs.length > 0 ? 'Select a document to preview' : 'No documents to preview'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────
export default function DoctorsPage() {
  const [doctors, setDoctors]           = useState<DoctorWithDocs[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [confirm, setConfirm]           = useState<{ doctor: DoctorWithDocs; type: ConfirmType } | null>(null);
  const [viewDoctor, setViewDoctor]     = useState<DoctorWithDocs | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await getDoctors({
        page: String(page), limit: String(LIMIT),
        ...(search ? { search } : {}),
        ...(verifiedFilter !== '' ? { isVerified: verifiedFilter } : {}),
        ...(activeFilter  !== '' ? { isActive: activeFilter }   : {}),
      });
      setDoctors(data as DoctorWithDocs[]); setTotal(meta.total);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [page, search, verifiedFilter, activeFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, verifiedFilter, activeFilter]);

  const openDocViewer = async (d: DoctorWithDocs) => {
    setDetailLoading(true);
    try {
      const { data } = await getDoctorDetail(d._id);
      setViewDoctor({ ...(data as any).doctor, isVerified: d.isVerified, isActive: d.isActive });
    } catch { setViewDoctor(d); }
    finally { setDetailLoading(false); }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const { doctor, type } = confirm;
    setActionLoading(doctor._id); setConfirm(null);
    try {
      if (type === 'verify') {
        await verifyDoctor(doctor._id);
        toast(`Doctor "${doctor.name}" ${doctor.isVerified ? 'unverified' : 'verified'}`, 'success');
      } else {
        await toggleDoctorActive(doctor._id);
        toast(`Doctor "${doctor.name}" ${doctor.isActive ? 'deactivated' : 'activated'}`, 'success');
      }
      await load();
    } catch (e: any) { toast(e.message || 'Action failed', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleVerifyFromViewer = async () => {
    if (!viewDoctor) return;
    setActionLoading(viewDoctor._id);
    try {
      await verifyDoctor(viewDoctor._id);
      const newVerified = !viewDoctor.isVerified;
      toast(`Doctor ${newVerified ? 'verified' : 'unverified'} successfully`, 'success');
      setViewDoctor(prev => prev ? { ...prev, isVerified: newVerified, isActive: newVerified ? prev.isActive : false } : null);
      await load();
    } catch (e: any) { toast(e.message || 'Action failed', 'error'); }
    finally { setActionLoading(null); }
  };

  const pendingCount  = doctors.filter(d => !d.isVerified).length;
  const verifiedCount = doctors.filter(d => d.isVerified).length;
  const activeCount   = doctors.filter(d => d.isActive).length;

  const confirmInfo = () => {
    if (!confirm) return { title: '', message: '', danger: false };
    const { doctor: d, type } = confirm;
    if (type === 'verify') return {
      title: d.isVerified ? 'Revoke Verification' : 'Verify Doctor',
      message: d.isVerified
        ? `Revoking verification for "${d.name}" will also deactivate their profile. Patients will no longer see them.`
        : `Mark "${d.name}" as verified? They will become visible and bookable by patients.`,
      danger: d.isVerified,
    };
    return {
      title: d.isActive ? 'Deactivate Doctor' : 'Activate Doctor',
      message: d.isActive
        ? `Deactivate "${d.name}"? They won't receive new appointments until re-activated.`
        : `Activate "${d.name}"? They will become visible to patients.`,
      danger: d.isActive,
    };
  };
  const ci = confirmInfo();

  return (
    <>
      <AdminHeader title="Doctor Management" subtitle="Review credentials, verify and manage all registered doctors" />
      <div className="pt-16 p-6 space-y-5">

        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Doctors"  value={total}         icon="bi-hospital-fill"    iconBg="bg-blue-50"    iconColor="text-blue-600"    delay={0}    sub="" />
          <StatCard label="Verified"       value={verifiedCount} icon="bi-patch-check-fill" iconBg="bg-emerald-50" iconColor="text-emerald-600" delay={0.06} sub="" />
          <StatCard label="Pending Review" value={pendingCount}  icon="bi-hourglass-split"  iconBg="bg-amber-50"   iconColor="text-amber-600"   delay={0.12}
            trend={pendingCount > 0 ? { value: `${pendingCount} awaiting`, up: false } : undefined} sub="" />
          <StatCard label="Active"         value={activeCount}   icon="bi-activity"         iconBg="bg-violet-50"  iconColor="text-violet-600"  delay={0.18} sub="" />
        </div>

        {pendingCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-[13px] font-medium text-amber-800">
            <i className="bi bi-exclamation-triangle-fill text-amber-500 text-base" />
            <span><strong>{pendingCount}</strong> doctor{pendingCount > 1 ? 's' : ''} pending verification. Click <strong>View Docs</strong> to review credentials before verifying.</span>
          </motion.div>
        )}

        <SectionCard>
          <CardHeader>
            <h3 className="text-[14px] font-bold text-slate-800 mr-auto">All Doctors</h3>
            <SearchBar value={search} onChange={setSearch} placeholder="Search name, email, city…" />
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

          <Table headers={['Doctor', 'Specialization', 'Hospital / City', 'Fees', 'Docs', 'Verified', 'Active', 'Actions']} loading={loading} colSpan={8}>
            {doctors.length === 0 && !loading ? (
              <tr><td colSpan={8}><EmptyState icon="bi-hospital" title="No doctors found" desc="Try adjusting your filters" /></td></tr>
            ) : doctors.map((d, i) => {
              const isActioning = actionLoading === d._id;
              const docCount = (d as any).verificationDocuments?.length ?? 0;
              return (
                <TableRow key={d._id} delay={i * 0.03}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={d.name} src={d.profileImage} size={36} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13.5px] font-semibold text-slate-800 leading-none">{d.name || '—'}</p>
                          {d.isVerified && <i className="bi bi-patch-check-fill text-emerald-500 text-sm" />}
                        </div>
                        <p className="text-[11.5px] text-slate-400 mt-0.5">{d.email}</p>
                        {d.ucId && <p className="text-[10.5px] text-slate-300 font-mono mt-0.5">{d.ucId}</p>}
                      </div>
                    </div>
                  </Td>
                  <Td>{d.specialization ? <Badge variant="blue">{d.specialization}</Badge> : <span className="text-slate-300 text-[12px]">—</span>}</Td>
                  <Td>
                    {d.hospitalInfo?.name ? (
                      <div>
                        <p className="text-[13px] font-semibold text-slate-700 truncate max-w-[140px]">{d.hospitalInfo.name}</p>
                        <p className="text-[11.5px] text-slate-400">{d.hospitalInfo.city || ''}</p>
                      </div>
                    ) : <span className="text-slate-300 text-[12px]">—</span>}
                  </Td>
                  <Td className="font-bold text-slate-800 text-[13px]">{d.fees ? fmtMoney(d.fees) : '—'}</Td>
                  <Td>
                    <button onClick={() => openDocViewer(d)} disabled={detailLoading}
                      className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all duration-150 ${
                        docCount > 0
                          ? 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                      }`}>
                      {detailLoading ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <i className="bi bi-file-earmark-text text-sm" />}
                      {docCount > 0 ? `${docCount} doc${docCount > 1 ? 's' : ''}` : 'No docs'}
                    </button>
                  </Td>
                  <Td><Badge variant={d.isVerified ? 'green' : 'orange'} icon={d.isVerified ? 'bi-patch-check-fill' : 'bi-hourglass-split'}>{d.isVerified ? 'Verified' : 'Pending'}</Badge></Td>
                  <Td><Badge variant={d.isActive ? 'green' : 'gray'} icon={d.isActive ? 'bi-circle-fill' : 'bi-circle'}>{d.isActive ? 'Active' : 'Inactive'}</Badge></Td>
                  <Td>
                    {isActioning ? <span className="text-[11.5px] text-slate-400">Updating…</span> : (
                      <div className="flex items-center gap-1.5">
                        <ActionButton icon={d.isVerified ? 'bi-patch-minus' : 'bi-patch-check'} label={d.isVerified ? 'Unverify' : 'Verify'} variant={d.isVerified ? 'danger' : 'success'} onClick={() => setConfirm({ doctor: d, type: 'verify' })} />
                        <ActionButton icon={d.isActive ? 'bi-slash-circle' : 'bi-play-circle'} label={d.isActive ? 'Deactivate' : 'Activate'} variant={d.isActive ? 'danger' : d.isVerified ? 'success' : 'default'}
                          onClick={() => { if (!d.isVerified && !d.isActive) { toast('Doctor must be verified before being activated', 'error'); } else { setConfirm({ doctor: d, type: 'active' }); } }} />
                      </div>
                    )}
                  </Td>
                </TableRow>
              );
            })}
          </Table>
          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
        </SectionCard>
      </div>

      <ConfirmModal open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleConfirm} title={ci.title} message={ci.message} danger={ci.danger} />
      {viewDoctor && <DocViewerModal doctor={viewDoctor} onClose={() => setViewDoctor(null)} onVerify={handleVerifyFromViewer} verifying={actionLoading === viewDoctor._id} />}
    </>
  );
}