import { useFarm } from '@/providers/FarmProvider';
import { financialSummary } from '@/utils/analytics';
export function useFinance(month: string) {
  const { data, ...rest } = useFarm();
  return { ...rest, ...financialSummary(data, month) };
}
