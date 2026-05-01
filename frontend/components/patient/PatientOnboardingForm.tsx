'use client'

import { userAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import React, { ChangeEvent, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowLeft, ArrowRight, CheckCircle, Heart, Phone, Stethoscope, User } from 'lucide-react';

interface EmergencyContact { name: string; phone: string; relationship: string; }
interface MedicalHistory { allergies: string; currentMedications: string; chronicConditions: string; }
interface PatientOnboardingData {
  phone: string; dob: string; gender: string; bloodGroup?: string;
  emergencyContact: EmergencyContact; medicalHistory: MedicalHistory;
}

interface UCInputProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
}

const UCInput = ({ label, name, type = 'text', value, onChange, placeholder = '' }: UCInputProps) => (
  <div className='space-y-2'>
    <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>{label}</label>
    <input
      name={name} type={type} value={value} onChange={onChange} placeholder={placeholder}
      className='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-[#F8F7F4] text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all duration-200'
    />
  </div>
);

interface UCTextareaProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}

const UCTextarea = ({ label, id, value, onChange, placeholder = '', rows = 3 }: UCTextareaProps) => (
  <div className='space-y-2'>
    <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>{label}</label>
    <textarea
      id={id} value={value} onChange={onChange} rows={rows} placeholder={placeholder}
      className='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-[#F8F7F4] text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all duration-200 resize-none'
    />
  </div>
);

const STEPS = [
  { number: 1, title: 'Basic Details',      icon: User,       desc: 'Tell us about yourself' },
  { number: 2, title: 'Emergency Contact',  icon: Phone,      desc: 'Someone we can reach' },
  { number: 3, title: 'Medical History',    icon: Stethoscope, desc: 'Help your doctor help you' },
];

const PatientOnboardingForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PatientOnboardingData>({
    phone: '', dob: '', gender: '', bloodGroup: '',
    emergencyContact: { name: '', phone: '', relationship: '' },
    medicalHistory: { allergies: '', currentMedications: '', chronicConditions: '' },
  });

  const { updateProfile, user, loading } = userAuthStore();
  const router = useRouter();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) =>
    setFormData(prev => ({ ...prev, [name]: value }));

  const handleEmergencyChange = (field: keyof EmergencyContact, value: string) =>
    setFormData(prev => ({ ...prev, emergencyContact: { ...prev.emergencyContact, [field]: value } }));

  const handleMedicalChange = (field: keyof MedicalHistory, value: string) =>
    setFormData(prev => ({ ...prev, medicalHistory: { ...prev.medicalHistory, [field]: value } }));

  const handleSubmit = async () => {
    try {
      await updateProfile({
        Phone: formData.phone, dob: formData.dob, gender: formData.gender,
        bloodGroup: formData.bloodGroup, emergencyContact: formData.emergencyContact,
        medicalHistory: formData.medicalHistory,
      });
      router.push('/');
    } catch (err) { console.error('Profile Update Failed', err); }
  };

  const step1Valid = !!formData.phone && !!formData.dob && !!formData.gender;
  const step2Valid = !!formData.emergencyContact.name && !!formData.emergencyContact.phone && !!formData.emergencyContact.relationship;
  const step3Valid = !!formData.medicalHistory.allergies && !!formData.medicalHistory.currentMedications && !!formData.medicalHistory.chronicConditions;
  const isNextDisabled = (currentStep === 1 && !step1Valid) || (currentStep === 2 && !step2Valid);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        @keyframes step-in {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .step-animate { animation: step-in 0.4s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes prog-fill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .prog-fill { transform-origin: left; animation: prog-fill 0.4s cubic-bezier(0.16,1,0.3,1) both; }

        .next-btn {
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .next-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(14,165,233,0.28);
        }
        .next-btn:not(:disabled):active { transform: translateY(0); }

        @keyframes blob-drift {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(16px,-12px) scale(1.06); }
        }
        .blob-animate { animation: blob-drift 10s ease-in-out infinite; }
      `}</style>

      <div className='uc-font min-h-screen bg-[#F8F7F4] flex'>

        {/* ─── Left: Visual Panel ─────────────────── */}
        <div className='hidden lg:flex lg:w-[38%] xl:w-[36%] flex-col justify-between bg-slate-950 px-10 py-12 relative overflow-hidden'>
          <div className='blob-animate absolute top-[-80px] right-[-60px] w-72 h-72 bg-sky-500/8 rounded-full blur-3xl pointer-events-none' />
          <div className='absolute inset-0 opacity-[0.04]' style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

          {/* Logo */}
          <div className='relative z-10 flex items-center gap-2.5'>
            <div className='w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30'>
              <Stethoscope className='w-4 h-4 text-white' />
            </div>
            <span className='uc-serif text-lg font-bold text-white'>
              Uni<span className='text-sky-400'>Care</span><sup className='text-slate-500 font-light text-[11px]'>+</sup>
            </span>
          </div>

          {/* Step indicators */}
          <div className='relative z-10 space-y-4'>
            <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-6'>Setup Progress</p>
            {STEPS.map(({ number, title, icon: Icon, desc }) => {
              const isActive = currentStep === number;
              const isDone = currentStep > number;
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
              );
            })}
          </div>

          <div className='relative z-10'>
            <div className='flex items-center gap-2 text-xs text-slate-500'>
              <Heart className='w-3.5 h-3.5 text-rose-400' />
              Your information is private & secure
            </div>
          </div>
        </div>

        {/* ─── Right: Form ────────────────────────── */}
        <div className='flex-1 flex items-center justify-center px-6 py-12'>
          <div className='w-full max-w-lg'>

            {/* Welcome */}
            <div className='mb-8'>
              <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-500 mb-2'>
                Step {currentStep} of {STEPS.length}
              </p>
              <h1 className='uc-serif text-3xl font-bold text-slate-900 leading-tight mb-1'>
                Welcome, <em className='not-italic text-sky-500'>{user?.name?.split(' ')[0]}</em>
              </h1>
              <p className='text-slate-500 text-sm'>Complete your profile to start booking appointments.</p>
            </div>

            {/* Progress bar */}
            <div className='mb-8'>
              <div className='flex items-center justify-between mb-2'>
                {STEPS.map(({ number }) => (
                  <React.Fragment key={number}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold transition-all duration-300 ${
                      currentStep > number ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                        : currentStep === number ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {currentStep > number ? <CheckCircle className='w-4 h-4' /> : number}
                    </div>
                    {number < STEPS.length && (
                      <div className='flex-1 h-1.5 mx-2 bg-slate-200 rounded-full overflow-hidden'>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${currentStep > number ? 'bg-emerald-500 w-full' : currentStep === number ? 'bg-sky-400 w-1/2' : 'w-0'}`}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p className='text-xs font-semibold text-slate-500 mt-2'>{STEPS[currentStep - 1]?.title}</p>
            </div>

             {/* Form content */}
             <div className='step-animate'>

              {/* Step 1: Basic Details */}
              {currentStep === 1 && (
                <div className='space-y-5'>
                  <div className='grid grid-cols-2 gap-4'>
                    <UCInput label='Phone Number' name='phone' type='tel' value={formData.phone} onChange={handleInputChange} placeholder='+91 98765 43210' />
                    <UCInput label='Date of Birth' name='dob' type='date' value={formData.dob} onChange={handleInputChange} />
                  </div>

                  <div className='space-y-2'>
                    <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>Gender</label>
                    <div className='flex gap-3'>
                      {['male', 'female', 'other'].map((g) => (
                        <button
                          key={g}
                          type='button'
                          onClick={() => handleSelectChange('gender', g)}
                          className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all duration-200 ${
                            formData.gender === g
                              ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>Blood Group</label>
                    <Select value={formData.bloodGroup} onValueChange={(v) => handleSelectChange('bloodGroup', v)}>
                      <SelectTrigger className='rounded-xl border-2 border-slate-200 bg-[#F8F7F4] text-sm font-medium'>
                        <SelectValue placeholder='Select blood group' />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-slate-100 shadow-xl'>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((b) => (
                          <SelectItem key={b} value={b} className='text-sm rounded-xl'>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 2: Emergency Contact */}
              {currentStep === 2 && (
                <div className='space-y-5'>
                  <div className='flex items-start gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl mb-2'>
                    <span className='text-2xl flex-shrink-0'>⚠️</span>
                    <p className='text-xs text-amber-700 leading-relaxed'>
                      This person will be contacted on your behalf in case of emergency during consultations.
                    </p>
                  </div>
                  <UCInput label='Contact Name' name='emergencyName' value={formData.emergencyContact.name}
                    onChange={(e: any) => handleEmergencyChange('name', e.target.value)} placeholder='Full name' />
                  <UCInput label='Contact Phone' name='emergencyPhone' type='tel' value={formData.emergencyContact.phone}
                    onChange={(e: any) => handleEmergencyChange('phone', e.target.value)} placeholder='+91 98765 43210' />
                  <div className='space-y-2'>
                    <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>Relationship</label>
                    <Select value={formData.emergencyContact.relationship} onValueChange={(v) => handleEmergencyChange('relationship', v)}>
                      <SelectTrigger className='rounded-xl border-2 border-slate-200 bg-[#F8F7F4] text-sm font-medium'>
                        <SelectValue placeholder='Select relationship' />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-slate-100 shadow-xl'>
                        {['Spouse','Parent','Child','Sibling','Friend','Relative','Other'].map((r) => (
                          <SelectItem key={r} value={r.toLowerCase()} className='text-sm rounded-xl'>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 3: Medical History */}
              {currentStep === 3 && (
                <div className='space-y-5'>
                  <div className='flex items-start gap-4 p-4 bg-sky-50 border border-sky-100 rounded-2xl mb-2'>
                    <span className='text-2xl flex-shrink-0'>🔒</span>
                    <p className='text-xs text-sky-700 leading-relaxed'>
                      This information helps doctors provide better care. All data is kept strictly confidential and never shared with third parties.
                    </p>
                  </div>
                  <UCTextarea label='Known Allergies' id='allergies' value={formData.medicalHistory.allergies}
                    onChange={(e: any) => handleMedicalChange('allergies', e.target.value)}
                    placeholder='e.g., Penicillin, Peanuts, Dust (or "None")' />
                  <UCTextarea label='Current Medications' id='meds' value={formData.medicalHistory.currentMedications}
                    onChange={(e: any) => handleMedicalChange('currentMedications', e.target.value)}
                    placeholder='List current medications with dosage (or "None")' />
                  <UCTextarea label='Chronic Conditions' id='chronic' value={formData.medicalHistory.chronicConditions}
                    onChange={(e: any) => handleMedicalChange('chronicConditions', e.target.value)}
                    placeholder='e.g., Diabetes, Hypertension, Asthma (or "None")' />
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className='flex items-center justify-between mt-10 pt-6 border-t border-slate-200'>
              <button
                type='button'
                onClick={() => setCurrentStep(s => s - 1)}
                disabled={currentStep === 1}
                className='flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 group'
              >
                <ArrowLeft className='w-4 h-4 group-hover:-translate-x-0.5 transition-transform' />
                Back
              </button>

              {currentStep < 3 ? (
                <button
                  type='button'
                  onClick={() => setCurrentStep(s => s + 1)}
                  disabled={isNextDisabled}
                  className='next-btn flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 px-6 py-3 rounded-2xl shadow-md shadow-sky-200/50 disabled:shadow-none disabled:cursor-not-allowed'
                >
                  Continue
                  <ArrowRight className='w-4 h-4' />
                </button>
              ) : (
                <button
                  type='button'
                  onClick={handleSubmit}
                  disabled={loading || !step3Valid}
                  className='next-btn flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 px-6 py-3 rounded-2xl shadow-md shadow-emerald-200/50 disabled:shadow-none disabled:cursor-not-allowed'
                >
                  {loading ? (
                    <><div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />Setting up...</>
                  ) : (
                    <><CheckCircle className='w-4 h-4' />Complete Profile</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PatientOnboardingForm;