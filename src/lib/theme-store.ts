/**
 * Rejim tanlovi: yorug' / qorong'i / qurilma sozlamasi.
 *
 * ── UCHTA HOLAT, IKKITA EMAS ────────────────────────────────────
 *
 * «Tizim» — bu uchinchi holat, «yorug'» ning boshqa nomi emas.
 * Odam telefonini kechqurun qorong'iga o'tadigan qilib qo'ygan
 * bo'lsa, ilova ham o'tishi kerak. Faqat ikkita holat bo'lsa,
 * u har kuni qo'lda almashtirib o'tirardi.
 *
 * Standart — «tizim»: ilova birinchi ochilishda odamning
 * qurilmasi qanday bo'lsa shunday ko'rinadi.
 *
 * ── SAQLASH `SecureStore` DA EMAS ───────────────────────────────
 *
 * Rejim — maxfiy ma'lumot emas, u `AsyncStorage` ga yozilardi.
 * Lekin loyihada `AsyncStorage` umuman yo'q (token uchun ataylab
 * `SecureStore` tanlangan), yangi bog'liqlik esa bitta satr
 * uchun ortiqcha. Shuning uchun til bilan bir joyda —
 * `SecureStore` da. Bu qimmat emas: bir marta o'qiladi.
 *
 * ── QURILMA SOZLAMASI O'ZGARSA ──────────────────────────────────
 *
 * `Appearance` ni tinglaymiz: odam telefon sozlamasida
 * almashtirsa, ilova ochiq turgan bo'lsa ham darrov o'zgaradi.
 * Tinglash FAQAT «tizim» tanlanganda ma'noli, lekin doim
 * ulanadi — obuna arzon, shart esa ichida.
 */
import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";
import * as SecureStore from "expo-secure-store";
import { applyTheme, themeName, type ThemeName } from "./theme";

const KEY = "furam.theme";

/** Odamning TANLOVI — «system» ham tanlov */
export type ThemeChoice = ThemeName | "system";

let choice: ThemeChoice = "system";
let version = 0;
const listeners = new Set<() => void>();

function deviceTheme(): ThemeName {
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

/** Tanlovdan HAQIQIY rejim */
function resolve(c: ThemeChoice): ThemeName {
  return c === "system" ? deviceTheme() : c;
}

function emit() {
  version++;
  for (const l of listeners) l();
}

/**
 * Rejimni qo'llash.
 *
 * Uslublar rejim bo'yicha keshlanadi (`themed`), shuning uchun
 * bu yerda faqat faol nom o'zgaradi va daraxt qayta chiziladi —
 * hech narsa qayta hisoblanmaydi.
 */
function apply(c: ThemeChoice) {
  const next = resolve(c);
  if (next !== themeName()) applyTheme(next);
  emit();
}

/** Ilova ochilishida — chizishdan OLDIN chaqiriladi */
export async function loadTheme(): Promise<void> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    if (v === "light" || v === "dark" || v === "system") choice = v;
  } catch {
    /* O'qilmasa «tizim» qolaveradi */
  }
  applyTheme(resolve(choice));
}

export function setThemeChoice(c: ThemeChoice): void {
  choice = c;
  apply(c);
  void SecureStore.setItemAsync(KEY, c).catch(() => null);
}

export const themeChoice = (): ThemeChoice => choice;

/* Qurilma sozlamasi o'zgardi — «tizim» tanlangan bo'lsa
   ergashamiz. Boshqa tanlovda e'tibor bermaymiz: odam ataylab
   qat'iy rejim qo'ygan. */
Appearance.addChangeListener(() => {
  if (choice === "system") apply("system");
});

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * Ildiz tartibi shuni KALIT sifatida ishlatadi.
 *
 * Rejim o'zgarsa butun daraxt qayta chiziladi va uslub proxy'lari
 * yangi rejimning keshini qaytaradi. Tilda ham xuddi shu yo'l
 * ishlatilgan (`useLocaleVersion`).
 */
export function useThemeVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => version);
}
