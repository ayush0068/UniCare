import { Doctor } from '@/lib/types';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Award, BadgeCheck, Clock, Heart, MapPin, Star } from 'lucide-react';

interface DoctorProfileInterface {
  doctor: Doctor;
}

const DoctorProfile = ({ doctor }: DoctorProfileInterface) => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        @keyframes card-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-animate { animation: card-in 0.55s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes badge-pop {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        .badge-pop { animation: badge-pop 0.4s cubic-bezier(0.16,1,0.3,1) 0.3s both; }

        .cat-badge {
          transition: all 0.18s ease;
        }
        .cat-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(14,165,233,0.15);
        }

        @keyframes fee-shine {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <div className='uc-font card-animate sticky top-24 rounded-3xl overflow-hidden border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.08)] bg-white'>

        {/* ─── Hero Banner ─────────────────────────── */}
        <div className='relative h-24 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 overflow-hidden'>
          {/* Subtle pattern */}
          <div className='absolute inset-0 opacity-10' style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className='absolute bottom-0 right-0 w-40 h-40 bg-sky-500/10 rounded-full blur-2xl' />
        </div>

        {/* ─── Avatar overlapping banner ───────────── */}
        <div className='px-6 pb-6 pt-0'>
          <div className='relative -mt-12 flex flex-col items-center mb-5'>
            <div className='relative'>
              <Avatar className='h-24 w-24 ring-4 ring-white shadow-xl'>
                <AvatarImage src={doctor?.profileImage} alt={doctor?.name} className='object-cover' />
                <AvatarFallback className='bg-gradient-to-br from-sky-400 to-sky-600 text-2xl font-bold text-white'>
                  {doctor?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {doctor.isVerified && (
                <div className='badge-pop absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-md'>
                  <BadgeCheck className='w-4 h-4 text-white' />
                </div>
              )}
            </div>

            {doctor.isVerified && (
              <span className='mt-2.5 flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700'>
                <BadgeCheck className='h-3 w-3' />
                Verified Doctor
              </span>
            )}
          </div>

          {/* ─── Name & Meta ─────────────────────── */}
          <div className='text-center mb-5'>
            <h2 className='uc-serif text-xl font-bold text-slate-900 leading-tight'>{doctor.name}</h2>
            <p className='text-sky-600 text-sm font-semibold mt-0.5'>{doctor.specialization}</p>
            <p className='text-slate-400 text-xs mt-0.5 font-medium'>{doctor.qualification}</p>
          </div>

          {/* ─── Stats Row ───────────────────────── */}
          <div className='grid grid-cols-3 gap-3 mb-5'>
            {[
              {
                top: (
                  <div className='flex gap-px justify-center'>
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className='h-3.5 w-3.5 fill-amber-400 text-amber-400' />
                    ))}
                  </div>
                ),
                bottom: '5.0 Rating',
              },
              { top: <span className='uc-serif text-lg font-bold text-slate-900'>{doctor.experience}+</span>, bottom: 'Yrs Exp.' },
              { top: <span className='uc-serif text-lg font-bold text-slate-900'>New</span>, bottom: 'On Platform' },
            ].map((stat, i) => (
              <div key={i} className='bg-[#F8F7F4] rounded-2xl p-3 text-center border border-slate-100'>
                <div className='flex justify-center mb-1'>{stat.top}</div>
                <p className='text-[11px] text-slate-400 font-medium'>{stat.bottom}</p>
              </div>
            ))}
          </div>

          {/* ─── Category Badges ─────────────────── */}
          {doctor.category?.length > 0 && (
            <div className='flex flex-wrap gap-1.5 mb-5 justify-center'>
              {doctor.category.map((cat, idx) => (
                <span
                  key={idx}
                  className='cat-badge inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-xl cursor-default'
                >
                  <Award className='h-3 w-3' />
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* ─── Divider ─────────────────────────── */}
          <div className='h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-5' />

          {/* ─── About ───────────────────────────── */}
          <div className='mb-5'>
            <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2'>About</p>
            <p className='text-sm text-slate-600 leading-relaxed'>{doctor.about}</p>
          </div>

          {/* ─── Hospital Info ───────────────────── */}
          {doctor.hospitalInfo && (
            <div className='mb-5 bg-[#F8F7F4] rounded-2xl p-4 border border-slate-100'>
              <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5'>Hospital / Clinic</p>
              <p className='text-sm font-bold text-slate-800 leading-tight'>{doctor.hospitalInfo.name}</p>
              <p className='text-xs text-slate-500 mt-1'>{doctor.hospitalInfo.address}</p>
              <div className='flex items-center gap-1.5 mt-2'>
                <MapPin className='h-3.5 w-3.5 text-sky-400 flex-shrink-0' />
                <span className='text-xs text-slate-500'>{doctor.hospitalInfo.city}</span>
              </div>
            </div>
          )}

          {/* ─── Consultation Fee Card ───────────── */}
          <div className='relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white'>
            <div className='absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none' />
            <div className='relative z-10 flex items-center justify-between'>
              <div>
                <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>Consultation Fee</p>
                <p className='uc-serif text-3xl font-bold text-white mt-1 tracking-tight'>{doctor.fees}</p>
                <div className='flex items-center gap-1.5 mt-1.5'>
                  <Clock className='h-3.5 w-3.5 text-sky-400' />
                  <span className='text-xs text-slate-400 font-medium'>{doctor.slotDurationMinutes} min session</span>
                </div>
              </div>
              <div className='w-12 h-12 bg-sky-500/15 border border-sky-500/20 rounded-2xl flex items-center justify-center'>
                <Heart className='h-6 w-6 text-sky-400' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DoctorProfile;