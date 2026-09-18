/**
 * Web manzilini ilova ekraniga o'girish.
 *
 * ── NEGA KERAK ──────────────────────────────────────────────────
 *
 * Server ba'zi javoblarda WEB HAVOLASINI beradi (`/loads`,
 * `/fleet`, `/service`…): u web uchun yozilgan va o'sha yerda
 * to'g'ri ishlaydi. Ilovada esa marshrutlar o'zbekcha nomlangan.
 * Har ekranda alohida `if` yozish o'rniga bitta jadval — yangi
 * bo'lim qo'shilganda ham bir joyda tuzatiladi.
 *
 * Jadval `furam/scripts/audit-mobile.ts` dagi `MAP` bilan bir xil
 * ma'noni ifodalaydi: u qaysi web bo'limi ilovada bor-yo'qligini
 * tekshiradi, bu esa o'shani ochadi.
 *
 * ⚠️ Mos kelmasa `null` — ekran hech qayerga olib bormaydi.
 * Bu ataylab: mavjud bo'lmagan manzilga `push` qilinsa,
 * expo-router «unmatched route» chizadi va odam ilova buzilgan
 * deb o'ylaydi.
 */
const MAP: Record<string, string> = {
  ai: "/ai",
  analytics: "/analitika",
  calc: "/kalkulyator",
  chats: "/chat",
  contracts: "/shartnoma",
  deals: "/kelishuvlar",
  dispatchers: "/dispetcherlar",
  documents: "/hujjatlarim",
  driver: "/panelim",
  finance: "/moliya",
  fleet: "/parkim",
  jobs: "/ish",
  loads: "/yuklar",
  map: "/xarita",
  market: "/bozor",
  "my-loads": "/elonlarim",
  /* «Transportlarim» — transport E'LONLARI (TZ-05, 2026-09-18). Ilgari
     parkka olib borardi: webda aynan shu chalkashlik tuzatilgan edi. */
  "my-trucks": "/elonlarim",
  notifications: "/bildirishnomalar",
  panel: "/panelim",
  parts: "/zapchast",
  post: "/yuk-joylash",
  "post-truck": "/mashina-joylash",
  problems: "/bildirishnomalar?tab=problem",
  profile: "/profil",
  queues: "/navbat",
  reports: "/analitika",
  roles: "/rollarim",
  search: "/qidiruv",
  service: "/ustaxona",
  staff: "/xodimlarim",
  tasks: "/bildirishnomalar?tab=task",
  tools: "/kalkulyator",
  trips: "/reyslar",
  trucks: "/mashinalar",
  trust: "/reyting",
  video: "/qollanma",
};

/**
 * Ikki bo'lakli aniq manzillar — birinchi bo'lak bo'yicha qidirishdan
 * OLDIN tekshiriladi (2026-09-19).
 *
 * NEGA: jadval faqat birinchi bo'lakka qarardi, ya'ni `/fleet/money`,
 * `/fleet/drivers`, `/profile/documents` hammasi bitta ekranga
 * tushardi — moliya o'rniga park, hujjatlar o'rniga profil ochilardi.
 * TZ-09 dan keyin AI javobidagi tugmalar aynan shunday manzillar
 * yuboradi.
 */
const EXACT: Record<string, string> = {
  "fleet/money": "/moliya",
  "fleet/queues": "/navbat",
  "driver/queues": "/navbat",
  "profile/documents": "/hujjatlarim",
  "profile/qidiruvlar": "/saqlangan-qidiruv",
  "profile/support": "/yordam",
};

/**
 * Batafsil sahifa: `/loads/<slug>` → `/yuk/<slug>`.
 *
 * Ilova ekranlari id ham, slug ham qabul qiladi (server `[slug]`
 * marshruti ikkalasini ham topadi). Ilgari bunday havola ro'yxatga
 * olib borardi va odam e'lonni qidirib yurardi.
 */
const DETAIL: Record<string, string> = {
  loads: "/yuk",
  trucks: "/mashina",
  trips: "/reys",
  chats: "/suhbat",
};

export function webToApp(href: string): string | null {
  /* So'rov qismi (`?fromId=12`) ATAYLAB tashlanadi: TZ-09 dan beri
     server `goto` ga filtrli havola yozadi va ilgari to'liq satr
     jadvaldan qidirilgani uchun HECH NARSA topilmay, tugma hech
     qayerga olib bormasdi. Filtrni ekranga uzatish — alohida ish. */
  const clean = href.split("?")[0].split("#")[0].replace(/^\/+/, "").replace(/\/+$/, "");
  const parts = clean.split("/");
  const two = parts.slice(0, 2).join("/");
  if (EXACT[two]) return EXACT[two];
  if (parts.length >= 2 && DETAIL[parts[0]] && /^[\w-]+$/.test(parts[1])) {
    return `${DETAIL[parts[0]]}/${parts[1]}`;
  }
  return MAP[parts[0]] ?? null;
}
