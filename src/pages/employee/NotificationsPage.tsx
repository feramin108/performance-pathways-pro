import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useNotifications } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const markRead = async (id: string, evaluationId?: string) => {
    await supabase.from('notifications').update({ is_read: true } as any).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    if (evaluationId) navigate(`/employee/evaluation/${evaluationId}`);
  };

  const markAllRead = async () => {
    if (!notifications) return;
    const unread = notifications.filter((n: any) => !n.is_read);
    for (const n of unread) {
      await supabase.from('notifications').update({ is_read: true } as any).eq('id', (n as any).id);
    }
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const sorted = [...(notifications || [])].sort((a: any, b: any) => {
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <DashboardLayout pageTitle="Notifications">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{sorted.filter((n: any) => !n.is_read).length} unread</p>
        <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary hover:underline">
          <CheckCheck className="h-3.5 w-3.5" /> Mark all as read
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
      ) : sorted.length === 0 ? (
        <div className="p-12 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((n: any) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id, n.evaluation_id)}
              className={`w-full text-left surface-card p-4 transition-fast hover:bg-card/80 ${
                !n.is_read ? 'border-l-[3px] border-l-primary' : 'border-l-[3px] border-l-border'
              }`}
            >
              <p className={`text-sm ${!n.is_read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                {timeAgo(new Date(n.created_at))}
              </p>
            </button>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} minutes ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86400)} days ago`;
}
