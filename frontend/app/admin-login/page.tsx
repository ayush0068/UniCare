'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { adminLogin } from '@/lib/admin/api';
import { useAdminStore } from '@/lib/admin/store';

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAuth } = useAdminStore();

  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !pass) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);

    try {
      const { data } = await adminLogin(email, pass);

      console.log("LOGIN RESPONSE:", data); // 🔍 DEBUG

      // 🔥 HANDLE DIFFERENT RESPONSE STRUCTURES
      const token = data?.token || data?.data?.token;
      const admin = data?.admin || data?.data?.admin;

      if (!token) {
        throw new Error('Token not received from server');
      }

      // ✅ 1. localStorage में save करो (MOST IMPORTANT)
      localStorage.setItem('adminToken', token);

      // ✅ 2. Zustand store में save करो
      setAuth(token, admin);

      // ✅ 3. redirect
      router.replace('/admin');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center p-4">
      
      {/* Bootstrap Icons CDN */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-100/60 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[420px]"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/80 p-8">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <i className="bi bi-heart-pulse-fill text-white text-xl" />
            </div>
            <div>
              <h1 className="text-[18px] font-extrabold text-slate-800">UniCare Admin</h1>
              <p className="text-[12px] text-slate-400">Medical Platform Management</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-[22px] font-extrabold text-slate-800">Welcome back</h2>
            <p className="text-[13px] text-slate-400 mt-1">Sign in to your admin account</p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* EMAIL */}
            <div>
              <label className="block text-[12px] font-bold text-slate-500 uppercase mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <i className="bi bi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@unicare.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-[12px] font-bold text-slate-500 uppercase mb-1.5">
                Password
              </label>
              <div className="relative">
                <i className="bi bi-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right" />
                  Sign In
                </>
              )}
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}