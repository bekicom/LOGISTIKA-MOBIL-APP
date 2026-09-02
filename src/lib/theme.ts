/**
 * FURAM dizayn token'lari.
 *
 * Qiymatlar web loyihasidagi `furam/src/app/globals.css` dan KO'CHIRILGAN —
 * o'ylab topilmagan. Web o'zgarsa shu fayl ham yangilanadi, aks holda
 * ikkalasi ajralib ketadi.
 */

export const color = {
  background: "#e9edf3",
  foreground: "#0f172a",
  card: "#ffffff",
  muted: "#f1f5f9",
  mutedForeground: "#64748b",
  border: "#e2e8f0",

  brand: "#f45a18",
  brandHover: "#d84e12",
  brandForeground: "#ffffff",

  navy: "#0b1526",
  navyForeground: "#f1f5f9",
  /** Logotipdagi ko'k — interfeys navy'sidan boshqa, ataylab */
  logoBlue: "#0a376e",

  success: "#16a34a",
  warning: "#b45309",
  danger: "#dc2626",
  info: "#1d4ed8",
} as const;

/** Radius: karta 14 (`--radius-card`), boshqaruv 8 (`rounded-lg`) */
export const radius = {
  control: 8,
  card: 14,
  sheet: 20,
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

/** Balandliklar — web'dagi `h-11` / `h-12` va mobil uchun kattaroq asosiy tugma */
export const size = {
  control: 44,
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

export const shadow = {
  card: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
} as const;
