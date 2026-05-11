'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Activity, Stethoscope, User, Pill, AlertCircle, ShieldCheck, FileText, Calendar } from 'lucide-react'

interface AIReport {
  _id?: string
  report: {
    patientName: string
    age: string
    gender: string
    symptoms: string[]
    possibleDiagnosis: string[]
    severityLevel: 'Mild' | 'Moderate' | 'Severe'
    recommendedAction: string
    additionalNotes: string
    generatedAt: string | Date
  }
  createdAt?: string | Date
}

interface Props {
  report: AIReport | null
  isOpen: boolean
  onClose: () => void
  title?: string
}

const SEV = {
  Mild:     { bg: '#f0fdf4', border: '#86efac', text: '#15803d', badge: '#dcfce7', dot: '#22c55e', darkBg: 'rgba(34,197,94,0.1)',  darkBorder: 'rgba(34,197,94,0.25)',  darkText: '#4ade80' },
  Moderate: { bg: '#fffbeb', border: '#fcd34d', text: '#b45309', badge: '#fef9c3', dot: '#f59e0b', darkBg: 'rgba(245,158,11,0.1)', darkBorder: 'rgba(245,158,11,0.25)', darkText: '#fbbf24' },
  Severe:   { bg: '#fff1f2', border: '#fca5a5', text: '#b91c1c', badge: '#fee2e2', dot: '#ef4444', darkBg: 'rgba(239,68,68,0.1)',  darkBorder: 'rgba(239,68,68,0.25)',  darkText: '#f87171' },
}

/* ── Portal ── */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

/* ── Section block ── */
const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {icon}
      <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1.5, margin: 0, textTransform: 'uppercase' }}>
        {title}
      </p>
    </div>
    {children}
  </div>
)

const AIReportViewModal = ({ report, isOpen, onClose, title = 'AI Pre-Consultation Report' }: Props) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen || !report?.report) return null

  const r = report.report
  const cfg = SEV[r.severityLevel] || SEV.Mild
  const generatedDate = r.generatedAt
    ? new Date(r.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
    : 'N/A'

  const modalStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        width: '100%',
        maxHeight: '92dvh',
        overflowY: 'auto',
        background: 'white',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }
    : {
        width: '100%', maxWidth: 600,
        maxHeight: '90vh', overflowY: 'auto',
        background: 'white', borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 9999,
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: isMobile ? 0 : 16,
            backdropFilter: 'blur(4px)',
          }}
            onClick={onClose}
          >
            <motion.div
              initial={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.94, y: 20 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={modalStyle}
              onClick={e => e.stopPropagation()}
            >
              {/* Mobile drag handle */}
              {isMobile && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2 }}>
                  <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
                </div>
              )}

              {/* ── Header ── */}
              <div style={{
                background: 'linear-gradient(135deg,#0c4a6e,#0369a1)',
                padding: isMobile ? '14px 16px' : '16px 20px',
                borderRadius: isMobile ? '20px 20px 0 0' : '20px 20px 0 0',
                display: 'flex', alignItems: 'center', gap: 12,
                position: 'sticky', top: 0, zIndex: 2,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FileText size={18} color="white" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: isMobile ? 14 : 15, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0 }}>Generated: {generatedDate}</p>
                </div>
                {/* Severity badge */}
                <div style={{
                  background: cfg.badge, border: `1px solid ${cfg.border}`,
                  color: cfg.text, borderRadius: 20,
                  padding: isMobile ? '3px 8px' : '4px 12px',
                  fontSize: isMobile ? 11 : 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                }}>
                  <motion.div
                    style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot }}
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  {r.severityLevel}
                </div>
                <button onClick={onClose} style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
                  color: 'white', display: 'flex', alignItems: 'center', flexShrink: 0,
                }}>
                  <X size={16} />
                </button>
              </div>

              {/* ── Body ── */}
              <div style={{ padding: isMobile ? '16px 14px' : '20px' }}>

                {/* Patient info */}
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 12, padding: isMobile ? '10px 12px' : '12px 16px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <User size={16} color="#2563eb" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: isMobile ? 13 : 14 }}>{r.patientName}</p>
                    <p style={{ color: '#64748b', margin: 0, fontSize: 12 }}>
                      Age: {r.age} · Gender: {r.gender}
                    </p>
                  </div>
                </div>

                {/* Symptoms */}
                <Section icon={<Activity size={14} color="#0369a1" />} title="Reported Symptoms">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {r.symptoms?.map((s, i) => (
                      <span key={i} style={{
                        background: '#f0f9ff', border: '1px solid #bae6fd',
                        color: '#0369a1', borderRadius: 20, padding: '4px 12px',
                        fontSize: isMobile ? 12 : 12, fontWeight: 500,
                      }}>{s}</span>
                    ))}
                  </div>
                </Section>

                {/* Diagnosis */}
                <Section icon={<Stethoscope size={14} color="#7c3aed" />} title="Possible Conditions">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {r.possibleDiagnosis?.map((d, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#faf5ff', border: '1px solid #e9d5ff',
                        borderRadius: 8, padding: '8px 12px',
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#4c1d95', fontWeight: 500 }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Recommended action */}
                <div style={{
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                  borderRadius: 12, padding: isMobile ? '10px 12px' : '12px 16px', marginBottom: 14,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <Pill size={16} color={cfg.text} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: cfg.text, margin: '0 0 4px', letterSpacing: 1 }}>
                      RECOMMENDED ACTION
                    </p>
                    <p style={{ fontSize: 13, color: cfg.text, margin: 0, lineHeight: 1.7 }}>{r.recommendedAction}</p>
                  </div>
                </div>

                {/* Notes */}
                {r.additionalNotes && (
                  <Section icon={<Calendar size={14} color="#64748b" />} title="Additional Notes">
                    <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: 0 }}>{r.additionalNotes}</p>
                  </Section>
                )}

                {/* Disclaimer */}
                <div style={{
                  background: '#fffbeb', border: '1px solid #fcd34d',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 10,
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                  <AlertCircle size={13} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 11, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                    <strong>Disclaimer:</strong> This is an AI-based preliminary analysis and not a final medical diagnosis. Consult a qualified doctor for accurate diagnosis and treatment.
                  </p>
                </div>

                <div style={{
                  background: '#f0fdf4', border: '1px solid #86efac',
                  borderRadius: 10, padding: '10px 14px',
                  display: 'flex', gap: 8, alignItems: 'center',
                  marginBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom))' : 0,
                }}>
                  <ShieldCheck size={14} color="#16a34a" />
                  <p style={{ fontSize: 12, color: '#15803d', margin: 0, fontWeight: 500 }}>
                    This report has been shared with your doctor for pre-consultation review
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  )
}

export default AIReportViewModal