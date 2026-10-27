/**
 * Bosh sahifa tugmalari — yetti asosiy va rolga xos qator (TZ-05, 2026-09-19).
 *
 * Mijoz: «Yuklar, Bo'sh transportlar, Mashina qo'shish, Yuk qo'shish,
 * Mening yuklarim, Mening transportlarim, Parkim — hamma rolda tursin,
 * qolgani pastdagi katakda har rol bo'yicha». Avval beshta edi; «Yuklar»
 * va «Bo'sh transportlar» webga shu kuni qo'shildi (`434a67c`) — ilova
 * orqada qolganini `test-asosiy-mobile` ushladi.
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
  ns: "quick" | "svc" | "nav" | "nav5" | "ishStoli";
  /** Web manzili (`nav.ts` bilan bir xil) */
  web: string;
  ikonka: "truck" | "package" | "route" | "search" | "briefcase" | "tag";
  /** «Qo'shish» tugmasi — belgisi ustida «+» */
  qoshish?: boolean;
};

/* 4 KATTA TUGMA (TZ v3 §4, 2026-10-27) — web bosh sahifasidagi bilan
   bir xil: Mening ishim · Yuklar · Transportlar · FURAM Bozor.
   «/» — shu ekranning o'zi: bosilganda ish stoliga suriladi */
export const ASOSIY: readonly AsosiyTugma[] = [
  { key: "myWork", ns: "nav5", web: "/", ikonka: "briefcase" },
  { key: "loads", ns: "svc", web: "/loads", ikonka: "package" },
  { key: "trucks", ns: "svc", web: "/trucks", ikonka: "truck" },
  { key: "bozor", ns: "ishStoli", web: "/market", ikonka: "tag" },
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

/** Asosiy tugmalar to'rida ustun soni — webdagi telefon to'ri (`grid-cols-4`, 4 + 3) */
export const ASOSIY_USTUN = 4;

/** Server kalitni ruxsat etilgan bo'limdan beradi — boshqasi e'tiborsiz.
 *  `ishStoli` — «Mening ishim» ish stoli tugmalari (TZ v3 §6) */
export function yorliqKaliti(q: { key: string; ns: string }): string | null {
  if (q.ns !== "quick" && q.ns !== "svc" && q.ns !== "ishStoli") return null;
  return /^[\w-]{1,40}$/.test(q.key) ? `${q.ns}.${q.key}` : null;
}
