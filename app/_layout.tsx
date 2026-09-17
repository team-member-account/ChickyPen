import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { PaperProvider, Text, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Notifications from 'expo-notifications';
import { theme, colors } from '@/constants/colors';
import { initializeDatabase } from '@/db/schema';
import { FarmProvider } from '@/providers/FarmProvider';
import { log } from '@/utils/logger';
class AppBoundary extends React.Component<React.PropsWithChildren, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error: Error) {
    log('error: giao diện', error);
  }
  render() {
    if (this.state.error)
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 28,
            gap: 16,
            backgroundColor: colors.cream,
          }}
        >
          <Text style={{ fontSize: 23, fontWeight: '700' }}>Chưa thể mở ChickyPen</Text>
          <Text>Dữ liệu đã lưu vẫn được giữ nguyên. Vui lòng thử lại.</Text>
          <Button mode="contained" onPress={() => this.setState({ error: false })}>
            Thử lại
          </Button>
        </View>
      );
    return this.props.children;
  }
}
function Routes() {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      if (response.notification.request.identifier.startsWith('chickypen-')) {
        log('notification open');
        router.push('/health');
      }
    };
    const listener = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (r) {
          open(r);
          void Notifications.clearLastNotificationResponseAsync().catch((e) =>
            log('notification clear error', e),
          );
        }
      })
      .catch((e) => log('notification response error', e));
    return () => listener.remove();
  }, []);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="flock/[id]" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
export default function RootLayout() {
  const [loaded, fontError] = useFonts(MaterialCommunityIcons.font);
  const [dbError, setDbError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <SafeAreaProvider>
      <PaperProvider
        theme={theme}
        settings={{
          icon: (props) => (
            <MaterialCommunityIcons
              {...props}
              name={props.name as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
            />
          ),
        }}
      >
        <StatusBar style="dark" />
        <AppBoundary>
          {!loaded && !fontError ? (
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.cream }}>
              <ActivityIndicator />
              <Text style={{ textAlign: 'center', marginTop: 16 }}>Đang mở ChickyPen…</Text>
            </View>
          ) : dbError ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: 28,
                gap: 16,
                backgroundColor: colors.cream,
              }}
            >
              <Text style={{ fontSize: 23, fontWeight: '700' }}>Chưa thể đọc dữ liệu</Text>
              <Text>Ứng dụng giữ nguyên cơ sở dữ liệu, không xóa dữ liệu khi có lỗi.</Text>
              <Button
                mode="contained"
                onPress={() => {
                  setDbError(false);
                  setAttempt((n) => n + 1);
                }}
              >
                Thử lại
              </Button>
            </View>
          ) : (
            <SQLiteProvider
              key={attempt}
              databaseName="chickypen.db"
              onInit={initializeDatabase}
              onError={(e) => {
                log('error: SQLite initialization', e);
                setDbError(true);
              }}
            >
              <FarmProvider>
                <Routes />
              </FarmProvider>
            </SQLiteProvider>
          )}
        </AppBoundary>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
