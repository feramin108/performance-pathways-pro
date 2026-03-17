import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useManagerEvaluations, useDepartments } from '@/hooks/useSupabaseQueries';
import { getClassificationBg, getClassification } from '@/lib/scoreEngine';
import { Search, X } from 'lucide-react';

export default function TeamEvaluations() {
  const navigate = useNavigate();
  const { data: evaluations, isLoading } = useManagerEvaluations();
  const { data: departments } = useDepartments();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return (evaluations || []).filter((e: any) => {
      const name = (e.employee?.full_name || '').toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;
      if (deptFilter !== 'all' && e.employee?.department !== deptFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      return true;
    });
  }, [evaluations, search, deptFilter, statusFilter]);

  const statuses = ['draft', 'submitted', 'revision_requested', 'first_manager_approved', 'second_manager_review', 'sent_to_hc', 'hc_validated', 'archived'];

  return (
    <DashboardLayout pageTitle="Team Evaluations">
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee..." className="input-field w-full pl-9" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input-field w-auto">
          <option value="all">All Depts</option>
          {(departments || []).map((d: any) => <option key={d.code} value={d.code}>{d.code}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="all">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        {(search || deptFilter !== 'all' || statusFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setDeptFilter('all'); setStatusFilter('all'); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <div className="surface-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Employee</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">ID</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Dept</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Score</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Classification</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Revisions</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev: any) => {
                  const score = ev.final_score ? Number(ev.final_score) : null;
                  const cls = score ? getClassification(score).label : null;
                  return (
                    <tr key={ev.id} className="border-b border-border/50 hover:bg-card/50 transition-fast">
                      <td className="px-5 py-3 font-medium text-foreground">{ev.employee?.full_name || 'Unknown'}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{ev.employee?.employee_id || '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground">{ev.employee?.department || '—'}</td>
                      <td className="px-5 py-3"><StatusBadge status={ev.status} /></td>
                      <td className="px-5 py-3 font-mono text-foreground">{score ? score.toFixed(2) : '—'}</td>
                      <td className="px-5 py-3">{cls && <span className={`px-2 py-0.5 rounded text-xs font-medium ${getClassificationBg(cls)}`}>{cls}</span>}</td>
                      <td className="px-5 py-3">{(ev.revision_count || 0) > 0 && <span className="px-1.5 py-0.5 bg-[#78350f] text-[#fde68a] rounded text-xs">{ev.revision_count}</span>}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => navigate(`/manager/review/${ev.id}`)}
                          className="text-warning hover:underline text-xs font-medium">
                          {['submitted', 'second_manager_review'].includes(ev.status) ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-muted-foreground">No team evaluations found.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
