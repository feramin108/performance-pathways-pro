import { ReactNode, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, useActiveCycle } from '@/hooks/useSupabaseQueries';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ClipboardList, FileText, Target, Bell,
  User, Clock, Users, CheckCircle, BarChart3, Calendar,
  PieChart, Shield, LogOut, Send, Flag,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: boolean;
}

const NAV_CONFIG: Record<string, NavItem[]> = {
  employee: [
    { label: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
    { label: 'New Evaluation', path: '/employee/evaluation/new', icon: ClipboardList },
    { label: 'My Evaluations', path: '/employee/evaluations', icon: FileText },
    { label: 'Goal Setting', path: '/employee/goals', icon: Target },
    { label: 'Notifications', path: '/employee/notifications', icon: Bell, badge: true },
    { label: 'My Profile', path: '/employee/profile', icon: User },
  ],
  manager: [
    { label: 'Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
    { label: 'Pending Reviews', path: '/manager/pending', icon: Clock, badge: true },
    { label: 'Team Evaluations', path: '/manager/team', icon: Users },
    { label: 'Approved', path: '/manager/approved', icon: CheckCircle },
    { label: 'Notifications', path: '/manager/notifications', icon: Bell, badge: true },
  ],
  hc: [
    { label: 'Dashboard', path: '/hc/dashboard', icon: LayoutDashboard },
    { label: 'Pending Validation', path: '/hc/pending', icon: Clock, badge: true },
    { label: 'All Evaluations', path: '/hc/evaluations', icon: FileText },
    { label: 'Calibration View', path: '/hc/calibration', icon: BarChart3 },
    { label: 'Employee Directory', path: '/hc/employees', icon: Users },
    { label: 'KPI Management', path: '/hc/kpis', icon: Target },
    { label: 'Cycles', path: '/hc/cycles', icon: Calendar },
    { label: 'Reports', path: '/hc/reports', icon: PieChart },
    { label: 'Audit Log', path: '/hc/audit', icon: Shield },
    { label: 'Notifications', path: '/hc/notifications', icon: Bell, badge: true },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  employee: 'Employee',
  manager: 'Line Manager',
  hc: 'HC Officer',
};

const ROLE_BADGE_CLASSES: Record<string, string> = {
  employee: 'bg-role-employee-bg text-role-employee-text',
  manager: 'bg-role-manager-bg text-role-manager-text',
  hc: 'bg-role-hc-bg text-role-hc-text',
};

const PORTAL_ACCENT_VAR: Record<string, string> = {
  employee: 'hsl(217, 91%, 60%)',
  manager: 'hsl(38, 93%, 50%)',
  hc: 'hsl(0, 84%, 60%)',
};

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle: string;
}

export function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  const { profile, role, signOut } = useAuth();
  const { data: notifications } = useNotifications();
  const { data: activeCycle } = useActiveCycle();
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = role || 'employee';
  const navItems = NAV_CONFIG[userRole] || [];
  const unreadCount = useMemo(() => notifications?.filter((n: any) => !n.is_read).length || 0, [notifications]);

  // Deadline banner for employees
  const daysUntilClose = useMemo(() => {
    if (userRole !== 'employee' || !activeCycle) return null;
    const endDate = new Date((activeCycle as any).end_date);
    const diff = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff <= 14 ? diff : null;
  }, [userRole, activeCycle]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-[220px] flex-col border-r border-border bg-background flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
          <div className="flex h-10 w-[120px] items-center justify-center rounded-lg bg-card text-xs font-medium text-muted-foreground border border-border">
            LOGO
          </div>
        </div>

        <div className="px-4 pt-3 pb-1">
          <p className="text-sm font-semibold text-foreground">Staff Appraisal</p>
        </div>

        {/* Role Badge */}
        <div className="px-4 py-2">
          <span className={cn('inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium', ROLE_BADGE_CLASSES[userRole])}>
            {ROLE_LABELS[userRole]}
          </span>
        </div>

        {/* Deadline Banner */}
        {daysUntilClose !== null && (
          <div className={cn(
            'mx-3 mb-2 rounded-md px-2.5 py-2 text-[11px] font-medium',
            daysUntilClose <= 3
              ? 'bg-destructive/20 text-destructive-foreground border border-destructive/50 animate-deadline-pulse'
              : daysUntilClose <= 7
                ? 'bg-destructive/15 text-role-hc-text'
                : 'bg-role-manager-bg text-role-manager-text'
          )}>
            <Flag className="inline h-3 w-3 mr-1" />
            {daysUntilClose} days until cycle closes
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5 py-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-4 py-2.5 text-[13px] transition-fast',
                  isActive
                    ? 'bg-card text-foreground'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                )}
                style={isActive ? { borderLeft: `3px solid ${PORTAL_ACCENT_VAR[userRole]}` } : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && unreadCount > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground px-1">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="border-t border-border p-2">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-md px-4 py-2.5 text-[13px] text-muted-foreground transition-fast hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6 flex-shrink-0">
          <h1 className="text-base font-medium text-foreground">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/${userRole}/notifications`)}
              className="relative text-muted-foreground hover:text-foreground transition-fast"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground px-1">
                  {unreadCount}
                </span>
              )}
            </button>

            <div className="w-px h-6 bg-border" />

            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[userRole]} · {profile?.department || '—'} · Branch {profile?.branch || '—'}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
