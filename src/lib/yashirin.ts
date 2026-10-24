/**
 * Admin o'chirgan bo'limlar — menyuda ko'rinmaydi (TZ v2 §8.1, 2026-10-24).
 *
 * Mijoz: «To'lov tizimi yonib qolgan, adminda o'chirish tugmasi yo'q
 * edi». Endi har modul admin paneldan o'chiriladi va ilova ham buni
 * bilishi kerak: o'chiq bo'lim plitkasi bosilsa bo'sh yoki xato ekran
 * chiqardi.
 *
 * ── MANBA — SERVER ──────────────────────────────────────────────
 *
 * `/api/auth/me` → `yashirinYollar` — WEB manzillari (`/market`,
 * `/jobs`…). Ilova ekraniga `webToApp` o'giradi: modul → ekran jadvali
 * ilovada ikkinchi marta yozilmaydi. Server rol va davlat cheklovini
 * ham hisoblab bo'lgan — ilova faqat yashiradi.
 *
 * ⚠️ Ro'yxat kelmasa (eski server) — HECH NARSA yashirilmaydi:
 * noma'lumlikda menyuni bo'shatib qo'yish yashirishdan yomonroq.
 */
import { webToApp } from "./routes";

/** Yo'l qismi — so'rov va `#` siz, oxirgi `/` siz */
function yolQismi(href: string): string {
  return href.split("#")[0].split("?")[0].replace(/\/+$/, "") || "/";
}

/**
 * Serverdan kelgan web manzillar → yashirin ilova va web yo'llari.
 *
 * So'rovli ilova manzillari (`/elonlarim?yorliq=trucks`) TASHLANADI:
 * ular ekranning bir yorlig'i, butun ekran emas — «Transport» o'chsa
 * «Mening e'lonlarim» ichidagi yuklar ham yo'qolib qolardi.
 */
export function yashirinTuplam(webYollar: readonly string[] | undefined | null): ReadonlySet<string> | null {
  if (!webYollar) return null;
  const out = new Set<string>();
  for (const w of webYollar) {
    out.add(yolQismi(w));
    const app = webToApp(w);
    if (app && !app.includes("?")) out.add(yolQismi(app));
  }
  return out;
}

/**
 * Shu manzil yashirinmi — o'zi yoki ichki sahifasi
 * (`/bozor` yashirin bo'lsa `/bozor/taqqoslash` ham).
 */
export function yashirinmi(tuplam: ReadonlySet<string> | null, href: string): boolean {
  if (!tuplam || tuplam.size === 0) return false;
  const y = yolQismi(href);
  for (const t of tuplam) {
    if (y === t || y.startsWith(`${t}/`)) return true;
  }
  return false;
}
