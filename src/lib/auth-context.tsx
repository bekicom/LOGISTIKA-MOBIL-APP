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
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // Server javob bermasa ham lokal seansni yopamiz
    }
    await clearToken();
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
