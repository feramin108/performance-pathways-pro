import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RatingPills } from '@/components/evaluation/RatingPills';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCycle, useKPITemplates } from '@/hooks/useSupabaseQueries';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Target, Check } from 'lucide-react';

interface GoalRow {
  id?: string;
  kpi_template_id: string | null;
  category: string;
  title: string;
  goal_statement: string;
  target_rating: number | null;
  saved: boolean;
}

export default function GoalSettingPage() {
  const { user } = useAuth();
  const { data: activeCycle } = useActiveCycle();
  const { data: templates } = useKPITemplates();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const saveTimers = useRef<Record<number, any>>({});

  const cycleId = (activeCycle as any)?.id;
  const cycleYear = (activeCycle as any)?.year || new Date().getFullYear();

  // Init from templates + existing goals
  useEffect(() => {
    if (!templates || !user || !cycleId) return;
    (async () => {
      const { data: existing } = await supabase.from('kpi_goals').select('*')
        .eq('employee_id', user.id).eq('cycle_id', cycleId);
      
      // Check if evaluation already submitted
      const { data: evals } = await supabase.from('evaluations').select('status')
        .eq('employee_id', user.id).eq('cycle_id', cycleId).limit(1);
      if (evals && evals.length > 0 && !['draft'].includes((evals[0] as any).status)) {
        setLocked(true);
      }

      const rows: GoalRow[] = (templates as any[]).map(t => {
        const ex = (existing as any[])?.find(g => g.kpi_template_id === t.id);
        return {
          id: ex?.id,
          kpi_template_id: t.id,
          category: t.category,
          title: t.title,
          goal_statement: ex?.goal_statement || '',
          target_rating: ex?.target_rating ?? null,
          saved: !!ex,
        };
      });
      setGoals(rows);
    })();
  }, [templates, user, cycleId]);

  const updateGoal = (idx: number, field: string, value: any) => {
    setGoals(prev => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
      next[idx].saved = false;
      return next;
    });
    // Debounced auto-save
    if (saveTimers.current[idx]) clearTimeout(saveTimers.current[idx]);
    saveTimers.current[idx] = setTimeout(() => saveGoal(idx), 800);
  };

  const saveGoal = useCallback(async (idx: number) => {
    if (!user || !cycleId || locked) return;
    const g = goals[idx];
    if (!g) return;
    const payload: any = {
      employee_id: user.id,
      cycle_id: cycleId,
      kpi_template_id: g.kpi_template_id,
      category: g.category,
      custom_title: g.title,
      goal_statement: g.goal_statement,
      target_rating: g.target_rating,
      sort_order: idx,
    };
    try {
      if (g.id) {
        await supabase.from('kpi_goals').update(payload).eq('id', g.id);
      } else {
        const { data } = await supabase.from('kpi_goals').insert(payload).select('id').single();
        if (data) {
          setGoals(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], id: (data as any).id, saved: true };
            return next;
          });
          return;
        }
      }
      setGoals(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], saved: true };
        return next;
      });
    } catch {}
  }, [goals, user, cycleId, locked]);

  const saveAll = async () => {
    setSaving(true);
    for (let i = 0; i < goals.length; i++) {
      await saveGoal(i);
    }
    setSaving(false);
    toast.success('All goals saved');
  };

  const totalSet = goals.filter(g => g.goal_statement || g.target_rating != null).length;
  const total = goals.length;
  const pct = total > 0 ? (totalSet / total) * 100 : 0;

  const categories = [
    { key: 'A1', label: 'Primary KPIs — A1' },
    { key: 'A2_WIG', label: 'Wildly Important Goal — A2' },
    { key: 'secondary', label: 'Secondary KPIs' },
    { key: 'generic', label: 'Generic KPIs' },
  ];

  return (
    <DashboardLayout pageTitle={`My KPI Goals — ${cycleYear}`}>
      <p className="text-sm text-muted-foreground mb-4">
        Set your performance targets for each KPI at the start of the cycle. These goals will appear alongside your ratings when you complete your year-end evaluation.
      </p>

      {locked && (
        <div className="surface-card border-l-[3px] border-l-warning p-3 mb-4 text-sm text-role-manager-text bg-role-manager-bg">
          Goals are locked once your evaluation is submitted.
        </div>
      )}

      {/* Progress */}
      <div className="surface-card p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Goals set for <strong className="text-foreground">{totalSet}</strong> of {total} KPIs</span>
          <span className="text-data text-foreground">{Math.round(pct)}%</span>
        </div>
        <div className="w-full h-2 bg-surface-raised rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {categories.map(cat => {
        const catGoals = goals.map((g, i) => ({ ...g, _idx: i })).filter(g => g.category === cat.key);
        if (catGoals.length === 0) return null;
        return (
          <div key={cat.key} className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> {cat.label}
            </h3>
            {catGoals.map(g => (
              <div key={g._idx} className="surface-card p-4 mb-3 relative">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-medium text-foreground">{g.title}</h4>
                  <span className="text-xs text-muted-foreground uppercase">{g.category}</span>
                </div>
                {g.saved && (
                  <span className="absolute top-3 right-3 text-[11px] text-success flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
                <label className="text-xs text-muted-foreground mb-1 block">Goal statement</label>
                <textarea
                  value={g.goal_statement}
                  onChange={e => updateGoal(g._idx, 'goal_statement', e.target.value)}
                  placeholder="What do you aim to achieve for this KPI this year?"
                  rows={2}
                  className="input-field w-full h-auto resize-none mb-3"
                  readOnly={locked}
                />
                <label className="text-xs text-muted-foreground mb-1.5 block">Target rating</label>
                <RatingPills value={g.target_rating} onChange={v => updateGoal(g._idx, 'target_rating', v)} readOnly={locked} />
              </div>
            ))}
          </div>
        );
      })}

      {!locked && (
        <button onClick={saveAll} disabled={saving}
          className="px-6 py-3 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save All Goals'}
        </button>
      )}
    </DashboardLayout>
  );
}
