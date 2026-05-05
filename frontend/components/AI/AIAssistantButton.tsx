'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Send, Mic, MicOff, FileText, Stethoscope,
  RotateCcw, AlertCircle, Volume2, VolumeX,
  ChevronRight, Activity, User, Pill, ShieldCheck, Settings,
  Sparkles, Zap, Brain,
} from 'lucide-react'
import { userAuthStore } from '@/store/authStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePathname } from 'next/navigation'
import { httpService } from '@/service/httpService'

/* ─── Types ─── */
interface Message {
  id: string; role: 'user' | 'assistant'; content: string; timestamp: Date;
  isReport?: boolean; reportData?: ReportPayload;
}
interface ReportPayload {
  patientName: string; age: string; gender: string; symptoms: string[];
  possibleDiagnosis: string[]; severityLevel: 'Mild' | 'Moderate' | 'Severe';
  recommendedAction: string; additionalNotes: string;
}

/* ─── Voice Personas ─── */
type VoicePersona = 'default' | 'jarvis' | 'friday' | 'hindi'
const VOICE_PERSONAS: Record<VoicePersona, { label: string; emoji: string; lang: string; rate: number; pitch: number; voiceHint: string[]; description: string }> = {
  default: { label: 'Default',    emoji: '🔊', lang: 'en-IN', rate: 0.95, pitch: 1.05, voiceHint: ['female','en-IN','en-US'], description: 'Standard voice' },
  jarvis:  { label: 'JARVIS',     emoji: '🤖', lang: 'en-GB', rate: 0.88, pitch: 0.82, voiceHint: ['male','en-GB','daniel','british'], description: 'Calm British AI' },
  friday:  { label: 'F.R.I.D.A.Y', emoji: '⚡', lang: 'en-IE', rate: 1.0, pitch: 1.15, voiceHint: ['female','en-IE','en-GB','samantha'], description: 'Sharp Irish assistant' },
  hindi:   { label: 'हिंदी',      emoji: '🇮🇳', lang: 'hi-IN', rate: 0.92, pitch: 1.0,  voiceHint: ['hi-IN','hindi'], description: 'हिंदी में बात करें' },
}

/* ─── TTS — instant cancel support ─── */
const speakText = (text: string, enabled: boolean, persona: VoicePersona) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  if (!enabled) return
  const cfg = VOICE_PERSONAS[persona]
  const clean = text.replace(/\*\*/g,'').replace(/REPORT_READY:[\s\S]*$/,'').replace(/[📊💊🎉✅👋🔊⚡🤖🇮🇳]/g,'').trim().slice(0,350)
  if (!clean) return
  const utt = new SpeechSynthesisUtterance(clean)
  utt.lang = cfg.lang; utt.rate = cfg.rate; utt.pitch = cfg.pitch
  const voices = window.speechSynthesis.getVoices()
  let chosen: SpeechSynthesisVoice | undefined
  for (const hint of cfg.voiceHint) {
    chosen = voices.find(v => v.lang.toLowerCase().includes(hint.toLowerCase()) || v.name.toLowerCase().includes(hint.toLowerCase()))
    if (chosen) break
  }
  if (!chosen) chosen = voices.find(v => v.lang.startsWith(cfg.lang.slice(0,2)))
  if (chosen) utt.voice = chosen
  window.speechSynthesis.speak(utt)
}

/* ─── Severity config ─── */
const SEV = {
  Mild:     { bg:'#f0fdf4', border:'#86efac', text:'#15803d', badge:'#dcfce7', dot:'#22c55e' },
  Moderate: { bg:'#fffbeb', border:'#fcd34d', text:'#b45309', badge:'#fef9c3', dot:'#f59e0b' },
  Severe:   { bg:'#fff1f2', border:'#fca5a5', text:'#b91c1c', badge:'#fee2e2', dot:'#ef4444' },
}

/* ─── Typing dots ─── */
const TypingDots = () => (
  <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
    <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#0ea5e9,#0284c7)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <Stethoscope size={13} color="white" />
    </div>
    <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:'16px 16px 16px 4px', padding:'12px 16px', display:'flex', gap:5, alignItems:'center', border:'1px solid rgba(255,255,255,0.1)' }}>
      {[0,1,2].map(i => (
        <motion.div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#38bdf8' }}
          animate={{ y:[0,-5,0], opacity:[0.5,1,0.5] }} transition={{ duration:0.7, repeat:Infinity, delay:i*0.15 }} />
      ))}
    </div>
  </div>
)

/* ─── Inline Report ─── */
const InlineReport = ({ data }: { data: ReportPayload }) => {
  const cfg = SEV[data.severityLevel] || SEV.Mild
  return (
    <motion.div initial={{ opacity:0, y:16, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }} transition={{ type:'spring', stiffness:260, damping:22 }}
      style={{ background:'rgba(255,255,255,0.06)', borderRadius:16, border:'1px solid rgba(255,255,255,0.12)', overflow:'hidden', marginTop:8 }}
    >
      <div style={{ background:'linear-gradient(135deg,rgba(12,74,110,0.9),rgba(3,105,161,0.9))', padding:'12px 14px', display:'flex', alignItems:'center', gap:10, backdropFilter:'blur(8px)' }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <FileText size={15} color="white" />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ color:'white', fontWeight:700, fontSize:13, margin:0 }}>Medical Report</p>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:10, margin:0 }}>AI Analysis · {new Date().toLocaleDateString('en-IN')}</p>
        </div>
        <div style={{ background:cfg.badge, border:`1px solid ${cfg.border}`, color:cfg.text, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
          <motion.div style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot }} animate={{ scale:[1,1.4,1], opacity:[1,0.6,1] }} transition={{ duration:1.5, repeat:Infinity }} />
          {data.severityLevel}
        </div>
      </div>
      <div style={{ padding:14 }}>
        <div style={{ display:'flex', gap:8, marginBottom:10, background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'8px 12px', alignItems:'center', border:'1px solid rgba(255,255,255,0.08)' }}>
          <User size={14} color="#94a3b8" />
          <span style={{ fontSize:12, color:'#94a3b8', fontWeight:500 }}>{data.patientName} · {data.age} yrs · {data.gender}</span>
        </div>

        <RSection icon={<Activity size={12} color="#38bdf8" />} title="Symptoms">
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {data.symptoms.map((s,i) => (
              <span key={i} style={{ background:'rgba(56,189,248,0.12)', border:'1px solid rgba(56,189,248,0.2)', color:'#38bdf8', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:500 }}>{s}</span>
            ))}
          </div>
        </RSection>

        <RSection icon={<Stethoscope size={12} color="#a78bfa" />} title="Possible Conditions">
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {data.possibleDiagnosis.map((d,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.15)', borderRadius:8, padding:'6px 10px' }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#a78bfa', flexShrink:0 }} />
                <span style={{ fontSize:12, color:'#c4b5fd', fontWeight:500 }}>{d}</span>
              </div>
            ))}
          </div>
        </RSection>

        <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:10, padding:'10px 12px', marginBottom:10, display:'flex', gap:8, alignItems:'flex-start' }}>
          <Pill size={13} color={cfg.text} style={{ flexShrink:0, marginTop:1 }} />
          <div>
            <p style={{ fontSize:10, fontWeight:700, color:cfg.text, margin:'0 0 2px', letterSpacing:0.5 }}>RECOMMENDED ACTION</p>
            <p style={{ fontSize:12, color:cfg.text, margin:0, lineHeight:1.6 }}>{data.recommendedAction}</p>
          </div>
        </div>
        {data.additionalNotes && <p style={{ fontSize:11, color:'#94a3b8', lineHeight:1.7, margin:'0 0 10px' }}>{data.additionalNotes}</p>}
        <div style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:8, padding:'7px 10px', display:'flex', gap:7, alignItems:'center' }}>
          <ShieldCheck size={12} color="#4ade80" />
          <p style={{ fontSize:11, color:'#4ade80', margin:0, fontWeight:500 }}>Report shared with your doctor</p>
        </div>
      </div>
    </motion.div>
  )
}

const RSection = ({ icon, title, children }: any) => (
  <div style={{ marginBottom:10 }}>
    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
      {icon}
      <p style={{ fontSize:10, fontWeight:700, color:'#64748b', letterSpacing:1, margin:0, textTransform:'uppercase' }}>{title}</p>
    </div>
    {children}
  </div>
)

const renderText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i} style={{ color:'#e2e8f0' }}>{part.slice(2,-2)}</strong> : part)
}

/* ═══════════════════════════════════════════════ */
const AIAssistantButton = () => {
  const { user, isAuthenticated } = userAuthStore()
  const { currentAppointment } = useAppointmentStore()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [voicePersona, setVoicePersona] = useState<VoicePersona>('default')
  const [language, setLanguage] = useState<'en' | 'hi'>('en')
  const [showVoicePanel, setShowVoicePanel] = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [pulse, setPulse] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Hide AI assistant during active calls
  const isOnCallPage = pathname?.includes('/call/')
  const isCallActive = currentAppointment?.status === 'In Progress'
  const shouldHide = isOnCallPage || isCallActive

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const sessionIdRef = useRef<string | null>(null)
  /* Track voiceEnabled in ref for instant mute in callbacks */
  const voiceEnabledRef = useRef(true)
  const voicePersonaRef = useRef<VoicePersona>('default')

  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled
    /* FIX: cancel immediately when muted */
    if (!voiceEnabled && typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [voiceEnabled])
  useEffect(() => { voicePersonaRef.current = voicePersona }, [voicePersona])

  useEffect(() => { const t = setTimeout(() => setPulse(false), 6000); return () => clearTimeout(t) }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])

  /* Greet on open — FIX: messages persist on close/reopen (hasGreeted stays true) */
  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (!isOpen || hasGreeted || messages.length > 0) return
    setHasGreeted(true)
    const uType: string = (user as any).userType || (user as any).type || 'patient'
    const first = user.name?.split(' ')[0] || 'there'
    const greet = language === 'hi'
      ? uType === 'doctor' ? `नमस्ते Dr. ${first}! 👋 मैं आपका AI क्लिनिकल असिस्टेंट हूं।` : `नमस्ते ${first}! 👋 मैं Dr. UniCare AI हूं। आज आप कैसा महसूस कर रहे हैं?`
      : uType === 'doctor' ? `Hello Dr. ${first}! I'm your clinical AI assistant. How can I help?` : `Hello ${first}! I'm Dr. UniCare AI. How are you feeling today?`
    setTimeout(() => {
      setMessages([{ id: 'greet', role: 'assistant', content: greet, timestamp: new Date() }])
      speakText(greet, voiceEnabledRef.current, voicePersonaRef.current)
    }, 500)
  }, [isOpen, isAuthenticated, user, language, hasGreeted, messages.length])

  if (!isAuthenticated || !user || shouldHide) return null

  const userType: string = (user as any).userType || (user as any).type || 'patient'
  const firstName = user.name?.split(' ')[0] || 'there'
  const addMsg = (msg: Message) => setMessages(prev => [...prev, msg])

  const sendMessage = async (text?: string) => {
    const txt = (text || input).trim()
    if (!txt || isLoading) return
    setInput('')
    addMsg({ id: Date.now().toString(), role: 'user', content: txt, timestamp: new Date() })
    setIsLoading(true); setIsTyping(true)
    try {
      const payload: any = { message: txt, language }
      if (sessionIdRef.current) payload.sessionId = sessionIdRef.current
      const res = await httpService.postWithAuth('/ai/chat', payload)
      setIsTyping(false)
      if (res.success) {
        setSessionId(res.data.sessionId)
        sessionIdRef.current = res.data.sessionId
        const isReport = res.data.reportReady && res.data.reportData
        const aiMsg: Message = { id: (Date.now()+1).toString(), role:'assistant', content:res.data.response, timestamp:new Date(), isReport, reportData: isReport ? res.data.reportData : undefined }
        addMsg(aiMsg)
        speakText(res.data.response, voiceEnabledRef.current, voicePersonaRef.current)
      } else {
        addMsg({ id:(Date.now()+1).toString(), role:'assistant', content: language==='hi' ? 'कुछ गड़बड़ हो गई। कृपया दोबारा कोशिश करें।' : 'I encountered a small issue. Please try again.', timestamp:new Date() })
      }
    } catch {
      setIsTyping(false)
      addMsg({ id:(Date.now()+1).toString(), role:'assistant', content: language==='hi' ? 'कनेक्शन की समस्या है।' : 'Connection error. Please check your internet.', timestamp:new Date() })
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const toggleMic = () => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { addMsg({ id:Date.now().toString(), role:'assistant', content:'Voice not supported in your browser.', timestamp:new Date() }); return }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const rec = new SR()
    rec.continuous = false; rec.interimResults = false
    rec.lang = language === 'hi' ? 'hi-IN' : VOICE_PERSONAS[voicePersona].lang
    recognitionRef.current = rec
    rec.onstart = () => setIsListening(true)
    rec.onend = () => setIsListening(false)
    rec.onerror = () => setIsListening(false)
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; setInput(t); setTimeout(() => sendMessage(t), 300) }
    rec.start()
  }

  /* FIX: reset clears messages but does NOT close the panel */
  const resetChat = () => {
    window.speechSynthesis?.cancel()
    setMessages([]); setSessionId(null); sessionIdRef.current = null
    setHasGreeted(false); setInput(''); setIsListening(false); setShowVoicePanel(false)
  }

  /* FIX: close only hides the window, does NOT wipe messages */
  const handleClose = () => setIsOpen(false)

  const formatTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })

  const quickChips = language === 'hi'
    ? userType === 'doctor' ? ['दवा की जानकारी','निदान सहायता','ICD कोड'] : ['सिरदर्द है','बुखार है','पेट दर्द है','थकान लग रही है']
    : userType === 'doctor' ? ['Drug interactions','Differential diagnosis','ICD-10 codes','Dosage help'] : ['I have a headache','Feeling feverish','Stomach ache','I feel tired']

  const placeholder = language === 'hi'
    ? isListening ? '🎤 सुन रहा हूं...' : 'अपने लक्षण बताएं...'
    : isListening ? '🎤 Listening...' : userType === 'doctor' ? 'Ask clinical questions...' : 'Tell me your symptoms...'

  return (
    <>
       <style>{`
         @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
         .ai-font { font-family:'DM Sans',system-ui,sans-serif; }
         .ai-scrollbar::-webkit-scrollbar { width:4px; }
         .ai-scrollbar::-webkit-scrollbar-track { background:transparent; }
         .ai-scrollbar::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.12); border-radius:4px; }
         .ai-scrollbar::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.2); }

         @media (max-width: 480px) {
           .ai-chat-window {
             width: calc(100vw - 24px) !important;
             height: calc(100vh - 100px) !important;
             bottom: 12px !important;
             right: 12px !important;
             left: 12px !important;
             border-radius: 20px !important;
           }
           .ai-fab {
             padding: 10px 14px !important;
           }
           .ai-fab-label {
             font-size: 11px !important;
           }
           .ai-fab-icon {
             width: 26px !important;
             height: 26px !important;
           }
         }
       `}</style>

       <div className='ai-font' style={{
         position:'fixed',
         bottom:24,
         right:24,
         zIndex:9999,
         ['--ai-chat-width' as any]: '420px',
         ['--ai-chat-height' as any]: '660px',
       }}>

         {/* ─── FAB button ─── */}
         <AnimatePresence>
           {!isOpen && (
             <motion.div
               initial={{ scale:0, opacity:0, y:20 }}
               animate={{ scale:1, opacity:1, y:0 }}
               exit={{ scale:0, opacity:0, y:20 }}
               transition={{ type:'spring', stiffness:300, damping:22 }}
               style={{ position:'relative' }}
             >
              {/* Pulse rings */}
              {pulse && [0,1].map(i => (
                <motion.div key={i}
                  style={{ position:'absolute', inset:-2, borderRadius:24, border:'2px solid rgba(14,165,233,0.5)', pointerEvents:'none' }}
                  animate={{ scale:[1, 1.6+i*0.4], opacity:[0.6,0] }}
                  transition={{ duration:2, repeat:Infinity, delay:i*0.6 }}
                />
              ))}

               {/* Main FAB */}
               <motion.button
                 onClick={() => setIsOpen(true)}
                 whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                 className='ai-fab'
                 style={{
                   display:'flex',
                   alignItems:'center',
                   gap:10,
                   background:'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c4a6e 100%)',
                   border:'1px solid rgba(14,165,233,0.3)',
                   borderRadius:20,
                   padding:'12px 20px',
                   cursor:'pointer',
                   boxShadow:'0 8px 32px rgba(14,165,233,0.25), 0 0 0 1px rgba(14,165,233,0.1) inset',
                 }}
               >
                {/* Animated icon cluster */}
                <div style={{ position:'relative', width:32, height:32, flexShrink:0 }}>
                  <motion.div
                    animate={{ rotate:360 }}
                    transition={{ duration:8, repeat:Infinity, ease:'linear' }}
                    style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1.5px dashed rgba(56,189,248,0.3)' }}
                  />
                  <div style={{
                    position:'absolute', inset:4, borderRadius:'50%',
                    background:'linear-gradient(135deg,#0ea5e9,#7c3aed)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 0 12px rgba(14,165,233,0.5)',
                  }}>
                    <Stethoscope size={12} color="white" />
                  </div>
                  <motion.div
                    animate={{ scale:[1,1.2,1], opacity:[1,0.7,1] }}
                    transition={{ duration:2, repeat:Infinity }}
                    style={{ position:'absolute', bottom:-1, right:-1, width:10, height:10, borderRadius:'50%', background:'#4ade80', border:'2px solid #0f172a' }}
                  />
                </div>

                 {/* Label */}
                 <div className='ai-fab-label' style={{ textAlign:'left' }}>
                   <p style={{ color:'white', fontWeight:700, fontSize:13, margin:0, letterSpacing:0.3, lineHeight:1 }}>
                     {userType === 'doctor' ? 'Clinical AI' : 'Health AI'}
                   </p>
                   <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3 }}>
                     <motion.div animate={{ opacity:[1,0.5,1] }} transition={{ duration:1.5, repeat:Infinity }}
                       style={{ width:5, height:5, borderRadius:'50%', background:'#4ade80' }} />
                     <p style={{ color:'rgba(56,189,248,0.8)', fontSize:10, margin:0, fontWeight:500 }}>Online · Ask anything</p>
                   </div>
                 </div>

                {/* Sparkle accent */}
                <motion.div animate={{ rotate:[0,15,-15,0], scale:[1,1.1,1] }} transition={{ duration:3, repeat:Infinity }}
                  style={{ marginLeft:4 }}>
                  <Sparkles size={14} color="rgba(56,189,248,0.7)" />
                </motion.div>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Backdrop (close on click outside, preserves messages) ─── */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key='backdrop'
              initial={{ opacity:0 }}
              animate={{ opacity:1 }}
              exit={{ opacity:0 }}
              onClick={handleClose}
              style={{ position:'fixed', inset:0, zIndex:9998, background:'rgba(0,0,0,0.25)', backdropFilter:'blur(2px)' }}
            />
          )}
        </AnimatePresence>

         {/* ─── Chat window ─── */}
         <AnimatePresence>
           {isOpen && (
             <motion.div
               key='chat'
               initial={{ opacity:0, scale:0.88, y:36 }}
               animate={{ opacity:1, scale:1, y:0 }}
               exit={{ opacity:0, scale:0.88, y:36 }}
               transition={{ type:'spring', stiffness:310, damping:28 }}
               onClick={e => e.stopPropagation()}
               className='ai-chat-window'
               style={{
                 position:'fixed',
                 bottom:20,
                 right:20,
                 zIndex:9999,
                 width:'var(--ai-chat-width, 420px)',
                 height:'var(--ai-chat-height, 660px)',
                 maxWidth: 'calc(100vw - 24px)',
                 maxHeight: 'calc(100vh - 100px)',
                 background:'linear-gradient(160deg, #0f172a 0%, #111827 40%, #0c1628 100%)',
                 borderRadius:24,
                 boxShadow:'0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.12)',
                 display:'flex',
                 flexDirection:'column',
                 overflow:'hidden',
                 border:'1px solid rgba(56,189,248,0.12)',
               }}
             >
              {/* Ambient glow */}
              <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(14,165,233,0.06)', pointerEvents:'none', filter:'blur(40px)' }} />
              <div style={{ position:'absolute', bottom:-40, left:-20, width:160, height:160, borderRadius:'50%', background:'rgba(124,58,237,0.05)', pointerEvents:'none', filter:'blur(30px)' }} />

              {/* ── Header ── */}
              <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0, position:'relative' }}>
                <div style={{ position:'relative' }}>
                  <div style={{ width:42, height:42, borderRadius:14, background:'linear-gradient(135deg,rgba(14,165,233,0.2),rgba(124,58,237,0.2))', border:'1px solid rgba(56,189,248,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Stethoscope size={18} color="#38bdf8" />
                  </div>
                  <motion.div animate={{ scale:[1,1.3,1], opacity:[1,0.6,1] }} transition={{ duration:2, repeat:Infinity }}
                    style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:'50%', background:'#4ade80', border:'2px solid #0f172a' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <p style={{ color:'white', fontWeight:700, fontSize:14, margin:0 }}>
                      {userType === 'doctor' ? 'Clinical AI Assistant' : 'Dr. UniCare AI'}
                    </p>
                    {voicePersona !== 'default' && (
                      <span style={{ fontSize:11, background:'rgba(56,189,248,0.12)', border:'1px solid rgba(56,189,248,0.2)', color:'#38bdf8', borderRadius:6, padding:'1px 7px', fontWeight:600 }}>
                        {VOICE_PERSONAS[voicePersona].emoji} {VOICE_PERSONAS[voicePersona].label}
                      </span>
                    )}
                  </div>
                  <p style={{ color:'rgba(148,163,184,0.7)', fontSize:11, margin:0 }}>
                    {language === 'hi' ? 'हिंदी में उपलब्ध' : userType === 'doctor' ? `Assisting Dr. ${firstName}` : 'Your health companion'}
                  </p>
                </div>
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  {[
                    { icon:<Settings size={13}/>, action:() => setShowVoicePanel(v=>!v), active:showVoicePanel, title:'Settings' },
                    {
                      icon: voiceEnabled ? <Volume2 size={13}/> : <VolumeX size={13}/>,
                      action: () => {
                        const next = !voiceEnabled
                        setVoiceEnabled(next)
                        /* instant cancel when muting */
                        if (!next && typeof window !== 'undefined') window.speechSynthesis?.cancel()
                      },
                      active: voiceEnabled, title: voiceEnabled ? 'Mute' : 'Unmute',
                    },
                    ...(messages.length > 0 ? [{ icon:<RotateCcw size={13}/>, action:resetChat, active:false, title:'New chat' }] : []),
                    { icon:<X size={14}/>, action:handleClose, active:false, title:'Close' },
                  ].map((btn, i) => (
                    <motion.button key={i} whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
                      onClick={btn.action} title={btn.title}
                      style={{ width:28, height:28, borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background: btn.active ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)', cursor:'pointer', color: btn.active ? '#38bdf8' : 'rgba(148,163,184,0.8)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                    >
                      {btn.icon}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Voice Settings Panel ── */}
              <AnimatePresence>
                {showVoicePanel && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }}
                    style={{ background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', flexShrink:0 }}
                  >
                    <div style={{ padding:'10px 14px' }}>
                      <p style={{ fontSize:10, fontWeight:700, color:'rgba(148,163,184,0.5)', letterSpacing:1.5, margin:'0 0 7px', textTransform:'uppercase' }}>Language</p>
                      <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                        {(['en','hi'] as const).map(lang => (
                          <motion.button key={lang} whileTap={{ scale:0.95 }} onClick={() => { setLanguage(lang); resetChat() }}
                            style={{ padding:'5px 14px', borderRadius:20, border:'1px solid', borderColor: language===lang ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.1)', background: language===lang ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)', color: language===lang ? '#38bdf8' : '#94a3b8', fontSize:12, fontWeight:600, cursor:'pointer' }}
                          >
                            {lang === 'en' ? '🇬🇧 English' : '🇮🇳 हिंदी'}
                          </motion.button>
                        ))}
                      </div>
                      <p style={{ fontSize:10, fontWeight:700, color:'rgba(148,163,184,0.5)', letterSpacing:1.5, margin:'0 0 7px', textTransform:'uppercase' }}>Voice Persona</p>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {(Object.entries(VOICE_PERSONAS) as [VoicePersona, typeof VOICE_PERSONAS[VoicePersona]][]).map(([key, cfg]) => (
                          <motion.button key={key} whileTap={{ scale:0.95 }} onClick={() => setVoicePersona(key)} title={cfg.description}
                            style={{ padding:'5px 11px', borderRadius:20, border:'1px solid', borderColor: voicePersona===key ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.1)', background: voicePersona===key ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)', color: voicePersona===key ? '#38bdf8' : '#94a3b8', fontSize:12, fontWeight: voicePersona===key ? 700 : 400, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}
                          >
                            {cfg.emoji} {cfg.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Messages ── */}
              <div className='ai-scrollbar' style={{ flex:1, overflowY:'auto', padding:'14px 12px', display:'flex', flexDirection:'column', gap:2 }}>
                {messages.map(msg => (
                  <div key={msg.id}>
                    <motion.div
                      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ type:'spring', stiffness:280, damping:24 }}
                      style={{ display:'flex', flexDirection: msg.role==='user' ? 'row-reverse' : 'row', alignItems:'flex-end', gap:7, marginBottom:4 }}
                    >
                      {msg.role === 'assistant' && (
                        <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 12px rgba(14,165,233,0.3)' }}>
                          <Stethoscope size={12} color="white" />
                        </div>
                      )}
                      <div style={{
                        maxWidth:'80%',
                        background: msg.role==='user' ? 'linear-gradient(135deg,#0ea5e9,#0284c7)' : 'rgba(255,255,255,0.06)',
                        color: msg.role==='user' ? 'white' : '#e2e8f0',
                        borderRadius: msg.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        padding:'9px 13px', fontSize:13, lineHeight:1.65,
                        border: msg.role==='assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                        boxShadow: msg.role==='user' ? '0 3px 12px rgba(14,165,233,0.3)' : 'none',
                        backdropFilter: msg.role==='assistant' ? 'blur(8px)' : 'none',
                      }}>
                        <div>{renderText(msg.content)}</div>
                        <div style={{ fontSize:10, opacity:0.45, marginTop:3, textAlign: msg.role==='user' ? 'right' : 'left' }}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </motion.div>
                    {msg.isReport && msg.reportData && (
                      <div style={{ paddingLeft:35 }}><InlineReport data={msg.reportData} /></div>
                    )}
                  </div>
                ))}
                {isTyping && <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}><TypingDots /></motion.div>}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Quick chips ── */}
              {messages.length <= 1 && (
                <div style={{ padding:'0 12px 8px', display:'flex', gap:5, flexWrap:'wrap', flexShrink:0 }}>
                  {quickChips.map(chip => (
                    <motion.button key={chip} whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={() => sendMessage(chip)}
                      style={{ background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.2)', color:'#38bdf8', borderRadius:20, padding:'4px 11px', fontSize:11.5, cursor:'pointer', fontWeight:500, display:'flex', alignItems:'center', gap:4 }}
                    >
                      <ChevronRight size={11} />{chip}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ── Input ── */}
              <div style={{ padding:'8px 12px 14px', borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(255,255,255,0.05)', borderRadius:16, border:'1.5px solid rgba(255,255,255,0.08)', padding:'5px 5px 5px 12px', backdropFilter:'blur(8px)' }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder={placeholder}
                    disabled={isLoading}
                    style={{ flex:1, border:'none', background:'transparent', fontSize:13, color:'#e2e8f0', outline:'none', fontFamily:'inherit', '::placeholder':{ color:'rgba(148,163,184,0.5)' } } as any}
                  />
                  <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }} onClick={toggleMic}
                    style={{ width:32, height:32, borderRadius:'50%', border:'none', background: isListening ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.08)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow: isListening ? '0 0 12px rgba(239,68,68,0.5)' : 'none' }}
                  >
                    {isListening
                      ? <motion.div animate={{ scale:[1,1.15,1] }} transition={{ duration:0.5, repeat:Infinity }}><MicOff size={14} color="white" /></motion.div>
                      : <Mic size={14} color="rgba(148,163,184,0.7)" />
                    }
                  </motion.button>
                  <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.94 }} onClick={() => sendMessage()} disabled={!input.trim() || isLoading}
                    style={{ width:32, height:32, borderRadius:'50%', border:'none', background: input.trim() && !isLoading ? 'linear-gradient(135deg,#0ea5e9,#0284c7)' : 'rgba(255,255,255,0.05)', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.2s', boxShadow: input.trim() && !isLoading ? '0 4px 12px rgba(14,165,233,0.4)' : 'none' }}
                  >
                    {isLoading
                      ? <motion.div style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'white', borderRadius:'50%' }} animate={{ rotate:360 }} transition={{ duration:0.7, repeat:Infinity, ease:'linear' }} />
                      : <Send size={13} color={input.trim() ? 'white' : 'rgba(148,163,184,0.4)'} />
                    }
                  </motion.button>
                </div>
                <p style={{ fontSize:10, color:'rgba(100,116,139,0.6)', textAlign:'center', margin:'5px 0 0' }}>
                  {language === 'hi' ? 'AI सहायता · चिकित्सा निदान नहीं' : 'AI-assisted · Not a final medical diagnosis · UniCare'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export default AIAssistantButton