'use client';
import { contactInfo, footerSections, socials } from '@/lib/constant';
import { ArrowRight, ShieldCheck, Stethoscope } from 'lucide-react';
import React, { useRef, useState } from 'react';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubscribe = () => {
    if (email.trim()) { setSubscribed(true); setEmail(''); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,300;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        .footer-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0;
          transition: color 0.2s ease, gap 0.2s ease;
        }
        .footer-link:hover { gap: 4px; }
        .footer-link-arrow {
          opacity: 0;
          transform: translateX(-4px);
          transition: opacity 0.2s ease, transform 0.2s ease;
          width: 0;
          overflow: hidden;
        }
        .footer-link:hover .footer-link-arrow {
          opacity: 1;
          transform: translateX(0);
          width: 12px;
        }

        @keyframes subscribe-pop {
          0%   { transform: scale(0.9); opacity: 0; }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .subscribe-success { animation: subscribe-pop 0.4s cubic-bezier(0.16,1,0.3,1) both; }

        .social-icon {
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), background 0.2s ease;
        }
        .social-icon:hover { transform: translateY(-3px) scale(1.1); }

        .footer-grid-line {
          background: linear-gradient(90deg, transparent, rgba(148,163,184,0.2), transparent);
          height: 1px;
        }
      `}</style>

      <footer className='uc-font bg-slate-950 overflow-hidden'>

        {/* ─── Brand Statement Strip ──────────────── */}
        <div className='relative border-b border-slate-800/60 overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-br from-sky-950/40 via-transparent to-blue-950/20 pointer-events-none' />
          <div className='absolute top-0 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none' />
          <div className='max-w-7xl mx-auto px-6 lg:px-8 py-20 relative z-10'>
            <div className='flex flex-col lg:flex-row lg:items-end justify-between gap-10'>
              <div className='max-w-2xl'>
                <div className='flex items-center gap-2 mb-6'>
                  <ShieldCheck className='w-4 h-4 text-sky-400' />
                  <span className='text-xs font-semibold uppercase tracking-widest text-sky-400'>Trusted Healthcare Platform</span>
                </div>
                <h2 className='uc-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight'>
                  Healthcare that<br />
                  <em className='not-italic text-sky-400'>puts you first —</em><br />
                  <span className='text-slate-300 font-light italic text-[0.85em]'>always.</span>
                </h2>
              </div>
              <div className='flex-shrink-0'>
                <div className='space-y-3'>
                  <p className='text-slate-400 text-sm font-medium'>Stay up to date with UniCare+</p>
                  {subscribed ? (
                    <div className='subscribe-success flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-2xl text-sm font-semibold'>
                      <ShieldCheck className='w-4 h-4' />
                      You're subscribed!
                    </div>
                  ) : (
                    <div className='flex gap-2'>
                      <input
                        ref={inputRef}
                        type='email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                        placeholder='Enter your email'
                        className='bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 min-w-[220px] transition-all duration-200'
                      />
                      <button
                        onClick={handleSubscribe}
                        className='flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all duration-200 hover:-translate-y-px group shadow-lg shadow-sky-500/20'
                      >
                        Subscribe
                        <ArrowRight className='w-4 h-4 group-hover:translate-x-0.5 transition-transform' />
                      </button>
                    </div>
                  )}
                  <p className='text-slate-600 text-[11px]'>No spam, unsubscribe any time.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Links Grid ─────────────────────────── */}
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-16'>
          <div className='grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12'>

            {/* Brand column */}
            <div className='space-y-6'>
              <div className='flex items-center gap-2.5'>
                <div className='w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-[10px] flex items-center justify-center shadow-lg shadow-sky-500/20'>
                  <Stethoscope className='w-[17px] h-[17px] text-white' />
                </div>
                <span className='uc-serif text-[18px] font-bold text-white tracking-tight'>
                  Uni<span className='text-sky-400'>Care</span>
                  <sup className='text-slate-500 font-light text-[11px]'>+</sup>
                </span>
              </div>
              <p className='text-slate-500 text-sm leading-relaxed'>
                Quality medical services around the clock, wherever you are.
              </p>
              <div className='space-y-3'>
                {contactInfo.map((item, i) => (
                  <div key={i} className='flex items-center gap-3 group'>
                    <div className='w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-sky-500/10 flex items-center justify-center flex-shrink-0 transition-colors duration-200'>
                      <item.icon className='w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition-colors duration-200' />
                    </div>
                    <span className='text-slate-500 text-xs group-hover:text-slate-300 transition-colors duration-200'>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Link columns */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
              {footerSections.map((section, i) => (
                <div key={i}>
                  <h3 className='text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-5'>
                    {section.title}
                  </h3>
                  {/* <ul className='space-y-3'>
                    {section.links.map((link, j) => (
                      <li key={j}>
                        <a href={link.href} className='footer-link text-slate-500 hover:text-white text-sm transition-colors duration-200'>
                          {link.text}
                          <svg className='footer-link-arrow w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                          </svg>
                        </a>
                      </li>
                    ))}
                  </ul> */}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Bottom Bar ─────────────────────────── */}
        <div className='footer-grid-line' />
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-6'>
          <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
            <div className='flex items-center gap-6'>
              <p className='text-slate-600 text-xs'>
                &copy; {new Date().getFullYear()} UniCare+. All rights reserved.
              </p>
              <div className='hidden sm:flex items-center gap-4'>
                {['Privacy', 'Terms', 'Cookies'].map((item) => (
                  <a key={item} href='#' className='text-slate-600 hover:text-slate-400 text-xs transition-colors duration-200'>
                    {item}
                  </a>
                ))}
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-[10px] font-semibold uppercase tracking-widest text-slate-600'>Follow Us</span>
              <div className='flex gap-2'>
                {socials.map(({ name, icon: Icon, url }) => (
                  <a
                    key={name}
                    href={url}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={`Follow us on ${name}`}
                    className='social-icon w-8 h-8 bg-slate-800 hover:bg-sky-500 border border-slate-700 hover:border-sky-400 rounded-xl flex items-center justify-center'
                  >
                    <Icon className='w-3.5 h-3.5 text-slate-400 group-hover:text-white' />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;