// Ro'yxatdan o'tish va kirishdagi davlat kodlari (2026-09-14, mijoz TZ).
//
// «Ro'yxatdan o'tishga ham MDH va Yevropa davlatlarini ochib qo'yish
// kerak, Belarus shunga o'xshash davlatlarni qo'shish kerak».
//
// Avval tanlagichda yettita kod bor edi (UZ, RU, KZ, KG, TJ, TM, TR).
// Server esa istalgan xalqaro raqamni qabul qiladi (`phoneSchema`:
// `+` va 9–15 raqam) — ya'ni to'siq faqat ekranda edi.
//
// ⚠️ SOF MA'LUMOT — server kodi yo'q, klientdan import qilinadi.
// WEB dagi `furam/src/lib/phone-codes.ts` ning AYNAN nusxasi
// (`mobil/src/lib/phone-codes.ts`); o'zgartirilsa ikkalasida ham.
//
// Nomlar yo'q, faqat ISO kod: tanlagich sakkiz tilda ishlaydi va
// bayroq + kod + «PL» har tilda bir xil tushuniladi. Nom qo'shilsa
// 40 × 8 tarjima kerak bo'lardi.

export type PhoneCode = {
  /** ISO 3166-1 alpha-2 */
  iso: string;
  /** Xalqaro kod, «+» bilan */
  code: string;
};

/** Tartib: avval O'zbekiston va MDH (mijozlarning asosiy qismi), keyin Yevropa */
export const PHONE_CODES: PhoneCode[] = [
  // ── MDH va qo'shnilar
  { iso: "UZ", code: "+998" },
  { iso: "RU", code: "+7" },
  { iso: "KZ", code: "+7" },
  { iso: "KG", code: "+996" },
  { iso: "TJ", code: "+992" },
  { iso: "TM", code: "+993" },
  { iso: "AZ", code: "+994" },
  { iso: "AM", code: "+374" },
  { iso: "GE", code: "+995" },
  { iso: "BY", code: "+375" },
  { iso: "UA", code: "+380" },
  { iso: "MD", code: "+373" },
  { iso: "TR", code: "+90" },
  // ── Yevropa
  { iso: "PL", code: "+48" },
  { iso: "LT", code: "+370" },
  { iso: "LV", code: "+371" },
  { iso: "EE", code: "+372" },
  { iso: "DE", code: "+49" },
  { iso: "NL", code: "+31" },
  { iso: "BE", code: "+32" },
  { iso: "FR", code: "+33" },
  { iso: "IT", code: "+39" },
  { iso: "ES", code: "+34" },
  { iso: "PT", code: "+351" },
  { iso: "AT", code: "+43" },
  { iso: "CH", code: "+41" },
  { iso: "CZ", code: "+420" },
  { iso: "SK", code: "+421" },
  { iso: "HU", code: "+36" },
  { iso: "RO", code: "+40" },
  { iso: "BG", code: "+359" },
  { iso: "RS", code: "+381" },
  { iso: "HR", code: "+385" },
  { iso: "SI", code: "+386" },
  { iso: "GR", code: "+30" },
  { iso: "FI", code: "+358" },
  { iso: "SE", code: "+46" },
  { iso: "NO", code: "+47" },
  { iso: "DK", code: "+45" },
  { iso: "GB", code: "+44" },
];

/** Bayroq ISO koddan — qo'lda yozilsa xato ketardi */
export function isoBayroq(iso: string): string {
  if (!/^[A-Z]{2}$/.test(iso)) return "🌐";
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * Raqamdan mos kodni topadi — ENG UZUN boshlanish yutadi
 * («+375…» → Belarus, «+3…» emas). +7 da birinchisi (Rossiya)
 * qaytadi: Qozog'iston raqami +77/+76 bo'lsa ham tanlagichda
 * kod baribir bir xil «+7».
 */
export function kodTop(phone: string): PhoneCode | null {
  let eng: PhoneCode | null = null;
  for (const c of PHONE_CODES) {
    if (phone.startsWith(c.code) && (!eng || c.code.length > eng.code.length)) eng = c;
  }
  return eng;
}
