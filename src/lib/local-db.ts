/**
 * Telefondagi baza — offline ish uchun.
 *
 * Ikkita jadval, ikki xil maqsad:
 *
 *   `outbox` — YUBORILMAGAN yozuvlar. Aloqa qaytganda ketadi.
 *   `cache`  — OXIRGI o'qilgan javoblar. Aloqa yo'qda ko'rsatiladi.
 *
 * Bitta faylda ochiladi: ikkalasi ham bitta ulanishdan foydalanadi
 * va SQLite'da ikkinchi ulanish ochish bekorga xotira yeydi.
 */
import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  /* Bir vaqtda ikkita chaqiruv kelsa, ikkita ulanish ochilib
     ketmasin: birinchisi va'dani qoldiradi, qolgani shuni kutadi. */
  if (opening) return opening;

  opening = (async () => {
    const d = await SQLite.openDatabaseAsync("furam.db");
    await d.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        path TEXT NOT NULL,
        method TEXT NOT NULL,
        body TEXT,
        files TEXT,
        priority INTEGER NOT NULL DEFAULT 2,
        tries INTEGER NOT NULL DEFAULT 0,
        lastError TEXT,
        failed INTEGER NOT NULL DEFAULT 0,
        nextAt INTEGER NOT NULL DEFAULT 0,
        createdAt INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS outbox_order ON outbox(failed, priority, createdAt);

      CREATE TABLE IF NOT EXISTS cache (
        path TEXT PRIMARY KEY NOT NULL,
        body TEXT NOT NULL,
        at INTEGER NOT NULL
      );
    `);
    db = d;
    return d;
  })();

  return opening;
}

/** Chiqishda: navbat ham, kesh ham boshqa odamga o'tmasin */
export async function wipeLocal(): Promise<void> {
  const d = await openDb();
  await d.execAsync(`DELETE FROM outbox; DELETE FROM cache;`);
}
