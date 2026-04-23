'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, FileText, ChevronRight, Calendar, Pill, Activity, Sparkles, ArrowRight, Clock } from 'lucide-react'
import { httpService } from '@/service/httpService'
import { userAuthStore } from '@/store/authStore'
import AIReportViewModal from '../AI/AIReportViewModal'
import PrescriptionViewModal from '../doctor/PrescriptionViewModal'

const SEV_CONFIG = {
  Mild:     { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400', icon: 'bg-emerald-100 text-emerald-600', bar: 'bg-emerald-400', label: 'Low Risk' },
  Moderate: { bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   icon: 'bg-amber-100 text-amber-600',   bar: 'bg-amber-400',   label: 'Moderate' },
  Severe:   { bg: 'bg-red-50',     border: 'border-red-100',     text: 'text-red-700',     dot: 'bg-red-400',     icon: 'bg-red-100 text-red-600',       bar: 'bg-red-400',     label: 'High Risk' },
};

type Tab = 'ai-reports' | 'prescriptions';

const PatientReportsPage = () => {
  const { user } = userAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('ai-reports');
  const [aiReports, setAiReports] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAIReport, setSelectedAIReport] = useState<any>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsRes, prescRes] = await Promise.all([
        httpService.getWithAuth('/ai/reports'),
        httpService.getWithAuth('/appointment/patient?status[]=Completed'),
      ]);
      if (reportsRes.success) setAiReports(reportsRes.data || []);
      if (prescRes.success) setPrescriptions((prescRes.data || []).filter((a: any) => a.prescription?.trim()));
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

  if (!user) return null;

  const TABS = [
    { key: 'ai-reports' as Tab,    label: 'AI Health Reports',  icon: Brain,     count: aiReports.length },
    { key: 'prescriptions' as Tab, label: 'Prescriptions',       icon: FileText,  count: prescriptions.length },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }
        @keyframes rep-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rep-animate { animation: rep-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .rep-card {
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, border-color 0.2s ease;
        }
        .rep-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(14,165,233,0.10);
          border-color: #bae6fd;
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: 12px;
        }
      `}</style>

      <div className='uc-font rep-animate max-w-4xl mx-auto'>

        {/* ─── Header ─────────────────────────────── */}
        <div className='mb-6'>
          <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-500 mb-2'>Health Records</p>
          <h2 className='uc-serif text-2xl font-bold text-slate-900 leading-tight'>
            Your <em className='not-italic text-sky-500'>Reports</em>
          </h2>
          <p className='text-slate-500 text-sm mt-1'>AI health analyses and doctor prescriptions in one place.</p>
        </div>

        {/* ─── Tabs ────────────────────────────────── */}
        <div className='flex gap-1.5 mb-6 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm w-fit'>
          {TABS.map(({ key, label, icon: Icon, count }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className='w-3.5 h-3.5' />
                {label}
                <span className={`text-[11px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── Content ─────────────────────────────── */}
        <AnimatePresence mode='wait'>
          {loading ? (
            <motion.div key='loading' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='space-y-4'>
              {[...Array(3)].map((_, i) => (
                <div key={i} className='bg-white rounded-2xl p-5 border border-slate-100'>
                  <div className='flex gap-4'>
                    <div className='skeleton w-12 h-12 rounded-xl flex-shrink-0' />
                    <div className='flex-1 space-y-2'>
                      <div className='skeleton h-4 w-2/5' />
                      <div className='skeleton h-3 w-3/5' />
                      <div className='skeleton h-3 w-1/4' />
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>

          ) : activeTab === 'ai-reports' ? (
            <motion.div key='ai' initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className='space-y-3'>
              {aiReports.length === 0 ? (
                <EmptyState icon='🧠' title='No AI Reports Yet' desc='Chat with the AI Health Assistant to generate your first health report.' />
              ) : (
                aiReports.map((report: any, i) => {
                  const r = report.report;
                  const sev = (r?.severityLevel || 'Mild') as keyof typeof SEV_CONFIG;
                  const cfg = SEV_CONFIG[sev] || SEV_CONFIG.Mild;
                  return (
                    <motion.div
                      key={report._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => { setSelectedAIReport(report); setShowAIModal(true); }}
                      className='rep-card bg-white rounded-2xl border border-slate-100 p-5 cursor-pointer'
                    >
                      <div className='flex items-start gap-4'>
                        {/* Icon block */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${cfg.icon} ${cfg.border}`}>
                          <Activity className='w-5 h-5' />
                        </div>

                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 mb-2 flex-wrap'>
                            <span className='text-sm font-bold text-slate-900'>
                              {formatDate(r?.generatedAt || report.createdAt)}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </div>
                          <p className='text-xs text-slate-500 font-medium mb-1'>
                            Symptoms: {r?.symptoms?.slice(0, 3).join(', ')}{r?.symptoms?.length > 3 ? '...' : ''}
                          </p>
                          <p className='text-xs text-slate-400'>
                            {r?.possibleDiagnosis?.slice(0, 2).join(' · ')}
                          </p>
                        </div>

                        <div className='flex items-center gap-1.5 flex-shrink-0 text-sky-500 text-xs font-semibold'>
                          View
                          <ChevronRight className='w-3.5 h-3.5' />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>

          ) : (
            <motion.div key='prescriptions' initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className='space-y-3'>
              {prescriptions.length === 0 ? (
                <EmptyState icon='💊' title='No Prescriptions Yet' desc='Your doctor prescriptions will appear here after completed consultations.' />
              ) : (
                prescriptions.map((appt: any, i) => (
                  <motion.div
                    key={appt._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className='rep-card bg-white rounded-2xl border border-slate-100 p-5'
                  >
                    <div className='flex items-start gap-4'>
                      {/* Icon */}
                      <div className='w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0'>
                        <FileText className='w-5 h-5 text-sky-500' />
                      </div>

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-2'>
                          <div>
                            <p className='text-sm font-bold text-slate-900 leading-none'>Dr. {appt.doctorId?.name}</p>
                            <p className='text-xs text-sky-600 font-semibold mt-0.5'>{appt.doctorId?.specialization}</p>
                          </div>
                          {/* View prescription button */}
                          <PrescriptionViewModal
                            appointment={appt}
                            userType='patient'
                            trigger={
                              <button className='flex items-center gap-1.5 text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 px-3.5 py-2 rounded-xl transition-colors duration-200 flex-shrink-0 shadow-sm shadow-sky-200'>
                                <FileText className='w-3.5 h-3.5' />
                                View
                              </button>
                            }
                          />
                        </div>
                        <div className='flex items-center gap-4 mt-3'>
                          <div className='flex items-center gap-1.5 text-xs text-slate-400'>
                            <Calendar className='w-3 h-3' />
                            {formatDate(appt.slotStartIso)}
                          </div>
                        </div>
                        <p className='text-xs text-slate-400 mt-2 line-clamp-1'>
                          {appt.prescription?.split('\n')[0]?.slice(0, 80)}...
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Report Modal */}
        <AIReportViewModal
          report={selectedAIReport}
          isOpen={showAIModal}
          onClose={() => { setShowAIModal(false); setSelectedAIReport(null); }}
          title='AI Health Report'
        />
      </div>
    </>
  );
};

const EmptyState = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div className='flex flex-col items-center justify-center py-16 text-center'>
    <div className='w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center text-3xl mb-4'>
      {icon}
    </div>
    <p className='text-base font-bold text-slate-700 mb-2'>{title}</p>
    <p className='text-sm text-slate-400 max-w-xs'>{desc}</p>
  </div>
);

export default PatientReportsPage;