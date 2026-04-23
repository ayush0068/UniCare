'use client'

import React, { useState } from 'react'
import { Plus, Trash2, Save, X, FileText, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'

interface MedicineRow {
  id: string
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

interface PrescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (prescription: string, notes: string) => Promise<void>
  patientName: string
  loading?: boolean
}

const FREQUENCY_OPTIONS = [
  'Once daily', 'Twice daily', 'Thrice daily',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours',
  'At bedtime', 'As needed (SOS)', 'Weekly'
]

const INSTRUCTION_OPTIONS = [
  'After breakfast', 'Before breakfast', 'After lunch',
  'Before lunch', 'After dinner', 'Before dinner',
  'With food', 'Empty stomach', 'With water', 'With milk'
]

const emptyRow = (): MedicineRow => ({
  id: Math.random().toString(36).slice(2),
  name: '', dosage: '', frequency: '', duration: '', instructions: ''
})

const PrescriptionModal = ({ isOpen, onClose, onSave, patientName, loading }: PrescriptionModalProps) => {
  const [medicines, setMedicines] = useState<MedicineRow[]>([emptyRow()])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const updateRow = (id: string, field: keyof MedicineRow, value: string) => {
    setMedicines(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const addRow = () => setMedicines(prev => [...prev, emptyRow()])

  const removeRow = (id: string) => {
    if (medicines.length === 1) return
    setMedicines(prev => prev.filter(r => r.id !== id))
  }

  const handleSave = async () => {
    const filled = medicines.filter(m => m.name.trim())
    if (filled.length === 0) {
      setError('At least one medicine is required.')
      return
    }
    setError('')

    // Format as pipe-separated string so PDF table renders correctly
    const prescriptionStr = filled
      .map((m, i) => `${i + 1}. ${m.name} | ${m.dosage} | ${m.frequency} | ${m.duration} | ${m.instructions}`)
      .join('\n')

    try {
      await onSave(prescriptionStr, notes)
      setMedicines([emptyRow()])
      setNotes('')
    } catch (e) {
      console.error('Failed to save prescription', e)
    }
  }

  const handleClose = () => {
    setMedicines([emptyRow()])
    setNotes('')
    setError('')
    onClose()
  }

  const allValid = medicines.some(m => m.name.trim())

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(2px)' }}>
      <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-xl shadow-2xl" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>

        {/* ── Header ── */}
        <div style={{ background: '#1a3a5c', padding: '20px 28px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#0ea5e9', borderRadius: 8, padding: '6px 10px' }}>
              <FileText size={18} color="white" />
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 17, margin: 0, fontFamily: 'Georgia, serif', letterSpacing: 0.5 }}>Write Prescription</p>
              <p style={{ color: '#93c5fd', fontSize: 12, margin: 0, marginTop: 2 }}>Patient: <strong style={{ color: '#bfdbfe' }}>{patientName}</strong></p>
            </div>
          </div>
          <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Rx Label Bar ── */}
        <div style={{ background: '#f0f9ff', borderBottom: '2px solid #0ea5e9', padding: '8px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#0ea5e9', fontWeight: 700, lineHeight: 1 }}>Rx</span>
          <span style={{ fontSize: 11, color: '#0369a1', letterSpacing: 2, fontWeight: 600, textTransform: 'uppercase' }}>Medications</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>Fill each row for one medicine</span>
        </div>

        <div style={{ padding: '24px 28px' }}>

          {/* ── Medicine Table ── */}
          <div style={{ overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1a3a5c' }}>
                  {['#', 'Medicine Name *', 'Dosage', 'Frequency', 'Duration', 'Instructions', ''].map((h, i) => (
                    <th key={i} style={{
                      color: 'white', padding: '10px 10px', textAlign: 'left', fontWeight: 600,
                      fontSize: 11, letterSpacing: 1,
                      width: i === 0 ? 32 : i === 1 ? '24%' : i === 6 ? 36 : 'auto',
                      borderRight: i < 6 ? '1px solid #2d5a8e' : 'none'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {medicines.map((row, idx) => (
                  <tr key={row.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {/* Index */}
                    <td style={{ padding: '8px 10px', color: '#94a3b8', fontWeight: 700, fontSize: 13, textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                      {idx + 1}
                    </td>

                    {/* Medicine Name */}
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #e2e8f0' }}>
                      <Input
                        value={row.name}
                        onChange={e => updateRow(row.id, 'name', e.target.value)}
                        placeholder="e.g. Tab. Paracetamol"
                        style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 12, width: '100%', outline: 'none', fontWeight: 600, color: '#0f172a' }}
                      />
                    </td>

                    {/* Dosage */}
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #e2e8f0' }}>
                      <Input
                        value={row.dosage}
                        onChange={e => updateRow(row.id, 'dosage', e.target.value)}
                        placeholder="500mg"
                        style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 12, width: '100%', outline: 'none', color: '#475569' }}
                      />
                    </td>

                    {/* Frequency */}
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #e2e8f0' }}>
                      <select
                        value={row.frequency}
                        onChange={e => updateRow(row.id, 'frequency', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 12, width: '100%', background: '#fff', color: row.frequency ? '#475569' : '#94a3b8', outline: 'none' }}
                      >
                        <option value="">Select...</option>
                        {FREQUENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>

                    {/* Duration */}
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #e2e8f0' }}>
                      <Input
                        value={row.duration}
                        onChange={e => updateRow(row.id, 'duration', e.target.value)}
                        placeholder="7 days"
                        style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 12, width: '100%', outline: 'none', color: '#475569' }}
                      />
                    </td>

                    {/* Instructions */}
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #e2e8f0' }}>
                      <select
                        value={row.instructions}
                        onChange={e => updateRow(row.id, 'instructions', e.target.value)}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 12, width: '100%', background: '#fff', color: row.instructions ? '#475569' : '#94a3b8', outline: 'none' }}
                      >
                        <option value="">Select...</option>
                        {INSTRUCTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>

                    {/* Delete */}
                    <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={medicines.length === 1}
                        style={{ background: 'none', border: 'none', cursor: medicines.length === 1 ? 'not-allowed' : 'pointer', color: medicines.length === 1 ? '#cbd5e1' : '#ef4444', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Add Medicine Button ── */}
          <button
            onClick={addRow}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0f9ff', border: '1.5px dashed #0ea5e9', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', color: '#0369a1', fontSize: 13, fontWeight: 600, marginBottom: 24 }}
          >
            <Plus size={16} />
            Add Another Medicine
          </button>

          {/* ── Notes ── */}
          <div style={{ marginBottom: 20 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 13 }}>
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <button
              onClick={handleSave}
              disabled={!allValid || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: allValid && !loading ? '#1a3a5c' : '#94a3b8',
                color: 'white', border: 'none', borderRadius: 8,
                padding: '10px 24px', fontSize: 14, fontWeight: 600,
                cursor: allValid && !loading ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s'
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
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

export default PrescriptionModal