import { useProfile, useNotifications } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { Bell, LogOut, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TopBar() {
  const { data: profile } = useProfile();
  const { data: notifications } = useNotifications();
  const navigate = useNavigate();
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Performance Cycle 2024</h2>
        <span className="rounded-sm bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">ACTIVE</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Role display */}
        {profile?.primaryRole && (
          <span className="rounded-sm bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground capitalize">
            {profile.primaryRole}
          </span>
        )}

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
          <span className="text-xs text-muted-foreground">{profile?.full_name || profile?.email}</span>
          <button
            onClick={handleLogout}
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
