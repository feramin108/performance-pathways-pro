import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_DASHBOARDS: Record<string, string> = {
  employee: '/employee/dashboard',
  manager: '/manager/dashboard',
  hc: '/hc/dashboard',
  superadmin: '/hc/dashboard',
};

export function ProtectedRoute({ allowedRole, children }: {
  allowedRole: string;
  children: React.ReactNode
}) {
  const { session, role, isLoading, isLDAPAuth } = useAuth();
  const location = useLocation();

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

  const isAuthenticated = !!session || isLDAPAuth;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  // Superadmin can access ALL portals
  if (role === 'superadmin') return <>{children}</>;

  // HC staff can access both employee and hc routes based on portal mode
  if (role === 'hc') {
    const portalMode = localStorage.getItem('spes_portal_mode') || 'hc';
    const path = location.pathname;
    if (allowedRole === 'hc' && path.startsWith('/hc/')) return <>{children}</>;
    if (allowedRole === 'employee' && path.startsWith('/employee/') && portalMode === 'employee') {
      return <>{children}</>;
    }
    if (allowedRole === 'employee' && path.startsWith('/employee/') && portalMode === 'hc') {
      return <Navigate to="/hc/dashboard" replace />;
    }
    if (allowedRole === 'hc') return <>{children}</>;
    return <Navigate to="/hc/dashboard" replace />;
  }

  // Standard role check
  if (role !== allowedRole) {
    const target = ROLE_DASHBOARDS[role || 'employee'] || '/employee/dashboard';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
