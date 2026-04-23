'use client'
import { DoctorFormData, HospitalInfo } from '@/lib/types'
import { userAuthStore } from '@/store/authStore'
import React, { ChangeEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { healthcareCategoriesList, specializations } from '@/lib/constant'
import { Checkbox } from '../ui/checkbox'
import { ArrowLeft, ArrowRight, CheckCircle, Clock, MapPin, Plus, Stethoscope, Trash2, X } from 'lucide-react'

const STEPS = [
  { number: 1, title: 'Professional Info', icon: Stethoscope, desc: 'Your medical credentials' },
  { number: 2, title: 'Hospital / Clinic', icon: MapPin, desc: 'Where you practice' },
  { number: 3, title: 'Availability', icon: Clock, desc: 'Your working schedule' },
]

const DoctorOnboardingForm = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<DoctorFormData>({
    specialization: '', categories: [], qualification: '', experience: '', fees: '', about: '',
    hospitalInfo: { name: '', address: '', city: '' },
    availabilityRange: { startDate: '', endDate: '', excludedWeekdays: [] },
    dailyTimeRanges: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
    slotDurationMinutes: 30,
  })
  const { updateProfile, user, loading } = userAuthStore()
  const router = useRouter()

  const handleCategoryToggle = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(cat) ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat],
    }))
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleHospitalChange = (field: keyof HospitalInfo, value: string) => {
    setFormData(prev => ({ ...prev, hospitalInfo: { ...prev.hospitalInfo, [field]: value } }))
  }

  const handleSubmit = async () => {
    try {
      await updateProfile({
        specialization: formData.specialization, category: formData.categories,
        qualification: formData.qualification, experience: formData.experience,
        about: formData.about, fees: formData.fees, hospitalInfo: formData.hospitalInfo,
        availabilityRange: { startDate: new Date(formData.availabilityRange.startDate), endDate: new Date(formData.availabilityRange.endDate), excludedWeekdays: formData.availabilityRange.excludedWeekdays },
        dailyTimeRanges: formData.dailyTimeRanges, slotDurationMinutes: formData.slotDurationMinutes,
      })
      router.push('/doctor/dashboard')
    } catch (err) { console.error('Profile Update Failed', err) }
  }

  const step1Valid = !!formData.specialization && formData.categories.length > 0 && !!formData.qualification
  const step2Valid = !!formData.hospitalInfo.name && !!formData.hospitalInfo.address && !!formData.hospitalInfo.city
  const step3Valid = !!formData.availabilityRange.startDate && !!formData.availabilityRange.endDate

  const UCInput = ({ label, name, type = 'text', value, onChange, placeholder = '' }: any) => (
    <div className='space-y-2'>
      <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>{label}</label>
      <input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder}
        className='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-[#F8F7F4] text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all duration-200'
      />
    </div>
  )

  const UCTextarea = ({ label, name, value, onChange, placeholder = '', rows = 3 }: any) => (
    <div className='space-y-2'>
      <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>{label}</label>
      <textarea name={name} value={value} onChange={onChange} rows={rows} placeholder={placeholder}
        className='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-[#F8F7F4] text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all duration-200 resize-none'
      />
    </div>
  )

  const DAYS = [{ day: 'Sun', v: 0 }, { day: 'Mon', v: 1 }, { day: 'Tue', v: 2 }, { day: 'Wed', v: 3 }, { day: 'Thu', v: 4 }, { day: 'Fri', v: 5 }, { day: 'Sat', v: 6 }]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font { font-family:'DM Sans',system-ui,sans-serif; }
        .uc-serif { font-family:'Fraunces',Georgia,serif; }
        @keyframes step-in { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        .step-animate { animation: step-in 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .next-btn { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
        .next-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(14,165,233,0.28); }
        @keyframes blob { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(12px,-10px) scale(1.06)} }
        .blob { animation: blob 10s ease-in-out infinite; }
      `}</style>

      <div className='uc-font min-h-screen flex bg-[#F8F7F4]'>

        {/* ─── Left Panel ─── */}
        <div className='hidden lg:flex lg:w-[38%] xl:w-[36%] flex-col justify-between bg-slate-950 px-10 py-12 relative overflow-hidden'>
          <div className='blob absolute top-[-80px] right-[-60px] w-72 h-72 bg-sky-500/8 rounded-full blur-3xl pointer-events-none' />
          <div className='absolute inset-0 opacity-[0.04]' style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.3) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

          <div className='relative z-10 flex items-center gap-2.5'>
            <div className='w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30'>
              <Stethoscope className='w-4 h-4 text-white' />
            </div>
            <span className='uc-serif text-lg font-bold text-white'>Uni<span className='text-sky-400'>Care</span><sup className='text-slate-500 font-light text-[11px]'>+</sup></span>
          </div>

          <div className='relative z-10 space-y-4'>
            <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-6'>Doctor Setup</p>
            {STEPS.map(({ number, title, icon: Icon, desc }) => {
              const isActive = currentStep === number
              const isDone = currentStep > number
              return (
                <div key={number} className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${isActive ? 'bg-sky-500/15 border border-sky-500/20' : 'opacity-50'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isDone ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : isActive ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800 border border-slate-700'}`}>
                    {isDone ? <CheckCircle className='w-5 h-5 text-white' /> : <Icon className='w-5 h-5 text-white' />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold leading-none ${isActive ? 'text-white' : 'text-slate-400'}`}>{title}</p>
                    <p className='text-[11px] text-slate-500 mt-0.5'>{desc}</p>
                  </div>
                  {isActive && <div className='ml-auto w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse' />}
                </div>
              )
            })}
          </div>

          <div className='relative z-10'>
            <p className='text-xs text-slate-600'>Your information is private & never shared without consent.</p>
          </div>
        </div>

        {/* ─── Form ─── */}
        <div className='flex-1 flex items-center justify-center px-6 py-12'>
          <div className='w-full max-w-lg'>
            <div className='mb-8'>
              <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-500 mb-2'>Step {currentStep} of {STEPS.length}</p>
              <h1 className='uc-serif text-3xl font-bold text-slate-900 leading-tight mb-1'>
                Welcome, <em className='not-italic text-sky-500'>Dr. {user?.name?.split(' ')[0]}</em>
              </h1>
              <p className='text-slate-500 text-sm'>Complete your profile to start seeing patients.</p>
            </div>

            {/* Progress */}
            <div className='mb-8'>
              <div className='flex items-center justify-between mb-2'>
                {STEPS.map(({ number }) => (
                  <React.Fragment key={number}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold transition-all duration-300 ${currentStep > number ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : currentStep === number ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'bg-slate-200 text-slate-400'}`}>
                      {currentStep > number ? <CheckCircle className='w-4 h-4' /> : number}
                    </div>
                    {number < STEPS.length && (
                      <div className='flex-1 h-1.5 mx-2 bg-slate-200 rounded-full overflow-hidden'>
                        <div className={`h-full rounded-full transition-all duration-500 ${currentStep > number ? 'bg-emerald-500 w-full' : 'w-0'}`} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p className='text-xs font-semibold text-slate-500 mt-2'>{STEPS[currentStep - 1]?.title}</p>
            </div>

            <div key={currentStep} className='step-animate'>

              {/* Step 1 */}
              {currentStep === 1 && (
                <div className='space-y-5'>
                  <div className='space-y-2'>
                    <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>Medical Specialization</label>
                    <Select value={formData.specialization} onValueChange={v => setFormData(prev => ({ ...prev, specialization: v }))}>
                      <SelectTrigger className='rounded-xl border-2 border-slate-200 bg-[#F8F7F4] text-sm font-medium text-slate-700'>
                        <SelectValue placeholder='Select Specialization' />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-slate-100 shadow-2xl max-h-64'>
                        {specializations.map(s => <SelectItem key={s} value={s} className='text-sm rounded-xl'>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-3'>
                    <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>Healthcare Categories <span className='text-red-400'>*</span></label>
                    <div className='grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1'>
                      {healthcareCategoriesList.map((cat: string) => (
                        <label key={cat} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-150 ${formData.categories.includes(cat) ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                          <Checkbox id={cat} checked={formData.categories.includes(cat)} onCheckedChange={() => handleCategoryToggle(cat)} className='data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500' />
                          <span className='text-xs font-semibold'>{cat}</span>
                        </label>
                      ))}
                    </div>
                    {formData.categories.length === 0 && <p className='text-red-500 text-xs font-medium'>Select at least one category</p>}
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <UCInput label='Qualification' name='qualification' value={formData.qualification} onChange={handleInputChange} placeholder='MBBS, MD Cardiology' />
                    <UCInput label='Experience (Years)' name='experience' type='number' value={formData.experience} onChange={handleInputChange} placeholder='5' />
                  </div>
                  <UCInput label='Consultation Fee (₹)' name='fees' type='number' value={formData.fees} onChange={handleInputChange} placeholder='500' />
                  <UCTextarea label='About You' name='about' value={formData.about} onChange={handleInputChange} placeholder='Describe your expertise and approach to patient care...' />
                </div>
              )}

              {/* Step 2 */}
              {currentStep === 2 && (
                <div className='space-y-5'>
                  <div className='flex items-start gap-4 p-4 bg-sky-50 border border-sky-100 rounded-2xl mb-2'>
                    <MapPin className='w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5' />
                    <p className='text-xs text-sky-700 leading-relaxed'>This information helps patients find you and understand your practice location.</p>
                  </div>
                  <UCInput label='Hospital / Clinic Name' name='hospitalName' value={formData.hospitalInfo.name} onChange={(e: any) => handleHospitalChange('name', e.target.value)} placeholder='e.g., Apollo Hospital' />
                  <UCTextarea label='Full Address' name='address' value={formData.hospitalInfo.address} onChange={(e: any) => handleHospitalChange('address', e.target.value)} placeholder='Street address, landmark...' rows={3} />
                  <UCInput label='City' name='city' value={formData.hospitalInfo.city} onChange={(e: any) => handleHospitalChange('city', e.target.value)} placeholder='e.g., Prayagraj' />
                </div>
              )}

              {/* Step 3 */}
              {currentStep === 3 && (
                <div className='space-y-5'>
                  <div className='grid grid-cols-2 gap-4'>
                    <UCInput label='Available From' name='startDate' type='date' value={formData.availabilityRange.startDate}
                      onChange={(e: any) => setFormData(prev => ({ ...prev, availabilityRange: { ...prev.availabilityRange, startDate: e.target.value } }))}
                    />
                    <UCInput label='Available Until' name='endDate' type='date' value={formData.availabilityRange.endDate}
                      onChange={(e: any) => setFormData(prev => ({ ...prev, availabilityRange: { ...prev.availabilityRange, endDate: e.target.value } }))}
                    />
                  </div>

                  <div className='space-y-2'>
                    <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>Slot Duration</label>
                    <Select value={formData.slotDurationMinutes?.toString() || '30'} onValueChange={v => setFormData(prev => ({ ...prev, slotDurationMinutes: parseInt(v) }))}>
                      <SelectTrigger className='rounded-xl border-2 border-slate-200 bg-[#F8F7F4] text-sm font-medium'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-slate-100 shadow-2xl'>
                        {[15, 20, 30, 45, 60, 90, 120].map(m => <SelectItem key={m} value={String(m)} className='text-sm rounded-xl'>{m} minutes</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-3'>
                    <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>Days Off (Excluded)</label>
                    <div className='flex flex-wrap gap-2'>
                      {DAYS.map(({ day, v }) => {
                        const excluded = formData.availabilityRange.excludedWeekdays.includes(v)
                        return (
                          <button key={v} type='button'
                            onClick={() => {
                              const arr = [...formData.availabilityRange.excludedWeekdays]
                              const idx = arr.indexOf(v)
                              if (idx > -1) arr.splice(idx, 1); else arr.push(v)
                              setFormData(prev => ({ ...prev, availabilityRange: { ...prev.availabilityRange, excludedWeekdays: arr } }))
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 ${excluded ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>Working Hours</label>
                    {formData.dailyTimeRanges.map((range, i) => (
                      <div key={i} className='flex items-center gap-3 bg-[#F8F7F4] border border-slate-200 rounded-xl p-3'>
                        <span className='text-[11px] font-bold text-slate-400 w-16 flex-shrink-0'>Session {i + 1}</span>
                        <input type='time' value={range.start}
                          onChange={e => { const r = [...formData.dailyTimeRanges]; r[i].start = e.target.value; setFormData(prev => ({ ...prev, dailyTimeRanges: r })) }}
                          className='flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:border-sky-400 focus:outline-none'
                        />
                        <span className='text-xs font-bold text-slate-400'>to</span>
                        <input type='time' value={range.end}
                          onChange={e => { const r = [...formData.dailyTimeRanges]; r[i].end = e.target.value; setFormData(prev => ({ ...prev, dailyTimeRanges: r })) }}
                          className='flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:border-sky-400 focus:outline-none'
                        />
                        {formData.dailyTimeRanges.length > 1 && (
                          <button onClick={() => setFormData(prev => ({ ...prev, dailyTimeRanges: prev.dailyTimeRanges.filter((_, idx) => idx !== i) }))}
                            className='w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors flex-shrink-0'
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, dailyTimeRanges: [...prev.dailyTimeRanges, { start: '18:00', end: '20:00' }] }))}
                      className='flex items-center gap-2 text-xs font-bold text-sky-600 border border-sky-200 bg-sky-50 hover:bg-sky-100 px-4 py-2.5 rounded-xl transition-all duration-200'
                    >
                      <Plus className='w-3.5 h-3.5' />Add Another Session
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className='flex items-center justify-between mt-10 pt-6 border-t border-slate-200'>
              <button type='button' onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 1}
                className='flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 group'
              >
                <ArrowLeft className='w-4 h-4 group-hover:-translate-x-0.5 transition-transform' />Back
              </button>

              {currentStep < 3 ? (
                <button type='button' onClick={() => setCurrentStep(s => s + 1)}
                  disabled={(currentStep === 1 && !step1Valid) || (currentStep === 2 && !step2Valid)}
                  className='next-btn flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 px-6 py-3 rounded-2xl shadow-md shadow-sky-200/50 disabled:shadow-none disabled:cursor-not-allowed'
                >
                  Continue <ArrowRight className='w-4 h-4' />
                </button>
              ) : (
                <button type='button' onClick={handleSubmit} disabled={loading || !step3Valid}
                  className='next-btn flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 px-6 py-3 rounded-2xl shadow-md shadow-emerald-200/50 disabled:shadow-none disabled:cursor-not-allowed'
                >
                  {loading ? <><div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />Setting up...</> : <><CheckCircle className='w-4 h-4' />Complete Profile</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DoctorOnboardingForm