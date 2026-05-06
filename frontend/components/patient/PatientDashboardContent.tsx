import React, { useEffect, useState } from 'react'
import Header from '../landing/Header'
import { userAuthStore } from '@/store/authStore'
import { Appointment, useAppointmentStore } from '@/store/appointmentStore';
import Link from 'next/link';
import { Calendar, Clock, FileText, MapPin, Phone, Star, Video, ArrowRight, Plus, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getStatusColor } from '@/lib/constant';
import PrescriptionViewModal from '../doctor/PrescriptionViewModal';
import PatientReportsPage from '@/components/patient/PatientReportsPage';
import { GuestBanner } from '@/components/GuestBanner';

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Scheduled:     { bg: 'bg-sky-50 border border-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-400' },
  'In Progress': { bg: 'bg-amber-50 border border-amber-100', text: 'text-amber-700',   dot: 'bg-amber-400' },
  Completed:     { bg: 'bg-emerald-50 border border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  Cancelled:     { bg: 'bg-red-50 border border-red-100',     text: 'text-red-600',     dot: 'bg-red-400' },
};

const SEVERITY_STYLES: Record<string, string> = {
  high:    'bg-red-50 text-red-700 border border-red-100',
  medium:  'bg-amber-50 text-amber-700 border border-amber-100',
  low:     'bg-emerald-50 text-emerald-700 border border-emerald-100',
  unknown: 'bg-slate-50 text-slate-600 border border-slate-100',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// ─────────────────────────────────────────────────────────────────────────────
// HelpLink Aftercare Card — shown in Reports tab for transferred accounts
// ─────────────────────────────────────────────────────────────────────────────

interface AftercareCase {
  _id:          string;
  incidentType: string;
  severity:     string;
  summary:      string;
  helperNotes:  string;
  notes:        string;
  status:       string;
  time:         string;
  userNote:     string;
  createdAt:    string;
  location:     { coordinates?: number[] } | null;
}

function HelpLinkAftercareSummary({ patientId }: { patientId: string }) {
  const [cases,   setCases]   = useState<AftercareCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) { setLoading(false); return; }
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    fetch(`${API_BASE}/aftercare/my`, {
      headers: {
        'x-user-id':     patientId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((r) => r.json())
      .then((d) => setCases(d.cases || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <div className='flex items-center gap-3 py-8 text-slate-400'>
        <div className='w-5 h-5 border-2 border-slate-200 border-t-sky-400 rounded-full animate-spin' />
        <span className='text-sm'>Loading your recovery report…</span>
      </div>
    );
  }

  if (cases.length === 0) return null;

  return (
    <div className='mb-8'>
      {/* Section header */}
      <div className='flex items-center gap-2 mb-4'>
        <div className='w-7 h-7 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-sm'>
          🏥
        </div>
        <div>
          <p className='text-[11px] font-bold uppercase tracking-widest text-amber-600'>HelpLink Recovery</p>
          <h2 className='uc-serif text-lg font-bold text-slate-900 leading-tight'>
            Emergency Aftercare {cases.length > 1 ? `Reports (${cases.length})` : 'Report'}
          </h2>
        </div>
      </div>

      <div className='space-y-4'>
        {cases.map((c) => {
          const isOpen = expanded === c._id;
          const sev    = (c.severity || 'unknown').toLowerCase();
          const sevStyle = SEVERITY_STYLES[sev] ?? SEVERITY_STYLES.unknown;

          return (
            <div
              key={c._id}
              className='bg-white rounded-3xl border border-amber-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300'
            >
              {/* Amber accent line */}
              <div className='h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400' />

              <div className='p-5'>
                {/* Top row */}
                <div className='flex items-start justify-between gap-3 mb-3 flex-wrap'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0'>
                      🚨
                    </div>
                    <div>
                      <p className='font-bold text-slate-900 text-sm capitalize'>
                        {c.incidentType?.replace(/_/g, ' ') || 'Emergency Incident'}
                      </p>
                      <p className='text-xs text-slate-400'>
                        {new Date(c.time || c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg capitalize ${sevStyle}`}>
                      {sev} severity
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg capitalize ${
                      c.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : c.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100'
                      : 'bg-slate-50 text-slate-600 border border-slate-100'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>

                {/* Summary preview */}
                {c.summary && (
                  <p className='text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2'>
                    {c.summary}
                  </p>
                )}

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(isOpen ? null : c._id)}
                  className='flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors'
                >
                  <FileText className='w-3.5 h-3.5' />
                  {isOpen ? 'Hide details' : 'View full report'}
                  <svg
                    width='12' height='12' viewBox='0 0 12 12' fill='none'
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  >
                    <path d='M2 4l4 4 4-4' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'/>
                  </svg>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className='mt-4 pt-4 border-t border-slate-100 space-y-3'>
                    {c.notes && (
                      <div>
                        <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5'>Incident Notes</p>
                        <p className='text-xs text-slate-600 leading-relaxed'>{c.notes}</p>
                      </div>
                    )}
                    {c.helperNotes && (
                      <div>
                        <p className='text-[10px] font-bold uppercase tracking-widest text-sky-400 mb-0.5'>Responder Notes</p>
                        <p className='text-xs text-sky-700 leading-relaxed'>{c.helperNotes}</p>
                      </div>
                    )}
                    {c.userNote && (
                      <div className='bg-emerald-50 border border-emerald-100 rounded-xl p-3'>
                        <p className='text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-0.5'>Your Note</p>
                        <p className='text-xs text-slate-700 leading-relaxed'>{c.userNote}</p>
                      </div>
                    )}
                    {c.location?.coordinates && (
                      <div className='flex items-center gap-1.5 text-xs text-slate-400'>
                        <MapPin className='w-3 h-3' />
                        <span>
                          {c.location.coordinates[1]?.toFixed(5)}, {c.location.coordinates[0]?.toFixed(5)}
                        </span>
                      </div>
                    )}
                    {/* Consult Now — book a follow-up */}
                    <div className='pt-2'>
                      <Link href='/doctor-list'>
                        <button className='flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4 py-2 rounded-xl shadow-md shadow-emerald-100 transition-all duration-200'>
                          <Phone className='w-3.5 h-3.5' />
                          Consult Now — Book a Follow-up
                        </button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Content (unchanged except HelpLinkAftercareSummary injection)
// ─────────────────────────────────────────────────────────────────────────────

const PatientDashboardContent = () => {
  const { user } = userAuthStore();
  const { appointments, fetchAppointments, loading } = useAppointmentStore();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [tabCounts, setTabCounts] = useState({ upcoming: 0, past: 0 });

  useEffect(() => {
    if (user?.type === 'patient' && activeTab !== 'reports') {
      fetchAppointments('patient', activeTab);
    }
  }, [user, activeTab, fetchAppointments]);

  useEffect(() => {
    const now = new Date();
    const upcoming = appointments.filter((a) => {
      const d = new Date(a.slotStartIso);
      return (d >= now || a.status === 'In Progress') && (a.status === 'Scheduled' || a.status === 'In Progress');
    });
    const past = appointments.filter((a) => {
      const d = new Date(a.slotStartIso);
      return d < now || a.status === 'Completed' || a.status === 'Cancelled';
    });
    setTabCounts({ upcoming: upcoming.length, past: past.length });
  }, [appointments]);

  const formatDate = (s: string) => new Date(s).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
  const formatTime = (s: string) => new Date(s).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  const isToday = (s: string) => new Date(s).toDateString() === new Date().toDateString();

  const canJoinCall = (a: any) => {
    const t = new Date(a.slotStartIso);
    const now = new Date();
    const diff = (t.getTime() - now.getTime()) / 60000;
    return isToday(a.slotStartIso) && diff <= 15 && diff >= -120 &&
      (a.status === 'Scheduled' || a.status === 'In Progress');
  };

  if (!user) return null;

  // Determine if this is a HelpLink-transferred account
  const accountSource   = (user as any).accountSource || 'self';
  const isHelpLinkUser  = accountSource === 'transferred_from_helplink' || accountSource === 'guest_helplink_transfer';
  const patientId       = (user as any)._id || (user as any).id || '';

  const TABS = [
    { id: 'upcoming', label: 'Upcoming',                  icon: Clock,    count: tabCounts.upcoming },
    { id: 'past',     label: 'Past',                      icon: Calendar, count: tabCounts.past },
    { id: 'reports',  label: 'Reports & Prescriptions',   icon: FileText, count: null },
  ];

  /* ─── Appointment Card ─── */
  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const status = appointment.status as string;
    const sStyle = STATUS_STYLES[status] || STATUS_STYLES.Scheduled;

    return (
      <div className='bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-sky-100 transition-all duration-300 hover:-translate-y-0.5'>
        <div className={`h-1 w-full ${sStyle.dot === 'bg-sky-400' ? 'bg-gradient-to-r from-sky-400 to-blue-500' : sStyle.dot === 'bg-emerald-400' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : sStyle.dot === 'bg-amber-400' ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-red-400 to-rose-500'}`} />
        <div className='p-5 sm:p-6'>
          <div className='flex items-start gap-4'>
            <div className='relative flex-shrink-0'>
              <Avatar className='w-14 h-14 ring-2 ring-slate-100'>
                <AvatarImage src={appointment.doctorId?.profileImage} alt={appointment.doctorId?.name} className='object-cover' />
                <AvatarFallback className='bg-gradient-to-br from-sky-400 to-sky-600 text-white font-bold'>
                  {appointment.doctorId?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isToday(appointment.slotStartIso) && (
                <span className='absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse' />
              )}
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-start justify-between gap-2 mb-1.5 flex-wrap'>
                <div>
                  <h3 className='font-bold text-slate-900 text-base leading-tight'>{appointment.doctorId?.name}</h3>
                  <p className='text-sky-600 text-xs font-semibold'>{appointment.doctorId?.specialization}</p>
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg ${sStyle.bg} ${sStyle.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sStyle.dot} ${status === 'In Progress' ? 'animate-pulse' : ''}`} />
                    {appointment.status}
                  </span>
                  {isToday(appointment.slotStartIso) && (
                    <span className='text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg'>TODAY</span>
                  )}
                </div>
              </div>
              <div className='flex items-center gap-1.5 text-xs text-slate-400 mb-3'>
                <MapPin className='w-3 h-3 text-slate-300' />
                <span>{appointment.doctorId?.hospitalInfo?.name}</span>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4'>
                <div className='flex items-center gap-2 bg-[#F8F7F4] px-3 py-2 rounded-xl'>
                  <Calendar className='w-3.5 h-3.5 text-sky-400 flex-shrink-0' />
                  <span className='text-xs font-semibold text-slate-700 truncate'>{formatDate(appointment.slotStartIso)}</span>
                </div>
                <div className='flex items-center gap-2 bg-[#F8F7F4] px-3 py-2 rounded-xl'>
                  <Clock className='w-3.5 h-3.5 text-sky-400 flex-shrink-0' />
                  <span className='text-xs font-semibold text-slate-700'>{formatTime(appointment.slotStartIso)}</span>
                </div>
                <div className='flex items-center gap-2 bg-[#F8F7F4] px-3 py-2 rounded-xl'>
                  {appointment.consultationType === 'Video Consultation'
                    ? <Video className='w-3.5 h-3.5 text-sky-400 flex-shrink-0' />
                    : <Phone className='w-3.5 h-3.5 text-sky-400 flex-shrink-0' />
                  }
                  <span className='text-xs font-semibold text-slate-700 truncate'>{appointment.consultationType}</span>
                </div>
              </div>
              <div className='flex items-center justify-between flex-wrap gap-2 mb-4'>
                <span className='text-sm font-bold text-emerald-600'>₹{appointment.doctorId?.fees}</span>
                {appointment.symptoms && (
                  <p className='text-xs text-slate-400 line-clamp-1 max-w-[200px] sm:max-w-none'>{appointment.symptoms}</p>
                )}
              </div>
              <div className='flex items-center justify-between flex-wrap gap-2'>
                <div className='flex gap-2 flex-wrap'>
                  {canJoinCall(appointment) && (
                    <Link href={`/call/${appointment._id}`}>
                      <button className='flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3.5 py-2 rounded-xl shadow-md shadow-emerald-200 transition-all duration-200'>
                        <Video className='w-3.5 h-3.5' />
                        Join Call
                      </button>
                    </Link>
                  )}
                  {appointment.status === 'Completed' && appointment.prescription && (
                    <PrescriptionViewModal
                      appointment={appointment}
                      userType='patient'
                      trigger={
                        <button className='flex items-center gap-1.5 text-xs font-bold text-sky-700 border border-sky-200 bg-sky-50 hover:bg-sky-100 px-3.5 py-2 rounded-xl transition-colors duration-200'>
                          <FileText className='w-3.5 h-3.5' />
                          Prescription
                        </button>
                      }
                    />
                  )}
                </div>
                {appointment.status === 'Completed' && (
                  <div className='flex gap-0.5'>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className='w-3.5 h-3.5 fill-amber-400 text-amber-400' />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ─── Empty State ─── */
  const EmptyState = ({ tab }: { tab: string }) => {
    const states: Record<string, any> = {
      upcoming: { icon: '📅', title: 'No Upcoming Appointments', desc: "You don't have any scheduled consultations.", showBook: true },
      past:     { icon: '📋', title: 'No Past Appointments',     desc: 'Your completed consultations will appear here.', showBook: false },
    };
    const st = states[tab];
    return (
      <div className='flex flex-col items-center justify-center py-20 text-center'>
        <div className='w-20 h-20 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center text-4xl mb-6'>{st.icon}</div>
        <h3 className='uc-serif text-xl font-bold text-slate-800 mb-2'>{st.title}</h3>
        <p className='text-slate-500 text-sm max-w-xs mb-6'>{st.desc}</p>
        {st.showBook && (
          <Link href='/doctor-list'>
            <button className='flex items-center gap-2 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 px-5 py-2.5 rounded-xl shadow-md shadow-sky-200 transition-all duration-200'>
              <Plus className='w-4 h-4' />
              Book an Appointment
            </button>
          </Link>
        )}
      </div>
    );
  };

  /* ─── Skeleton ─── */
  const SkeletonCard = () => (
    <div className='bg-white rounded-3xl border border-slate-100 p-5 sm:p-6'>
      <div className='h-1 w-full rounded-full bg-slate-100 mb-5' />
      <div className='flex gap-4'>
        <div className='w-14 h-14 rounded-full bg-slate-100 animate-pulse flex-shrink-0' />
        <div className='flex-1 space-y-2.5'>
          <div className='h-4 bg-slate-100 rounded-lg w-2/5 animate-pulse' />
          <div className='h-3 bg-slate-100 rounded-lg w-1/3 animate-pulse' />
          <div className='grid grid-cols-3 gap-2 mt-3'>
            {[...Array(3)].map((_, i) => <div key={i} className='h-8 bg-slate-100 rounded-xl animate-pulse' />)}
          </div>
          <div className='h-9 bg-slate-100 rounded-xl w-28 animate-pulse mt-2' />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }
        @keyframes page-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .page-animate { animation: page-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes tab-content {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tab-content { animation: tab-content 0.35s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <Header showDashboardNav={true} />

      <div className='uc-font min-h-screen bg-[#F8F7F4] pt-16'>
        <div className='max-w-5xl mx-auto px-4 sm:px-6 py-8 page-animate'>

          {/* ─── Guest / Transferred Account Banner ─── */}
          <GuestBanner accountSource={accountSource} />

          {/* ─── Page Header ─── */}
          <div className='flex items-center justify-between mb-8 gap-4 flex-wrap'>
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-500 mb-1'>
                {activeTab === 'reports' ? 'Health Records' : 'My Appointments'}
              </p>
              <h1 className='uc-serif text-3xl font-bold text-slate-900 leading-tight'>
                {activeTab === 'reports'
                  ? <>Reports & <em className='not-italic text-sky-500'>Prescriptions</em></>
                  : <>Your <em className='not-italic text-sky-500'>Consultations</em></>
                }
              </h1>
            </div>
            {activeTab !== 'reports' && (
              <Link href='/doctor-list'>
                <button className='flex items-center gap-2 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 px-4 py-2.5 rounded-xl shadow-md shadow-sky-200 transition-all duration-200 hover:-translate-y-0.5'>
                  <Plus className='w-4 h-4' />
                  <span className='hidden sm:block'>New Appointment</span>
                  <span className='sm:hidden'>Book</span>
                </button>
              </Link>
            )}
          </div>

          {/* ─── Tabs ─── */}
          <div className='flex gap-1.5 mb-8 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm w-fit'>
            {TABS.map(({ id, label, icon: Icon, count }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className='w-3.5 h-3.5' />
                  {label}
                  {count !== null && (
                    <span className={`text-[11px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ─── Tab Content ─── */}
          <div key={activeTab} className='tab-content'>

            {activeTab === 'reports' ? (
              <>
                {/* HelpLink aftercare report — only for transferred accounts */}
                {isHelpLinkUser && patientId && (
                  <HelpLinkAftercareSummary patientId={patientId} />
                )}
                <PatientReportsPage />
              </>
            ) : loading ? (
              <div className='space-y-4'>
                {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : appointments.length > 0 ? (
              <div className='space-y-4'>
                {appointments.map((appt) => (
                  <AppointmentCard key={appt._id} appointment={appt} />
                ))}
              </div>
            ) : (
              <EmptyState tab={activeTab} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PatientDashboardContent;