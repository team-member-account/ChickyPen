import { useFarm } from '@/providers/FarmProvider';
import { eggSeries, eggTotal } from '@/utils/analytics';
import { daysBetween, monthRange, startOfWeek, today } from '@/utils/format';
export function useEggs(flockId?: number) {
  const { data, ...rest } = useFarm();
  const now = today();
  const start = monthRange(now.slice(0, 7)).start;
  const total = eggTotal(data, start, now, flockId);
  return {
    ...rest,
    eggs: data.eggs.filter((e) => !flockId || e.flock_id === flockId),
    week: eggTotal(data, startOfWeek(now), now, flockId),
    month: total,
    average: total / daysBetween(start, now),
    series: eggSeries(data, 30, flockId),
  };
}
