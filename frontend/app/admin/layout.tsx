'use client';

import AdminLayout from '../../components/admin/common/AdminLayout';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}