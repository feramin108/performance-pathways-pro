import { useProfile } from '@/hooks/useSupabaseQueries';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmployeeDashboard } from '@/components/dashboard/EmployeeDashboard';
import { ManagerDashboard } from '@/components/dashboard/ManagerDashboard';
import { HRDashboard } from '@/components/dashboard/HRDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';

export default function DashboardPage() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  const role = profile?.primaryRole || 'employee';

  return (
    <AppLayout>
      {role === 'employee' && <EmployeeDashboard />}
      {role === 'manager' && <ManagerDashboard />}
      {role === 'hr' && <HRDashboard />}
      {role === 'admin' && <AdminDashboard />}
    </AppLayout>
  );
}
