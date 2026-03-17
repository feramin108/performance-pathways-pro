export type UserRole = 'employee' | 'manager' | 'hc';

export type EvaluationStatus =
  | 'draft'
  | 'submitted'
  | 'revision_requested'
  | 'first_manager_approved'
  | 'second_manager_review'
  | 'second_manager_approved'
  | 'sent_to_hc'
  | 'hc_validated'
  | 'archived';

export const RATING_LABELS: Record<number, string> = {
  0: 'Not Rated',
  1: 'Very Poor',
  2: 'Poor',
  3: 'Fairly Good',
  4: 'Good',
  5: 'Excellent',
};

export function getClassification(score: number): string {
  if (score >= 96) return 'Exceptional';
  if (score >= 81) return 'Excellent';
  if (score >= 66) return 'Good';
  if (score >= 50) return 'Fairly Good';
  if (score >= 36) return 'Poor';
  return 'Very Poor';
}

export function getClassificationColor(classification: string): string {
  switch (classification) {
    case 'Exceptional': return 'text-success';
    case 'Excellent': return 'text-success';
    case 'Good': return 'text-primary';
    case 'Fairly Good': return 'text-warning';
    case 'Poor': return 'text-destructive';
    case 'Very Poor': return 'text-destructive';
    default: return 'text-muted-foreground';
  }
}

export const STATUS_LABELS: Record<EvaluationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  revision_requested: 'Revision Requested',
  first_manager_approved: '1st Manager Approved',
  second_manager_review: '2nd Manager Review',
  second_manager_approved: '2nd Manager Approved',
  sent_to_hc: 'Sent to HC',
  hc_validated: 'HC Validated',
  archived: 'Archived',
};

export const WIZARD_STEPS = [
  { id: 'general', label: 'General', description: 'Employee Information' },
  { id: 'primary-a1', label: 'Primary A1', description: 'Main KPIs (60%/50%)' },
  { id: 'primary-a2', label: 'Primary A2', description: 'WIG Goal (15%/25%)' },
  { id: 'secondary', label: 'Secondary', description: 'Secondary KPIs (10%)' },
  { id: 'generic', label: 'Generic', description: 'Generic KPIs (15%)' },
  { id: 'additional', label: 'Additional', description: 'Career & Development' },
  { id: 'finalize', label: 'Finalize', description: 'Review & Submit' },
] as const;

// Score hash computation for tamper detection
export async function computeScoreHash(
  a1Ratings: number[],
  a2Ratings: number[],
  secRatings: number[],
  genRatings: number[],
  finalScore: number
): Promise<string> {
  const hashInput = [
    a1Ratings.join('-'),
    a2Ratings.join('-'),
    secRatings.join('-'),
    genRatings.join('-'),
    finalScore.toFixed(2),
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
