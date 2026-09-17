export function formatVND(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')} ₫`;
}
export function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: digits });
}
export function formatDate(value: string): string {
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}
export function calcLayRate(eggs: number, hens: number): number {
  return hens > 0 ? (eggs / hens) * 100 : 0;
}
export function today(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}-${parts.find((p) => p.type === 'day')!.value}`;
}
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const end = new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
  return { start: `${month}-01`, end };
}
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function startOfWeek(date: string): string {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}
export function daysBetween(start: string, end: string): number {
  return (
    Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1
  );
}
export function dateSeries(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(end, i - count + 1));
}
export function parseDisplayDate(raw: string, allowFuture = false): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw.trim());
  if (!match) throw new Error('Nhập ngày theo DD/MM/YYYY.');
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  assertDate(iso, allowFuture);
  return iso;
}
export function assertDate(iso: string, allowFuture = false): void {
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(iso) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== iso ||
    iso < '2000-01-01'
  )
    throw new Error('Ngày không hợp lệ (từ năm 2000).');
  if (!allowFuture && iso > today()) throw new Error('Không ghi phát sinh vào ngày tương lai.');
}
export function numberInput(raw: string, label: string, integer = false, zero = false): number {
  const value = raw.trim().replace(/\s/g, '').replace(/,/g, '.');
  if (!/^\d+(\.\d+)?$/.test(value))
    throw new Error(`${label}: nhập số không có dấu phân cách hàng nghìn.`);
  const n = Number(value);
  assertNumber(n, label, integer, zero);
  return n;
}
export function assertNumber(n: number, label: string, integer = false, zero = false): void {
  if (
    !Number.isFinite(n) ||
    n > 1e12 ||
    n < 0 ||
    (!zero && n === 0) ||
    (integer && !Number.isSafeInteger(n))
  )
    throw new Error(
      `${label} phải là số ${integer ? 'nguyên ' : ''}${zero ? 'không âm' : 'lớn hơn 0'} hợp lệ.`,
    );
}
export function required(raw: string, label: string): string {
  const value = raw.trim();
  if (!value) throw new Error(`Vui lòng nhập ${label.toLowerCase()}.`);
  if (value.length > 200) throw new Error(`${label} tối đa 200 ký tự.`);
  return value;
}
