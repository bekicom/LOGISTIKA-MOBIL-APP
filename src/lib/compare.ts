/**
 * Taqqoslash ro'yxati — bozor e'lonlari uchun.
 *
 * ── NEGA SERVERDA EMAS ──────────────────────────────────────────
 *
 * Bu ro'yxat bir necha daqiqa yashaydi: odam uchta mashinani
 * ochib ko'radi va bittasini tanlaydi. Uni bazaga yozish har
 * bosishda so'rov degani, foydasi esa yo'q — ilova yopilsa
 * ro'yxatning ma'nosi ham qolmaydi.
 *
 * ── UCHTA, KO'P EMAS ────────────────────────────────────────────
 *
 * Telefon ekraniga ustun bo'lib uchtasi zo'rg'a sig'adi. To'rtinchi
 * qo'shilsa jadval o'qilmas holga keladi — shuning uchun chegara
 * shu yerda, interfeysda emas: ikki joyda bo'lsa biri ikkinchisini
 * chetlab o'tish yo'liga aylanardi.
 */
import { useSyncExternalStore } from "react";

export const COMPARE_MAX = 3;

let ids: string[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** `useSyncExternalStore` bir xil havolani kutadi — massiv qayta yasalmaydi */
const snapshot = () => ids;

export function useCompare(): string[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function inCompare(id: string): boolean {
  return ids.includes(id);
}

/** Qo'shadi yoki olib tashlaydi; to'lgan bo'lsa `false` qaytadi */
export function toggleCompare(id: string): boolean {
  if (ids.includes(id)) {
    ids = ids.filter((x) => x !== id);
    emit();
    return true;
  }
  if (ids.length >= COMPARE_MAX) return false;
  ids = [...ids, id];
  emit();
  return true;
}

export function clearCompare(): void {
  ids = [];
  emit();
}
