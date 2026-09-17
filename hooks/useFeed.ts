import { useFarm } from '@/providers/FarmProvider';
import { stock } from '@/utils/analytics';
export function useFeed() {
  const { data, ...rest } = useFarm();
  return {
    ...rest,
    feeds: data.feeds.map((f) => ({ ...f, stock: stock(data, f.id) })),
    entries: data.feedEntries,
  };
}
