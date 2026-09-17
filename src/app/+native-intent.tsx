/**
 * Tashqaridan kelgan havolalarni qayta ishlash (2026-09-17, do'kon auditi A11).
 *
 * ── MUAMMO ─────────────────────────────────────────────────────
 *
 * Google bilan kirishda server ilovaga `furam://google?bilet=…` bilan
 * qaytaradi (`src/lib/social-auth.ts`). iOS'da tizim kirish oynasi
 * (ASWebAuthenticationSession) bu manzilni O'ZI ushlaydi va u
 * navigatsiyaga yetmaydi.
 *
 * Android'da esa bunday oyna yo'q: `expo-web-browser` qaytishni oddiy
 * `Linking` hodisasi orqali kutadi. Shu hodisani expo-router ham eshitadi
 * va mavjud bo'lmagan `/google` sahifasiga o'tib, «Unmatched Route»
 * ekranini ochardi. Kirish oxirida odam o'sha xato sahifasida qolardi.
 *
 * iPhone'da sinalgani uchun bu ko'rinmagan edi.
 *
 * ── YECHIM ─────────────────────────────────────────────────────
 *
 * Bu manzil navigatsiyadan chiqarib tashlanadi: `null` qaytsa router
 * hech qayerga o'tmaydi, biletni esa `social-auth.ts` o'zi o'qiydi.
 */
const GOOGLE_QAYTISH = /^(?:furam:\/\/|exps?:\/\/[^/]+\/--\/|\/)?google(?:[/?#]|$)/;

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    if (GOOGLE_QAYTISH.test(path)) {
      /* Ilova shu havola bilan NOLDAN ochilgan bo'lsa (kutilmagan holat —
         kirish oynasi ilova ochiq paytda qaytadi) — bosh sahifaga */
      return initial ? "/" : null;
    }
    return path;
  } catch {
    /* Bu yerdagi xato ilovani yiqitadi (expo-router ogohlantirishi) —
       har ehtimolga qarshi havolani o'zgarishsiz qaytaramiz */
    return path;
  }
}
