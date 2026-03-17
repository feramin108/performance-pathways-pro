import { AppLayout } from '@/components/layout/AppLayout';
import { EmployeeDashboard } from '@/components/dashboard/EmployeeDashboard';

export default function EmployeePanelPage() {
  return (
    <AppLayout>
      <EmployeeDashboard />
    </AppLayout>
  );
}
