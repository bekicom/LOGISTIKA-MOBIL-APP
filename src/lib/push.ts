/**
 * Push bildirishnomalar (2026-09-04, TZ §7).
 *
 * ⚠️ EXPO GO'DA ISHLAMAYDI. SDK 53 dan boshlab Expo Go'dan masofaviy
 * push olib tashlangan — na iOS'da, na Android'da. Ya'ni bu kodni
 * QR bilan sinab bo'lmaydi, development build kerak.
 *
 * Shuning uchun hamma joyda TEKSHIRUV bor va Expo Go'da funksiya
 * jimgina chiqadi: ilova yiqilmaydi, boshqa hamma narsa ishlayveradi.
 * Dev build qurilgan kunda bu kod o'zgarishsiz ishlab ketadi.
 *
 * RUXSAT BIRINCHI OCHILISHDA SO'RALMAYDI. Odam ilovani endi ochgan,
 * nima uchun kerakligini bilmaydi va rad etadi — rad javobdan keyin
 * esa faqat sozlamadan qaytarish mumkin. So'rov MA'NOLI paytda
 * beriladi: birinchi reys boshlanganda.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

/** Expo Go'da masofaviy push yo'q — SDK 53 dan */
export const pushSupported =
  Device.isDevice && Constants.appOwnership !== "expo";

/* Ilova ochiq turganda ham xabar ko'rinsin: haydovchi ekranga
   qarab turgan bo'lsa ham «yangi yuk» xabarini o'tkazib
   yubormasligi kerak. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type PushState = "granted" | "denied" | "unsupported";

export async function pushState(): Promise<PushState> {
  if (!pushSupported) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : "denied";
}

/**
 * Ruxsat so'rash va tokenni serverga yozish.
 *
 * `projectId` SHART: usiz `getExpoPushTokenAsync` xato beradi. U
 * `app.json` dagi EAS loyiha identifikatoridan olinadi.
 */
export async function registerPush(): Promise<boolean> {
  if (!pushSupported) return false;

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== "granted") return false;

  if (Platform.OS === "android") {
    /* Android'da kanal MAJBURIY: usiz xabar tovushsiz va
       ustuvorliksiz keladi va tizim uni yig'ib qo'yishi mumkin. */
    await Notifications.setNotificationChannelAsync("default", {
      name: "FURAM",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#f45a18",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await api("/api/devices", {
      method: "POST",
      body: {
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
        appVersion: Constants.expoConfig?.version ?? undefined,
        deviceName: Device.deviceName ?? undefined,
      },
    });
    return true;
  } catch {
    /* Token olinmasa ilova baribir ishlaydi — push shunchaki
       kelmaydi. Bu yerda xato ko'rsatishning ma'nosi yo'q:
       foydalanuvchi qo'lidan hech narsa kelmaydi. */
    return false;
  }
}

/** Chiqishda: bu telefon endi bu odamniki emas */
export async function unregisterPush(): Promise<void> {
  if (!pushSupported) return;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await api(`/api/devices?token=${encodeURIComponent(token)}`, { method: "DELETE" });
  } catch {
    // Token olinmasa o'chiradigan narsa ham yo'q
  }
}

/* ─────────────────────────────── qachon so'raladi */

const ASKED_KEY = "furam.push.asked";

/**
 * Tushuntirish oynasi BIR MARTA ko'rsatiladi.
 *
 * Nega saqlanadi: tizim oynasi rad etilgach ikkinchi marta umuman
 * chiqmaydi (iOS'da bir marta), ya'ni qayta-qayta so'rash foydasiz
 * va bezor qiladi. Rad qilgan odam keyin Profil > Bildirishnoma
 * bo'limidan o'zi yoqadi.
 */
export async function pushAsked(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(ASKED_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function markPushAsked(): Promise<void> {
  try {
    await SecureStore.setItemAsync(ASKED_KEY, "1");
  } catch {
    // Saqlanmasa eng yomoni oyna yana bir marta chiqadi
  }
}

/** Chiqishda: telefonni boshqa odam olsa, undan qaytadan so'raladi */
export async function clearPushAsked(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ASKED_KEY);
  } catch {
    // yo'q bo'lsa ham mayli
  }
}

/* MA'NOLI PAYT. Ekranlar shu funksiyani chaqiradi — birinchi e'lon
   berilganda, birinchi reys boshlanganda. Oynani ekranlar emas,
   ildizdagi bitta komponent ko'rsatadi: aks holda har ekranda
   modal kodini takrorlashga to'g'ri kelardi. */
type Listener = () => void;
const listeners = new Set<Listener>();

export function onPushMoment(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** «Endi so'rasa bo'ladi» — foyda ko'rilgan payt */
export function notePushMoment(): void {
  listeners.forEach((fn) => fn());
}

/** Oyna ko'rsatilsinmi: qo'llab-quvvatlansa, hali so'ralmagan va hali ruxsat yo'q */
export async function shouldAskPush(): Promise<boolean> {
  if (!pushSupported) return false;
  if (await pushAsked()) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status !== "granted";
}

/** O'qilmaganlar soni — ilova nishonchasi */
export async function setBadge(n: number): Promise<void> {
  if (!pushSupported) return;
  await Notifications.setBadgeCountAsync(Math.max(0, n)).catch(() => {});
}

/**
 * Xabar bosilganda ilova qayerni ochadi.
 *
 * Server `data.href` da WEB manzilini yuboradi (`/trips/123`).
 * Ilovadagi yo'llar boshqacha nomlangan, shuning uchun bu yerda
 * o'giriladi — aks holda bosilgan xabar hech qayerga olib bormasdi.
 */
export function routeOf(data: Record<string, unknown> | undefined): string | null {
  const href = typeof data?.href === "string" ? data.href : null;
  if (!href) return null;

  const map: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/^\/trips\/([\w-]+)/, (m) => `/reys/${m[1]}`],
    [/^\/loads\/([\w-]+)/, (m) => `/yuk/${m[1]}`],
    [/^\/trucks\/([\w-]+)/, (m) => `/mashina/${m[1]}`],
    [/^\/chats\/([\w-]+)/, (m) => `/suhbat/${m[1]}`],
    [/^\/trips$/, () => "/reyslar"],
    [/^\/loads$/, () => "/yuklar"],
    [/^\/chats$/, () => "/chat"],
    [/^\/documents$/, () => "/hujjatlarim"],
    [/^\/fleet/, () => "/parkim"],
    [/^\/(fleet\/)?queues$/, () => "/navbat"],
    [/^\/deals$/, () => "/kelishuvlar"],
  ];

  for (const [re, to] of map) {
    const m = href.match(re);
    if (m) return to(m);
  }
  // Tanish bo'lmagan manzil — bildirishnomalar ro'yxatiga
  return "/bildirishnomalar";
}
