/**
 * Ish yo'nalishlari va kasblar — vakansiya berish shakli uchun (2026-09-21).
 *
 * Kalitlar `furam/src/lib/jobs.ts` bilan AYNAN BIR XIL — server kasbni
 * katalogdan tekshiradi (`isProfession`), noma'lum kalit `BAD_PROFESSION`
 * bilan qaytadi. Nomlari lug'atdan: `jobCatalog.directions.*`,
 * `jobCatalog.professions.*`, `jobCatalog.payKinds.*` (webdagi matn).
 *
 * ⚠️ Serverga yangi kasb qo'shilsa — shu yerga ham.
 */
export const YONALISHLAR = ["DRIVER", "LOGISTICS", "WORKSHOP"] as const;
export type Yonalish = (typeof YONALISHLAR)[number];

export const KASBLAR: Record<Yonalish, readonly string[]> = {
  DRIVER: ["fura", "tractor", "trailer", "gazel", "bongo", "porter", "isuzu", "minibus", "labo", "car", "special"],
  LOGISTICS: [
    "dispatcher",
    "forwarder",
    "logist",
    "log_manager",
    "operator",
    "warehouse",
    "cargo_control",
    "customs",
    "coordinator",
    "log_other",
  ],
  WORKSHOP: [
    "mechanic",
    "electric",
    "diagnostic",
    "engine",
    "gearbox",
    "chassis",
    "tyre",
    "vulcan",
    "welder",
    "body",
    "ac",
    "parts_spec",
    "service_admin",
    "shop_other",
  ],
};

/** `lib/vacancy.ts:PAY_KINDS` bilan bir xil */
export const TOLOV_TURLARI = ["TRIP", "MONTH", "PERCENT"] as const;

/** `/api/vacancies` qabul qiladigan valyutalar */
export const VAKANSIYA_VALYUTALARI = ["UZS", "USD", "RUB", "KZT", "EUR"] as const;
