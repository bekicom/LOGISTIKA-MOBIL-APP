/**
 * FURAM dizayn token'lari.
 *
 * ── DIZAYN-2 (2026-09-06) ────────────────────────────────────────
 *
 * Ilgari qiymatlar web `globals.css` dan ko'chirilgan edi va ilova
 * saytga o'xshab qolgandi: kulrang fon, 1px chegarali karta, soya
 * yo'q. Bekzod «zamonaviy emas» dedi va namuna berdi (Kornet, diip,
 * Egasi). Ularning umumiy tomoni: oq/juda och fon, chegarasiz karta
 * + yumshoq soya, katta radius, aksent rang dadil.
 *
 * Bu fayl 94 ta ekran tomonidan o'qiladi — bir o'zgarish hammasiga
 * tarqaladi. Shuning uchun dizayn shu yerdan boshlanadi, ekrandan
 * emas.
 *
 * Web bilan endi ATAYLAB farq qiladi: telefon va brauzer bir xil
 * ko'rinmasligi kerak, faqat bir xil ma'lumot ko'rsatishi kerak.
 */

export const color = {
  /* Fon deyarli oq, lekin sovuq: oq karta ustida ko'rinsin */
  background: "#f4f6fa",
  foreground: "#0f172a",
  card: "#ffffff",
  muted: "#f1f4f9",
  mutedForeground: "#64748b",
  /* Chegara endi «bor-yo'q» — ko'p ekran o'z kartasini 1px chegara
     bilan chizadi, ularni birma-bir tuzatmasdan yumshatish yo'li shu */
  border: "#eaeef4",

  brand: "#f45a18",
  brandHover: "#d84e12",
  brandForeground: "#ffffff",
  /* Ikonka orqasi uchun och rang — to'q sariqning 8% i */
  brandSoft: "#fff0e8",

  navy: "#0b1526",
  navyForeground: "#f1f5f9",
  /** Logotipdagi ko'k — interfeys navy'sidan boshqa, ataylab */
  logoBlue: "#0a376e",
  /* Kirish ekranlari va ikkinchi aksent — LOGODAGI ko'k, katta
     yuza uchun biroz ochroq. Bekzod (2026-09-06): «rangni boshqa
     appdan olma, bizniki to'q ko'k + to'q sariq». Kornet uslubidagi
     yorqin #1f56c9 rad etildi. */
  blue: "#0f4a94",
  blueSoft: "#e8f0fb",

  success: "#16a34a",
  successSoft: "#e8f7ee",
  warning: "#b45309",
  warningSoft: "#fff4e5",
  danger: "#dc2626",
  dangerSoft: "#fdecec",
  info: "#1d4ed8",
  purple: "#7c3aed",
  purpleSoft: "#f1ecfb",
} as const;

/** Radius: karta 20, boshqaruv 12 — namunalardagi kabi */
export const radius = {
  control: 12,
  card: 20,
  sheet: 24,
  pill: 9999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/** Balandliklar — asosiy tugma 52, boshqaruv 46 */
export const size = {
  control: 46,
  controlLg: 52,
  touch: 44,
} as const;

export const font = {
  micro: 11,
  caption: 13,
  body: 15,
  bodyLg: 16,
  title: 18,
  titleLg: 22,
  display: 26,
} as const;

/**
 * Soya — endi haqiqiy. Ilgari 0.05/2px edi, ya'ni ko'rinmasdi va
 * karta chegaraga muhtoj bo'lardi. Android'da `elevation`, iOS'da
 * `shadow*` — ikkalasi ham beriladi.
 */
export const shadow = {
  card: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  /** Ko'tarilgan narsa — tab bardagi «+», suzuvchi tugma */
  float: {
    shadowColor: "#f45a18",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  /** Tab bar — yuqoriga tushadigan yengil soya */
  bar: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
} as const;
