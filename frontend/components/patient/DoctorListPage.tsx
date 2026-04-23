'use client'
import { DoctorFilters } from '@/lib/types';
import { useDoctorStore } from '@/store/doctorStore';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Header from '../landing/Header';
import {
  BadgeCheck, ChevronRight, Clock, MapPin,
  Search, Star, SlidersHorizontal, X, Stethoscope,
  Users, Award, ArrowUpDown, RotateCcw,
} from 'lucide-react';
import { cities, healthcareCategories, specializations } from '@/lib/constant';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Link from 'next/link';

/* ─── Fix: force re-fetch on every mount (back-nav included) ─── */
const DEFAULT_FILTERS = (cat: string): DoctorFilters => ({
  search: '', specialization: '', category: cat,
  city: '', sortBy: 'experience', sortOrder: 'desc',
});

const DoctorListPage = () => {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') ?? '';
  const { doctors, loading, fetchDoctors } = useDoctorStore();

  const [filters, setFilters] = useState<DoctorFilters>(DEFAULT_FILTERS(categoryParam));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  /* Always fetch on mount so back-navigation shows fresh results */
  const mountedRef = useRef(false);
  useEffect(() => {
    fetchDoctors(filters);
    mountedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Re-fetch whenever filters change (after initial mount) */
  useEffect(() => {
    if (mountedRef.current) {
      fetchDoctors(filters);
    }
  }, [filters, fetchDoctors]);

  const set = (key: keyof DoctorFilters, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters(DEFAULT_FILTERS(categoryParam));

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== 'sortBy' && k !== 'sortOrder'
  ).length;

  /* ─────────────────── Sub-components ─────────────────── */

  const FilterSidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`${mobile ? 'w-full' : 'w-64 xl:w-72 flex-shrink-0'} space-y-6`}>

      {/* Search */}
      <div>
        <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2'>Search</p>
        <div className='relative'>
          <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400' />
          <input
            type='text'
            placeholder='Name, specialty...'
            value={filters.search || ''}
            onChange={e => set('search', e.target.value)}
            className='w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all duration-200'
          />
          {filters.search && (
            <button onClick={() => set('search', '')} className='absolute right-3 top-1/2 -translate-y-1/2'>
              <X className='w-3.5 h-3.5 text-slate-400 hover:text-slate-700 transition-colors' />
            </button>
          )}
        </div>
      </div>

      {/* Specialization */}
      <div>
        <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2'>Specialization</p>
        <Select value={filters.specialization || ''} onValueChange={v => set('specialization', v === 'all' ? '' : v)}>
          <SelectTrigger className='rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-700 focus:ring-sky-100 focus:border-sky-400'>
            <SelectValue placeholder='All Specializations' />
          </SelectTrigger>
          <SelectContent className='rounded-2xl border-slate-100 shadow-2xl max-h-64'>
            <SelectItem value='all' className='text-sm rounded-xl'>All Specializations</SelectItem>
            {specializations.map(s => (
              <SelectItem key={s} value={s} className='text-sm rounded-xl'>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location */}
      <div>
        <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2'>Location</p>
        <Select value={filters.city || ''} onValueChange={v => set('city', v === 'all' ? '' : v)}>
          <SelectTrigger className='rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-700 focus:ring-sky-100 focus:border-sky-400'>
            <SelectValue placeholder='All Locations' />
          </SelectTrigger>
          <SelectContent className='rounded-2xl border-slate-100 shadow-2xl max-h-64'>
            <SelectItem value='all' className='text-sm rounded-xl'>All Locations</SelectItem>
            {cities.map(c => (
              <SelectItem key={c} value={c} className='text-sm rounded-xl'>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort */}
      <div>
        <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2'>Sort By</p>
        <Select value={filters.sortBy || 'experience'} onValueChange={v => set('sortBy', v)}>
          <SelectTrigger className='rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-700 focus:ring-sky-100 focus:border-sky-400'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className='rounded-2xl border-slate-100 shadow-2xl'>
            <SelectItem value='experience' className='text-sm rounded-xl'>Experience</SelectItem>
            <SelectItem value='fees'       className='text-sm rounded-xl'>Consultation Fee</SelectItem>
            <SelectItem value='name'       className='text-sm rounded-xl'>Name A–Z</SelectItem>
            <SelectItem value='createdAt'  className='text-sm rounded-xl'>Newest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category quick-filter */}
      <div>
        <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3'>Specialty Area</p>
        <div className='flex flex-col gap-1.5'>
          <button
            onClick={() => set('category', '')}
            className={`w-full text-left text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-150 ${
              !filters.category ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Specialties
          </button>
          {healthcareCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => set('category', filters.category === cat.title ? '' : cat.title)}
              className={`w-full text-left flex items-center gap-2.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-150 ${
                filters.category === cat.title ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className={`w-5 h-5 ${cat.color} rounded-md flex items-center justify-center flex-shrink-0`}>
                <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 24 24'>
                  <path d={cat.icon} />
                </svg>
              </div>
              {cat.title}
            </button>
          ))}
        </div>
      </div>

      {/* Clear */}
      {activeCount > 0 && (
        <button
          onClick={clearFilters}
          className='w-full flex items-center justify-center gap-2 text-xs font-bold text-red-500 border border-red-100 hover:border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition-all duration-200'
        >
          <RotateCcw className='w-3.5 h-3.5' />
          Clear All Filters
        </button>
      )}
    </aside>
  );

  /* ─── Doctor Card – Grid view ─── */
  const DoctorCardGrid = ({ doctor, idx }: { doctor: any; idx: number }) => (
    <div
      className='doctor-card bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm'
      style={{ animationDelay: `${idx * 0.055}s` }}
    >
      {/* Gradient header */}
      <div className='relative h-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 overflow-hidden'>
        <div className='absolute inset-0 opacity-[0.06]' style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
        <div className='absolute bottom-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl' />
        {/* Availability pill */}
        <div className='absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-full'>
          <span className='w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse' />
          <span className='text-[10px] font-bold text-emerald-300'>Available</span>
        </div>
      </div>

      <div className='px-5 pb-5 pt-0'>
        {/* Avatar overlap */}
        <div className='flex justify-center -mt-9 mb-3'>
          <div className='relative'>
            <Avatar className='w-[72px] h-[72px] ring-[3px] ring-white shadow-lg'>
              <AvatarImage src={doctor.profileImage} alt={doctor.name} className='object-cover' />
              <AvatarFallback className='bg-gradient-to-br from-sky-400 to-sky-600 text-white text-xl font-bold'>
                {doctor.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {doctor.isVerified && (
              <div className='absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center'>
                <BadgeCheck className='w-3 h-3 text-white' />
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div className='text-center mb-3'>
          <h3 className='uc-serif font-bold text-slate-900 text-[15px] leading-tight'>{doctor.name}</h3>
          <p className='text-sky-600 text-xs font-semibold mt-0.5'>{doctor.specialization}</p>
          <p className='text-slate-400 text-[11px] mt-0.5'>{doctor.qualification}</p>
        </div>

        {/* Stats row */}
        <div className='grid grid-cols-3 gap-2 mb-3'>
          {[
            { icon: Star, label: '5.0', sub: 'Rating' },
            { icon: Clock, label: `${doctor.experience}yr`, sub: 'Exp.' },
            { icon: Users, label: '200+', sub: 'Patients' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={sub} className='flex flex-col items-center bg-[#F8F7F4] rounded-xl py-2 border border-slate-100'>
              <Icon className='w-3 h-3 text-sky-400 mb-0.5' />
              <span className='text-xs font-bold text-slate-800'>{label}</span>
              <span className='text-[10px] text-slate-400'>{sub}</span>
            </div>
          ))}
        </div>

        {/* Location + Fee */}
        <div className='flex items-center justify-between mb-4 px-1'>
          <div className='flex items-center gap-1.5 text-xs text-slate-400'>
            <MapPin className='w-3 h-3 text-sky-300' />
            <span className='truncate max-w-[100px]'>{doctor.hospitalInfo?.city}</span>
          </div>
          <span className='text-sm font-extrabold text-emerald-600'>₹{doctor.fees}</span>
        </div>

        {/* Tags */}
        {doctor.category?.length > 0 && (
          <div className='flex flex-wrap gap-1.5 mb-4'>
            {doctor.category.slice(0, 2).map((cat: string, i: number) => (
              <span key={i} className='text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-lg'>
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <Link href={`/patient/booking/${doctor._id}`} className='block'>
          <button className='w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-sky-600 text-white text-xs font-bold py-3 rounded-2xl shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md hover:shadow-sky-300/30 group'>
            Book Appointment
            <ChevronRight className='w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform' />
          </button>
        </Link>
      </div>
    </div>
  );

  /* ─── Doctor Card – List view ─── */
  const DoctorCardList = ({ doctor, idx }: { doctor: any; idx: number }) => (
    <div
      className='doctor-card bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden'
      style={{ animationDelay: `${idx * 0.05}s` }}
    >
      <div className='flex items-center gap-5 p-5'>
        {/* Avatar */}
        <div className='relative flex-shrink-0'>
          <Avatar className='w-16 h-16 ring-2 ring-slate-100'>
            <AvatarImage src={doctor.profileImage} alt={doctor.name} className='object-cover' />
            <AvatarFallback className='bg-gradient-to-br from-sky-400 to-sky-600 text-white text-lg font-bold'>
              {doctor.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {doctor.isVerified && (
            <div className='absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center'>
              <BadgeCheck className='w-3 h-3 text-white' />
            </div>
          )}
        </div>

        {/* Info */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h3 className='uc-serif font-bold text-slate-900 text-base leading-tight'>{doctor.name}</h3>
              <p className='text-sky-600 text-xs font-semibold mt-0.5'>{doctor.specialization} · {doctor.qualification}</p>
              <div className='flex items-center gap-3 mt-1.5'>
                <div className='flex items-center gap-1'>
                  {[...Array(5)].map((_, i) => <Star key={i} className='w-3 h-3 fill-amber-400 text-amber-400' />)}
                  <span className='text-xs font-bold text-slate-700 ml-1'>5.0</span>
                </div>
                <span className='text-slate-200'>|</span>
                <span className='text-xs text-slate-400'>{doctor.experience} yrs exp.</span>
                <span className='text-slate-200 hidden sm:block'>|</span>
                <div className='hidden sm:flex items-center gap-1 text-xs text-slate-400'>
                  <MapPin className='w-3 h-3' />{doctor.hospitalInfo?.city}
                </div>
              </div>
              {doctor.category?.length > 0 && (
                <div className='flex flex-wrap gap-1 mt-2'>
                  {doctor.category.slice(0, 3).map((c: string, i: number) => (
                    <span key={i} className='text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-lg'>{c}</span>
                  ))}
                </div>
              )}
            </div>
            <div className='flex flex-col items-end gap-2 flex-shrink-0'>
              <span className='text-lg font-extrabold text-emerald-600'>₹{doctor.fees}</span>
              <div className='flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg font-bold'>
                <span className='w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse' />
                Available
              </div>
              <Link href={`/patient/booking/${doctor._id}`} className='block'>
                <button className='flex items-center gap-1.5 bg-slate-900 hover:bg-sky-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200 hover:shadow-md hover:shadow-sky-200 group whitespace-nowrap'>
                  Book Now
                  <ChevronRight className='w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform' />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── Skeleton ─── */
  const Skeleton = () => (
    <>
      {viewMode === 'grid' ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'>
          {[...Array(6)].map((_, i) => (
            <div key={i} className='bg-white rounded-3xl border border-slate-100 overflow-hidden' style={{ animationDelay: `${i * 0.05}s` }}>
              <div className='h-20 skeleton' />
              <div className='p-5 space-y-3'>
                <div className='flex justify-center'><div className='w-16 h-16 rounded-full skeleton' /></div>
                <div className='skeleton h-4 w-3/5 mx-auto rounded-xl' />
                <div className='skeleton h-3 w-2/5 mx-auto rounded-xl' />
                <div className='grid grid-cols-3 gap-2'>{[...Array(3)].map((_, j) => <div key={j} className='h-12 skeleton rounded-xl' />)}</div>
                <div className='skeleton h-10 w-full rounded-2xl' />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='space-y-3'>
          {[...Array(5)].map((_, i) => (
            <div key={i} className='bg-white rounded-2xl border border-slate-100 p-5'>
              <div className='flex items-center gap-5'>
                <div className='w-16 h-16 rounded-full skeleton flex-shrink-0' />
                <div className='flex-1 space-y-2'>
                  <div className='skeleton h-4 w-2/5 rounded-xl' />
                  <div className='skeleton h-3 w-1/3 rounded-xl' />
                  <div className='skeleton h-3 w-1/2 rounded-xl' />
                </div>
                <div className='skeleton w-20 h-9 rounded-xl flex-shrink-0' />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  /* ════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        @keyframes card-rise {
          from { opacity: 0; transform: translateY(16px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .doctor-card { animation: card-rise 0.45s cubic-bezier(0.16,1,0.3,1) both; transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, border-color 0.2s ease; }
        .doctor-card:hover { transform: translateY(-4px); box-shadow: 0 20px 50px rgba(14,165,233,0.11), 0 4px 16px rgba(0,0,0,0.05); border-color: #bae6fd; }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: 10px;
        }

        @keyframes mob-slide {
          from { opacity: 0; transform: translateX(-100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .mob-sidebar { animation: mob-slide 0.3s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes hero-in {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-in { animation: hero-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div className='uc-font min-h-screen bg-[#F8F7F4]'>
        <Header />

        {/* ═══════════════ HERO SEARCH STRIP ═══════════════ */}
        <div className='hero-in pt-16 bg-slate-950 relative overflow-hidden'>
          <div className='absolute inset-0 opacity-[0.04]' style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
          <div className='absolute top-0 right-0 w-96 h-96 bg-sky-500/8 rounded-full blur-3xl pointer-events-none' />
          <div className='absolute bottom-0 left-1/4 w-64 h-64 bg-blue-600/6 rounded-full blur-2xl pointer-events-none' />

          <div className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
            <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-3'>Find Care</p>
            <h1 className='uc-serif text-4xl md:text-5xl font-bold text-white leading-tight mb-2'>
              Choose Your <em className='not-italic text-sky-400'>Doctor</em>
            </h1>
            <p className='text-slate-400 text-sm mb-8 max-w-md'>
              Browse from {loading ? '…' : doctors.length}+ verified specialists and book instantly.
            </p>

            {/* Search bar */}
            <div className='flex gap-3 max-w-2xl'>
              <div className='flex-1 relative'>
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                <input
                  type='text'
                  placeholder='Search by name, specialty, or condition...'
                  value={filters.search || ''}
                  onChange={e => set('search', e.target.value)}
                  className='w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/10 text-white placeholder:text-slate-500 text-sm font-medium focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 focus:border-sky-400 focus:outline-none transition-all duration-300'
                />
              </div>
              {/* Mobile filter toggle */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className='lg:hidden flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-white/10 border-2 border-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-all duration-200'
              >
                <SlidersHorizontal className='w-4 h-4' />
                {activeCount > 0 && (
                  <span className='w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center'>
                    {activeCount}
                  </span>
                )}
              </button>
            </div>

            {/* Active filter chips */}
            {activeCount > 0 && (
              <div className='flex flex-wrap gap-2 mt-4'>
                {filters.category && (
                  <span className='flex items-center gap-1.5 text-[11px] font-bold bg-sky-500/20 border border-sky-500/30 text-sky-300 px-3 py-1 rounded-full'>
                    {filters.category}
                    <button onClick={() => set('category', '')} className='hover:text-white'><X className='w-3 h-3' /></button>
                  </span>
                )}
                {filters.specialization && (
                  <span className='flex items-center gap-1.5 text-[11px] font-bold bg-sky-500/20 border border-sky-500/30 text-sky-300 px-3 py-1 rounded-full'>
                    {filters.specialization}
                    <button onClick={() => set('specialization', '')} className='hover:text-white'><X className='w-3 h-3' /></button>
                  </span>
                )}
                {filters.city && (
                  <span className='flex items-center gap-1.5 text-[11px] font-bold bg-sky-500/20 border border-sky-500/30 text-sky-300 px-3 py-1 rounded-full'>
                    {filters.city}
                    <button onClick={() => set('city', '')} className='hover:text-white'><X className='w-3 h-3' /></button>
                  </span>
                )}
                <button onClick={clearFilters} className='text-[11px] font-bold text-red-400 hover:text-red-300 px-3 py-1 rounded-full border border-red-400/30 hover:bg-red-500/10 transition-all duration-200'>
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════ MAIN LAYOUT ══════════════════════ */}
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='flex gap-8'>

            {/* ── Desktop Sidebar ─── */}
            <div className='hidden lg:block sticky top-20 self-start'>
              <div className='w-64 xl:w-72 bg-white rounded-3xl border border-slate-100 shadow-sm p-5'>
                <div className='flex items-center gap-2 mb-5'>
                  <SlidersHorizontal className='w-4 h-4 text-sky-500' />
                  <span className='text-sm font-bold text-slate-900'>Filters</span>
                  {activeCount > 0 && (
                    <span className='ml-auto text-[11px] font-bold text-sky-600 bg-sky-50 border border-sky-100 w-5 h-5 rounded-full flex items-center justify-center'>
                      {activeCount}
                    </span>
                  )}
                </div>
                <FilterSidebar />
              </div>
            </div>

            {/* ── Results Area ─── */}
            <div className='flex-1 min-w-0'>

              {/* Results toolbar */}
              <div className='flex items-center justify-between mb-5 gap-4 flex-wrap'>
                <p className='text-sm font-semibold text-slate-500'>
                  {loading
                    ? <span className='flex items-center gap-2'><span className='w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin inline-block' />Searching...</span>
                    : <><span className='text-slate-900 font-bold text-base'>{doctors.length}</span> {doctors.length === 1 ? 'doctor' : 'doctors'} found</>
                  }
                </p>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${viewMode === 'grid' ? 'bg-sky-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-700'}`}
                    aria-label='Grid view'
                  >
                    <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 16 16'>
                      <rect x='1' y='1' width='6' height='6' rx='1.5' /><rect x='9' y='1' width='6' height='6' rx='1.5' />
                      <rect x='1' y='9' width='6' height='6' rx='1.5' /><rect x='9' y='9' width='6' height='6' rx='1.5' />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${viewMode === 'list' ? 'bg-sky-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-700'}`}
                    aria-label='List view'
                  >
                    <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 16 16'>
                      <rect x='1' y='2' width='14' height='3' rx='1.5' /><rect x='1' y='7' width='14' height='3' rx='1.5' />
                      <rect x='1' y='12' width='14' height='3' rx='1.5' />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              {loading ? (
                <Skeleton />
              ) : doctors.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'>
                    {doctors.map((doctor, i) => (
                      <DoctorCardGrid key={doctor._id} doctor={doctor} idx={i} />
                    ))}
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {doctors.map((doctor, i) => (
                      <DoctorCardList key={doctor._id} doctor={doctor} idx={i} />
                    ))}
                  </div>
                )
              ) : (
                <div className='flex flex-col items-center justify-center py-24 text-center'>
                  <div className='w-20 h-20 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center mb-5'>
                    <Stethoscope className='w-9 h-9 text-slate-300' />
                  </div>
                  <h3 className='uc-serif text-2xl font-bold text-slate-800 mb-2'>No Doctors Found</h3>
                  <p className='text-slate-400 text-sm max-w-xs mb-6'>
                    Try adjusting your search criteria or remove some filters to see more results.
                  </p>
                  <button
                    onClick={clearFilters}
                    className='flex items-center gap-2 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 px-5 py-2.5 rounded-xl shadow-md shadow-sky-200 transition-all duration-200'
                  >
                    <RotateCcw className='w-4 h-4' />
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ Mobile Sidebar Overlay ═══════════════════════ */}
        {mobileSidebarOpen && (
          <>
            <div
              className='fixed inset-0 bg-black/40 z-40 lg:hidden'
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className='mob-sidebar fixed top-0 left-0 h-full w-[300px] bg-white z-50 lg:hidden shadow-2xl overflow-y-auto'>
              <div className='flex items-center justify-between px-5 py-4 border-b border-slate-100'>
                <div className='flex items-center gap-2'>
                  <SlidersHorizontal className='w-4 h-4 text-sky-500' />
                  <span className='text-sm font-bold text-slate-900'>Filters</span>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className='w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors'
                >
                  <X className='w-4 h-4 text-slate-600' />
                </button>
              </div>
              <div className='p-5'>
                <FilterSidebar mobile />
              </div>
              <div className='px-5 pb-6'>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className='w-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold py-3 rounded-2xl transition-colors duration-200'
                >
                  Show {doctors.length} Results
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default DoctorListPage;