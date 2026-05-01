// app/admin/page.tsx
'use client';
import AdminHeader from '@/components/admin/common/Header';
import DashboardPage from '@/components/admin/dashboard/DashboardPage';

export default function AdminDashboard() {
  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Platform overview & key metrics" />
      <div className="pt-16 p-6">
        <DashboardPage />
      </div>
    </>
  );
}
