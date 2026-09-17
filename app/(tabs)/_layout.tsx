import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { log } from '@/utils/logger';
const items: Record<string, { title: string; icon: string }> = {
  index: { title: 'Tổng quan', icon: 'view-dashboard-outline' },
  flocks: { title: 'Đàn gà', icon: 'bird' },
  eggs: { title: 'Trứng', icon: 'egg-outline' },
  feed: { title: 'Thức ăn', icon: 'barley' },
  health: { title: 'Sức khỏe', icon: 'medical-bag' },
  finance: { title: 'Thu chi', icon: 'wallet-outline' },
  report: { title: 'Báo cáo', icon: 'chart-box-outline' },
};
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
function FarmTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, state.index * 94 - 90), animated: true });
  }, [state.index]);
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 8 }}
      >
        {state.routes.map((route, index) => {
          const item = items[route.name];
          if (!item) return null;
          const selected = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={item.title}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!selected && !event.defaultPrevented) {
                  log('navigate', { screen: item.title });
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={{
                width: 94,
                minHeight: 60,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                borderRadius: 16,
                backgroundColor: selected ? colors.pale : colors.surface,
              }}
            >
              <Icon source={item.icon} size={23} color={selected ? colors.green : colors.muted} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: selected ? '800' : '500',
                  color: selected ? colors.deep : colors.muted,
                }}
              >
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={{ fontSize: 10, color: colors.muted, textAlign: 'center', paddingTop: 3 }}>
        Vuốt thanh để xem đủ 7 mục
      </Text>
    </View>
  );
}
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <FarmTabBar {...props} />} screenOptions={{ headerShown: false }}>
      {Object.entries(items).map(([name, item]) => (
        <Tabs.Screen key={name} name={name} options={{ title: item.title }} />
      ))}
    </Tabs>
  );
}
