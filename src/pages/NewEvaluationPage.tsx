import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useProfile, useCreateEvaluation } from '@/hooks/useSupabaseQueries';
import { AppLayout } from '@/components/layout/AppLayout';
import { EvaluationWizardSidebar } from '@/components/evaluation/EvaluationWizardSidebar';
import { StickyScoreHeader } from '@/components/evaluation/StickyScoreHeader';
import { GeneralInfoStep } from '@/components/evaluation/steps/GeneralInfoStep';
import { PrimaryA1Step } from '@/components/evaluation/steps/PrimaryA1Step';
import { PrimaryA2Step } from '@/components/evaluation/steps/PrimaryA2Step';
import { SecondaryStep } from '@/components/evaluation/steps/SecondaryStep';
import { GenericStep } from '@/components/evaluation/steps/GenericStep';
import { AdditionalStep } from '@/components/evaluation/steps/AdditionalStep';
import { FinalizeStep } from '@/components/evaluation/steps/FinalizeStep';
import { KPIEntry, calculateWeightedScore, getClassification, WIZARD_STEPS } from '@/types/evaluation';
import { fadeIn } from '@/lib/animations';
import { toast } from 'sonner';

const makeId = () => `kpi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function NewEvaluationPage() {
  const { data: profile } = useProfile();
  const createEvaluation = useCreateEvaluation();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSalesStaff, setIsSalesStaff] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const mockUser = {
    id: profile?.authId || '',
    fullName: profile?.full_name || '',
    email: profile?.email || '',
    department: profile?.department || '',
    unit: profile?.unit || '',
    jobTitle: profile?.job_title || '',
    managerId: '',
    managerName: profile?.manager_name || '',
    role: profile?.primaryRole || 'employee',
    longevity: profile?.longevity || '',
    qualification: profile?.qualification || '',
    maritalStatus: profile?.marital_status || '',
  } as any;

  const [generalInfo, setGeneralInfo] = useState({
    longevity: profile?.longevity || '',
    qualification: profile?.qualification || '',
    maritalStatus: profile?.marital_status || '',
  });

  const [primaryA1, setPrimaryA1] = useState<KPIEntry[]>([
    { id: makeId(), title: '', rating: 0, comment: '' },
    { id: makeId(), title: '', rating: 0, comment: '' },
    { id: makeId(), title: '', rating: 0, comment: '' },
    { id: makeId(), title: '', rating: 0, comment: '' },
    { id: makeId(), title: '', rating: 0, comment: '' },
  ]);

  const [primaryA2, setPrimaryA2] = useState<KPIEntry[]>([
    { id: makeId(), title: '', rating: 0, comment: '' },
  ]);

  const [secondaryKPIs, setSecondaryKPIs] = useState<KPIEntry[]>([
    { id: makeId(), title: '', rating: 0, comment: '' },
    { id: makeId(), title: '', rating: 0, comment: '' },
  ]);

  const [genericKPIs, setGenericKPIs] = useState<KPIEntry[]>([
    { id: makeId(), title: 'Reporting', rating: 0, comment: '' },
    { id: makeId(), title: 'Teamwork', rating: 0, comment: '' },
    { id: makeId(), title: 'Adaptability', rating: 0, comment: '' },
  ]);

  const [additional, setAdditional] = useState({
    careerPathPreferences: '',
    trainingNeeds: '',
    areasForImprovement: '',
    proposedActionPlan: '',
    employeeComments: '',
  });

  const tempForm = { isSalesStaff, primaryA1, primaryA2, secondaryKPIs, genericKPIs } as any;
  const runningScore = calculateWeightedScore(tempForm);
  const classification = getClassification(runningScore);

  const handleSaveDraft = () => {
    setLastSaved(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    toast.success('Draft saved successfully');
  };

  const handleSubmit = () => {
    if (!profile) return;

    if (primaryA1.length < 5) {
      toast.error('Primary KPI A1 requires at least 5 entries');
      return;
    }
    if (primaryA1.some(k => !k.title.trim())) {
      toast.error('All Primary A1 KPIs must have titles');
      return;
    }

    const allKpis = [
      ...primaryA1.map((k, i) => ({ category: 'primary_a1', title: k.title, rating: k.rating, comment: k.comment, sort_order: i })),
      ...primaryA2.map((k, i) => ({ category: 'primary_a2', title: k.title, rating: k.rating, comment: k.comment, sort_order: i })),
      ...secondaryKPIs.map((k, i) => ({ category: 'secondary', title: k.title, rating: k.rating, comment: k.comment, sort_order: i })),
      ...genericKPIs.map((k, i) => ({ category: 'generic', title: k.title, rating: k.rating, comment: k.comment, sort_order: i })),
    ];

    createEvaluation.mutate({
      evaluation: {
        employee_name: profile.full_name || '',
        department: profile.department || '',
        unit: profile.unit || '',
        job_title: profile.job_title || '',
        longevity: generalInfo.longevity,
        qualification: generalInfo.qualification,
        marital_status: generalInfo.maritalStatus,
        evaluation_year: 2024,
        is_sales_staff: isSalesStaff,
        career_path_preferences: additional.careerPathPreferences,
        training_needs: additional.trainingNeeds,
        areas_for_improvement: additional.areasForImprovement,
        proposed_action_plan: additional.proposedActionPlan,
        employee_comments: additional.employeeComments,
        status: 'submitted',
        total_score: runningScore,
        classification,
        submitted_at: new Date().toISOString(),
      },
      kpis: allKpis,
    }, {
      onSuccess: () => {
        toast.success('Evaluation submitted successfully');
        navigate('/dashboard');
      },
      onError: (err: any) => {
        toast.error(err.message || 'Failed to submit evaluation');
      },
    });
  };

  const stepComponents = [
    <GeneralInfoStep key="general" user={mockUser} generalInfo={generalInfo} setGeneralInfo={setGeneralInfo} isSalesStaff={isSalesStaff} setIsSalesStaff={setIsSalesStaff} />,
    <PrimaryA1Step key="a1" entries={primaryA1} setEntries={setPrimaryA1} isSalesStaff={isSalesStaff} />,
    <PrimaryA2Step key="a2" entries={primaryA2} setEntries={setPrimaryA2} isSalesStaff={isSalesStaff} />,
    <SecondaryStep key="sec" entries={secondaryKPIs} setEntries={setSecondaryKPIs} />,
    <GenericStep key="gen" entries={genericKPIs} setEntries={setGenericKPIs} />,
    <AdditionalStep key="add" additional={additional} setAdditional={setAdditional} />,
    <FinalizeStep key="final" primaryA1={primaryA1} primaryA2={primaryA2} secondaryKPIs={secondaryKPIs} genericKPIs={genericKPIs} isSalesStaff={isSalesStaff} totalScore={runningScore} classification={classification} />,
  ];

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        <EvaluationWizardSidebar currentStep={currentStep} onStepClick={setCurrentStep} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <StickyScoreHeader score={runningScore} classification={classification} lastSaved={lastSaved} onSaveDraft={handleSaveDraft} />

          <div className="flex-1 overflow-auto pr-2">
            <motion.div key={currentStep} variants={fadeIn} initial="hidden" animate="visible">
              {stepComponents[currentStep]}
            </motion.div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground transition-mechanical hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <div className="flex gap-2">
              <button onClick={handleSaveDraft} className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-mechanical hover:bg-secondary">
                Save Draft
              </button>

              {currentStep < WIZARD_STEPS.length - 1 ? (
                <button onClick={() => setCurrentStep(currentStep + 1)} className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-mechanical hover:bg-primary/90">
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={createEvaluation.isPending}
                  className="rounded-sm bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-mechanical hover:bg-success/90 disabled:opacity-50"
                >
                  {createEvaluation.isPending ? 'Submitting...' : 'Submit Evaluation'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
