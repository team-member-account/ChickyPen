import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import {
  Screen,
  Card,
  Section,
  Empty,
  Action,
  Notice,
  FilterChips,
  MonthPicker,
  Stat,
  RowActions,
  confirmDelete,
  runAction,
  styles,
} from '@/components/ui';
import { MovementEditor, VaccineEditor } from '@/components/Editors';
import { useFarm } from '@/providers/FarmProvider';
import { useHealth } from '@/hooks/useHealth';
import { deleteMovement, deleteVaccine, markVaccine } from '@/db/queries';
import { monthlyReport } from '@/utils/analytics';
import { colors } from '@/constants/colors';
import { addDays, formatDate, formatNumber, today } from '@/utils/format';
import type { Movement, Vaccine } from '@/types';
export default function HealthScreen() {
  const { data, mutate, busy, notice, enableNotifications } = useFarm();
  const { vaccines, deaths } = useHealth();
  const [filter, setFilter] = useState('pending');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [editing, setEditing] = useState<Vaccine | 'new' | null>(null);
  const [death, setDeath] = useState<Movement | 'new' | null>(null);
  const [syncing, setSyncing] = useState(false);
  const totals = monthlyReport(data, month);
  const visible = vaccines.filter((v) => {
    const flock = data.flocks.find((f) => f.id === v.flock_id);
    const active = flock?.status === 'active' && !flock.archived;
    const pending = !v.done || (!!v.booster_date && !v.booster_done);
    return filter === 'all' || (filter === 'pending' ? active && pending : !pending);
  });
  const canAdd = data.flocks.some((f) => f.status === 'active' && !f.archived);
  const deathRecords = deaths.filter((m) => m.date.startsWith(month));
  return (
    <Screen title="Sức khỏe đàn" subtitle="Nhớ lịch tiêm, theo sát từng thay đổi">
      <Action
        label="Thêm lịch vaccine"
        disabled={!canAdd}
        icon="needle"
        onPress={() => setEditing('new')}
      />
      {!canAdd && (
        <Notice text="Thêm hoặc mở lại lô gà trong Đàn gà để ghi lịch tiêm và gà chết." />
      )}
      {notice ? (
        <Notice text={notice} />
      ) : (
        <Card>
          <Text style={{ color: colors.green }}>
            Nhắc lịch lúc 08:00, trước ngày tiêm một ngày (giờ Việt Nam).
          </Text>
        </Card>
      )}
      <View style={styles.row}>
        <Button
          icon="bell-outline"
          loading={syncing}
          disabled={syncing}
          onPress={() => {
            setSyncing(true);
            void enableNotifications().finally(() => setSyncing(false));
          }}
        >
          Bật / đồng bộ lời nhắc
        </Button>
        <Button icon="cog-outline" onPress={() => void runAction(() => Linking.openSettings())}>
          Quyền thông báo
        </Button>
      </View>
      <Section title="Lịch tiêm phòng">
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: 'Chưa hoàn tất' },
            { value: 'done', label: 'Đã tiêm đủ' },
            { value: 'all', label: 'Tất cả' },
          ]}
        />
        {!visible.length ? (
          <Empty text="Chưa có lịch tiêm trong mục này." icon="needle" />
        ) : (
          visible.map((v) => {
            const flock = data.flocks.find((f) => f.id === v.flock_id);
            const active = flock?.status === 'active' && !flock.archived;
            const shots = [
              { booster: false, date: v.due_date, done: v.done, completed: v.completed_date },
              ...(v.booster_date
                ? [
                    {
                      booster: true,
                      date: v.booster_date,
                      done: v.booster_done,
                      completed: v.booster_completed_date,
                    },
                  ]
                : []),
            ];
            return (
              <Card key={v.id}>
                <Text style={{ fontSize: 20, fontWeight: '700' }}>{v.name}</Text>
                <Text style={styles.muted}>
                  {flock?.name}
                  {active ? '' : ' · Lô đã đóng'}
                </Text>
                {shots.map((shot) => (
                  <View
                    key={String(shot.booster)}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: shot.done
                        ? colors.pale
                        : shot.date <= addDays(today(), 3)
                          ? colors.amberLight
                          : colors.cream,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontWeight: '700' }}>
                      {shot.booster ? 'Mũi nhắc lại' : 'Mũi đầu'} · {formatDate(shot.date)}
                    </Text>
                    <Text
                      style={{
                        color: shot.done
                          ? colors.green
                          : shot.date < today()
                            ? colors.red
                            : colors.muted,
                      }}
                    >
                      {shot.done
                        ? `Đã tiêm${shot.completed ? ' ngày ' + formatDate(shot.completed) : ''}`
                        : shot.date < today()
                          ? 'Quá hạn · chưa ghi đã tiêm'
                          : 'Chưa tiêm'}
                    </Text>
                    <Button
                      mode={shot.done ? 'text' : 'contained-tonal'}
                      icon={shot.done ? 'undo' : 'check'}
                      disabled={busy || (!active && !shot.done)}
                      onPress={() =>
                        void runAction(() =>
                          mutate('Cập nhật đã tiêm', (tx) =>
                            markVaccine(tx, v.id, shot.booster, !shot.done),
                          ),
                        )
                      }
                    >
                      {shot.done ? 'Bỏ dấu đã tiêm' : 'Đánh dấu đã tiêm hôm nay'}
                    </Button>
                  </View>
                ))}
                {!!v.notes && <Text style={styles.muted}>{v.notes}</Text>}
                <RowActions
                  disabled={busy}
                  edit={active ? () => setEditing(v) : undefined}
                  remove={() =>
                    confirmDelete('Xóa lịch tiêm và hủy các lời nhắc tương ứng?', () =>
                      mutate('Xóa lịch vaccine', (tx) => deleteVaccine(tx, v.id)),
                    )
                  }
                />
              </Card>
            );
          })
        )}
      </Section>
      <Section title="Theo dõi gà chết">
        <Action
          label="Ghi nhận gà chết"
          icon="notebook-edit-outline"
          disabled={!canAdd}
          onPress={() => setDeath('new')}
        />
        <MonthPicker month={month} onChange={setMonth} />
        <View style={styles.grid}>
          <Stat
            label="Gà chết trong tháng"
            value={`${formatNumber(totals.deaths)} con`}
            tone="red"
          />
          <Stat
            label="Tỷ lệ chết"
            value={`${formatNumber(totals.mortality, 2)}%`}
            detail="Số chết / (đầu tháng + nhập)"
            tone="amber"
          />
        </View>
        {!deathRecords.length ? (
          <Empty text="Chưa ghi nhận gà chết trong tháng." icon="shield-check-outline" />
        ) : (
          deathRecords.map((m) => {
            const f = data.flocks.find((f) => f.id === m.flock_id);
            const editable = f?.status === 'active' && !f.archived;
            return (
              <Card key={m.id}>
                <View style={styles.between}>
                  <Text style={{ fontWeight: '700', flex: 1 }}>{f?.name}</Text>
                  <Text style={{ fontSize: 21, fontWeight: '700', color: colors.red }}>
                    {m.quantity} con
                  </Text>
                </View>
                <Text>
                  {formatDate(m.date)} · {m.reason}
                </Text>
                {editable && (
                  <RowActions
                    disabled={busy}
                    edit={() => setDeath(m)}
                    remove={() =>
                      confirmDelete('Xóa ghi nhận gà chết và hoàn lại số lượng cho đàn?', () =>
                        mutate('Xóa gà chết', (tx) => deleteMovement(tx, m.id)),
                      )
                    }
                  />
                )}
              </Card>
            );
          })
        )}
      </Section>
      {editing && (
        <VaccineEditor
          vaccine={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {death && (
        <MovementEditor
          deathOnly
          movement={death === 'new' ? undefined : death}
          onClose={() => setDeath(null)}
        />
      )}
    </Screen>
  );
}
