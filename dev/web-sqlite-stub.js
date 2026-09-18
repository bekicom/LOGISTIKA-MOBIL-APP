/**
 * `expo-sqlite` ning WEB uchun o'rinbosari — faqat brauzerda sinash uchun
 * (2026-09-19).
 *
 * NEGA: SDK 57 da `expo-sqlite` web'da ishchi (worker) va WASM talab
 * qiladi; Metro uni yig'olmay «Worker chunk not found» bilan yiqiladi va
 * ilova brauzerda umuman ochilmaydi. Brauzerda esa bizga kesh kerak emas —
 * ekranlarni bosib sinash kerak.
 *
 * Shuning uchun web'da baza deyarli «bo'sh»: yozish jimgina o'tadi,
 * o'qish bo'sh qaytadi. `metro.config.js` bu faylni FAQAT `web`
 * platformasida ulaydi — telefon va do'kon build'iga tegmaydi.
 *
 * ── NAVBAT (`outbox`) — XOTIRADA ────────────────────────────────
 *
 * Bitta istisno: chiqish navbati. Matnli xabar, xarajat, hujjat va reys
 * holati `sendOrQueue` orqali FAQAT shu jadvaldan o'tib ketadi. Bo'sh
 * bazada ular hech qachon yuborilmasdi, `sendOrQueue` esa «ketdi» deb
 * qaytarardi — brauzerda chatga yozib bo'lmasdi (TZ-08 sinovida
 * ko'rindi). Endi `lib/outbox.ts` ishlatadigan so'rovlar xotiradagi
 * jadvalda bajariladi; sahifa yangilansa navbat tozalanadi.
 */
const outbox = new Map();

const norm = (sql) => sql.replace(/\s+/g, " ").trim();
/* `runAsync(sql, a, b)` ham, `runAsync(sql, [a, b])` ham bo'ladi */
const args = (p) => (p.length === 1 && Array.isArray(p[0]) ? p[0] : p);
const tartib = (a, b) => a.priority - b.priority || a.createdAt - b.createdAt;

function run(sql, p) {
  const q = norm(sql);
  if (/^INSERT INTO outbox /i.test(q)) {
    const [id, kind, path, method, body, files, priority, createdAt] = p;
    outbox.set(id, { id, kind, path, method, body, files, priority, tries: 0, lastError: null, failed: 0, nextAt: 0, createdAt });
  } else if (/^DELETE FROM outbox WHERE id = \?$/i.test(q)) {
    outbox.delete(p[0]);
  } else if (/^UPDATE outbox SET failed = 0, tries = 0, nextAt = 0, lastError = NULL WHERE id = \?$/i.test(q)) {
    const r = outbox.get(p[0]);
    if (r) Object.assign(r, { failed: 0, tries: 0, nextAt: 0, lastError: null });
  } else if (/^UPDATE outbox SET failed = 1, lastError = \? WHERE id = \?$/i.test(q)) {
    const r = outbox.get(p[1]);
    if (r) Object.assign(r, { failed: 1, lastError: p[0] });
  } else if (/^UPDATE outbox SET tries = tries \+ 1, nextAt = \?, lastError = \? WHERE id = \?$/i.test(q)) {
    const r = outbox.get(p[2]);
    if (r) Object.assign(r, { tries: r.tries + 1, nextAt: p[0], lastError: p[1] });
  }
  return { lastInsertRowId: 0, changes: 0 };
}

function all(sql, p) {
  const q = norm(sql);
  if (!/ FROM outbox\b/i.test(q)) return [];
  const rows = [...outbox.values()].map((r) => ({ ...r }));
  if (/SUM\(CASE WHEN failed = 0/i.test(q)) {
    return [{ pending: rows.filter((r) => !r.failed).length, failed: rows.filter((r) => r.failed).length }];
  }
  if (/WHERE id = \?$/i.test(q)) return rows.filter((r) => r.id === p[0]);
  if (/WHERE failed = 0 AND nextAt <= \? AND priority <= \?/i.test(q)) {
    return rows.filter((r) => r.failed === 0 && r.nextAt <= p[0] && r.priority <= p[1]).sort(tartib).slice(0, 25);
  }
  if (/ORDER BY failed DESC/i.test(q)) return rows.sort((a, b) => b.failed - a.failed || tartib(a, b)).slice(0, 100);
  return [];
}

function db() {
  return {
    execAsync: async () => {},
    runAsync: async (sql, ...p) => run(sql, args(p)),
    getAllAsync: async (sql, ...p) => all(sql, args(p)),
    getFirstAsync: async (sql, ...p) => all(sql, args(p))[0] ?? null,
    withTransactionAsync: async (fn) => fn(),
    closeAsync: async () => {},
    execSync: () => {},
    runSync: (sql, ...p) => run(sql, args(p)),
    getAllSync: (sql, ...p) => all(sql, args(p)),
    getFirstSync: (sql, ...p) => all(sql, args(p))[0] ?? null,
    closeSync: () => {},
  };
}

module.exports = {
  openDatabaseAsync: async () => db(),
  openDatabaseSync: () => db(),
};
