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

/**
 * Ekran TUSHUNADIGAN so'rov kalitlari — faqat shular o'tadi va faqat
 * shu shaklda (2026-09-19, TZ-09).
 *
 * `/roles?rol=CARGO_OWNER` — AI tugmasi «bu amal uchun yuk egasi roli
 * kerak» deb olib keladi: ekran o'sha rolni tanlab ochadi.
 * `/service?near=…&within=50` — AI dagi «Barcha yaqin ustalar»: ekran
 * ro'yxatni masofa bo'yicha saralaydi. Qolgan filtrlar (`/loads?fromId=`)
 * hali ekranga uzatilmaydi — ular jim tashlanadi, ekran filtrsiz ochiladi.
 *
 * Shakl qat'iy: server manzilni oq ro'yxatdan o'tkazadi, lekin havola
 * bildirishnomadan ham keladi — ilova ham o'z chegarasini qo'yadi.
 */
const PARAMS: Record<string, Readonly<Record<string, RegExp>>> = {
  "/rollarim": { rol: /^[A-Z_]{2,30}$/ },
  "/ustaxona": { near: /^-?\d{1,2}(\.\d{1,6})?,-?\d{1,3}(\.\d{1,6})?$/, within: /^\d{1,3}$/ },
};

function yol(clean: string): string | null {
  const parts = clean.split("/");
  const two = parts.slice(0, 2).join("/");
  if (EXACT[two]) return EXACT[two];
  if (parts.length >= 2 && DETAIL[parts[0]] && /^[\w-]+$/.test(parts[1])) {
    return `${DETAIL[parts[0]]}/${parts[1]}`;
  }
  return MAP[parts[0]] ?? null;
}

export function webToApp(href: string): string | null {
  /* So'rov qismi FAQAT `PARAMS` dagi ekranlar uchun o'tadi. Ilgari
     to'liq satr jadvaldan qidirilgani uchun `/loads?fromId=12` HECH
     NARSA topmay, tugma hech qayerga olib bormasdi. */
  const [bosh, qism = ""] = href.split("#")[0].split("?");
  const target = yol(bosh.replace(/^\/+/, "").replace(/\/+$/, ""));
  if (!target) return null;
  const ruxsat = PARAMS[target];
  if (!ruxsat || !qism) return target;
  const kirgan = new URLSearchParams(qism);
  const q = Object.entries(ruxsat)
    .map(([k, shakl]) => {
      const v = kirgan.get(k);
      return v && shakl.test(v) ? `${k}=${encodeURIComponent(v)}` : null;
    })
    .filter(Boolean)
    .join("&");
  return q ? `${target}?${q}` : target;
}
