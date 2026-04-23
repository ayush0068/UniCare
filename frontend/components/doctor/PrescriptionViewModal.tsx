import { Appointment } from "@/store/appointmentStore"
import React, { useState } from "react"
import { FileText, X, Printer, Calendar, Stethoscope, User } from "lucide-react"
import { Button } from "../ui/button"

interface PrescriptionViewModalProps {
  appointment: Appointment
  userType: "doctor" | "patient"
  trigger: React.ReactNode
}

interface ParsedMedicine {
  index: string
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

// Parse pipe-separated prescription string into rows
const parsePrescription = (text: string): ParsedMedicine[] => {
  if (!text) return []
  return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const withoutIndex = line.replace(/^\d+\.\s*/, '')
      const parts = withoutIndex.split('|').map(p => p.trim())
      return {
        index: line.match(/^(\d+)/)?.[1] || '1',
        name: parts[0] || '',
        dosage: parts[1] || '',
        frequency: parts[2] || '',
        duration: parts[3] || '',
        instructions: parts[4] || '',
      }
    })
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
  })

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  })

const PrescriptionViewModal = ({ appointment, userType, trigger }: PrescriptionViewModalProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const medicines = parsePrescription(appointment?.prescription || '')
  const doctor = appointment?.doctorId as any
  const patient = appointment?.patientId as any
  const rxNumber = `RX-${appointment?._id?.toString().slice(-8).toUpperCase() || '00000000'}`

  const handlePrint = () => {
    const printContent = document.getElementById('rx-print-area')
    if (!printContent) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Prescription - UniCare</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style></head><body>${printContent.innerHTML}</body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <>
      <span onClick={() => setIsOpen(true)} style={{ cursor: 'pointer' }}>{trigger}</span>

      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            width: '100%', maxWidth: 760, maxHeight: '95vh', overflowY: 'auto',
            background: 'white', borderRadius: 12, boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            fontFamily: 'Arial, sans-serif'
          }}>

            {/* ── Modal Controls (not printed) ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
              borderRadius: '12px 12px 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#0ea5e9" />
                <span style={{ fontWeight: 700, color: '#1a3a5c', fontSize: 15 }}>Prescription</span>
                <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{rxNumber}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a3a5c', color: 'white', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
                <button onClick={() => setIsOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Printable Area ── */}
            <div id="rx-print-area" style={{ padding: '0 0 0 0' }}>

              {/* Header */}
              <div style={{ display: 'flex', background: '#1a3a5c' }}>
                <div style={{ flex: 1, padding: '22px 28px' }}>
                  <div style={{ color: 'white', fontSize: 24, fontWeight: 700, letterSpacing: 3, fontFamily: 'Georgia, serif' }}>UNICARE</div>
                  <div style={{ color: '#93c5fd', fontSize: 10, letterSpacing: 3, marginTop: 4 }}>DIGITAL HEALTH PLATFORM</div>
                  <div style={{ color: '#bfdbfe', fontSize: 9.5, marginTop: 10, lineHeight: 1.8 }}>
                    support@unicare.health  |  www.unicare.health<br />24/7 Helpline: 1800-UNI-CARE
                  </div>
                </div>
                <div style={{ background: '#0ea5e9', width: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
                  <div style={{ color: 'white', fontSize: 54, fontFamily: 'Georgia, serif', fontWeight: 700, lineHeight: 1 }}>Rx</div>
                  <div style={{ color: '#e0f2fe', fontSize: 9, letterSpacing: 2, marginTop: 4 }}>PRESCRIPTION</div>
                </div>
              </div>

              {/* Meta bar */}
              <div style={{ background: '#f0f9ff', borderBottom: '2px solid #0ea5e9', padding: '9px 28px', display: 'flex', gap: 0, flexWrap: 'wrap' }}>
                {[
                  ['Prescription No:', rxNumber],
                  ['Date:', formatDate(appointment?.slotStartIso)],
                  ['Type:', appointment?.consultationType],
                  ['Time:', formatTime(appointment?.slotStartIso) + ' IST'],
                ].map(([label, val], i) => (
                  <div key={i} style={{ flex: '1 1 25%', minWidth: 140, fontSize: 11 }}>
                    <span style={{ color: '#64748b' }}>{label} </span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Doctor + Patient info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '20px 24px 0' }}>
                {[
                  {
                    icon: <Stethoscope size={13} />,
                    title: 'DOCTOR INFORMATION',
                    rows: [
                      ['Name', `Dr. ${doctor?.name || 'N/A'}`],
                      ['Specialization', doctor?.specialization || 'N/A'],
                      ['Qualification', doctor?.qualification || 'MBBS, MD'],
                      ['Hospital', doctor?.hospitalInfo?.name || 'N/A'],
                      ['City', doctor?.hospitalInfo?.city || 'N/A'],
                      ['Contact', doctor?.phone || 'N/A'],
                    ]
                  },
                  {
                    icon: <User size={13} />,
                    title: 'PATIENT INFORMATION',
                    rows: [
                      ['Name', patient?.name || 'N/A'],
                      ['Age / Gender', `${patient?.age || 'N/A'} Yrs / ${patient?.gender || 'N/A'}`],
                      ['Date of Birth', patient?.dob ? new Date(patient.dob).toLocaleDateString('en-IN') : 'N/A'],
                      ['Blood Group', patient?.bloodGroup || 'N/A'],
                      ['Phone', patient?.phone || 'N/A'],
                      ['Email', patient?.email || 'N/A'],
                    ]
                  }
                ].map((box, bi) => (
                  <div key={bi} style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ background: '#1a3a5c', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#93c5fd' }}>{box.icon}</span>
                      <span style={{ color: 'white', fontSize: 10, letterSpacing: 2, fontWeight: 700 }}>{box.title}</span>
                    </div>
                    <div style={{ background: '#fafafa', padding: '12px 14px' }}>
                      {box.rows.map(([label, val], ri) => (
                        <div key={ri} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
                          <span style={{ color: '#64748b', minWidth: 90, flexShrink: 0 }}>{label}</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Symptoms */}
              {appointment?.symptoms && (
                <div style={{ margin: '16px 24px 0', borderLeft: '3px solid #0ea5e9', background: '#f0f9ff', borderRadius: '0 6px 6px 0', padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', letterSpacing: 1.5, marginBottom: 5 }}>CHIEF COMPLAINTS / SYMPTOMS</div>
                  <div style={{ fontSize: 12.5, color: '#0c4a6e', lineHeight: 1.7 }}>{appointment.symptoms}</div>
                </div>
              )}

              {/* Rx section title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 24px 10px' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#0ea5e9', fontWeight: 700 }}>Rx</span>
                <span style={{ fontSize: 11, color: '#1a3a5c', fontWeight: 700, letterSpacing: 2, borderBottom: '2px solid #0ea5e9', paddingBottom: 3, flex: 1 }}>MEDICATIONS PRESCRIBED</span>
              </div>

              {/* Medicine Table */}
              <div style={{ margin: '0 24px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#1a3a5c' }}>
                      {['#', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions'].map((h, i) => (
                        <th key={i} style={{
                          color: 'white', padding: '9px 10px', textAlign: 'left',
                          fontSize: 10, letterSpacing: 1, fontWeight: 700,
                          borderRight: i < 5 ? '1px solid #2d5a8e' : 'none',
                          width: i === 0 ? 28 : 'auto'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.length > 0 ? medicines.map((med, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '9px 10px', color: '#94a3b8', fontWeight: 700, textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>{med.index}</td>
                        <td style={{ padding: '9px 10px', color: '#0f172a', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>{med.name}</td>
                        <td style={{ padding: '9px 10px', color: '#475569', borderRight: '1px solid #e2e8f0' }}>{med.dosage}</td>
                        <td style={{ padding: '9px 10px', color: '#475569', borderRight: '1px solid #e2e8f0' }}>{med.frequency}</td>
                        <td style={{ padding: '9px 10px', color: '#475569', borderRight: '1px solid #e2e8f0' }}>{med.duration}</td>
                        <td style={{ padding: '9px 10px', color: '#475569' }}>{med.instructions}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                          {appointment?.prescription || 'No prescription provided.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              {appointment?.notes && (
                <div style={{ margin: '16px 24px 0' }}>
                  <div style={{ background: '#fbbf24', padding: '7px 14px', borderRadius: '6px 6px 0 0' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', letterSpacing: 1.5 }}>DOCTOR'S ADVICE &amp; NOTES</span>
                  </div>
                  <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '12px 14px' }}>
                    <p style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.8 }}>{appointment.notes}</p>
                  </div>
                </div>
              )}

              {/* Signature */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, margin: '24px 24px 0', paddingBottom: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1.5px solid #1a3a5c', marginBottom: 8, height: 36 }} />
                  <p style={{ fontSize: 11, color: '#64748b' }}>Patient / Guardian Signature</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1.5px solid #1a3a5c', marginBottom: 8, height: 36 }} />
                  <p style={{ fontSize: 11, color: '#0f172a', fontWeight: 700 }}>Dr. {doctor?.name}</p>
                  <p style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{doctor?.specialization}</p>
                </div>
              </div>

              {/* Footer */}
              <div style={{ background: '#1a3a5c', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <p style={{ color: '#93c5fd', fontSize: 9.5, lineHeight: 1.8 }}>
                  Digitally generated prescription via UniCare platform. Valid for 30 days from date of issue.<br />
                  For queries: support@unicare.health  |  Generated: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
                <div style={{ background: '#0ea5e9', color: 'white', fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 4, letterSpacing: 2, flexShrink: 0 }}>UNICARE</div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}

export default PrescriptionViewModal