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
  market: "/bozor",
  "my-loads": "/elonlarim",
  "my-trucks": "/parkim",
  notifications: "/bildirishnomalar",
  panel: "/panelim",
  parts: "/zapchast",
  post: "/yuk-joylash",
  "post-truck": "/mashina-joylash",
  problems: "/bildirishnomalar?tab=problem",
  profile: "/profil",
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

export function webToApp(href: string): string | null {
  const clean = href.split("?")[0].split("#")[0].replace(/^\/+/, "");
  const first = clean.split("/")[0];
  return MAP[first] ?? null;
}
