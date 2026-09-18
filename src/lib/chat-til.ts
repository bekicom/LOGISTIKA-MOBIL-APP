/**
 * Suhbatda til — «Menga» va «Unga» tugmalari (TZ-08, 2026-09-19).
 *
 * ── MANBA — SERVER ──────────────────────────────────────────────
 *
 * Qoidalar `furam/src/lib/chat-til.ts` da, bu yerda faqat ilovaga
 * kerak bo'lgan SHAKL va ikki kichik qaror:
 *
 *   Menga — kelgan xabarni shu tilda o'qiyman (har suhbatga alohida);
 *   Unga  — men yozganim suhbatdoshga shu tilda ketadi (faqat ikki
 *           kishilik suhbatda). `null` — standart: profil tili va
 *           suhbatdoshning o'qish tili.
 *
 * Shakl va ro'yxatlarning server bilan bir xilligini
 * `furam/scripts/test-chat-til-mobile.ts` tekshiradi.
 */
/* ⚠️ IMPORT YO'Q — ataylab (`rollar.ts` dagi sabab): furam'dagi sinov
   bu faylni to'g'ridan-to'g'ri import qiladi, furam'da esa `@/` boshqa
   papkaga ishora qiladi. */

/** `ChatTillari` — `GET /api/chat/[id]/messages` (birinchi sahifa) va `/lang` */
export type ChatTillari = {
  /** Kelgan xabar shu tilda ko'rinadi; null — asl matn */
  menga: string | null;
  mengaTanlangan: boolean;
  /** Yozganim shu tilda ketadi; null — tarjimasiz */
  unga: string | null;
  ungaTanlangan: boolean;
  /** «Unga» faqat ikki kishilik suhbatda */
  ungaBor: boolean;
  /** «Standart: …» qatori uchun */
  mengaStandart: string | null;
  ungaStandart: string | null;
};

/**
 * Suhbat tillari — web `CHAT_LANGS` bilan BIR XIL tartibda
 * (`furam/src/lib/lang.ts`): ikki platformada ro'yxat bir xil turadi.
 * Ilova tillari (`LOCALES`) bilan to'plami bir, tartibi boshqa.
 */
export const CHAT_TILLARI = ["uz", "ru", "zh", "en", "kk", "tr", "ky", "tg"] as const;

export type ChatTil = (typeof CHAT_TILLARI)[number];

export function isChatTil(v: unknown): v is ChatTil {
  return typeof v === "string" && (CHAT_TILLARI as readonly string[]).includes(v);
}

/** Xabar «Unga» tilida tarjimasiz ketgan bo'lsa — sababi (`TarjimasizSabab`) */
export const TARJIMASIZ_SABABLAR = ["RATE_LIMIT", "AI_OFF", "FAILED"] as const;

export type TarjimasizSabab = (typeof TARJIMASIZ_SABABLAR)[number];

/**
 * Yuborish javobidagi `tarjimasiz` → lug'at kaliti qismi.
 *
 * Noma'lum qiymat — `null`: server yangi sabab qo'shsa ilova
 * «[missing chatTil.sabab.X]» ko'rsatmasin, jim qolsin.
 */
export function tarjimasizSabab(v: unknown): TarjimasizSabab | null {
  return typeof v === "string" && (TARJIMASIZ_SABABLAR as readonly string[]).includes(v)
    ? (v as TarjimasizSabab)
    : null;
}

/**
 * Yangi kelgan xabar o'quvchi tiliga hali o'girilmaganmi — tarjima
 * so'rash kerakmi (`fillTranslations` bilan bir xil shart).
 *
 * Suhbat OCHIQ turganda kelgan xabar ham o'girilsin: ilgari tarjima
 * faqat suhbat ochilganda so'ralardi va yangi xabar qayta kirilmaguncha
 * asl tilda turardi. Shu bilan birga har 6 soniyada so'ralmaydi —
 * faqat shunday xabar kelganda.
 *
 * Tizim xabari (`senderId` yo'q) va faylsiz-matnsiz xabar o'girilmaydi:
 * server ularni baribir olmaydi, so'rov bekorga ketardi.
 */
export function tarjimaKerak(
  m: { senderId: string | null; type: string; text: string | null; translated: boolean; lang: string | null },
  meId: string | null,
  menga: string | null,
): boolean {
  return (
    !!menga &&
    !!m.senderId &&
    m.senderId !== meId &&
    (m.type === "TEXT" || m.type === "VOICE") &&
    !!m.text &&
    !m.translated &&
    m.lang !== menga
  );
}
