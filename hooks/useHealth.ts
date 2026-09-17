import { useFarm } from '@/providers/FarmProvider';
import { pendingVaccines } from '@/utils/analytics';
export function useHealth() {
  const { data, ...rest } = useFarm();
  return {
    ...rest,
    vaccines: data.vaccines,
    deaths: data.movements.filter((m) => m.kind === 'death'),
    pending: pendingVaccines(data),
  };
}
