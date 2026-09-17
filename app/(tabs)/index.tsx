import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Icon, Text } from 'react-native-paper';
import { Screen, Card, Stat, Section, Empty, styles } from '@/components/ui';
import { EggChart } from '@/components/Charts';
import { useFarm } from '@/providers/FarmProvider';
import { colors } from '@/constants/colors';
import {
  eggSeries,
  eggTotal,
  financialSummary,
  flockCount,
  pendingVaccines,
  stock,
  totalBirds,
} from '@/utils/analytics';
import { addDays, formatDate, formatNumber, formatVND, today } from '@/utils/format';
export default function Dashboard() {
  const { data } = useFarm();
  const now = today();
  const money = financialSummary(data, now.slice(0, 7));
  const flocks = data.flocks.filter((f) => f.status === 'active' && !f.archived);
  const due = pendingVaccines(data).filter((v) => v.date <= addDays(now, 3));
  const low = data.feeds.filter((f) => stock(data, f.id) < f.threshold || stock(data, f.id) === 0);
  return (
    <Screen
      title="Một ngày tốt lành!"
      subtitle={formatDate(now) + ' · Mọi dữ liệu được lưu trên iPhone'}
    >
      <View style={{ backgroundColor: colors.deep, padding: 24, borderRadius: 26, gap: 18 }}>
        <View style={styles.between}>
          <Text style={{ color: '#CFDFC4', fontSize: 16 }}>Đàn gà nhà mình</Text>
          <Icon source="bird" size={38} color="#E7D58D" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={{ fontSize: 56, fontWeight: '800', color: '#FFFFFF' }}>
            {formatNumber(totalBirds(data))}
          </Text>
          <Text style={{ color: '#CFDFC4', fontSize: 18 }}>con đang nuôi</Text>
        </View>
        <Text style={{ color: '#CFDFC4' }}>{flocks.length} lô đang nuôi · Chăm đàn mỗi ngày</Text>
        <Button
          mode="contained"
          buttonColor="#E7EFDC"
          textColor={colors.deep}
          icon="plus"
          style={{ alignSelf: 'flex-start' }}
          onPress={() => router.push('/flocks')}
        >
          Quản lý đàn gà
        </Button>
      </View>
      <View style={styles.grid}>
        <Stat
          label="Trứng hôm nay"
          value={formatNumber(eggTotal(data, now, now))}
          detail="quả trứng"
        />
        <Stat
          label="Lãi / lỗ tháng này"
          value={formatVND(money.profit)}
          tone={money.profit < 0 ? 'red' : 'green'}
          detail={`Tháng ${now.slice(5, 7)}/${now.slice(0, 4)}`}
        />
      </View>
      <Section title="Việc cần chú ý">
        {!due.length && !low.length ? (
          <Card>
            <View style={styles.row}>
              <Icon source="check-circle-outline" size={26} color={colors.green} />
              <Text style={{ flex: 1, lineHeight: 24 }}>
                Không có lịch tiêm đến hạn hoặc cảnh báo thức ăn.
              </Text>
            </View>
          </Card>
        ) : (
          <>
            {due.map((d) => (
              <Card key={`${d.vaccine.id}-${d.booster}`}>
                <View style={styles.row}>
                  <Icon
                    source="needle"
                    size={25}
                    color={d.date < now ? colors.red : colors.amber}
                  />
                  <Text style={{ fontWeight: '700', flex: 1 }}>
                    {d.vaccine.name}
                    {d.booster ? ' · nhắc lại' : ''}
                  </Text>
                </View>
                <Text>
                  {d.flock.name} · {formatDate(d.date)}
                  {d.date < now ? ' · Quá hạn' : ''}
                </Text>
                <Button onPress={() => router.push('/health')}>Xem lịch tiêm</Button>
              </Card>
            ))}
            {low.map((f) => (
              <Card key={f.id}>
                <Text style={{ fontWeight: '700', color: colors.amber }}>
                  Thức ăn sắp hết · {f.name}
                </Text>
                <Text>
                  Còn {formatNumber(stock(data, f.id))} {f.unit} · Ngưỡng{' '}
                  {formatNumber(f.threshold)} {f.unit}
                </Text>
                <Button onPress={() => router.push('/feed')}>Nhập thêm thức ăn</Button>
              </Card>
            ))}
          </>
        )}
      </Section>
      <Section title="Trứng trong 7 ngày">
        <Card>
          <EggChart data={eggSeries(data, 7)} />
        </Card>
      </Section>
      <Section title="Thu chi tháng này">
        <View style={styles.grid}>
          <Stat label="Tổng thu" value={formatVND(money.income)} />
          <Stat label="Tổng chi" value={formatVND(money.expense)} tone="amber" />
        </View>
        <Button icon="arrow-right" onPress={() => router.push('/finance')}>
          Mở sổ thu chi
        </Button>
      </Section>
      <Section title="Các lô đang nuôi">
        {!flocks.length ? (
          <Empty
            text="Trại chưa có lô gà."
            hint="Thêm lô đầu tiên để bắt đầu ghi trứng, thức ăn và lịch tiêm."
            icon="bird"
          />
        ) : (
          flocks.map((f) => (
            <Card
              key={f.id}
              onPress={() => router.push({ pathname: '/flock/[id]', params: { id: f.id } })}
            >
              <View style={styles.between}>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ fontSize: 19, fontWeight: '700' }}>{f.name}</Text>
                  <Text style={styles.muted}>{f.breed}</Text>
                </View>
                <Text style={{ fontSize: 26, fontWeight: '800', color: colors.green }}>
                  {formatNumber(flockCount(data, f.id))} con
                </Text>
              </View>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
