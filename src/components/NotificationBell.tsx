import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell, FileText, RefreshCw, AlertCircle, CheckCircle, Send,
  Award, Archive, Clock, ShieldAlert, BellOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  new_submission: { icon: FileText, color: '#3b82f6' },
  resubmission: { icon: RefreshCw, color: '#f59e0b' },
  revision_requested: { icon: AlertCircle, color: '#ef4444' },
  manager_approved: { icon: CheckCircle, color: '#22c55e' },
  evaluation_approved: { icon: CheckCircle, color: '#22c55e' },
  evaluation_submitted: { icon: FileText, color: '#3b82f6' },
  sent_to_hc: { icon: Send, color: '#a855f7' },
  hc_validated: { icon: Award, color: '#22c55e' },
  archived: { icon: Archive, color: '#67e8f9' },
  sla_warning: { icon: Clock, color: '#f59e0b' },
  tamper_alert: { icon: ShieldAlert, color: '#ef4444' },
  reminder: { icon: Bell, color: '#94a3b8' },
  second_mgr_needed: { icon: Send, color: '#a855f7' },
};

function timeAgo(date: string) {
  const d = Date.now() - new Date(date).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notifications, refetch } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => notifications?.filter((n: any) => !n.is_read).length || 0, [notifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notif-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, (payload: any) => {
        refetch();
        const n = payload.new;
        toast(n.title || 'New notification', { description: n.message?.slice(0, 80), duration: 4000 });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetch]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = async () => {
    const unread = (notifications || []).filter((n: any) => !n.is_read);
    for (const n of unread) {
      await supabase.from('notifications').update({ is_read: true } as any).eq('id', n.id);
    }
    refetch();
  };

  const handleClick = async (n: any) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true } as any).eq('id', n.id);
      refetch();
    }
    setOpen(false);
    if (n.evaluation_id) {
      if (role === 'hc') navigate(`/hc/evaluation/${n.evaluation_id}`);
      else if (role === 'manager') navigate(`/manager/review/${n.evaluation_id}`);
      else navigate(`/employee/evaluation/${n.evaluation_id}`);
    }
  };

  const sorted = [...(notifications || [])].sort((a: any, b: any) => {
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }).slice(0, 10);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative text-muted-foreground hover:text-foreground transition-fast">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground px-1 animate-in zoom-in">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[100] w-[380px] max-h-[480px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground px-1">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground transition-fast">Mark all as read</button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[380px]">
            {sorted.length > 0 ? sorted.map((n: any) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.reminder;
              const Icon = cfg.icon;
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={cn(
                    'w-full text-left flex gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-fast',
                    !n.is_read && 'bg-accent/30'
                  )}
                  style={{ borderLeft: `3px solid ${n.is_read ? 'hsl(var(--border))' : cfg.color}` }}>
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[13px] leading-tight', !n.is_read ? 'font-medium text-foreground' : 'text-muted-foreground')}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              );
            }) : (
              <div className="py-8 text-center">
                <BellOff className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2">
            <button onClick={() => { setOpen(false); navigate(`/${role || 'employee'}/notifications`); }}
              className="text-xs text-primary hover:underline w-full text-center">
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
