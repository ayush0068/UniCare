'use client'

import React, { useEffect, useState } from 'react'
import Header from '../landing/Header'
import { userAuthStore } from '@/store/authStore'
import { Appointment, useAppointmentStore } from '@/store/appointmentStore';
import { Card, CardContent } from '../ui/card';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertTriangle, Calendar, Clock, Stethoscope, Video, Phone, Star, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { emptyStates, getStatusColor } from '@/lib/constant';
import PrescriptionViewModal from './PrescriptionViewModal';

// ─── Cancel Confirm Modal ────────────────────────────────────────────────────

interface CancelConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const CancelConfirmModal = ({ isOpen, onConfirm, onCancel }: CancelConfirmModalProps) => {
  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel} // click backdrop to dismiss
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center"
        style={{
          animation: 'cancelModalSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: '0 32px 64px rgba(15,23,42,0.18), 0 0 0 1px rgba(226,232,240,0.8)',
        }}
        onClick={(e) => e.stopPropagation()} // prevent backdrop click from bubbling
      >
        <style>{`
          @keyframes cancelModalSlideUp {
            from { opacity: 0; transform: translateY(24px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Icon */}
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full bg-red-100" />
          <div
            className="absolute rounded-full border-2 border-red-200"
            style={{ inset: '-4px' }}
          />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Text */}
        <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
          Cancel Appointment?
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-3">
          This will cancel the scheduled consultation. The patient will be notified of the cancellation.
        </p>

        {/* Warning chip */}
        <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <AlertTriangle className="w-3 h-3" />
          This action cannot be undone
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-[1.5px] border-slate-200 bg-white text-slate-600 text-sm font-semibold
                       hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all duration-150"
          >
            Keep Appointment
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150
                       hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(220,38,38,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(220,38,38,0.3)';
            }}
          >
            Yes, Cancel It
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const DoctorAppointmentContent = () => {
  const { user } = userAuthStore();
  const { appointments, fetchAppointments, loading, updateAppointmentStatus } = useAppointmentStore();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [tabCounts, setTabCounts] = useState({ upcoming: 0, past: 0 });

  // Modal state
  const [cancelModal, setCancelModal] = useState<{ open: boolean; appointmentId: string | null }>({
    open: false,
    appointmentId: null,
  });

  useEffect(() => {
    if (user?.type === 'doctor') {
      fetchAppointments('doctor', activeTab);
    }
  }, [user, activeTab, fetchAppointments]);

  useEffect(() => {
    const now = new Date();
    const upcomingAppointments = appointments.filter((apt) => {
      const aptDate = new Date(apt.slotStartIso);
      return (
        (aptDate >= now || apt.status === 'In Progress') &&
        (apt.status === 'Scheduled' || apt.status === 'In Progress')
      );
    });
    const pastAppointments = appointments.filter((apt) => {
      const aptDate = new Date(apt.slotStartIso);
      return aptDate < now || apt.status === 'Completed' || apt.status === 'Cancelled';
    });
    setTabCounts({ upcoming: upcomingAppointments.length, past: pastAppointments.length });
  }, [appointments]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const isToday = (dateString: string) => {
    const today = new Date();
    return new Date(dateString).toDateString() === today.toDateString();
  };

  const canJoinCall = (appointment: any) => {
    const appointmentTime = new Date(appointment.slotStartIso);
    const now = new Date();
    const diffMinutes = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
    return (
      isToday(appointment.slotStartIso) &&
      diffMinutes <= 15 &&
      diffMinutes >= -120 &&
      (appointment.status === 'Scheduled' || appointment.status === 'In Progress')
    );
  };

  const canMarkCancelled = (appointment: any) => {
    const appointmentTime = new Date(appointment.slotStartIso);
    const now = new Date();
    return appointment.status === 'Scheduled' && now > appointmentTime;
  };

  // ── Open modal instead of browser confirm ──
  const handleMarkCancelled = (appointmentId: string) => {
    setCancelModal({ open: true, appointmentId });
  };

  // ── Called when user confirms inside the modal ──
  const handleConfirmCancel = async () => {
    if (!cancelModal.appointmentId) return;
    const id = cancelModal.appointmentId;
    setCancelModal({ open: false, appointmentId: null });
    try {
      await updateAppointmentStatus(id, 'Cancelled');
      if (user?.type === 'doctor') {
        fetchAppointments('doctor', activeTab);
      }
    } catch (error) {
      console.error('Failed to cancel appointment', error);
    }
  };

  const handleDismissModal = () => {
    setCancelModal({ open: false, appointmentId: null });
  };

  if (!user) return null;

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col items-center md:flex-row md:items-start md:space-x-6">
          <div className="flex-shrink-0 flex justify-center md:justify-start">
            <Avatar className="w-20 h-20">
              <AvatarImage src={appointment.patientId?.profileImage} alt={appointment.patientId?.name} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                {appointment.patientId?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="mt-4 md:mt-0 flex-1 w-full text-center md:text-left">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{appointment.patientId?.name}</h3>
                <p className="text-gray-600">Age: {appointment.patientId?.age}</p>
                <p className="text-sm text-gray-600">{appointment.patientId?.email}</p>
              </div>
              <div className="mt-2 md:mt-0 text-center md:text-right">
                <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                {isToday(appointment.slotStartIso) && (
                  <div className="text-xs text-blue-600 font-semibold mt-1">TODAY</div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-center md:justify-start space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(appointment.slotStartIso)}</span>
                </div>
                <div className="flex items-center justify-center md:justify-start space-x-2 text-sm text-gray-600">
                  {appointment.consultationType === 'Video Consultation'
                    ? <Video className="w-4 h-4" />
                    : <Phone className="w-4 h-4" />}
                  <span>{appointment.consultationType}</span>
                </div>
              </div>

              <div className="text-center md:text-left">
                <div className="flex justify-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold">Fee:</span>
                  <p>₹{appointment.doctorId?.fees}</p>
                </div>
                {appointment.symptoms && (
                  <div className="flex justify-center gap-2 text-sm text-gray-600 mt-1">
                    <span className="font-semibold">Symptoms</span>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{appointment.symptoms}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col md:flex-row items-center md:justify-between space-y-3 md:space-y-0">
              <div className="flex space-x-2">
                {canJoinCall(appointment) && (
                  <Link href={`/call/${appointment._id}`}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <Video className="w-4 h-4 mr-2" />
                      Start Consultation
                    </Button>
                  </Link>
                )}

                {canMarkCancelled(appointment) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleMarkCancelled(appointment._id)}  // ← triggers modal
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Mark Cancelled
                  </Button>
                )}

                {appointment.status === 'Completed' && appointment.prescription && (
                  <PrescriptionViewModal
                    appointment={appointment}
                    userType="patient"
                    trigger={
                      <Button variant="outline" size="sm" className="text-green-700 border-green-200 hover:bg-green-50">
                        <Stethoscope className="w-4 h-4 mr-2" />
                        View Report
                      </Button>
                    }
                  />
                )}
              </div>

              {appointment.status === 'Completed' && (
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ tab }: { tab: string }) => {
    const state = emptyStates[tab as keyof typeof emptyStates];
    const Icon = state.icon;
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{state.title}</h3>
          <p className="text-gray-600 mb-6">{state.description}</p>
        </CardContent>
      </Card>
    );
  };

  const LoadingGrid = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                <div className="h-3 bg-gray-200 rounded-full w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <Header showDashboardNav={true} />

      {/* ── Cancel Confirm Modal ── */}
      <CancelConfirmModal
        isOpen={cancelModal.open}
        onConfirm={handleConfirmCancel}
        onCancel={handleDismissModal}
      />

      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-md md:text-3xl font-bold text-gray-900">My Appointments</h1>
              <p className="text-xs md:text-lg text-gray-600">Manage Your Patient Consultation</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/doctors/profile">
                <Button>
                  <Calendar className="w-4 h-4 mr-2" />
                  Update Availability
                </Button>
              </Link>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Upcoming ({tabCounts.upcoming})</span>
              </TabsTrigger>
              <TabsTrigger value="past" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Past ({tabCounts.past})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {loading ? <LoadingGrid /> : appointments.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {appointments.map((apt) => <AppointmentCard key={apt._id} appointment={apt} />)}
                </div>
              ) : <EmptyState tab="upcoming" />}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {loading ? <LoadingGrid /> : appointments.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {appointments.map((apt) => <AppointmentCard key={apt._id} appointment={apt} />)}
                </div>
              ) : <EmptyState tab="past" />}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default DoctorAppointmentContent;