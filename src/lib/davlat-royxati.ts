/**
 * Davlat va toifa ro'yxatlari — forma va anketalarda (2026-09-19).
 *
 * Webdagi ro'yxatlarning ANIQ nusxasi, tartibi bilan. Ilgari har ekran
 * o'z ro'yxatini yozardi va ikkitasi orqada qoldi: mashina qo'shishda
 * 8 ta davlat (webda 16), rezyumeda 8 ta davlat (webda 10) va 5 ta
 * toifa (webda 6). Webda tanlangan «Polsha», «Yevropa» yoki «BE» ilovada
 * ko'rinmasdi — odam uni ilovada tuzata ham, olib tashlay ham olmasdi.
 * Sinov (`test-mayda-mobile.ts`) web manbalari bilan solishtiradi.
 *
 * Nomlar — `jobCatalog.countries.*` (17 ta, sakkiz tilda).
 */
/* ⚠️ IMPORT YO'Q — ataylab (`rollar.ts` dagi sabab): furam'dagi sinov bu
   faylni to'g'ridan-to'g'ri import qiladi. */

/**
 * Ish davlatlari — `furam/src/lib/dispatcher.ts:WORK_COUNTRIES`: mashina
 * qo'shish, dispetcher va haydovchi anketasi. Server boshqasini rad etadi
 * (`c in WORK_COUNTRIES`).
 */
export const ISH_DAVLATLARI = [
  "UZ", "RU", "KZ", "KG", "TJ", "TM", "TR", "CN",
  "AF", "IR", "AZ", "BY", "GE", "UA", "PL", "DE",
] as const;

/** Rezyume — `furam/src/app/jobs/resume/resume-form.tsx:COUNTRIES` («EU» — Yevropa) */
export const REZYUME_DAVLATLARI = ["UZ", "KZ", "RU", "CN", "KG", "TJ", "TM", "TR", "BY", "EU"] as const;

/** Haydovchilik toifalari — `furam/src/lib/driver-link.ts:LICENSE_CLASSES` (webdagi rezyume ham shu) */
export const TOIFALAR = ["B", "C", "CE", "D", "DE", "BE"] as const;
