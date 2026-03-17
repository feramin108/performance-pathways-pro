import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const STEPS = [
  'General Info',
  'Primary KPIs (A1)',
  'WIG (A2)',
  'Secondary KPIs',
  'Generic KPIs',
  'Additional',
  'Review & Submit',
];

interface WizardStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function WizardStepper({ currentStep, onStepClick }: WizardStepperProps) {
  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {STEPS.map((label, idx) => {
          const step = idx + 1;
          const completed = step < currentStep;
          const active = step === currentStep;
          
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => onStepClick?.(step)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-fast',
                  completed && 'bg-primary text-primary-foreground',
                  active && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !completed && !active && 'bg-card border border-border text-muted-foreground',
                )}>
                  {completed ? <Check className="h-3.5 w-3.5" /> : step}
                </div>
                <span className={cn(
                  'text-[11px] hidden lg:block',
                  active ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}>
                  {label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  'flex-1 h-px mx-2',
                  completed ? 'bg-primary' : 'bg-border',
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
