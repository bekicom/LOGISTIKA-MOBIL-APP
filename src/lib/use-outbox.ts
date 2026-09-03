/**
 * Navbatni fon rejimida bo'shatish va holatini kuzatish.
 *
 * UCH XIL TURTKI:
 *
 *  1. Ilova oldinga chiqqanda. Haydovchi telefonni cho'ntagidan
 *     olganda birinchi ish — kutayotganini yuborish.
 *  2. Har 30 soniyada. Aloqa jimgina qaytishi mumkin: mashina
 *     tunnelidan chiqdi, chegara Wi-Fi'iga ulandi. Hech qanday
 *     hodisa bo'lmaydi, shuning uchun vaqti-vaqti bilan tekshiramiz.
 *  3. Yozuv qo'shilganda (`sendOrQueue` o'zi chaqiradi).
 *
 * 30 soniya ATAYLAB: tezroq qilinsa aloqasiz paytda batareya
 * bekorga yeyiladi (har urinish radioni uyg'otadi); sekinroq
 * qilinsa haydovchi «yubordim» deb o'ylab turgan yozuvi uzoq
 * kutib qolardi.
 */
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { counts, flush, watchOutbox } from "./outbox";
import { isOnline } from "./net";

const EVERY_MS = 30_000;

export type OutboxState = { pending: number; failed: number; online: boolean };

/** Ilova ishga tushganda bir marta ulanadi (`_layout.tsx`) */
export function useOutboxRunner(): OutboxState {
  const [state, setState] = useState<OutboxState>({ pending: 0, failed: 0, online: true });

  useEffect(() => {
    const off = watchOutbox((c) => setState((s) => ({ ...s, ...c })));

    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      const online = await isOnline();
      setState((s) => (s.online === online ? s : { ...s, online }));
      if (online) await flush();
    };

    void tick();
    const timer = setInterval(() => void tick(), EVERY_MS);

    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") void tick();
    });

    return () => {
      stopped = true;
      clearInterval(timer);
      sub.remove();
      off();
    };
  }, []);

  return state;
}

/** Faqat holat kerak bo'lgan ekranlar uchun */
export function useOutboxCounts() {
  const [c, setC] = useState({ pending: 0, failed: 0 });
  useEffect(() => {
    void counts().then(setC);
    return watchOutbox(setC);
  }, []);
  return c;
}
