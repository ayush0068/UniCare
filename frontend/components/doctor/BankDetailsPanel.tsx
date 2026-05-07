'use client';
import { useEffect, useState } from 'react';
import { getWithAuth, putWithAuth } from '@/service/httpService';

const BANK_NAMES = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank',
  'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India',
  'IndusInd Bank', 'Yes Bank', 'IDFC First Bank', 'Federal Bank', 'RBL Bank', 'Other',
];

interface BankForm {
  accountHolderName: string;
  accountNumber:     string;
  confirmAccountNumber: string;
  ifscCode:          string;
  bankName:          string;
  branchName:        string;
  accountType:       'savings' | 'current' | '';
  upiId:             string;
}

const EMPTY: BankForm = {
  accountHolderName:    '',
  accountNumber:        '',
  confirmAccountNumber: '',
  ifscCode:             '',
  bankName:             '',
  branchName:           '',
  accountType:          '',
  upiId:                '',
};

export default function BankDetailsPanel() {
  const [form, setForm]         = useState<BankForm>(EMPTY);
  const [masked, setMasked]     = useState<any>(null);
  const [isEditing, setEditing] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const load = async () => {
    setFetching(true);
    try {
      const res = await getWithAuth('/doctor/bank-details');
      if (res.success) setMasked(res.data);
    } catch { /* silent */ }
    finally { setFetching(false); }
  };

  useEffect(() => { load(); }, []);

  const set = (field: keyof BankForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validate = (): string => {
    if (!form.accountHolderName.trim()) return 'Account holder name is required';
    if (!form.accountNumber.trim())     return 'Account number is required';
    if (form.accountNumber !== form.confirmAccountNumber) return 'Account numbers do not match';
    if (!form.ifscCode.trim())          return 'IFSC code is required';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.trim().toUpperCase())) return 'Invalid IFSC code format (e.g. SBIN0001234)';
    if (!form.bankName)                 return 'Please select your bank';
    if (!form.accountType)              return 'Please select account type';
    return '';
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      const res = await putWithAuth('/doctor/bank-details', {
        accountHolderName: form.accountHolderName.trim(),
        accountNumber:     form.accountNumber.trim(),
        ifscCode:          form.ifscCode.trim().toUpperCase(),
        bankName:          form.bankName,
        branchName:        form.branchName.trim(),
        accountType:       form.accountType,
        upiId:             form.upiId.trim(),
      });
      if (res.success) {
        setSuccess('Bank details saved successfully!');
        setEditing(false);
        setForm(EMPTY);
        await load();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save bank details');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (focused = false) =>
    `w-full px-4 py-3 rounded-xl border text-sm font-medium text-slate-800 placeholder:text-slate-300 transition-all duration-200 outline-none
     ${focused ? 'border-sky-400 ring-2 ring-sky-100 bg-white' : 'border-slate-200 bg-white hover:border-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'}`;

  if (fetching) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Status banner */}
      <div className={`flex items-start gap-4 p-5 rounded-2xl border ${
        masked?.hasBankDetails
          ? 'bg-emerald-50 border-emerald-100'
          : 'bg-amber-50 border-amber-100'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          masked?.hasBankDetails ? 'bg-emerald-500' : 'bg-amber-500'
        }`}>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {masked?.hasBankDetails
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            }
          </svg>
        </div>
        <div>
          <p className={`text-sm font-bold ${masked?.hasBankDetails ? 'text-emerald-800' : 'text-amber-800'}`}>
            {masked?.hasBankDetails ? 'Bank details added ✅' : 'Bank details not added'}
          </p>
          <p className={`text-xs mt-1 leading-relaxed ${masked?.hasBankDetails ? 'text-emerald-600' : 'text-amber-600'}`}>
            {masked?.hasBankDetails
              ? `Last updated ${masked.updatedAt ? new Date(masked.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}. Admin will use these details to transfer your consultation fees.`
              : 'Add your bank details so UniCare admin can transfer your consultation fees after each appointment.'
            }
          </p>
        </div>
      </div>

      {/* Current saved details (read-only masked view) */}
      {masked?.hasBankDetails && !isEditing && (
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Saved Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Account Holder',  value: masked.accountHolderName },
              { label: 'Bank',            value: masked.bankName },
              { label: 'Account Number',  value: masked.accountNumber, mono: true },
              { label: 'IFSC Code',       value: masked.ifscCode, mono: true },
              { label: 'Branch',          value: masked.branchName || '—' },
              { label: 'Account Type',    value: masked.accountType ? masked.accountType.charAt(0).toUpperCase() + masked.accountType.slice(1) : '—' },
              ...(masked.upiId ? [{ label: 'UPI ID', value: masked.upiId }] : []),
            ].map((item: any, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">{item.label}</p>
                <p className={`text-sm font-semibold text-slate-800 ${item.mono ? 'font-mono tracking-wider' : ''}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-2 text-sm font-bold text-sky-600 hover:text-sky-700 bg-sky-50 border border-sky-100 hover:border-sky-200 px-5 py-3 rounded-2xl transition-all duration-200 hover:-translate-y-px">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Update Bank Details
          </button>
        </div>
      )}

      {/* Edit / Add form */}
      {(!masked?.hasBankDetails || isEditing) && (
        <div className="space-y-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {masked?.hasBankDetails ? 'Update Bank Details' : 'Add Bank Details'}
          </p>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-emerald-700 font-semibold">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Account Holder Name *</label>
              <input value={form.accountHolderName} onChange={e => set('accountHolderName', e.target.value)}
                placeholder="Exactly as on bank passbook"
                className={inputCls()} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Account Number *</label>
              <input value={form.accountNumber} onChange={e => set('accountNumber', e.target.value.replace(/\D/g, ''))}
                type="password" placeholder="Enter account number"
                className={inputCls()} autoComplete="off" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Confirm Account Number *</label>
              <input value={form.confirmAccountNumber} onChange={e => set('confirmAccountNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="Re-enter account number"
                className={`${inputCls()} ${form.confirmAccountNumber && form.accountNumber !== form.confirmAccountNumber ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                autoComplete="off" />
              {form.confirmAccountNumber && form.accountNumber !== form.confirmAccountNumber && (
                <p className="text-[11px] text-red-500 font-medium">Account numbers do not match</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Bank Name *</label>
              <select value={form.bankName} onChange={e => set('bankName', e.target.value)}
                className={inputCls()}>
                <option value="">Select bank</option>
                {BANK_NAMES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">IFSC Code *</label>
              <input value={form.ifscCode} onChange={e => set('ifscCode', e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234" maxLength={11}
                className={`${inputCls()} font-mono tracking-wider`} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Branch Name</label>
              <input value={form.branchName} onChange={e => set('branchName', e.target.value)}
                placeholder="e.g. Connaught Place, Delhi"
                className={inputCls()} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Account Type *</label>
              <div className="flex gap-3">
                {(['savings', 'current'] as const).map(type => (
                  <label key={type} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    form.accountType === type
                      ? 'border-sky-400 bg-sky-50 text-sky-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}>
                    <input type="radio" name="accountType" value={type}
                      checked={form.accountType === type}
                      onChange={() => set('accountType', type)}
                      className="sr-only" />
                    <span className="text-sm font-bold capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                UPI ID <span className="text-slate-300 font-normal lowercase">(optional — for quick transfers)</span>
              </label>
              <input value={form.upiId} onChange={e => set('upiId', e.target.value)}
                placeholder="e.g. doctor@upi or 9876543210@ybl"
                className={inputCls()} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {isEditing && (
              <button onClick={() => { setEditing(false); setForm(EMPTY); setError(''); }}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            )}
            <button onClick={handleSave} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-sky-200 transition-all duration-200 hover:-translate-y-px disabled:transform-none">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Bank Details</>
              )}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            🔒 Your bank details are stored securely and only visible to UniCare administrators for payout purposes. Account number is masked in all views.
          </p>
        </div>
      )}
    </div>
  );
}