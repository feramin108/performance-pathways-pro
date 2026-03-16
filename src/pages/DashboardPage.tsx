import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmployeeDashboard } from '@/components/dashboard/EmployeeDashboard';
import { ManagerDashboard } from '@/components/dashboard/ManagerDashboard';
import { HRDashboard } from '@/components/dashboard/HRDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';

export default function DashboardPage() {
  const { currentUser } = useAuthStore();

  return (
    <AppLayout>
      {currentUser?.role === 'employee' && <EmployeeDashboard />}
      {currentUser?.role === 'manager' && <ManagerDashboard />}
      {currentUser?.role === 'hr' && <HRDashboard />}
      {currentUser?.role === 'admin' && <AdminDashboard />}
    </AppLayout>
  );
}
