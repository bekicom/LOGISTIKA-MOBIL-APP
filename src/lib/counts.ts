/**
 * O'qilmagan sanoqlar — sarlavhadagi qo'ng'iroq va chat nishoni.
 *
 * ── NEGA ALOHIDA DO'KON ─────────────────────────────────────────
 *
 * Nishon har tab sarlavhasida turadi (bosh, yuklar, menyu, profil),
 * lekin sanoqni faqat ikkita manba biladi: `/api/home`
 * (`unreadNotifications`) va `/api/chats?count=1` (`unread`). Har
 * ekran o'zi so'rasa — to'rt marta bir xil so'rov. Shu yerda bitta
 * qiymat turadi, kim olsa shu yerga yozadi, hamma shu yerdan o'qiydi.
 *
 * `useSyncExternalStore` — React 19 ning tashqi holat uchun
 * rasmiy yo'li; context yoki global `useState` dan yengil.
 */
import { useSyncExternalStore } from "react";
import { api } from "./api";

export type Counts = { notif: number; chat: number };

let counts: Counts = { notif: 0, chat: 0 };
const subs = new Set<() => void>();

function emit(): void {
  for (const fn of subs) fn();
}

export function setCounts(patch: Partial<Counts>): void {
  const next = { ...counts, ...patch };
  if (next.notif === counts.notif && next.chat === counts.chat) return;
  counts = next;
  emit();
}

export function useCounts(): Counts {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => counts,
    () => counts,
  );
}

/* Bir vaqtda bitta so'rov: to'rtta tab bir zumda ochilsa ham
   server bir marta so'raladi. */
let inflight: Promise<void> | null = null;

/** Chat sanog'ini yangilash — yengil so'rov, faqat raqam qaytadi */
export function refreshChatCount(): Promise<void> {
  if (inflight) return inflight;
  inflight = api<{ unread: number }>("/api/chats?count=1")
    .then((r) => setCounts({ chat: r.unread ?? 0 }))
    .catch(() => {
      /* Nishon — bezak, xato ko'rsatilmaydi */
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Chiqishda nol — keyingi kirgan odam avvalgining raqamini ko'rmasin */
export function resetCounts(): void {
  setCounts({ notif: 0, chat: 0 });
}
