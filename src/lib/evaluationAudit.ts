import { supabase } from '@/integrations/supabase/client';

export async function getEvaluationStatus(evaluationId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('status')
    .eq('id', evaluationId)
    .single();

  if (error) throw error;

  return data?.status ?? null;
}
