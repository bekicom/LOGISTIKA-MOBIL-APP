/**
 * Ro'yxatdan o'tishda tanlanadigan rollar (TZ-04, 2026-09-19).
 *
 * ── MANBA — WEB ─────────────────────────────────────────────────
 *
 * Bu fayl `furam/src/lib/rol-tanlash.ts` ning ANIQ nusxasi: qaysi
 * rollar sotuvda, qaysi guruhda, qaysi tartibda va eski `User.role`
 * ustuniga qanday tushadi. Server ro'yxatni ilovaga bermaydi
 * (`GET /api/roles` kirishni talab qiladi, ro'yxat esa kirishdan
 * OLDIN kerak), shuning uchun nusxa — va uning web bilan bir xilligini
 * `furam/scripts/test-rollar-mobile.ts` har safar tekshiradi. Webda rol
 * qo'shilsa, sinov yiqiladi va bu fayl yangilanadi.
 *
 * ── NEGA MUHIM ──────────────────────────────────────────────────
 *
 * Jonlida 220 foydalanuvchidan 114 tasi «dispecher» bo'lib yozilgan,
 * ulardan 104 tasi hech narsa qilmagan: ro'yxatda faqat 4 ta eski rol
 * bor edi va ro'yxatdan o'tganda HECH QANDAY tarif roli ochilmasdi —
 * odam kirardi-yu, bo'limlari qulf edi. Endi tanlangan rolning sinov
 * muddati ro'yxatdan o'tgan zahoti boshlanadi (`roleKey`).
 */
/* ⚠️ IMPORT YO'Q — ataylab. Bu faylni `furam/scripts/test-rollar-mobile.ts`
   ham o'qiydi va furam'da `@/` boshqa papkaga ishora qiladi: bitta
   `@/components/…` importi furam'ning tip tekshiruvini (va `next build`
   ni) yiqitardi (2026-09-19 da aynan shunday bo'ldi). */

/** Sotuvdagi rollar — `ROYXAT_ROLLARI` bilan bir xil tartibda */
export const ROYXAT_ROLLARI = [
  "USER",
  "DRIVER",
  "VEHICLE_OWNER",
  "CARGO_OWNER",
  "DISPATCHER",
  "LOGISTICS",
  "MASTER",
  "SERVICE",
  "PARTS",
  "PASSENGER",
  "AUTO_SELLER",
] as const;

export type RoyxatRol = (typeof ROYXAT_ROLLARI)[number];

export type RolGuruh = "cargo" | "transport" | "service" | "other";

/** `royxatGuruhlari()` natijasi — eng ko'p ishlatiladigani tepada */
export const ROL_GURUHLARI: readonly { guruh: RolGuruh; rollar: readonly RoyxatRol[] }[] = [
  { guruh: "cargo", rollar: ["CARGO_OWNER", "DISPATCHER", "LOGISTICS"] },
  { guruh: "transport", rollar: ["DRIVER", "VEHICLE_OWNER", "AUTO_SELLER"] },
  { guruh: "service", rollar: ["MASTER", "SERVICE", "PARTS"] },
  { guruh: "other", rollar: ["USER", "PASSENGER"] },
];

export function isRoyxatRol(v: unknown): v is RoyxatRol {
  return typeof v === "string" && (ROYXAT_ROLLARI as readonly string[]).includes(v);
}

/** Eski `User.role` ustuni — server hali ham majburiy qiladi */
export type EskiRol = "SHIPPER" | "DRIVER" | "VEHICLE_OWNER" | "DISPATCHER";

/** Eski qiymat → haqiqiy rol (`LEGACY_ROLE_MAP`) */
const ESKIDAN: Record<EskiRol, RoyxatRol> = {
  SHIPPER: "CARGO_OWNER",
  DRIVER: "DRIVER",
  VEHICLE_OWNER: "VEHICLE_OWNER",
  DISPATCHER: "DISPATCHER",
};

/**
 * Tanlangan rol → eski ustun (`eskiRol`).
 *
 * Server `roleKey` kelsa eski ustunni o'zi ham shundan chiqaradi —
 * bu yerda faqat majburiy maydonni to'g'ri to'ldirish uchun.
 */
export function eskiRol(r: RoyxatRol): EskiRol {
  const teskari = (Object.keys(ESKIDAN) as EskiRol[]).find((k) => ESKIDAN[k] === r);
  if (teskari) return teskari;
  if (r === "LOGISTICS") return "DISPATCHER";
  return "SHIPPER";
}

/**
 * Havola yoki oldingi ekrandan kelgan qiymat → rol (`boshlangichRol`).
 *
 * Eski qiymatlar («SHIPPER», «DRIVER») ham tushuniladi: haydovchi
 * taklifi va eski havolalar `role=DRIVER` bilan keladi. Noma'lum
 * qiymat — `null`: ekran tanlovni o'zi so'raydi.
 */
export function boshlangichRol(qiymat: string | null | undefined): RoyxatRol | null {
  if (isRoyxatRol(qiymat)) return qiymat;
  if (qiymat && qiymat in ESKIDAN) return ESKIDAN[qiymat as EskiRol];
  return null;
}

/**
 * Rol belgisi — guruh rangi bilan birga `RolePicker` da chiziladi.
 *
 * `as const satisfies` — qiymatlar ANIQ nom bo'lib qoladi va `Icon`
 * komponentiga berilganda mavjudligi o'sha joyda tekshiriladi (bu faylda
 * `IconName` import qilinmaydi, sababi yuqorida).
 */
export const ROL_IKONKA = {
  CARGO_OWNER: "package",
  DISPATCHER: "headset",
  LOGISTICS: "route",
  DRIVER: "truck",
  VEHICLE_OWNER: "users",
  AUTO_SELLER: "tag",
  MASTER: "wrench",
  SERVICE: "briefcase",
  PARTS: "grid",
  USER: "user",
  PASSENGER: "map-pin",
} as const satisfies Record<RoyxatRol, string>;

/**
 * Izoh kaliti.
 *
 * Haydovchi va egada «MASHINA KIMNIKI» — mijoz 2026-09-09 da webda
 * shu chalkashlikni tuzattirgan (`rolTanlash.*`). Ilovadagi eski
 * `mob.signUp.roleDriver` («O'zim haydayman, yuk qidiraman») aynan
 * o'sha chalkash matn edi va endi ishlatilmaydi.
 */
export function rolIzohKaliti(r: RoyxatRol): string {
  return r === "DRIVER" || r === "VEHICLE_OWNER" ? `rolTanlash.${r}` : `mob.roleHint.${r}`;
}
