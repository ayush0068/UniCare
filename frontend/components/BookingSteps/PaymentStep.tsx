import { httpService } from '@/service/httpService';
import { userAuthStore } from '@/store/authStore';
import { set } from 'date-fns';
import React, { useEffect, useRef, useState } from 'react'
import { Separator } from '../ui/separator';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, CreditCard, Loader2, Shield, XCircle } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';


declare global {
  interface Window {
    Razorpay : any;
  }
}

interface PaymentStepInterface {
  selectedDate : Date | undefined;
  selectedSlot : string;
  consultationType : string;
  doctorName : string;
  slotDuration : number;
  consultationFee : number;
  isProcessing : boolean;
  onBack : () => void;
  onConfirm : () => void;
  onPaymentSuccess?: (appointment: any) => void;
  loading: boolean;
  appointmentId?: string
  patientName?: string 
}
const PaymentStep = ({ selectedDate, selectedSlot, consultationType, doctorName, slotDuration, consultationFee, isProcessing, onBack, onConfirm, onPaymentSuccess, loading, appointmentId, patientName }: PaymentStepInterface) => {

  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const {user} = userAuthStore()
  const [error, setError] = useState<string>('')
  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
  const platformFees = Math.round(consultationFee * 0.1);
  const totalAmount = consultationFee + platformFees;
  const [shouldAutoOpen, setShouldAutoOpen] = useState(true)
  const modalCloseCountRef = useRef<number>(0)

  //Load Razorpay script
  useEffect(() => {
    if(appointmentId && patientName && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

    }
  }, [appointmentId, patientName])

  useEffect(() => {
    if(appointmentId && patientName && paymentStatus === 'idle' && !isPaymentLoading && shouldAutoOpen) {
      const timer = setTimeout(() => {
        handlePayment();
      },500);
      return () => clearTimeout(timer)
    }
  }, [appointmentId, patientName, paymentStatus, isPaymentLoading, shouldAutoOpen])


  const handlePayment = async () => {
    if(!appointmentId || !patientName) {
      onConfirm();
      return
  }

  try {
    setIsPaymentLoading(true)
    setError('')
    setPaymentStatus('processing')


    //Create payment order
    const orderResponse = await httpService.postWithAuth('/payment/create-order', {appointmentId})
    
    if(!orderResponse.success) {
      throw new Error(orderResponse.message || 'Failed to create payment order');
    }

    const {orderId, amount, currency, key} = orderResponse.data;

    //Configure razorpay options
    const options = {
        key: key, // Enter the Key ID generated from the Dashboard
        amount: amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        currency,
        name: 'Doctor Consultation Platform',
        description: `Consultation with Dr. ${doctorName} on ${selectedDate ? selectedDate.toLocaleDateString() : ''} at ${selectedSlot}`,
        order_Id: orderId,
        handler: async (response:any) => {
          try {
            const verifyResponse = await httpService.postWithAuth('/payment/verify-payment', {
              appointmentId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })

            if (verifyResponse.success) {
              setPaymentStatus('success')

              setTimeout(() => {
                if (onPaymentSuccess) {
                  onPaymentSuccess(verifyResponse.data)
                } else {
                  onConfirm()
                }
              }, 4000) // 4 sec delay

            }else {
              throw new Error(verifyResponse.message || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment Verification Failed', error);
            setError(error.message || 'Payment Failed');
            setPaymentStatus('failed')
          }
        },
        prefill: { 
            name: patientName,
            email: user?.email,
            contact: user?.phone
        },
        notes: {
            appointmentId,
            doctorName,
            patientName
        },
        theme: {
            color: '#3B82F6'
        }, 
        
        modal:{
          onDismiss: () => {
            setPaymentStatus('idle');
            setError('');
            modalCloseCountRef.current += 1;

            if(modalCloseCountRef.current === 1) {
              setTimeout(() => {
                handlePayment();
              }, 1000)
            }else{
              setShouldAutoOpen(false)
            }
          }
        }
      };

      const razorPay = new window.Razorpay(options);
      razorPay.open();

    
  } catch (error: any) {
    console.error('Payment Error', error)
    setError(error.message || 'Payment Failed')
    setPaymentStatus('failed')
  }finally {
    setIsPaymentLoading(false);
  }
};


const handlePaynow = () => {
  if(appointmentId && patientName) {
    modalCloseCountRef.current = 0;
    handlePayment();
  }else{
    onConfirm();
  }
}


  return (
    <div className='space-y-8'>
      <div>
        <h3 className='text-2xl font-bold text-gray-900 mb-6'>Payment and Confirmation </h3>
          <div className='bg-gray-50 rounded-lg p-6 mb-8'>
            <h4 className='font-semibold text-gray-900 mb-4'>
              Booking Summary
            </h4>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <span className='text-gray-600'>
                  Date & Time
                </span>
                <span className='font-medium'>
                  {selectedDate?.toLocaleDateString()} at {selectedSlot}
                </span>
              </div>

              <div className='flex justify-between'>
                <span className='text-gray-600'>
                  Consultation Type
                </span>
                <span className='font-medium'>
                  {consultationType}
                </span>
              </div>

              <div className='flex justify-between'>
                <span className='text-gray-600'>
                  Doctor
                </span>
                <span className='font-medium'>
                  {doctorName}
                </span>
              </div>

              <div className='flex justify-between'>
                <span className='text-gray-600'>
                  Duration
                </span>
                <span className='font-medium'>
                  {slotDuration} minutes
                </span>
              </div>

              <Separator />

              <div className='flex justify-between'>
                <span className='text-gray-600'>
                  Consultation Fee
                </span>
                <span className='font-medium'>
                  ₹{consultationFee}
                </span>
              </div>

              <div className='flex justify-between'>
                <span className='text-gray-600'>
                  Platform Fee
                </span>
                <span className='font-medium'>
                  ₹{platformFees}
                </span>
              </div>

              <Separator />

              <div className='flex justify-between'>
                <span className='font-semibold'>
                  Total Amount
                </span>
                <span className='font-bold text-green-600'>
                  ₹{totalAmount}
                </span>
              </div>
            </div>
          </div>
        

        <AnimatePresence mode='wait'>
          {paymentStatus === 'processing' && (
            <motion.div 
              key='processing'
              initial={{ opacity: 0, scale: 0.95}}
              animate={{ opacity: 1, scale: 1}}
              exit= {{opacity: 0, scale: 0.95}}
              className='text-center py-12'
            >

              <Loader2 className='w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin' />
              <h4 className='text-lg font-semibold text-gray-900 mb-2'>Processing Payment...</h4>
              <p className='text-gray-600 mb-4'>Please Complete the payment to confirm your appointment</p>
              <Progress value={50} className='w-full' />
            </motion.div>
          )}


          {paymentStatus === 'success' && (
            <motion.div 
              key='success'
              initial={{ opacity: 0, scale: 0.95}}
              animate={{ opacity: 1, scale: 1}}
              exit= {{opacity: 0, scale: 0.95}}
              className='text-center py-12'
            >

              <CheckCircle className='w-16 h-16 mx-auto mb-4 text-blue-600 text-green-600' />
              <h4 className='text-lg font-semibold text-green-800 mb-2'>Payment Successful!</h4>
              <p className='text-gray-600 mb-4'>Your appointment has been confirmed.</p>
              
            </motion.div>
          )}

          {paymentStatus === 'failed' && (
            <motion.div 
              key='failed'
              initial={{ opacity: 0, scale: 0.95}}
              animate={{ opacity: 1, scale: 1}}
              exit= {{opacity: 0, scale: 0.95}}
              className='text-center py-12'
            >

              <XCircle className='w-16 h-16 mx-auto mb-4 text-blue-600 text-red-600' />
              <h4 className='text-lg font-semibold text-red-800 mb-2'>Payment Failed!</h4>
              <p className='text-gray-600 mb-4'>{error}</p>
              <Button
                onClick={() => {
                  setPaymentStatus('idle')
                  setError('')
                }}
                variant='outline'
                className='text-red-600 border-red-600 hover:bg-red-50'
              >
                Try Again
              </Button>
              <Progress value={50} className='w-full' />
            </motion.div>
          )}
        </AnimatePresence>


        <div className='flex items-center space-x-3 p-4 bg-green-50 rounded-lg mb-8'>
            <Shield className='w-6 h-6 text-green-600' />
            <div>
              <p className='font-medium text-green-800'>
                Secure Payment
              </p>
              <p>
                Your Payment is protected by 256-bit SSL encryption and secure gateways. We do not store your card details.
              </p>
            </div>
        </div>
      </div>

      {paymentStatus === 'idle' &&  (
        <div className='flex justify-between gap-2'>
            <Button
              variant='outline'
              onClick={onBack}
              className='px-8 py-3'
            >
              Back
            </Button>
            <Button
              onClick={handlePaynow}
              disabled={loading || isPaymentLoading}
              className='px-8 py-3 bg-green-600 hover:bg-green-700 text-lg font-semibold'
            >
              {loading ? (
                <>
                  <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                  <span className='text-sm md:text-lg'>Creating Appointment...</span>
                </>
              ) : isPaymentLoading ? (
                <>
                  <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                  <span className='text-sm md:text-lg'>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className='w-5 h-5 mr-2' />
                  <span className='text-sm md:text-lg'>Pay ₹{totalAmount} & Book</span>
                </>
              )}
            </Button>
        </div>
      )}
    </div>
  )
}

export default PaymentStep
