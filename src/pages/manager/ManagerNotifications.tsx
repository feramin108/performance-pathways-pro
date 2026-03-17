import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useNotifications } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

export default function ManagerNotifications() {
  const navigate = useNavigate();
  const { data: notifications, refetch } = useNotifications();

  const markAllRead = async () => {
    const unread = (notifications || []).filter((n: any) => !n.is_read);
    for (const n of unread) {
      await supabase.from('notifications').update({ is_read: true } as any).eq('id', n.id);
    }
    toast.success('All marked as read');
    refetch();
  };

  const handleClick = async (n: any) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true } as any).eq('id', n.id);
      refetch();
    }
    if (n.evaluation_id) navigate(`/manager/review/${n.evaluation_id}`);
  };

  const sorted = [...(notifications || [])].sort((a: any, b: any) => {
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <DashboardLayout pageTitle="Notifications">
      <div className="flex justify-end mb-4">
        <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground">Mark all as read</button>
      </div>
      {sorted.length > 0 ? (
        <div className="space-y-2">
          {sorted.map((n: any) => (
            <div key={n.id} onClick={() => handleClick(n)}
              className={`p-4 rounded-lg cursor-pointer transition-fast border-l-[3px] ${n.is_read ? 'border-l-border bg-transparent' : 'border-l-warning surface-card'}`}>
              <p className={`text-sm ${n.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
