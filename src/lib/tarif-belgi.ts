/**
 * Tarif belgisi — «Dispetcher · sinov 7 kun» (TZ-04, 2026-09-19).
 *
 * Webdagi sarlavha belgisining juftligi (`furam/src/components/layout/
 * header.tsx`, telefonda — profil menyusining boshida). Holat serverdan
 * (`/api/auth/me` → `tarif`, `rol-tanlash.ts:tarifHolati`) kalit va son
 * bilan keladi, matn shu yerda o'quvchi tilida yasaladi (1-qoida).
 *
 * Matnda sotuv so'zi YO'Q: «uzaytiring», «sotib oling», narx — hech biri
 * (Apple 3.1.1). Faqat holat. «Rolni tanlang» ham xavfsiz: rol tanlash
 * sinov muddatini ochadi, pul so'ramaydi (`rollarim.tsx`).
 */
/* ⚠️ IMPORT YO'Q — ataylab (`rollar.ts` dagi sabab): furam'dagi sinov bu
   faylni to'g'ridan-to'g'ri import qiladi. Tarjimon parametr bilan keladi. */

/** `furam/src/lib/rol-tanlash.ts:TarifHolati` */
export type TarifHolati =
  /** VIP yoki eski «premium» yoki admin — hammasi ochiq */
  | { holat: "VIP" }
  | { holat: "TRIAL"; rol: string; kun: number | null; boshqa: number }
  | { holat: "ACTIVE"; rol: string; boshqa: number }
  | { holat: "EXPIRED"; rol: string }
  | { holat: "NONE" };

/** Rang ma'nosi — webdagi: VIP va faol yashil, sinov sariq, tugagan qizil */
export type BelgiTon = "ok" | "sinov" | "tugadi" | "yoq";

type Tarjimon = (kalit: string, p?: Record<string, string | number>) => string;

const HOLATLAR = ["VIP", "TRIAL", "ACTIVE", "EXPIRED", "NONE"] as const;

/** Serverdan kelgani taniladimi — eski yoki buzilgan javobda belgi chizilmaydi */
export function isTarifHolati(x: unknown): x is TarifHolati {
  return (
    typeof x === "object" &&
    x !== null &&
    (HOLATLAR as readonly string[]).includes((x as { holat?: unknown }).holat as string)
  );
}

/** Belgi matni — webdagi bilan bir xil kalitlar va tartib, «+2» ham */
export function belgiMatni(x: TarifHolati, t: Tarjimon): string {
  const qolgan = (n: number) => (n > 0 ? ` +${n}` : "");
  switch (x.holat) {
    case "VIP":
      return t("tarifBelgi.vip");
    case "NONE":
      return t("tarifBelgi.yoq");
    case "EXPIRED":
      return t("tarifBelgi.tugadi");
    case "TRIAL":
      return t("tarifBelgi.sinov", { rol: t(`mob.role.${x.rol}`), n: x.kun ?? 0 }) + qolgan(x.boshqa);
    case "ACTIVE":
      return t("tarifBelgi.faol", { rol: t(`mob.role.${x.rol}`) }) + qolgan(x.boshqa);
  }
}

export function belgiToni(x: TarifHolati): BelgiTon {
  switch (x.holat) {
    case "VIP":
    case "ACTIVE":
      return "ok";
    case "TRIAL":
      return "sinov";
    case "EXPIRED":
      return "tugadi";
    case "NONE":
      return "yoq";
  }
}
