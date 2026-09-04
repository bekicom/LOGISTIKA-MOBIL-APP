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
import { loadGuest, setGuest } from "./guest";
import { setFeatures, type FeatureKey } from "./features";
import { clearPushAsked, pushState, registerPush, unregisterPush } from "./push";

type State = {
  user: User | null;
  /** Birinchi tekshiruv tugagunicha `true` — shu paytda ekran ko'rsatilmaydi */
  loading: boolean;
  /**
   * Tarif ochgan funksiyalar (audit 07).
   *
   * Ekran chizilayotganda shu ishlatiladi, `features.ts` dagi
   * `can()` emas: bu holat, ya'ni ro'yxat kelganda ekran qayta
   * chiziladi. Ikkalasi bir xil ro'yxatdan o'qiydi.
   */
  can: (f: FeatureKey) => boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<State | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  /* Ro'yxat holatda ham turadi: `features.ts` dagi to'plam sof
     modul o'zgaruvchisi, o'zgarganda ekran qayta chizilmaydi.
     Ikkalasi bir joyda — javob kelgan payt — yoziladi. */
  const [feats, setFeats] = useState<ReadonlySet<string> | null>(null);

  const load = useCallback(async () => {
    /* MEHMON BELGISI TOKENDAN OLDIN o'qiladi: `index.tsx` qayerga
       yo'naltirishni shundan biladi va kirish ekrani miltillab
       ketmaydi. */
    await loadGuest();

    const token = await getToken();
    if (!token) {
      setUser(null);
      setFeatures([]);
      setFeats(new Set());
      setLoading(false);
      return;
    }
    try {
      const res = await api<{ user: User; features?: string[] }>("/api/auth/me");
      setUser(res.user);
      /* Tarif ro'yxati foydalanuvchi bilan BIR SO'ROVDA keladi:
         alohida marshrut qo'shilsa ilova ochilishida yana bitta
         so'rov bo'lardi va ikkisi bir-biridan orqada qolib
         ketardi. */
      setFeatures(res.features);
      /* `null` — server maydonni yubormadi (eski versiya). Bu
         «hech narsa ochiq emas» EMAS: `features.ts` dagi izohga
         qarang. */
      setFeats(res.features ? new Set(res.features) : null);
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
      setFeatures([]);
      setFeats(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const signIn = useCallback(
    async (token: string) => {
      /* Kirgach mehmon belgisi olib tashlanadi: aks holda
         keyingi ochilishda ilova uni yana mehmon deb hisoblab,
         chiqqandan keyin ochiq ekranda qoldirardi. */
      await setGuest(false);
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
    setFeatures([]);
    setFeats(new Set());
  }, []);

  const canFeature = useCallback((f: FeatureKey) => feats === null || feats.has(f), [feats]);

  const value = useMemo(
    () => ({ user, loading, can: canFeature, signIn, signOut, refresh: load }),
    [user, loading, canFeature, signIn, signOut, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth faqat <AuthProvider> ichida ishlaydi");
  return v;
}
