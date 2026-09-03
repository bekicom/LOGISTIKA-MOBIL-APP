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
import { API_BASE, FuramError } from "./api";
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

export async function enqueue(job: {
  kind: string;
  path: string;
  method?: string;
  body?: unknown;
  files?: Upload[];
  priority?: number;
}): Promise<string> {
  const d = await open();
  /* Kalit SHU YERDA yaratiladi va O'ZGARMAYDI. Qayta yuborishda
     o'sha kalit ketadi — server takrorni shundan taniydi. */
  const id = Crypto.randomUUID();
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
  return id;
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

  let res: Response;
  try {
    if (files.length) {
      const form = new FormData();
      for (const [k, v] of Object.entries(job.body ? JSON.parse(job.body) : {})) {
        if (v !== undefined && v !== null) form.append(k, String(v));
      }
      for (const f of files) {
        // ⚠️ Content-Type QO'LDA QO'YILMAYDI — RN boundary'ni o'zi yozadi
        form.append(f.field, { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
      }
      res = await fetch(`${API_BASE}${job.path}`, { method: job.method, headers, body: form });
    } else {
      res = await fetch(`${API_BASE}${job.path}`, {
        method: job.method,
        headers: { ...headers, "Content-Type": "application/json" },
        body: job.body ?? undefined,
      });
    }
  } catch {
    // Aloqa yo'q — xato emas, kutamiz
    await backoff(job, null);
    return false;
  }

  if (res.ok) {
    await d.runAsync(`DELETE FROM outbox WHERE id = ?`, job.id);
    return true;
  }

  const text = await res.text().catch(() => "");
  const message = safeMessage(text) ?? `HTTP ${res.status}`;

  /* 4xx — server RAD ETDI. Qayta yuborish yordam bermaydi:
     ma'lumot noto'g'ri yoki huquq yo'q. Yozuvni jimgina
     tashlamaymiz — foydalanuvchi nima o'tmaganini KO'RISHI kerak.
     429 va 408 esa vaqtinchalik, ular kutadi. */
  if (res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408) {
    await d.runAsync(`UPDATE outbox SET failed = 1, lastError = ? WHERE id = ?`, message, job.id);
    return true;
  }

  await backoff(job, message);
  return false;
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

function safeMessage(text: string): string | null {
  try {
    const j = JSON.parse(text);
    return typeof j?.message === "string" ? j.message : (j?.error ?? null);
  } catch {
    return null;
  }
}

/**
 * So'rovni yuborish, aloqa bo'lmasa NAVBATGA qo'yish.
 *
 * Ekran «yuborildi» deb ko'rsatadi va shu to'g'ri: yozuv yo'qolmadi,
 * u telefonda turibdi va aloqa qaytganda ketadi. «Xato» deb
 * ko'rsatsak, haydovchi bir xil narsani qayta-qayta kiritardi.
 */
export async function sendOrQueue(job: {
  kind: string;
  path: string;
  method?: string;
  body?: unknown;
  files?: Upload[];
  priority?: number;
}): Promise<{ queued: boolean }> {
  if (await isOnline()) {
    try {
      const id = await enqueue(job);
      await flush();
      const d = await open();
      const still = await d.getFirstAsync<{ id: string; failed: number }>(
        `SELECT id, failed FROM outbox WHERE id = ?`,
        id,
      );
      if (!still) return { queued: false };
      /* Server RAD ETGAN bo'lsa — bu haqiqiy xato, ekran ko'rsatsin.
         Yozuv navbatdan olinadi: takrorlanib turishining ma'nosi
         yo'q, foydalanuvchi hozir shu yerda va tuzata oladi. */
      if (still.failed) {
        const row = await d.getFirstAsync<{ lastError: string | null }>(
          `SELECT lastError FROM outbox WHERE id = ?`,
          id,
        );
        await remove(id);
        throw new FuramError({
          error: "REJECTED",
          message: row?.lastError ?? "Yuborilmadi",
          status: 400,
        });
      }
      return { queued: true };
    } catch (e) {
      if (e instanceof FuramError) throw e;
      return { queued: true };
    }
  }

  await enqueue(job);
  return { queued: true };
}
