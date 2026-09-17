import type { SQLiteDatabase } from 'expo-sqlite';
import { log } from '@/utils/logger';
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(
    'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;',
  );
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((version?.user_version ?? 0) > 1)
    throw new Error('Dữ liệu thuộc phiên bản mới hơn. Vui lòng cập nhật ChickyPen.');
  if (version?.user_version === 1) return;
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      CREATE TABLE flocks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, breed TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('meat','layer','breeder')), entry_date TEXT NOT NULL, initial_count INTEGER NOT NULL CHECK(initial_count > 0), notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold')), archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)));
      CREATE TABLE movements (id INTEGER PRIMARY KEY AUTOINCREMENT, flock_id INTEGER NOT NULL REFERENCES flocks(id) ON DELETE RESTRICT, kind TEXT NOT NULL CHECK(kind IN ('initial','add','sale','death')), quantity INTEGER NOT NULL CHECK(quantity > 0), date TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 0 CHECK(amount >= 0));
      CREATE UNIQUE INDEX one_initial_per_flock ON movements(flock_id) WHERE kind = 'initial';
      CREATE INDEX movements_flock_date ON movements(flock_id,date);
      CREATE TABLE eggs (id INTEGER PRIMARY KEY AUTOINCREMENT, flock_id INTEGER NOT NULL REFERENCES flocks(id) ON DELETE RESTRICT, date TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity >= 0), notes TEXT NOT NULL DEFAULT '', UNIQUE(flock_id,date));
      CREATE INDEX eggs_date ON eggs(date);
      CREATE TABLE feeds (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL COLLATE NOCASE UNIQUE, unit TEXT NOT NULL CHECK(unit IN ('kg','túi','bao')), threshold REAL NOT NULL DEFAULT 0 CHECK(threshold >= 0));
      CREATE TABLE feed_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE RESTRICT, flock_id INTEGER REFERENCES flocks(id) ON DELETE RESTRICT, kind TEXT NOT NULL CHECK(kind IN ('purchase','consume')), quantity REAL NOT NULL CHECK(quantity > 0), unit_price INTEGER NOT NULL DEFAULT 0 CHECK(unit_price >= 0), date TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '');
      CREATE INDEX feed_entries_feed_date ON feed_entries(feed_id,date);
      CREATE TABLE vaccines (id INTEGER PRIMARY KEY AUTOINCREMENT, flock_id INTEGER NOT NULL REFERENCES flocks(id) ON DELETE RESTRICT, name TEXT NOT NULL, due_date TEXT NOT NULL, booster_date TEXT, done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)), booster_done INTEGER NOT NULL DEFAULT 0 CHECK(booster_done IN (0,1)), completed_date TEXT, booster_completed_date TEXT, notes TEXT NOT NULL DEFAULT '');
      CREATE INDEX vaccines_due ON vaccines(due_date,booster_date);
      CREATE TABLE finances (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL CHECK(kind IN ('income','expense')), category TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount >= 0), date TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', source_type TEXT CHECK(source_type IN ('feed','movement')), source_id INTEGER, UNIQUE(source_type,source_id), CHECK((source_type IS NULL) = (source_id IS NULL)));
      CREATE INDEX finances_date ON finances(date);
      PRAGMA user_version = 1;
    `);
  });
  log('insert: khởi tạo SQLite phiên bản 1');
}
