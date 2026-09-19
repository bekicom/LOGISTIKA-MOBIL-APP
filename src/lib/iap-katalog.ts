/**
 * Ilova do'koni mahsulotlari — Apple IAP va Google Play Billing (2026-09-19).
 *
 * Bekzodning qarori (B1): tarif ilovada do'kon orqali ham sotiladi.
 *   • 30 kunlik, O'ZI YANGILANMAYDI — Apple «Non-Renewing Subscription»,
 *     Google bir martalik mahsulot (consumable). Har xarid rolga +30 kun,
 *     webdagi `activateRole` bilan bir xil (muddat qolgan bo'lsa ustiga).
 *   • Transport egasi — tayyor paketlar: 1, 2, 3, 5, 10, 20 mashina.
 *     20 dan katta park saytdan oladi.
 *   • Narx do'kon konsolida (USD pog'onasi, webdagiga eng yaqin) — kodda
 *     narx YO'Q: ilova uni do'kondan oladi.
 *
 * ID lar Apple va Google'da BIR XIL yaratiladi (ikkala do'kon qoidasiga
 * mos: kichik harf, raqam, nuqta). ⚠️ Apple mahsulot ID sini o'chirilgandan
 * keyin ham qayta ishlatib bo'lmaydi — o'zgartirmang, yangisini qo'shing.
 *
 * Nusxasi — `furam/src/lib/iap-katalog.ts` (server; sinov ikkalasini solishtiradi).
 */
/* ⚠️ IMPORT YO'Q — ilova nusxasi bilan bir xil bo'lishi uchun */

/** Bitta xarid necha kun beradi — webdagi tarif muddati bilan bir xil */
export const IAP_KUN = 30;

export type IapMahsulot = {
  /** Do'kondagi mahsulot ID si (Apple va Google'da bir xil) */
  id: string;
  /** Qaysi rolning tarifi */
  roleKey: string;
  /** Transport egasi — nechta mashina joyi; boshqa rollarda `null` */
  units: number | null;
};

/** Transport egasi paketlari (mashina soni) */
export const TRANSPORT_PAKETLAR = [1, 2, 3, 5, 10, 20] as const;

export const IAP_MAHSULOTLAR: readonly IapMahsulot[] = [
  { id: "uz.furam.start.30d", roleKey: "USER", units: null },
  { id: "uz.furam.driver.30d", roleKey: "DRIVER", units: null },
  ...TRANSPORT_PAKETLAR.map((n) => ({ id: `uz.furam.transport${n}.30d`, roleKey: "VEHICLE_OWNER", units: n })),
  { id: "uz.furam.cargo.30d", roleKey: "CARGO_OWNER", units: null },
  { id: "uz.furam.dispatch.30d", roleKey: "DISPATCHER", units: null },
  { id: "uz.furam.logistics.30d", roleKey: "LOGISTICS", units: null },
  { id: "uz.furam.master.30d", roleKey: "MASTER", units: null },
  { id: "uz.furam.service.30d", roleKey: "SERVICE", units: null },
  { id: "uz.furam.parts.30d", roleKey: "PARTS", units: null },
  { id: "uz.furam.passenger.30d", roleKey: "PASSENGER", units: null },
  { id: "uz.furam.auto.30d", roleKey: "AUTO_SELLER", units: null },
];

export function mahsulot(id: string): IapMahsulot | null {
  return IAP_MAHSULOTLAR.find((m) => m.id === id) ?? null;
}

/** Rolning mahsulotlari — transport egasida paketlar, boshqasida bitta */
export function rolMahsulotlari(roleKey: string): IapMahsulot[] {
  return IAP_MAHSULOTLAR.filter((m) => m.roleKey === roleKey);
}
