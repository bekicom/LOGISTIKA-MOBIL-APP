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
import { isTarifHolati, type TarifHolati } from "./tarif-belgi";
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
  /**
   * Ofertaga rozilik berilganmi. `null` — hali ma'lum emas
   * (so'rov ketmagan yoki eski server maydonni yubormagan).
   *
   * `false` bilan chalkashmasin: `null` da eslatma CHIQMAYDI,
   * aks holda eski serverga ulangan ilova hamma odamga oferta
   * oynasini ko'rsatib turardi.
   */
  offerAccepted: boolean | null;
  /**
   * Tarif belgisi holati (TZ-04) — «Dispetcher · sinov 7 kun».
   * `null` — ma'lum emas (mehmon yoki maydonni yubormaydigan eski
   * server): unda belgi chizilmaydi, eski rol nomi turadi.
   */
  tarif: TarifHolati | null;
  /**
   * AI xizmatlariga (OpenAI) rozilik (B3, 2026-09-19): `null` — hali
   * so'ralmagan, `false` — rad etgan. Oyna va sozlama shu yerdan
   * o'qiydi; server baribir o'zi tekshiradi (`AI_CONSENT_REQUIRED`).
   */
  aiRozilik: boolean | null;
  /** Oyna yoki sozlama serverga yozgandan keyin — qayta so'rovsiz */
  setAiRozilik: (v: boolean) => void;
  /**
   * Token bor, lekin server javob bermadi — tarmoq uzilgan yoki 5xx
   * (masalan deploy paytidagi bir necha soniya). Bu CHIQISH EMAS:
   * token va oldingi holat saqlanadi, kirish nuqtasi «qayta urinish»
   * ko'rsatadi (`index.tsx`).
   */
  aloqaYoq: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<State | null>(null);

type MeJavob = {
  user: User;
  features?: string[];
  offerAccepted?: boolean;
  tarif?: unknown;
  aiRozilik?: boolean | null;
};

/** Tarmoq uzilishi (status 0) yoki server 5xx — seans tugagani EMAS */
function vaqtinchalik(e: unknown): boolean {
  return !(e instanceof FuramError) || e.status === 0 || e.status >= 500;
}

/** Deploy paytida server bir necha soniya javob bermaydi — bir marta kutib qayta so'raladi */
async function meniOl(): Promise<MeJavob> {
  try {
    return await api<MeJavob>("/api/auth/me");
  } catch (e) {
    if (!vaqtinchalik(e)) throw e;
    await new Promise((r) => setTimeout(r, 2000));
    return api<MeJavob>("/api/auth/me");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [offerAccepted, setOfferAccepted] = useState<boolean | null>(null);
  const [tarif, setTarif] = useState<TarifHolati | null>(null);
  const [aiRozilik, setAiRozilik] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [aloqaYoq, setAloqaYoq] = useState(false);
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
      setAloqaYoq(false);
      setUser(null);
      setFeatures([]);
      setFeats(new Set());
      setTarif(null);
      setLoading(false);
      return;
    }
    try {
      const res = await meniOl();
      setAloqaYoq(false);
      setUser(res.user);
      setOfferAccepted(typeof res.offerAccepted === "boolean" ? res.offerAccepted : null);
      /* Belgi ham shu javobda: server `accessOf` ni baribir chaqiradi —
         alohida so'rov ikkinchi manba bo'lardi (`features` dagi sabab) */
      setTarif(isTarifHolati(res.tarif) ? res.tarif : null);
      setAiRozilik(typeof res.aiRozilik === "boolean" ? res.aiRozilik : null);
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
      /* VAQTINCHALIK XATODA ODAM CHIQARILMAYDI (2026-09-19).
         Oldin bu yerda ham `setUser(null)` bo'lardi: token joyida
         tursa ham ochilishda `index.tsx` odamni til/kirish ekraniga
         o'tkazardi, ichkaridagi `refresh()` esa ekranlarni mehmon
         holatiga tushirardi — deploy paytidagi bir necha soniyalik
         502 dan keyin odam «chiqib ketdim» derdi. Endi oldingi holat
         o'z joyida qoladi va kirish nuqtasi «qayta urinish»
         ko'rsatadi. */
      else if (vaqtinchalik(e)) {
        setAloqaYoq(true);
        return;
      }
      setAloqaYoq(false);
      setUser(null);
      setFeatures([]);
      setFeats(new Set());
      setTarif(null);
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
    setAloqaYoq(false);
    setUser(null);
    setFeatures([]);
    setFeats(new Set());
    setTarif(null);
    setAiRozilik(null);
  }, []);

  const canFeature = useCallback((f: FeatureKey) => feats === null || feats.has(f), [feats]);

  const value = useMemo(
    () => ({
      user,
      loading,
      can: canFeature,
      offerAccepted,
      tarif,
      aiRozilik,
      setAiRozilik,
      signIn,
      signOut,
      refresh: load,
      aloqaYoq,
    }),
    [user, loading, canFeature, offerAccepted, tarif, aiRozilik, signIn, signOut, load, aloqaYoq],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth faqat <AuthProvider> ichida ishlaydi");
  return v;
}
