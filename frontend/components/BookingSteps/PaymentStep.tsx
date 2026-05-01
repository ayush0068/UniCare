'use client'

import { httpService } from '@/service/httpService';
import { userAuthStore } from '@/store/authStore';
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, CreditCard, Loader2, Shield, XCircle, ArrowLeft, CalendarDays, Clock, User, Stethoscope, Zap, ChevronRight } from 'lucide-react';
import { Progress } from '../ui/progress';

declare global {
  interface Window { Razorpay: any; }
}

interface PaymentStepInterface {
  selectedDate: Date | undefined;
  selectedSlot: string;
  consultationType: string;
  doctorName: string;
  slotDuration: number;
  consultationFee: number;
  isProcessing: boolean;
  onBack: () => void;
  onConfirm: () => void;
  onPaymentSuccess?: (appointment: any) => void;
  loading: boolean;
  appointmentId?: string;
  patientName?: string;
  isGuest?: boolean;
  guestSurcharge?: number;
}

const PaymentStep = ({
  selectedDate, selectedSlot, consultationType, doctorName,
  slotDuration, consultationFee, isProcessing, onBack, onConfirm,
  onPaymentSuccess, loading, appointmentId, patientName, isGuest = false, guestSurcharge = 0
}: PaymentStepInterface) => {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const { user } = userAuthStore();
  const [error, setError] = useState('');
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const isFree = consultationFee === 0 && !isGuest;
  const platformFees = (isFree && !isGuest) ? 0 : Math.round(consultationFee * 0.1);
  const totalAmount = isFree ? 0 : consultationFee + platformFees + guestSurcharge;

  const [shouldAutoOpen, setShouldAutoOpen] = useState(true);
  const modalCloseCountRef = useRef<number>(0);

  useEffect(() => {
    if (appointmentId && patientName && !isFree && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [appointmentId, patientName, isFree]);

  useEffect(() => {
    if (appointmentId && patientName && paymentStatus === 'idle' && !isPaymentLoading && shouldAutoOpen) {
      const t = setTimeout(() => handlePayment(), 500);
      return () => clearTimeout(t);
    }
  }, [appointmentId, patientName, paymentStatus, isPaymentLoading, shouldAutoOpen]);

  /* Progress bar for processing state */
  useEffect(() => {
    if (paymentStatus === 'processing') {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((p) => (p < 85 ? p + 4 : p));
      }, 180);
      return () => clearInterval(interval);
    }
    if (paymentStatus === 'success') setProgress(100);
  }, [paymentStatus]);

  const handlePayment = async () => {
    if (!appointmentId || !patientName) { onConfirm(); return; }
    try {
      setIsPaymentLoading(true);
      setError('');
      setPaymentStatus('processing');

      if (isFree) {
        const orderResponse = await httpService.postWithAuth('/payment/create-order', { appointmentId });
        if (!orderResponse.success) throw new Error(orderResponse.message || 'Failed to confirm free appointment');
        setPaymentStatus('success');
        setTimeout(() => { if (onPaymentSuccess) onPaymentSuccess(orderResponse.data); else onConfirm(); }, 2200);
        return;
      }

      const orderResponse = await httpService.postWithAuth('/payment/create-order', { appointmentId });
      if (!orderResponse.success) throw new Error(orderResponse.message || 'Failed to create payment order');

      const { orderId, amount, currency, key } = orderResponse.data;

      const options = {
        key, amount, currency,
        name: 'Doctor Consultation Platform',
        description: `Consultation with Dr. ${doctorName} on ${selectedDate ? selectedDate.toLocaleDateString() : ''} at ${selectedSlot}`,
        order_Id: orderId,
        handler: async (response: any) => {
          try {
            const verifyResponse = await httpService.postWithAuth('/payment/verify-payment', {
              appointmentId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyResponse.success) {
              setPaymentStatus('success');
              setTimeout(() => { if (onPaymentSuccess) onPaymentSuccess(verifyResponse.data); else onConfirm(); }, 2200);
            } else {
              throw new Error(verifyResponse.message || 'Payment verification failed');
            }
          } catch (err: any) {
            setError(err.message || 'Payment verification failed');
            setPaymentStatus('failed');
          }
        },
        prefill: { name: patientName, email: user?.email, contact: user?.phone },
        notes: { appointmentId, doctorName, patientName },
        theme: { color: '#0ea5e9' },
        modal: {
          onDismiss: () => {
            setPaymentStatus('idle');
            setError('');
            modalCloseCountRef.current += 1;
            if (modalCloseCountRef.current === 1) {
              setTimeout(() => handlePayment(), 1000);
            } else {
              setShouldAutoOpen(false);
            }
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setPaymentStatus('failed');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handlePayNow = () => {
    if (appointmentId && patientName) {
      modalCloseCountRef.current = 0;
      handlePayment();
    } else {
      onConfirm();
    }
  };

  /* ─── Summary items ─── */
  const summaryItems = [
    { icon: CalendarDays, label: 'Date', value: selectedDate?.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) },
    { icon: Clock, label: 'Time', value: selectedSlot },
    { icon: Stethoscope, label: 'Doctor', value: `Dr. ${doctorName}` },
    { icon: User, label: 'Consultation', value: consultationType },
    { icon: Clock, label: 'Duration', value: `${slotDuration} minutes` },
  ];

  

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        @keyframes pay-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pay-animate { animation: pay-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes success-ring {
          0%   { transform: scale(0.7); opacity: 0; }
          50%  { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .success-ring { animation: success-ring 0.5s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes check-draw {
          from { stroke-dashoffset: 60; }
          to   { stroke-dashoffset: 0; }
        }
        .check-draw { stroke-dasharray: 60; animation: check-draw 0.4s ease 0.3s both; }

        .pay-btn {
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .pay-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(14,165,233,0.30);
        }
        .pay-btn:not(:disabled):active { transform: translateY(0); }
      `}</style>

      <div className='uc-font pay-animate'>

        {/* ─── Header ──────────────────────────────── */}
        <div className='mb-8'>
          <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-500 mb-2'>Step 3 of 3</p>
          <h3 className='uc-serif text-3xl font-bold text-slate-900 leading-tight'>
            Review &{' '}
            <em className='not-italic text-sky-500'>{isFree ? 'Confirm' : 'Pay'}</em>
          </h3>
        </div>

        <div className='grid lg:grid-cols-[1fr_320px] gap-6 items-start'>

          {/* ── Left: Booking Summary ── */}
          <div className='space-y-4'>
            <div className='bg-[#F8F7F4] rounded-3xl p-6 border border-slate-100'>
              <h4 className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-5'>Booking Summary</h4>

              <div className='space-y-3.5'>
                {summaryItems.map(({ icon: Icon, label, value }) => (
                  <div key={label} className='flex items-center gap-3'>
                    <div className='w-8 h-8 bg-white rounded-xl border border-slate-200 flex items-center justify-center flex-shrink-0'>
                      <Icon className='w-3.5 h-3.5 text-sky-500' />
                    </div>
                    <div className='flex-1 flex items-center justify-between min-w-0'>
                      <span className='text-xs text-slate-400 font-medium'>{label}</span>
                      <span className='text-sm font-semibold text-slate-800 text-right'>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Free consultation info */}
            {isFree && (
              <div className='flex items-start gap-4 p-5 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl'>
                <div className='w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200'>
                  <Zap className='w-5 h-5 text-white' />
                </div>
                <div>
                  <p className='text-sm font-bold text-emerald-800'>Free Consultation — Loyalty Benefit</p>
                  <p className='text-xs text-emerald-600 mt-1 leading-relaxed'>No payment required. Click confirm to book your appointment instantly.</p>
                </div>
              </div>
            )}

            {/* Security badge */}
            <div className='flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm'>
              <div className='w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0'>
                <Shield className='w-4 h-4 text-emerald-600' />
              </div>
              <div>
                <p className='text-xs font-bold text-slate-800'>256-bit SSL Secured</p>
                <p className='text-[11px] text-slate-400 mt-0.5 leading-relaxed'>Your payment is encrypted & secure. We never store card details.</p>
              </div>
            </div>
          </div>

          {/* ── Right: Price Breakdown ── */}
          <div className='bg-slate-950 rounded-3xl p-6 text-white space-y-4 sticky top-6'>
            <div>
              <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4'>Price Breakdown</p>

              <div className='space-y-3'>
                <div className='flex justify-between items-center text-sm'>
                  <span className='text-slate-400'>Consultation Fee</span>
                  {isFree
                    ? <span className='font-bold text-emerald-400'>FREE</span>
                    : <span className='font-semibold text-white'>₹{consultationFee}</span>
                  }
                </div>
                <div className='flex justify-between items-center text-sm'>
                  <span className='text-slate-400'>Platform Fee</span>
                  {isFree
                    ? <span className='font-bold text-emerald-400'>FREE</span>
                    : <span className='font-semibold text-white'>₹{platformFees}</span>
                  }
                </div>

                {isGuest && (
                  <div className='flex justify-between items-center text-sm'>
                    <span className='text-slate-400'>Guest Convenience Fee</span>
                    <span className='font-semibold text-amber-400'>₹{guestSurcharge}</span>
                  </div>
                )}

                <div className='h-px bg-slate-800 my-1' />

                <div className='flex justify-between items-center'>
                  <span className='text-sm font-semibold text-white'>Total Amount</span>
                  {isFree
                    ? (
                      <div className='flex items-center gap-2'>
                        <span className='text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg'>FREE</span>
                        <span className='uc-serif text-xl font-bold text-emerald-400'>₹0</span>
                      </div>
                    )
                    : <span className='uc-serif text-2xl font-bold text-white'>₹{totalAmount}</span>
                  }
                </div>
              </div>
            </div>

            {/* Payment status animations */}
            <AnimatePresence mode='wait'>
              {paymentStatus === 'processing' && (
                <motion.div
                  key='processing'
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className='bg-slate-800/60 rounded-2xl p-5 text-center space-y-3'
                >
                  <Loader2 className='w-8 h-8 mx-auto text-sky-400 animate-spin' />
                  <p className='text-sm font-semibold text-white'>
                    {isFree ? 'Confirming booking...' : 'Processing payment...'}
                  </p>
                  <Progress value={progress} className='h-1.5 bg-slate-700 [&>div]:bg-sky-500' />
                </motion.div>
              )}

              {paymentStatus === 'success' && (
                <motion.div
                  key='success'
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className='bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-center space-y-2'
                >
                  <div className='success-ring w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30'>
                    <CheckCircle className='w-7 h-7 text-white' />
                  </div>
                  <p className='text-sm font-bold text-emerald-400'>
                    {isFree ? 'Appointment Confirmed!' : 'Payment Successful!'}
                  </p>
                  <p className='text-xs text-emerald-500/80'>Redirecting to your dashboard...</p>
                </motion.div>
              )}

              {paymentStatus === 'failed' && (
                <motion.div
                  key='failed'
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className='bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-center space-y-3'
                >
                  <XCircle className='w-10 h-10 mx-auto text-red-400' />
                  <p className='text-sm font-bold text-red-400'>Payment Failed</p>
                  <p className='text-xs text-slate-400 leading-relaxed'>{error}</p>
                  <button
                    onClick={() => { setPaymentStatus('idle'); setError(''); }}
                    className='text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors underline'
                  >
                    Try again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {paymentStatus === 'idle' && (
              <button
                onClick={handlePayNow}
                disabled={loading || isPaymentLoading}
                className='pay-btn w-full flex items-center justify-center gap-2 font-bold text-sm py-3.5 px-5 rounded-2xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white shadow-sky-500/20'
              >
                {loading ? (
                  <><Loader2 className='w-4 h-4 animate-spin' /> Creating appointment...</>
                ) : isPaymentLoading ? (
                  <><Loader2 className='w-4 h-4 animate-spin' /> Processing...</>
                ) : isFree ? (
                  <><CheckCircle className='w-4 h-4' /> Confirm Free Booking</>
                ) : (
                  <><CreditCard className='w-4 h-4' /> Pay ₹{totalAmount} & Confirm<ChevronRight className='w-4 h-4' /></>
                )}
              </button>
            )}

            <p className='text-[11px] text-slate-500 text-center'>
              By confirming, you agree to UniCare+'s{' '}
              <a href='#' className='text-sky-500 hover:text-sky-400 transition-colors'>cancellation policy</a>
            </p>
          </div>
        </div>

        {/* ─── Back Button ─────────────────────────── */}
        {paymentStatus === 'idle' && (
          <div className='mt-8 pt-6 border-t border-slate-100'>
            <button
              onClick={onBack}
              className='flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors duration-200 group'
            >
              <ArrowLeft className='w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200' />
              Back to Time Selection
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default PaymentStep;