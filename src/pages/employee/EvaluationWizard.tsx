import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WizardStepper } from '@/components/evaluation/WizardStepper';
import { StickyScoreHeader } from '@/components/evaluation/StickyScoreHeader';
import { KPIRow } from '@/components/evaluation/KPIRow';
import { RatingPills } from '@/components/evaluation/RatingPills';
import { ScoreBox } from '@/components/evaluation/ScoreBox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCycle, useKPITemplates } from '@/hooks/useSupabaseQueries';
import { calculateScores, computeScoreHash, generateMockAISummary, getClassificationBg, type KPIEntry as KPIEntryType } from '@/lib/scoreEngine';
import { getEvaluationStatus } from '@/lib/evaluationAudit';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Save, CheckCircle, Info } from 'lucide-react';

interface LocalKPI {
  id?: string;
  template_id: string | null;
  goal_id: string | null;
  category: string;
  title: string;
  isCustom: boolean;
  employee_rating: number | null;
  employee_comment: string;
  sort_order: number;
  goalStatement?: string | null;
  goalTarget?: number | null;
}

interface FormData {
  full_name: string;
  function_role: string;
  occupied_since: string;
  department: string;
  previous_function: string;
  employee_id_field: string;
  date_joining: string;
  academic_qualification: string;
  marital_status: string;
  sex: string;
  employee_type: string;
  eval_year: number;
  cycle_id: string;
  career_path: string[];
  training_needs: string[];
  career_path_other: string;
  training_needs_other: string;
  key_areas_improvement: string;
  proposed_action_plan: string;
  employee_comments: string;
  nb_note: string;
  a2_description: string;
}

const CAREER_OPTIONS = [
  'Security Operations', 'Security Auditing', 'Risk Management', 'IT Compliance',
  'Project Management', 'Legal & Documentation', 'International Banking', 'Treasury Operations',
  'Fraud Investigation', 'Compliance & AML', 'Other',
];
const TRAINING_OPTIONS = [
  'Hardware Security Module', 'IT Risk Management', 'Project Management', 'Database Security',
  'Cybersecurity Certifications', 'AML Compliance', 'Credit Analysis', 'Fraud Investigation',
  'SWIFT Operations', 'Leadership & Management', 'Other',
];
const QUAL_OPTIONS = ['HND', 'BSc', 'MSc', 'MBA', 'PhD', 'Other'];

export default function EvaluationWizard() {
  const { id: evalId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { data: activeCycle } = useActiveCycle();
  const { data: templates } = useKPITemplates(profile?.department || undefined);

  const [step, setStep] = useState(1);
  const [evaluationId, setEvaluationId] = useState<string | null>(evalId || null);
  const [kpis, setKpis] = useState<LocalKPI[]>([]);
  const [formData, setFormData] = useState<FormData>({
    full_name: '', function_role: '', occupied_since: '', department: '',
    previous_function: '', employee_id_field: '', date_joining: '',
    academic_qualification: '', marital_status: '', sex: '', employee_type: 'non_sales',
    eval_year: new Date().getFullYear(), cycle_id: '',
    career_path: [], training_needs: [], career_path_other: '', training_needs_other: '',
    key_areas_improvement: '', proposed_action_plan: '', employee_comments: '', nb_note: '',
    a2_description: '',
  });
  const [saving, setSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const saveTimeout = useRef<any>(null);

  // Pre-fill from profile
  useEffect(() => {
    if (profile) {
      setFormData(f => ({
        ...f,
        full_name: profile.full_name || '',
        function_role: profile.function_role || '',
        occupied_since: profile.occupied_since || '',
        department: profile.department || '',
        previous_function: profile.previous_function || '',
        employee_id_field: profile.employee_id || '',
        date_joining: profile.date_joining || '',
        academic_qualification: profile.academic_qualification || '',
        marital_status: profile.marital_status || '',
        sex: profile.sex || '',
        employee_type: profile.employee_type || 'non_sales',
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (activeCycle) {
      setFormData(f => ({ ...f, cycle_id: (activeCycle as any).id, eval_year: (activeCycle as any).year }));
    }
  }, [activeCycle]);

  // Initialize with one empty A2 WIG KPI if no KPIs yet (not from templates)
  useEffect(() => {
    if (kpis.length > 0 || evalId) return;
    // Start with just one empty A2_WIG entry — user adds all others
    setKpis([{
      template_id: null, goal_id: null, category: 'A2_WIG',
      title: '', isCustom: true, employee_rating: null,
      employee_comment: '', sort_order: 0,
    }]);
  }, [evalId]);

  // Load existing draft
  useEffect(() => {
    if (!evalId || !user) return;
    (async () => {
      const { data: ev } = await supabase.from('evaluations').select('*').eq('id', evalId).single();
      if (!ev) return;
      setFormData(f => ({
        ...f,
        employee_type: (ev as any).employee_type || 'non_sales',
        key_areas_improvement: (ev as any).key_areas_improvement || '',
        proposed_action_plan: (ev as any).proposed_action_plan || '',
        employee_comments: (ev as any).employee_comments || '',
        career_path: Array.isArray((ev as any).career_path) ? (ev as any).career_path : [],
        training_needs: Array.isArray((ev as any).training_needs) ? (ev as any).training_needs : [],
      }));
      setEvaluationId(evalId);

      const { data: entries } = await supabase.from('kpi_entries').select('*').eq('evaluation_id', evalId).order('sort_order');
      if (entries && entries.length > 0) {
        setKpis((entries as any[]).map(e => ({
          id: e.id,
          template_id: e.kpi_template_id,
          goal_id: e.kpi_goal_id,
          category: e.category,
          title: e.custom_title || '',
          isCustom: !e.kpi_template_id,
          employee_rating: e.employee_rating,
          employee_comment: e.employee_comment || '',
          sort_order: e.sort_order ?? 0,
        })));
      }
    })();
  }, [evalId, user]);

  // Load goals
  useEffect(() => {
    if (!user || !formData.cycle_id) return;
    (async () => {
      const { data: goals } = await supabase.from('kpi_goals').select('*')
        .eq('employee_id', user.id).eq('cycle_id', formData.cycle_id);
      if (goals && goals.length > 0) {
        setKpis(prev => prev.map(k => {
          const goal = (goals as any[]).find(g => g.kpi_template_id === k.template_id);
          if (goal) return { ...k, goal_id: goal.id, goalStatement: goal.goal_statement, goalTarget: goal.target_rating };
          return k;
        }));
      }
    })();
  }, [user, formData.cycle_id]);

  const kpisByCategory = useMemo(() => ({
    A1: kpis.filter(k => k.category === 'A1'),
    A2_WIG: kpis.filter(k => k.category === 'A2_WIG'),
    secondary: kpis.filter(k => k.category === 'secondary'),
    generic: kpis.filter(k => k.category === 'generic'),
  }), [kpis]);

  const scores = useMemo(() => {
    const entries: KPIEntryType[] = kpis.map(k => ({
      category: k.category,
      employee_rating: k.employee_rating,
      sort_order: k.sort_order,
    }));
    return calculateScores(entries, formData.employee_type);
  }, [kpis, formData.employee_type]);

  const weights = formData.employee_type === 'sales'
    ? { a1: '50%', a2: '25%', sec: '10%', gen: '15%' }
    : { a1: '60%', a2: '15%', sec: '10%', gen: '15%' };

  // Auto-save debounced
  const triggerAutoSave = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveDraft(true), 2000);
  }, [evaluationId, kpis, formData]);

  const updateKPI = (idx: number, field: string, value: any) => {
    setKpis(prev => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
      return next;
    });
    triggerAutoSave();
  };

  const updateForm = (field: string, value: any) => {
    setFormData(f => ({ ...f, [field]: value }));
    triggerAutoSave();
  };

  const addKPI = (category: string, max: number, title = '') => {
    const current = kpis.filter(k => k.category === category);
    if (current.length >= max) return;
    setKpis(prev => [...prev, {
      template_id: null, goal_id: null, category, title,
      isCustom: true, employee_rating: null, employee_comment: '',
      sort_order: current.length,
    }]);
  };

  const removeKPI = (idx: number, category: string, min: number) => {
    const catKpis = kpis.filter(k => k.category === category);
    if (catKpis.length <= min) return;
    setKpis(prev => prev.filter((_, i) => i !== idx));
  };

  const saveDraft = async (silent = false) => {
    if (!user) return;
    setSaving(true);
    try {
      const evalData: any = {
        employee_id: user.id,
        cycle_id: formData.cycle_id || null,
        employee_type: formData.employee_type,
        status: 'draft',
        career_path: formData.career_path,
        training_needs: formData.training_needs,
        key_areas_improvement: formData.key_areas_improvement,
        proposed_action_plan: formData.proposed_action_plan,
        employee_comments: formData.employee_comments + (formData.nb_note ? `\n\nNB: ${formData.nb_note}` : ''),
        first_manager_id: profile?.manager_id || null,
        second_manager_id: profile?.second_manager_id || null,
        a1_score_on_100: scores.a1.scoreOn100,
        a1_weighted: scores.a1.weighted,
        a2_score_on_100: scores.a2.scoreOn100,
        a2_weighted: scores.a2.weighted,
        sec_score_on_100: scores.secondary.scoreOn100,
        sec_weighted: scores.secondary.weighted,
        gen_score_on_100: scores.generic.scoreOn100,
        gen_weighted: scores.generic.weighted,
        final_score: scores.finalScore,
        final_classification: scores.classification,
      };

      let savedId = evaluationId;
      if (evaluationId) {
        await supabase.from('evaluations').update(evalData).eq('id', evaluationId);
      } else {
        const { data } = await supabase.from('evaluations').insert(evalData).select('id').single();
        if (data) { savedId = (data as any).id; setEvaluationId(savedId); }
      }

      if (savedId) {
        // Delete existing entries and re-insert
        await supabase.from('kpi_entries').delete().eq('evaluation_id', savedId);
        const entries = kpis.map((k, i) => ({
          evaluation_id: savedId!,
          kpi_template_id: k.template_id || null,
          kpi_goal_id: k.goal_id || null,
          custom_title: k.isCustom ? k.title : k.title,
          category: k.category,
          employee_rating: k.employee_rating,
          employee_comment: k.employee_comment || null,
          sort_order: i,
        }));
        if (entries.length > 0) {
          await supabase.from('kpi_entries').insert(entries as any);
        }
      }

      if (!silent) toast.success('Draft saved');
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (err) {
      if (!silent) toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  // Validation
  const validation = useMemo(() => {
    const a1Rated = kpisByCategory.A1.filter(k => k.employee_rating != null).length;
    const a2Rated = kpisByCategory.A2_WIG.filter(k => k.employee_rating != null).length;
    const secRated = kpisByCategory.secondary.filter(k => k.employee_rating != null).length;
    const genRated = kpisByCategory.generic.filter(k => k.employee_rating != null).length;
    return {
      a1: { ok: a1Rated >= 5, count: a1Rated, min: 5 },
      a2: { ok: a2Rated >= 1, count: a2Rated, min: 1 },
      sec: { ok: secRated >= 2, count: secRated, min: 2 },
      gen: { ok: genRated >= 3, count: genRated, min: 3 },
      allPassed: a1Rated >= 5 && a2Rated >= 1 && secRated >= 2 && genRated >= 3,
    };
  }, [kpisByCategory]);

  const handleSubmit = async () => {
    if (!validation.allPassed || !user || !evaluationId) return;
    setSubmitting(true);
    try {
      const hash = await computeScoreHash(
        kpis.map(k => ({ category: k.category, employee_rating: k.employee_rating, sort_order: k.sort_order })),
        scores.finalScore,
      );
      const aiSummary = generateMockAISummary(
        kpis.map(k => ({ category: k.category, employee_rating: k.employee_rating })),
        scores.finalScore, scores.classification, formData.career_path,
      );

      await supabase.from('evaluations').update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        stage_submitted_at: new Date().toISOString(),
        score_hash: hash,
        score_locked_at: new Date().toISOString(),
        ai_summary: aiSummary,
        ai_summary_generated_at: new Date().toISOString(),
        final_score: scores.finalScore,
        final_classification: scores.classification,
        a1_score_on_100: scores.a1.scoreOn100,
        a1_weighted: scores.a1.weighted,
        a2_score_on_100: scores.a2.scoreOn100,
        a2_weighted: scores.a2.weighted,
        sec_score_on_100: scores.secondary.scoreOn100,
        sec_weighted: scores.secondary.weighted,
        gen_score_on_100: scores.generic.scoreOn100,
        gen_weighted: scores.generic.weighted,
      } as any).eq('id', evaluationId);

      // Audit log
      await supabase.from('audit_logs').insert({
        evaluation_id: evaluationId,
        actor_id: user.id,
        actor_role: 'employee',
        actor_username: profile?.username || profile?.full_name,
        action: 'Evaluation submitted by employee',
        old_status: 'draft',
        new_status: 'submitted',
      } as any);

      // Notify manager
      if (profile?.manager_id) {
        await supabase.from('notifications').insert({
          recipient_id: profile.manager_id,
          type: 'evaluation_submitted',
          title: 'New evaluation submitted',
          message: `${profile.full_name} has submitted their ${formData.eval_year} evaluation — awaiting your review.`,
          evaluation_id: evaluationId,
        } as any);
      }

      setShowSuccess(true);
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const longevity = useMemo(() => {
    if (!formData.date_joining) return '—';
    const join = new Date(formData.date_joining);
    const now = new Date();
    const months = (now.getFullYear() - join.getFullYear()) * 12 + now.getMonth() - join.getMonth();
    if (months < 24) return `${months} months`;
    const y = Math.floor(months / 12);
    const m = months % 12;
    return `${y} year${y > 1 ? 's' : ''}${m > 0 ? `, ${m} month${m > 1 ? 's' : ''}` : ''}`;
  }, [formData.date_joining]);

  // Success modal
  if (showSuccess) {
    return (
      <DashboardLayout pageTitle="Evaluation Submitted">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="surface-card p-8 max-w-md text-center">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Evaluation Submitted</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your {formData.eval_year} appraisal has been submitted to your line manager for review.
            </p>
            <div className="surface-raised p-3 rounded-lg mb-6 text-data">
              <span className="text-foreground font-semibold">{scores.finalScore.toFixed(2)}</span>
              <span className="text-muted-foreground"> — </span>
              <span className={getClassificationBg(scores.classification) + ' px-2 py-0.5 rounded text-xs'}>{scores.classification}</span>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate(`/employee/evaluation/${evaluationId}`)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">View My Evaluation</button>
              <button onClick={() => navigate('/employee/dashboard')} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground">Go to Dashboard</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const renderStepContent = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderKPIStep('A1', kpisByCategory.A1, 5, 7, weights.a1);
      case 3: return renderStep3();
      case 4: return renderKPIStep('secondary', kpisByCategory.secondary, 2, 3, weights.sec);
      case 5: return renderKPIStep('generic', kpisByCategory.generic, 3, 4, weights.gen);
      case 6: return renderStep6();
      case 7: return renderStep7();
      default: return null;
    }
  };

  const renderStep1 = () => (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-1">Staff Personal Information</h2>
      <p className="text-sm text-muted-foreground mb-6">Auto-filled from your profile. Edit if needed.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name" value={formData.full_name} onChange={v => updateForm('full_name', v)} />
        <Field label="Function / Role" value={formData.function_role} onChange={v => updateForm('function_role', v)} />
        <Field label="Occupied Since" value={formData.occupied_since} onChange={v => updateForm('occupied_since', v)} type="date" />
        <Field label="Service / Unit" value={formData.department} readOnly />
        <Field label="Previous Function" value={formData.previous_function} onChange={v => updateForm('previous_function', v)} />
        <Field label="Employee ID" value={formData.employee_id_field} readOnly />
        <Field label="Date of Joining" value={formData.date_joining} onChange={v => updateForm('date_joining', v)} type="date" />
        <Field label="Longevity in Bank" value={longevity} readOnly />
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Highest Academic Qualification</label>
          <select value={formData.academic_qualification} onChange={e => updateForm('academic_qualification', e.target.value)} className="input-field w-full">
            <option value="">Select...</option>
            {QUAL_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Marital Status</label>
          <select value={formData.marital_status} onChange={e => updateForm('marital_status', e.target.value)} className="input-field w-full">
            <option value="">Select...</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Sex</label>
          <div className="flex gap-2">
            {['M', 'F'].map(s => (
              <button key={s} type="button" onClick={() => updateForm('sex', s)}
                className={`flex-1 h-11 rounded-lg text-sm font-medium transition-fast ${formData.sex === s ? 'bg-primary text-primary-foreground' : 'bg-surface-raised border border-border text-muted-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
            Employee Type
            <span className="group relative">
              <Info className="h-3 w-3 text-muted-foreground" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-card border border-border rounded px-2 py-1 text-[10px] w-48 z-10">
                Sales: A1=50%, A2=25%. Non-sales: A1=60%, A2=15%
              </span>
            </span>
          </label>
          <div className="flex gap-2">
            {[{ v: 'non_sales', l: 'Non-Sales' }, { v: 'sales', l: 'Sales' }].map(t => (
              <button key={t.v} type="button" onClick={() => updateForm('employee_type', t.v)}
                className={`flex-1 h-11 rounded-lg text-sm font-medium transition-fast ${formData.employee_type === t.v ? 'bg-primary text-primary-foreground' : 'bg-surface-raised border border-border text-muted-foreground'}`}>
                {t.l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderKPIStep = (category: string, catKpis: LocalKPI[], min: number, max: number, weightLabel: string) => {
    const catLabels: Record<string, string> = {
      'A1': `Primary KPIs — Category A1 (Weight: ${weightLabel})`,
      'secondary': `Secondary KPIs (Weight: ${weightLabel})`,
      'generic': `Generic KPIs (Weight: ${weightLabel})`,
    };
    const scoreLabel: Record<string, string> = {
      'A1': 'Total score for Primary KPIs A1 on 100%:',
      'secondary': 'Total score for Secondary KPIs on 100%:',
      'generic': 'Total score for Generic KPIs on 100%:',
    };
    const catScore = category === 'A1' ? scores.a1 : category === 'secondary' ? scores.secondary : scores.generic;

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-foreground">{catLabels[category]}</h2>
          <span className={`text-xs font-medium ${catKpis.filter(k => k.employee_rating != null).length >= min ? 'text-success' : 'text-destructive'}`}>
            {catKpis.filter(k => k.employee_rating != null).length} / {max} KPIs (min {min})
          </span>
        </div>
        <div className="surface-card border-l-[3px] border-l-primary p-3 mb-4 text-sm text-muted-foreground">
          For each KPI, select the appropriate rating and add comments to justify your score.
        </div>
        {catKpis.map((k, localIdx) => {
          const globalIdx = kpis.findIndex(kk => kk === k);
          return (
            <KPIRow
              key={globalIdx}
              title={k.title}
              isCustom={k.isCustom}
              rating={k.employee_rating}
              comment={k.employee_comment}
              goalStatement={k.goalStatement}
              goalTarget={k.goalTarget}
              onRatingChange={v => updateKPI(globalIdx, 'employee_rating', v)}
              onCommentChange={v => updateKPI(globalIdx, 'employee_comment', v)}
              onTitleChange={k.isCustom ? v => updateKPI(globalIdx, 'title', v) : undefined}
              onDelete={() => removeKPI(globalIdx, category, min)}
              canDelete={k.isCustom && catKpis.length > min}
            />
          );
        })}
        {catKpis.length < max && (
          <button type="button" onClick={() => addKPI(category, max)}
            className="text-sm text-primary hover:underline mb-4">+ Add Custom KPI</button>
        )}
        <ScoreBox label={scoreLabel[category] || ''} scoreOn100={catScore.scoreOn100} weightLabel={weightLabel} weighted={catScore.weighted} />
      </div>
    );
  };

  const renderStep3 = () => {
    const a2 = kpisByCategory.A2_WIG[0];
    const globalIdx = kpis.findIndex(k => k === a2);
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">
          Primary KPI A2 — Wildly Important Goal ({weights.a2})
        </h2>
        <div className="surface-card border-l-[3px] border-l-[#a855f7] p-3 mb-4 text-sm text-muted-foreground">
          The WIG is the single most important goal you must achieve this year. Maximum 1 KPI.
        </div>
        {a2 && (
          <div className="surface-card p-4 mb-4">
            <label className="text-xs text-muted-foreground mb-1.5 block">Goal Description</label>
            <textarea value={formData.a2_description} onChange={e => updateForm('a2_description', e.target.value)}
              placeholder="Describe your Wildly Important Goal for this evaluation period..."
              rows={3} className="input-field w-full h-auto resize-none mb-3" />
            {a2.goalStatement && (
              <div className="mb-3 px-3 py-2 rounded-md bg-surface-raised border border-border text-xs text-muted-foreground">
                <span className="text-primary font-medium">Goal target: {a2.goalTarget ?? '—'}</span> — {a2.goalStatement}
              </div>
            )}
            <label className="text-xs text-muted-foreground mb-1.5 block">Rating</label>
            <RatingPills value={a2.employee_rating} onChange={v => updateKPI(globalIdx, 'employee_rating', v)} />
            <label className="text-xs text-muted-foreground mb-1.5 block mt-3">Comments</label>
            <textarea value={a2.employee_comment} onChange={e => updateKPI(globalIdx, 'employee_comment', e.target.value)}
              placeholder="Justify your rating..." rows={2} className="input-field w-full h-auto resize-none" />
          </div>
        )}
        <ScoreBox label="Total score for Primary KPI A2 (WIG) on 100%:" scoreOn100={scores.a2.scoreOn100} weightLabel={weights.a2} weighted={scores.a2.weighted} />
        <div className="mt-3">
          <ScoreBox label="Total score for Primary KPIs A1 and A2 on 100%:" scoreOn100={scores.a1a2Combined.scoreOn100}
            weightLabel={formData.employee_type === 'sales' ? '75%' : '75%'} weighted={scores.a1a2Combined.weighted} highlight />
        </div>
      </div>
    );
  };

  const renderStep6 = () => (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-1">Additional Information</h2>
      <p className="text-sm text-muted-foreground mb-6">These sections are required to complete your evaluation form.</p>

      <Accordion title="Preferred career path of the employee in the bank">
        <div className="grid grid-cols-2 gap-2">
          {CAREER_OPTIONS.map(opt => (
            <label key={opt} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={formData.career_path.includes(opt)}
                onChange={e => {
                  const next = e.target.checked ? [...formData.career_path, opt] : formData.career_path.filter(c => c !== opt);
                  updateForm('career_path', next);
                }}
                className="rounded border-border" />
              {opt}
            </label>
          ))}
        </div>
        {formData.career_path.includes('Other') && (
          <input value={formData.career_path_other} onChange={e => updateForm('career_path_other', e.target.value)}
            placeholder="Specify other..." className="input-field w-full mt-2" />
        )}
      </Accordion>

      <Accordion title="Training needs of the employee tailored to the job">
        <div className="grid grid-cols-2 gap-2">
          {TRAINING_OPTIONS.map(opt => (
            <label key={opt} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={formData.training_needs.includes(opt)}
                onChange={e => {
                  const next = e.target.checked ? [...formData.training_needs, opt] : formData.training_needs.filter(c => c !== opt);
                  updateForm('training_needs', next);
                }}
                className="rounded border-border" />
              {opt}
            </label>
          ))}
        </div>
        {formData.training_needs.includes('Other') && (
          <input value={formData.training_needs_other} onChange={e => updateForm('training_needs_other', e.target.value)}
            placeholder="Specify other..." className="input-field w-full mt-2" />
        )}
      </Accordion>

      <Accordion title="Key Areas that require improvement">
        <textarea value={formData.key_areas_improvement} onChange={e => updateForm('key_areas_improvement', e.target.value)}
          placeholder="Describe the specific areas where you would like to improve your performance..."
          rows={4} className="input-field w-full h-auto resize-none" />
      </Accordion>

      <Accordion title="Proposed plan of action to improve performance">
        <textarea value={formData.proposed_action_plan} onChange={e => updateForm('proposed_action_plan', e.target.value)}
          placeholder="Outline specific steps, courses, or activities you plan to undertake..."
          rows={4} className="input-field w-full h-auto resize-none" />
      </Accordion>

      <Accordion title="Comments of the employee">
        <textarea value={formData.employee_comments} onChange={e => updateForm('employee_comments', e.target.value)}
          placeholder="Add any additional comments, context, or remarks..."
          rows={3} className="input-field w-full h-auto resize-none" />
      </Accordion>

      <div className="mt-4">
        <label className="text-xs text-muted-foreground mb-1.5 block">Additional Note (NB)</label>
        <textarea value={formData.nb_note} onChange={e => updateForm('nb_note', e.target.value)}
          placeholder="Optional — add any important notes or caveats about your evaluation..."
          rows={2} className="input-field w-full h-auto resize-none" />
        <p className="text-[11px] text-muted-foreground mt-1">This will appear as an 'NB' note at the bottom of your form.</p>
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-1">Review Your Evaluation</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Review all your KPI ratings and scores before submitting. You cannot edit after submission unless your manager requests a revision.
      </p>

      {/* Validation */}
      <div className="surface-card p-4 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Validation Summary</h3>
        {[
          { label: `A1: ${validation.a1.count} KPIs rated`, ok: validation.a1.ok, note: `(min ${validation.a1.min})`, goTo: 2 },
          { label: `A2: WIG rated`, ok: validation.a2.ok, note: '', goTo: 3 },
          { label: `Secondary: ${validation.sec.count} KPIs rated`, ok: validation.sec.ok, note: `(min ${validation.sec.min})`, goTo: 4 },
          { label: `Generic: ${validation.gen.count} KPIs rated`, ok: validation.gen.ok, note: `(min ${validation.gen.min})`, goTo: 5 },
        ].map((v, i) => (
          <div key={i} className="flex items-center gap-2 py-1 text-sm">
            <span className={v.ok ? 'text-success' : 'text-destructive'}>{v.ok ? '✓' : '✗'}</span>
            <span className="text-foreground">{v.label}</span>
            <span className="text-muted-foreground text-xs">{v.note}</span>
            {!v.ok && <button type="button" onClick={() => setStep(v.goTo)} className="text-xs text-primary hover:underline ml-auto">Go to section</button>}
          </div>
        ))}
        <p className={`text-xs mt-2 ${validation.allPassed ? 'text-success' : 'text-destructive'}`}>
          {validation.allPassed ? 'All checks passed — ready to submit.' : 'Fix the issues above before submitting.'}
        </p>
      </div>

      {/* KPI Summary Tables */}
      {(['A1', 'A2_WIG', 'secondary', 'generic'] as const).map(cat => {
        const catKpis = kpisByCategory[cat];
        const labels: Record<string, string> = { A1: 'Primary KPIs — A1', A2_WIG: 'WIG — A2', secondary: 'Secondary KPIs', generic: 'Generic KPIs' };
        return (
          <div key={cat} className="mb-4">
            <h3 className="text-sm font-medium text-foreground mb-2">{labels[cat]}</h3>
            <div className="surface-card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-4 py-2 text-xs">KPI Title</th>
                  <th className="text-left px-4 py-2 text-xs w-20">Rating</th>
                </tr></thead>
                <tbody>
                  {catKpis.map((k, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-4 py-2 text-foreground">{k.title || 'Custom KPI'}</td>
                      <td className="px-4 py-2">
                        <RatingPills value={k.employee_rating} readOnly size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Final Score */}
      <div className="surface-card p-6 border-2 rounded-2xl mb-6" style={{ borderColor: scores.classificationColor }}>
        <h3 className="text-sm text-muted-foreground mb-3">Total appraisal score of the staff = A+B+C</h3>
        <div className="space-y-1 text-data text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">A1 weighted:</span><span className="text-foreground">{scores.a1.weighted.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">A2 weighted:</span><span className="text-foreground">{scores.a2.weighted.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Secondary weighted:</span><span className="text-foreground">{scores.secondary.weighted.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Generic weighted:</span><span className="text-foreground">{scores.generic.weighted.toFixed(2)}</span></div>
          <div className="border-t border-border pt-2 mt-2 flex justify-between text-base font-semibold">
            <span className="text-foreground">FINAL SCORE:</span>
            <span className="text-foreground">{scores.finalScore.toFixed(2)} / 100</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">CLASSIFICATION:</span>
          <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${getClassificationBg(scores.classification)}`}>
            ● {scores.classification}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          {[['0–35', 'Very Poor'], ['36–49', 'Poor'], ['50–65', 'Fairly Good'], ['66–80', 'Good'], ['81–95', 'Excellent'], ['≥96', 'Exceptional']].map(([range, label]) => (
            <span key={label} className={`px-2 py-0.5 rounded ${getClassificationBg(label)}`}>{range}: {label}</span>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      <div className="surface-card border-l-[3px] border-l-[#a855f7] p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-foreground">AI Performance Insight</span>
          <span className="text-[10px] text-muted-foreground bg-surface-raised px-1.5 py-0.5 rounded">Auto-generated</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {generateMockAISummary(
            kpis.map(k => ({ category: k.category, employee_rating: k.employee_rating })),
            scores.finalScore, scores.classification, formData.career_path,
          )}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-2">This summary is AI-assisted and should be reviewed by the line manager before use.</p>
      </div>
    </div>
  );

  return (
    <DashboardLayout pageTitle={evalId ? 'Edit Evaluation' : 'New Evaluation'}>
      <div className="-mx-6 -mt-6">
        <WizardStepper currentStep={step} onStepClick={s => setStep(s)} />
        <StickyScoreHeader scores={scores} />
        {draftSaved && (
          <div className="bg-surface-raised px-6 py-1.5 text-xs text-success text-right">Draft saved ✓</div>
        )}
      </div>

      <div className="max-w-3xl mx-auto py-6">
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-border">
          {step > 1 ? (
            <button type="button" onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-fast">
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button type="button" onClick={() => saveDraft(false)} disabled={saving}
              className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-fast">
              <Save className="h-4 w-4" /> Save Draft
            </button>
            {step < 7 ? (
              <button type="button" onClick={() => { saveDraft(true); setStep(s => s + 1); }}
                className="flex items-center gap-1 px-5 py-2.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={!validation.allPassed || submitting}
                className="px-6 py-3 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {submitting ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> Submitting...</> : 'Submit Evaluation'}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Simple field component
function Field({ label, value, onChange, readOnly, type = 'text' }: {
  label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange?.(e.target.value)}
        readOnly={readOnly}
        className={`input-field w-full ${readOnly ? 'bg-surface-raised cursor-default' : ''}`} />
    </div>
  );
}

// Simple accordion
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="surface-card mb-3 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-card/50 transition-fast">
        {title}
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
