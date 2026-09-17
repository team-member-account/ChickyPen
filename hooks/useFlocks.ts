import { useFarm } from '@/providers/FarmProvider';
import { flockCount } from '@/utils/analytics';
export function useFlocks() {
  const { data, ...rest } = useFarm();
  return {
    ...rest,
    flocks: data.flocks.map((f) => ({ ...f, count: flockCount(data, f.id) })),
    movements: data.movements,
  };
}
