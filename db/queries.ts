import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Snapshot,
  Flock,
  Movement,
  Egg,
  Feed,
  FeedEntry,
  Vaccine,
  Finance,
  FlockInput,
  MovementInput,
  EggInput,
  FeedInput,
  FeedEntryInput,
  VaccineInput,
  FinanceInput,
} from '@/types';
import { assertDate, assertNumber, required, today } from '@/utils/format';
import { expenseCategories, incomeCategories } from '@/constants/categories';
import { log } from '@/utils/logger';

type DB = SQLiteDatabase;
async function one<T>(db: DB, table: string, id: number): Promise<T> {
  const row = await db.getFirstAsync<T>(`SELECT * FROM ${table} WHERE id = ?`, id);
  if (!row) throw new Error('Bản ghi không còn tồn tại.');
  return row;
}
export async function readSnapshot(db: DB): Promise<Snapshot> {
  const [flocks, movements, eggs, feeds, feedEntries, vaccines, finances] = await Promise.all([
    db.getAllAsync<Flock>('SELECT * FROM flocks ORDER BY archived, entry_date DESC, id DESC'),
    db.getAllAsync<Movement>('SELECT * FROM movements ORDER BY date DESC, id DESC'),
    db.getAllAsync<Egg>('SELECT * FROM eggs ORDER BY date DESC, id DESC'),
    db.getAllAsync<Feed>('SELECT * FROM feeds ORDER BY name COLLATE NOCASE'),
    db.getAllAsync<FeedEntry>('SELECT * FROM feed_entries ORDER BY date DESC, id DESC'),
    db.getAllAsync<Vaccine>('SELECT * FROM vaccines ORDER BY due_date, id'),
    db.getAllAsync<Finance>('SELECT * FROM finances ORDER BY date DESC, id DESC'),
  ]);
  return { flocks, movements, eggs, feeds, feedEntries, vaccines, finances };
}
async function activeFlock(db: DB, id: number, date?: string): Promise<Flock> {
  const f = await one<Flock>(db, 'flocks', id);
  if (f.archived || f.status !== 'active')
    throw new Error('Lô này đã xuất hoặc lưu trữ. Hãy mở lại lô để ghi phát sinh.');
  if (date && date < f.entry_date) throw new Error('Ngày phát sinh không được trước ngày nhập lô.');
  return f;
}
async function validateFlockHistory(db: DB, flockId: number): Promise<void> {
  const f = await one<Flock>(db, 'flocks', flockId);
  const rows = await db.getAllAsync<{ date: string; delta: number }>(
    `SELECT date, SUM(CASE WHEN kind IN ('initial','add') THEN quantity ELSE -quantity END) delta FROM movements WHERE flock_id=? GROUP BY date ORDER BY date`,
    flockId,
  );
  let count = 0;
  for (const r of rows) {
    if (r.date < f.entry_date) throw new Error('Lịch sử không được trước ngày nhập lô.');
    count += r.delta;
    if (count < 0) throw new Error('Thay đổi này làm số gà bị âm trong lịch sử.');
  }
  if ((f.archived || f.status === 'sold') && count !== 0)
    throw new Error('Hãy mở lại lô trước khi thay đổi số lượng còn nuôi.');
  const invalid = await db.getFirstAsync<{ id: number }>(
    `SELECT e.id FROM eggs e WHERE e.flock_id=? AND (e.date < ? OR (e.quantity > 0 AND (SELECT COALESCE(SUM(CASE WHEN m.kind IN ('initial','add') THEN m.quantity ELSE -m.quantity END),0) FROM movements m WHERE m.flock_id=e.flock_id AND m.date<=e.date)<=0)) LIMIT 1`,
    flockId,
    f.entry_date,
  );
  if (invalid)
    throw new Error(
      'Thay đổi này không phù hợp với bản ghi trứng đã có. Hãy sửa bản ghi trứng trước.',
    );
  const early = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM feed_entries WHERE flock_id=? AND date<? UNION ALL SELECT id FROM vaccines WHERE flock_id=? AND due_date<? LIMIT 1',
    flockId,
    f.entry_date,
    flockId,
    f.entry_date,
  );
  if (early) throw new Error('Ngày nhập lô phải trước các lần tiêu thụ và tiêm phòng đã ghi.');
}
async function validateStock(db: DB, feedId: number): Promise<void> {
  const rows = await db.getAllAsync<{ delta: number }>(
    `SELECT SUM(CASE WHEN kind='purchase' THEN quantity ELSE -quantity END) delta FROM feed_entries WHERE feed_id=? GROUP BY date ORDER BY date`,
    feedId,
  );
  let stock = 0;
  for (const row of rows) {
    stock += row.delta;
    if (stock < -0.000001)
      throw new Error('Không đủ thức ăn tại ngày này. Thay đổi làm tồn kho bị âm trong lịch sử.');
  }
}
async function linkedFinance(
  db: DB,
  source: 'feed' | 'movement',
  sourceId: number,
  v: FinanceInput | null,
): Promise<void> {
  if (!v) {
    await db.runAsync('DELETE FROM finances WHERE source_type=? AND source_id=?', source, sourceId);
    log('delete: khoản thu chi liên kết', { source, sourceId });
    return;
  }
  assertNumber(v.amount, 'Số tiền', true, true);
  await db.runAsync(
    `INSERT INTO finances(kind,category,amount,date,notes,source_type,source_id) VALUES(?,?,?,?,?,?,?) ON CONFLICT(source_type,source_id) DO UPDATE SET kind=excluded.kind, category=excluded.category, amount=excluded.amount, date=excluded.date, notes=excluded.notes`,
    v.kind,
    v.category,
    v.amount,
    v.date,
    v.notes,
    source,
    sourceId,
  );
  log('insert/update: khoản thu chi liên kết', { source, sourceId, amount: v.amount });
}
// FarmProvider serializes every database read/write and wraps mutations in a transaction.
// Use the initialized connection so its foreign_keys pragma remains enabled.
export async function saveFlock(db: DB, v: FlockInput, id?: number): Promise<number> {
  const name = required(v.name, 'Tên lô');
  const breed = required(v.breed, 'Giống gà');
  assertNumber(v.initial_count, 'Số lượng ban đầu', true);
  assertDate(v.entry_date);
  if (!['meat', 'layer', 'breeder'].includes(v.type)) throw new Error('Loại gà không hợp lệ.');
  if (id) {
    const old = await one<Flock>(db, 'flocks', id);
    if (
      old.type !== v.type &&
      (await db.getFirstAsync('SELECT id FROM eggs WHERE flock_id=? LIMIT 1', id))
    )
      throw new Error('Không đổi loại gà khi lô đã có bản ghi trứng.');
    await db.runAsync(
      'UPDATE flocks SET name=?,breed=?,type=?,entry_date=?,initial_count=?,notes=? WHERE id=?',
      name,
      breed,
      v.type,
      v.entry_date,
      v.initial_count,
      v.notes,
      id,
    );
    await db.runAsync(
      "UPDATE movements SET quantity=?,date=? WHERE flock_id=? AND kind='initial'",
      v.initial_count,
      v.entry_date,
      id,
    );
    await validateFlockHistory(db, id);
    log('update: lô và số lượng ban đầu', { id });
    return id;
  }
  const result = await db.runAsync(
    'INSERT INTO flocks(name,breed,type,entry_date,initial_count,notes) VALUES(?,?,?,?,?,?)',
    name,
    breed,
    v.type,
    v.entry_date,
    v.initial_count,
    v.notes,
  );
  await db.runAsync(
    "INSERT INTO movements(flock_id,kind,quantity,date,reason) VALUES(?,'initial',?,?,'Nhập đàn ban đầu')",
    result.lastInsertRowId,
    v.initial_count,
    v.entry_date,
  );
  log('insert: lô và lịch sử nhập đàn', { id: result.lastInsertRowId });
  return result.lastInsertRowId;
}
export async function changeFlockStatus(
  db: DB,
  id: number,
  status: 'active' | 'sold',
  archive = false,
): Promise<void> {
  await one<Flock>(db, 'flocks', id);
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COALESCE(SUM(CASE WHEN kind IN ('initial','add') THEN quantity ELSE -quantity END),0) count FROM movements WHERE flock_id=?",
    id,
  );
  if ((status === 'sold' || archive) && row?.count !== 0)
    throw new Error('Lô vẫn còn gà. Ghi đủ xuất bán hoặc gà chết trước khi đóng lô.');
  await db.runAsync(
    'UPDATE flocks SET status=?,archived=? WHERE id=?',
    status,
    archive ? 1 : 0,
    id,
  );
  log('update: trạng thái lô', { id, status, archive });
}
export async function deleteFlock(db: DB, id: number): Promise<void> {
  const rows = await db.getFirstAsync<{ count: number }>(
    `SELECT (SELECT COUNT(*) FROM movements WHERE flock_id=? AND kind<>'initial')+(SELECT COUNT(*) FROM eggs WHERE flock_id=?)+(SELECT COUNT(*) FROM feed_entries WHERE flock_id=?)+(SELECT COUNT(*) FROM vaccines WHERE flock_id=?) count`,
    id,
    id,
    id,
    id,
  );
  if (rows?.count)
    throw new Error('Lô đã có lịch sử sử dụng. Hãy đóng và lưu trữ lô để giữ báo cáo.');
  await db.runAsync('DELETE FROM movements WHERE flock_id=?', id);
  await db.runAsync('DELETE FROM flocks WHERE id=?', id);
  log('delete: lô chưa có phát sinh', { id });
}
export async function saveMovement(db: DB, v: MovementInput, id?: number): Promise<void> {
  assertDate(v.date);
  assertNumber(v.quantity, 'Số gà', true);
  assertNumber(v.amount, 'Doanh thu', true, true);
  if (v.kind === 'initial') throw new Error('Sửa số lượng ban đầu trong thông tin lô.');
  const flock = await activeFlock(db, v.flock_id, v.date);
  if (v.kind === 'death' || v.kind === 'sale') required(v.reason, 'Lý do');
  if (id) {
    const old = await one<Movement>(db, 'movements', id);
    if (old.kind === 'initial' || old.flock_id !== v.flock_id)
      throw new Error('Không được đổi lô của lịch sử.');
  }
  const amount = v.kind === 'sale' ? v.amount : 0;
  if (id)
    await db.runAsync(
      'UPDATE movements SET kind=?,quantity=?,date=?,reason=?,amount=? WHERE id=?',
      v.kind,
      v.quantity,
      v.date,
      v.reason,
      amount,
      id,
    );
  else
    id = (
      await db.runAsync(
        'INSERT INTO movements(flock_id,kind,quantity,date,reason,amount) VALUES(?,?,?,?,?,?)',
        v.flock_id,
        v.kind,
        v.quantity,
        v.date,
        v.reason,
        amount,
      )
    ).lastInsertRowId;
  await validateFlockHistory(db, v.flock_id);
  await linkedFinance(
    db,
    'movement',
    id,
    v.kind === 'sale' && amount > 0
      ? {
          kind: 'income',
          category: flock.type === 'breeder' ? 'Bán gà giống' : 'Bán gà thịt',
          amount,
          date: v.date,
          notes: `Xuất bán ${v.quantity} con · ${flock.name}. ${v.reason}`,
        }
      : null,
  );
  log('insert/update: biến động đàn', { id, kind: v.kind, quantity: v.quantity });
}
export async function deleteMovement(db: DB, id: number): Promise<void> {
  const old = await one<Movement>(db, 'movements', id);
  if (old.kind === 'initial') throw new Error('Không xóa lần nhập đàn ban đầu.');
  await activeFlock(db, old.flock_id);
  await db.runAsync('DELETE FROM movements WHERE id=?', id);
  await validateFlockHistory(db, old.flock_id);
  await linkedFinance(db, 'movement', id, null);
  log('delete: biến động đàn', { id });
}
export async function saveEgg(db: DB, v: EggInput, id?: number): Promise<void> {
  assertDate(v.date);
  assertNumber(v.quantity, 'Số trứng', true, true);
  const f = await activeFlock(db, v.flock_id, v.date);
  if (f.type !== 'layer') throw new Error('Chỉ ghi trứng cho lô gà đẻ.');
  const duplicate = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM eggs WHERE flock_id=? AND date=? AND id<>?',
    v.flock_id,
    v.date,
    id ?? -1,
  );
  if (duplicate) throw new Error('Lô này đã ghi trứng trong ngày. Hãy sửa bản ghi đang có.');
  if (id) {
    await one<Egg>(db, 'eggs', id);
    await db.runAsync(
      'UPDATE eggs SET flock_id=?,date=?,quantity=?,notes=? WHERE id=?',
      v.flock_id,
      v.date,
      v.quantity,
      v.notes,
      id,
    );
  } else
    id = (
      await db.runAsync(
        'INSERT INTO eggs(flock_id,date,quantity,notes) VALUES(?,?,?,?)',
        v.flock_id,
        v.date,
        v.quantity,
        v.notes,
      )
    ).lastInsertRowId;
  await validateFlockHistory(db, v.flock_id);
  log('insert/update: sản lượng trứng', { id, quantity: v.quantity });
}
export async function deleteEgg(db: DB, id: number): Promise<void> {
  await db.runAsync('DELETE FROM eggs WHERE id=?', id);
  log('delete: sản lượng trứng', { id });
}
export async function saveFeed(db: DB, v: FeedInput, id?: number): Promise<void> {
  const name = required(v.name, 'Tên thức ăn');
  assertNumber(v.threshold, 'Ngưỡng cảnh báo', false, true);
  if (!['kg', 'túi', 'bao'].includes(v.unit)) throw new Error('Đơn vị thức ăn không hợp lệ.');
  if (
    await db.getFirstAsync(
      'SELECT id FROM feeds WHERE name=? COLLATE NOCASE AND id<>?',
      name,
      id ?? -1,
    )
  )
    throw new Error('Tên thức ăn này đã tồn tại.');
  if (id) {
    const old = await one<Feed>(db, 'feeds', id);
    if (
      old.unit !== v.unit &&
      (await db.getFirstAsync('SELECT id FROM feed_entries WHERE feed_id=? LIMIT 1', id))
    )
      throw new Error(
        'Không đổi đơn vị khi đã có lịch sử kho. Tạo loại thức ăn mới để dùng đơn vị khác.',
      );
    await db.runAsync(
      'UPDATE feeds SET name=?,unit=?,threshold=? WHERE id=?',
      name,
      v.unit,
      v.threshold,
      id,
    );
  } else
    id = (
      await db.runAsync(
        'INSERT INTO feeds(name,unit,threshold) VALUES(?,?,?)',
        name,
        v.unit,
        v.threshold,
      )
    ).lastInsertRowId;
  log('insert/update: danh mục thức ăn', { id });
}
export async function deleteFeed(db: DB, id: number): Promise<void> {
  if (await db.getFirstAsync('SELECT id FROM feed_entries WHERE feed_id=? LIMIT 1', id))
    throw new Error('Thức ăn đã có lịch sử nhập hoặc tiêu thụ, không thể xóa.');
  await db.runAsync('DELETE FROM feeds WHERE id=?', id);
  log('delete: danh mục thức ăn', { id });
}
export async function saveFeedEntry(db: DB, v: FeedEntryInput, id?: number): Promise<void> {
  assertDate(v.date);
  assertNumber(v.quantity, 'Số lượng');
  assertNumber(v.unit_price, 'Đơn giá', true, true);
  const feed = await one<Feed>(db, 'feeds', v.feed_id);
  if (v.flock_id) await activeFlock(db, v.flock_id, v.date);
  const old = id ? await one<FeedEntry>(db, 'feed_entries', id) : null;
  const unitPrice = v.kind === 'purchase' ? v.unit_price : 0;
  const flockId = v.kind === 'consume' ? v.flock_id : null;
  if (id)
    await db.runAsync(
      'UPDATE feed_entries SET feed_id=?,flock_id=?,kind=?,quantity=?,unit_price=?,date=?,notes=? WHERE id=?',
      v.feed_id,
      flockId,
      v.kind,
      v.quantity,
      unitPrice,
      v.date,
      v.notes,
      id,
    );
  else
    id = (
      await db.runAsync(
        'INSERT INTO feed_entries(feed_id,flock_id,kind,quantity,unit_price,date,notes) VALUES(?,?,?,?,?,?,?)',
        v.feed_id,
        flockId,
        v.kind,
        v.quantity,
        unitPrice,
        v.date,
        v.notes,
      )
    ).lastInsertRowId;
  await validateStock(db, v.feed_id);
  if (old && old.feed_id !== v.feed_id) await validateStock(db, old.feed_id);
  await linkedFinance(
    db,
    'feed',
    id,
    v.kind === 'purchase'
      ? {
          kind: 'expense',
          category: 'Thức ăn',
          amount: Math.round(v.quantity * unitPrice),
          date: v.date,
          notes: `Nhập ${v.quantity} ${feed.unit} ${feed.name}. ${v.notes}`,
        }
      : null,
  );
  log('insert/update: phát sinh kho', { id, kind: v.kind, quantity: v.quantity });
}
export async function deleteFeedEntry(db: DB, id: number): Promise<void> {
  const old = await one<FeedEntry>(db, 'feed_entries', id);
  await db.runAsync('DELETE FROM feed_entries WHERE id=?', id);
  await validateStock(db, old.feed_id);
  await linkedFinance(db, 'feed', id, null);
  log('delete: phát sinh kho', { id });
}
export async function saveVaccine(db: DB, v: VaccineInput, id?: number): Promise<void> {
  const name = required(v.name, 'Tên vaccine');
  assertDate(v.due_date, true);
  await activeFlock(db, v.flock_id, v.due_date);
  if (v.booster_date) {
    assertDate(v.booster_date, true);
    if (v.booster_date <= v.due_date) throw new Error('Ngày nhắc lại phải sau ngày tiêm đầu.');
  }
  if (id) {
    const old = await one<Vaccine>(db, 'vaccines', id);
    if (
      (old.done || old.booster_done) &&
      (old.flock_id !== v.flock_id || old.name !== name || old.due_date !== v.due_date)
    )
      throw new Error('Bỏ dấu đã tiêm trước khi đổi tên, lô hoặc ngày tiêm đầu.');
    if (old.booster_done && old.booster_date !== v.booster_date)
      throw new Error('Bỏ dấu đã tiêm nhắc lại trước khi đổi ngày.');
    await db.runAsync(
      'UPDATE vaccines SET name=?,flock_id=?,due_date=?,booster_date=?,notes=? WHERE id=?',
      name,
      v.flock_id,
      v.due_date,
      v.booster_date,
      v.notes,
      id,
    );
  } else
    id = (
      await db.runAsync(
        'INSERT INTO vaccines(name,flock_id,due_date,booster_date,notes) VALUES(?,?,?,?,?)',
        name,
        v.flock_id,
        v.due_date,
        v.booster_date,
        v.notes,
      )
    ).lastInsertRowId;
  log('insert/update: lịch vaccine', { id });
}
export async function markVaccine(
  db: DB,
  id: number,
  booster: boolean,
  done: boolean,
): Promise<void> {
  const v = await one<Vaccine>(db, 'vaccines', id);
  if (booster && !v.booster_date) throw new Error('Chưa có lịch nhắc lại.');
  if (booster && done && !v.done) throw new Error('Đánh dấu mũi đầu đã tiêm trước.');
  if (!booster && !done && v.booster_done) throw new Error('Bỏ dấu mũi nhắc lại trước.');
  if (done) await activeFlock(db, v.flock_id, today());
  const date = done ? today() : null;
  if (booster)
    await db.runAsync(
      'UPDATE vaccines SET booster_done=?,booster_completed_date=? WHERE id=?',
      done ? 1 : 0,
      date,
      id,
    );
  else
    await db.runAsync(
      'UPDATE vaccines SET done=?,completed_date=? WHERE id=?',
      done ? 1 : 0,
      date,
      id,
    );
  log('update: hoàn thành vaccine', { id, booster, done });
}
export async function deleteVaccine(db: DB, id: number): Promise<void> {
  await db.runAsync('DELETE FROM vaccines WHERE id=?', id);
  log('delete: lịch vaccine', { id });
}
export async function saveFinance(db: DB, v: FinanceInput, id?: number): Promise<void> {
  assertDate(v.date);
  assertNumber(v.amount, 'Số tiền', true);
  if (!(v.kind === 'income' ? incomeCategories : expenseCategories).includes(v.category))
    throw new Error('Danh mục thu chi không hợp lệ.');
  if (id) {
    const old = await one<Finance>(db, 'finances', id);
    if (old.source_type) throw new Error('Khoản tự động phải sửa tại giao dịch kho hoặc xuất bán.');
    await db.runAsync(
      'UPDATE finances SET kind=?,category=?,amount=?,date=?,notes=? WHERE id=?',
      v.kind,
      v.category,
      v.amount,
      v.date,
      v.notes,
      id,
    );
  } else
    id = (
      await db.runAsync(
        'INSERT INTO finances(kind,category,amount,date,notes) VALUES(?,?,?,?,?)',
        v.kind,
        v.category,
        v.amount,
        v.date,
        v.notes,
      )
    ).lastInsertRowId;
  log('insert/update: thu chi', { id, kind: v.kind, amount: v.amount });
}
export async function deleteFinance(db: DB, id: number): Promise<void> {
  const v = await one<Finance>(db, 'finances', id);
  if (v.source_type) throw new Error('Khoản tự động phải xóa tại giao dịch nguồn.');
  await db.runAsync('DELETE FROM finances WHERE id=?', id);
  log('delete: thu chi', { id });
}
