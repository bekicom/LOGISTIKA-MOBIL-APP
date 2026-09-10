/**
 * FURAM dizayn token'lari va IKKI REJIM.
 *
 * ── DIZAYN-2 (2026-09-06) ────────────────────────────────────────
 *
 * Ilgari qiymatlar web `globals.css` dan ko'chirilgan edi va ilova
 * saytga o'xshab qolgandi: kulrang fon, 1px chegarali karta, soya
 * yo'q. Bekzod «zamonaviy emas» dedi va namuna berdi (Kornet, diip,
 * Egasi). Ularning umumiy tomoni: oq/juda och fon, chegarasiz karta
 * + yumshoq soya, katta radius, aksent rang dadil.
 *
 * Web bilan ATAYLAB farq qiladi: telefon va brauzer bir xil
 * ko'rinmasligi kerak, faqat bir xil ma'lumot ko'rsatishi kerak.
 *
 * ═══════════════════════════════════════════════════════════════
 * QORONG'I REJIM — 2026-09-10
 * ═══════════════════════════════════════════════════════════════
 *
 * ── MUAMMO ──────────────────────────────────────────────────────
 *
 * `StyleSheet.create` qiymatni MODUL YUKLANGANDA muzlatadi. Ya'ni
 * 159 ta ekrandagi `const s = StyleSheet.create({ ... color.card
 * ... })` bir marta hisoblanadi va keyin rang o'zgarsa ham o'sha
 * qiymat bilan qolib ketadi. Komponentni qayta chizish ham
 * yordam bermaydi: modul tanasi qayta ishlamaydi.
 *
 * ── YECHIM: TIRIK PROXY + REJIMGA BIR MARTA QURILADIGAN USLUB ───
 *
 * 1. `color` va `shadow` — oddiy obyekt EMAS, `Proxy`. Har
 *    murojaatda FAOL rejimning qiymatini qaytaradi. Shu bilan
 *    JSX dagi 987 ta murojaat (`stroke={color.brand}`) o'zi
 *    ishlab ketadi — ular chizish paytida o'qiladi.
 *
 * 2. `themed(() => ({ ... }))` — uslublar HAR REJIM UCHUN
 *    ALOHIDA quriladi va keshlanadi. Qurilish paytida proxy
 *    aynan o'sha rejimga javob beradi (`buildingFor`), shuning
 *    uchun qorong'i uslub yorug' ranglarni olib qolmaydi.
 *
 *    Natijada 159 ta faylda TANA O'ZGARMADI: faqat
 *    `StyleSheet.create({` → `themed(() => ({`. `s.root` esa
 *    qanday bo'lsa shundayligicha ishlaydi — komponent ichida
 *    ham, yordamchi funksiyada ham.
 *
 * 3. Rejim o'zgarsa butun daraxt qayta chiziladi
 *    (`useThemeVersion` → `_layout.tsx` dagi kalit). Modul tanasi
 *    qayta ishlamaydi, lekin unga hojat ham yo'q: uslub proxy'si
 *    yangi rejimning keshini qaytaradi.
 *
 * ── QORONG'I PALITRA TESKARI EMAS ───────────────────────────────
 *
 * Ranglar teskari qilinmadi, QAYTA TANLANDI:
 *   · fon sovuq qora-ko'k (#0b1220) — brend navy'si bilan bir
 *     oilada, sof qora emas: sof qorada karta ko'rinmaydi;
 *   · brend to'q sarig'i biroz OCHROQ (#f2601f) — asl #f45a18
 *     qorong'i fonda loyqalanadi;
 *   · logodagi to'q ko'k qorong'ida umuman ko'rinmaydi, shuning
 *     uchun u ham ochroq;
 *   · `*Soft` ranglar (ikonka orqasi) OQ tint emas, TO'Q tint:
 *     yorug' rejimdagi #fff0e8 qorong'ida ko'zni qamashtirardi.
 */

import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";

export type ThemeName = "light" | "dark";

/**
 * `StyleSheet.create` ning tur cheklovi AYNAN takrorlanadi.
 *
 * ⚠️ Busiz TS `alignItems: "center"` ni `string` deb xulosa
 * qiladi va 2653 ta xato chiqadi: RN `FlatAlignType` kutadi.
 * Cheklov har yozuvni `ViewStyle | TextStyle | ImageStyle` ga
 * solishtiradi va shu tekshiruv satr adabiyotini toraytiradi.
 */
type Named<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

type Palette = {
  background: string;
  foreground: string;
  card: string;
  muted: string;
  mutedForeground: string;
  border: string;
  brand: string;
  brandHover: string;
  brandForeground: string;
  brandSoft: string;
  navy: string;
  navyForeground: string;
  logoBlue: string;
  blue: string;
  blueSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  purple: string;
  purpleSoft: string;
  /* ── ROL RANGLARI (2026-09-10) ──────────────────────────────
     Bular ilgari 300 dan ortiq joyda QATTIQ yozilgan edi
     (`stroke="#475569"`, `color: "#15803d"`). Yorug' rejimda
     ular to'g'ri ishlardi, qorong'ida esa yo'qolib ketardi:
     `#475569` qorong'i karta ustida 2.09 — ko'rinmaydi. */
  /** Ikonka chizig'i va ikkilamchi matn */
  icon: string;
  /** NOFAOL ikonka, nuqtali chegara — ataylab past kontrast */
  iconFaint: string;
  /** Karta ustidagi ichki yuza (fayl tanlash, bo'sh joy) */
  surface: string;
  /* Chip yozuvlari: fon `*Soft`, yozuv `*Text` */
  brandText: string;
  successText: string;
  warningText: string;
  dangerText: string;
};

const LIGHT: Palette = {
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

  /* Qiymatlar O'ZGARMADI — kodda qattiq yozilgani shu edi,
     ya'ni yorug' rejim ko'rinishi bir pikselga ham tegilmagan */
  icon: "#475569",
  iconFaint: "#cbd5e1",
  surface: "#f8fafc",
  brandText: "#c2490f",
  successText: "#15803d",
  warningText: "#92400e",
  dangerText: "#b91c1c",
};

const DARK: Palette = {
  /* ⚠️ 2026-09-10 da OCHROQ QILINDI. Birinchi variant (#0b1220)
     Bekzodga «juda qorayib ketgan» tuyuldi va u haq: sof qoraga
     yaqin fonda ilova o'chgan ekran kabi ko'rinadi, karta esa
     faqat soya bilan ajraladi — qorong'ida soya esa ko'rinmaydi. */
  background: "#141c2e",
  foreground: "#eaf0f9",
  /* Karta fondan RANG bilan ajraladi (1.23), chegara bilan emas */
  card: "#212d44",
  muted: "#2a3651",
  mutedForeground: "#9aa8bf",
  border: "#33415e",

  brand: "#f2601f",
  brandHover: "#d8541a",
  brandForeground: "#ffffff",
  /* ⚠️ IKONKA ORQASI JIGARRANG EMAS, NEYTRAL KO'TARILISH.
     Birinchi variant (#4d2513 — to'q sariqning to'q tinti)
     ekranda LOYQA JIGARRANG kvadratlar bo'lib chiqdi: menyudagi
     15 ta plitka iflos ko'rinardi (Bekzod suratda ko'rsatdi).

     Zamonaviy qorong'i interfeyslar bunday joyda aksent tintini
     emas, KARTANING o'z rangidan ko'tarilishni ishlatadi — rang
     esa ikonkaning o'zida qoladi. Shunda plitka toza ko'rinadi
     va aksent bir joyda — ikonkada — to'planadi. */
  brandSoft: "#2f3c5a",

  /* Navy ekranlar (kirish, splash) fondan ham TO'QROQ */
  navy: "#0d1524",
  navyForeground: "#eaf0f9",
  logoBlue: "#4a8ede",
  blue: "#5d99e6",
  blueSoft: "#293c5b",

  /* Holat ranglari ochroq — karta ham ochroq bo'lgani uchun
     `*Soft` tintlar ham ko'tarildi */
  success: "#3ecf7a",
  successSoft: "#223d33",
  warning: "#e8a53f",
  warningSoft: "#453d29",
  danger: "#f4665e",
  dangerSoft: "#52353d",
  info: "#6d9bf7",
  purple: "#ac8bf3",
  purpleSoft: "#3a3359",

  icon: "#a7b4c8",
  iconFaint: "#4d5b74",
  surface: "#2a3651",
  brandText: "#ff8f5c",
  successText: "#5ad894",
  warningText: "#f0b45f",
  dangerText: "#ff8f87",
};


const PALETTES: Record<ThemeName, Palette> = { light: LIGHT, dark: DARK };

/* ─────────────────────────────── Faol rejim */

let active: ThemeName = "light";

/**
 * Uslub QURILAYOTGAN rejim.
 *
 * `themed()` qorong'i uslubni yorug' rejim faol turganda ham
 * qurishi mumkin (odam almashtirgan zahoti). O'shanda proxy
 * faol rejimni bersa, qorong'i uslub yorug' ranglarni olib
 * qolardi — eng nozik joyi shu.
 */
let buildingFor: ThemeName | null = null;

const nowName = (): ThemeName => buildingFor ?? active;

export const themeName = (): ThemeName => active;

/**
 * Faol rejimni almashtirish.
 *
 * Uslub keshiga TEGMAYDI: har rejimning keshi alohida va u
 * `themed()` ichida saqlanadi. Ya'ni ikkinchi marta qaytganda
 * qayta qurilmaydi.
 */
export function applyTheme(name: ThemeName): void {
  active = name;
}

/* ─────────────────────────────── Soyalar */

type ShadowSet = {
  card: object;
  float: object;
  bar: object;
};

/**
 * Soya — endi haqiqiy. Ilgari 0.05/2px edi, ya'ni ko'rinmasdi va
 * karta chegaraga muhtoj bo'lardi. Android'da `elevation`, iOS'da
 * `shadow*` — ikkalasi ham beriladi.
 *
 * ⚠️ QORONG'IDA SOYA BOSHQACHA: qora fonda qora soya ko'rinmaydi.
 * Shuning uchun u KUCHLIROQ va qorayroq — karta chekkasi baribir
 * sezilishi kerak, aks holda ekran bir tekis dog' bo'lib qoladi.
 */
const SHADOWS: Record<ThemeName, ShadowSet> = {
  light: {
    card: {
      shadowColor: "#0f172a",
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    float: {
      shadowColor: "#f45a18",
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    bar: {
      shadowColor: "#0f172a",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: -4 },
      elevation: 12,
    },
  },
  dark: {
    card: {
      shadowColor: "#000000",
      shadowOpacity: 0.5,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    float: {
      /* Ko'tarilgan tugma qorong'ida ham ISSIQ nur beradi — u
         ekrandagi yagona yorqin narsa va soyasi shuni
         kuchaytiradi */
      shadowColor: "#f2601f",
      shadowOpacity: 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    },
    bar: {
      shadowColor: "#000000",
      shadowOpacity: 0.55,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: -4 },
      elevation: 14,
    },
  },
};

/* ─────────────────────────────── Tirik proxy'lar */

/**
 * `color.brand` — FAOL rejimning qiymati.
 *
 * Oddiy obyekt bo'lsa, uni `import` qilgan joy bir marta o'qib
 * qotib qolardi. Proxy esa har murojaatda javob beradi va JSX
 * dagi 987 ta ishlatilish o'zi to'g'ri rangni oladi.
 */
export const color = new Proxy({} as Palette, {
  get: (_t, k: string) => PALETTES[nowName()][k as keyof Palette],
  has: (_t, k: string) => k in LIGHT,
  ownKeys: () => Object.keys(LIGHT),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

export const shadow = new Proxy({} as ShadowSet, {
  get: (_t, k: string) => SHADOWS[nowName()][k as keyof ShadowSet],
  has: (_t, k: string) => k in SHADOWS.light,
  ownKeys: () => Object.keys(SHADOWS.light),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

/* ─────────────────────────────── Rejimga bog'liq uslub */

/**
 * Rejimga qarab uslub.
 *
 *   const s = themed(() => ({ root: { backgroundColor: color.card } }));
 *
 * `s.root` — hamma joyda, hech qanday hook chaqirmasdan ishlaydi:
 * komponent ichida ham, yordamchi funksiyada ham. Shu sababdan
 * 159 ta faylning TANASI umuman o'zgarmadi.
 *
 * Har rejim uchun uslub BIR MARTA quriladi va keshlanadi — ya'ni
 * `StyleSheet.create` ning tekshiruvi va tezligi saqlanadi.
 */
export function themed<T extends Named<T> | Named<never>>(build: () => T): T {
  const cache = new Map<ThemeName, T>();

  const get = (): T => {
    const name = nowName();
    const bor = cache.get(name);
    if (bor) return bor;
    /* Qurilish paytida proxy AYNAN shu rejimga javob berishi
       kerak — `nowName()` shuni `buildingFor` dan o'qiydi */
    const prev = buildingFor;
    buildingFor = name;
    try {
      /* `StyleSheet.create` SAQLANADI: u qiymatlarni tekshiradi
         (noto'g'ri xususiyat ishlash paytida jimgina tashlanardi)
         va RN uni o'z ichida optimallashtiradi. */
      const built = StyleSheet.create(build());
      cache.set(name, built);
      return built;
    } finally {
      buildingFor = prev;
    }
  };

  return new Proxy({} as T, {
    get: (_t, k: string) => get()[k as keyof T],
    has: (_t, k: string) => k in get(),
    ownKeys: () => Object.keys(get()),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
}

/* ─────────────────────────────── O'lchamlar (rejimga bog'liq emas) */

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
