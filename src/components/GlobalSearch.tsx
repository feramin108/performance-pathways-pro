import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, X, User, FileText, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'employee' | 'evaluation' | 'kpi';
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

export function GlobalSearch() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const all: SearchResult[] = [];

      // Search profiles (managers and HC)
      if (role === 'manager' || role === 'hc') {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, department, job_title').ilike('full_name', `%${q}%`).limit(5);
        (profiles || []).forEach((p: any) => {
          all.push({ type: 'employee', id: p.id, title: p.full_name, subtitle: `${p.department || '—'} · ${p.job_title || '—'}`, path: role === 'hc' ? `/hc/employees` : `/manager/team` });
        });
      }

      // Search evaluations
      const { data: evals } = await supabase.from('evaluations').select('id, final_score, final_classification, status, employee_id').limit(5);
      if (evals && evals.length > 0) {
        const empIds = [...new Set(evals.map((e: any) => e.employee_id))];
        const { data: empProfiles } = await supabase.from('profiles').select('id, full_name').in('id', empIds);
        const empMap = new Map((empProfiles || []).map((p: any) => [p.id, p.full_name]));
        evals.filter((e: any) => {
          const name = empMap.get(e.employee_id) || '';
          return name.toLowerCase().includes(q.toLowerCase()) || (e.final_classification || '').toLowerCase().includes(q.toLowerCase());
        }).slice(0, 5).forEach((e: any) => {
          const name = empMap.get(e.employee_id) || 'Unknown';
          all.push({ type: 'evaluation', id: e.id, title: name, subtitle: `${e.final_score?.toFixed(1) || '—'} · ${e.status}`, path: role === 'hc' ? `/hc/evaluation/${e.id}` : role === 'manager' ? `/manager/review/${e.id}` : `/employee/evaluation/${e.id}` });
        });
      }

      // KPI templates (HC only)
      if (role === 'hc') {
        const { data: kpis } = await supabase.from('kpi_templates').select('id, title, department_code, category').ilike('title', `%${q}%`).limit(5);
        (kpis || []).forEach((k: any) => {
          all.push({ type: 'kpi', id: k.id, title: k.title, subtitle: `${k.department_code || 'All'} · ${k.category}`, path: '/hc/kpis' });
        });
      }

      setResults(all);
    } catch { setResults([]); }
    setLoading(false);
  }, [role]);

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const icons: Record<string, React.ElementType> = { employee: User, evaluation: FileText, kpi: Target };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-muted-foreground hover:text-foreground transition-fast">
        <Search className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-2xl mx-auto mt-20 p-4" onClick={e => e.stopPropagation()}>
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input ref={inputRef} value={query} onChange={e => handleInput(e.target.value)}
              placeholder="Search evaluations, employees, KPIs..."
              className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground" />
            <button onClick={() => setOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>

          {query.length >= 2 && (
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Searching...</div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  {['employee', 'evaluation', 'kpi'].map(type => {
                    const group = results.filter(r => r.type === type);
                    if (group.length === 0) return null;
                    const Icon = icons[type];
                    return (
                      <div key={type}>
                        <p className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {type === 'employee' ? 'Employees' : type === 'evaluation' ? 'Evaluations' : 'KPI Templates'}
                        </p>
                        {group.map(r => (
                          <button key={r.id} onClick={() => { setOpen(false); navigate(r.path); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 text-left transition-fast">
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-foreground truncate">{r.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No results for "{query}"</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try searching for an employee name, year, or department.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
