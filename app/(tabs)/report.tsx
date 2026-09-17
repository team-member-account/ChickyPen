import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import {
  Screen,
  Card,
  Section,
  Stat,
  MonthPicker,
  Empty,
  Notice,
  runAction,
  styles,
} from '@/components/ui';
import { useFarm } from '@/providers/FarmProvider';
import { eggTotal, flockCount, monthlyReport, stock } from '@/utils/analytics';
import { shareReport } from '@/utils/report';
import { formatDate, formatNumber, formatVND, today } from '@/utils/format';
export default function ReportScreen() {
  const { data } = useFarm();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [sharing, setSharing] = useState(false);
  const report = monthlyReport(data, month);
  const flocks = data.flocks.filter((f) => f.entry_date <= report.until);
  const share = (plain = false) => {
    if (sharing) return;
    setSharing(true);
    void runAction(() => shareReport(data, month, plain)).finally(() => setSharing(false));
  };
  return (
    <Screen title="Báo cáo tháng" subtitle="Nhìn lại một tháng chăm đàn">
      <MonthPicker month={month} onChange={setMonth} />
      <Text style={{ textAlign: 'center', color: '#697568' }}>
        Từ {formatDate(report.start)} đến {formatDate(report.until)}
      </Text>
      <View style={styles.grid}>
        <Stat label="Đàn cuối kỳ" value={`${formatNumber(report.closing)} con`} />
        <Stat label="Trứng trong kỳ" value={`${formatNumber(report.eggs)} quả`} />
        <Stat label="Tỷ lệ chết" value={`${formatNumber(report.mortality, 2)}%`} tone="amber" />
        <Stat
          label="Lãi / lỗ"
          value={formatVND(report.profit)}
          tone={report.profit < 0 ? 'red' : 'green'}
        />
      </View>
      <Section title="Biến động đàn">
        <Card>
          {[
            { label: 'Đầu kỳ', value: report.opening },
            { label: 'Nhập thêm và lô mới', value: report.added },
            { label: 'Xuất bán', value: report.sold },
            { label: 'Gà chết', value: report.deaths },
            { label: 'Cuối kỳ', value: report.closing },
          ].map((row) => (
            <View key={row.label} style={styles.between}>
              <Text>{row.label}</Text>
              <Text style={{ fontWeight: '700' }}>{formatNumber(row.value)} con</Text>
            </View>
          ))}
        </Card>
      </Section>
      <Section title="Theo từng lô">
        {!flocks.length ? (
          <Empty text="Chưa có đàn trong kỳ báo cáo." />
        ) : (
          flocks.map((f) => (
            <Card key={f.id}>
              <Text style={{ fontSize: 19, fontWeight: '700' }}>{f.name}</Text>
              <Text>
                {formatNumber(flockCount(data, f.id, report.until))} con cuối kỳ ·{' '}
                {formatNumber(eggTotal(data, report.start, report.until, f.id))} quả trứng trong kỳ
              </Text>
            </Card>
          ))
        )}
      </Section>
      <Section title="Sản lượng & sức khỏe">
        <Card>
          <Text>Trứng trung bình: {formatNumber(report.average, 1)} quả / ngày</Text>
          <Text>
            Gà chết: {formatNumber(report.deaths)} / {formatNumber(report.opening + report.added)}{' '}
            con
          </Text>
          <Text style={styles.muted}>
            Tỷ lệ chết = số chết / (đàn đầu kỳ + số nhập trong kỳ). Ngày chưa ghi trứng tính là 0
            khi tính trung bình.
          </Text>
        </Card>
      </Section>
      <Section title="Thu chi">
        <Card>
          <View style={styles.between}>
            <Text>Tổng thu</Text>
            <Text style={{ fontWeight: '700' }}>{formatVND(report.income)}</Text>
          </View>
          <View style={styles.between}>
            <Text>Tổng chi</Text>
            <Text style={{ fontWeight: '700' }}>{formatVND(report.expense)}</Text>
          </View>
          <View style={styles.between}>
            <Text>Lãi / lỗ</Text>
            <Text style={{ fontWeight: '800', fontSize: 21 }}>{formatVND(report.profit)}</Text>
          </View>
        </Card>
        <Notice text="Lãi/lỗ là tổng thu trừ tổng chi đã ghi trong kỳ; chưa phân bổ giá trị thức ăn tồn kho và giá trị đàn." />
      </Section>
      <Section title="Tồn kho cuối kỳ">
        {!data.feeds.length ? (
          <Empty text="Chưa có thức ăn." />
        ) : (
          <Card>
            {data.feeds.map((f) => (
              <View key={f.id} style={styles.between}>
                <Text style={{ flex: 1 }}>{f.name}</Text>
                <Text style={{ fontWeight: '700' }}>
                  {formatNumber(stock(data, f.id, report.until))} {f.unit}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </Section>
      <Section title="Gửi báo cáo cho gia đình">
        <Button
          mode="contained"
          icon="file-export-outline"
          loading={sharing}
          disabled={sharing}
          onPress={() => share()}
          contentStyle={{ minHeight: 52 }}
        >
          Xuất tệp văn bản (.txt)
        </Button>
        <Button
          mode="outlined"
          icon="share-variant"
          disabled={sharing}
          onPress={() => share(true)}
          contentStyle={{ minHeight: 48 }}
        >
          Chia sẻ nội dung qua Zalo / Messenger
        </Button>
        <Text style={{ ...styles.muted, fontSize: 14, lineHeight: 22 }}>
          Chọn ứng dụng trong bảng chia sẻ của iPhone. Nội dung giống báo cáo trên màn hình.
        </Text>
      </Section>
    </Screen>
  );
}
