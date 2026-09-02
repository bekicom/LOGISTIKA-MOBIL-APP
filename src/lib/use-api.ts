/**
 * Kichik ma'lumot yuklash ilmog'i.
 *
 * Nega tayyor kutubxona emas: bizga faqat «yukla, xatoni ko'rsat, qayta
 * urin» kerak. TanStack Query keyin, kesh va offline navbat qo'shilganda
 * kiritiladi — hozir u ortiqcha qatlam bo'lardi.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api, FuramError } from "./api";

export type Loadable<T> = {
  data: T | null;
  loading: boolean;
  /** Foydalanuvchiga ko'rsatiladigan matn, null bo'lsa xato yo'q */
  error: string | null;
  /** Tortib yangilash uchun — yuklanayotganini ko'rsatmaydi */
  refreshing: boolean;
  reload: () => void;
  refresh: () => void;
};

export function useApi<T>(path: string | null, deps: unknown[] = []): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      quiet ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const res = await api<T>(path);
        if (alive.current) setData(res);
      } catch (e) {
        if (alive.current) setError((e as FuramError).message ?? "Xatolik yuz berdi");
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
    reload: () => void run(false),
    refresh: () => void run(true),
  };
}
