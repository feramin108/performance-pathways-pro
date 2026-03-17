import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_DASHBOARDS: Record<string, string> = {
  employee: '/employee/dashboard',
  manager: '/manager/dashboard',
  hc: '/hc/dashboard',
};

export function ProtectedRoute({ allowedRole, children }: { allowedRole: string; children: React.ReactNode }) {
  const { session, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (role !== allowedRole) {
    const target = ROLE_DASHBOARDS[role || 'employee'] || '/employee/dashboard';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
