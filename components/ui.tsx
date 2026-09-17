import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Button,
  Chip,
  Icon,
  IconButton,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { colors } from '@/constants/colors';
import { useFarm } from '@/providers/FarmProvider';
import { errorMessage, log } from '@/utils/logger';
import { shiftMonth, today } from '@/utils/format';
export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  muted: { color: colors.muted },
  section: { fontSize: 21, fontWeight: '700', color: colors.deep },
  body: { fontSize: 16, lineHeight: 24 },
  card: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  button: { borderRadius: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
export function Screen({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { loading, error, refresh, busy } = useFarm();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.cream }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 36,
          gap: 20,
          maxWidth: 840,
          width: '100%',
          alignSelf: 'center',
        }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => void refresh()}
            tintColor={colors.green}
          />
        }
      >
        <View style={styles.between}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text
              style={{ color: colors.green, fontSize: 12, fontWeight: '800', letterSpacing: 2 }}
            >
              CHICKYPEN · SỔ TAY NHÀ NÔNG
            </Text>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 30, fontWeight: '800', color: colors.deep }}
            >
              {title}
            </Text>
            {subtitle && <Text style={styles.muted}>{subtitle}</Text>}
          </View>
          {action}
        </View>
        {busy && <Text style={{ color: colors.green }}>Đang lưu dữ liệu…</Text>}
        {error && <Notice text={error} danger />}
        {loading ? <ActivityIndicator size="large" style={{ marginTop: 60 }} /> : children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Card({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return (
    <Surface elevation={0} style={styles.card}>
      {onPress ? (
        <View>
          {children}
          <Button
            onPress={onPress}
            contentStyle={{ justifyContent: 'flex-start' }}
            style={{ alignSelf: 'flex-start', marginLeft: -12 }}
            icon="arrow-right"
          >
            Xem chi tiết
          </Button>
        </View>
      ) : (
        children
      )}
    </Surface>
  );
}
export function Stat({
  label,
  value,
  detail,
  tone = 'green',
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'green' | 'red' | 'amber';
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        padding: 17,
        borderRadius: 20,
        backgroundColor:
          tone === 'red' ? colors.redLight : tone === 'amber' ? colors.amberLight : colors.pale,
        gap: 7,
      }}
    >
      <Text style={{ fontSize: 14, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors[tone] }}>{value}</Text>
      {detail && <Text style={{ fontSize: 13, color: colors.muted }}>{detail}</Text>}
    </View>
  );
}
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={styles.section}>
        {title}
      </Text>
      {children}
    </View>
  );
}
export function Empty({
  text = 'Chưa có dữ liệu.',
  hint,
  icon = 'notebook-outline',
}: {
  text?: string;
  hint?: string;
  icon?: string;
}) {
  return (
    <View
      style={{
        padding: 28,
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#BBCBB5',
        borderRadius: 20,
      }}
    >
      <Icon source={icon} size={34} color={colors.green} />
      <Text style={{ textAlign: 'center', fontWeight: '700', fontSize: 17 }}>{text}</Text>
      {hint && (
        <Text style={{ textAlign: 'center', color: colors.muted, lineHeight: 23 }}>{hint}</Text>
      )}
    </View>
  );
}
export function Notice({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: danger ? colors.redLight : colors.amberLight,
      }}
    >
      <Text style={{ color: danger ? colors.red : colors.amber, lineHeight: 24 }}>{text}</Text>
    </View>
  );
}
export function Action({
  label,
  onPress,
  icon = 'plus',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      mode="contained"
      icon={icon}
      disabled={disabled}
      onPress={onPress}
      style={styles.button}
      contentStyle={{ minHeight: 48 }}
    >
      {label}
    </Button>
  );
}
export function RowActions({
  edit,
  remove,
  disabled = false,
}: {
  edit?: () => void;
  remove?: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      {edit && (
        <Button icon="pencil-outline" disabled={disabled} onPress={edit}>
          Sửa
        </Button>
      )}
      {remove && (
        <Button
          icon="trash-can-outline"
          textColor={colors.red}
          disabled={disabled}
          onPress={remove}
        >
          Xóa
        </Button>
      )}
    </View>
  );
}
export function confirmDelete(label: string, action: () => Promise<unknown>) {
  Alert.alert('Xác nhận xóa', `${label}\nThao tác này không thể hoàn tác.`, [
    { text: 'Giữ lại', style: 'cancel' },
    {
      text: 'Xóa',
      style: 'destructive',
      onPress: () => {
        void runAction(action);
      },
    },
  ]);
}
export async function runAction(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (e) {
    Alert.alert('Chưa thể thực hiện', errorMessage(e));
  }
}
export function MonthPicker({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  return (
    <View style={styles.between}>
      <IconButton
        icon="chevron-left"
        accessibilityLabel="Tháng trước"
        onPress={() => onChange(shiftMonth(month, -1))}
      />
      <Text style={{ fontSize: 19, fontWeight: '700' }}>
        Tháng {month.slice(5, 7)}/{month.slice(0, 4)}
      </Text>
      <IconButton
        icon="chevron-right"
        accessibilityLabel="Tháng sau"
        disabled={month >= today().slice(0, 7)}
        onPress={() => onChange(shiftMonth(month, 1))}
      />
    </View>
  );
}
export interface Option {
  value: string;
  label: string;
}
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: '600' }}>{label}</Text>
      <Button
        mode="outlined"
        icon="chevron-down"
        contentStyle={{ minHeight: 48, justifyContent: 'flex-start' }}
        onPress={() => setExpanded(!expanded)}
      >
        {selected?.label ?? 'Chọn một mục'}
      </Button>
      {expanded && (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 14,
            padding: 10,
            gap: 5,
          }}
        >
          {options.length > 6 && (
            <TextInput mode="outlined" label="Tìm nhanh" value={search} onChangeText={setSearch} />
          )}
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 220 }}
          >
            {options
              .filter((o) =>
                o.label.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
              )
              .map((o) => (
                <Button
                  key={o.value}
                  mode={o.value === value ? 'contained-tonal' : 'text'}
                  onPress={() => {
                    onChange(o.value);
                    setExpanded(false);
                    setSearch('');
                  }}
                  contentStyle={{ justifyContent: 'flex-start', minHeight: 46 }}
                >
                  {o.label}
                </Button>
              ))}
            {!options.length && <Text style={styles.muted}>Chưa có mục phù hợp.</Text>}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
export interface Field {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'notes' | 'choice';
  options?: Option[];
  hint?: string;
  show?: (values: Record<string, string>) => boolean;
}
export function FormModal({
  title,
  fields,
  initial,
  onClose,
  onSave,
  footer,
}: {
  title: string;
  fields: Field[];
  initial: Record<string, string>;
  onClose: () => void;
  onSave: (values: Record<string, string>) => Promise<unknown>;
  footer?: string;
}) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const submit = async () => {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ ...styles.between, paddingHorizontal: 18, paddingVertical: 10 }}>
            <Text style={{ fontSize: 23, fontWeight: '700', flex: 1 }}>{title}</Text>
            <IconButton
              icon="close"
              accessibilityLabel="Đóng biểu mẫu"
              disabled={saving}
              onPress={onClose}
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 50 }}
          >
            {fields
              .filter((f) => !f.show || f.show(values))
              .map((f) => (
                <View key={f.key} style={{ gap: 6 }}>
                  {f.type === 'choice' ? (
                    <Choice
                      label={f.label}
                      value={values[f.key] ?? ''}
                      options={f.options ?? []}
                      onChange={(v) => setValues((old) => ({ ...old, [f.key]: v }))}
                    />
                  ) : (
                    <TextInput
                      mode="outlined"
                      label={f.label}
                      value={values[f.key] ?? ''}
                      onChangeText={(v) => setValues((old) => ({ ...old, [f.key]: v }))}
                      keyboardType={
                        f.type === 'number'
                          ? 'decimal-pad'
                          : f.type === 'date'
                            ? 'numbers-and-punctuation'
                            : 'default'
                      }
                      placeholder={f.type === 'date' ? 'DD/MM/YYYY' : undefined}
                      multiline={f.type === 'notes'}
                      numberOfLines={f.type === 'notes' ? 3 : 1}
                      maxLength={f.type === 'notes' ? 2000 : f.type === 'date' ? 10 : 200}
                      disabled={saving}
                      style={{ backgroundColor: colors.surface, fontSize: 17 }}
                    />
                  )}
                  {f.hint && (
                    <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20 }}>
                      {f.hint}
                    </Text>
                  )}
                </View>
              ))}
            {footer && <Notice text={footer} />}
            {error && <Notice text={error} danger />}
            <Button
              mode="contained"
              loading={saving}
              disabled={saving}
              icon="check"
              onPress={() => void submit()}
              contentStyle={{ minHeight: 52 }}
              style={styles.button}
            >
              Lưu dữ liệu
            </Button>
            <Button
              disabled={saving}
              onPress={() => {
                log('form cancel', { title });
                onClose();
              }}
            >
              Hủy
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {options.map((o) => (
        <Chip
          key={o.value}
          selected={value === o.value}
          onPress={() => onChange(o.value)}
          style={{ backgroundColor: value === o.value ? colors.pale : colors.surface }}
        >
          {o.label}
        </Chip>
      ))}
    </ScrollView>
  );
}
