import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import {
  Screen,
  Card,
  Section,
  Empty,
  Action,
  Choice,
  MonthPicker,
  RowActions,
  confirmDelete,
  styles,
} from '@/components/ui';
import { FeedEditor, FeedEntryEditor } from '@/components/Editors';
import { useFarm } from '@/providers/FarmProvider';
import { useFeed } from '@/hooks/useFeed';
import { deleteFeed, deleteFeedEntry } from '@/db/queries';
import { colors } from '@/constants/colors';
import { formatDate, formatNumber, formatVND, today } from '@/utils/format';
import type { Feed, FeedEntry } from '@/types';
export default function FeedScreen() {
  const { data, mutate, busy } = useFarm();
  const { feeds, entries } = useFeed();
  const [editor, setEditor] = useState<Feed | 'new' | null>(null);
  const [entry, setEntry] = useState<{
    entry?: FeedEntry;
    feedId?: number;
    kind?: FeedEntry['kind'];
  } | null>(null);
  const [selected, setSelected] = useState('');
  const [month, setMonth] = useState(today().slice(0, 7));
  const visible = entries.filter(
    (e) => e.date.startsWith(month) && (!selected || e.feed_id === Number(selected)),
  );
  return (
    <Screen title="Kho thức ăn" subtitle="Biết trong kho, chủ động bữa ăn">
      <Action label="Thêm loại thức ăn" onPress={() => setEditor('new')} />
      {!feeds.length ? (
        <Empty
          text="Kho thức ăn đang trống."
          hint="Thêm tên thức ăn và đơn vị, rồi ghi lần nhập kho đầu tiên."
          icon="barley"
        />
      ) : (
        feeds.map((f) => {
          const low = f.stock < f.threshold || f.stock === 0;
          return (
            <Card key={f.id}>
              <View style={styles.between}>
                <Text style={{ fontSize: 20, fontWeight: '700', flex: 1 }}>{f.name}</Text>
                <Text style={{ color: low ? colors.amber : colors.green, fontWeight: '700' }}>
                  {low ? 'Cần nhập thêm' : 'Đủ thức ăn'}
                </Text>
              </View>
              <Text style={{ fontSize: 31, fontWeight: '800', color: colors.green }}>
                {formatNumber(f.stock)} {f.unit}
              </Text>
              <Text style={styles.muted}>
                Cảnh báo dưới {formatNumber(f.threshold)} {f.unit}
              </Text>
              <View style={styles.row}>
                <Button
                  mode="contained-tonal"
                  icon="plus"
                  onPress={() => setEntry({ feedId: f.id, kind: 'purchase' })}
                >
                  Nhập kho
                </Button>
                <Button
                  mode="outlined"
                  icon="minus"
                  onPress={() => setEntry({ feedId: f.id, kind: 'consume' })}
                >
                  Tiêu thụ
                </Button>
              </View>
              <RowActions
                disabled={busy}
                edit={() => setEditor(f)}
                remove={() =>
                  confirmDelete('Xóa danh mục thức ăn chưa có phát sinh?', () =>
                    mutate('Xóa thức ăn', (tx) => deleteFeed(tx, f.id)),
                  )
                }
              />
            </Card>
          );
        })
      )}
      <Section title="Nhật ký kho">
        <MonthPicker month={month} onChange={setMonth} />
        <Choice
          label="Lọc thức ăn"
          value={selected}
          onChange={setSelected}
          options={[
            { value: '', label: 'Tất cả thức ăn' },
            ...feeds.map((f) => ({ value: String(f.id), label: f.name })),
          ]}
        />
        {!visible.length ? (
          <Empty text="Chưa có phát sinh kho trong tháng." />
        ) : (
          visible.map((e) => {
            const feed = feeds.find((f) => f.id === e.feed_id);
            return (
              <Card key={e.id}>
                <View style={styles.between}>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ fontWeight: '700', fontSize: 18 }}>{feed?.name}</Text>
                    <Text style={styles.muted}>
                      {formatDate(e.date)} · {e.kind === 'purchase' ? 'Nhập kho' : 'Tiêu thụ'}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontWeight: '800',
                      fontSize: 20,
                      color: e.kind === 'purchase' ? colors.green : colors.amber,
                    }}
                  >
                    {e.kind === 'purchase' ? '+' : '−'}
                    {formatNumber(e.quantity)} {feed?.unit}
                  </Text>
                </View>
                {e.kind === 'purchase' ? (
                  <Text>
                    {formatVND(e.unit_price)} / {feed?.unit} · Tổng{' '}
                    {formatVND(Math.round(e.quantity * e.unit_price))}
                  </Text>
                ) : (
                  <Text>
                    Dùng cho:{' '}
                    {e.flock_id ? data.flocks.find((f) => f.id === e.flock_id)?.name : 'Toàn trại'}
                  </Text>
                )}
                {!!e.notes && <Text style={styles.muted}>{e.notes}</Text>}
                <RowActions
                  disabled={busy}
                  edit={() => setEntry({ entry: e })}
                  remove={() =>
                    confirmDelete('Xóa phát sinh kho và khoản chi liên quan?', () =>
                      mutate('Xóa phát sinh kho', (tx) => deleteFeedEntry(tx, e.id)),
                    )
                  }
                />
              </Card>
            );
          })
        )}
      </Section>
      {editor && (
        <FeedEditor feed={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />
      )}
      {entry && <FeedEntryEditor {...entry} onClose={() => setEntry(null)} />}
    </Screen>
  );
}
