/**
 * «Birinchi marta»mi — bayroqlar.
 *
 * Splash to'liq animatsiyasi va yo'l-yo'riq (coach marks) faqat
 * bir marta ko'rsatiladi. Bayroq `expo-secure-store` da: ilova
 * o'chirilmaguncha turadi, `guest.ts` bilan bir joyda.
 *
 * Sinxron o'qish yo'q — bu qiymatlar ekran chizilishidan OLDIN
 * kerak emas, shuning uchun `await` bilan olinadi.
 */
import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";

export type Flag = "splashSeen" | "tourSeen";

const KEY = (f: Flag) => `furam.${f}`;

export async function seen(flag: Flag): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(KEY(flag))) === "1";
  } catch {
    return false;
  }
}

export async function markSeen(flag: Flag): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY(flag), "1");
  } catch {
    /* Bayroq — qulaylik, xato ko'rsatilmaydi */
  }
}

/** Yo'l-yo'riqni qayta ko'rish uchun (menyudagi «Qo'llanma») */
export async function forget(flag: Flag): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY(flag));
  } catch {
    /* yuqoridagidek */
  }
}

/* ── Splash tugadimi (xotirada, saqlanmaydi) ─────────────────────
   Yo'l-yo'riq splash ustiga chiqib ketmasin: Modal hamma narsadan
   yuqorida chiziladi, shuning uchun u splash tugashini kutadi. */
let splashDone = false;
const subs = new Set<() => void>();

export function markSplashDone(): void {
  splashDone = true;
  for (const fn of subs) fn();
}

export function useSplashDone(): boolean {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => splashDone,
    () => splashDone,
  );
}
