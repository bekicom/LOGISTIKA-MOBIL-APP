/**
 * O'QISH KESHI — aloqa yo'qda ko'rsatiladigan oxirgi javob.
 *
 * NEGA KERAK: chegarada haydovchi reysini, hujjatlarini va chat
 * tarixini KO'RA olishi kerak. Ularsiz ilova bo'sh ekran va
 * «Internetga ulanmadi» yozuvidan iborat bo'lib qolardi — aynan
 * o'sha paytda esa unga kerakli ma'lumot allaqachon telefonda
 * bo'lgan, faqat saqlanmagan.
 *
 * NIMA KESHLANADI: faqat GET javoblari va faqat MUVAFFAQIYATLI
 * bo'lgani. Xato javob keshga tushmaydi — aks holda bir marta
 * chiqqan xato aloqasiz paytda abadiy ko'rinib turardi.
 *
 * NIMA KESHLANMAYDI: qidiruv va lenta (`?q=`, `page=` bilan). Ular
 * har safar boshqacha va keshda saqlansa, joy egallab, foydasi
 * bo'lmasdi — offline'da qidiruv baribir ishlamaydi.
 */
import { openDb } from "./local-db";

/** Kesh javobi va u qachon olingani */
export type Cached<T> = { body: T; at: number };

const SKIP = [/\?q=/, /[?&]page=/, /\/api\/locations/, /\/api\/ai\//];

export function cacheable(path: string): boolean {
  return !SKIP.some((re) => re.test(path));
}

export async function putCache(path: string, body: unknown): Promise<void> {
  if (!cacheable(path)) return;
  const d = await openDb();
  await d.runAsync(
    `INSERT INTO cache (path, body, at) VALUES (?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET body = excluded.body, at = excluded.at`,
    path,
    JSON.stringify(body),
    Date.now(),
  );
}

export async function getCache<T>(path: string): Promise<Cached<T> | null> {
  const d = await openDb();
  const row = await d.getFirstAsync<{ body: string; at: number }>(
    `SELECT body, at FROM cache WHERE path = ?`,
    path,
  );
  if (!row) return null;
  try {
    return { body: JSON.parse(row.body) as T, at: row.at };
  } catch {
    return null;
  }
}
