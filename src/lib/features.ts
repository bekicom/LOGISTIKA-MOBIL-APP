/**
 * Tarif funksiyalari — nima ochiq (2026-09-04, audit 07).
 *
 * ── MUAMMO ──────────────────────────────────────────────────────
 *
 * Server 33 ta yozish marshrutida tarif darvozasi (`gate()`) ni
 * ushlab turadi va yopiq bo'lsa 402 qaytaradi. Ilova buni FAQAT
 * «Joylash» tugmasi bosilgandan keyin bilardi: odam uzun formani
 * to'ldirib, beshta surat yuklab, oxirida «tarifingizga kirmaydi»
 * degan xabar olardi.
 *
 * Bajarilgan ish behuda ketishi — xatoning eng qimmat turi. Endi
 * ekran boshida aytiladi.
 *
 * ── MANBA BITTA ─────────────────────────────────────────────────
 *
 * Ro'yxat `/api/auth/me` dan keladi va u serverda `accessOf()` bilan
 * hisoblanadi — darvoza ham xuddi shundan o'qiydi. Ya'ni ilovaning
 * oldindan aytgani bilan darvozaning qarori zid bo'lolmaydi.
 *
 * ⚠️ Ikkinchi manba yasamang. Serverda ilgari ikkita bo'lgan
 * (`user.features` va `accessOf()`) va natijada VIP obunachi
 * saytdan haydalgan (`furam/src/lib/gate.ts` dagi izoh).
 *
 * ── NEGA MODUL DARAJASIDA ───────────────────────────────────────
 *
 * Tugma bosilganda tekshirish uchun kerak — o'sha joyda hook
 * chaqirib bo'lmaydi. Ekran chizilayotganda esa `useAuth().can()`
 * ishlatiladi: u holat, ya'ni ro'yxat kelganda ekran qayta
 * chiziladi.
 */
import { Alert } from "react-native";
import { router } from "expo-router";
import { t } from "./i18n";

/** `furam/src/lib/roles.ts:FEATURES` bilan bir xil ro'yxat */
export type FeatureKey =
  | "contacts"
  | "messenger"
  | "ai"
  | "ai_matching"
  | "post_load"
  | "post_truck"
  | "fleet"
  | "drivers"
  | "trips"
  | "contracts"
  | "documents"
  | "money"
  | "analytics"
  | "queues"
  | "vacancies"
  | "job_apply"
  | "passenger"
  | "service"
  | "parts"
  | "company"
  | "auto_sale";

let open: ReadonlySet<string> | null = null;

/**
 * `auth-context` chaqiradi — boshqa joydan emas.
 *
 * ⚠️ `undefined` va `[]` BOSHQA-BOSHQA holat (2026-09-05):
 *
 *   • `[]`        — server javob berdi, hech narsa ochiq emas
 *   • `undefined` — server bu maydonni UMUMAN yubormadi
 *
 * Ikkinchisi eski serverga ulanganda bo'ladi. O'shanda «hech
 * narsa ochiq emas» deb hisoblasak, ilova 15 ta ekranda
 * «tarifingizga kirmaydi» deb yolg'on gapirardi. Noma'lumlikda
 * TO'SIQ QO'YILMAYDI: server baribir 402 bilan to'xtatadi, ya'ni
 * hech kim pulsiz o'tib ketmaydi — faqat ogohlantirish
 * ko'rsatilmaydi.
 */
export function setFeatures(list: string[] | undefined | null): void {
  open = list ? new Set(list) : null;
}

/** Ro'yxat kelmagan bo'lsa `true` — «bilmayman, to'smayman» */
export function can(f: FeatureKey): boolean {
  return open === null || open.has(f);
}

/** Funksiya nomi o'quvchining tilida — server yorlig'i emas */
export function featureName(f: FeatureKey): string {
  return t(`feature.${f}`);
}

/**
 * Tarif yopiq bo'lsa taklif ko'rsatadi va `true` qaytaradi.
 *
 * Chaqirilishi — `guestBlocked()` bilan bir xil:
 *
 *   onPress={() => { if (tariffBlocked("post_load")) return; ...}}
 *
 * Ekran boshidagi `TariffNotice` bilan BIRGA ishlatiladi, o'rniga
 * emas: banner oldindan ogohlantiradi, bu esa oxirgi to'siq.
 */
export function tariffBlocked(f: FeatureKey): boolean {
  if (can(f)) return false;

  const name = featureName(f);
  Alert.alert(t("mob.tariff.askTitle"), t("mob.tariff.askText", { f: name }), [
    { text: t("mob.common.cancel"), style: "cancel" },
    { text: t("mob.tariff.pick"), onPress: () => router.push("/rollarim") },
  ]);
  return true;
}
