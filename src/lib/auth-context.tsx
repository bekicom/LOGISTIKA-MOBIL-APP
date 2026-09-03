/** Kim kirgan — butun ilova shu yerdan biladi. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, FuramError } from "./api";
import { clearToken, getToken, saveToken, type User } from "./session";
import { wipeLocal } from "./local-db";
import { clearPushAsked, pushState, registerPush, unregisterPush } from "./push";

type State = {
  user: User | null;
  /** Birinchi tekshiruv tugagunicha `true` — shu paytda ekran ko'rsatilmaydi */
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<State | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api<{ user: User }>("/api/auth/me");
      setUser(res.user);
      /* TOKEN HAR OCHILISHDA QAYTA YOZILADI: Expo tokeni ilova qayta
         o'rnatilsa yoki tizim yangilansa o'zgaradi va eskisiga
         yuborilgan push hech qayerga yetib bormaydi.
         Ruxsat hali berilmagan bo'lsa BU YERDA SO'RALMAYDI — birinchi
         ochilishda so'rash rad javob olishning eng ishonchli yo'li. */
      if ((await pushState()) === "granted") void registerPush();
    } catch (e) {
      // 401 — token eskirgan yoki seans uzilgan: tozalaymiz.
      // Tarmoq xatosi bo'lsa tokenni SAQLAB qolamiz — aks holda
      // internetsiz joyda ilova foydalanuvchini chiqarib yuboradi.
      if (e instanceof FuramError && e.status === 401) await clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const signIn = useCallback(
    async (token: string) => {
      await saveToken(token);
      setLoading(true);
      await load();
    },
    [load],
  );

  const signOut = useCallback(async () => {
    /* Token SERVERGA CHIQISHDAN OLDIN o'chiriladi: keyin `Authorization`
       yo'q bo'ladi va so'rov 401 qaytaradi. Aks holda bu telefon
       avvalgi odamning xabarlarini olib turaverardi. */
    await unregisterPush().catch(() => {});
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // Server javob bermasa ham lokal seansni yopamiz
    }
    await clearToken();
    /* Navbat va kesh ham tozalanadi: telefon bir necha odamda
       ishlatilishi mumkin va keyingi kirgan odam avvalgisining
       yuborilmagan xarajatini yoki reys tarixini ko'rmasin. */
    await wipeLocal().catch(() => {});
    await clearPushAsked();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, refresh: load }),
    [user, loading, signIn, signOut, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth faqat <AuthProvider> ichida ishlaydi");
  return v;
}
