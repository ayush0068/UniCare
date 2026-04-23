'use client';
import { faqs, trustLogos } from "@/lib/constant";
import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, HelpCircle, Mail, MessageCircle, Phone } from "lucide-react";

const FAQSection = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll<HTMLElement>('[data-reveal]').forEach((node, i) => {
              setTimeout(() => { node.style.opacity = '1'; node.style.transform = 'translateY(0)'; }, i * 90);
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        [data-reveal] {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1);
        }

        /* Marquee */
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee-scroll 28s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }

        /* Accordion */
        .faq-body {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .faq-body.open { grid-template-rows: 1fr; }
        .faq-inner { overflow: hidden; }

        /* FAQ hover */
        .faq-row { transition: background 0.2s ease, border-color 0.2s ease; }
        .faq-row:hover { background-color: rgba(248,247,244,0.8); }
        .faq-row.active-row { background-color: #f0f9ff; border-color: #bae6fd; }

        /* Support card hover */
        .support-link {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .support-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(14,165,233,0.12);
          border-color: rgba(186,230,253,0.9);
        }
      `}</style>

      <section className='uc-font bg-[#F8F7F4]' ref={sectionRef}>

        {/* ─── Trust Logos Marquee ────────────────── */}
        <div className='border-b border-slate-200/70 bg-white py-5 overflow-hidden'>
          <div className='flex items-center gap-0 overflow-hidden'>
            <div className='marquee-track flex items-center gap-8 px-4 whitespace-nowrap'>
              {[...trustLogos, ...trustLogos].map((logo, i) => (
                <div
                  key={i}
                  className='flex-shrink-0 flex items-center justify-center h-8 px-6 text-slate-400 font-semibold text-sm hover:text-slate-600 transition-colors duration-200 cursor-default tracking-tight'
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Main Content ───────────────────────── */}
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-24'>
          <div className='grid lg:grid-cols-[320px_1fr] xl:grid-cols-[380px_1fr] gap-16 items-start'>

            {/* ─ Left Sticky Panel ──────────────── */}
            <div className='lg:sticky lg:top-28 space-y-8' data-reveal>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-500 mb-4'>Help Center</p>
                <h2 className='uc-serif text-4xl font-bold text-slate-900 leading-tight mb-4'>
                  Got<br />
                  <em className='not-italic text-sky-500'>Questions?</em>
                </h2>
                <p className='text-slate-500 text-sm leading-relaxed'>
                  Find answers to the most common questions about UniCare+. If you need more help, our support team is ready.
                </p>
              </div>

              {/* Quick stats */}
              <div className='grid grid-cols-2 gap-3'>
                {[
                  { value: '< 2 min', label: 'Avg. response time' },
                  { value: '98%', label: 'Satisfaction rate' },
                ].map((stat, i) => (
                  <div key={i} className='bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center'>
                    <p className='uc-serif text-xl font-bold text-slate-900'>{stat.value}</p>
                    <p className='text-[11px] text-slate-400 font-medium mt-1 leading-tight'>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Contact options */}
              <div className='space-y-2.5'>
                <p className='text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3'>Reach Us Directly</p>
                {[
                  { icon: MessageCircle, label: 'Live Chat', sub: 'Available 24/7', color: 'text-sky-600 bg-sky-50 border-sky-100' },
                  { icon: Mail, label: 'Email Support', sub: 'uniservices013@gmail.com', color: 'text-violet-600 bg-violet-50 border-violet-100' },
                  { icon: Phone, label: 'Call Us', sub: '+91-8931878476', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                ].map(({ icon: Icon, label, sub, color }) => (
                  <div key={label} className={`support-link flex items-center gap-3 p-3.5 rounded-2xl bg-white border cursor-pointer ${color.split(' ').slice(1).join(' ')}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color.split(' ')[1]} ${color.split(' ')[2]}`}>
                      <Icon className={`w-4 h-4 ${color.split(' ')[0]}`} />
                    </div>
                    <div>
                      <p className='text-sm font-semibold text-slate-800'>{label}</p>
                      <p className='text-[11px] text-slate-400'>{sub}</p>
                    </div>
                    <ArrowRight className='w-4 h-4 text-slate-300 ml-auto flex-shrink-0' />
                  </div>
                ))}
              </div>
            </div>

            {/* ─ Right FAQ Accordion ─────────────── */}
            <div className='space-y-3' data-reveal>
              <div className='flex items-center gap-2 mb-6'>
                <HelpCircle className='w-4 h-4 text-sky-500' />
                <p className='text-sm font-medium text-slate-500'>{faqs.length} frequently asked questions</p>
              </div>

              {faqs.map((faq, index) => {
                const isOpen = openFAQ === index;
                return (
                  <div
                    key={index}
                    className={`faq-row rounded-2xl border overflow-hidden ${isOpen ? 'active-row' : 'bg-white border-slate-100'}`}
                  >
                    <button
                      className='w-full px-6 py-5 text-left flex items-start justify-between gap-4'
                      onClick={() => setOpenFAQ(isOpen ? null : index)}
                      aria-expanded={isOpen}
                    >
                      <div className='flex items-start gap-3 flex-1 min-w-0'>
                        <span className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold transition-colors duration-200 ${isOpen ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className={`text-[15px] font-semibold leading-snug transition-colors duration-200 ${isOpen ? 'text-sky-700' : 'text-slate-800'}`}>
                          {faq.question}
                        </span>
                      </div>
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-sky-500 border-sky-500 rotate-45' : 'border-slate-200 text-slate-400'}`}>
                        <svg className={`w-3 h-3 ${isOpen ? 'text-white' : 'text-slate-400'}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 5v14M5 12h14' />
                        </svg>
                      </div>
                    </button>

                    <div className={`faq-body ${isOpen ? 'open' : ''}`}>
                      <div className='faq-inner'>
                        <div className='px-6 pb-5 pl-[3.75rem]'>
                          <div className='w-8 h-px bg-sky-200 mb-3' />
                          <p className='text-slate-500 text-sm leading-relaxed'>
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Bottom helper */}
              <div className='mt-8 flex items-center gap-4 p-5 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 rounded-2xl'>
                <div className='w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-200/50'>
                  <HelpCircle className='w-5 h-5 text-white' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-semibold text-slate-800'>Still can't find an answer?</p>
                  <p className='text-xs text-slate-500 mt-0.5'>Our support team responds in under 2 minutes.</p>
                </div>
                <button className='flex-shrink-0 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-xl transition-colors duration-200 whitespace-nowrap'>
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default FAQSection;