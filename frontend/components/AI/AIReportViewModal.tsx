'use client'

import React from 'react'
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
  Mild:     { bg: '#f0fdf4', border: '#86efac', text: '#15803d', badge: '#dcfce7', dot: '#22c55e' },
  Moderate: { bg: '#fffbeb', border: '#fcd34d', text: '#b45309', badge: '#fef9c3', dot: '#f59e0b' },
  Severe:   { bg: '#fff1f2', border: '#fca5a5', text: '#b91c1c', badge: '#fee2e2', dot: '#ef4444' },
}

const AIReportViewModal = ({ report, isOpen, onClose, title = 'AI Pre-Consultation Report' }: Props) => {
  if (!isOpen || !report?.report) return null

  const r = report.report
  const cfg = SEV[r.severityLevel] || SEV.Mild
  const generatedDate = r.generatedAt
    ? new Date(r.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
    : 'N/A'

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, backdropFilter: 'blur(4px)',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          style={{
            width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
            background: 'white', borderRadius: 20,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg,#0c4a6e,#0369a1)',
            padding: '16px 20px', borderRadius: '20px 20px 0 0',
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
            <div style={{ flex: 1 }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</p>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0 }}>
                Generated: {generatedDate}
              </p>
            </div>
            {/* Severity badge */}
            <div style={{
              background: cfg.badge, border: `1px solid ${cfg.border}`,
              color: cfg.text, borderRadius: 20, padding: '4px 12px',
              fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5,
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
              color: 'white', display: 'flex', alignItems: 'center',
            }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {/* Patient info */}
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 12, padding: '12px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={16} color="#2563eb" />
              </div>
              <div>
                <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: 14 }}>{r.patientName}</p>
                <p style={{ color: '#64748b', margin: 0, fontSize: 12 }}>
                  Age: {r.age} • Gender: {r.gender}
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
                    fontSize: 12, fontWeight: 500,
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
              borderRadius: 12, padding: '12px 16px', marginBottom: 14,
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
            }}>
              <ShieldCheck size={14} color="#16a34a" />
              <p style={{ fontSize: 12, color: '#15803d', margin: 0, fontWeight: 500 }}>
                This report has been shared with your doctor for pre-consultation review
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

const Section = ({ icon, title, children }: any) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {icon}
      <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1.5, margin: 0, textTransform: 'uppercase' }}>
        {title}
      </p>
    </div>
    {children}
  </div>
)

export default AIReportViewModal