export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  permissions: {
    userManagement: boolean;
    doctorManagement: boolean;
    paymentManagement: boolean;
    analytics: boolean;
  };
}

export interface Patient {
  _id: string;
  ucId: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  profileImage?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  medicalHistory?: {
    allergies?: string;
    currentMedications?: string;
    chronicConditions?: string;
  };
}

export interface Doctor {
  _id: string;
  ucId: string;
  name: string;
  email: string;
  specialization?: string;
  category?: string[];
  qualification?: string;
  experience?: number;
  about?: string;
  fees?: number;
  profileImage?: string;
  hospitalInfo?: { name?: string; address?: string; city?: string };
  isVerified: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface Appointment {
  _id: string;
  doctorId: { _id: string; name: string; specialization?: string; fees?: number; profileImage?: string; email?: string };
  patientId: { _id: string; name: string; email?: string; phone?: string; profileImage?: string; age?: number };
  date: string;
  slotStartIso: string;
  slotEndIso: string;
  consultationType: 'Video Consultation' | 'Voice Call';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'In Progress';
  symptoms?: string;
  consultationFees: number;
  platformFees: number;
  totalAmount: number;
  paymentStatus: 'Pending' | 'Paid' | 'refunded';
  payoutStatus: 'Pending' | 'Paid' | 'Cancelled';
  paymentMethod?: string;
  paymentDate?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

export interface DashboardStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalDoctors: number;
    verifiedDoctors: number;
    activeDoctors: number;
    pendingVerification: number;
    totalAppointments: number;
    todayAppointments: number;
    monthlyAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    totalRevenue: number;
    thisMonthRevenue: number;
  };
  charts: {
    appointmentsByStatus: { _id: string; count: number }[];
    revenueByMonth: { _id: { year: number; month: number }; revenue: number; count: number }[];
    topDoctors: { name: string; specialization: string; profileImage?: string; appointments: number; revenue: number }[];
  };
  recentAppointments: Appointment[];
}

export interface PaymentStats {
  totalRevenue: number;
  totalPaid: number;
  pendingPayoutAmount: number;
  pendingPayoutCount: number;
  refundedAmount: number;
  refundedCount: number;
  methodBreakdown: { _id: string; count: number; total: number }[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: PaginationMeta;
}
