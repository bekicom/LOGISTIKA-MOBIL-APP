/**
 * «+ Telegram» — lentada Telegram guruhlaridan yig'ilgan e'lonlar ham
 * ko'rinsinmi (2026-09-21, web bilan bir xil).
 *
 * Web'da bu `TgToggle` (`furam/src/components/feed-controls.tsx`):
 * sukut bo'yicha YOQIQ, o'chirilsa so'rovga `tg=0` qo'shiladi va server
 * faqat `source: USER` — odamlar o'zi joylagan e'lonlarni beradi
 * (`lib/feed.ts:baseWhere`). Ya'ni server allaqachon tayyor.
 *
 * Farqi: web'da holat manzil qatorida, ilovada esa ESLAB QOLINADI —
 * odam «faqat odamlarniki» ni tanlagan bo'lsa, har ochishda qayta
 * o'chirmasin. Yuklar va Mashinalar ikkalasi bitta holatni ishlatadi:
 * birida o'chirib, ikkinchisiga o'tganda Telegram e'lonlari qaytib
 * chiqsa, odam filtr buzildi deb o'ylardi.
 */
import { useSyncExternalStore } from "react";
import { kvGet, kvSet } from "./secure-kv";

const KEY = "furam.lentaTg";

let yoqiq = true;
const tinglovchi = new Set<() => void>();
const xabar = () => tinglovchi.forEach((l) => l());

/* Saqlangan tanlov — ilova ochilganda bir marta o'qiladi */
void kvGet(KEY)
  .then((v) => {
    if (v === "0" && yoqiq) {
      yoqiq = false;
      xabar();
    }
  })
  .catch(() => {});

export function useTgLenta(): [boolean, (v: boolean) => void] {
  const v = useSyncExternalStore(
    (cb) => {
      tinglovchi.add(cb);
      return () => tinglovchi.delete(cb);
    },
    () => yoqiq,
    () => yoqiq,
  );
  const qoy = (n: boolean) => {
    yoqiq = n;
    xabar();
    void kvSet(KEY, n ? "1" : "0").catch(() => {});
  };
  return [v, qoy];
}

/** So'rovga `tg=0` — faqat o'chiq bo'lsa (yoqiq holat sukut, parametrsiz) */
export function tgSorov(query: string, tg: boolean): string {
  if (tg) return query;
  return query ? `${query}&tg=0` : "tg=0";
}
