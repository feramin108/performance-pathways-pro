import { useProfile } from '@/hooks/useSupabaseQueries';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  ClipboardList,
  BarChart3,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['employee', 'manager', 'hr', 'admin'] },
  { label: 'My Evaluations', icon: FileText, path: '/evaluations', roles: ['employee'] },
  { label: 'New Evaluation', icon: ClipboardList, path: '/evaluation/new', roles: ['employee'] },
  { label: 'Team Reviews', icon: Users, path: '/reviews', roles: ['manager'] },
  { label: 'All Evaluations', icon: FileText, path: '/hr/evaluations', roles: ['hr'] },
  { label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['hr', 'admin'] },
  { label: 'Audit Logs', icon: Shield, path: '/audit', roles: ['admin'] },
  { label: 'Administration', icon: Settings, path: '/admin', roles: ['admin'] },
];

export function AppSidebar() {
  const { data: profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = profile?.primaryRole || 'employee';
  const filteredItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));

  return (
    <aside className="flex w-60 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">EPMS</p>
          <p className="text-[10px] text-muted-foreground">Performance Ledger</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-mechanical',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-secondary text-xs font-semibold text-secondary-foreground">
            {(profile?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{profile?.full_name || 'User'}</p>
            <p className="truncate text-[10px] text-muted-foreground capitalize">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
