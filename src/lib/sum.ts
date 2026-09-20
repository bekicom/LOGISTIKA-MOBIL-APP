/**
 * Pul maydonlari — kiritish paytida ming ajratgich.
 *
 * 2026-09-20 qo'lda sinovi: «28 000 000» degan namuna turadi, odam esa
 * «25000000» deb yozadi va nol sanab o'tirishga majbur bo'ladi.
 *
 * HOLATDA AJRATGICHLI MATN SAQLANADI — ataylab: ekranlardagi `num()`
 * bo'shliqni olib tashlab raqamga o'giradi, ya'ni yuborishdan oldin
 * qo'shimcha o'zgartirish kerak emas. Ajratgich — ODDIY bo'shliq
 * (`Intl` beradigan ` ` emas): oddiy bo'shliq bilan `num()` va
 * server tomoni bir xil ishlaydi.
 *
 * Kursor: raqam oxiriga yozilganda joyida qoladi (odatdagi holat).
 * O'rtaga yozilsa oxiriga sakraydi — pul maydonida bu kam uchraydi,
 * shuning uchun qo'shimcha murakkablik kiritilmadi.
 */
export function sumKiritish(text: string): string {
  const raqam = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
  if (!raqam) return "";
  return raqam.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
