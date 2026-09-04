/**
 * Mehmon to'sig'i — hisob talab qiladigan tugma bosilganda.
 *
 * ── NEGA ALERT, SHEET EMAS ──────────────────────────────────────
 *
 * Bu to'siq o'nlab ekranda kerak. Har biriga sheet qo'yish har
 * biriga holat, animatsiya va yopish tugmasi qo'shish demakdir —
 * ko'p kod, ko'p xato. `Alert` tizimniki: har ikkala platformada
 * tanish ko'rinadi va uni chaqirish uchun ekranga hech narsa
 * qo'shilmaydi.
 *
 * ── IKKI QAVAT HIMOYA ───────────────────────────────────────────
 *
 * 1. Shu funksiya — tugma bosilishidan OLDIN, chiroyli taklif bilan.
 * 2. `api.ts` dagi 401 → `GUEST` — o'tkazib yuborilgan joylar uchun
 *    zaxira. Har bir tugmani qo'lda o'rashga ishonib bo'lmaydi:
 *    yangi ekran qo'shilganda unutiladi.
 */
import { Alert } from "react-native";
import { router } from "expo-router";
import { isGuest } from "./guest";
import { t } from "./i18n";

/**
 * Mehmon bo'lsa taklif ko'rsatadi va `true` qaytaradi.
 *
 * Chaqirilishi:
 *
 *   onPress={() => { if (guestBlocked()) return; ...asl ish... }}
 */
export function guestBlocked(): boolean {
  if (!isGuest()) return false;

  Alert.alert(t("mob.guest.needTitle"), t("mob.guest.needText"), [
    { text: t("mob.common.cancel"), style: "cancel" },
    { text: t("mob.intro.signIn"), onPress: () => router.push("/kirish") },
    { text: t("mob.intro.signUp"), onPress: () => router.push("/royxat") },
  ]);
  return true;
}
