import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useNotifications } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, Shield, Clock, Archive } from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
  evaluation_received: Mail,
  tamper_alert: Shield,
  sla_warning: Clock,
  archived: Archive,
  hc_validated: Mail,
};

const TYPE_COLORS: Record<string, string> = {
  evaluation_received: '#a855f7',
  tamper_alert: '#ef4444',
  sla_warning: '#f59e0b',
  archived: '#22c55e',
  hc_validated: '#3b82f6',
};

export default function HCNotifications() {
  const navigate = useNavigate();
  const { data: notifications, refetch } = useNotifications();

  const sorted = [...(notifications || [])].sort((a: any, b: any) => {
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    refetch();
  };

  const markAllRead = async () => {
    const unread = (notifications || []).filter((n: any) => !n.is_read);
    for (const n of unread) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', (n as any).id);
    }
    refetch();
  };

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <DashboardLayout pageTitle="Notifications">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{sorted.filter((n: any) => !n.is_read).length} unread</p>
        <Button variant="outline" size="sm" onClick={markAllRead}>Mark all as read</Button>
      </div>

      <div className="space-y-1">
        {sorted.length === 0 && <div className="surface-card p-12 text-center text-sm text-muted-foreground">No notifications yet.</div>}
        {sorted.map((n: any) => {
          const Icon = TYPE_ICONS[n.type] || Mail;
          const color = TYPE_COLORS[n.type] || '#94a3b8';
          return (
            <button key={n.id} className="w-full text-left rounded-lg p-4 transition-fast" onClick={() => { markRead(n.id); if (n.evaluation_id) navigate(`/hc/evaluation/${n.evaluation_id}`); }}
              style={{
                background: n.is_read ? 'transparent' : '#1e293b',
                borderLeft: `3px solid ${n.is_read ? '#334155' : color}`,
              }}>
              <div className="flex items-start gap-3">
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color }} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
