import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Chip, Searchbar, Text } from 'react-native-paper';
import { Screen, Card, Empty, Action, FilterChips, styles } from '@/components/ui';
import { FlockEditor } from '@/components/Editors';
import { useFlocks } from '@/hooks/useFlocks';
import { colors } from '@/constants/colors';
import { flockTypes } from '@/constants/categories';
import { formatDate, formatNumber } from '@/utils/format';
export default function FlocksScreen() {
  const { flocks } = useFlocks();
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const visible = flocks.filter(
    (f) =>
      (filter === 'archived' ? !!f.archived : !f.archived && f.status === filter) &&
      `${f.name} ${f.breed}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
  );
  return (
    <Screen title="Đàn gà" subtitle="Mỗi lô một cuốn nhật ký nhỏ">
      <Action label="Thêm lô gà" onPress={() => setAdding(true)} />
      <Searchbar
        placeholder="Tìm tên lô, giống gà"
        value={search}
        onChangeText={setSearch}
        style={{ backgroundColor: colors.surface }}
      />
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'active', label: 'Đang nuôi' },
          { value: 'sold', label: 'Đã xuất' },
          { value: 'archived', label: 'Lưu trữ' },
        ]}
      />
      {!visible.length ? (
        <Empty
          text="Chưa có lô phù hợp."
          hint="Chọn trạng thái khác hoặc thêm lô gà mới."
          icon="bird"
        />
      ) : (
        visible.map((f) => (
          <Card
            key={f.id}
            onPress={() => router.push({ pathname: '/flock/[id]', params: { id: f.id } })}
          >
            <View style={styles.between}>
              <Text style={{ fontSize: 21, fontWeight: '700', flex: 1 }}>{f.name}</Text>
              <Chip compact>{flockTypes[f.type]}</Chip>
            </View>
            <Text style={{ marginTop: 8, color: colors.muted }}>
              {f.breed} · Nhập {formatDate(f.entry_date)}
            </Text>
            <View style={{ ...styles.between, marginTop: 18 }}>
              <Text style={{ fontSize: 30, fontWeight: '800', color: colors.green }}>
                {formatNumber(f.count)} con
              </Text>
              <Text style={styles.muted}>Ban đầu {formatNumber(f.initial_count)}</Text>
            </View>
          </Card>
        ))
      )}
      {adding && <FlockEditor onClose={() => setAdding(false)} />}
    </Screen>
  );
}
