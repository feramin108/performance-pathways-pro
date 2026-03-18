import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Search, Download, Shield } from 'lucide-react';

export default function HCAuditLog() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [tamperOnly, setTamperOnly] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data: logs } = useQuery({
    queryKey: ['hc-full-audit'],
    queryFn: async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000) as any;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    let list = logs || [];
    if (search) list = list.filter((l: any) => l.actor_username?.toLowerCase().includes(search.toLowerCase()) || l.action?.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter !== 'all') list = list.filter((l: any) => l.actor_role === roleFilter);
    if (tamperOnly) list = list.filter((l: any) => l.tamper_detected);
    return list;
  }, [logs, search, roleFilter, tamperOnly]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const tamperCount = (logs || []).filter((l: any) => l.tamper_detected).length;
  const todayCount = (logs || []).filter((l: any) => new Date(l.created_at).toDateString() === new Date().toDateString()).length;

  const exportCSV = () => {
    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Old Status', 'New Status', 'Notes', 'IP', 'Tamper'];
    const rows = filtered.map((l: any) => [l.created_at, l.actor_username, l.actor_role, l.action, l.old_status, l.new_status, l.notes, l.ip_address, l.tamper_detected].map(v => `"${v || ''}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `AuditLog_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout pageTitle="System Audit Log">
      {/* Tamper pinned section */}
      {tamperCount > 0 && (
        <div className="mb-4 rounded-xl p-4" style={{ background: '#7c2d12', border: '1px solid #ef4444' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: '#fca5a5' }}>⚠ Active Tamper Alerts ({tamperCount})</h3>
          <p className="text-xs" style={{ color: '#fca5a580' }}>Score integrity violations have been detected. Review immediately.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search actor or action..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 input-field" />
        </div>
        <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] input-field"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="hc">HC</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={tamperOnly} onCheckedChange={v => { setTamperOnly(v); setPage(0); }} />
          Tamper only
        </label>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>

      <div className="flex gap-4 mb-4 text-xs text-muted-foreground">
        <span>Total: {filtered.length}</span>
        <span>Tamper alerts: {tamperCount}</span>
        <span>Today: {todayCount}</span>
      </div>

      <div className="surface-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Status Change</TableHead>
              <TableHead>Tamper</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No audit entries found.</TableCell></TableRow>}
            {paged.map((l: any) => (
              <TableRow key={l.id} style={l.tamper_detected ? { background: '#3b0a0a', borderLeft: '3px solid #ef4444' } : {}}>
                <TableCell className="text-data text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-sm text-foreground">{l.actor_username || 'System'}</TableCell>
                <TableCell>
                  <span className="text-xs rounded-full px-2 py-0.5" style={{
                    background: l.actor_role === 'hc' ? '#3b0f0f' : l.actor_role === 'manager' ? '#3f2a00' : '#1e3a5f',
                    color: l.actor_role === 'hc' ? '#fca5a5' : l.actor_role === 'manager' ? '#fde68a' : '#93c5fd',
                  }}>{l.actor_role || '—'}</span>
                </TableCell>
                <TableCell className="text-xs max-w-[300px] truncate">{l.action}</TableCell>
                <TableCell className="text-xs">
                  {l.old_status && l.new_status ? (
                    <>
                      <StatusBadge status={l.old_status} tone="muted" /> → <StatusBadge status={l.new_status} />
                    </>
                  ) : '—'}
                </TableCell>
                <TableCell>{l.tamper_detected && <span className="text-xs rounded px-2 py-0.5 font-medium" style={{ background: '#7c2d12', color: '#fca5a5' }}>⚠ TAMPER</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-3 border-t border-border">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
