import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Text } from 'react-native-paper';
import {
  Screen,
  Card,
  Stat,
  Section,
  Empty,
  Action,
  RowActions,
  confirmDelete,
  runAction,
  styles,
} from '@/components/ui';
import { FlockEditor, MovementEditor } from '@/components/Editors';
import { useFarm } from '@/providers/FarmProvider';
import { changeFlockStatus, deleteFlock, deleteMovement } from '@/db/queries';
import { flockCount } from '@/utils/analytics';
import { formatDate, formatNumber, formatVND, today, daysBetween } from '@/utils/format';
import { flockTypes, movementTypes } from '@/constants/categories';
import { colors } from '@/constants/colors';
import type { Movement } from '@/types';
export default function FlockDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const { data, mutate, busy } = useFarm();
  const [editing, setEditing] = useState(false);
  const [movement, setMovement] = useState<Movement | 'new' | null>(null);
  const flock = data.flocks.find((f) => f.id === Number(params.id));
  if (!flock)
    return (
      <Screen title="Chi tiết lô">
        <Button icon="arrow-left" onPress={() => router.replace('/flocks')}>
          Về danh sách đàn
        </Button>
        <Empty text="Không tìm thấy lô gà." />
      </Screen>
    );
  const count = flockCount(data, flock.id);
  const history = data.movements.filter((m) => m.flock_id === flock.id);
  const editable = flock.status === 'active' && !flock.archived;
  return (
    <Screen title={flock.name} subtitle={`${flockTypes[flock.type]} · ${flock.breed}`}>
      <Button
        icon="arrow-left"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/flocks'))}
        style={{ alignSelf: 'flex-start' }}
      >
        Danh sách đàn
      </Button>
      <View style={styles.grid}>
        <Stat label="Đang còn" value={`${formatNumber(count)} con`} />
        <Stat
          label="Thời gian nuôi"
          value={`${daysBetween(flock.entry_date, today())} ngày`}
          detail={`Nhập ${formatDate(flock.entry_date)}`}
        />
      </View>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>
          {flock.archived ? 'Đã lưu trữ' : flock.status === 'active' ? 'Đang nuôi' : 'Đã xuất'}
        </Text>
        <Text>Đàn ban đầu: {formatNumber(flock.initial_count)} con</Text>
        {!!flock.notes && <Text style={styles.body}>{flock.notes}</Text>}
        <Button icon="pencil-outline" disabled={busy} onPress={() => setEditing(true)}>
          Sửa thông tin lô
        </Button>
      </Card>
      {editable ? (
        <Action
          label="Nhập thêm / xuất bán / gà chết"
          disabled={busy}
          onPress={() => setMovement('new')}
        />
      ) : (
        <Button
          mode="contained-tonal"
          icon="restore"
          disabled={busy}
          onPress={() =>
            void runAction(() =>
              mutate('Mở lại lô', (tx) => changeFlockStatus(tx, flock.id, 'active')),
            )
          }
        >
          Mở lại lô để ghi phát sinh
        </Button>
      )}
      <Section title="Lịch sử số lượng">
        {history.map((m) => (
          <Card key={m.id}>
            <View style={styles.between}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ fontWeight: '700', fontSize: 18 }}>{movementTypes[m.kind]}</Text>
                <Text style={styles.muted}>{formatDate(m.date)}</Text>
              </View>
              <Text
                style={{
                  fontWeight: '800',
                  fontSize: 23,
                  color: m.kind === 'initial' || m.kind === 'add' ? colors.green : colors.red,
                }}
              >
                {m.kind === 'initial' || m.kind === 'add' ? '+' : '−'}
                {formatNumber(m.quantity)}
              </Text>
            </View>
            {!!m.reason && <Text>{m.reason}</Text>}
            {m.amount > 0 && <Text>Thu: {formatVND(m.amount)}</Text>}
            {m.kind !== 'initial' && editable && (
              <RowActions
                disabled={busy}
                edit={() => setMovement(m)}
                remove={() =>
                  confirmDelete('Xóa biến động này và khoản thu liên quan?', () =>
                    mutate('Xóa biến động đàn', (tx) => deleteMovement(tx, m.id)),
                  )
                }
              />
            )}
          </Card>
        ))}
      </Section>
      <Section title="Quản lý lô">
        {editable && (
          <Button
            mode="outlined"
            disabled={busy}
            icon="check-circle-outline"
            onPress={() =>
              void runAction(() =>
                mutate('Đóng lô', (tx) => changeFlockStatus(tx, flock.id, 'sold')),
              )
            }
          >
            Đánh dấu đã xuất
          </Button>
        )}
        {!flock.archived && (
          <Button
            icon="archive-outline"
            disabled={busy}
            onPress={() =>
              void runAction(() =>
                mutate('Lưu trữ lô', (tx) => changeFlockStatus(tx, flock.id, 'sold', true)),
              )
            }
          >
            Lưu trữ lô đã hết gà
          </Button>
        )}
        <Button
          textColor={colors.red}
          icon="trash-can-outline"
          disabled={busy}
          onPress={() =>
            confirmDelete('Chỉ xóa lô chưa có phát sinh sau lần nhập đàn ban đầu.', async () => {
              await mutate('Xóa lô gà', (tx) => deleteFlock(tx, flock.id));
              router.replace('/flocks');
            })
          }
        >
          Xóa lô chưa có phát sinh
        </Button>
      </Section>
      {editing && <FlockEditor flock={flock} onClose={() => setEditing(false)} />}
      {movement && (
        <MovementEditor
          movement={movement === 'new' ? undefined : movement}
          flockId={flock.id}
          onClose={() => setMovement(null)}
        />
      )}
    </Screen>
  );
}
