/**
 * Ilova tili.
 *
 * MANBA — WEB LUG'ATI. Tarjimalar bu yerda yozilmaydi: ular
 * `furam/src/messages/*.json` da, sakkiz tilda, 4800 dan ortiq kalit
 * bilan turibdi. `src/messages/*.json` fayllari o'sha yerdan
 * KO'CHIRILADI:
 *
 *   cd furam && npx tsx scripts/sync-mobile-i18n.ts
 *
 * Nega ko'chiriladi, import qilinmaydi: mobil ilovaga web'ning
 * hamma kaliti kerak emas (admin panel, PDF, landing sahifa), va
 * ikkita repo bir-birining `node_modules` iga qaray olmaydi.
 *
 * Nega yangi lug'at yasalmaydi: sakkiz tilni ikki joyda yuritish —
 * ularning ajralib ketishi demak. Bir joyda tuzatilgan xato
 * ikkinchisida qolib ketardi.
 */
import { I18n } from "i18n-js";
import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";

import uz from "@/messages/uz.json";
import ru from "@/messages/ru.json";
import en from "@/messages/en.json";
import kk from "@/messages/kk.json";
import ky from "@/messages/ky.json";
import tg from "@/messages/tg.json";
import tr from "@/messages/tr.json";
import zh from "@/messages/zh.json";

/** Web'dagi `furam/src/lib/locale.ts` bilan bir xil ro'yxat */
export const LOCALES = ["uz", "ru", "en", "tr", "kk", "ky", "tg", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";

export const LOCALE_INFO: Record<Locale, { native: string; flag: string }> = {
  uz: { native: "O'zbekcha", flag: "🇺🇿" },
  ru: { native: "Русский", flag: "🇷🇺" },
  en: { native: "English", flag: "🇬🇧" },
  tr: { native: "Türkçe", flag: "🇹🇷" },
  kk: { native: "Қазақша", flag: "🇰🇿" },
  ky: { native: "Кыргызча", flag: "🇰🇬" },
  tg: { native: "Тоҷикӣ", flag: "🇹🇯" },
  zh: { native: "中文", flag: "🇨🇳" },
};

export const isLocale = (v: unknown): v is Locale =>
  typeof v === "string" && (LOCALES as readonly string[]).includes(v);

const KEY = "furam_locale";

export const i18n = new I18n({ uz, ru, en, kk, ky, tg, tr, zh });

/* Kalit topilmasa o'zbekchaga tushadi — bo'sh matn yoki
   «[missing ...]» ko'rsatishdan ko'ra tushunarli. */
i18n.defaultLocale = DEFAULT_LOCALE;
i18n.enableFallback = true;
i18n.locale = DEFAULT_LOCALE;

/** Qurilma sozlamasidan taxmin — birinchi ochilishda taklif qilinadi */
export function deviceLocale(): Locale {
  for (const l of getLocales()) {
    const tag = l.languageCode?.toLowerCase();
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}

/** Saqlangan tilni o'qish. Hech qachon tashlamaydi. */
export async function readLocale(): Promise<Locale | null> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return isLocale(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Tilni o'rnatish va saqlash.
 *
 * `i18n.locale` DARHOL o'zgaradi: saqlash tugashini kutsak,
 * ekran bir zum eski tilda qolib ketardi.
 */
export async function setLocale(locale: Locale): Promise<void> {
  i18n.locale = locale;
  try {
    await SecureStore.setItemAsync(KEY, locale);
  } catch {
    // Saqlanmasa ham joriy seans to'g'ri tilda ishlayveradi
  }
}

/**
 * Joriy til — `api.ts` `Accept-Language` uchun shuni o'qiydi.
 *
 * Sinxron: har so'rovda `await` qilinsa, tarmoq qatlami
 * xotiraga bog'lanib qolardi.
 */
export const currentLocale = (): Locale =>
  isLocale(i18n.locale) ? i18n.locale : DEFAULT_LOCALE;

/**
 * Tarjima.
 *
 * `t("pgProfile.title")` yoki o'rin almashtirish bilan:
 * `t("docs.daysLeft", { count: 18 })`.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  return i18n.t(key, params);
}
