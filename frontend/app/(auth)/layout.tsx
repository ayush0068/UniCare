'use client'
import { userAuthStore } from '@/store/authStore';
import { redirect } from 'next/navigation';
import React, { useEffect } from 'react'

const layout = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = userAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (!user.isVerified) {
        redirect(`/onboarding/${user.type}`)
      } else {
        if (user.type === 'doctor') {
          redirect('/doctor/dashboard')
        } else {
          redirect('/patient/dashboard')
        }
      }
    }
  }, [isAuthenticated, user])

  // ─── Pure passthrough — AuthForm manages its own full-page layout ───
  // Do NOT add any wrapper div or right panel here.
  // AuthForm already renders a complete min-h-screen split layout internally.
  return <>{children}</>
}

export default layout