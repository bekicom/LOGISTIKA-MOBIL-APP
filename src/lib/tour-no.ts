// Aylanma va uning bosqichlari raqami — BITTA joyda (2026-09-11).
//
// Mijoz TZ 8: «Aylanma №10001 → 10001/1 Namangan–Almaty →
// 10001/2 Almaty–Khorgos». Avval «A-3» va reysning o'z raqami
// «#100245» chiqardi — qaysi reys qaysi aylanmaning nechanchi
// bosqichi ekani ko'rinmasdi.
//
// Sof funksiya: server, klient va bildirishnoma matni bir xil
// ko'rinishni oladi.

/** «№10001» */
export function aylanmaNo(no: number): string {
  return `№${no}`;
}

/** «10001/2» — aylanmaning ikkinchi bosqichi */
export function bosqichNo(tourNo: number, order: number | null | undefined): string {
  return order ? `${tourNo}/${order}` : `${tourNo}/—`;
}
