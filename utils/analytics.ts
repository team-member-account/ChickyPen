import type { Snapshot, Flock, Vaccine } from '@/types';
import { addDays, dateSeries, daysBetween, monthRange, today } from './format';
export function flockCount(s: Snapshot, id: number, date = today()): number {
  return s.movements
    .filter((m) => m.flock_id === id && m.date <= date)
    .reduce((n, m) => n + (['initial', 'add'].includes(m.kind) ? m.quantity : -m.quantity), 0);
}
export function totalBirds(s: Snapshot, date = today()): number {
  return s.flocks.reduce((n, f) => n + flockCount(s, f.id, date), 0);
}
export function stock(s: Snapshot, id: number, date = today()): number {
  return Math.max(
    0,
    Math.round(
      s.feedEntries
        .filter((e) => e.feed_id === id && e.date <= date)
        .reduce((n, e) => n + (e.kind === 'purchase' ? e.quantity : -e.quantity), 0) * 1000000,
    ) / 1000000,
  );
}
export function eggTotal(s: Snapshot, start: string, end: string, flockId?: number): number {
  return s.eggs
    .filter((e) => e.date >= start && e.date <= end && (!flockId || e.flock_id === flockId))
    .reduce((n, e) => n + e.quantity, 0);
}
export function eggSeries(s: Snapshot, days: number, flockId?: number) {
  return dateSeries(today(), days).map((date) => ({
    date,
    value: eggTotal(s, date, date, flockId),
  }));
}
export function financialSummary(s: Snapshot, month: string) {
  const { start, end } = monthRange(month);
  const entries = s.finances.filter((f) => f.date >= start && f.date <= end);
  const income = entries.filter((f) => f.kind === 'income').reduce((n, f) => n + f.amount, 0);
  const expense = entries.filter((f) => f.kind === 'expense').reduce((n, f) => n + f.amount, 0);
  return { income, expense, profit: income - expense, entries };
}
export interface DueVaccine {
  vaccine: Vaccine;
  flock: Flock;
  booster: boolean;
  date: string;
}
export function pendingVaccines(s: Snapshot): DueVaccine[] {
  return s.vaccines
    .flatMap((v) => {
      const f = s.flocks.find((f) => f.id === v.flock_id);
      if (!f || f.archived || f.status !== 'active') return [];
      const result: DueVaccine[] = [];
      if (!v.done) result.push({ vaccine: v, flock: f, booster: false, date: v.due_date });
      if (v.booster_date && !v.booster_done)
        result.push({ vaccine: v, flock: f, booster: true, date: v.booster_date });
      return result;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function monthlyReport(s: Snapshot, month: string) {
  const { start, end } = monthRange(month);
  const until = end > today() ? today() : end;
  const opening = totalBirds(s, addDays(start, -1));
  const moves = s.movements.filter((m) => m.date >= start && m.date <= until);
  const added = moves
    .filter((m) => m.kind === 'initial' || m.kind === 'add')
    .reduce((n, m) => n + m.quantity, 0);
  const sold = moves.filter((m) => m.kind === 'sale').reduce((n, m) => n + m.quantity, 0);
  const deaths = moves.filter((m) => m.kind === 'death').reduce((n, m) => n + m.quantity, 0);
  const denominator = opening + added;
  const eggs = eggTotal(s, start, until);
  return {
    start,
    until,
    opening,
    added,
    sold,
    deaths,
    closing: totalBirds(s, until),
    mortality: denominator ? (deaths / denominator) * 100 : 0,
    eggs,
    average: eggs / Math.max(1, daysBetween(start, until)),
    ...financialSummary(s, month),
  };
}
