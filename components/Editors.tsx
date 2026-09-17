import React from 'react';
import { FormModal, type Field, type Option } from './ui';
import { useFarm } from '@/providers/FarmProvider';
import * as q from '@/db/queries';
import type {
  Flock,
  FlockType,
  Movement,
  MovementKind,
  Egg,
  Feed,
  FeedEntry,
  Vaccine,
  Finance,
  MoneyKind,
} from '@/types';
import {
  deathReasons,
  expenseCategories,
  flockTypes,
  incomeCategories,
} from '@/constants/categories';
import { formatDate, numberInput, parseDisplayDate, today } from '@/utils/format';
const val = (v: Record<string, string>, key: string) => v[key] ?? '';
const options = (values: string[]): Option[] => values.map((v) => ({ value: v, label: v }));
const dateField: Field = { key: 'date', label: 'Ngày', type: 'date' };
const noteField: Field = { key: 'notes', label: 'Ghi chú', type: 'notes' };
const qtyField: Field = {
  key: 'quantity',
  label: 'Số lượng',
  type: 'number',
  hint: 'Không dùng dấu phân cách hàng nghìn.',
};
function useFlockOptions(layerOnly = false) {
  const { data } = useFarm();
  return data.flocks
    .filter((f) => !f.archived && f.status === 'active' && (!layerOnly || f.type === 'layer'))
    .map((f) => ({ value: String(f.id), label: f.name }));
}
export function FlockEditor({ flock, onClose }: { flock?: Flock; onClose: () => void }) {
  const { mutate } = useFarm();
  return (
    <FormModal
      title={flock ? 'Sửa thông tin lô' : 'Thêm lô gà'}
      onClose={onClose}
      fields={[
        { key: 'name', label: 'Tên lô' },
        { key: 'breed', label: 'Giống gà' },
        {
          key: 'type',
          label: 'Loại gà',
          type: 'choice',
          options: Object.entries(flockTypes).map(([value, label]) => ({ value, label })),
        },
        { key: 'entry_date', label: 'Ngày nhập đàn', type: 'date' },
        { key: 'initial_count', label: 'Số gà ban đầu', type: 'number' },
        noteField,
      ]}
      initial={{
        name: flock?.name ?? '',
        breed: flock?.breed ?? '',
        type: flock?.type ?? 'layer',
        entry_date: formatDate(flock?.entry_date ?? today()),
        initial_count: flock ? String(flock.initial_count) : '',
        notes: flock?.notes ?? '',
      }}
      footer="Nhập đàn chỉ cập nhật số lượng. Tiền mua con giống được ghi riêng tại Thu chi."
      onSave={(v) =>
        mutate('Lưu lô gà', (tx) =>
          q.saveFlock(
            tx,
            {
              name: val(v, 'name'),
              breed: val(v, 'breed'),
              type: val(v, 'type') as FlockType,
              entry_date: parseDisplayDate(val(v, 'entry_date')),
              initial_count: numberInput(val(v, 'initial_count'), 'Số gà ban đầu', true),
              notes: val(v, 'notes'),
            },
            flock?.id,
          ),
        )
      }
    />
  );
}
export function MovementEditor({
  movement,
  flockId,
  deathOnly = false,
  onClose,
}: {
  movement?: Movement;
  flockId?: number;
  deathOnly?: boolean;
  onClose: () => void;
}) {
  const { mutate } = useFarm();
  const flockOptions = useFlockOptions();
  const reason = movement?.reason ?? '';
  const reasonBase = reason.split(' · ')[0] ?? 'Không rõ';
  const fields: Field[] = [
    {
      key: 'flock_id',
      label: 'Lô gà',
      type: 'choice',
      options: flockOptions,
      show: () => !flockId && !movement,
    },
    {
      key: 'kind',
      label: 'Thay đổi số lượng',
      type: 'choice',
      options: [
        { value: 'add', label: 'Nhập thêm' },
        { value: 'sale', label: 'Xuất bán' },
        { value: 'death', label: 'Gà chết' },
      ],
      show: () => !deathOnly,
    },
    qtyField,
    dateField,
    {
      key: 'death_reason',
      label: 'Nguyên nhân',
      type: 'choice',
      options: options(deathReasons),
      show: (v) => v.kind === 'death',
    },
    { key: 'reason', label: 'Lý do / ghi chú', type: 'notes' },
    {
      key: 'amount',
      label: 'Doanh thu bán gà (₫)',
      type: 'number',
      hint: 'Nhập tổng tiền, không có dấu phân cách. Để 0 nếu chưa ghi doanh thu.',
      show: (v) => v.kind === 'sale',
    },
  ];
  return (
    <FormModal
      title={deathOnly ? 'Ghi nhận gà chết' : movement ? 'Sửa biến động đàn' : 'Cập nhật số gà'}
      onClose={onClose}
      fields={fields}
      initial={{
        flock_id: String(movement?.flock_id ?? flockId ?? flockOptions[0]?.value ?? ''),
        kind: deathOnly ? 'death' : (movement?.kind ?? 'add'),
        quantity: movement ? String(movement.quantity) : '',
        date: formatDate(movement?.date ?? today()),
        reason: movement?.kind === 'death' ? reason.split(' · ').slice(1).join(' · ') : reason,
        death_reason: deathReasons.includes(reasonBase) ? reasonBase : 'Không rõ',
        amount: String(movement?.amount ?? 0),
      }}
      footer="Số gà chết chỉ được ghi một lần, đồng thời cập nhật đàn và sổ sức khỏe. Xuất bán có doanh thu sẽ tự tạo khoản thu."
      onSave={(v) => {
        const kind = val(v, 'kind') as MovementKind;
        return mutate('Lưu biến động đàn', (tx) =>
          q.saveMovement(
            tx,
            {
              flock_id: numberInput(val(v, 'flock_id'), 'Lô gà', true),
              kind,
              quantity: numberInput(val(v, 'quantity'), 'Số gà', true),
              date: parseDisplayDate(val(v, 'date')),
              reason:
                kind === 'death'
                  ? [val(v, 'death_reason'), val(v, 'reason').trim()].filter(Boolean).join(' · ')
                  : val(v, 'reason').trim() || (kind === 'sale' ? 'Xuất bán' : 'Nhập thêm'),
              amount: kind === 'sale' ? numberInput(val(v, 'amount'), 'Doanh thu', true, true) : 0,
            },
            movement?.id,
          ),
        );
      }}
    />
  );
}
export function EggEditor({ egg, onClose }: { egg?: Egg; onClose: () => void }) {
  const { mutate } = useFarm();
  const flockOptions = useFlockOptions(true);
  return (
    <FormModal
      title={egg ? 'Sửa sản lượng trứng' : 'Ghi trứng hôm nay'}
      onClose={onClose}
      fields={[
        { key: 'flock_id', label: 'Lô gà đẻ', type: 'choice', options: flockOptions },
        dateField,
        { ...qtyField, label: 'Số trứng (quả)' },
        noteField,
      ]}
      initial={{
        flock_id: String(egg?.flock_id ?? flockOptions[0]?.value ?? ''),
        date: formatDate(egg?.date ?? today()),
        quantity: egg ? String(egg.quantity) : '',
        notes: egg?.notes ?? '',
      }}
      footer="Mỗi lô chỉ ghi một lần mỗi ngày. Tỷ lệ đẻ dùng số gà còn lại của lô vào cuối ngày ghi nhận."
      onSave={(v) =>
        mutate('Lưu trứng', (tx) =>
          q.saveEgg(
            tx,
            {
              flock_id: numberInput(val(v, 'flock_id'), 'Lô gà đẻ', true),
              date: parseDisplayDate(val(v, 'date')),
              quantity: numberInput(val(v, 'quantity'), 'Số trứng', true, true),
              notes: val(v, 'notes'),
            },
            egg?.id,
          ),
        )
      }
    />
  );
}
export function FeedEditor({ feed, onClose }: { feed?: Feed; onClose: () => void }) {
  const { mutate } = useFarm();
  return (
    <FormModal
      title={feed ? 'Sửa thức ăn' : 'Thêm thức ăn'}
      onClose={onClose}
      fields={[
        { key: 'name', label: 'Tên thức ăn' },
        { key: 'unit', label: 'Đơn vị', type: 'choice', options: options(['kg', 'túi', 'bao']) },
        {
          key: 'threshold',
          label: 'Cảnh báo khi tồn kho dưới',
          type: 'number',
          hint: 'Theo đơn vị đã chọn. Đặt 0 để chỉ cảnh báo khi hết kho.',
        },
      ]}
      initial={{
        name: feed?.name ?? '',
        unit: feed?.unit ?? 'kg',
        threshold: String(feed?.threshold ?? 10),
      }}
      onSave={(v) =>
        mutate('Lưu thức ăn', (tx) =>
          q.saveFeed(
            tx,
            {
              name: val(v, 'name'),
              unit: val(v, 'unit') as Feed['unit'],
              threshold: numberInput(val(v, 'threshold'), 'Ngưỡng cảnh báo', false, true),
            },
            feed?.id,
          ),
        )
      }
    />
  );
}
export function FeedEntryEditor({
  entry,
  feedId,
  kind = 'purchase',
  onClose,
}: {
  entry?: FeedEntry;
  feedId?: number;
  kind?: FeedEntry['kind'];
  onClose: () => void;
}) {
  const { data, mutate } = useFarm();
  const flockOptions = useFlockOptions();
  return (
    <FormModal
      title={
        entry
          ? 'Sửa phát sinh kho'
          : kind === 'purchase'
            ? 'Nhập kho thức ăn'
            : 'Ghi tiêu thụ thức ăn'
      }
      onClose={onClose}
      fields={[
        {
          key: 'feed_id',
          label: 'Thức ăn',
          type: 'choice',
          options: data.feeds.map((f) => ({ value: String(f.id), label: `${f.name} (${f.unit})` })),
        },
        {
          key: 'kind',
          label: 'Loại phát sinh',
          type: 'choice',
          options: [
            { value: 'purchase', label: 'Nhập kho' },
            { value: 'consume', label: 'Tiêu thụ' },
          ],
        },
        qtyField,
        {
          key: 'unit_price',
          label: 'Đơn giá (₫ / đơn vị)',
          type: 'number',
          show: (v) => v.kind === 'purchase',
        },
        {
          key: 'flock_id',
          label: 'Sử dụng cho',
          type: 'choice',
          options: [{ value: '', label: 'Toàn trại' }, ...flockOptions],
          show: (v) => v.kind === 'consume',
        },
        dateField,
        noteField,
      ]}
      initial={{
        feed_id: String(entry?.feed_id ?? feedId ?? data.feeds[0]?.id ?? ''),
        flock_id: entry?.flock_id ? String(entry.flock_id) : '',
        kind: entry?.kind ?? kind,
        quantity: entry ? String(entry.quantity) : '',
        unit_price: String(entry?.unit_price ?? 0),
        date: formatDate(entry?.date ?? today()),
        notes: entry?.notes ?? '',
      }}
      footer="Số lượng nhận số thập phân (ví dụ 2,5). Chi phí nhập kho = số lượng × đơn giá, làm tròn đến đồng và tự ghi vào Thu chi."
      onSave={(v) =>
        mutate('Lưu phát sinh kho', (tx) =>
          q.saveFeedEntry(
            tx,
            {
              feed_id: numberInput(val(v, 'feed_id'), 'Thức ăn', true),
              flock_id:
                val(v, 'kind') === 'consume' && val(v, 'flock_id')
                  ? numberInput(val(v, 'flock_id'), 'Lô gà', true)
                  : null,
              kind: val(v, 'kind') as FeedEntry['kind'],
              quantity: numberInput(val(v, 'quantity'), 'Số lượng'),
              unit_price:
                val(v, 'kind') === 'purchase'
                  ? numberInput(val(v, 'unit_price'), 'Đơn giá', true, true)
                  : 0,
              date: parseDisplayDate(val(v, 'date')),
              notes: val(v, 'notes'),
            },
            entry?.id,
          ),
        )
      }
    />
  );
}
export function VaccineEditor({ vaccine, onClose }: { vaccine?: Vaccine; onClose: () => void }) {
  const { mutate, enableNotifications } = useFarm();
  const flockOptions = useFlockOptions();
  return (
    <FormModal
      title={vaccine ? 'Sửa lịch tiêm' : 'Thêm lịch vaccine'}
      onClose={onClose}
      fields={[
        { key: 'name', label: 'Tên vaccine' },
        { key: 'flock_id', label: 'Lô gà', type: 'choice', options: flockOptions },
        { key: 'due_date', label: 'Ngày tiêm', type: 'date' },
        { key: 'booster_date', label: 'Ngày tiêm nhắc lại (không bắt buộc)', type: 'date' },
        noteField,
      ]}
      initial={{
        name: vaccine?.name ?? '',
        flock_id: String(vaccine?.flock_id ?? flockOptions[0]?.value ?? ''),
        due_date: formatDate(vaccine?.due_date ?? today()),
        booster_date: vaccine?.booster_date ? formatDate(vaccine.booster_date) : '',
        notes: vaccine?.notes ?? '',
      }}
      footer="Nhắc lúc 08:00 giờ Việt Nam, trước mỗi mũi tiêm một ngày. Nếu giờ nhắc đã qua, lịch vẫn hiển thị trong ứng dụng."
      onSave={async (v) => {
        await mutate('Lưu lịch vaccine', (tx) =>
          q.saveVaccine(
            tx,
            {
              name: val(v, 'name'),
              flock_id: numberInput(val(v, 'flock_id'), 'Lô gà', true),
              due_date: parseDisplayDate(val(v, 'due_date'), true),
              booster_date: val(v, 'booster_date').trim()
                ? parseDisplayDate(val(v, 'booster_date'), true)
                : null,
              notes: val(v, 'notes'),
            },
            vaccine?.id,
          ),
        );
        await enableNotifications();
      }}
    />
  );
}
export function FinanceEditor({ entry, onClose }: { entry?: Finance; onClose: () => void }) {
  const { mutate } = useFarm();
  return (
    <FormModal
      title={entry ? 'Sửa thu chi' : 'Thêm khoản thu chi'}
      onClose={onClose}
      fields={[
        {
          key: 'kind',
          label: 'Loại giao dịch',
          type: 'choice',
          options: [
            { value: 'expense', label: 'Khoản chi' },
            { value: 'income', label: 'Khoản thu' },
          ],
        },
        {
          key: 'expense_category',
          label: 'Danh mục chi',
          type: 'choice',
          options: options(expenseCategories),
          show: (v) => v.kind === 'expense',
        },
        {
          key: 'income_category',
          label: 'Danh mục thu',
          type: 'choice',
          options: options(incomeCategories),
          show: (v) => v.kind === 'income',
        },
        {
          key: 'amount',
          label: 'Số tiền (₫)',
          type: 'number',
          hint: 'Ví dụ: 1500000 để ghi 1.500.000 ₫.',
        },
        dateField,
        noteField,
      ]}
      initial={{
        kind: entry?.kind ?? 'expense',
        expense_category: entry?.kind === 'expense' ? entry.category : 'Khác',
        income_category: entry?.kind === 'income' ? entry.category : 'Khác',
        amount: entry ? String(entry.amount) : '',
        date: formatDate(entry?.date ?? today()),
        notes: entry?.notes ?? '',
      }}
      footer="Thức ăn nhập kho và gà xuất bán có tiền đã được ghi tự động. Không nhập lại những khoản này."
      onSave={(v) =>
        mutate('Lưu thu chi', (tx) =>
          q.saveFinance(
            tx,
            {
              kind: val(v, 'kind') as MoneyKind,
              category: val(
                v,
                val(v, 'kind') === 'income' ? 'income_category' : 'expense_category',
              ),
              amount: numberInput(val(v, 'amount'), 'Số tiền', true),
              date: parseDisplayDate(val(v, 'date')),
              notes: val(v, 'notes'),
            },
            entry?.id,
          ),
        )
      }
    />
  );
}
