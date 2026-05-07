// Type definitions
type Admin = any;
type Doctor = any;
type Patient = any;
type Appointment = any;
type PaymentStats = any;
type DashboardStats = any;

const API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ||
  'http://localhost:8000/api/admin';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || '';
}

async function request<T>(
  path: string,
  opts: RequestInit = {}
): Promise<{ data: T; meta: any }> {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Request failed');
  return { data: json.data, meta: json.meta || {} };
}

const get  = <T>(path: string)               => request<T>(path, { method: 'GET' });
const post = <T>(path: string, body: object) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const put  = <T>(path: string, body?: object) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
const del  = <T>(path: string)               => request<T>(path, { method: 'DELETE' });

// ── Auth ──────────────────────────────────────────────────────
export const adminLogin = (email: string, password: string) =>
  post<{ token: string; admin: Admin }>(
    '/auth/login',
    {
      email,
      pass: password
    }
  );
export const getAdminMe   = ()                                 => get<Admin>('/auth/me');

// ── Dashboard ─────────────────────────────────────────────────
export const getDashboardStats = () => get<DashboardStats>('/dashboard/stats');

// ── Admins ────────────────────────────────────────────────────
export const getAdmins          = ()                          => get<Admin[]>('/admins');
export const createAdmin        = (data: object)              => post<Admin>('/admins/create', data);
export const updateAdminPermissions   = (id: string, data: object)  => put<Admin>(`/admins/${id}/permissions`, data);
export const toggleAdminActive  = (id: string)                => put<Admin>(`/admins/${id}/toggle-active`);
export const deleteAdmin = (id: string) =>
  del<Record<string, never>>(`/admins/${id}`);

// ── Patients / Users ──────────────────────────────────────────
export const getUsers = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))).toString();
  return get<Patient[]>('/users' + (qs ? '?' + qs : ''));
};
export const toggleUserActive = (id: string) => put<Patient>(`/users/${id}/toggle-active`);
export const getUserDetail    = (id: string) => get<{ user: Patient; appointments: Appointment[] }>(`/users/${id}`);

// ── Doctors ───────────────────────────────────────────────────
export const getDoctors = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))).toString();
  return get<Doctor[]>('/doctors' + (qs ? '?' + qs : ''));
};
export const verifyDoctor       = (id: string) => put<Doctor>(`/doctors/${id}/verify`);
export const toggleDoctorActive = (id: string) => put<Doctor>(`/doctors/${id}/toggle-active`);
export const getDoctorDetail    = (id: string) => get<{ doctor: Doctor; appointments: Appointment[]; totalRevenue: number }>(`/doctors/${id}`);

// ── Appointments ──────────────────────────────────────────────
export const getAppointments = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))).toString();
  return get<Appointment[]>('/appointments' + (qs ? '?' + qs : ''));
};

// ── Payments ──────────────────────────────────────────────────
export const getPayments = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))).toString();
  return get<Appointment[]>('/payments' + (qs ? '?' + qs : ''));
};
export const getPaymentStats = () => get<PaymentStats>('/payments/stats');

// ── Payouts ───────────────────────────────────────────────────
export interface PayoutSummary {
  pendingAmount: number;
  pendingCount:  number;
  paidAmount:    number;
  paidCount:     number;
}

export const getPayouts = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))).toString();
  return get<Appointment[]>('/payouts' + (qs ? '?' + qs : ''));
};

export const markPayoutPaid = (
  appointmentId: string,
  body: { transactionRef?: string; payoutNote?: string }
) => put<{ payoutAmount: number; payoutDate: string; transactionRef: string }>(
  `/payouts/${appointmentId}/mark-paid`, body
);

export const bulkMarkPayoutsPaid = (
  appointmentIds: string[],
  body: { transactionRef?: string; payoutNote?: string }
) => put<{ updated: number; totalPayout: number }>(
  '/payouts/bulk-mark-paid', { appointmentIds, ...body }
);