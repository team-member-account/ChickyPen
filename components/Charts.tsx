import React from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { Text } from 'react-native-paper';
import { colors } from '@/constants/colors';
import { formatDate, formatNumber, formatVND } from '@/utils/format';
import { Empty, styles } from './ui';
export function EggChart({
  data,
  line = false,
}: {
  data: { date: string; value: number }[];
  line?: boolean;
}) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(210, Math.min(width - 104, 690));
  if (!data.some((d) => d.value > 0))
    return <Empty text="Chưa có sản lượng trong kỳ này." icon="egg-outline" />;
  const points = data.map((d, i) => ({
    value: d.value,
    label: !line || i % 5 === 0 ? formatDate(d.date).slice(0, 5) : '',
    dataPointText: String(d.value),
  }));
  return (
    <View style={{ gap: 12 }}>
      {line ? (
        <LineChart
          data={points}
          width={chartWidth}
          height={180}
          spacing={Math.max(15, chartWidth / 30)}
          color={colors.green}
          thickness={3}
          dataPointsColor={colors.green}
          areaChart
          startFillColor={colors.pale}
          endFillColor={colors.cream}
          startOpacity={0.9}
          endOpacity={0.2}
          noOfSections={4}
          yAxisThickness={0}
          xAxisColor={colors.line}
          rulesColor={colors.line}
          yAxisTextStyle={{ color: colors.muted, fontSize: 12 }}
          xAxisLabelTextStyle={{ color: colors.muted, fontSize: 11 }}
        />
      ) : (
        <BarChart
          data={points}
          width={chartWidth}
          height={170}
          barWidth={Math.max(16, (chartWidth - 84) / 7)}
          spacing={12}
          frontColor={colors.green}
          barBorderTopLeftRadius={5}
          barBorderTopRightRadius={5}
          noOfSections={4}
          yAxisThickness={0}
          xAxisColor={colors.line}
          rulesColor={colors.line}
          yAxisTextStyle={{ color: colors.muted, fontSize: 12 }}
          xAxisLabelTextStyle={{ color: colors.muted, fontSize: 11 }}
        />
      )}
      <Text style={{ fontSize: 13, color: colors.muted }}>
        Đơn vị: quả trứng · {line ? 'Vuốt biểu đồ để xem đủ 30 ngày.' : '7 ngày, bao gồm hôm nay.'}
      </Text>
      <ScrollView horizontal contentContainerStyle={{ gap: 12 }}>
        {data.map((d) => (
          <Text key={d.date} style={{ fontSize: 12, color: colors.muted }}>
            {formatDate(d.date).slice(0, 5)}: {formatNumber(d.value)}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
const palette = ['#286344', '#82A96C', '#C49B4B', '#6B92A1', '#AA7768', '#B6B780'];
export function CategoryChart({ entries }: { entries: { category: string; amount: number }[] }) {
  const grouped = entries.reduce<Record<string, number>>(
    (map, e) => ({ ...map, [e.category]: (map[e.category] ?? 0) + e.amount }),
    {},
  );
  const items = Object.entries(grouped)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = items.reduce((n, [, v]) => n + v, 0);
  if (!total) return <Empty text="Chưa có giao dịch trong kỳ này." />;
  return (
    <View style={{ gap: 18 }}>
      <View style={{ alignItems: 'center' }}>
        <PieChart
          data={items.map(([text, value], i) => ({
            text,
            value,
            color: palette[i % palette.length],
          }))}
          donut
          radius={100}
          innerRadius={72}
          innerCircleColor={colors.surface}
          centerLabelComponent={() => (
            <View>
              <Text style={{ textAlign: 'center', fontSize: 15, fontWeight: '700' }}>Cơ cấu</Text>
              <Text style={{ textAlign: 'center', color: colors.muted }}>
                {items.length} danh mục
              </Text>
            </View>
          )}
        />
      </View>
      {items.map(([label, value], i) => (
        <View key={label} style={styles.between}>
          <View style={{ ...styles.row, flex: 1 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: palette[i % palette.length],
              }}
            />
            <Text style={{ flex: 1 }}>{label}</Text>
          </View>
          <View>
            <Text style={{ textAlign: 'right', fontWeight: '600' }}>{formatVND(value)}</Text>
            <Text style={{ textAlign: 'right', fontSize: 12, color: colors.muted }}>
              {formatNumber((value / total) * 100, 1)}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
