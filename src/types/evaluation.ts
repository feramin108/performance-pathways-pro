export type UserRole = 'employee' | 'manager' | 'hr' | 'admin';

export interface User {
  id: string;
  fullName: string;
  email: string;
  department: string;
  unit: string;
  jobTitle: string;
  managerId: string;
  managerName: string;
  role: UserRole;
  longevity: string;
  qualification: string;
  maritalStatus: string;
}

export interface KPIEntry {
  id: string;
  title: string;
  rating: number;
  comment: string;
}

export interface EvaluationForm {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  unit: string;
  jobTitle: string;
  longevity: string;
  qualification: string;
  maritalStatus: string;
  evaluationYear: number;
  isSalesStaff: boolean;

  primaryA1: KPIEntry[];
  primaryA2: KPIEntry[];
  secondaryKPIs: KPIEntry[];
  genericKPIs: KPIEntry[];

  careerPathPreferences: string;
  trainingNeeds: string;
  areasForImprovement: string;
  proposedActionPlan: string;
  employeeComments: string;
  managerRemarks: string;
  hrRemarks: string;

  status: EvaluationStatus;
  totalScore: number;
  classification: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
}

export type EvaluationStatus = 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'validated' | 'archived';

export interface AuditLogEntry {
  id: string;
  evaluationId: string;
  action: string;
  performedBy: string;
  performedByRole: UserRole;
  timestamp: string;
  details: string;
  ipAddress: string;
}

export const RATING_LABELS: Record<number, string> = {
  0: 'Very Poor',
  1: 'Poor',
  2: 'Fairly Good',
  3: 'Good',
  4: 'Excellent',
  5: 'Exceptional',
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

export function calculateCategoryScore(entries: KPIEntry[]): number {
  if (entries.length === 0) return 0;
  const total = entries.reduce((sum, e) => sum + e.rating, 0);
  return (total / (entries.length * 5)) * 100;
}

export function calculateWeightedScore(form: EvaluationForm): number {
  const a1Weight = form.isSalesStaff ? 0.50 : 0.60;
  const a2Weight = form.isSalesStaff ? 0.25 : 0.15;
  const secWeight = 0.10;
  const genWeight = 0.15;

  const a1Score = calculateCategoryScore(form.primaryA1);
  const a2Score = calculateCategoryScore(form.primaryA2);
  const secScore = calculateCategoryScore(form.secondaryKPIs);
  const genScore = calculateCategoryScore(form.genericKPIs);

  return Math.round(
    a1Score * a1Weight +
    a2Score * a2Weight +
    secScore * secWeight +
    genScore * genWeight
  );
}

export const WIZARD_STEPS = [
  { id: 'general', label: 'General', description: 'Employee Information' },
  { id: 'primary-a1', label: 'Primary A1', description: 'Main KPIs (60%/50%)' },
  { id: 'primary-a2', label: 'Primary A2', description: 'WIG Goal (15%/25%)' },
  { id: 'secondary', label: 'Secondary', description: 'Secondary KPIs (10%)' },
  { id: 'generic', label: 'Generic', description: 'Generic KPIs (15%)' },
  { id: 'additional', label: 'Additional', description: 'Career & Development' },
  { id: 'finalize', label: 'Finalize', description: 'Review & Submit' },
] as const;
