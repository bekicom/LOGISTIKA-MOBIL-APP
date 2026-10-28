// Yuk nomlari ro'yxati (TZ 28-okt §43): «yuk nomi ro'yxatdan».
//
// ⚠️ Ilova shu faylning ANIQ nusxasini ishlatadi (`mobil/src/lib/yuk-nomlari.ts`),
// `test-tz4-bozor.ts` ikkalasini solishtiradi.
//
// Tekshiruvda yuk nomi qo'lda yozilardi va import e'lonlarda «lanadi»,
// «Narx 2», «kumir», «plashadka» kabi nomlar chiqdi. Endi forma ro'yxatni
// taklif qiladi (nomi lug'atda `yukNomi.<kalit>`, foydalanuvchi tilida);
// ro'yxatda yo'q yuk baribir yoziladi — majburlanmaydi.
export const YUK_NOMLARI = [
  "mevaSabzavot",
  "kartoshka",
  "piyoz",
  "olma",
  "uzum",
  "poliz",
  "un",
  "shakar",
  "guruch",
  "donMahsulot",
  "oziqOvqat",
  "ichimlik",
  "gosht",
  "sement",
  "gisht",
  "armatura",
  "metall",
  "yogoch",
  "qurilish",
  "komir",
  "ogit",
  "kimyo",
  "neft",
  "paxta",
  "tekstil",
  "mebel",
  "maishiyTexnika",
  "uskunalar",
  "ehtiyotQism",
  "plastmassa",
  "qogoz",
  "dori",
  "konteyner",
  "texnika",
] as const;
export type YukNomi = (typeof YUK_NOMLARI)[number];
