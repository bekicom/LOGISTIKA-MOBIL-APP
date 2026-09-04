/**
 * Mehmon rejimi — kirmasdan ko'rish (2026-09-04, audit 06).
 *
 * ── NEGA KERAK ──────────────────────────────────────────────────
 *
 * Web'da kirmagan odam yuklarni, transportni, bozorni,
 * zapchastni, ustaxonani, ish e'lonlarini, dispetcherlarni va
 * qo'llanmani ko'ra oladi. Ilovada esa u darhol ro'yxatdan
 * o'tishga tiqilardi — «webda nima bo'lsa mobilda ham» qoidasi
 * shu joyda buzilgan edi.
 *
 * Apple ham buni tekshiradi (Guideline 5.1.1): hisobsiz
 * ishlaydigan mazmun uchun majburiy ro'yxatdan o'tish sabab
 * bo'lib rad etilishi mumkin.
 *
 * ── NEGA SERVERDA HECH NARSA O'ZGARMADI ─────────────────────────
 *
 * Ochiq marshrutlar allaqachon mehmonga javob beradi: yuk,
 * transport, bozor, zapchast, ish, ustaxona, qidiruv,
 * dispetcherlar, qo'llanma. Eshik ochiq edi, ilovada yo'l yo'q
 * edi.
 *
 * ── NEGA SecureStore ─────────────────────────────────────────────
 *
 * Til ham shu yerda saqlanadi (`i18n.ts`) — ikkinchi omborxona
 * qo'shish sababi yo'q. Bu maxfiy ma'lumot emas, lekin bitta
 * joyda turgani tartibli.
 */
import * as SecureStore from "expo-secure-store";

const KEY = "furam_guest";

/**
 * Xotiradagi nusxa.
 *
 * `index.tsx` yo'naltirishdan OLDIN javob kutolmaydi — bir
 * lahzalik «kirish ekrani» miltillab ketardi. Shuning uchun
 * qiymat ilova ochilishida bir marta o'qiladi va shundan keyin
 * sinxron beriladi.
 */
let cached = false;

export function isGuest(): boolean {
  return cached;
}

/** Ilova ochilishida bir marta — `auth-context` chaqiradi */
export async function loadGuest(): Promise<boolean> {
  try {
    cached = (await SecureStore.getItemAsync(KEY)) === "1";
  } catch {
    /* O'qib bo'lmasa mehmon EMAS deb hisoblaymiz: kirish ekrani
       ko'rsatish, ochiq ekranni noto'g'ri ko'rsatishdan xavfsiz. */
    cached = false;
  }
  return cached;
}

export async function setGuest(on: boolean): Promise<void> {
  cached = on;
  try {
    if (on) await SecureStore.setItemAsync(KEY, "1");
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* Yozib bo'lmasa ham shu seansda ishlayveradi */
  }
}
