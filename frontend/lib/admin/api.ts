import type { AdminUser, Patient, Doctor, Appointment, DashboardStats, PaymentStats, PaginationMeta } from './types';

const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:8000/api/admin';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || '';
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<{ data: T; meta: PaginationMeta }> {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return { data: json.data, meta: json.meta || {} };
}

const get  = <T>(path: string) => request<T>(path, { method: 'GET' });
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const put  = <T>(path: string, body: unknown = {}) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const del  = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// ── Auth ──────────────────────────────────────────────────────
export const adminLogin = (email: string, pass: string) =>
  post<{ token: string; admin: AdminUser }>('/auth/login', { email, pass });

export const getAdminMe = () => get<AdminUser>('/auth/me');

// ── Dashboard ─────────────────────────────────────────────────
export const getDashboardStats = () => get<DashboardStats>('/dashboard/stats');

// ── Admins ────────────────────────────────────────────────────
export const getAdmins = () => get<AdminUser[]>('/admins');

export const createAdmin = (payload: {
  name: string; email: string; pass: string; role: string;
  permissions: Record<string, boolean>;
}) => post<AdminUser>('/admins/create', payload);

export const updateAdminPermissions = (id: string, permissions: Record<string, boolean>) =>
  put<AdminUser>(`/admins/${id}/permissions`, { permissions });

export const toggleAdminActive = (id: string) =>
  put<AdminUser>(`/admins/${id}/toggle-active`);

export const deleteAdmin = (id: string) => del<Record<string, never>>(`/admins/${id}`);

// ── Users ─────────────────────────────────────────────────────
export const getUsers = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== ''))).toString();
  return get<Patient[]>('/users' + (qs ? '?' + qs : ''));
};

export const toggleUserActive = (id: string) => put<Patient>(`/users/${id}/toggle-active`);
export const getUserDetail    = (id: string) => get<{ user: Patient; appointments: Appointment[] }>(`/users/${id}`);

// ── Doctors ───────────────────────────────────────────────────
export const getDoctors = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== ''))).toString();
  return get<Doctor[]>('/doctors' + (qs ? '?' + qs : ''));
};

export const verifyDoctor       = (id: string) => put<Doctor>(`/doctors/${id}/verify`);
export const toggleDoctorActive = (id: string) => put<Doctor>(`/doctors/${id}/toggle-active`);
export const getDoctorDetail    = (id: string) => get<{ doctor: Doctor; appointments: Appointment[]; totalRevenue: number }>(`/doctors/${id}`);

// ── Appointments ──────────────────────────────────────────────
export const getAppointments = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== ''))).toString();
  return get<Appointment[]>('/appointments' + (qs ? '?' + qs : ''));
};

// ── Payments ──────────────────────────────────────────────────
export const getPayments = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== ''))).toString();
  return get<Appointment[]>('/payments' + (qs ? '?' + qs : ''));
};

export const getPaymentStats = () => get<PaymentStats>('/payments/stats');
