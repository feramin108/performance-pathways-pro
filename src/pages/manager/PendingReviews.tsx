import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useManagerEvaluations, useDepartments } from '@/hooks/useSupabaseQueries';
import { useAuth } from '@/contexts/AuthContext';
import { Search, X } from 'lucide-react';

export default function PendingReviews() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: evaluations, isLoading } = useManagerEvaluations();
  const { data: departments } = useDepartments();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  const pending = useMemo(() => {
    const statuses = ['submitted', 'revision_requested', 'second_manager_review'];
    return (evaluations || []).filter((e: any) => {
      if (!statuses.includes(e.status)) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      const name = (e.employee?.full_name || '').toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;
      if (deptFilter !== 'all' && e.employee?.department !== deptFilter) return false;
      const days = getDays(e);
      if (daysFilter === 'overdue' && days < 5) return false;
      if (daysFilter === 'critical' && days < 10) return false;
      return true;
    });
  }, [evaluations, search, statusFilter, daysFilter, deptFilter]);

  function getDays(ev: any) {
    const ref = ev.status === 'second_manager_review' ? ev.stage_second_manager_started_at : ev.stage_submitted_at;
    if (!ref) return 0;
    return Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
  }

  return (
    <DashboardLayout pageTitle="Pending Reviews">
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee name..." className="input-field w-full pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="revision_requested">Revision Requested</option>
          <option value="second_manager_review">2nd Manager Review</option>
        </select>
        <select value={daysFilter} onChange={e => setDaysFilter(e.target.value)} className="input-field w-auto">
          <option value="all">All Days</option>
          <option value="overdue">Overdue (5+)</option>
          <option value="critical">Critical (10+)</option>
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input-field w-auto">
          <option value="all">All Depts</option>
          {(departments || []).map((d: any) => <option key={d.code} value={d.code}>{d.code}</option>)}
        </select>
        {(search || statusFilter !== 'all' || daysFilter !== 'all' || deptFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setDaysFilter('all'); setDeptFilter('all'); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <div className="surface-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : pending.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Employee</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Dept</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Branch</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Days Waiting</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Score</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.sort((a: any, b: any) => getDays(b) - getDays(a)).map((ev: any) => {
                  const days = getDays(ev);
                  const daysBg = days >= 10 ? 'bg-[#7c2d12] text-[#fca5a5]' : days >= 5 ? 'bg-[#78350f] text-[#fde68a]' : 'bg-[#14532d] text-[#86efac]';
                  return (
                    <tr key={ev.id} className="border-b border-border/50 hover:bg-card/50 cursor-pointer transition-fast"
                      onClick={() => navigate(`/manager/review/${ev.id}`)}>
                      <td className="px-5 py-3 font-medium text-foreground">{ev.employee?.full_name || 'Unknown'}</td>
                      <td className="px-5 py-3 text-muted-foreground">{ev.employee?.department || '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground">{ev.employee?.branch || '—'}</td>
                      <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${daysBg}`}>{days >= 5 && '⚑ '}{days}d</span></td>
                      <td className="px-5 py-3"><StatusBadge status={ev.status} /></td>
                      <td className="px-5 py-3 font-mono text-foreground">{ev.final_score ? Number(ev.final_score).toFixed(2) : '—'}</td>
                      <td className="px-5 py-3"><button className="text-warning hover:underline text-xs font-medium">Review</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-muted-foreground">No pending reviews match your filters.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
