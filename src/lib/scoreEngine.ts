// Pure utility: KPI score calculation engine

export interface KPIEntry {
  category: string;
  employee_rating: number | null;
  manager_rating?: number | null;
  sort_order?: number | null;
}

export interface CategoryScore {
  sum: number;
  count: number;
  scoreOn100: number;
  weighted: number;
}

export interface A2Score {
  rating: number;
  scoreOn100: number;
  weighted: number;
}

export interface ScoreResult {
  a1: CategoryScore;
  a2: A2Score;
  secondary: CategoryScore;
  generic: CategoryScore;
  a1a2Combined: { scoreOn100: number; weighted: number };
  finalScore: number;
  classification: string;
  classificationColor: string;
}

const WEIGHTS_NON_SALES = { a1: 0.60, a2: 0.15, sec: 0.10, gen: 0.15 };
const WEIGHTS_SALES = { a1: 0.50, a2: 0.25, sec: 0.10, gen: 0.15 };

export function getClassification(score: number): { label: string; color: string } {
  if (score <= 35) return { label: 'Very Poor', color: '#ef4444' };
  if (score <= 49) return { label: 'Poor', color: '#f97316' };
  if (score <= 65) return { label: 'Fairly Good', color: '#eab308' };
  if (score <= 80) return { label: 'Good', color: '#3b82f6' };
  if (score <= 95) return { label: 'Excellent', color: '#a855f7' };
  return { label: 'Exceptional', color: '#f59e0b' };
}

export function getClassificationBg(label: string): string {
  switch (label) {
    case 'Very Poor': return 'bg-[#7c2d12] text-[#fca5a5]';
    case 'Poor': return 'bg-[#7c2d12] text-[#fed7aa]';
    case 'Fairly Good': return 'bg-[#78350f] text-[#fde68a]';
    case 'Good': return 'bg-role-employee-bg text-role-employee-text';
    case 'Excellent': return 'bg-[#3b0764] text-[#d8b4fe]';
    case 'Exceptional': return 'bg-[#14532d] text-[#86efac]';
    default: return 'bg-card text-muted-foreground';
  }
}

function calcCategory(entries: KPIEntry[], useManager = false): CategoryScore {
  const rated = entries.filter(e => {
    const r = useManager ? e.manager_rating : e.employee_rating;
    return r != null && r >= 0;
  });
  const sum = rated.reduce((s, e) => s + ((useManager ? e.manager_rating : e.employee_rating) || 0), 0);
  const count = rated.length;
  const scoreOn100 = count > 0 ? (sum / (count * 5)) * 100 : 0;
  return { sum, count, scoreOn100, weighted: 0 };
}

export function calculateScores(
  kpiEntries: KPIEntry[],
  employeeType: string = 'non_sales',
  useManagerRatings = false,
): ScoreResult {
  const w = employeeType === 'sales' ? WEIGHTS_SALES : WEIGHTS_NON_SALES;

  const a1Entries = kpiEntries.filter(e => e.category === 'A1');
  const a2Entries = kpiEntries.filter(e => e.category === 'A2_WIG');
  const secEntries = kpiEntries.filter(e => e.category === 'secondary');
  const genEntries = kpiEntries.filter(e => e.category === 'generic');

  const a1 = calcCategory(a1Entries, useManagerRatings);
  a1.weighted = a1.scoreOn100 * w.a1;

  const a2Rating = a2Entries.length > 0
    ? ((useManagerRatings ? a2Entries[0].manager_rating : a2Entries[0].employee_rating) || 0)
    : 0;
  const a2ScoreOn100 = (a2Rating / 5) * 100;
  const a2: A2Score = { rating: a2Rating, scoreOn100: a2ScoreOn100, weighted: a2ScoreOn100 * w.a2 };

  const sec = calcCategory(secEntries, useManagerRatings);
  sec.weighted = sec.scoreOn100 * w.sec;

  const gen = calcCategory(genEntries, useManagerRatings);
  gen.weighted = gen.scoreOn100 * w.gen;

  const a1a2ScoreOn100 = a1.count > 0 || a2Rating > 0
    ? ((a1.sum + a2Rating) / ((a1.count + (a2Rating > 0 ? 1 : 0)) * 5)) * 100
    : 0;
  const a1a2Combined = {
    scoreOn100: a1a2ScoreOn100,
    weighted: a1.weighted + a2.weighted,
  };

  const finalScore = Number((a1.weighted + a2.weighted + sec.weighted + gen.weighted).toFixed(2));
  const { label, color } = getClassification(finalScore);

  return {
    a1, a2, secondary: sec, generic: gen,
    a1a2Combined, finalScore,
    classification: label,
    classificationColor: color,
  };
}

export async function computeScoreHash(
  kpiEntries: KPIEntry[],
  finalScore: number,
): Promise<string> {
  const a1 = kpiEntries.filter(e => e.category === 'A1').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const a2 = kpiEntries.filter(e => e.category === 'A2_WIG');
  const sec = kpiEntries.filter(e => e.category === 'secondary').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const gen = kpiEntries.filter(e => e.category === 'generic').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const hashInput = [
    a1.map(e => e.employee_rating ?? 0).join('-'),
    a2.map(e => e.employee_rating ?? 0).join('-'),
    sec.map(e => e.employee_rating ?? 0).join('-'),
    gen.map(e => e.employee_rating ?? 0).join('-'),
    finalScore.toFixed(2),
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateMockAISummary(
  kpiEntries: KPIEntry[],
  finalScore: number,
  classification: string,
  careerPath: string[],
): string {
  const topKPIs = kpiEntries
    .filter(e => (e.employee_rating || 0) >= 4)
    .slice(0, 3);
  const lowKPIs = kpiEntries
    .filter(e => (e.employee_rating || 0) <= 2 && e.employee_rating != null)
    .slice(0, 2);
  
  const strengthLevel = finalScore >= 80 ? 'strong' : finalScore >= 65 ? 'moderate' : 'developing';
  
  let summary = `Based on the self-assessment, this employee demonstrates ${strengthLevel} performance across the evaluated KPIs.`;
  
  if (topKPIs.length > 0) {
    summary += ` Notable strengths include high ratings in key areas.`;
  }
  if (lowKPIs.length > 0) {
    summary += ` Areas identified for growth include lower-rated competencies.`;
  }
  
  summary += ` The overall score of ${finalScore.toFixed(2)} places this employee in the ${classification} band.`;
  
  if (careerPath.length > 0) {
    summary += ` Recommended focus: ${careerPath.slice(0, 3).join(', ')}.`;
  }
  
  return summary;
}
