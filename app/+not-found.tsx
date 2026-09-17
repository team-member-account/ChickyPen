import React from 'react';
import { router } from 'expo-router';
import { Screen, Empty, Action } from '@/components/ui';
export default function NotFound() {
  return (
    <Screen title="Không tìm thấy trang">
      <Empty text="Trang này không còn tồn tại." />
      <Action label="Về tổng quan" icon="home-outline" onPress={() => router.replace('/')} />
    </Screen>
  );
}
