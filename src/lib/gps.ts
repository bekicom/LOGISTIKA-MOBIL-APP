/**
 * GPS kuzatuv — faqat faol reys davomida (2026-09-04, TZ §6).
 *
 * BATAREYA — ASOSIY XAVF, texnik tafsilot emas. Haydovchi ilova
 * telefonni yeb qo'yayotganini sezsa, uni butunlay o'chirib qo'yadi
 * va kuzatuvdan hech qanday foyda qolmaydi. Shuning uchun chastota
 * HARAKATGA QARAB o'zgaradi va batareya kam bo'lsa siyraklashadi.
 *
 * NUQTALAR NAVBAT ORQALI KETADI. Chegarada aloqa yo'q, aynan o'sha
 * yerda esa yo'l eng qiziq. Nuqtalar telefonda yig'iladi va aloqa
 * qaytganda TO'PLAM bilan yuboriladi (`/location/batch`) — 700 ta
 * alohida so'rov mobil internetda shunchaki tugamasdi.
 *
 * HAR NUQTADA `recordedAt` BOR. Usiz olti soatlik nuqtalar serverga
 * kelgan vaqt bilan yozilib, xaritada mashina bir lahzada 400 km
 * sakragan bo'lib ko'rinardi.
 *
 * REYS YOPILISHI BILAN DARHOL TO'XTAYDI. Doimiy kuzatuv yo'q —
 * bu ham Apple talabi, ham to'g'ri qaror.
 */
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Battery from "expo-battery";
import { openDb } from "./local-db";
import { enqueue, P_NOW } from "./outbox";

export const GPS_TASK = "furam-gps";

/** Nuqtalar shu yerda yig'iladi — navbatga to'plam bo'lib tushadi */
type Point = {
  lat: number;
  lng: number;
  recordedAt: string;
  speedKmh: number | null;
  heading: number | null;
  accuracyM: number | null;
};

/**
 * Chastota — TZ §6.2 jadvali.
 *
 * Qiymatlar shu yerda turibdi, chunki ular tajribada tuzatiladi:
 * jonli holatda «tez-tez» va «batareya» orasidagi muvozanat faqat
 * haqiqiy reysda ko'rinadi.
 */
const MODES = {
  moving: { timeInterval: 30_000, distanceInterval: 100 },
  slow: { timeInterval: 120_000, distanceInterval: 50 },
  parked: { timeInterval: 600_000, distanceInterval: 200 },
  lowBattery: { timeInterval: 300_000, distanceInterval: 500 },
} as const;

export type GpsMode = keyof typeof MODES;

/* ─────────────────────────────────────────── saqlash */

async function table() {
  const d = await openDb();
  await d.execAsync(`
    CREATE TABLE IF NOT EXISTS gps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tripId TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      recordedAt TEXT NOT NULL,
      speedKmh REAL,
      heading REAL,
      accuracyM REAL
    );
    CREATE INDEX IF NOT EXISTS gps_trip ON gps(tripId, id);
    CREATE TABLE IF NOT EXISTS gps_state (
      k TEXT PRIMARY KEY NOT NULL,
      v TEXT
    );
  `);
  return d;
}

async function stateGet(k: string): Promise<string | null> {
  const d = await table();
  const row = await d.getFirstAsync<{ v: string | null }>(`SELECT v FROM gps_state WHERE k = ?`, k);
  return row?.v ?? null;
}

async function stateSet(k: string, v: string | null) {
  const d = await table();
  await d.runAsync(
    `INSERT INTO gps_state (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v`,
    k,
    v,
  );
}

/** Kuzatuv qaysi reys uchun yoqilgan */
export const activeTrip = () => stateGet("tripId");

/* ─────────────────────────────────────────── fon vazifasi */

TaskManager.defineTask(GPS_TASK, async ({ data, error }) => {
  if (error) return;
  const locs = (data as { locations?: Location.LocationObject[] } | null)?.locations ?? [];
  if (!locs.length) return;

  const tripId = await stateGet("tripId");
  if (!tripId) return;

  const d = await table();
  for (const l of locs) {
    await d.runAsync(
      `INSERT INTO gps (tripId, lat, lng, recordedAt, speedKmh, heading, accuracyM)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      tripId,
      l.coords.latitude,
      l.coords.longitude,
      // Qurilma o'lchagan vaqt — serverga kelgan vaqt EMAS
      new Date(l.timestamp).toISOString(),
      l.coords.speed != null && l.coords.speed >= 0 ? l.coords.speed * 3.6 : null,
      l.coords.heading != null && l.coords.heading >= 0 ? l.coords.heading : null,
      l.coords.accuracy ?? null,
    );
  }

  await maybeAdjust(locs[locs.length - 1]);
  await drain(tripId);
});

/**
 * Nuqtalarni navbatga topshirish.
 *
 * TO'PLAM 200 tadan: bittada 700 nuqta yuborilsa so'rov og'ir bo'ladi
 * va yo'lda uzilsa hammasi qaytadan ketardi. Kichikroq to'plam
 * uzilishdan keyin kamroq ish qildiradi.
 *
 * 5 tadan kam nuqta KUTADI: har ikki nuqtaga alohida so'rov qilish
 * radioni bekorga uyg'otadi va batareyani yeydi. Reys yopilganda
 * qolgani `stop()` da baribir yuboriladi.
 */
const CHUNK = 200;
const MIN_BATCH = 5;

async function drain(tripId: string, force = false): Promise<void> {
  const d = await table();
  const rows = await d.getAllAsync<{
    id: number;
    lat: number;
    lng: number;
    recordedAt: string;
    speedKmh: number | null;
    heading: number | null;
    accuracyM: number | null;
  }>(`SELECT * FROM gps WHERE tripId = ? ORDER BY id ASC LIMIT ?`, tripId, CHUNK);

  if (!rows.length) return;
  if (rows.length < MIN_BATCH && !force) return;

  const points: Point[] = rows.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    recordedAt: r.recordedAt,
    speedKmh: r.speedKmh,
    heading: r.heading,
    accuracyM: r.accuracyM,
  }));

  await enqueue({
    kind: "gps",
    path: `/api/trips/${tripId}/location/batch`,
    body: { points },
    priority: P_NOW,
  });

  await d.runAsync(
    `DELETE FROM gps WHERE id IN (${rows.map(() => "?").join(",")})`,
    ...rows.map((r) => r.id),
  );

  // Yana qolgan bo'lsa keyingi to'plam
  if (rows.length === CHUNK) await drain(tripId, force);
}

/* ─────────────────────────────────────────── chastota */

async function pickMode(last: Location.LocationObject): Promise<GpsMode> {
  const level = await Battery.getBatteryLevelAsync().catch(() => 1);
  if (level >= 0 && level < 0.15) return "lowBattery";

  const kmh = last.coords.speed != null && last.coords.speed > 0 ? last.coords.speed * 3.6 : 0;
  if (kmh > 10) return "moving";
  if (kmh > 0.5) return "slow";

  /* To'xtagan deb hisoblash uchun BEShI DAQIQA qimirlamaslik kerak.
     Bir marta nol tezlik yetarli emas — svetofor ham nol tezlik. */
  const since = Number((await stateGet("stillSince")) ?? 0);
  const now = Date.now();
  if (!since) {
    await stateSet("stillSince", String(now));
    return "slow";
  }
  return now - since > 5 * 60_000 ? "parked" : "slow";
}

async function maybeAdjust(last: Location.LocationObject) {
  const kmh = last.coords.speed != null && last.coords.speed > 0 ? last.coords.speed * 3.6 : 0;
  if (kmh > 0.5) await stateSet("stillSince", null);

  const want = await pickMode(last);
  const have = (await stateGet("mode")) as GpsMode | null;
  if (want === have) return;

  await stateSet("mode", want);
  /* Rejim o'zgarsa vazifa QAYTA YOQILADI — `expo-location` da
     ishlab turgan vazifaning intervalini o'zgartirib bo'lmaydi. */
  if (await TaskManager.isTaskRegisteredAsync(GPS_TASK)) {
    await Location.startLocationUpdatesAsync(GPS_TASK, options(want));
  }
}

function options(mode: GpsMode): Location.LocationTaskOptions {
  return {
    accuracy: Location.Accuracy.Balanced,
    ...MODES[mode],
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "FURAM",
      notificationBody: "Reys davomida yo'l yozilmoqda",
      notificationColor: "#f45a18",
    },
  };
}

/* ─────────────────────────────────────────── boshqaruv */

export type PermState = "granted" | "foregroundOnly" | "denied";

/**
 * Ruxsat IKKI BOSQICHDA so'raladi (TZ §6.3).
 *
 * Birdan «doim» so'ralmaydi: tizim oynasi darrov chiqadi va odam
 * nima uchun kerakligini bilmay rad etadi. Rad javobdan keyin uni
 * qayta so'rab bo'lmaydi — sozlamaga kirish kerak, ya'ni bitta
 * noto'g'ri so'rov kuzatuvni butunlay yo'qotadi.
 */
export async function askForeground(): Promise<boolean> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return granted;
}

export async function askBackground(): Promise<PermState> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) return "denied";
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.granted ? "granted" : "foregroundOnly";
}

export async function permState(): Promise<PermState> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) return "denied";
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.granted ? "granted" : "foregroundOnly";
}

export async function isRunning(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(GPS_TASK).catch(() => false);
}

/** Reys boshlanganda */
export async function start(tripId: string): Promise<boolean> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) return false;

  await stateSet("tripId", tripId);
  await stateSet("mode", "slow");
  await stateSet("stillSince", null);

  if (await TaskManager.isTaskRegisteredAsync(GPS_TASK)) {
    await Location.stopLocationUpdatesAsync(GPS_TASK).catch(() => null);
  }
  await Location.startLocationUpdatesAsync(GPS_TASK, options("slow"));
  return true;
}

/**
 * Reys yopilganda yoki haydovchi to'xtatganda.
 *
 * Qolgan nuqtalar MAJBURAN navbatga topshiriladi (`force`): beshtadan
 * kam qolgani ham reysning oxirgi qismidir va yo'qolmasligi kerak.
 */
export async function stop(): Promise<void> {
  const tripId = await stateGet("tripId");
  if (tripId) await drain(tripId, true).catch(() => null);

  if (await TaskManager.isTaskRegisteredAsync(GPS_TASK)) {
    await Location.stopLocationUpdatesAsync(GPS_TASK).catch(() => null);
  }
  await stateSet("tripId", null);
  await stateSet("mode", null);
  await stateSet("stillSince", null);
}

/** Kutayotgan nuqtalar soni — ekranda ko'rsatish uchun */
export async function pendingPoints(): Promise<number> {
  const d = await table();
  const row = await d.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM gps`);
  return row?.n ?? 0;
}
