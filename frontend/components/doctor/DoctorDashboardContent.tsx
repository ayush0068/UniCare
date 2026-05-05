'use client'

import React, { useEffect, useState } from 'react'
import Header from '../landing/Header'
import { useSearchParams } from 'next/navigation'
import { userAuthStore } from '@/store/authStore'
import { useDoctorStore } from '@/store/doctorStore'
import { Appointment, useAppointmentStore } from '@/store/appointmentStore'
import {
  Activity, AlertCircle, Brain, Calendar, CheckCircle2,
  ChevronRight, Clock, DollarSign, MapPin, Phone, Plus,
  Star, TrendingUp, Users, Video, X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import PrescriptionModal from './PrescriptionModal'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import Link from 'next/link'
import { getStatusColor } from '@/lib/constant'
import { httpService } from '@/service/httpService'
import AIReportViewModal from '../AI/AIReportViewModal'

/* ─── Custom Alert Modal ─── */
type AlertType = 'info' | 'error' | 'success'
interface AlertState { open: boolean; type: AlertType; title: string; message: string }

const CustomAlert = ({ alert, onClose }: { alert: AlertState; onClose: () => void }) => {
  const cfg = {
    info:    { icon: <AlertCircle className='w-6 h-6 text-sky-500' />,     bg: 'bg-sky-50',     border: 'border-sky-200',     title: 'text-sky-800'    },
    error:   { icon: <AlertCircle className='w-6 h-6 text-red-500' />,     bg: 'bg-red-50',     border: 'border-red-200',     title: 'text-red-800'    },
    success: { icon: <CheckCircle2 className='w-6 h-6 text-emerald-500' />, bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'text-emerald-800' },
  }[alert.type]

  return (
    <AnimatePresence>
      {alert.open && (
        <>
          <motion.div key='bd' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]' onClick={onClose} />
          <motion.div key='modal'
            initial={{ opacity: 0, scale: 0.88, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={`fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-3xl shadow-2xl border p-7 ${cfg.bg} ${cfg.border}`}
          >
            <button onClick={onClose} className='absolute top-4 right-4 w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center hover:bg-white transition-colors'>
              <X className='w-4 h-4 text-slate-500' />
            </button>
            <div className='flex flex-col items-center text-center gap-3'>
              <div className='w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center'>{cfg.icon}</div>
              <h3 className={`text-lg font-bold ${cfg.title}`}>{alert.title}</h3>
              <p className='text-sm text-slate-600 leading-relaxed'>{alert.message}</p>
              <button onClick={onClose} className='mt-1 w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold transition-colors duration-200'>
                Got it
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ═══════════════════════════════════════════════ */

/* ─── Verification Banner component ─── */
const VerificationBanner = ({ user, dashboardData }: { user: any; dashboardData: any }) => {
  const [dismissed, setDismissed] = useState(false)
  const isVerified = dashboardData?.doctor?.isVerified ?? user?.isVerified
  const wasJustVerified = isVerified && !dismissed

  // Show "pending" banner if not verified, "congrats" if verified (dismiss once)
  if (dismissed) return null
  if (!isVerified) {
    return (
      <div className="fixed top-[56px] left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-200 shadow-sm">
        <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-[13px] font-semibold text-amber-800 flex-1">
          ⏳ Your account is pending verification. Please <a href="/doctor/profile?section=verification" className="underline font-bold hover:text-amber-900">upload your documents</a> and wait for admin approval before you can receive appointments.
        </p>
        <button onClick={() => setDismissed(true)} className="w-6 h-6 rounded-lg hover:bg-amber-200 flex items-center justify-center text-amber-600 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }
  return null
}

const DoctorDashboardContent = () => {
  const searchParams = useSearchParams()
  const { user } = userAuthStore()
  const { dashboard: dashboardData, fetchDashboard, loading } = useDoctorStore()
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [completingAppointmentId, setCompletingAppointmentId] = useState<string | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [aiReport, setAiReport] = useState<any>(null)
  const [showAiReport, setShowAiReport] = useState(false)
  const [aiReportLoading, setAiReportLoading] = useState<string | null>(null)
  const [customAlert, setCustomAlert] = useState<AlertState>({ open: false, type: 'info', title: '', message: '' })
  const { endConsultation, fetchAppointmentById, currentAppointment } = useAppointmentStore()

  const showAlert = (type: AlertType, title: string, message: string) => setCustomAlert({ open: true, type, title, message })
  const closeAlert = () => setCustomAlert(prev => ({ ...prev, open: false }))

  useEffect(() => { if (user?.type === 'doctor') fetchDashboard(user?.type) }, [user, fetchDashboard])

  useEffect(() => {
    const id = searchParams.get('completedCall')
    if (id) { setCompletingAppointmentId(id); fetchAppointmentById(id); setShowPrescriptionModal(true) }
  }, [searchParams, fetchAppointmentById])

  const handleSavePrescription = async (prescription: string, notes: string) => {
    if (!completingAppointmentId) return
    setModalLoading(true)
    try {
      await endConsultation(completingAppointmentId, prescription, notes)
      setShowPrescriptionModal(false)
      setCompletingAppointmentId(null)
      if (user?.type) fetchDashboard(user?.type)
      const url = new URL(window.location.href)
      url.searchParams.delete('completedCall')
      window.history.replaceState({}, '', url.pathname)
    } catch (err) { console.error(err) } finally { setModalLoading(false) }
  }

  const handleViewAIReport = async (appointmentId: string) => {
    setAiReport(null); setShowAiReport(false); setAiReportLoading(appointmentId)
    try {
      const res = await httpService.getWithAuth(`/ai/appointment-report/${appointmentId}`)
      const payload = res?.data?.report ?? res?.data ?? null
      if (res?.success && payload) { setAiReport(payload); setTimeout(() => setShowAiReport(true), 50) }
      else showAlert('info', 'No Report Available', 'The patient has not generated an AI report for this appointment yet.')
    } catch { showAlert('error', 'Could Not Load Report', 'Something went wrong while fetching the AI report.') }
    finally { setAiReportLoading(null) }
  }

  const canJoinCall = (a: any) => {
    const diff = (new Date(a.slotStartIso).getTime() - Date.now()) / 60000
    return diff <= 15 && diff >= -120 && ['Scheduled', 'In Progress'].includes(a.status)
  }
  const formatTime = (s: string) => new Date(s).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const isToday = (s: string) => new Date(s).toDateString() === new Date().toDateString()

  if (loading || !dashboardData) {
    return (
      <>
        <Header showDashboardNav />
        <div className='min-h-screen bg-[#F8F7F4] pt-16 flex items-center justify-center'>
          <div className='flex flex-col items-center gap-3'>
            <div className='w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin' />
            <p className='text-sm text-slate-400 font-medium'>Loading dashboard...</p>
          </div>
        </div>
      </>
    )
  }

  const STATS = [
    { label: 'Total Patients',       value: dashboardData?.stats?.totalPatients?.toString() || '0',        icon: Users,      color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-100',     grad: 'from-sky-400 to-blue-500' },
    { label: "Today's Appointments", value: dashboardData?.stats?.todayAppointments?.toString() || '0',    icon: Calendar,   color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', grad: 'from-emerald-400 to-teal-500' },
    { label: 'Total Revenue',        value: `₹${dashboardData?.stats?.totalRevenue?.toLocaleString() || '0'}`, icon: DollarSign, color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-100', grad: 'from-violet-400 to-purple-500' },
    { label: 'Completed',            value: dashboardData?.stats?.completedAppointments?.toString() || '0', icon: Activity,   color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100',   grad: 'from-amber-400 to-orange-500' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font { font-family:'DM Sans',system-ui,sans-serif; }
        .uc-serif { font-family:'Fraunces',Georgia,serif; }
        @keyframes page-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .page-animate { animation: page-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .stat-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
        .apt-row { transition: background 0.18s ease, transform 0.18s ease; }
        .apt-row:hover { background: #f8fafc; transform: translateX(2px); }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .skeleton { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.5s ease-in-out infinite; border-radius:10px; }
      `}</style>

      <Header showDashboardNav />
      <CustomAlert alert={customAlert} onClose={closeAlert} />
      <VerificationBanner user={user} dashboardData={dashboardData} />

      <div className='uc-font min-h-screen bg-[#F8F7F4] pt-16'>

        {/* ─── Hero Banner ─── */}
        <div className='bg-slate-950 relative overflow-hidden'>
          <div className='absolute inset-0 opacity-[0.04]' style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.4) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
          <div className='absolute top-0 right-0 w-80 h-80 bg-sky-500/8 rounded-full blur-3xl pointer-events-none' />
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10'>
            <div className='flex items-center justify-between gap-6 flex-wrap'>
              <div className='flex items-center gap-5'>
                <div className='relative'>
                  <Avatar className='w-16 h-16 ring-4 ring-sky-500/20'>
                    <AvatarImage src={dashboardData?.user?.profileImage} alt={dashboardData?.user?.name} />
                    <AvatarFallback className='bg-sky-500 text-white text-xl font-bold'>{dashboardData?.user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className='absolute bottom-0 right-0 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse' />
                </div>
                <div>
                  <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-1'>Good Morning,</p>
                  <h1 className='uc-serif text-3xl font-bold text-white leading-tight'>{dashboardData?.user?.name}</h1>
                  <div className='flex items-center gap-3 mt-1.5'>
                    <span className='text-slate-400 text-sm'>{dashboardData?.user?.specialization}</span>
                    <span className='text-slate-700'>·</span>
                    <div className='flex items-center gap-1 text-sm text-slate-400'>
                      <MapPin className='w-3.5 h-3.5 text-slate-500' />{dashboardData?.user?.hospitalInfo?.city}
                    </div>
                    <span className='text-slate-700'>·</span>
                    <div className='flex items-center gap-1'>
                      <Star className='w-3.5 h-3.5 fill-amber-400 text-amber-400' />
                      <span className='text-sm font-bold text-amber-400'>{dashboardData?.stats?.averageRating}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Link href='/doctor/profile'>
                <button className='flex items-center gap-2 text-sm font-bold text-white bg-sky-500 hover:bg-sky-400 px-4 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all duration-200 hover:-translate-y-0.5'>
                  <Plus className='w-4 h-4' />Update Availability
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-animate'>

          {/* ─── Stats ─── */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
            {STATS.map((s, i) => (
              <div key={i} className={`stat-card bg-white rounded-2xl border p-5 shadow-sm ${s.bg}`}>
                <div className='flex items-start justify-between mb-3'>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center shadow-sm`}>
                    <s.icon className='w-5 h-5 text-white' />
                  </div>
                  <div className='flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full'>
                    <TrendingUp className='w-3 h-3' />+12%
                  </div>
                </div>
                <p className='uc-serif text-2xl font-bold text-slate-900'>{s.value}</p>
                <p className='text-xs text-slate-500 font-medium mt-0.5'>{s.label}</p>
              </div>
            ))}
          </div>

          {/* ─── Main Grid ─── */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>

            {/* Today's Schedule */}
            <div className='lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden'>
              <div className='px-6 py-5 border-b border-slate-100 flex items-center justify-between'>
                <div>
                  <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5'>Today</p>
                  <h2 className='uc-serif text-xl font-bold text-slate-900'>
                    Today's Schedule
                    <span className='ml-3 text-sm font-bold text-sky-600 bg-sky-50 border border-sky-100 px-2.5 py-0.5 rounded-full'>
                      {dashboardData?.todayAppointments?.length || 0} apts
                    </span>
                  </h2>
                </div>
                <Link href='/doctor/appointments'>
                  <button className='flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-100 px-3 py-2 rounded-xl transition-colors duration-200'>
                    View All <ChevronRight className='w-3.5 h-3.5' />
                  </button>
                </Link>
              </div>

              <div className='divide-y divide-slate-50'>
                {dashboardData?.todayAppointments?.length > 0 ? (
                  dashboardData.todayAppointments.map((apt: Appointment) => (
                    <div key={apt._id} className='apt-row flex items-center gap-4 px-6 py-4 cursor-default rounded-xl mx-2 my-1'>
                      <div className='w-12 h-12 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-center flex-shrink-0'>
                        <Clock className='w-5 h-5 text-sky-500' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center justify-between gap-2'>
                          <h4 className='font-bold text-slate-900 text-sm truncate'>{apt.patientId?.name}</h4>
                          <span className='text-xs font-bold text-sky-600 flex-shrink-0'>{formatTime(apt.slotStartIso)}</span>
                        </div>
                        <p className='text-xs text-slate-400 line-clamp-1 mt-0.5'>
                          {apt.symptoms?.substring(0, 70)}
                        </p>
                        <div className='flex items-center gap-2 mt-1.5'>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(apt.status)}`}>{apt.status}</span>
                          {apt.consultationType === 'Video Consultation'
                            ? <Video className='w-3 h-3 text-sky-500' />
                            : <Phone className='w-3 h-3 text-emerald-500' />
                          }
                          <span className='text-[11px] text-slate-400'>₹{apt.doctorId?.fees}</span>
                        </div>
                      </div>
                      <div className='flex flex-col gap-1.5 flex-shrink-0'>
                        <button
                          onClick={() => handleViewAIReport(apt._id)}
                          disabled={aiReportLoading === apt._id}
                          className='flex items-center gap-1.5 text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-100 hover:bg-violet-100 px-2.5 py-1.5 rounded-xl transition-colors duration-200 disabled:opacity-50'
                        >
                          {aiReportLoading === apt._id
                            ? <span className='w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin' />
                            : <Brain className='w-3 h-3' />
                          }
                          AI Report
                        </button>
                        {canJoinCall(apt) && (
                          <Link href={`/call/${apt._id}`}>
                            <button className='flex items-center gap-1.5 text-[11px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1.5 rounded-xl transition-colors duration-200 w-full justify-center'>
                              <Video className='w-3 h-3' /> Start
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='flex flex-col items-center justify-center py-16 text-center px-6'>
                    <div className='w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4'>
                      <Calendar className='w-7 h-7 text-slate-300' />
                    </div>
                    <p className='uc-serif text-lg font-bold text-slate-700 mb-1'>No Appointments Today</p>
                    <p className='text-slate-400 text-sm'>Enjoy your free day!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className='space-y-5'>

              {/* Upcoming */}
              <div className='bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden'>
                <div className='px-5 py-4 border-b border-slate-50 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Clock className='w-4 h-4 text-sky-500' />
                    <h3 className='text-sm font-bold text-slate-900'>Upcoming</h3>
                  </div>
                  <Link href='/doctor/appointments'>
                    <button className='text-[11px] font-semibold text-sky-600 hover:text-sky-700'>View All →</button>
                  </Link>
                </div>
                <div className='divide-y divide-slate-50'>
                  {dashboardData?.upcomingAppointments?.length > 0 ? (
                    dashboardData.upcomingAppointments.map((apt: Appointment) => (
                      <div key={apt._id} className='apt-row flex items-center gap-3 px-5 py-3.5 rounded-xl mx-1.5 my-1'>
                        <Avatar className='w-9 h-9 ring-2 ring-slate-100 flex-shrink-0'>
                          <AvatarImage src={apt.patientId.profileImage} />
                          <AvatarFallback className='bg-sky-100 text-sky-600 text-sm font-bold'>{apt.patientId?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-bold text-slate-800 truncate'>{apt.patientId?.name}</p>
                          <p className='text-[11px] text-sky-600 font-semibold'>{formatTime(apt.slotStartIso)}</p>
                        </div>
                        <button
                          onClick={() => handleViewAIReport(apt._id)}
                          disabled={aiReportLoading === apt._id}
                          title='View AI pre-report'
                          className='w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-500 hover:bg-violet-100 transition-colors flex-shrink-0 disabled:opacity-50'
                        >
                          {aiReportLoading === apt._id
                            ? <span className='w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin' />
                            : <Brain className='w-3.5 h-3.5' />
                          }
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className='text-center py-10'>
                      <p className='text-slate-400 text-sm'>No upcoming appointments</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance */}
              <div className='bg-white rounded-3xl border border-slate-100 shadow-sm p-5'>
                <div className='flex items-center gap-2 mb-4'>
                  <TrendingUp className='w-4 h-4 text-sky-500' />
                  <h3 className='text-sm font-bold text-slate-900'>Performance</h3>
                </div>
                <div className='space-y-3'>
                  {[
                    { label: 'Patient Satisfaction', value: `${dashboardData?.performance?.pateintSatisfaction} / 5`, valueColor: 'text-amber-600', icon: Star },
                    { label: 'Completion Rate',      value: dashboardData?.performance?.completionRate,             valueColor: 'text-emerald-600', icon: Activity },
                    { label: 'Response Time',        value: dashboardData?.performance?.responseTime,               valueColor: 'text-sky-600',     icon: Clock },
                  ].map(({ label, value, valueColor, icon: Icon }) => (
                    <div key={label} className='flex items-center justify-between py-2 border-b border-slate-50 last:border-0'>
                      <div className='flex items-center gap-2'>
                        <Icon className='w-3.5 h-3.5 text-slate-400' />
                        <span className='text-xs text-slate-500 font-medium'>{label}</span>
                      </div>
                      <span className={`text-sm font-bold ${valueColor}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PrescriptionModal
        isOpen={showPrescriptionModal}
        onClose={() => { setShowPrescriptionModal(false); setCompletingAppointmentId(null); const u = new URL(window.location.href); u.searchParams.delete('completedCall'); window.history.replaceState({}, '', u.pathname) }}
        onSave={handleSavePrescription}
        patientName={currentAppointment?.patientId?.name}
        loading={modalLoading}
      />
      <AIReportViewModal report={aiReport} isOpen={showAiReport} onClose={() => { setShowAiReport(false); setTimeout(() => setAiReport(null), 300) }} title='Patient AI Pre-Consultation Report' />
      <CustomAlert alert={customAlert} onClose={closeAlert} />
    </>
  )
}

export default DoctorDashboardContent