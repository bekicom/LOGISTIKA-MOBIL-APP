/**
 * OFFLINE NAVBAT — yuborilmagan yozuvlar (2026-09-04).
 *
 * NEGA KERAK: haydovchi Qozog'iston, Rossiya va Xitoy chegaralarida
 * aloqani yo'qotadi. Bu taxmin emas — reysning eng muhim daqiqalari
 * aynan o'sha yerda o'tadi: «chegaraga yetdim», «o'tdim», to'lov
 * cheki, dispetcherga xabar. Navbatsiz ilova bularni shunchaki
 * yo'qotardi va haydovchi buni bilmasdi ham.
 *
 * ⚠️ TAKRORLANISH — ENG XAVFLI HOL. So'rov serverga YETIB BORGAN,
 * javob esa yo'lda yo'qolgan bo'lishi mumkin. Shuning uchun har
 * yozuvning UUID'si bor va u `Idempotency-Key` sifatida ketadi;
 * server o'sha kalitni ikkinchi marta ko'rsa amalni QAYTA
 * BAJARMAYDI (`furam/src/lib/idempotency.ts`). Busiz bitta xarajat
 * ikki marta yozilardi.
 *
 * NEGA SQLite, AsyncStorage EMAS: navbat tartib va ustuvorlik bilan
 * o'qiladi, yozuvlar bittalab o'chiriladi va ular orasida fayl
 * yo'llari bor. AsyncStorage'da butun ro'yxatni har safar o'qib
 * qayta yozishga to'g'ri kelardi — 300 ta GPS nuqtada bu sezilarli.
 */
import * as Crypto from "expo-crypto";
import { openDb } from "./local-db";
import { API_BASE, FuramError, formPart, postForm } from "./api";
import { getToken } from "./session";
import { isOnline, isWifi } from "./net";

export type Upload = { field: string; uri: string; name: string; type: string };

export type Job = {
  id: string;
  kind: string;
  path: string;
  method: string;
  body: string | null;
  files: string | null;
  priority: number;
  tries: number;
  lastError: string | null;
  failed: number;
  nextAt: number;
  createdAt: number;
};

/**
 * Ustuvorlik.
 *
 *  1 — reys holati va GPS. Bularsiz reys tarixi buziladi.
 *  2 — xabar, xarajat, navbat tasdig'i. Muhim, lekin kutishi mumkin.
 *  3 — SURATLAR. Og'ir; Wi-Fi kutadi, chunki chegarada mobil
 *      internet qimmat va sekin — 3 MB surat butun navbatni
 *      to'sib qo'yardi.
 */
export const P_NOW = 1;
export const P_SOON = 2;
export const P_WIFI = 3;

const open = openDb;

/* ─────────────────────────────────────────────── kuzatuvchilar */

type Listener = (n: { pending: number; failed: number }) => void;
const listeners = new Set<Listener>();

export function watchOutbox(fn: Listener): () => void {
  listeners.add(fn);
  void notify();
  return () => listeners.delete(fn);
}

async function notify() {
  const c = await counts();
  for (const fn of listeners) fn(c);
}

export async function counts(): Promise<{ pending: number; failed: number }> {
  const d = await open();
  const row = await d.getFirstAsync<{ pending: number; failed: number }>(
    `SELECT
       SUM(CASE WHEN failed = 0 THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN failed = 1 THEN 1 ELSE 0 END) AS failed
     FROM outbox`,
  );
  return { pending: row?.pending ?? 0, failed: row?.failed ?? 0 };
}

export async function list(): Promise<Job[]> {
  const d = await open();
  return d.getAllAsync<Job>(
    `SELECT * FROM outbox ORDER BY failed DESC, priority ASC, createdAt ASC LIMIT 100`,
  );
}

/* ─────────────────────────────────────────────── navbatga qo'yish */

export type NewJob = {
  kind: string;
  path: string;
  method?: string;
  body?: unknown;
  files?: Upload[];
  priority?: number;
};

export async function enqueue(job: NewJob): Promise<string> {
  const id = Crypto.randomUUID();
  await insert(id, job);
  return id;
}

/* Kalit (`id`) yozuv bilan birga yoziladi va O'ZGARMAYDI. Qayta
   yuborishda o'sha kalit ketadi — server takrorni shundan taniydi. */
async function insert(id: string, job: NewJob): Promise<void> {
  const d = await open();
  await d.runAsync(
    `INSERT INTO outbox (id, kind, path, method, body, files, priority, nextAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    id,
    job.kind,
    job.path,
    job.method ?? "POST",
    job.body === undefined ? null : JSON.stringify(job.body),
    job.files?.length ? JSON.stringify(job.files) : null,
    job.priority ?? P_SOON,
    Date.now(),
  );
  await notify();
}

export async function remove(id: string): Promise<void> {
  const d = await open();
  await d.runAsync(`DELETE FROM outbox WHERE id = ?`, id);
  await notify();
}

/** Xato bergan yozuvni qaytadan navbatga qo'yish */
export async function retry(id: string): Promise<void> {
  const d = await open();
  await d.runAsync(
    `UPDATE outbox SET failed = 0, tries = 0, nextAt = 0, lastError = NULL WHERE id = ?`,
    id,
  );
  await notify();
  void flush();
}

/* ─────────────────────────────────────────────── yuborish */

let running = false;

type Javob = { status: number; text: string };

/**
 * `sendOrQueue` kutayotgan yozuvlar va ularning server JAVOBI.
 *
 * Navbat «yubordim» bilan cheklanmaydi: ba'zi javobda ekran uchun
 * ma'lumot bor — xabar «Unga» tilida tarjimasiz ketgani (`tarjimasiz`,
 * TZ-08) yoki rad etish kodi. Ilgari javob tashlab yuborilardi va
 * suhbat HAR rad etishga bir xil «matnni boshqacha yozib ko'ring»
 * derdi — bloklangan odamga ham.
 *
 * Faqat KUTILAYOTGAN yozuv javobi saqlanadi: fonda ketgan yuzlab GPS
 * to'plamining javobi xotirada to'planib qolmasin.
 */
const kutuvchilar = new Map<string, Javob | null>();

/**
 * Navbatni bo'shatish.
 *
 * Bir vaqtda bitta yurish: ikkita `flush` bir yozuvni ikki marta
 * yuborishi mumkin edi (kalit himoya qiladi, lekin bekorga trafik
 * sarflanardi).
 */
export async function flush(): Promise<void> {
  if (running) return;
  if (!(await isOnline())) return;

  running = true;
  try {
    const d = await open();
    const wifi = await isWifi();
    const now = Date.now();

    const rows = await d.getAllAsync<Job>(
      `SELECT * FROM outbox
       WHERE failed = 0 AND nextAt <= ? AND priority <= ?
       ORDER BY priority ASC, createdAt ASC
       LIMIT 25`,
      now,
      // Og'ir suratlar faqat Wi-Fi'da
      wifi ? P_WIFI : P_SOON,
    );

    for (const job of rows) {
      const ok = await send(job);
      if (!ok) break; // aloqa uzildi — qolgani keyingi urinishda
    }
  } finally {
    running = false;
    await notify();
  }
}

async function send(job: Job): Promise<boolean> {
  const d = await open();
  const token = await getToken();
  const files: Upload[] = job.files ? JSON.parse(job.files) : [];

  const headers: Record<string, string> = {
    "X-Client": "mobile",
    // Takrorni serverda to'xtatadigan kalit
    "Idempotency-Key": job.id,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let status: number;
  let text: string;
  try {
    /* «message» turi FAYLSIZ ham multipart: chat marshruti
       `req.formData()` kutadi, JSON kelsa 400 BAD_FORM qaytaradi
       (2026-09-06 da topildi — matnli xabar navbatdan o'tmasdi). */
    if (files.length || job.kind === "message") {
      const form = new FormData();
      for (const [k, v] of Object.entries(job.body ? JSON.parse(job.body) : {})) {
        if (v !== undefined && v !== null) form.append(k, String(v));
      }
      for (const f of files) {
        form.append(f.field, formPart(f) as Blob);
      }
      /* `fetch` EMAS — Expo'ning yangi `fetch` i fayl URI'sini
         qo'llab-quvvatlamaydi (`api.ts:postForm` izohiga qarang).
         Navbatdagi surat va hujjatlar aynan shu sababdan
         yuborilmasdi. */
      const r = await postForm(job.path, headers, form, 120000, job.method);
      status = r.status;
      text = r.text;
    } else {
      const res = await fetch(`${API_BASE}${job.path}`, {
        method: job.method,
        headers: { ...headers, "Content-Type": "application/json" },
        body: job.body ?? undefined,
      });
      status = res.status;
      text = await res.text().catch(() => "");
    }
  } catch {
    // Aloqa yo'q — xato emas, kutamiz
    await backoff(job, null);
    return false;
  }

  /* Kimdir shu yozuvni kutyapti — javob unga yetib borsin. Bazaga
     yozishdan OLDIN: `sendOrQueue` yozuv o'chganini ko'rgan zahoti
     javobni oladi. */
  if (kutuvchilar.has(job.id)) kutuvchilar.set(job.id, { status, text });

  if (status >= 200 && status < 300) {
    await d.runAsync(`DELETE FROM outbox WHERE id = ?`, job.id);
    if (job.kind === "gps") await gpsJavobi(job.path, text);
    return true;
  }

  const kod = xatoKodi(status, text);

  /* 4xx — server RAD ETDI. Qayta yuborish yordam bermaydi:
     ma'lumot noto'g'ri yoki huquq yo'q. Yozuvni jimgina
     tashlamaymiz — foydalanuvchi nima o'tmaganini KO'RISHI kerak.
     429 va 408 esa vaqtinchalik, ular kutadi. */
  if (status >= 400 && status < 500 && status !== 429 && status !== 408) {
    await d.runAsync(`UPDATE outbox SET failed = 1, lastError = ? WHERE id = ?`, kod, job.id);
    return true;
  }

  await backoff(job, kod);
  return false;
}

/**
 * GPS to'plamiga server javobi — reys yopilgan bo'lsa kuzatuvni TO'XTATISH
 * (2026-09-17, do'kon auditi A14).
 *
 * Reys yopilgan bo'lsa server nuqtalarni 200 bilan JIMGINA qabul qiladi
 * (`reason: "NOT_LIVE"`) — aks holda navbat ularni abadiy qayta yuborardi.
 * Lekin telefon buni e'tiborsiz qoldirar va kuzatuv reys ekrani ochilguncha
 * ishlayverardi. Bu ruxsat matnidagi «reys yopilishi bilan to'xtaydi»
 * va'dasini buzardi (Apple 2.5.4) va batareyani bekorga yerdi.
 *
 * ⚠️ Faqat HOZIR kuzatilayotgan reys bo'lsa to'xtatiladi: navbatda eski
 * reysdan qolgan to'plam turgan bo'lishi mumkin va uning javobi yangi
 * reys kuzatuvini to'xtatib qo'ymasligi kerak.
 *
 * `gps.ts` dinamik import qilinadi — u o'zi shu faylni import qiladi,
 * statik import aylana bog'liqlik yasardi.
 */
async function gpsJavobi(path: string, text: string): Promise<void> {
  try {
    if (JSON.parse(text)?.reason !== "NOT_LIVE") return;
    const tripId = /^\/api\/trips\/([^/]+)\/location\/batch/.exec(path)?.[1];
    if (!tripId) return;
    const gps = await import("./gps");
    if ((await gps.activeTrip()) === tripId) await gps.stop();
  } catch {
    /* Javob o'qilmadi — kuzatuvga tegmaymiz, reys ekrani o'zi to'xtatadi */
  }
}

/** 5s, 10s, 20s… eng ko'pi 5 daqiqa */
async function backoff(job: Job, message: string | null) {
  const d = await open();
  const wait = Math.min(5000 * 2 ** job.tries, 300_000);
  await d.runAsync(
    `UPDATE outbox SET tries = tries + 1, nextAt = ?, lastError = ? WHERE id = ?`,
    Date.now() + wait,
    message,
    job.id,
  );
}

/**
 * Rad etish KODI — matni emas (`USER_BLOCKED`, `READ_ONLY`…).
 *
 * Ekran uni lug'atdan o'qiydi (`apiErr.*`, CLAUDE.md 3-qoida). Ilgari
 * bu yerga serverning o'zbekcha `message` i yozilardi: rus tilidagi
 * haydovchi navbat ekranida o'zbekcha xato ko'rardi.
 */
function xatoKodi(status: number, text: string): string {
  const j = jsonOf(text);
  return typeof j?.error === "string" ? j.error : `HTTP_${status}`;
}

function jsonOf(text: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────── yuborib kutish */

export type Yuborish<T> =
  /** Navbatda — aloqa yo'q yoki navbat band; javob keyin, ekransiz */
  | { queued: true }
  /** Hozir ketdi; `javob` — server javobining tanasi */
  | { queued: false; javob: T | null };

/**
 * So'rovni yuborish, aloqa bo'lmasa NAVBATGA qo'yish.
 *
 * Ekran «yuborildi» deb ko'rsatadi va shu to'g'ri: yozuv yo'qolmadi,
 * u telefonda turibdi va aloqa qaytganda ketadi. «Xato» deb
 * ko'rsatsak, haydovchi bir xil narsani qayta-qayta kiritardi.
 */
export async function sendOrQueue<T = unknown>(job: NewJob): Promise<Yuborish<T>> {
  if (!(await isOnline())) {
    await enqueue(job);
    return { queued: true };
  }

  /* Kalit YOZISHDAN OLDIN kutuvchilarga qo'yiladi: parallel `flush`
     yozuvni shu zahoti olib ketsa ham javobi yo'qolmaydi */
  const id = Crypto.randomUUID();
  kutuvchilar.set(id, null);
  try {
    await insert(id, job);
    await flush();
    const d = await open();
    const still = await d.getFirstAsync<{ failed: number; lastError: string | null }>(
      `SELECT failed, lastError FROM outbox WHERE id = ?`,
      id,
    );
    const javob = kutuvchilar.get(id) ?? null;
    if (!still) return { queued: false, javob: javob ? (jsonOf(javob.text) as T | null) : null };

    /* Server RAD ETGAN bo'lsa — bu haqiqiy xato, ekran ko'rsatsin.
       Yozuv navbatdan olinadi: takrorlanib turishining ma'nosi
       yo'q, foydalanuvchi hozir shu yerda va tuzata oladi. */
    if (still.failed) {
      await remove(id);
      const data = javob ? jsonOf(javob.text) : null;
      throw new FuramError({
        error: typeof data?.error === "string" ? data.error : (still.lastError ?? "REJECTED"),
        status: javob?.status ?? 400,
        details: data?.details as Record<string, string[]> | undefined,
        data,
      });
    }
    return { queued: true };
  } catch (e) {
    if (e instanceof FuramError) throw e;
    return { queued: true };
  } finally {
    kutuvchilar.delete(id);
  }
}
