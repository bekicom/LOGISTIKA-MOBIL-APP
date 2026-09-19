/**
 * Bosh sahifa tugmalari — besh asosiy va rolga xos qator (TZ-05, 2026-09-19).
 *
 * Mijoz: «Mashina qo'shish, Yuk qo'shish, Mening yuklarim, Mening
 * transportlarim, Parkim — shu 5 ta asosiy tugma hamma rolda tursin.
 * Qolgani pastdagi katakda: har bir rol bo'yicha zarur tugmalar chiqsin».
 *
 * ── MANBA — WEB ─────────────────────────────────────────────────
 *
 * `ASOSIY` — `furam/src/lib/nav.ts:ASOSIY` ning ANIQ nusxasi (o'zgarmas,
 * rolga bog'liq emas; sinov tartib, kalit va manzilni solishtiradi).
 * Rolga xos qator esa serverdan keladi (`/api/home` → `quick`, web bilan
 * bitta `quickFor`): uni ilovada nusxalash rol jadvalini ikki joyda
 * yuritish bo'lardi.
 *
 * Manzil — WEB manzili; ilova ekraniga `webToApp` o'giradi. Yorliq —
 * lug'at kaliti (`ns.key`), matn emas.
 */
/* ⚠️ IMPORT YO'Q — ataylab (`rollar.ts` dagi sabab): furam'dagi sinov bu
   faylni to'g'ridan-to'g'ri import qiladi. */

export type AsosiyTugma = {
  key: string;
  ns: "quick" | "svc";
  /** Web manzili (`nav.ts` bilan bir xil) */
  web: string;
  ikonka: "truck" | "package" | "route";
  /** «Qo'shish» tugmasi — belgisi ustida «+» */
  qoshish?: boolean;
};

export const ASOSIY: readonly AsosiyTugma[] = [
  { key: "addVehicle", ns: "quick", web: "/fleet?add=1", ikonka: "truck", qoshish: true },
  { key: "addCargo", ns: "quick", web: "/post", ikonka: "package", qoshish: true },
  { key: "my-loads", ns: "svc", web: "/my-loads", ikonka: "package" },
  { key: "my-trucks", ns: "svc", web: "/my-trucks", ikonka: "route" },
  { key: "park", ns: "svc", web: "/fleet", ikonka: "truck" },
];

/** Serverdagi tezkor tugma (`/api/home` → `quick`) */
export type TezkorTugma = { key: string; ns: string; href: string; icon: string };

/**
 * Web ikonka nomi (`AppIcon`) → ilova `Icon` nomi.
 *
 * `as const satisfies` — qiymatlar ANIQ nom bo'lib qoladi va `Icon` ga
 * berilganda mavjudligi o'sha joyda tekshiriladi.
 */
export const IKONKA = {
  search: "search",
  trucks: "truck",
  vacancy: "briefcase",
  queue: "border",
  trips: "route",
  reports: "chart",
  drivers: "users",
  contracts: "handshake",
  dispatchers: "headset",
  post: "package",
  "post-truck": "truck",
} as const satisfies Record<string, string>;

export function ikonkasi(web: string): (typeof IKONKA)[keyof typeof IKONKA] | "grid" {
  return (IKONKA as Record<string, (typeof IKONKA)[keyof typeof IKONKA]>)[web] ?? "grid";
}

/** Telefonda qatorda nechtasi ko'rinadi — qolgani «Yana» ichida (web `QUICK_TELEFON`) */
export const QUICK_TELEFON = 4;

/** Server kalitni ruxsat etilgan bo'limdan beradi — boshqasi e'tiborsiz */
export function yorliqKaliti(q: { key: string; ns: string }): string | null {
  if (q.ns !== "quick" && q.ns !== "svc") return null;
  return /^[\w-]{1,40}$/.test(q.key) ? `${q.ns}.${q.key}` : null;
}
