interface Props {
  additional: {
    careerPathPreferences: string;
    trainingNeeds: string;
    areasForImprovement: string;
    proposedActionPlan: string;
    employeeComments: string;
  };
  setAdditional: (v: Props['additional']) => void;
}

export function AdditionalStep({ additional, setAdditional }: Props) {
  const update = (field: keyof Props['additional'], value: string) => {
    setAdditional({ ...additional, [field]: value });
  };

  const fields = [
    { key: 'careerPathPreferences' as const, label: 'Career Path Preferences', placeholder: 'e.g., Security Operations, Security Auditing...' },
    { key: 'trainingNeeds' as const, label: 'Training Needs', placeholder: 'e.g., Hardware Security Module training, IT Risk Management...' },
    { key: 'areasForImprovement' as const, label: 'Areas for Improvement', placeholder: 'Identify areas that require development...' },
    { key: 'proposedActionPlan' as const, label: 'Proposed Action Plan', placeholder: 'Detail specific actions to address improvement areas...' },
    { key: 'employeeComments' as const, label: 'Employee Comments', placeholder: 'Additional remarks or feedback...' },
  ];

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold tracking-tight">Additional Information</h2>
      <p className="mb-6 text-xs text-muted-foreground">
        Career development, training needs, and improvement areas.
      </p>

      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.key} className="surface-card p-4">
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {field.label}
            </label>
            <textarea
              value={additional[field.key]}
              onChange={e => update(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="input-inset w-full resize-none prose-constrained"
              rows={3}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
