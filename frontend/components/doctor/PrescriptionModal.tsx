'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Save, X, FileText, AlertCircle, Activity, Stethoscope, User, Pill, ShieldCheck, ChevronDown, ChevronUp, Clock, ClipboardList } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'

/* ─────────────────── Types ─────────────────── */
interface MedicineRow {
  id: string
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

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

interface PreviousPrescription {
  _id?: string
  createdAt?: string | Date
  prescription: string
  notes?: string
  doctorName?: string
}

interface PrescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (prescription: string, notes: string) => Promise<void>
  patientName: string
  loading?: boolean
  // ✅ NEW: patient context props
  aiReport?: AIReport | null
  previousPrescriptions?: PreviousPrescription[]
}

/* ─────────────────── Constants ─────────────────── */
const FREQUENCY_OPTIONS = [
  'Once daily', 'Twice daily', 'Thrice daily',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours',
  'At bedtime', 'As needed (SOS)', 'Weekly',
]

const INSTRUCTION_OPTIONS = [
  'After breakfast', 'Before breakfast', 'After lunch',
  'Before lunch', 'After dinner', 'Before dinner',
  'With food', 'Empty stomach', 'With water', 'With milk',
]

const SEV = {
  Mild:     { bg: '#f0fdf4', border: '#86efac', text: '#15803d', badge: '#dcfce7', dot: '#22c55e' },
  Moderate: { bg: '#fffbeb', border: '#fcd34d', text: '#b45309', badge: '#fef9c3', dot: '#f59e0b' },
  Severe:   { bg: '#fff1f2', border: '#fca5a5', text: '#b91c1c', badge: '#fee2e2', dot: '#ef4444' },
}

const emptyRow = (): MedicineRow => ({
  id: Math.random().toString(36).slice(2),
  name: '', dosage: '', frequency: '', duration: '', instructions: '',
})

/* ─────────────────── Portal ─────────────────── */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

/* ─────────────────── AI Report Panel ─────────────────── */
const AIReportPanel = ({ report }: { report: AIReport }) => {
  const [expanded, setExpanded] = useState(true)
  const r = report.report
  const cfg = SEV[r.severityLevel] || SEV.Mild
  const date = r.generatedAt
    ? new Date(r.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
    : 'N/A'

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid #bae6fd' }}>
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg,#0c4a6e,#0369a1)',
          padding: '10px 14px', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Activity size={13} color="white" />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: 0 }}>AI Pre-Consultation Report</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, margin: 0 }}>{date}</p>
        </div>
        <span style={{
          background: cfg.badge, border: `1px solid ${cfg.border}`,
          color: cfg.text, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
          {r.severityLevel}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ background: '#f0f9ff', padding: '12px 14px' }}>
              {/* Patient row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '7px 10px', background: 'white', border: '1px solid #e0f2fe', borderRadius: 8 }}>
                <User size={13} color="#0369a1" />
                <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>{r.patientName}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>· {r.age} yrs · {r.gender}</span>
              </div>

              {/* Symptoms */}
              <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: 1.5, margin: '0 0 6px', textTransform: 'uppercase' }}>Symptoms</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                {r.symptoms?.map((s, i) => (
                  <span key={i} style={{ background: 'white', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 500 }}>{s}</span>
                ))}
              </div>

              {/* Diagnosis */}
              <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: 1.5, margin: '0 0 6px', textTransform: 'uppercase' }}>Possible Conditions</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                {r.possibleDiagnosis?.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 7, padding: '6px 10px' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#4c1d95', fontWeight: 500 }}>{d}</span>
                  </div>
                ))}
              </div>

              {/* Recommended Action */}
              <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: '8px 11px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Pill size={13} color={cfg.text} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: cfg.text, margin: '0 0 2px', letterSpacing: 0.8 }}>RECOMMENDED ACTION</p>
                  <p style={{ fontSize: 12, color: cfg.text, margin: 0, lineHeight: 1.6 }}>{r.recommendedAction}</p>
                </div>
              </div>

              {r.additionalNotes && (
                <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.7, margin: '8px 0 0' }}>{r.additionalNotes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────── Previous Prescriptions Panel ─────────────────── */
const PreviousPrescriptionsPanel = ({ prescriptions }: { prescriptions: PreviousPrescription[] }) => {
  const [expanded, setExpanded] = useState(false)

  if (!prescriptions.length) return null

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid #e9d5ff' }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg,#4c1d95,#6d28d9)',
          padding: '10px 14px', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ClipboardList size={13} color="white" />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: 0 }}>Previous Prescriptions</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, margin: 0 }}>{prescriptions.length} record{prescriptions.length !== 1 ? 's' : ''} found</p>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ background: '#faf5ff', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {prescriptions.map((p, i) => {
                const date = p.createdAt
                  ? new Date(p.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
                  : 'N/A'
                // Parse pipe-separated medicines
                const lines = p.prescription?.split('\n').filter(Boolean) || []
                return (
                  <div key={p._id || i} style={{ background: 'white', border: '1px solid #e9d5ff', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: '#f3e8ff', borderBottom: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={12} color="#6d28d9" />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#4c1d95' }}>{date}</span>
                      {p.doctorName && <span style={{ fontSize: 11, color: '#7c3aed', marginLeft: 'auto' }}>Dr. {p.doctorName}</span>}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      {lines.map((line, j) => {
                        const parts = line.split('|').map(s => s.trim())
                        return (
                          <div key={j} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: j < lines.length - 1 ? '1px dashed #e9d5ff' : 'none', alignItems: 'flex-start' }}>
                            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#6d28d9', flexShrink: 0 }}>{j + 1}</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1e1b4b' }}>{parts[0]?.replace(/^\d+\.\s*/, '')}</p>
                              {parts.slice(1).filter(Boolean).length > 0 && (
                                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>
                                  {parts.slice(1).filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {p.notes && (
                        <div style={{ marginTop: 8, padding: '6px 10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 7 }}>
                          <p style={{ margin: 0, fontSize: 11, color: '#92400e' }}><strong>Note:</strong> {p.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────── Mobile Medicine Card ─────────────────── */
const MobileMedicineCard = ({
  row, idx, total, onChange, onRemove,
}: {
  row: MedicineRow; idx: number; total: number
  onChange: (id: string, field: keyof MedicineRow, value: string) => void
  onRemove: (id: string) => void
}) => (
  <div style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px', marginBottom: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>{idx + 1}</span>
      <button
        onClick={() => onRemove(row.id)}
        disabled={total === 1}
        style={{ background: 'none', border: 'none', cursor: total === 1 ? 'not-allowed' : 'pointer', color: total === 1 ? '#cbd5e1' : '#ef4444', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
      >
        <Trash2 size={14} />
      </button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {/* Medicine Name — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Medicine Name *</label>
        <Input
          value={row.name}
          onChange={e => onChange(row.id, 'name', e.target.value)}
          placeholder="e.g. Tab. Paracetamol"
          style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', outline: 'none', fontWeight: 600, color: '#0f172a' }}
        />
      </div>
      {/* Dosage */}
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Dosage</label>
        <Input
          value={row.dosage}
          onChange={e => onChange(row.id, 'dosage', e.target.value)}
          placeholder="500mg"
          style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', outline: 'none', color: '#475569' }}
        />
      </div>
      {/* Duration */}
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Duration</label>
        <Input
          value={row.duration}
          onChange={e => onChange(row.id, 'duration', e.target.value)}
          placeholder="7 days"
          style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', outline: 'none', color: '#475569' }}
        />
      </div>
      {/* Frequency — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Frequency</label>
        <select
          value={row.frequency}
          onChange={e => onChange(row.id, 'frequency', e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', background: '#fff', color: row.frequency ? '#475569' : '#94a3b8', outline: 'none' }}
        >
          <option value="">Select frequency...</option>
          {FREQUENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      {/* Instructions — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Instructions</label>
        <select
          value={row.instructions}
          onChange={e => onChange(row.id, 'instructions', e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', background: '#fff', color: row.instructions ? '#475569' : '#94a3b8', outline: 'none' }}
        >
          <option value="">Select instructions...</option>
          {INSTRUCTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  </div>
)

/* ═══════════════ MAIN COMPONENT ═══════════════ */
const PrescriptionModal = ({
  isOpen, onClose, onSave, patientName, loading,
  aiReport, previousPrescriptions = [],
}: PrescriptionModalProps) => {
  const [medicines, setMedicines] = useState<MedicineRow[]>([emptyRow()])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const updateRow = (id: string, field: keyof MedicineRow, value: string) =>
    setMedicines(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))

  const addRow = () => setMedicines(prev => [...prev, emptyRow()])

  const removeRow = (id: string) => {
    if (medicines.length === 1) return
    setMedicines(prev => prev.filter(r => r.id !== id))
  }

  const handleSave = async () => {
    const filled = medicines.filter(m => m.name.trim())
    if (filled.length === 0) { setError('At least one medicine is required.'); return }
    setError('')
    const prescriptionStr = filled
      .map((m, i) => `${i + 1}. ${m.name} | ${m.dosage} | ${m.frequency} | ${m.duration} | ${m.instructions}`)
      .join('\n')
    try {
      await onSave(prescriptionStr, notes)
      setMedicines([emptyRow()]); setNotes('')
    } catch (e) { console.error('Failed to save prescription', e) }
  }

  const handleClose = () => {
    setMedicines([emptyRow()]); setNotes(''); setError(''); onClose()
  }

  const allValid = medicines.some(m => m.name.trim())
  const hasPatientContext = !!aiReport || previousPrescriptions.length > 0

  /* ── Layout: sidebar on desktop, stacked on mobile ── */
  return (
    <Portal>
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 9998, display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : 16,
          backdropFilter: 'blur(3px)',
        }}
        onClick={handleClose}
      >
        <motion.div
          initial={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
          animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: hasPatientContext && !isMobile ? 1000 : 760,
            maxHeight: isMobile ? '95dvh' : '92vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            borderRadius: isMobile ? '20px 20px 0 0' : 16,
            boxShadow: isMobile ? '0 -8px 40px rgba(0,0,0,0.22)' : '0 24px 64px rgba(0,0,0,0.2)',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            overflow: 'hidden',
          }}
        >
          {/* Mobile drag handle */}
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, background: '#fff' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
            </div>
          )}

          {/* ── Header ── */}
          <div style={{
            background: '#1a3a5c', padding: isMobile ? '12px 16px' : '18px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#0ea5e9', borderRadius: 8, padding: '6px 10px', display: 'flex' }}>
                <FileText size={18} color="white" />
              </div>
              <div>
                <p style={{ color: 'white', fontWeight: 700, fontSize: isMobile ? 15 : 17, margin: 0, fontFamily: 'Georgia, serif', letterSpacing: 0.5 }}>Write Prescription</p>
                <p style={{ color: '#93c5fd', fontSize: 12, margin: 0, marginTop: 2 }}>
                  Patient: <strong style={{ color: '#bfdbfe' }}>{patientName}</strong>
                </p>
              </div>
            </div>
            <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
              <X size={18} />
            </button>
          </div>

          {/* ── Rx bar ── */}
          <div style={{ background: '#f0f9ff', borderBottom: '2px solid #0ea5e9', padding: '7px 24px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#0ea5e9', fontWeight: 700, lineHeight: 1 }}>Rx</span>
            <span style={{ fontSize: 11, color: '#0369a1', letterSpacing: 2, fontWeight: 600, textTransform: 'uppercase' }}>Medications</span>
            {!isMobile && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>Fill each row for one medicine</span>}
          </div>

          {/* ── Two-column layout (desktop) / Stacked (mobile) ── */}
          <div style={{
            flex: 1, overflowY: 'auto',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 0,
          }}>

            {/* ── LEFT / TOP: Patient Context (AI Report + Prev Prescriptions) ── */}
            {hasPatientContext && (
              <div style={{
                width: isMobile ? '100%' : 320,
                flexShrink: 0,
                borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
                borderBottom: isMobile ? '1px solid #e2e8f0' : 'none',
                padding: isMobile ? '14px 14px 0' : '20px 18px',
                background: '#fafbfc',
                overflowY: isMobile ? 'visible' : 'auto',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 12px' }}>
                  Patient Context
                </p>
                {aiReport && <AIReportPanel report={aiReport} />}
                {previousPrescriptions.length > 0 && <PreviousPrescriptionsPanel prescriptions={previousPrescriptions} />}
              </div>
            )}

            {/* ── RIGHT / BOTTOM: Prescription form ── */}
            <div style={{ flex: 1, padding: isMobile ? '14px' : '20px 24px', overflowY: 'auto' }}>

              {/* ── Medicine Table (desktop) ── */}
              {!isMobile && (
                <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#1a3a5c' }}>
                        {['#', 'Medicine Name *', 'Dosage', 'Frequency', 'Duration', 'Instructions', ''].map((h, i) => (
                          <th key={i} style={{
                            color: 'white', padding: '10px 10px', textAlign: 'left', fontWeight: 600,
                            fontSize: 11, letterSpacing: 1,
                            width: i === 0 ? 32 : i === 1 ? '24%' : i === 6 ? 36 : 'auto',
                            borderRight: i < 6 ? '1px solid #2d5a8e' : 'none',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((row, idx) => (
                        <tr key={row.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 10px', color: '#94a3b8', fontWeight: 700, fontSize: 13, textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 8px', borderRight: '1px solid #e2e8f0' }}>
                            <Input value={row.name} onChange={e => updateRow(row.id, 'name', e.target.value)} placeholder="e.g. Tab. Paracetamol"
                              style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 12, width: '100%', outline: 'none', fontWeight: 600, color: '#0f172a' }} />
                          </td>
                          <td style={{ padding: '6px 8px', borderRight: '1px solid #e2e8f0' }}>
                            <Input value={row.dosage} onChange={e => updateRow(row.id, 'dosage', e.target.value)} placeholder="500mg"
                              style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 12, width: '100%', outline: 'none', color: '#475569' }} />
                          </td>
                          <td style={{ padding: '6px 8px', borderRight: '1px solid #e2e8f0' }}>
                            <select value={row.frequency} onChange={e => updateRow(row.id, 'frequency', e.target.value)}
                              style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 12, width: '100%', background: '#fff', color: row.frequency ? '#475569' : '#94a3b8', outline: 'none' }}>
                              <option value="">Select...</option>
                              {FREQUENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '6px 8px', borderRight: '1px solid #e2e8f0' }}>
                            <Input value={row.duration} onChange={e => updateRow(row.id, 'duration', e.target.value)} placeholder="7 days"
                              style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 12, width: '100%', outline: 'none', color: '#475569' }} />
                          </td>
                          <td style={{ padding: '6px 8px', borderRight: '1px solid #e2e8f0' }}>
                            <select value={row.instructions} onChange={e => updateRow(row.id, 'instructions', e.target.value)}
                              style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 12, width: '100%', background: '#fff', color: row.instructions ? '#475569' : '#94a3b8', outline: 'none' }}>
                              <option value="">Select...</option>
                              {INSTRUCTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                            <button onClick={() => removeRow(row.id)} disabled={medicines.length === 1}
                              style={{ background: 'none', border: 'none', cursor: medicines.length === 1 ? 'not-allowed' : 'pointer', color: medicines.length === 1 ? '#cbd5e1' : '#ef4444', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Medicine Cards (mobile) ── */}
              {isMobile && medicines.map((row, idx) => (
                <MobileMedicineCard key={row.id} row={row} idx={idx} total={medicines.length} onChange={updateRow} onRemove={removeRow} />
              ))}

              {/* ── Add Medicine ── */}
              <button onClick={addRow}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0f9ff', border: '1.5px dashed #0ea5e9', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', color: '#0369a1', fontSize: 13, fontWeight: 600, marginBottom: 20, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                <Plus size={16} />
                Add Another Medicine
              </button>

              {/* ── Notes ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '8px 8px 0 0', padding: '8px 14px' }}>
                  <Label style={{ fontSize: 11, fontWeight: 700, color: '#92400e', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    Doctor's Advice & Notes <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 400 }}>(Optional)</span>
                  </Label>
                </div>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Diet advice, follow-up instructions, restrictions, lifestyle changes..."
                  rows={3}
                  style={{ borderRadius: '0 0 8px 8px', border: '1px solid #fbbf24', borderTop: 'none', padding: '10px 14px', fontSize: 13, resize: 'vertical', width: '100%', background: '#fffbeb', color: '#78350f', outline: 'none' }}
                />
              </div>

              {/* ── Error ── */}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 13 }}>
                  <AlertCircle size={15} />{error}
                </div>
              )}

              {/* ── Actions ── */}
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: 10,
                paddingTop: 14, borderTop: '1px solid #e2e8f0',
                paddingBottom: isMobile ? 'max(12px, env(safe-area-inset-bottom))' : 0,
                flexDirection: isMobile ? 'column' : 'row',
              }}>
                {!isMobile && (
                  <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!allValid || loading}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: allValid && !loading ? '#1a3a5c' : '#94a3b8',
                    color: 'white', border: 'none', borderRadius: 8,
                    padding: isMobile ? '13px 24px' : '10px 24px',
                    fontSize: isMobile ? 15 : 14, fontWeight: 600,
                    cursor: allValid && !loading ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s', width: isMobile ? '100%' : 'auto',
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{ width: 16, height: 16, border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Complete & Send Prescription
                    </>
                  )}
                </button>
                {isMobile && (
                  <button onClick={handleClose} disabled={loading}
                    style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 500, color: '#64748b', cursor: 'pointer', width: '100%' }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Portal>
  )
}

export default PrescriptionModal