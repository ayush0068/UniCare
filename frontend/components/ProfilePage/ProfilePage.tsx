'use client'

import { healthcareCategories, specializations } from '@/lib/constant';
import { userAuthStore } from '@/store/authStore';
import { BadgeCheck, Camera, Clock, FileText, Heart, MapPin, Phone, Plus, Save, Shield, Stethoscope, Upload, User, X, AlertTriangle, CheckCircle2, Trash2, CreditCard } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import Header from '../landing/Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { postWithAuth, deleteWithAuth, getWithAuth } from '@/service/httpService';
import BankDetailsPanel from '../doctor/BankDetailsPanel';

interface ProfileProps {
  userType: 'doctor' | 'patient';
}

interface FieldWrapperProps {
  label: string;
  children: React.ReactNode;
}

const FieldWrapper = ({ label, children }: FieldWrapperProps) => (
  <div className='space-y-2'>
    <label className='text-[11px] font-bold uppercase tracking-widest text-slate-400'>{label}</label>
    {children}
  </div>
);

interface UCInputProps {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  isEditing?: boolean;
}

const UCInput = ({ value, onChange, type = 'text', placeholder = '', readOnly = false, isEditing = true }: UCInputProps) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    readOnly={readOnly || !isEditing}
    placeholder={placeholder}
    className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-slate-800 placeholder:text-slate-300 transition-all duration-200
      ${!isEditing || readOnly
        ? 'bg-slate-50 border-slate-100 text-slate-500 cursor-default'
        : 'bg-white border-slate-200 hover:border-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none'
      }`}
  />
);

interface UCTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  isEditing?: boolean;
}

const UCTextarea = ({ value, onChange, rows = 4, placeholder = '', isEditing = true }: UCTextareaProps) => (
  <textarea
    value={value}
    onChange={onChange}
    disabled={!isEditing}
    rows={rows}
    placeholder={placeholder}
    className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-slate-800 placeholder:text-slate-300 resize-none transition-all duration-200
      ${!isEditing
        ? 'bg-slate-50 border-slate-100 text-slate-500 cursor-default'
        : 'bg-white border-slate-200 hover:border-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none'
      }`}
  />
);

// ── Document types a doctor can upload ──
const DOCUMENT_TYPES = [
  'Medical Degree (MBBS/MD/MS)',
  'Medical Registration Certificate',
  'Aadhaar / Government ID',
  'Specialization Certificate',
  'Hospital Affiliation Letter',
];

// ── Verification Documents Panel ──────────────────────────────
const VerificationDocumentsPanel = ({ isVerified }: { isVerified: boolean }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const res = await getWithAuth('/doctor/verification/documents');
      if (res.success) setDocuments(res.data.documents || []);
    } catch (e) { /* silent */ }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be under 5 MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setUploadError('Only JPG, PNG, WebP, and PDF files are allowed');
      return;
    }
    setUploadError('');
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedType || !selectedFile) {
      setUploadError('Please select a document type and file');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      // Convert file to base64 dataURL
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const res = await postWithAuth('/doctor/verification/upload-document', {
        documentType: selectedType,
        fileData,
        fileName: selectedFile.name,
      });

      if (res.success) {
        await fetchDocuments();
        setSelectedType('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (e: any) {
      setUploadError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteWithAuth(`/doctor/verification/document/${docId}`);
      await fetchDocuments();
    } catch (e: any) {
      setUploadError(e.message || 'Delete failed');
    }
  };

  return (
    <div className='space-y-6'>
      {/* ── Status banner ── */}
      <div className={`flex items-start gap-4 p-5 rounded-2xl border ${
        isVerified
          ? 'bg-emerald-50 border-emerald-100'
          : 'bg-amber-50 border-amber-100'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isVerified ? 'bg-emerald-500' : 'bg-amber-500'
        }`}>
          {isVerified
            ? <CheckCircle2 className='w-5 h-5 text-white' />
            : <AlertTriangle className='w-5 h-5 text-white' />
          }
        </div>
        <div>
          <p className={`text-sm font-bold ${isVerified ? 'text-emerald-800' : 'text-amber-800'}`}>
            {isVerified ? 'Your profile is verified ✅' : 'Verification Pending'}
          </p>
          <p className={`text-xs mt-1 leading-relaxed ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isVerified
              ? 'You are verified and visible to patients. You can continue to upload updated documents if needed.'
              : 'Upload your medical credentials below. An admin will review and verify your profile. Until verified, you will not appear in patient searches.'
            }
          </p>
        </div>
      </div>

      {/* ── Uploaded documents list ── */}
      {documents.length > 0 && (
        <div>
          <p className='text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3'>Uploaded Documents ({documents.length})</p>
          <div className='space-y-2'>
            {documents.map((doc) => (
              <div key={doc._id} className='flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl'>
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0'>
                    <FileText className='w-4 h-4 text-sky-600' />
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-slate-800'>{doc.type}</p>
                    <p className='text-xs text-slate-400 mt-0.5'>
                      Uploaded {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg'>
                    ✓ Uploaded
                  </span>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className='w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Upload new document ── */}
      <div>
        <p className='text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3'>Upload New Document</p>
        <div className='space-y-4 p-5 bg-white border border-slate-200 rounded-2xl'>
          {/* Document type selector */}
          <div>
            <label className='text-xs font-semibold text-slate-600 mb-2 block'>Document Type *</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className='rounded-xl border-slate-200 text-sm font-medium bg-white'>
                <SelectValue placeholder='Select document type' />
              </SelectTrigger>
              <SelectContent className='rounded-2xl border-slate-100 shadow-xl'>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className='rounded-xl text-sm'>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File picker */}
          <div>
            <label className='text-xs font-semibold text-slate-600 mb-2 block'>File *</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
                selectedFile
                  ? 'border-sky-300 bg-sky-50/50'
                  : 'border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/30'
              }`}
            >
              {selectedFile ? (
                <>
                  <div className='w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center'>
                    <FileText className='w-5 h-5 text-sky-600' />
                  </div>
                  <p className='text-sm font-semibold text-sky-700 text-center truncate max-w-xs'>{selectedFile.name}</p>
                  <p className='text-xs text-slate-400'>{(selectedFile.size / 1024).toFixed(1)} KB — click to change</p>
                </>
              ) : (
                <>
                  <div className='w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center'>
                    <Upload className='w-5 h-5 text-slate-400' />
                  </div>
                  <p className='text-sm font-semibold text-slate-600'>Click to upload</p>
                  <p className='text-xs text-slate-400'>JPG, PNG, PDF up to 5 MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg,image/png,image/webp,application/pdf'
                onChange={handleFileChange}
                className='hidden'
              />
            </div>
          </div>

          {/* Error */}
          {uploadError && (
            <p className='text-xs text-red-600 font-medium bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl'>
              {uploadError}
            </p>
          )}

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!selectedType || !selectedFile || uploading}
            className='w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm py-3 px-5 rounded-2xl transition-all duration-200 disabled:cursor-not-allowed'
          >
            {uploading ? (
              <>
                <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                Uploading...
              </>
            ) : (
              <>
                <Upload className='w-4 h-4' />
                Upload Document
              </>
            )}
          </button>
        </div>
      </div>

      <p className='text-[11px] text-slate-400 leading-relaxed'>
        Documents are reviewed by UniCare+ admins within 1–2 business days. You will be notified once your profile is verified.
      </p>
    </div>
  );
};


const ProfilePage = ({ userType }: ProfileProps) => {
  const { user, fetchProfile, updateProfile, loading } = userAuthStore();
  const [activeSection, setActiveSection] = useState('about');
  const [isEditing, setIsEditing] = useState(false);
  const originalFormDataRef = useRef<any>(null);

  const [formData, setFormData] = useState<any>({
    name: '', email: '', phone: '', dob: '', gender: '', bloodGroup: '', about: '',
    specializations: '', category: '', qualification: '', experience: '', fees: 0,
    hospitalInfo: { name: '', address: '', city: '' },
    medicalHistory: { allergies: '', currentMedications: '', chronicConditions: '' },
    emergencyContact: { name: '', phone: '', relationship: '' },
    availabilityRange: { startDate: '', endDate: '', excludedWeekdays: [] },
    dailyTimeRanges: [],
    slotDurationMinutes: 30,
  });

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    if (user) {
      const userData = {
        name: user.name || '', email: user.email || '', phone: user.phone || '',
        dob: user.dob || '', gender: user.gender || '', bloodGroup: user.bloodGroup || '',
        about: user.about || '', specializations: user.specialization || '',
        category: user.category || '', qualification: user.qualification || '',
        experience: user.experience || '', fees: user.fees || 0,
        hospitalInfo: { name: user.hospitalInfo?.name || '', address: user.hospitalInfo?.address || '', city: user.hospitalInfo?.city || '' },
        medicalHistory: { allergies: user.medicalHistory?.allergies || '', currentMedications: user.medicalHistory?.currentMedications || '', chronicConditions: user.medicalHistory?.chronicConditions || '' },
        emergencyContact: { name: user.emergencyContact?.name || '', phone: user.emergencyContact?.phone || '', relationship: user.emergencyContact?.relationship || '' },
        availabilityRange: { startDate: user.availabilityRange?.startDate || '', endDate: user.availabilityRange?.endDate || '', excludedWeekdays: user.availabilityRange?.excludedWeekdays || [] },
        dailyTimeRanges: user.dailyTimeRanges || [],
        slotDurationMinutes: user.slotDurationMinutes || 30,
      };
      setFormData(userData);
      if (!isEditing) {
        originalFormDataRef.current = userData;
      }
    }
  }, [user, isEditing]);

  const handleStartEdit = () => {
    originalFormDataRef.current = { ...formData };
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (originalFormDataRef.current) {
      setFormData(originalFormDataRef.current);
    }
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData((prev: any) => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const handleArrayChange = (field: string, index: number, subField: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: prev[field].map((item: any, i: number) => i === index ? { ...item, [subField]: value } : item),
    }));
  };

  const handleCategorySelect = (category: any) => {
    if (!formData.category.includes(category.title)) {
      handleInputChange('category', [...formData.category, category.title]);
    }
  };

  const handleCategoryDelete = (indexToDelete: number) => {
    const newCats = [...formData.category].filter((_: any, i: number) => i !== indexToDelete);
    setFormData((prev: any) => ({ ...prev, category: newCats }));
  };

  const getAvailableCategories = () => healthcareCategories.filter((cat) => !formData.category.includes(cat.title));

  const addTimeRange = () => {
    setFormData((prev: any) => ({ ...prev, dailyTimeRanges: [...prev.dailyTimeRanges, { start: '09:00', end: '17:00' }] }));
  };

  const removeTimeRange = (index: number) => {
    setFormData((prev: any) => ({ ...prev, dailyTimeRanges: prev.dailyTimeRanges.filter((_: any, i: number) => i !== index) }));
  };

  const handleWeekdayToggle = (weekday: number) => {
    const arr = [...formData.availabilityRange.excludedWeekdays];
    const idx = arr.indexOf(weekday);
    if (idx > -1) arr.splice(idx, 1); else arr.push(weekday);
    handleInputChange('availabilityRange.excludedWeekdays', arr);
  };

  const handleSave = async () => {
    try { await updateProfile(formData); setIsEditing(false); } catch (err) { console.error(err); }
  };

  const formatDateForInput = (isoDate: string): string => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  };

  const isDoctor = userType === 'doctor';

  const sidebarItems = isDoctor
    ? [
        { id: 'about', label: 'About', icon: User },
        { id: 'professional', label: 'Professional Info', icon: Stethoscope },
        { id: 'hospital', label: 'Hospital / Clinic', icon: MapPin },
        { id: 'availability', label: 'Availability', icon: Clock },
        { id: 'verification', label: 'Verification Docs', icon: Shield },
        { id: 'bank', label: 'Bank Details', icon: CreditCard },
      ]
    : [
        { id: 'about', label: 'Personal Info', icon: User },
        { id: 'contact', label: 'Contact', icon: Phone },
        { id: 'medical', label: 'Medical History', icon: FileText },
        { id: 'emergency', label: 'Emergency Contact', icon: Heart },
      ];

  /* ─── Section renderers ─── */
  const renderAboutSection = () => (
    <div className='space-y-6'>
      <FieldWrapper label='Full Name'>
        <UCInput value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder='Your full name' isEditing={isEditing} />
      </FieldWrapper>

      {userType === 'patient' && (
        <>
          <FieldWrapper label='Date of Birth'>
            <UCInput
              type='date'
              value={formData.dob ? new Date(formData.dob).toISOString().split('T')[0] : ''}
              onChange={(e) => handleInputChange('dob', e.target.value)}
              isEditing={isEditing}
            />
          </FieldWrapper>

          <FieldWrapper label='Gender'>
            <div className={`flex gap-3 ${!isEditing ? 'pointer-events-none opacity-60' : ''}`}>
              <RadioGroup
                value={formData.gender || ''}
                onValueChange={(v) => handleInputChange('gender', v)}
                className='flex gap-4 flex-wrap'
              >
                {['male', 'female', 'other'].map((g) => (
                  <label key={g} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${formData.gender === g ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                    <RadioGroupItem value={g} id={g} className='hidden' />
                    <span className='text-sm font-semibold capitalize'>{g}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </FieldWrapper>

          <FieldWrapper label='Blood Group'>
            <Select value={formData.bloodGroup || ''} onValueChange={(v) => handleInputChange('bloodGroup', v)} disabled={!isEditing}>
              <SelectTrigger className={`rounded-xl border text-sm font-medium transition-all duration-200 ${!isEditing ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-white border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'}`}>
                <SelectValue placeholder='Select blood group' />
              </SelectTrigger>
              <SelectContent className='rounded-2xl border-slate-100 shadow-xl'>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((g) => (
                  <SelectItem key={g} value={g} className='rounded-xl text-sm font-medium'>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldWrapper>
        </>
      )}

      {isDoctor && (
        <FieldWrapper label='About / Bio'>
          <UCTextarea value={formData.about || ''} onChange={(e) => handleInputChange('about', e.target.value)} rows={5} placeholder='Tell patients about your expertise, approach, and values...' isEditing={isEditing} />
        </FieldWrapper>
      )}
    </div>
  );

  const renderProfessionalSection = () => (
    <div className='space-y-6'>
      <FieldWrapper label='Specialization'>
        <Select value={formData.specialization || ''} onValueChange={(v) => handleInputChange('specialization', v)} disabled={!isEditing}>
          <SelectTrigger className={`rounded-xl border text-sm font-medium ${!isEditing ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-white border-slate-200'}`}>
            <SelectValue placeholder='Select specialization' />
          </SelectTrigger>
          <SelectContent className='rounded-2xl border-slate-100 shadow-xl max-h-64'>
            {specializations.map((s) => (
              <SelectItem key={s} value={s} className='rounded-xl text-sm'>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldWrapper>

      <FieldWrapper label='Categories'>
        <div className='space-y-3'>
          <div className='flex flex-wrap gap-2'>
            {formData.category?.map((cat: string, i: number) => {
              const catData = healthcareCategories.find(c => c.title === cat);
              return (
                <span key={i} className={`inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-xl shadow-sm ${catData?.color || 'bg-slate-500'}`}>
                  {cat}
                  {isEditing && (
                    <button type='button' onClick={() => handleCategoryDelete(i)} className='w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors'>
                      <X className='w-2.5 h-2.5' />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
          {isEditing && getAvailableCategories().length > 0 && (
            <Select onValueChange={(v) => { const cat = getAvailableCategories().find(c => c.id === v); if (cat) handleCategorySelect(cat); }}>
              <SelectTrigger className='w-52 rounded-xl border-dashed border-slate-300 text-sm text-slate-500 bg-white'>
                <SelectValue placeholder='+ Add category' />
              </SelectTrigger>
              <SelectContent className='rounded-2xl border-slate-100 shadow-xl'>
                {getAvailableCategories().map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className='rounded-xl text-sm'>
                    <div className='flex items-center gap-2'>
                      <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                      {cat.title}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </FieldWrapper>

      <FieldWrapper label='Qualification'>
        <UCInput value={formData.qualification || ''} onChange={(e) => handleInputChange('qualification', e.target.value)} placeholder='e.g. MBBS, MD, MS' isEditing={isEditing} />
      </FieldWrapper>

      <div className='grid grid-cols-2 gap-4'>
        <FieldWrapper label='Experience (Years)'>
          <UCInput type='number' value={formData.experience || ''} onChange={(e) => handleInputChange('experience', parseInt(e.target.value) || 0)} placeholder='0' isEditing={isEditing} />
        </FieldWrapper>
        <FieldWrapper label='Consultation Fee (₹)'>
          <UCInput type='number' value={formData.fees} onChange={(e) => handleInputChange('fees', parseInt(e.target.value) || 0)} placeholder='500' isEditing={isEditing} />
        </FieldWrapper>
      </div>
    </div>
  );

  const renderHospitalSection = () => (
    <div className='space-y-6'>
      <FieldWrapper label='Hospital / Clinic Name'>
        <UCInput value={formData.hospitalInfo.name} onChange={(e) => handleInputChange('hospitalInfo.name', e.target.value)} placeholder='e.g. Apollo Hospital' isEditing={isEditing} />
      </FieldWrapper>
      <FieldWrapper label='Address'>
        <UCTextarea value={formData.hospitalInfo.address} onChange={(e) => handleInputChange('hospitalInfo.address', e.target.value)} rows={3} placeholder='Full street address' isEditing={isEditing} />
      </FieldWrapper>
      <FieldWrapper label='City'>
        <UCInput value={formData.hospitalInfo.city} onChange={(e) => handleInputChange('hospitalInfo.city', e.target.value)} placeholder='City name' isEditing={isEditing} />
      </FieldWrapper>
    </div>
  );

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const renderAvailabilitySection = () => (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 gap-4'>
        <FieldWrapper label='Available From'>
          <UCInput type='date' value={formatDateForInput(formData.availabilityRange.startDate)} onChange={(e) => handleInputChange('availabilityRange.startDate', e.target.value)} isEditing={isEditing} />
        </FieldWrapper>
        <FieldWrapper label='Available Until'>
          <UCInput type='date' value={formatDateForInput(formData.availabilityRange.endDate)} onChange={(e) => handleInputChange('availabilityRange.endDate', e.target.value)} isEditing={isEditing} />
        </FieldWrapper>
      </div>

      <FieldWrapper label='Days Off (Excluded Weekdays)'>
        <div className='flex flex-wrap gap-2'>
          {DAYS.map((day, idx) => {
            const isExcluded = formData.availabilityRange?.excludedWeekdays.includes(idx);
            return (
              <label key={idx} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer transition-all duration-200 ${!isEditing ? 'pointer-events-none opacity-60' : ''} ${isExcluded ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                <Checkbox
                  checked={isExcluded}
                  onCheckedChange={() => handleWeekdayToggle(idx)}
                  disabled={!isEditing}
                  className='data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500'
                />
                <span className='text-xs font-semibold'>{day.slice(0, 3)}</span>
              </label>
            );
          })}
        </div>
      </FieldWrapper>

      <FieldWrapper label='Daily Time Ranges'>
        <div className='space-y-3'>
          {formData.dailyTimeRanges?.map((tr: any, i: number) => (
            <div key={i} className='flex items-center gap-3'>
              <input type='time' value={tr.start || ''} onChange={(e) => handleArrayChange('dailyTimeRanges', i, 'start', e.target.value)} disabled={!isEditing}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium ${!isEditing ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-white border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none'}`}
              />
              <span className='text-xs font-bold text-slate-400'>TO</span>
              <input type='time' value={tr.end || ''} onChange={(e) => handleArrayChange('dailyTimeRanges', i, 'end', e.target.value)} disabled={!isEditing}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium ${!isEditing ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-white border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none'}`}
              />
              {isEditing && (
                <button onClick={() => removeTimeRange(i)} className='w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors'>
                  <X className='w-3.5 h-3.5' />
                </button>
              )}
            </div>
          ))}
          {isEditing && (
            <button onClick={addTimeRange} className='flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 border border-sky-100 hover:border-sky-200 px-4 py-2.5 rounded-xl transition-all duration-200'>
              <Plus className='w-4 h-4' />
              Add Time Range
            </button>
          )}
        </div>
      </FieldWrapper>

      <FieldWrapper label='Slot Duration'>
        <Select value={formData.slotDurationMinutes?.toString() || '30'} onValueChange={(v) => handleInputChange('slotDurationMinutes', parseInt(v))} disabled={!isEditing}>
          <SelectTrigger className={`rounded-xl border text-sm font-medium ${!isEditing ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-white border-slate-200'}`}>
            <SelectValue placeholder='Select duration' />
          </SelectTrigger>
          <SelectContent className='rounded-2xl border-slate-100 shadow-xl'>
            {[15, 20, 30, 45, 60, 90, 120].map((m) => (
              <SelectItem key={m} value={String(m)} className='rounded-xl text-sm'>{m} minutes</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldWrapper>
    </div>
  );

  const renderContactSection = () => (
    <div className='space-y-6'>
      <FieldWrapper label='Phone Number'>
        <UCInput value={formData.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder='+91-94xxxxxx99' isEditing={isEditing} />
      </FieldWrapper>
      <FieldWrapper label='Email Address'>
        <UCInput value={formData.email || ''} readOnly placeholder='your@email.com' isEditing={isEditing} />
        <p className='text-[11px] text-slate-400'>Email cannot be changed here.</p>
      </FieldWrapper>
    </div>
  );

  const renderMedicalSection = () => (
    <div className='space-y-6'>
      <FieldWrapper label='Allergies'>
        <UCTextarea value={formData.medicalHistory.allergies || ''} onChange={(e) => handleInputChange('medicalHistory.allergies', e.target.value)} rows={3} placeholder='List any known allergies...' isEditing={isEditing} />
      </FieldWrapper>
      <FieldWrapper label='Current Medications'>
        <UCTextarea value={formData.medicalHistory.currentMedications || ''} onChange={(e) => handleInputChange('medicalHistory.currentMedications', e.target.value)} rows={3} placeholder='List current medications and dosage...' isEditing={isEditing} />
      </FieldWrapper>
      <FieldWrapper label='Chronic Conditions'>
        <UCTextarea value={formData.medicalHistory.chronicConditions || ''} onChange={(e) => handleInputChange('medicalHistory.chronicConditions', e.target.value)} rows={3} placeholder='Any chronic or ongoing conditions...' isEditing={isEditing} />
      </FieldWrapper>
    </div>
  );

  const renderEmergencySection = () => (
    <div className='space-y-6'>
      <FieldWrapper label='Contact Name'>
        <UCInput value={formData.emergencyContact.name || ''} onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)} placeholder='Full name' isEditing={isEditing} />
      </FieldWrapper>
      <FieldWrapper label='Relationship'>
        <UCInput value={formData.emergencyContact.relationship || ''} onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)} placeholder='e.g. Spouse, Parent, Sibling' isEditing={isEditing} />
      </FieldWrapper>
      <FieldWrapper label='Phone Number'>
        <UCInput value={formData.emergencyContact.phone || ''} onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)} placeholder='+91-xxxxxxxxxx' isEditing={isEditing} />
      </FieldWrapper>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'about': return renderAboutSection();
      case 'professional': return renderProfessionalSection();
      case 'hospital': return renderHospitalSection();
      case 'availability': return renderAvailabilitySection();
      case 'verification': return <VerificationDocumentsPanel isVerified={user?.isVerified || false} />;
      case 'contact': return renderContactSection();
      case 'medical': return renderMedicalSection();
      case 'emergency': return renderEmergencySection();
      case 'bank': return <BankDetailsPanel />;
      default: return renderAboutSection();
    }
  };

  const currentSectionLabel = sidebarItems.find(i => i.id === activeSection)?.label || '';
  // Hide Edit/Save buttons on the verification section — it has its own controls
  const isVerificationSection = activeSection === 'verification';

  if (!user) return (
    <div className='min-h-screen bg-[#F8F7F4] flex items-center justify-center'>
      <div className='flex flex-col items-center gap-3'>
        <div className='w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin' />
        <p className='text-sm text-slate-400 font-medium'>Loading profile...</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        @keyframes page-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .page-animate { animation: page-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes section-fade {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .section-animate { animation: section-fade 0.35s cubic-bezier(0.16,1,0.3,1) both; }

        .nav-item { transition: all 0.18s ease; }
        .nav-item:hover:not(.nav-active) {
          background: rgba(14,165,233,0.06);
          color: #0284c7;
        }

        .save-btn { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
        .save-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(14,165,233,0.25);
        }
      `}</style>

      <div className='uc-font min-h-screen bg-[#F8F7F4]'>
        <Header showDashboardNav={true} />

        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16'>
          <div className='page-animate'>

            {/* ─── Top Profile Hero ────────────────────── */}
            <div className={`relative rounded-3xl overflow-hidden mb-8 ${
              isDoctor
                ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900'
                : 'bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100'
            }`}>
              <div className='absolute inset-0 opacity-[0.05]' style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

              <div className='relative z-10 px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center gap-6'>
                <div className='relative flex-shrink-0'>
                  <Avatar className={`w-20 h-20 ring-4 shadow-xl ${isDoctor ? 'ring-slate-700' : 'ring-white'}`}>
                    <AvatarImage src={user?.profileImage} alt={user?.name} className='object-cover' />
                    <AvatarFallback className={`text-xl font-bold ${isDoctor ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-600'}`}>
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <button className='absolute bottom-0 right-0 w-7 h-7 bg-sky-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white'>
                      <Camera className='w-3.5 h-3.5 text-white' />
                    </button>
                  )}
                </div>

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <h1 className={`uc-serif text-2xl font-bold ${isDoctor ? 'text-white' : 'text-slate-900'}`}>
                      {user?.name}
                    </h1>
                    {isDoctor && user?.isVerified && (
                      <BadgeCheck className='w-5 h-5 text-sky-400 flex-shrink-0' />
                    )}
                  </div>
                  <p className={`text-sm font-medium ${isDoctor ? 'text-slate-400' : 'text-slate-500'}`}>
                    {user?.email}
                  </p>
                  <div className='flex items-center gap-2 mt-2'>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                      isDoctor ? 'bg-sky-500/20 text-sky-300 border border-sky-500/20' : 'bg-sky-100 text-sky-700 border border-sky-200'
                    }`}>
                      {isDoctor ? <Stethoscope className='w-3 h-3' /> : <User className='w-3 h-3' />}
                      {isDoctor ? 'Medical Professional' : 'Patient'}
                    </span>
                    {/* Verification status badge for doctor */}
                    {isDoctor && !user?.isVerified && (
                      <span className='inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/20'>
                        <AlertTriangle className='w-3 h-3' />
                        Pending Verification
                      </span>
                    )}
                  </div>
                </div>

                {/* Hide edit button on verification section */}
                {!isVerificationSection && (
                  <div className='flex items-center gap-2 flex-shrink-0'>
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleCancel}
                          className={`text-sm font-semibold px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                            isDoctor ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className='save-btn flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          {loading ? (
                            <><div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />Saving...</>
                          ) : (
                            <><Save className='w-4 h-4' />Save Changes</>
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleStartEdit}
                        className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-px ${
                          isDoctor
                            ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                            : 'bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-200'
                        }`}
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ─── Main Grid ───────────────────────────── */}
            <div className='grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6'>

              {/* ── Sidebar Nav ─────────────────────── */}
              <div className='space-y-1.5'>
                <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 mb-3'>Profile Sections</p>
                {sidebarItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'nav-active bg-sky-500 text-white shadow-md shadow-sky-200'
                          : 'text-slate-600 bg-white border border-slate-100'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                        <item.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      </div>
                      {item.label}
                      {/* Dot indicator on verification if unverified */}
                      {item.id === 'verification' && isDoctor && !user?.isVerified && (
                        <span className='ml-auto w-2 h-2 bg-amber-400 rounded-full flex-shrink-0' />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Content Panel ───────────────────── */}
              <div className='bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden'>
                <div className='px-8 py-6 border-b border-slate-100 flex items-center justify-between'>
                  <div>
                    <p className='text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5'>
                      {isDoctor ? 'Doctor' : 'Patient'} Profile
                    </p>
                    <h2 className='uc-serif text-xl font-bold text-slate-900'>{currentSectionLabel}</h2>
                  </div>
                  {isEditing && !isVerificationSection && (
                    <span className='flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl'>
                      <div className='w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse' />
                      Editing Mode
                    </span>
                  )}
                </div>
                <div className='section-animate px-8 py-8'>
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;