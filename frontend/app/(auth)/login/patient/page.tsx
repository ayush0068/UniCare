import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: 'Patient Login - UniCare+',
  description: 'Sign in to your UniCare+ account to access healthcare consultations.',
};

export default function PatientLoginPage() {
  return <AuthForm type='login' userRole='patient' />
}