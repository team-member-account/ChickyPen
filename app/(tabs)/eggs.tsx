import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import {
  Screen,
  Card,
  Stat,
  Section,
  Empty,
  Action,
  Choice,
  MonthPicker,
  RowActions,
  confirmDelete,
  styles,
} from '@/components/ui';
import { EggEditor } from '@/components/Editors';
import { EggChart } from '@/components/Charts';
import { useFarm } from '@/providers/FarmProvider';
import { useEggs } from '@/hooks/useEggs';
import { deleteEgg } from '@/db/queries';
import { flockCount } from '@/utils/analytics';
import { calcLayRate, formatDate, formatNumber, today } from '@/utils/format';
import type { Egg } from '@/types';
export default function EggsScreen() {
  const { data, mutate, busy } = useFarm();
  const [selected, setSelected] = useState('');
  const [month, setMonth] = useState(today().slice(0, 7));
  const {
    eggs,
    week,
    month: monthTotal,
    average,
    series,
  } = useEggs(selected ? Number(selected) : undefined);
  const [editing, setEditing] = useState<Egg | 'new' | null>(null);
  const records = eggs.filter((e) => e.date.startsWith(month));
  const canAdd = data.flocks.some(
    (f) => f.type === 'layer' && f.status === 'active' && !f.archived,
  );
  return (
    <Screen title="Sổ trứng" subtitle="Ghi đều mỗi ngày, hiểu đàn hơn mỗi tuần">
      <Action label="Ghi sản lượng trứng" disabled={!canAdd} onPress={() => setEditing('new')} />
      {!canAdd && (
        <Empty
          text="Cần một lô gà đẻ đang nuôi."
          hint="Thêm lô có loại Gà đẻ trong mục Đàn gà."
          icon="egg-outline"
        />
      )}
      <Choice
        label="Thống kê theo lô"
        value={selected}
        onChange={setSelected}
        options={[
          { value: '', label: 'Tất cả lô gà đẻ' },
          ...data.flocks
            .filter((f) => f.type === 'layer')
            .map((f) => ({ value: String(f.id), label: f.name })),
        ]}
      />
      <View style={styles.grid}>
        <Stat label="Tuần này" value={formatNumber(week)} detail="quả · từ thứ Hai" />
        <Stat label="Tháng hiện tại" value={formatNumber(monthTotal)} detail="quả trứng" />
        <Stat
          label="Trung bình ngày"
          value={formatNumber(average, 1)}
          detail="từ đầu tháng đến hôm nay"
        />
      </View>
      <Section title="Xu hướng 30 ngày">
        <Card>
          <EggChart data={series} line />
        </Card>
      </Section>
      <Section title="Nhật ký sản lượng">
        <MonthPicker month={month} onChange={setMonth} />
        {!records.length ? (
          <Empty text="Chưa ghi trứng trong tháng này." />
        ) : (
          records.map((e) => {
            const flock = data.flocks.find((f) => f.id === e.flock_id);
            const hens = flockCount(data, e.flock_id, e.date);
            const canEdit = flock?.status === 'active' && !flock.archived;
            return (
              <Card key={e.id}>
                <View style={styles.between}>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700' }}>{flock?.name}</Text>
                    <Text style={styles.muted}>{formatDate(e.date)}</Text>
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '800' }}>
                    {formatNumber(e.quantity)} quả
                  </Text>
                </View>
                <Text>
                  Tỷ lệ đẻ:{' '}
                  {hens > 0 ? `${formatNumber(calcLayRate(e.quantity, hens), 1)}%` : 'Chưa có gà'} ·{' '}
                  {formatNumber(hens)} con cuối ngày
                </Text>
                {!!e.notes && <Text style={styles.muted}>{e.notes}</Text>}
                <RowActions
                  disabled={busy}
                  edit={canEdit ? () => setEditing(e) : undefined}
                  remove={() =>
                    confirmDelete('Xóa bản ghi sản lượng trứng?', () =>
                      mutate('Xóa trứng', (tx) => deleteEgg(tx, e.id)),
                    )
                  }
                />
              </Card>
            );
          })
        )}
      </Section>
      {editing && (
        <EggEditor egg={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </Screen>
  );
}
