/**
 * Halokatli xatoni TELEFONDA saqlash (2026-09-18, do'kon auditi A27).
 *
 * ── MUAMMO ──────────────────────────────────────────────────────
 *
 * `error-log.ts` xatoni serverga `fetch` bilan yuboradi. Halokatli
 * xatoda (`fatal`) ilova o'sha zahoti yopiladi va so'rov YO'LDA
 * qoladi — ya'ni ilovani yiqitgan xato hech qachon ko'rinmaydi.
 * Aynan eng muhim xato yo'qoladi.
 *
 * ── YECHIM ──────────────────────────────────────────────────────
 *
 * Xato avval diskka SINXRON yoziladi, keyin yuborishga uriniladi.
 * Keyingi ochilishda saqlangani yuboriladi va o'chiriladi.
 *
 * ── NEGA SQLITE, VA NEGA ALOHIDA FAYL ──────────────────────────
 *
 * `AsyncStorage` va `expo-file-system` — ikkalasi ham ASINXRON:
 * yopilib borayotgan ilovada ular ham ulgurmaydi. `expo-sqlite` da
 * esa `runSync` bor va u shu yerda ishlatiladi.
 *
 * Fayl `furam.db` dan ALOHIDA (`furam-crash.db`): asosiy baza
 * chiqishda tozalanadi (`wipeLocal`), halokat yozuvi esa
 * tozalanmasligi kerak — u foydalanuvchining ma'lumoti emas,
 * nosozlik haqidagi texnik yozuv.
 *
 * ── SHAXSIY MA'LUMOT YOZILMAYDI ─────────────────────────────────
 *
 * Faqat xabar, stek va ekran nomi. Token, telefon raqam yoki
 * foydalanuvchi kiritgan matn bu yerga tushmaydi.
 */
import * as SQLite from "expo-sqlite";

/** Ko'pi bilan shuncha yozuv saqlanadi — disk to'lib ketmasin */
const MAX = 20;

let db: SQLite.SQLiteDatabase | null = null;

function open(): SQLite.SQLiteDatabase | null {
  if (db) return db;
  try {
    const d = SQLite.openDatabaseSync("furam-crash.db");
    d.execSync(`
      CREATE TABLE IF NOT EXISTS crash (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        stack TEXT,
        path TEXT,
        at INTEGER NOT NULL
      );
    `);
    db = d;
    return d;
  } catch {
    /* Baza ochilmasa halokat yozuvi yo'qoladi, lekin ilova
       yiqilishining ustiga yana bir xato qo'shilmaydi */
    return null;
  }
}

export type Crash = { id: number; message: string; stack: string | null; path: string | null; at: number };

/** SINXRON yozish — ilova yopilib borayotgan paytda ham ulguradi */
export function crashSave(message: string, stack?: string | null, path?: string | null): void {
  try {
    const d = open();
    if (!d) return;
    d.runSync("INSERT INTO crash (message, stack, path, at) VALUES (?, ?, ?, ?)", [
      message.slice(0, 500),
      stack ? stack.slice(0, 4000) : null,
      path ?? null,
      Date.now(),
    ]);
    /* Eng eskilarini kesib turamiz: halqaga tushgan ilova minglab
       yozuv yozib, diskni to'ldirib qo'ymasin */
    d.runSync(
      "DELETE FROM crash WHERE id NOT IN (SELECT id FROM crash ORDER BY id DESC LIMIT ?)",
      [MAX],
    );
  } catch {
    /* jim */
  }
}

/** Saqlangan yozuvlar — keyingi ochilishda yuborish uchun */
export function crashList(): Crash[] {
  try {
    const d = open();
    if (!d) return [];
    return d.getAllSync<Crash>("SELECT id, message, stack, path, at FROM crash ORDER BY id");
  } catch {
    return [];
  }
}

/** Yuborilganini o'chirish */
export function crashDone(ids: number[]): void {
  if (!ids.length) return;
  try {
    const d = open();
    if (!d) return;
    d.runSync(`DELETE FROM crash WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
  } catch {
    /* jim */
  }
}
