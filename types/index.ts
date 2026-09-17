export type FlockType = 'meat' | 'layer' | 'breeder';
export type MovementKind = 'initial' | 'add' | 'sale' | 'death';
export type MoneyKind = 'income' | 'expense';
export interface Flock {
  id: number;
  name: string;
  breed: string;
  type: FlockType;
  entry_date: string;
  initial_count: number;
  notes: string;
  status: 'active' | 'sold';
  archived: number;
}
export interface Movement {
  id: number;
  flock_id: number;
  kind: MovementKind;
  quantity: number;
  date: string;
  reason: string;
  amount: number;
}
export interface Egg {
  id: number;
  flock_id: number;
  date: string;
  quantity: number;
  notes: string;
}
export interface Feed {
  id: number;
  name: string;
  unit: 'kg' | 'túi' | 'bao';
  threshold: number;
}
export interface FeedEntry {
  id: number;
  feed_id: number;
  flock_id: number | null;
  kind: 'purchase' | 'consume';
  quantity: number;
  unit_price: number;
  date: string;
  notes: string;
}
export interface Vaccine {
  id: number;
  flock_id: number;
  name: string;
  due_date: string;
  booster_date: string | null;
  done: number;
  booster_done: number;
  completed_date: string | null;
  booster_completed_date: string | null;
  notes: string;
}
export interface Finance {
  id: number;
  kind: MoneyKind;
  category: string;
  amount: number;
  date: string;
  notes: string;
  source_type: 'feed' | 'movement' | null;
  source_id: number | null;
}
export interface Snapshot {
  flocks: Flock[];
  movements: Movement[];
  eggs: Egg[];
  feeds: Feed[];
  feedEntries: FeedEntry[];
  vaccines: Vaccine[];
  finances: Finance[];
}
export const emptySnapshot: Snapshot = {
  flocks: [],
  movements: [],
  eggs: [],
  feeds: [],
  feedEntries: [],
  vaccines: [],
  finances: [],
};
export type FlockInput = Omit<Flock, 'id' | 'status' | 'archived'>;
export type MovementInput = Omit<Movement, 'id'>;
export type EggInput = Omit<Egg, 'id'>;
export type FeedInput = Omit<Feed, 'id'>;
export type FeedEntryInput = Omit<FeedEntry, 'id'>;
export type VaccineInput = Pick<
  Vaccine,
  'name' | 'flock_id' | 'due_date' | 'booster_date' | 'notes'
>;
export type FinanceInput = Pick<Finance, 'kind' | 'category' | 'amount' | 'date' | 'notes'>;
