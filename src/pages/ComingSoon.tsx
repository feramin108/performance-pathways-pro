import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function ComingSoon() {
  const { role } = useAuth();
  const location = useLocation();
  const pageName = location.pathname.split('/').pop() || 'Page';

  return (
    <DashboardLayout pageTitle={pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/-/g, ' ')}>
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Construction className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-lg font-medium text-foreground mb-1">Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          This feature is under development and will be available in a future update.
        </p>
      </div>
    </DashboardLayout>
  );
}
