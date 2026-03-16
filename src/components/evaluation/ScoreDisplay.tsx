import { getClassification, getClassificationColor } from '@/types/evaluation';
import { cn } from '@/lib/utils';

export function ScoreDisplay({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  const classification = getClassification(score);
  const colorClass = getClassificationColor(classification);

  return (
    <span className={cn('text-data font-semibold', colorClass, size === 'lg' ? 'text-2xl' : 'text-sm')}>
      {score}
    </span>
  );
}
