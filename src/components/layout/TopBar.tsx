import { useAuthStore } from '@/store/authStore';
import { useEvaluationStore } from '@/store/evaluationStore';
import { Bell, LogOut, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types/evaluation';

const ROLE_OPTIONS: { role: UserRole; label: string }[] = [
  { role: 'employee', label: 'Employee' },
  { role: 'manager', label: 'Manager' },
  { role: 'hr', label: 'HR' },
  { role: 'admin', label: 'Admin' },
];

export function TopBar() {
  const { currentUser, logout, switchRole } = useAuthStore();
  const { notifications } = useEvaluationStore();
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Performance Cycle 2024</h2>
        <span className="rounded-sm bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">ACTIVE</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Role Switcher (Demo) */}
        <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
          {ROLE_OPTIONS.map(opt => (
            <button
              key={opt.role}
              onClick={() => switchRole(opt.role)}
              className={`rounded-sm px-2 py-1 text-[10px] font-medium transition-mechanical ${
                currentUser?.role === opt.role
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-sm transition-mechanical hover:bg-secondary">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-2 border-l border-border pl-2">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{currentUser?.fullName}</span>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex h-8 w-8 items-center justify-center rounded-sm transition-mechanical hover:bg-secondary"
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
