import { AppLayout } from '@/components/layout/AppLayout';
import { ManagerDashboard } from '@/components/dashboard/ManagerDashboard';

export default function ManagerPanelPage() {
  return (
    <AppLayout>
      <ManagerDashboard />
    </AppLayout>
  );
}
