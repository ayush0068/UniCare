'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Send, Mic, MicOff, FileText, Stethoscope,
  RotateCcw, Volume2, VolumeX, ChevronRight,
  User, Pill, ShieldCheck, Settings,
} from 'lucide-react'
import { userAuthStore } from '@/store/authStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePathname } from 'next/navigation'
import { httpService } from '@/service/httpService'

/* ─────────────────────────── Types ─────────────────────────── */
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isReport?: boolean
  reportData?: ReportPayload
}
interface ReportPayload {
  patientName: string; age: string; gender: string
  symptoms: string[]; possibleDiagnosis: string[]
  severityLevel: 'Mild' | 'Moderate' | 'Severe'
  recommendedAction: string; additionalNotes: string
}

/* ─────────────────────── Voice Personas ────────────────────── */
type VoicePersona = 'default' | 'jarvis' | 'hindi'
const PERSONAS: Record<VoicePersona, { label: string; emoji: string; lang: string; rate: number; pitch: number; hints: string[] }> = {
  default: { label: 'Standard', emoji: '🔊', lang: 'en-IN', rate: 0.95, pitch: 1.05, hints: ['en-IN','en-US','female'] },
  jarvis:  { label: 'JARVIS',   emoji: '🤖', lang: 'en-GB', rate: 0.88, pitch: 0.82, hints: ['en-GB','daniel','male'] },
  hindi:   { label: 'हिंदी',   emoji: '🇮🇳', lang: 'hi-IN', rate: 0.92, pitch: 1.0,  hints: ['hi-IN','hindi'] },
}

const speak = (text: string, on: boolean, persona: VoicePersona) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  if (!on) return
  const cfg = PERSONAS[persona]
  const clean = text.replace(/\*\*/g,'').replace(/REPORT_READY:[\s\S]*$/,'').replace(/[📊💊🎉✅👋🔊⚡🤖🇮🇳]/g,'').trim().slice(0,300)
  if (!clean) return
  const utt = new SpeechSynthesisUtterance(clean)
  utt.lang = cfg.lang; utt.rate = cfg.rate; utt.pitch = cfg.pitch
  const voices = window.speechSynthesis.getVoices()
  let chosen: SpeechSynthesisVoice | undefined
  for (const h of cfg.hints) {
    chosen = voices.find(v => v.lang.toLowerCase().includes(h) || v.name.toLowerCase().includes(h))
    if (chosen) break
  }
  if (!chosen) chosen = voices.find(v => v.lang.startsWith(cfg.lang.slice(0,2)))
  if (chosen) utt.voice = chosen
  window.speechSynthesis.speak(utt)
}

/* ─────────────────────── Severity config ───────────────────── */
const SEV = {
  Mild:     { bg:'#f0fdf4', border:'#bbf7d0', text:'#15803d', dot:'#22c55e', chip:'#dcfce7' },
  Moderate: { bg:'#fffbeb', border:'#fde68a', text:'#b45309', dot:'#f59e0b', chip:'#fef9c3' },
  Severe:   { bg:'#fff1f2', border:'#fecaca', text:'#b91c1c', dot:'#ef4444', chip:'#fee2e2' },
}

/* ─────────────────── Bold text renderer ────────────────────── */
const Render = ({ text }: { text: string }) => (
  <>{text.split(/(\*\*.*?\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color:'#f1f5f9' }}>{p.slice(2,-2)}</strong>
      : p
  )}</>
)

/* ──────────────────────── Typing dots ──────────────────────── */
const Typing = () => (
  <div style={{ display:'flex', gap:5, padding:'9px 13px', background:'rgba(255,255,255,0.04)', borderRadius:'12px 12px 12px 3px', border:'1px solid rgba(255,255,255,0.07)', width:'fit-content' }}>
    {[0,1,2].map(i => (
      <motion.div key={i} style={{ width:5, height:5, borderRadius:'50%', background:'#38bdf8' }}
        animate={{ y:[0,-4,0], opacity:[0.4,1,0.4] }}
        transition={{ duration:0.7, repeat:Infinity, delay:i*0.15 }} />
    ))}
  </div>
)

/* ──────────────────────── Inline Report ────────────────────── */
const InlineReport = ({ data }: { data: ReportPayload }) => {
  const cfg = SEV[data.severityLevel] || SEV.Mild
  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      transition={{ type:'spring', stiffness:280, damping:24 }}
      style={{ marginTop:6, borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.09)' }}
    >
      <div style={{ background:'linear-gradient(135deg,#0c4a6e,#075985)', padding:'9px 13px', display:'flex', alignItems:'center', gap:9 }}>
        <div style={{ width:26, height:26, borderRadius:7, background:'rgba(255,255,255,0.14)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <FileText size={12} color="white" />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ color:'white', fontWeight:700, fontSize:12, margin:0 }}>AI Medical Report</p>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:10, margin:0 }}>{new Date().toLocaleDateString('en-IN')}</p>
        </div>
        <span style={{ background:cfg.chip, border:`1px solid ${cfg.border}`, color:cfg.text, borderRadius:20, padding:'2px 9px', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
          <motion.span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:cfg.dot }}
            animate={{ scale:[1,1.4,1] }} transition={{ duration:1.5, repeat:Infinity }} />
          {data.severityLevel}
        </span>
      </div>
      <div style={{ padding:11, background:'rgba(255,255,255,0.025)' }}>
        <div style={{ display:'flex', gap:7, padding:'6px 9px', background:'rgba(255,255,255,0.04)', borderRadius:8, marginBottom:9, alignItems:'center', border:'1px solid rgba(255,255,255,0.06)' }}>
          <User size={11} color="#64748b" />
          <span style={{ fontSize:11, color:'#94a3b8' }}>{data.patientName} · {data.age} yrs · {data.gender}</span>
        </div>
        <p style={{ fontSize:9, fontWeight:700, color:'#475569', letterSpacing:1.2, margin:'0 0 5px', textTransform:'uppercase' }}>Symptoms</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:9 }}>
          {data.symptoms.map((s,i) => (
            <span key={i} style={{ background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.18)', color:'#38bdf8', borderRadius:20, padding:'2px 8px', fontSize:10.5, fontWeight:500 }}>{s}</span>
          ))}
        </div>
        <p style={{ fontSize:9, fontWeight:700, color:'#475569', letterSpacing:1.2, margin:'0 0 5px', textTransform:'uppercase' }}>Possible Conditions</p>
        <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:9 }}>
          {data.possibleDiagnosis.map((d,i) => (
            <div key={i} style={{ display:'flex', gap:7, padding:'5px 9px', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.12)', borderRadius:7, alignItems:'center' }}>
              <span style={{ width:4, height:4, borderRadius:'50%', background:'#a78bfa', flexShrink:0 }} />
              <span style={{ fontSize:11, color:'#c4b5fd' }}>{d}</span>
            </div>
          ))}
        </div>
        <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:8, padding:'7px 10px', marginBottom:7, display:'flex', gap:7, alignItems:'flex-start' }}>
          <Pill size={11} color={cfg.text} style={{ flexShrink:0, marginTop:1 }} />
          <div>
            <p style={{ fontSize:9, fontWeight:700, color:cfg.text, margin:'0 0 2px', letterSpacing:0.8 }}>RECOMMENDED ACTION</p>
            <p style={{ fontSize:11, color:cfg.text, margin:0, lineHeight:1.6 }}>{data.recommendedAction}</p>
          </div>
        </div>
        {data.additionalNotes && <p style={{ fontSize:10.5, color:'#64748b', lineHeight:1.7, margin:'0 0 7px' }}>{data.additionalNotes}</p>}
        <div style={{ background:'rgba(74,222,128,0.07)', border:'1px solid rgba(74,222,128,0.17)', borderRadius:7, padding:'5px 9px', display:'flex', gap:6, alignItems:'center' }}>
          <ShieldCheck size={11} color="#4ade80" />
          <p style={{ fontSize:10.5, color:'#4ade80', margin:0, fontWeight:500 }}>Report shared with your doctor</p>
        </div>
      </div>
    </motion.div>
  )
}

/* ══════════════════════ Portal helper ══════════════════════════ */
function Portal({ children }: { children: React.ReactNode }) {
  const [m, setM] = useState(false)
  useEffect(() => { setM(true) }, [])
  if (!m) return null
  return createPortal(children, document.body)
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function AIAssistantButton() {
  const { user, isAuthenticated } = userAuthStore()
  const { currentAppointment }    = useAppointmentStore()
  const pathname                  = usePathname()

  const [open, setOpen]                 = useState(false)
  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [listening, setListening]       = useState(false)
  const [voiceOn, setVoiceOn]           = useState(true)
  const [persona, setPersona]           = useState<VoicePersona>('default')
  const [lang, setLang]                 = useState<'en' | 'hi'>('en')
  const [showSettings, setShowSettings] = useState(false)
  const [greeted, setGreeted]           = useState(false)
  const [typing, setTyping]             = useState(false)
  const [sessionId, setSessionId]       = useState<string | null>(null)

  const endRef     = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const recRef     = useRef<any>(null)
  const voiceRef   = useRef(true)
  const personaRef = useRef<VoicePersona>('default')
  const sessionRef = useRef<string | null>(null)

  useEffect(() => { voiceRef.current = voiceOn;     if (!voiceOn) window.speechSynthesis?.cancel() }, [voiceOn])
  useEffect(() => { personaRef.current = persona },  [persona])
  useEffect(() => { sessionRef.current = sessionId }, [sessionId])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, typing])

  /* ── Visibility logic ──────────────────────────────────────── */
  const userType  = (user as any)?.type || (user as any)?.userType || 'patient'
  const isDoctor  = userType === 'doctor'
  const isPatient = userType === 'patient'
  const isCallPage = pathname?.includes('/call/')
  const isCallActive = currentAppointment?.status === 'In Progress'

  /*
   * Patient → only on landing page '/'
   * Doctor  → everywhere EXCEPT call pages
   */
  const visible = isAuthenticated && user && (
    (isPatient && pathname === '/') ||
    (isDoctor  && !isCallPage && !isCallActive)
  )

  /* ── Greeting on first open ────────────────────────────────── */
  useEffect(() => {
    if (!open || greeted || messages.length > 0 || !user) return
    setGreeted(true)
    const first = user.name?.split(' ')[0] || 'there'
    const msg = lang === 'hi'
      ? isDoctor ? `नमस्ते Dr. ${first}! क्लिनिकल AI यहाँ हूं।` : `नमस्ते ${first}! आज कैसा महसूस कर रहे हैं?`
      : isDoctor ? `Hello Dr. ${first}! How can I assist you today?` : `Hi ${first}! I'm Dr. UniCare AI. What brings you in today?`
    setTimeout(() => {
      setMessages([{ id:'g0', role:'assistant', content:msg, timestamp:new Date() }])
      speak(msg, voiceRef.current, personaRef.current)
    }, 350)
  }, [open, greeted, messages.length, user, lang, isDoctor])

  if (!visible) return null

  /* ── Helpers ───────────────────────────────────────────────── */
  const addMsg = (m: Message) => setMessages(p => [...p, m])

  const send = async (txt?: string) => {
    const text = (txt || input).trim()
    if (!text || loading) return
    setInput('')
    addMsg({ id: Date.now().toString(), role:'user', content:text, timestamp:new Date() })
    setLoading(true); setTyping(true)
    try {
      const payload: any = { message:text, language:lang }
      if (sessionRef.current) payload.sessionId = sessionRef.current
      const res = await httpService.postWithAuth('/ai/chat', payload)
      setTyping(false)
      if (res.success) {
        setSessionId(res.data.sessionId); sessionRef.current = res.data.sessionId
        const isReport = res.data.reportReady && res.data.reportData
        addMsg({ id:(Date.now()+1).toString(), role:'assistant', content:res.data.response, timestamp:new Date(), isReport, reportData:isReport ? res.data.reportData : undefined })
        speak(res.data.response, voiceRef.current, personaRef.current)
      } else {
        addMsg({ id:(Date.now()+1).toString(), role:'assistant', content:lang==='hi' ? 'कुछ गड़बड़ हो गई। दोबारा कोशिश करें।' : 'Something went wrong. Please try again.', timestamp:new Date() })
      }
    } catch {
      setTyping(false)
      addMsg({ id:(Date.now()+1).toString(), role:'assistant', content:'Connection error. Please check your internet.', timestamp:new Date() })
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }

  const toggleMic = () => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const rec = new SR()
    rec.lang = lang === 'hi' ? 'hi-IN' : PERSONAS[persona].lang
    rec.continuous = false; rec.interimResults = false
    recRef.current = rec
    rec.onstart  = () => setListening(true)
    rec.onend    = () => setListening(false)
    rec.onerror  = () => setListening(false)
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; setInput(t); setTimeout(() => send(t), 300) }
    rec.start()
  }

  const reset = () => {
    window.speechSynthesis?.cancel()
    setMessages([]); setSessionId(null); sessionRef.current = null
    setGreeted(false); setInput(''); setListening(false); setShowSettings(false)
  }

  const chips = lang === 'hi'
    ? isDoctor ? ['दवा की जानकारी','निदान सहायता'] : ['सिरदर्द है','बुखार है','थकान है']
    : isDoctor ? ['Drug interactions','Differential diagnosis','Dosage help'] : ["I'm not feeling well",'I have a headache','Feeling feverish','Stomach pain']

  const fmtTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })

  return (
    <Portal>
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9990, fontFamily:"'DM Sans',system-ui,sans-serif" }}>

        {/* ══════════ MINIMAL FAB ══════════════════════════════ */}
        <AnimatePresence>
          {!open && (
            <motion.button
              key="fab"
              initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0, opacity:0 }}
              transition={{ type:'spring', stiffness:360, damping:26 }}
              whileHover={{ scale:1.1 }} whileTap={{ scale:0.92 }}
              onClick={() => setOpen(true)}
              title={isDoctor ? 'Clinical AI' : 'Health AI'}
              aria-label="Open AI assistant"
              style={{
                width:50, height:50, borderRadius:'50%',
                background:'linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)',
                border:'none', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 4px 20px rgba(14,165,233,0.42), 0 2px 8px rgba(0,0,0,0.22)',
                position:'relative',
              }}
            >
              <Stethoscope size={21} color="white" strokeWidth={1.8} />
              <motion.span
                animate={{ scale:[1,1.3,1], opacity:[1,0.7,1] }} transition={{ duration:2, repeat:Infinity }}
                style={{ position:'absolute', bottom:1, right:1, width:12, height:12, borderRadius:'50%', background:'#22c55e', border:'2.5px solid white' }}
              />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ══════════ BACKDROP ════════════════════════════════ */}
        <AnimatePresence>
          {open && (
            <motion.div key="bd"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setOpen(false)}
              style={{ position:'fixed', inset:0, zIndex:9989, background:'rgba(0,0,0,0.28)', backdropFilter:'blur(2px)' }}
            />
          )}
        </AnimatePresence>

        {/* ══════════ CHAT WINDOW ═════════════════════════════ */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="chat"
              initial={{ opacity:0, y:18, scale:0.93 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:18, scale:0.93 }}
              transition={{ type:'spring', stiffness:340, damping:28 }}
              onClick={e => e.stopPropagation()}
              style={{
                position:'fixed',
                bottom:24, right:24,
                width:'min(400px, calc(100vw - 24px))',
                height:'min(620px, calc(100dvh - 100px))',
                zIndex:9990,
                borderRadius:22,
                overflow:'hidden',
                display:'flex', flexDirection:'column',
                background:'linear-gradient(160deg,#0d1117 0%,#0f172a 55%,#0c1628 100%)',
                border:'1px solid rgba(255,255,255,0.08)',
                boxShadow:'0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(56,189,248,0.07)',
              }}
            >
              {/* Ambient glows */}
              <div style={{ position:'absolute', top:-50, right:-30, width:160, height:160, borderRadius:'50%', background:'rgba(14,165,233,0.07)', filter:'blur(40px)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:-30, left:-20, width:130, height:130, borderRadius:'50%', background:'rgba(99,102,241,0.06)', filter:'blur(32px)', pointerEvents:'none' }} />

              {/* ─── Header ───────────────────────────────────── */}
              <div style={{ padding:'12px 13px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0, background:'rgba(255,255,255,0.015)' }}>
                {/* Avatar */}
                <div style={{ width:35, height:35, borderRadius:11, background:'linear-gradient(135deg,rgba(14,165,233,0.22),rgba(99,102,241,0.22))', border:'1px solid rgba(56,189,248,0.16)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
                  <Stethoscope size={15} color="#38bdf8" />
                  <motion.span animate={{ scale:[1,1.3,1], opacity:[1,0.6,1] }} transition={{ duration:2, repeat:Infinity }}
                    style={{ position:'absolute', bottom:-1, right:-1, width:8, height:8, borderRadius:'50%', background:'#22c55e', border:'2px solid #0d1117' }} />
                </div>
                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:'white', fontWeight:700, fontSize:13, margin:0, lineHeight:1 }}>
                    {isDoctor ? 'Clinical AI' : 'Dr. UniCare AI'}
                  </p>
                  <p style={{ color:'rgba(148,163,184,0.55)', fontSize:10, margin:'2px 0 0' }}>
                    {lang==='hi' ? 'हिंदी में उपलब्ध' : isDoctor ? 'Clinical assistant' : 'Your health companion'}
                  </p>
                </div>
                {/* Buttons */}
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  {[
                    { icon: showSettings ? <X size={11}/> : <Settings size={11}/>, fn:()=>setShowSettings(v=>!v), active:showSettings, tip:'Settings' },
                    { icon: voiceOn ? <Volume2 size={11}/> : <VolumeX size={11}/>, fn:()=>{ setVoiceOn(v=>!v); if(voiceOn) window.speechSynthesis?.cancel() }, active:voiceOn, tip:voiceOn?'Mute':'Unmute' },
                    ...(messages.length > 0 ? [{ icon:<RotateCcw size={11}/>, fn:reset, active:false, tip:'New chat' }] : []),
                    { icon:<X size={12}/>, fn:()=>setOpen(false), active:false, tip:'Close' },
                  ].map((btn,i) => (
                    <motion.button key={i} whileHover={{ scale:1.12 }} whileTap={{ scale:0.9 }}
                      onClick={btn.fn} title={btn.tip}
                      style={{ width:26, height:26, borderRadius:7, border:'1px solid rgba(255,255,255,0.07)', background:btn.active?'rgba(56,189,248,0.18)':'rgba(255,255,255,0.04)', color:btn.active?'#38bdf8':'rgba(148,163,184,0.65)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                    >{btn.icon}</motion.button>
                  ))}
                </div>
              </div>

              {/* ─── Settings Panel ───────────────────────────── */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.18 }}
                    style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', flexShrink:0, background:'rgba(255,255,255,0.02)' }}
                  >
                    <div style={{ padding:'9px 13px', display:'flex', gap:16, flexWrap:'wrap' }}>
                      <div>
                        <p style={{ fontSize:9, fontWeight:700, color:'rgba(148,163,184,0.4)', letterSpacing:1.5, margin:'0 0 6px', textTransform:'uppercase' }}>Language</p>
                        <div style={{ display:'flex', gap:5 }}>
                          {(['en','hi'] as const).map(l => (
                            <motion.button key={l} whileTap={{ scale:0.94 }} onClick={() => { setLang(l); reset() }}
                              style={{ padding:'4px 11px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid', borderColor:lang===l?'rgba(56,189,248,0.45)':'rgba(255,255,255,0.1)', background:lang===l?'rgba(56,189,248,0.14)':'rgba(255,255,255,0.04)', color:lang===l?'#38bdf8':'#94a3b8' }}
                            >{l==='en' ? '🇬🇧 EN' : '🇮🇳 HI'}</motion.button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize:9, fontWeight:700, color:'rgba(148,163,184,0.4)', letterSpacing:1.5, margin:'0 0 6px', textTransform:'uppercase' }}>Voice</p>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {(Object.entries(PERSONAS) as [VoicePersona, typeof PERSONAS[VoicePersona]][]).map(([k,v]) => (
                            <motion.button key={k} whileTap={{ scale:0.94 }} onClick={() => setPersona(k)}
                              style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid', borderColor:persona===k?'rgba(56,189,248,0.45)':'rgba(255,255,255,0.1)', background:persona===k?'rgba(56,189,248,0.14)':'rgba(255,255,255,0.04)', color:persona===k?'#38bdf8':'#94a3b8' }}
                            >{v.emoji} {v.label}</motion.button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Messages ─────────────────────────────────── */}
              <div style={{ flex:1, overflowY:'auto', padding:'10px 11px 6px', display:'flex', flexDirection:'column', gap:5, scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.1) transparent' }}>
                {messages.map(msg => (
                  <div key={msg.id}>
                    <motion.div
                      initial={{ opacity:0, y:7 }} animate={{ opacity:1, y:0 }}
                      transition={{ type:'spring', stiffness:300, damping:26 }}
                      style={{ display:'flex', flexDirection:msg.role==='user'?'row-reverse':'row', alignItems:'flex-end', gap:6 }}
                    >
                      {msg.role === 'assistant' && (
                        <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#0ea5e9,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Stethoscope size={10} color="white" />
                        </div>
                      )}
                      <div style={{
                        maxWidth:'83%', padding:'8px 11px',
                        borderRadius: msg.role==='user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                        fontSize:12.5, lineHeight:1.65,
                        background: msg.role==='user' ? 'linear-gradient(135deg,#0ea5e9,#0284c7)' : 'rgba(255,255,255,0.05)',
                        color: msg.role==='user' ? 'white' : '#cbd5e1',
                        border: msg.role==='assistant' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                        boxShadow: msg.role==='user' ? '0 3px 10px rgba(14,165,233,0.26)' : 'none',
                      }}>
                        <Render text={msg.content} />
                        <div style={{ fontSize:9.5, opacity:0.38, marginTop:2, textAlign:msg.role==='user'?'right':'left' }}>
                          {fmtTime(msg.timestamp)}
                        </div>
                      </div>
                    </motion.div>

                    {msg.isReport && msg.reportData && (
                      <div style={{ paddingLeft:28, marginTop:3 }}>
                        <InlineReport data={msg.reportData} />
                      </div>
                    )}
                  </div>
                ))}

                {typing && (
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ paddingLeft:28 }}>
                    <Typing />
                  </motion.div>
                )}
                <div ref={endRef} />
              </div>

              {/* ─── Quick chips ──────────────────────────────── */}
              {messages.length <= 1 && (
                <div style={{ padding:'3px 11px 5px', display:'flex', gap:5, flexWrap:'wrap', flexShrink:0 }}>
                  {chips.map(c => (
                    <motion.button key={c} whileHover={{ scale:1.03 }} whileTap={{ scale:0.96 }} onClick={() => send(c)}
                      style={{ display:'flex', alignItems:'center', gap:3, background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.17)', color:'#38bdf8', borderRadius:20, padding:'3px 9px', fontSize:11, cursor:'pointer', fontWeight:500 }}
                    >
                      <ChevronRight size={9} />{c}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ─── Input area ───────────────────────────────── */}
              <div style={{ padding:'5px 10px 11px', flexShrink:0, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.05)', border:`1.5px solid ${listening ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius:13, padding:'5px 5px 5px 11px', transition:'border-color 0.2s' }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }}
                    placeholder={listening ? '🎤 Listening...' : lang==='hi' ? 'अपने लक्षण बताएं...' : isDoctor ? 'Ask anything clinical...' : 'Describe your symptoms...'}
                    disabled={loading}
                    style={{ flex:1, border:'none', background:'transparent', fontSize:12.5, color:'#e2e8f0', outline:'none', fontFamily:'inherit' }}
                  />
                  {/* Mic */}
                  <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }} onClick={toggleMic}
                    style={{ width:28, height:28, borderRadius:'50%', border:'none', background:listening?'rgba(239,68,68,0.82)':'rgba(255,255,255,0.07)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:listening?'0 0 10px rgba(239,68,68,0.4)':'none', transition:'all 0.2s' }}
                  >
                    {listening
                      ? <motion.div animate={{ scale:[1,1.15,1] }} transition={{ duration:0.5, repeat:Infinity }}><MicOff size={12} color="white" /></motion.div>
                      : <Mic size={12} color="rgba(148,163,184,0.55)" />
                    }
                  </motion.button>
                  {/* Send */}
                  <motion.button
                    whileHover={{ scale: input.trim() && !loading ? 1.07 : 1 }} whileTap={{ scale:0.93 }}
                    onClick={() => send()} disabled={!input.trim() || loading}
                    style={{ width:28, height:28, borderRadius:'50%', border:'none', background: input.trim()&&!loading ? 'linear-gradient(135deg,#0ea5e9,#0284c7)' : 'rgba(255,255,255,0.05)', cursor:input.trim()&&!loading?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s', boxShadow:input.trim()&&!loading?'0 3px 10px rgba(14,165,233,0.38)':'none' }}
                  >
                    {loading
                      ? <motion.div style={{ width:11, height:11, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'white', borderRadius:'50%' }} animate={{ rotate:360 }} transition={{ duration:0.7, repeat:Infinity, ease:'linear' }} />
                      : <Send size={11} color={input.trim()?'white':'rgba(148,163,184,0.28)'} />
                    }
                  </motion.button>
                </div>
                <p style={{ fontSize:9.5, color:'rgba(100,116,139,0.45)', textAlign:'center', margin:'4px 0 0' }}>
                  {lang==='hi' ? 'AI सहायता · चिकित्सा निदान नहीं' : 'AI-assisted · Not a medical diagnosis'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Portal>
  )
}