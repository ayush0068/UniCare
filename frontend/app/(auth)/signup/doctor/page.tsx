import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: 'Join UniCare+ as Healthcare Provider',
  description: 'Register as a healthcare provider on UniCare+ to offer online consultations.',
};


export default function DoctorSignupPage() {
  return <AuthForm type='signup' userRole='doctor' />
}