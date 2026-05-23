'use client'
import { userAuthStore } from '@/store/authStore';
import { redirect } from 'next/navigation';
import React, { useEffect } from 'react'

const layout = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = userAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.type === 'doctor') {
        // Doctors go to dashboard regardless — dashboard shows pending-verification
        // banner if not yet verified. Don't redirect to onboarding here because
        // isVerified is undefined in the slim post-OTP user object.
        redirect('/doctor/dashboard');
      } else {
        redirect('/patient/dashboard');
      }
    }
  }, [isAuthenticated, user])

  return <>{children}</>
}

export default layout