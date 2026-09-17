import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Text } from 'react-native-paper';
import {
  Screen,
  Card,
  Section,
  Empty,
  Action,
  Stat,
  MonthPicker,
  FilterChips,
  RowActions,
  confirmDelete,
  styles,
} from '@/components/ui';
import { FinanceEditor } from '@/components/Editors';
import { CategoryChart } from '@/components/Charts';
import { useFarm } from '@/providers/FarmProvider';
import { useFinance } from '@/hooks/useFinance';
import { deleteFinance } from '@/db/queries';
import { formatDate, formatVND, today } from '@/utils/format';
import { colors } from '@/constants/colors';
import type { Finance } from '@/types';
export default function FinanceScreen() {
  const { data, mutate, busy } = useFarm();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [filter, setFilter] = useState('all');
  const [chartKind, setChartKind] = useState('expense');
  const [editing, setEditing] = useState<Finance | 'new' | null>(null);
  const { income, expense, profit, entries } = useFinance(month);
  const visible = entries.filter((e) => filter === 'all' || e.kind === filter);
  return (
    <Screen title="Sổ thu chi" subtitle="Rõ từng khoản, biết lời lỗ">
      <Action label="Thêm khoản thu / chi" icon="cash-plus" onPress={() => setEditing('new')} />
      <MonthPicker month={month} onChange={setMonth} />
      <View style={styles.grid}>
        <Stat label="Tổng thu" value={formatVND(income)} />
        <Stat label="Tổng chi" value={formatVND(expense)} tone="amber" />
      </View>
      <Stat
        label="Lãi / lỗ trong tháng"
        value={formatVND(profit)}
        tone={profit < 0 ? 'red' : 'green'}
      />
      <Section title="Thu chi theo danh mục">
        <FilterChips
          value={chartKind}
          onChange={setChartKind}
          options={[
            { value: 'expense', label: 'Cơ cấu chi' },
            { value: 'income', label: 'Cơ cấu thu' },
          ]}
        />
        <Card>
          <CategoryChart entries={entries.filter((e) => e.kind === chartKind)} />
        </Card>
      </Section>
      <Section title="Các khoản trong tháng">
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'income', label: 'Khoản thu' },
            { value: 'expense', label: 'Khoản chi' },
          ]}
        />
        {!visible.length ? (
          <Empty text="Chưa có khoản thu chi phù hợp." />
        ) : (
          visible.map((e) => (
            <Card key={e.id}>
              <View style={styles.between}>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700' }}>{e.category}</Text>
                  <Text style={styles.muted}>{formatDate(e.date)}</Text>
                </View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '800',
                    color: e.kind === 'income' ? colors.green : colors.red,
                  }}
                >
                  {e.kind === 'income' ? '+' : '−'}
                  {formatVND(e.amount)}
                </Text>
              </View>
              {!!e.notes && <Text style={styles.body}>{e.notes}</Text>}
              {e.source_type ? (
                <View style={{ gap: 5 }}>
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    Tự động từ {e.source_type === 'feed' ? 'nhập kho thức ăn' : 'xuất bán gà'} ·
                    chỉnh tại giao dịch nguồn
                  </Text>
                  <Button
                    icon="arrow-right"
                    onPress={() => {
                      if (e.source_type === 'feed') {
                        router.push('/feed');
                      } else {
                        const movement = data.movements.find((m) => m.id === e.source_id);
                        if (movement)
                          router.push({
                            pathname: '/flock/[id]',
                            params: { id: movement.flock_id },
                          });
                      }
                    }}
                  >
                    Mở giao dịch nguồn
                  </Button>
                </View>
              ) : (
                <RowActions
                  disabled={busy}
                  edit={() => setEditing(e)}
                  remove={() =>
                    confirmDelete('Xóa khoản thu chi này?', () =>
                      mutate('Xóa thu chi', (tx) => deleteFinance(tx, e.id)),
                    )
                  }
                />
              )}
            </Card>
          ))
        )}
      </Section>
      {editing && (
        <FinanceEditor
          entry={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Screen>
  );
}
