import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { readSnapshot } from '@/db/queries';
import { emptySnapshot, type Snapshot } from '@/types';
import { errorMessage, log } from '@/utils/logger';
import { today } from '@/utils/format';
import { scheduleVaccineReminder } from '@/utils/notifications';
interface FarmContextValue {
  data: Snapshot;
  loading: boolean;
  busy: boolean;
  error: string | null;
  notice: string | null;
  refresh: () => Promise<void>;
  mutate: <T>(action: string, work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
  enableNotifications: () => Promise<void>;
}
const Context = createContext<FarmContextValue | null>(null);
export function FarmProvider({ children }: React.PropsWithChildren) {
  const db = useSQLiteContext();
  const [data, setData] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const current = useRef(data);
  const day = useRef(today());
  const enqueue = useCallback(<T,>(work: () => Promise<T>): Promise<T> => {
    const job = queue.current.catch(() => undefined).then(work);
    queue.current = job;
    return job;
  }, []);
  const load = useCallback(async () => {
    const snapshot = await readSnapshot(db);
    current.current = snapshot;
    setData(snapshot);
    setError(null);
    return snapshot;
  }, [db]);
  const sync = useCallback(async (snapshot: Snapshot, request = false) => {
    setNotice(await scheduleVaccineReminder(snapshot, request));
  }, []);
  const refresh = useCallback(
    () =>
      enqueue(async () => {
        try {
          const snapshot = await load();
          void sync(snapshot);
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setLoading(false);
        }
      }),
    [enqueue, load, sync],
  );
  const mutate = useCallback(
    <T,>(action: string, work: (tx: SQLiteDatabase) => Promise<T>): Promise<T> =>
      enqueue(async () => {
        setBusy(true);
        log(`${action}: bắt đầu`);
        try {
          let result!: T;
          await db.withTransactionAsync(async () => {
            result = await work(db);
          });
          log(`${action}: commit thành công`);
          try {
            const snapshot = await load();
            void sync(snapshot);
          } catch (e) {
            setError('Đã lưu dữ liệu. Kéo xuống để tải lại màn hình.');
            log('error: tải lại sau khi lưu', e);
          }
          return result;
        } catch (e) {
          log(`${action}: rollback / error`, e);
          throw e;
        } finally {
          setBusy(false);
        }
      }),
    [db, enqueue, load, sync],
  );
  const enableNotifications = useCallback(() => sync(current.current, true), [sync]);
  useEffect(() => {
    void refresh();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    const timer = setInterval(() => {
      const now = today();
      if (day.current !== now) {
        day.current = now;
        void refresh();
      }
    }, 30000);
    return () => {
      listener.remove();
      clearInterval(timer);
    };
  }, [refresh]);
  return (
    <Context.Provider
      value={{ data, loading, busy, error, notice, refresh, mutate, enableNotifications }}
    >
      {children}
    </Context.Provider>
  );
}
export function useFarm(): FarmContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('Không tìm thấy dữ liệu trại.');
  return value;
}
