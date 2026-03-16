import { WIZARD_STEPS } from '@/types/evaluation';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Props {
  currentStep: number;
  onStepClick: (index: number) => void;
}

export function EvaluationWizardSidebar({ currentStep, onStepClick }: Props) {
  return (
    <div className="w-52 flex-shrink-0">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Evaluation Steps
      </p>
      <nav className="space-y-1">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <button
              key={step.id}
              onClick={() => onStepClick(index)}
              className={cn(
                'flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-mechanical',
                isCurrent && 'bg-primary/10 border border-primary/20',
                !isCurrent && 'hover:bg-secondary'
              )}
            >
              <div
                className={cn(
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold',
                  isCompleted && 'bg-success text-success-foreground',
                  isCurrent && 'bg-primary text-primary-foreground',
                  !isCompleted && !isCurrent && 'bg-secondary text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
              </div>
              <div>
                <p className={cn(
                  'text-xs font-medium',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{step.description}</p>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
