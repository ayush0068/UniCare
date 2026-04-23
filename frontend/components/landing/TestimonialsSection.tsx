'use client';
import { testimonials } from '@/lib/constant';
import React, { useEffect, useRef } from 'react';
import { Quote } from 'lucide-react';

const Stars = ({ count }: { count: number }) => (
  <div className='flex gap-0.5'>
    {[...Array(5)].map((_, i) => (
      <svg key={i} className={`w-3.5 h-3.5 ${i < count ? 'text-amber-400' : 'text-slate-200'}`} fill='currentColor' viewBox='0 0 24 24'>
        <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
      </svg>
    ))}
  </div>
);

const AVATAR_COLORS = [
  'from-violet-400 to-purple-600',
  'from-sky-400 to-blue-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-emerald-600',
  'from-indigo-400 to-blue-600',
];

const TestimonialsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll<HTMLElement>('[data-scroll-reveal]').forEach((node, i) => {
              setTimeout(() => { node.style.opacity = '1'; node.style.transform = 'translateY(0)'; }, i * 80);
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const featured = testimonials[0];
  const rest = testimonials.slice(1);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,300;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        [data-scroll-reveal] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1);
        }

        .review-card {
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease, border-color 0.2s ease;
        }
        .review-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(14,165,233,0.10), 0 4px 12px rgba(0,0,0,0.06);
          border-color: rgba(186,230,253,0.8);
        }

        @keyframes rating-scale {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        .rating-animate { animation: rating-scale 0.5s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
      `}</style>

      <section className='uc-font py-24 px-4 sm:px-6 lg:px-8 bg-white' ref={sectionRef}>
        <div className='max-w-7xl mx-auto'>

          {/* ─── Section Header ────────────────────── */}
          <div className='flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16' data-scroll-reveal>
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-500 mb-3'>Patient Stories</p>
              <h2 className='uc-serif text-4xl md:text-5xl font-bold text-slate-900 leading-tight'>
                Real People,<br />
                <em className='not-italic text-sky-500'>Real Results</em>
              </h2>
            </div>
            {/* Aggregate rating pill */}
            <div className='rating-animate flex-shrink-0 flex items-center gap-5 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4'>
              <div className='text-center'>
                <p className='uc-serif text-4xl font-bold text-slate-900 leading-none'>4.9</p>
                <div className='flex gap-0.5 mt-1.5 justify-center'>
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className='w-3.5 h-3.5 text-amber-400' fill='currentColor' viewBox='0 0 24 24'>
                      <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
                    </svg>
                  ))}
                </div>
              </div>
              <div className='w-px h-10 bg-slate-200' />
              <div>
                <p className='text-2xl font-bold text-slate-900'>80K+</p>
                <p className='text-xs text-slate-400 font-medium'>Verified reviews</p>
              </div>
            </div>
          </div>

          {/* ─── Featured testimonial (large) ──────── */}
          <div data-scroll-reveal>
            <div className='relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 mb-6 overflow-hidden'>
              {/* Background glow */}
              <div className='absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none' />
              <div className='absolute bottom-0 left-0 w-60 h-60 bg-blue-600/8 rounded-full blur-2xl pointer-events-none' />

              <div className='relative z-10 grid md:grid-cols-[1fr_auto] gap-8 items-end'>
                <div>
                  <Quote className='w-10 h-10 text-sky-400/60 mb-6' />
                  <p className='uc-serif text-2xl md:text-3xl text-white font-light italic leading-relaxed max-w-2xl'>
                    "{featured?.text}"
                  </p>
                  <div className='flex items-center gap-3 mt-8'>
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[0]} flex items-center justify-center text-white font-bold text-base flex-shrink-0`}>
                      {featured?.author?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className='text-white font-semibold text-sm'>{featured?.author}</p>
                      <p className='text-slate-400 text-xs'>{featured?.location}</p>
                    </div>
                  </div>
                </div>
                <div className='flex flex-col items-end gap-3 flex-shrink-0'>
                  <Stars count={featured?.rating || 5} />
                  <span className='text-xs text-slate-400 font-medium'>Verified Patient</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Testimonial Grid ──────────────────── */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'>
            {rest.map((testimonial, index) => (
              <div
                key={index}
                data-scroll-reveal
                className='review-card bg-white rounded-2xl p-6 border border-slate-100 shadow-sm cursor-default'
              >
                <div className='flex items-start justify-between mb-4'>
                  <Stars count={testimonial.rating} />
                  <Quote className='w-5 h-5 text-slate-100 flex-shrink-0' />
                </div>

                <p className='text-slate-600 text-sm leading-relaxed mb-6 line-clamp-4'>
                  "{testimonial.text}"
                </p>

                <div className='flex items-center gap-3 pt-4 border-t border-slate-50'>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[(index + 1) % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {testimonial.author?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-slate-900 leading-none'>{testimonial.author}</p>
                    <p className='text-xs text-slate-400 mt-0.5'>{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── View All ──────────────────────────── */}
          <div className='text-center mt-12' data-scroll-reveal>
            <button className='group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-sky-600 transition-colors duration-200'>
              View all patient reviews
              <svg className='w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 8l4 4m0 0l-4 4m4-4H3' />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default TestimonialsSection;