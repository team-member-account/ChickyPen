import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import type { Snapshot } from '@/types';
import { eggTotal, flockCount, monthlyReport, stock } from './analytics';
import { formatDate, formatNumber, formatVND } from './format';
import { log } from './logger';
export function reportText(data: Snapshot, month: string): string {
  const r = monthlyReport(data, month);
  const flockLines = data.flocks
    .filter((f) => f.entry_date <= r.until)
    .map(
      (f) =>
        `- ${f.name}: ${formatNumber(flockCount(data, f.id, r.until))} con cuối kỳ; ${formatNumber(eggTotal(data, r.start, r.until, f.id))} trứng trong kỳ.`,
    );
  const categories = (kind: 'income' | 'expense') =>
    Object.entries(
      r.entries
        .filter((e) => e.kind === kind)
        .reduce<Record<string, number>>(
          (map, e) => ({ ...map, [e.category]: (map[e.category] ?? 0) + e.amount }),
          {},
        ),
    ).map(([name, amount]) => `- ${name}: ${formatVND(amount)}`);
  return [
    'CHICKYPEN — BÁO CÁO TRẠI GÀ',
    `Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`,
    `Từ ${formatDate(r.start)} đến ${formatDate(r.until)}`,
    '',
    'ĐÀN GÀ',
    `Đầu kỳ: ${formatNumber(r.opening)} con`,
    `Nhập trong kỳ: ${formatNumber(r.added)} con`,
    `Xuất bán: ${formatNumber(r.sold)} con`,
    `Gà chết: ${formatNumber(r.deaths)} con`,
    `Cuối kỳ: ${formatNumber(r.closing)} con`,
    ...flockLines,
    '',
    'SẢN LƯỢNG TRỨNG',
    `Tổng: ${formatNumber(r.eggs)} quả`,
    `Trung bình: ${formatNumber(r.average, 1)} quả/ngày`,
    '',
    'SỨC KHỎE',
    `Tỷ lệ chết: ${formatNumber(r.mortality, 2)}%`,
    'Cách tính: số chết / (đàn đầu kỳ + số nhập trong kỳ) × 100.',
    '',
    'THU CHI',
    `Tổng thu: ${formatVND(r.income)}`,
    ...categories('income'),
    `Tổng chi: ${formatVND(r.expense)}`,
    ...categories('expense'),
    `LÃI / LỖ: ${formatVND(r.profit)}`,
    '',
    'TỒN KHO CUỐI KỲ',
    ...(data.feeds.length
      ? data.feeds.map((f) => `- ${f.name}: ${formatNumber(stock(data, f.id, r.until))} ${f.unit}`)
      : ['Chưa có danh mục thức ăn.']),
    '',
    'Số liệu theo ngày phát sinh đã ghi. Ngày chưa ghi trứng được tính là 0 khi tính trung bình.',
    'Lãi/lỗ = tổng thu − tổng chi; chưa phân bổ giá trị tồn kho hoặc giá trị đàn.',
    'Xuất từ ChickyPen · Dữ liệu trên thiết bị',
  ].join('\n');
}
export async function shareReport(data: Snapshot, month: string, plain = false): Promise<void> {
  const content = reportText(data, month);
  log('report export: bắt đầu', { month, plain });
  try {
    if (plain || !(await Sharing.isAvailableAsync())) {
      await Share.share({
        message: content,
        title: `ChickyPen tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`,
      });
      log('report share: mở bảng chia sẻ nội dung', { month });
      return;
    }
    if (!FileSystem.cacheDirectory) throw new Error('Không thể tạo tệp báo cáo trên thiết bị.');
    const uri = `${FileSystem.cacheDirectory}ChickyPen-${month}.txt`;
    await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
    log('insert: tệp báo cáo', { uri });
    await Sharing.shareAsync(uri, {
      mimeType: 'text/plain',
      UTI: 'public.plain-text',
      dialogTitle: 'Chia sẻ báo cáo ChickyPen',
    });
    log('report share: mở bảng chia sẻ tệp', { month });
  } catch (error) {
    log('report export error', error);
    throw error;
  }
}
