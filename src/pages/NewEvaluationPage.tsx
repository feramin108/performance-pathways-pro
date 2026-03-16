import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useEvaluationStore } from '@/store/evaluationStore';
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
  const { currentUser } = useAuthStore();
  const { createEvaluation, addAuditEntry } = useEvaluationStore();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSalesStaff, setIsSalesStaff] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Form state
  const [generalInfo, setGeneralInfo] = useState({
    longevity: currentUser?.longevity || '',
    qualification: currentUser?.qualification || '',
    maritalStatus: currentUser?.maritalStatus || '',
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

  // Calculate running score
  const tempForm = {
    isSalesStaff,
    primaryA1,
    primaryA2,
    secondaryKPIs,
    genericKPIs,
  } as any;
  const runningScore = calculateWeightedScore(tempForm);
  const classification = getClassification(runningScore);

  const handleSaveDraft = () => {
    setLastSaved(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    toast.success('Draft saved successfully');
  };

  const handleSubmit = () => {
    if (!currentUser) return;

    // Validation
    if (primaryA1.length < 5) {
      toast.error('Primary KPI A1 requires at least 5 entries');
      return;
    }
    if (primaryA1.some(k => !k.title.trim())) {
      toast.error('All Primary A1 KPIs must have titles');
      return;
    }

    const id = createEvaluation({
      employeeId: currentUser.id,
      employeeName: currentUser.fullName,
      department: currentUser.department,
      unit: currentUser.unit,
      jobTitle: currentUser.jobTitle,
      longevity: generalInfo.longevity,
      qualification: generalInfo.qualification,
      maritalStatus: generalInfo.maritalStatus,
      evaluationYear: 2024,
      isSalesStaff,
      primaryA1,
      primaryA2,
      secondaryKPIs,
      genericKPIs,
      ...additional,
      managerRemarks: '',
      hrRemarks: '',
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    });

    addAuditEntry({
      evaluationId: id,
      action: 'Submitted',
      performedBy: currentUser.fullName,
      performedByRole: currentUser.role,
      timestamp: new Date().toISOString(),
      details: 'Evaluation submitted for manager review',
      ipAddress: '10.0.1.45',
    });

    toast.success('Evaluation submitted successfully');
    navigate('/dashboard');
  };

  const stepComponents = [
    <GeneralInfoStep
      key="general"
      user={currentUser!}
      generalInfo={generalInfo}
      setGeneralInfo={setGeneralInfo}
      isSalesStaff={isSalesStaff}
      setIsSalesStaff={setIsSalesStaff}
    />,
    <PrimaryA1Step key="a1" entries={primaryA1} setEntries={setPrimaryA1} isSalesStaff={isSalesStaff} />,
    <PrimaryA2Step key="a2" entries={primaryA2} setEntries={setPrimaryA2} isSalesStaff={isSalesStaff} />,
    <SecondaryStep key="sec" entries={secondaryKPIs} setEntries={setSecondaryKPIs} />,
    <GenericStep key="gen" entries={genericKPIs} setEntries={setGenericKPIs} />,
    <AdditionalStep key="add" additional={additional} setAdditional={setAdditional} />,
    <FinalizeStep
      key="final"
      primaryA1={primaryA1}
      primaryA2={primaryA2}
      secondaryKPIs={secondaryKPIs}
      genericKPIs={genericKPIs}
      isSalesStaff={isSalesStaff}
      totalScore={runningScore}
      classification={classification}
    />,
  ];

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        {/* Sidebar Stepper */}
        <EvaluationWizardSidebar
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <StickyScoreHeader
            score={runningScore}
            classification={classification}
            lastSaved={lastSaved}
            onSaveDraft={handleSaveDraft}
          />

          <div className="flex-1 overflow-auto pr-2">
            <motion.div
              key={currentStep}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              {stepComponents[currentStep]}
            </motion.div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground transition-mechanical hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleSaveDraft}
                className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-mechanical hover:bg-secondary"
              >
                Save Draft
              </button>

              {currentStep < WIZARD_STEPS.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-mechanical hover:bg-primary/90"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="rounded-sm bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-mechanical hover:bg-success/90"
                >
                  Submit Evaluation
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
