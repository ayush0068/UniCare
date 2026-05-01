'use client'

import { consultationTypes } from '@/lib/constant';
import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, ChevronRight, LogIn, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

interface ConsultationStepInterface {
  consultationType: string;
  setConsultationType: (type: string) => void;
  symptoms: string;
  setSymptoms: (symptoms: string) => void;
  doctorFees?: number;
  doctorId: string;
  discountType: 'none' | 'free' | 'half';
  isGuest?: boolean;
  onBack: () => void;
  onContinue: () => void;
}

const ConsultationStep = ({
  consultationType, setConsultationType,
  symptoms, setSymptoms,
  doctorFees, doctorId, discountType,
  isGuest = false,
  onBack, onContinue,
}: ConsultationStepInterface) => {
  const [textFocused, setTextFocused] = useState(false);

  const getConsultationPrice = (selectedType = consultationType) => {
    const typeAddon = consultationTypes.find(ct => ct.type === selectedType)?.price || 0;
    const base = Math.max(0, doctorFees + typeAddon);
    if (isGuest) return base; // guests never get discounts
    if (discountType === 'free') return 0;
    if (discountType === 'half') return Math.ceil(base / 2);
    return base;
  };

  const getOriginalPrice = (selectedType = consultationType) => {
    const typeAddon = consultationTypes.find(ct => ct.type === selectedType)?.price || 0;
    return Math.max(0, doctorFees + typeAddon);
  };

  // Guests never see loyalty discount UI
  const hasDiscount = !isGuest && discountType !== 'none';
  const isFree = !isGuest && discountType === 'free';
  const isHalf = !isGuest && discountType === 'half';
  const symLen = symptoms.trim().length;
  const symMax = 1000;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        @keyframes cs-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cs-animate { animation: cs-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes type-select {
          0%   { transform: scale(0.98); }
          50%  { transform: scale(1.01); }
          100% { transform: scale(1); }
        }
        .type-selected { animation: type-select 0.25s ease; }

        .type-card {
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
          cursor: pointer;
        }
        .type-card:hover:not(.type-card-selected) {
          border-color: #bae6fd;
          background-color: #f0f9ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(14,165,233,0.10);
        }
        .type-card-selected {
          border-color: #0ea5e9;
          background-color: #f0f9ff;
          box-shadow: 0 0 0 3px rgba(14,165,233,0.15);
        }

        @keyframes banner-in {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .banner-animate { animation: banner-in 0.4s cubic-bezier(0.16,1,0.3,1) both; }

        .sym-textarea {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          resize: none;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .sym-textarea:focus {
          outline: none;
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
        }

        .continue-btn {
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .continue-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(14,165,233,0.28);
        }
        .continue-btn:not(:disabled):active { transform: translateY(0); }

        @keyframes price-change {
          from { opacity: 0.4; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .price-animate { animation: price-change 0.2s ease; }

        @keyframes sparkle-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .sparkle-spin { animation: sparkle-spin 3s linear infinite; }
      `}</style>

      <div className='uc-font cs-animate'>

        {/* ─── Header ───────────────────────────────── */}
         <div className='mb-8'>
           <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-500 mb-2'>Step 2 of 3</p>
           <h3 className='uc-serif text-3xl font-bold text-slate-900 leading-tight'>
             Consultation<br />
             <em className='not-italic text-sky-500'>Details</em>
           </h3>
         </div>

        {/* ─── Loyalty Discount Banner — registered patients only ──────────────── */}
        {hasDiscount && (
          <div className={`banner-animate flex items-start gap-4 p-5 rounded-2xl border mb-8 ${
            isFree
              ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100'
              : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-100'
          }`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
              isFree ? 'bg-emerald-500 shadow-emerald-200' : 'bg-amber-500 shadow-amber-200'
            }`}>
              {isFree
                ? <Sparkles className='w-5 h-5 text-white sparkle-spin' />
                : <Zap className='w-5 h-5 text-white' />
              }
            </div>
            <div className='flex-1 min-w-0'>
              <p className={`text-sm font-bold ${isFree ? 'text-emerald-800' : 'text-amber-800'}`}>
                {isFree ? '🎉 This consultation is FREE!' : '⚡ 50% Loyalty Discount Applied!'}
              </p>
              <p className={`text-xs mt-1 leading-relaxed ${isFree ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isFree
                  ? 'You get 2 free follow-up consultations within 10 days of your first booking with this doctor.'
                  : 'You get 50% off on your 3rd consultation within 10 days with this doctor.'
                }
              </p>
            </div>
          </div>
        )}

        {/* ─── Guest Notice Banner ──────────────── */}
        {isGuest && (
          <div className='banner-animate flex items-start gap-4 p-5 rounded-2xl border mb-8 bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200'>
            <div className='w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md bg-slate-700 shadow-slate-300'>
              <LogIn className='w-5 h-5 text-white' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-bold text-slate-800'>Booking as Guest</p>
              <p className='text-xs mt-1 leading-relaxed text-slate-500'>
                A <span className='font-semibold text-amber-600'>₹30 guest convenience fee</span> applies to this booking.
                Loyalty discounts are not available for guest sessions.{' '}
                <Link href='/signup/patient' className='text-sky-500 hover:underline font-semibold'>
                  Create a free account
                </Link>{' '}
                to unlock discounts and remove this fee.
              </p>
            </div>
          </div>
        )}

        {/* ─── Consultation Type Cards ──────────────── */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-4'>
            <p className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>Select Consultation Type</p>
          </div>

          <div className='space-y-3'>
            {consultationTypes.map(({ type, icon: Icon, description, price, recommended }) => {
              const currentPrice = getConsultationPrice(type);
              const originalPrice = getOriginalPrice(type);
              const isSelected = consultationType === type;

              return (
                <div
                  key={type}
                  onClick={() => setConsultationType(type)}
                  className={`type-card relative border-2 rounded-2xl p-5 ${
                    isSelected ? 'type-card-selected type-selected' : 'border-slate-200 bg-white'
                  }`}
                >
                  {recommended && (
                    <span className='absolute -top-2.5 left-5 inline-flex items-center gap-1 bg-sky-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md shadow-sky-200'>
                      <CheckCircle className='w-3 h-3' />
                      Recommended
                    </span>
                  )}

                  <div className='flex items-center gap-4'>
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                      isSelected ? 'bg-sky-500 shadow-md shadow-sky-200' : 'bg-slate-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    </div>

                    {/* Info */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <h4 className={`font-bold text-[15px] ${isSelected ? 'text-sky-700' : 'text-slate-800'}`}>
                          {type}
                        </h4>
                        {isSelected && (
                          <span className='w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center flex-shrink-0'>
                            <CheckCircle className='w-3.5 h-3.5 text-white' />
                          </span>
                        )}
                      </div>
                      <p className='text-xs text-slate-400 mt-0.5 leading-relaxed'>{description}</p>
                    </div>

                    {/* Price */}
                    <div className='text-right flex-shrink-0 price-animate'>
                      {isFree ? (
                        <div>
                          <p className='text-xs text-slate-400 line-through'>₹{originalPrice}</p>
                          <p className='text-base font-bold text-emerald-600'>FREE</p>
                        </div>
                      ) : isHalf ? (
                        <div>
                          <p className='text-xs text-slate-400 line-through'>₹{originalPrice}</p>
                          <p className='text-base font-bold text-amber-600'>₹{currentPrice}</p>
                        </div>
                      ) : (
                        <div>
                          <p className='text-base font-bold text-slate-800'>₹{currentPrice}</p>
                          {price !== 0 && !isGuest && (
                            <p className='text-[11px] text-emerald-600 font-semibold mt-0.5'>
                              Save ₹{Math.abs(price)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Selected Summary Strip ───────────────── */}
        {consultationType && (
          <div className={`flex items-center justify-between px-5 py-4 rounded-2xl mb-8 ${
            isFree
              ? 'bg-emerald-50 border border-emerald-100'
              : isHalf
                ? 'bg-amber-50 border border-amber-100'
                : isGuest
                  ? 'bg-slate-50 border border-slate-200'
                  : 'bg-sky-50 border border-sky-100'
          }`}>
            <div className='flex items-center gap-2'>
              <CheckCircle className={`w-4 h-4 ${isFree ? 'text-emerald-500' : isHalf ? 'text-amber-500' : 'text-sky-500'}`} />
              <span className={`text-sm font-semibold ${isFree ? 'text-emerald-700' : isHalf ? 'text-amber-700' : 'text-sky-700'}`}>
                {consultationType}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <span className={`text-base font-bold ${isFree ? 'text-emerald-600' : isHalf ? 'text-amber-600' : 'text-slate-900'}`}>
                {isFree ? 'FREE' : `₹${getConsultationPrice()}`}
              </span>
              {isGuest && (
                <span className='text-[11px] text-amber-600 font-semibold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg'>
                  +₹30 fee
                </span>
              )}
            </div>
          </div>
        )}

        {/* ─── Symptoms Textarea ────────────────────── */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-3'>
            <p className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>
              Describe Your Symptoms <span className='text-red-400'>*</span>
            </p>
            <span className={`text-[11px] font-medium ${symLen > symMax * 0.85 ? 'text-amber-500' : 'text-slate-400'}`}>
              {symLen}/{symMax}
            </span>
          </div>

          <div className={`relative rounded-2xl border-2 overflow-hidden bg-[#F8F7F4] transition-all duration-200 ${
            textFocused ? 'border-sky-400 bg-white shadow-[0_0_0_3px_rgba(14,165,233,0.12)]' : 'border-slate-200'
          }`}>
            <textarea
              id='symptoms'
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value.slice(0, symMax))}
              onFocus={() => setTextFocused(true)}
              onBlur={() => setTextFocused(false)}
              rows={5}
              maxLength={symMax}
              placeholder='Describe your symptoms, how long you have had them, relevant medical history, allergies, or any other concerns. The more detail you share, the better prepared your doctor will be...'
              className='sym-textarea w-full px-5 py-4 text-sm text-slate-700 placeholder:text-slate-300 bg-transparent border-none'
            />
            {/* char progress bar */}
            <div className='px-5 pb-3 flex items-center gap-2'>
              <div className='flex-1 h-1 bg-slate-200 rounded-full overflow-hidden'>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    symLen > symMax * 0.85 ? 'bg-amber-400' : 'bg-sky-400'
                  }`}
                  style={{ width: `${(symLen / symMax) * 100}%` }}
                />
              </div>
              {symLen >= 20 && (
                <span className='text-[10px] font-semibold text-emerald-500 flex items-center gap-1 flex-shrink-0'>
                  <CheckCircle className='w-3 h-3' />
                  Good detail
                </span>
              )}
            </div>
          </div>
          <p className='text-[11px] text-slate-400 mt-2 leading-relaxed'>
            Minimum 20 characters recommended for a useful consultation.
          </p>
        </div>

        {/* ─── Navigation Buttons ───────────────────── */}
        <div className='flex items-center justify-between pt-6 border-t border-slate-100'>
          <button
            onClick={onBack}
            className='flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors duration-200 group'
          >
            <ArrowLeft className='w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200' />
            Back
          </button>

          <button
            onClick={onContinue}
            disabled={!symptoms.trim() || symLen < 5}
            className='continue-btn flex items-center gap-2.5 bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-semibold text-sm px-7 py-3.5 rounded-2xl shadow-md shadow-sky-200/50 disabled:shadow-none disabled:cursor-not-allowed'
          >
            Continue to Schedule
            <ChevronRight className='w-4 h-4' />
          </button>
        </div>
      </div>
    </>
  );
};

export default ConsultationStep;