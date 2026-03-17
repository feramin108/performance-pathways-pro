import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useHCEvaluations, useAllProfiles } from '@/hooks/useSupabaseQueries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { STATUS_LABELS } from '@/types/evaluation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Search, Download } from 'lucide-react';

export default function HCAllEvaluations() {
  const navigate = useNavigate();
  const { data: evaluations } = useHCEvaluations();
  const { data: profiles } = useAllProfiles();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const depts = useMemo(() => [...new Set((profiles || []).map((p: any) => p.department).filter(Boolean))].sort(), [profiles]);

  const filtered = useMemo(() => {
    let list = evaluations || [];
    if (search) list = list.filter((e: any) => {
      const emp = profiles?.find((p: any) => p.id === e.employee_id);
      return emp?.full_name?.toLowerCase().includes(search.toLowerCase()) || emp?.employee_id?.toLowerCase().includes(search.toLowerCase());
    });
    if (statusFilter !== 'all') list = list.filter((e: any) => e.status === statusFilter);
    if (deptFilter !== 'all') list = list.filter((e: any) => {
      const emp = profiles?.find((p: any) => p.id === e.employee_id);
      return emp?.department === deptFilter;
    });
    return list;
  }, [evaluations, profiles, search, statusFilter, deptFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const avgScore = filtered.filter((e: any) => e.final_score != null).reduce((a: number, e: any) => a + Number(e.final_score), 0) / (filtered.filter((e: any) => e.final_score != null).length || 1);

  const exportCSV = () => {
    const headers = ['Employee Name', 'Employee ID', 'Dept', 'Branch', 'Status', 'Self Score', 'Final Score', 'Classification', 'HC Decision'];
    const rows = filtered.map((e: any) => {
      const emp = profiles?.find((p: any) => p.id === e.employee_id);
      return [emp?.full_name, emp?.employee_id, emp?.department, emp?.branch, e.status, e.final_score?.toFixed(1), e.final_score?.toFixed(1), e.final_classification, e.hc_decision].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Evaluations_Export_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout pageTitle="All Evaluations">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 input-field" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] input-field"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] input-field"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Depts</SelectItem>{depts.map(d => <SelectItem key={d} value={d as string}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {filtered.length} evaluations · Avg score: {avgScore.toFixed(1)} · {filtered.filter((e: any) => e.status === 'hc_validated').length} validated · {filtered.filter((e: any) => e.status === 'sent_to_hc').length} pending · {filtered.filter((e: any) => e.status === 'archived').length} archived
      </p>

      <div className="surface-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>HC Decision</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No evaluations found.</TableCell></TableRow>}
            {paged.map((e: any) => {
              const emp = profiles?.find((p: any) => p.id === e.employee_id);
              return (
                <TableRow key={e.id} className="cursor-pointer hover:bg-card" onClick={() => navigate(`/hc/evaluation/${e.id}`)}>
                  <TableCell className="font-medium text-foreground">{emp?.full_name || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{emp?.employee_id || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{emp?.department || '—'}</TableCell>
                  <TableCell><StatusBadge status={e.status} /></TableCell>
                  <TableCell className="text-data text-sm">{e.final_score?.toFixed(1) ?? '—'}</TableCell>
                  <TableCell className="text-xs">{e.final_classification || '—'}</TableCell>
                  <TableCell>
                    {e.hc_decision && (
                      <span className="text-xs rounded-full px-2 py-0.5" style={{
                        background: e.hc_decision === 'validated' ? '#14532d' : e.hc_decision === 'flagged' ? '#7c2d12' : '#78350f',
                        color: e.hc_decision === 'validated' ? '#86efac' : e.hc_decision === 'flagged' ? '#fca5a5' : '#fde68a',
                      }}>{e.hc_decision}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {e.score_tampered && <span className="text-destructive mr-1">⚠</span>}
                  </TableCell>
                  <TableCell>
                    <button className="text-xs font-medium text-primary hover:underline" onClick={ev => { ev.stopPropagation(); navigate(`/hc/evaluation/${e.id}`); }}>View</button>
                  </TableCell>
                </TableRow>
              );
            })}
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
