import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: 'Doctor Login - UniCare+',
  description: 'Healthcare provider sign in to UniCare+ platform. Manage your practice and consultations.',
};

export default function DoctorLoginPage() {
  return <AuthForm type='login' userRole='doctor' />
}