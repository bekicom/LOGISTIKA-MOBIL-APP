/**
 * Kichik ma'lumot yuklash ilmog'i.
 *
 * Nega tayyor kutubxona emas: bizga faqat «yukla, xatoni ko'rsat,
 * qayta urin» kerak. TanStack Query keyin, agar chinakam murakkab
 * kesh siyosati kerak bo'lsa, kiritiladi.
 *
 * OFFLINE (2026-09-04): muvaffaqiyatli javob telefonga yoziladi va
 * aloqa yo'qda O'SHA ko'rsatiladi. Bo'sh ekran va «internetga
 * ulanmadi» yozuvi o'rniga — biroz eski, lekin haqiqiy ma'lumot.
 * Qachon olingani `cachedAt` da: odam ma'lumot eskiligini BILISHI
 * kerak, aks holda chegarada bir soatlik eski holatga ishonib
 * qaror qabul qilardi.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api, FuramError } from "./api";
import { getCache, putCache } from "./cache";
import { t } from "./i18n";

export type Loadable<T> = {
  data: T | null;
  loading: boolean;
  /** Foydalanuvchiga ko'rsatiladigan matn, null bo'lsa xato yo'q */
  error: string | null;
  /** Tortib yangilash uchun — yuklanayotganini ko'rsatmaydi */
  refreshing: boolean;
  /** Ma'lumot keshdan kelgan bo'lsa — qachon olingani (ms) */
  cachedAt: number | null;
  reload: () => void;
  refresh: () => void;
};

export function useApi<T>(path: string | null, deps: unknown[] = []): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  // Ekran yopilgach javob kelsa holatni yangilamaymiz
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async (quiet: boolean) => {
      if (!path) return;
      if (quiet) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await api<T>(path);
        if (alive.current) {
          setData(res);
          setCachedAt(null);
        }
        void putCache(path, res);
      } catch (e) {
        const err = e as FuramError;
        /* Aloqa yo'q — keshdan ko'rsatamiz. Boshqa xato (401, 500)
           bo'lsa kesh CHIQARILMAYDI: u yerdagi ma'lumot eskirgan
           bo'lishi mumkin va xatoni yashirib qo'yardi. */
        const offline = err.status === 0;
        const hit = offline ? await getCache<T>(path) : null;
        if (!alive.current) return;
        if (hit) {
          setData(hit.body);
          setCachedAt(hit.at);
          setError(null);
        } else {
          setError(err.message ?? t("mob.err.generic"));
        }
      } finally {
        if (alive.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, ...deps],
  );

  useEffect(() => {
    void run(false);
  }, [run]);

  return {
    data,
    loading,
    error,
    refreshing,
    cachedAt,
    reload: () => {
      void run(false);
    },
    refresh: () => {
      void run(true);
    },
  };
}
