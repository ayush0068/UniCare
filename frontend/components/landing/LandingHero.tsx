'use client';
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { healthcareCategories } from '@/lib/constant';
import { useRouter } from 'next/navigation';
import { userAuthStore } from '@/store/authStore';
import { ArrowRight, Calendar, Clock, ShieldCheck, Star, Video } from 'lucide-react';

/* ─── Mock Doctor Card Data ───────────────────────────── */
const MOCK_DOCTORS = [
  { name: 'Dr. Sarah Mitchell', specialty: 'Cardiologist', rating: 4.9, reviews: 312, available: '10:00 AM', avatar: 'SM', color: 'from-violet-400 to-purple-600' },
  { name: 'Dr. James Patel', specialty: 'Neurologist', rating: 4.8, reviews: 228, available: '11:30 AM', avatar: 'JP', color: 'from-sky-400 to-blue-600' },
  { name: 'Dr. Aisha Raza', specialty: 'Dermatologist', rating: 5.0, reviews: 194, available: '2:00 PM', avatar: 'AR', color: 'from-rose-400 to-pink-600' },
];

const STATS = [
  { value: '500+', label: 'Verified Doctors' },
  { value: '50K+', label: 'Patients Helped' },
  { value: '4.9★', label: 'Average Rating' },
  { value: '24/7', label: 'Always Available' },
];

const LandingHero = () => {
  const { isAuthenticated } = userAuthStore();
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>('[data-reveal]').forEach((node, i) => {
      node.style.animationDelay = `${i * 0.1}s`;
    });
  }, []);

  const handleBookConsultation = () => {
    router.push(isAuthenticated ? '/doctor-list' : '/signup/patient');
  };

  const handleCategoryClick = (categoryTitle: string) => {
    router.push(isAuthenticated ? `/doctor-list?category=${categoryTitle}` : '/signup/patient');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,600;1,9..144,700&display=swap');
        .uc-font { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [data-reveal] { opacity: 0; animation: reveal-up 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }

        @keyframes card-float {
          0%,100% { transform: translateY(0) rotate(0.5deg); }
          50%      { transform: translateY(-10px) rotate(-0.3deg); }
        }
        .card-float { animation: card-float 5s ease-in-out infinite; }

        @keyframes card-float-slow {
          0%,100% { transform: translateY(0) rotate(-0.5deg); }
          50%      { transform: translateY(-7px) rotate(0.4deg); }
        }
        .card-float-slow { animation: card-float-slow 6s ease-in-out infinite 1.5s; }

        @keyframes blob-drift {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(20px,-15px) scale(1.05); }
          66%      { transform: translate(-15px,10px) scale(0.97); }
        }
        .blob-drift { animation: blob-drift 12s ease-in-out infinite; }
        .blob-drift-alt { animation: blob-drift 15s ease-in-out infinite reverse 3s; }

        @keyframes tick-in {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        .tick-animate { animation: tick-in 0.35s ease forwards; }

        @keyframes badge-pop {
          0%   { transform: scale(0.9) translateY(4px); opacity:0; }
          60%  { transform: scale(1.04); opacity:1; }
          100% { transform: scale(1) translateY(0); opacity:1; }
        }
        .badge-pop { animation: badge-pop 0.5s cubic-bezier(0.16,1,0.3,1) 0.8s both; }

        @keyframes stat-count {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stat-item { animation: stat-count 0.5s ease both; }

        .cat-btn:hover .cat-icon { transform: scale(1.1) rotate(-4deg); }
        .cat-icon { transition: transform 0.25s ease; }

        .dot-bg {
          background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
          background-size: 28px 28px;
        }
      `}</style>

      <section className='uc-font relative min-h-screen bg-[#F8F7F4] overflow-hidden flex flex-col' ref={heroRef}>

        {/* ─── Background ─────────────────────────────── */}
        <div className='absolute inset-0 dot-bg opacity-40 pointer-events-none' />
        <div className='blob-drift absolute top-[-120px] right-[-80px] w-[600px] h-[600px] bg-gradient-to-br from-sky-100/70 to-blue-50/50 rounded-full blur-3xl pointer-events-none' />
        <div className='blob-drift-alt absolute bottom-[-100px] left-[-60px] w-[400px] h-[400px] bg-gradient-to-tr from-teal-50/80 to-cyan-50/60 rounded-full blur-2xl pointer-events-none' />

        {/* ─── Main Grid ──────────────────────────────── */}
        <div className='relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 lg:px-8 pt-36 pb-16'>
          <div className='grid lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px] gap-16 items-center min-h-[calc(100vh-180px)]'>

            {/* ── Left Column ─────────────────────── */}
            <div className='space-y-8'>

              {/* Trust pill */}
              <div data-reveal className='inline-flex items-center gap-2 bg-white border border-sky-100 shadow-sm text-sky-700 text-xs font-semibold px-4 py-2 rounded-full'>
                <ShieldCheck className='w-3.5 h-3.5 text-sky-500' />
                Verified & Certified Medical Professionals
              </div>

              {/* Headline */}
              <div data-reveal>
                <h1 className='uc-serif text-[56px] md:text-[68px] lg:text-[72px] font-bold text-slate-900 leading-[1.04] tracking-tight'>
                  The Space
                  <br />
                  <em className='not-italic text-sky-500'>Where Doctors</em>
                  <br />
                  Listen — To You
                </h1>
              </div>

              <p data-reveal className='text-slate-500 text-lg leading-relaxed max-w-lg'>
                Connect with board-certified specialists in minutes. Get expert care from the comfort of your home — no waiting rooms, no hassle.
              </p>

              {/* CTAs */}
              <div data-reveal className='flex flex-wrap gap-3'>
                <button
                  onClick={handleBookConsultation}
                  className='group flex items-center gap-2.5 bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-sky-300/40 hover:shadow-sky-400/50 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0'
                >
                  <Video className='w-4 h-4' />
                  Book a Video Visit
                  <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform duration-200' />
                </button>
                <Link href='/login/doctor'>
                  <button className='flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-6 py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5'>
                    Login as Doctor
                  </button>
                </Link>
              </div>

              {/* Stats Row */}
              <div data-reveal className='grid grid-cols-4 gap-4 pt-4 border-t border-slate-200/70'>
                {STATS.map((s, i) => (
                  <div
                    key={i}
                    className='stat-item text-center'
                    style={{ animationDelay: `${0.6 + i * 0.1}s` }}
                  >
                    <p className='uc-serif text-2xl font-bold text-slate-900'>{s.value}</p>
                    <p className='text-[11px] text-slate-400 font-medium mt-0.5 leading-tight'>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Specialties */}
              <div data-reveal>
                <p className='text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3'>Browse Specialties</p>
                <div className='flex flex-wrap gap-2'>
                  {healthcareCategories.slice(0, 8).map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.title)}
                      className='cat-btn flex items-center gap-1.5 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-200 text-slate-700 hover:text-sky-700 text-xs font-medium px-3 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-px'
                    >
                      <div className={`cat-icon w-5 h-5 ${category.color} rounded-md flex items-center justify-center flex-shrink-0`}>
                        <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 24 24'>
                          <path d={category.icon} />
                        </svg>
                      </div>
                      {category.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right Column — Floating Doctor Cards ── */}
            <div className='relative hidden lg:flex flex-col gap-4 items-center' data-reveal>

              {/* Online indicator badge */}
              <div className='badge-pop absolute -top-4 right-6 z-20 flex items-center gap-2 bg-white border border-emerald-100 shadow-lg shadow-emerald-100/50 px-3.5 py-2 rounded-xl'>
                <span className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse' />
                <span className='text-xs font-semibold text-emerald-700'>Doctors Online Now</span>
              </div>

              {/* Featured doctor card */}
              <div className='card-float w-full bg-white rounded-3xl shadow-[0_20px_60px_rgba(14,165,233,0.15),0_4px_16px_rgba(0,0,0,0.06)] border border-sky-50 overflow-hidden'>
                <div className='bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-4 flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${MOCK_DOCTORS[0].color} flex items-center justify-center text-white font-bold text-base shadow-md`}>
                      {MOCK_DOCTORS[0].avatar}
                    </div>
                    <div>
                      <p className='text-white font-semibold text-sm'>{MOCK_DOCTORS[0].name}</p>
                      <p className='text-sky-200 text-xs font-medium'>{MOCK_DOCTORS[0].specialty}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-lg'>
                    <Star className='w-3 h-3 text-amber-300 fill-amber-300' />
                    <span className='text-white text-xs font-semibold'>{MOCK_DOCTORS[0].rating}</span>
                  </div>
                </div>
                <div className='p-5'>
                  <p className='text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3'>Available Slots — Today</p>
                  <div className='flex gap-2 flex-wrap mb-4'>
                    {['10:00 AM', '11:30 AM', '2:00 PM', '4:30 PM'].map((slot, i) => (
                      <button
                        key={slot}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${i === 0 ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-600 border border-slate-100'}`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleBookConsultation}
                    className='w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group'
                  >
                    <Calendar className='w-4 h-4' />
                    Book Appointment
                    <ArrowRight className='w-4 h-4 group-hover:translate-x-0.5 transition-transform' />
                  </button>
                </div>
              </div>

              {/* Secondary doctor cards stacked */}
              <div className='card-float-slow w-full grid grid-cols-2 gap-3'>
                {MOCK_DOCTORS.slice(1).map((doc) => (
                  <div
                    key={doc.name}
                    onClick={handleBookConsultation}
                    className='bg-white rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.07)] border border-slate-100 hover:border-sky-100 hover:shadow-[0_12px_40px_rgba(14,165,233,0.12)] transition-all duration-300 cursor-pointer group hover:-translate-y-0.5'
                  >
                    <div className='flex items-center gap-2.5 mb-3'>
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${doc.color} flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0`}>
                        {doc.avatar}
                      </div>
                      <div className='min-w-0'>
                        <p className='text-xs font-semibold text-slate-800 truncate leading-tight'>{doc.name}</p>
                        <p className='text-[11px] text-slate-400'>{doc.specialty}</p>
                      </div>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-1'>
                        <Star className='w-3 h-3 text-amber-400 fill-amber-400' />
                        <span className='text-xs font-semibold text-slate-700'>{doc.rating}</span>
                      </div>
                      <div className='flex items-center gap-1 text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-lg'>
                        <Clock className='w-3 h-3' />
                        {doc.available}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live consultation badge */}
              <div className='w-full flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl px-5 py-4 shadow-xl'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center'>
                    <Video className='w-5 h-5 text-sky-400' />
                  </div>
                  <div>
                    <p className='text-white text-sm font-semibold'>Video Consultation</p>
                    <p className='text-slate-400 text-xs'>HD quality, end-to-end encrypted</p>
                  </div>
                </div>
                <span className='text-xs font-semibold bg-emerald-500 text-white px-3 py-1.5 rounded-lg'>Live</span>
              </div>
            </div>
          </div>
        </div>

      </section>
    </>
  );
};

export default LandingHero;