/**
 * Kichik kalit-qiymat xotirasi — `expo-secure-store` ustida (2026-09-19).
 *
 * Telefonda: iOS Keychain / Android Keystore (shifrlangan) — avvalgidek.
 *
 * Web'da (FAQAT brauzerda sinash va ishlab chiqish uchun) `expo-secure-store`
 * yo'q: har chaqiruv xato tashlaydi va ilova brauzerda hech narsani
 * eslab qololmasdi — kirish, til, mavzu, «tanishtiruv ko'rildi»
 * belgisi har yuklashda yo'qolardi. Web'da brauzer xotirasi ishlatiladi.
 * Web versiya foydalanuvchiga tarqatilmaydi; do'kon build'i native.
 *
 * Hamma joy SHU yordamchidan o'tadi: bir faylda web'ni hisobga olib,
 * boshqasida unutib qo'yilsa, brauzerdagi sinov yarim ishlardi.
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const WEB = Platform.OS === "web";
const web = () => (globalThis as { localStorage?: Storage }).localStorage;

export function kvGet(key: string): Promise<string | null> {
  return WEB ? Promise.resolve(web()?.getItem(key) ?? null) : SecureStore.getItemAsync(key);
}

export function kvSet(key: string, value: string): Promise<void> {
  return WEB ? Promise.resolve(web()?.setItem(key, value)) : SecureStore.setItemAsync(key, value);
}

export function kvDel(key: string): Promise<void> {
  return WEB ? Promise.resolve(web()?.removeItem(key)) : SecureStore.deleteItemAsync(key);
}
