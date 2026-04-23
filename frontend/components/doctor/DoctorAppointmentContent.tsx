'use client'

import React, { useEffect, useState } from 'react'
import Header from '../landing/Header'
import { userAuthStore } from '@/store/authStore'
import { Appointment, useAppointmentStore } from '@/store/appointmentStore'
import Link from 'next/link'
import {
  AlertTriangle, Calendar, Clock, FileText,
  MapPin, Phone, Plus, Star, Stethoscope,
  Video, XCircle, ArrowRight,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { emptyStates, getStatusColor } from '@/lib/constant'
import PrescriptionViewModal from './PrescriptionViewModal'

/* ─── Status style map ─── */
const STATUS_MAP: Record<string, { top: string; dot: string; badge: string; text: string }> = {
  Scheduled:   { top: 'from-sky-500 to-blue-600',    dot: 'bg-sky-400',     badge: 'bg-sky-50 border-sky-100 text-sky-700',    text: 'text-sky-700' },
  'In Progress':{ top: 'from-amber-400 to-orange-500', dot: 'bg-amber-400',   badge: 'bg-amber-50 border-amber-100 text-amber-700', text: 'text-amber-700' },
  Completed:   { top: 'from-emerald-400 to-teal-500', dot: 'bg-emerald-400', badge: 'bg-emerald-50 border-emerald-100 text-emerald-700', text: 'text-emerald-700' },
  Cancelled:   { top: 'from-red-400 to-rose-500',     dot: 'bg-red-400',     badge: 'bg-red-50 border-red-100 text-red-600',    text: 'text-red-600' },
}

/* ─── Cancel Modal ─── */
const CancelModal = ({ isOpen, onConfirm, onCancel }: { isOpen: boolean; onConfirm: () => void; onCancel: () => void }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])
  if (!isOpen) return null
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm' onClick={onCancel}>
      <div
        className='bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center'
        style={{ animation: 'modal-up 0.28s cubic-bezier(0.34,1.56,0.64,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes modal-up { from { opacity:0; transform: translateY(20px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
        <div className='w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5 ring-4 ring-red-50'>
          <XCircle className='w-8 h-8 text-red-600' />
        </div>
        <h2 className='uc-serif text-xl font-bold text-slate-900 mb-2'>Cancel Appointment?</h2>
        <p className='text-sm text-slate-500 leading-relaxed mb-4'>The patient will be notified of the cancellation.</p>
        <div className='inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6'>
          <AlertTriangle className='w-3 h-3' /> This action cannot be undone
        </div>
        <div className='flex gap-3'>
          <button onClick={onCancel} className='flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors duration-200'>
            Keep It
          </button>
          <button onClick={onConfirm} className='flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-200 transition-all duration-200 hover:-translate-y-0.5'>
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════ */
const DoctorAppointmentContent = () => {
  const { user } = userAuthStore()
  const { appointments, fetchAppointments, loading, updateAppointmentStatus } = useAppointmentStore()
  const [activeTab, setActiveTab] = useState('upcoming')
  const [tabCounts, setTabCounts] = useState({ upcoming: 0, past: 0 })
  const [cancelModal, setCancelModal] = useState<{ open: boolean; appointmentId: string | null }>({ open: false, appointmentId: null })

  useEffect(() => {
    if (user?.type === 'doctor') fetchAppointments('doctor', activeTab)
  }, [user, activeTab, fetchAppointments])

  useEffect(() => {
    const now = new Date()
    const upcoming = appointments.filter(a => {
      const d = new Date(a.slotStartIso)
      return (d >= now || a.status === 'In Progress') && (a.status === 'Scheduled' || a.status === 'In Progress')
    })
    const past = appointments.filter(a => {
      const d = new Date(a.slotStartIso)
      return d < now || a.status === 'Completed' || a.status === 'Cancelled'
    })
    setTabCounts({ upcoming: upcoming.length, past: past.length })
  }, [appointments])

  const formatDate = (s: string) => new Date(s).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
  const formatTime = (s: string) => new Date(s).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const isToday = (s: string) => new Date(s).toDateString() === new Date().toDateString()
  const canJoinCall = (a: any) => {
    const diff = (new Date(a.slotStartIso).getTime() - Date.now()) / 60000
    return isToday(a.slotStartIso) && diff <= 15 && diff >= -120 && (a.status === 'Scheduled' || a.status === 'In Progress')
  }
  const canMarkCancelled = (a: any) => a.status === 'Scheduled' && new Date() > new Date(a.slotStartIso)

  const handleConfirmCancel = async () => {
    if (!cancelModal.appointmentId) return
    const id = cancelModal.appointmentId
    setCancelModal({ open: false, appointmentId: null })
    try {
      await updateAppointmentStatus(id, 'Cancelled')
      if (user?.type === 'doctor') fetchAppointments('doctor', activeTab)
    } catch (err) { console.error('Failed to cancel', err) }
  }

  if (!user) return null

  const TABS = [
    { id: 'upcoming', label: 'Upcoming', icon: Clock, count: tabCounts.upcoming },
    { id: 'past', label: 'Past', icon: Calendar, count: tabCounts.past },
  ]

  /* ─── Appointment Card ─── */
  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const status = appointment.status as string
    const sm = STATUS_MAP[status] || STATUS_MAP.Scheduled
    return (
      <div className='apt-card bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm'>
        <div className={`h-1 w-full bg-gradient-to-r ${sm.top}`} />
        <div className='p-5 sm:p-6'>
          <div className='flex items-start gap-4'>
            <div className='relative flex-shrink-0'>
              <Avatar className='w-14 h-14 ring-2 ring-slate-100'>
                <AvatarImage src={appointment.patientId?.profileImage} alt={appointment.patientId?.name} className='object-cover' />
                <AvatarFallback className='bg-gradient-to-br from-sky-400 to-sky-600 text-white font-bold'>
                  {appointment.patientId?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isToday(appointment.slotStartIso) && <span className='absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse' />}
            </div>

            <div className='flex-1 min-w-0'>
              <div className='flex items-start justify-between gap-2 mb-1 flex-wrap'>
                <div>
                  <h3 className='font-bold text-slate-900 text-base leading-tight'>{appointment.patientId?.name}</h3>
                  <p className='text-slate-400 text-xs mt-0.5'>{appointment.patientId?.email}</p>
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${sm.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sm.dot} ${status === 'In Progress' ? 'animate-pulse' : ''}`} />
                    {appointment.status}
                  </span>
                  {isToday(appointment.slotStartIso) && <span className='text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg'>TODAY</span>}
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 my-3'>
                {[
                  { icon: Calendar, val: formatDate(appointment.slotStartIso) },
                  { icon: Clock, val: formatTime(appointment.slotStartIso) },
                  { icon: appointment.consultationType === 'Video Consultation' ? Video : Phone, val: appointment.consultationType },
                ].map(({ icon: Icon, val }, i) => (
                  <div key={i} className='flex items-center gap-2 bg-[#F8F7F4] px-3 py-2 rounded-xl'>
                    <Icon className='w-3.5 h-3.5 text-sky-400 flex-shrink-0' />
                    <span className='text-xs font-semibold text-slate-700 truncate'>{val}</span>
                  </div>
                ))}
              </div>

              {appointment.symptoms && (
                <p className='text-xs text-slate-400 line-clamp-2 mb-3 bg-slate-50 rounded-xl px-3 py-2'>
                  <span className='font-semibold text-slate-600'>Symptoms: </span>{appointment.symptoms}
                </p>
              )}

              <div className='flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-50'>
                <div className='flex gap-2 flex-wrap'>
                  {canJoinCall(appointment) && (
                    <Link href={`/call/${appointment._id}`}>
                      <button className='flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3.5 py-2 rounded-xl shadow-md shadow-emerald-200 transition-all duration-200'>
                        <Video className='w-3.5 h-3.5' /> Start Consultation
                      </button>
                    </Link>
                  )}
                  {canMarkCancelled(appointment) && (
                    <button
                      onClick={() => setCancelModal({ open: true, appointmentId: appointment._id })}
                      className='flex items-center gap-1.5 text-xs font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-xl transition-colors duration-200'
                    >
                      <XCircle className='w-3.5 h-3.5' /> Mark Cancelled
                    </button>
                  )}
                  {appointment.status === 'Completed' && appointment.prescription && (
                    <PrescriptionViewModal
                      appointment={appointment}
                      userType='patient'
                      trigger={
                        <button className='flex items-center gap-1.5 text-xs font-bold text-sky-700 border border-sky-200 bg-sky-50 hover:bg-sky-100 px-3.5 py-2 rounded-xl transition-colors duration-200'>
                          <Stethoscope className='w-3.5 h-3.5' /> View Report
                        </button>
                      }
                    />
                  )}
                </div>
                {appointment.status === 'Completed' && (
                  <div className='flex gap-0.5'>
                    {[...Array(5)].map((_, i) => <Star key={i} className='w-3.5 h-3.5 fill-amber-400 text-amber-400' />)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const EmptyCard = ({ tab }: { tab: string }) => {
    const state = emptyStates[tab as keyof typeof emptyStates]
    const Icon = state.icon
    return (
      <div className='flex flex-col items-center justify-center py-20 text-center'>
        <div className='w-20 h-20 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center mb-5'>
          <Icon className='w-9 h-9 text-slate-300' />
        </div>
        <h3 className='uc-serif text-xl font-bold text-slate-800 mb-2'>{state.title}</h3>
        <p className='text-slate-400 text-sm max-w-xs'>{state.description}</p>
      </div>
    )
  }

  const SkeletonCard = () => (
    <div className='bg-white rounded-3xl border border-slate-100 p-5 sm:p-6'>
      <div className='h-1 bg-slate-100 rounded-full mb-5' />
      <div className='flex gap-4'>
        <div className='w-14 h-14 rounded-full skeleton flex-shrink-0' />
        <div className='flex-1 space-y-2.5'>
          <div className='skeleton h-4 w-2/5 rounded-xl' />
          <div className='skeleton h-3 w-1/3 rounded-xl' />
          <div className='grid grid-cols-3 gap-2 mt-3'>{[...Array(3)].map((_, i) => <div key={i} className='h-8 skeleton rounded-xl' />)}</div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font { font-family:'DM Sans',system-ui,sans-serif; }
        .uc-serif { font-family:'Fraunces',Georgia,serif; }
        @keyframes page-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .page-animate { animation: page-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes tab-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .tab-animate { animation: tab-in 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .apt-card { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, border-color 0.2s ease; }
        .apt-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(14,165,233,0.10); border-color: #bae6fd; }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .skeleton { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.5s ease-in-out infinite; border-radius:10px; }
      `}</style>

      <Header showDashboardNav />
      <CancelModal isOpen={cancelModal.open} onConfirm={handleConfirmCancel} onCancel={() => setCancelModal({ open: false, appointmentId: null })} />

      <div className='uc-font min-h-screen bg-[#F8F7F4] pt-16'>
        <div className='max-w-5xl mx-auto px-4 sm:px-6 py-8 page-animate'>

          {/* Header */}
          <div className='flex items-center justify-between mb-8 gap-4 flex-wrap'>
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-500 mb-1'>Doctor Portal</p>
              <h1 className='uc-serif text-3xl font-bold text-slate-900 leading-tight'>
                My <em className='not-italic text-sky-500'>Appointments</em>
              </h1>
            </div>
            <Link href='/doctors/profile'>
              <button className='flex items-center gap-2 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 px-4 py-2.5 rounded-xl shadow-md shadow-sky-200 transition-all duration-200 hover:-translate-y-0.5'>
                <Plus className='w-4 h-4' />Update Availability
              </button>
            </Link>
          </div>

          {/* Tabs */}
          <div className='flex gap-1.5 mb-8 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm w-fit'>
            {TABS.map(({ id, label, icon: Icon, count }) => {
              const isActive = activeTab === id
              return (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  <Icon className='w-3.5 h-3.5' />
                  {label}
                  <span className={`text-[11px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div key={activeTab} className='tab-animate'>
            {loading ? (
              <div className='space-y-4'>{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : appointments.length > 0 ? (
              <div className='space-y-4'>{appointments.map(a => <AppointmentCard key={a._id} appointment={a} />)}</div>
            ) : (
              <EmptyCard tab={activeTab} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default DoctorAppointmentContent