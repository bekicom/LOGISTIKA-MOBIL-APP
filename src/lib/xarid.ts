/**
 * Tarifni do'kon orqali sotib olish — Apple IAP / Google Play Billing
 * (2026-09-19, B1 qarori: 30 kunlik, o'zi yangilanmaydi).
 *
 * ── YO'L ────────────────────────────────────────────────────────
 *
 *   `sotibOl(id)` → do'kon oynasi → natija `purchaseUpdatedListener` ga
 *   keladi → `tasdiqla` serverga yuboradi (`/api/iap`) → server imzoni
 *   tekshirib tarifni yoqadi → FAQAT SHUNDAN KEYIN `finishTransaction`.
 *
 * Tekshiruv o'tmasa tranzaksiya YAKUNLANMAYDI: do'konda turadi va keyingi
 * ochilishda qayta yuboriladi (`kutilganlarniYubor`). Ya'ni aloqa uzilsa
 * ham, ilova yiqilsa ham pul yo'qolmaydi. Server takrorni bir marta
 * hisoblaydi.
 *
 * ── QAYERDA ISHLAMAYDI ──────────────────────────────────────────
 *
 * Expo Go va brauzerda native do'kon moduli yo'q — `mavjudmi()` `false`,
 * xarid tugmasi chizilmaydi (bosilmaydigan tugma Apple 2.1 da rad sababi).
 * Kutubxona faqat kerak paytda yuklanadi: Expo Go'da ilova yiqilmaydi.
 *
 * Server ham «bu do'kon sozlangan» deb aytishi kerak (`/api/iap` →
 * `yoqilgan`): aks holda pul do'konda olinib, huquq berilmay qolardi.
 */
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type { Purchase } from "expo-iap";
import { api, FuramError } from "./api";
import type { IapMahsulot } from "./iap-katalog";

type IapModul = typeof import("expo-iap");

/** Native do'kon bormi — Expo Go va web'da yo'q */
export function mavjudmi(): boolean {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

let modul: IapModul | null | undefined;
function iap(): IapModul | null {
  if (modul !== undefined) return modul;
  if (!mavjudmi()) return (modul = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    modul = require("expo-iap") as IapModul;
  } catch {
    modul = null;
  }
  return modul;
}

let ulanish: Promise<boolean> | null = null;
async function ulan(m: IapModul): Promise<boolean> {
  ulanish ??= m.initConnection().catch(() => {
    ulanish = null;
    return false;
  });
  return ulanish;
}

/** Do'kondagi mahsulot — katalog + do'kon narxi (o'quvchi valyutasida) */
export type DokonMahsulot = IapMahsulot & { narx: string };

export type Dokon = {
  /** Xarid qilsa bo'ladimi (native do'kon + server sozlangan + mahsulot bor) */
  bor: boolean;
  /** Xarid hisobga bog'lanadi (`appAccountToken` / `obfuscatedAccountId`) */
  hisob: string | null;
  kun: number;
  mahsulotlar: DokonMahsulot[];
};

const BOSH: Dokon = { bor: false, hisob: null, kun: 30, mahsulotlar: [] };

/**
 * Katalog va do'kon narxlari. Narx faqat do'kondan: webdagi so'mlik narx
 * ilovada KO'RSATILMAYDI (boshqa to'lov yo'liga ishora — ikkala do'kon
 * qoidasi).
 */
export async function dokonniOl(): Promise<Dokon> {
  const m = iap();
  if (!m) return BOSH;
  const s = await api<{ kun: number; mahsulotlar: IapMahsulot[]; hisob: string; yoqilgan: { apple: boolean; google: boolean } }>(
    "/api/iap",
  );
  const sozlangan = Platform.OS === "ios" ? s.yoqilgan.apple : s.yoqilgan.google;
  if (!sozlangan || !(await ulan(m))) return { ...BOSH, hisob: s.hisob, kun: s.kun };
  const products = await m.fetchProducts({ skus: s.mahsulotlar.map((x) => x.id), type: "in-app" }).catch(() => null);
  const narx = new Map((products ?? []).map((p) => [p.id, p.displayPrice]));
  const mahsulotlar = s.mahsulotlar.flatMap((x) => {
    const n = narx.get(x.id);
    return n ? [{ ...x, narx: n }] : [];
  });
  return { bor: mahsulotlar.length > 0, hisob: s.hisob, kun: s.kun, mahsulotlar };
}

/**
 * Do'kon xatosi → bizning kod. «Kutilmoqda» — ota-ona ruxsati (Ask to
 * Buy) yoki keyin to'lanadigan usul: pul hali olinmagan, tasdiqlansa
 * xarid kuzatuvchiga o'zi keladi.
 */
function dokonKodi(m: IapModul, e: unknown): { kod: string; bekor?: true } {
  if (m.isUserCancelledError(e)) return { kod: "CANCELLED", bekor: true };
  const code = (e as { code?: unknown } | null)?.code;
  return { kod: code === "deferred-payment" || code === "pending" ? "IAP_PENDING" : "IAP_STORE" };
}

/**
 * Do'kon oynasini ochadi.
 *   "tolandi" — natija kuzatuvchidan keladi (server tekshiruvi bilan)
 *   "bekor"   — odam oynani yopdi, xabar kerak emas
 * Do'kon xatosi — `FuramError` (`IAP_STORE`, `IAP_PENDING`, `IAP_OFF`).
 */
export async function sotibOl(id: string, hisob: string | null): Promise<"tolandi" | "bekor"> {
  const m = iap();
  if (!m || !(await ulan(m))) throw new FuramError({ error: "IAP_OFF", status: 0 });
  let natija: unknown;
  try {
    natija = await m.requestPurchase({
      request: {
        apple: { sku: id, ...(hisob ? { appAccountToken: hisob } : {}) },
        google: { skus: [id], ...(hisob ? { obfuscatedAccountId: hisob } : {}) },
      },
      type: "in-app",
    });
  } catch (e) {
    const x = dokonKodi(m, e);
    if (x.bekor) return "bekor";
    throw new FuramError({ error: x.kod, status: 0 });
  }
  /* Xarid qaytmadi, xato ham yo'q — to'lov keyinga qoldi. Kuzatuvchi
     hech narsa olmaydi: tugma aylanib qolmasin */
  if (!natija || (Array.isArray(natija) && natija.length === 0)) {
    throw new FuramError({ error: "IAP_PENDING", status: 0 });
  }
  return "tolandi";
}

export type XaridNatija =
  | { ok: true; roleKey: string; endsAt: string | null; productId: string }
  | { ok: false; kod: string; productId?: string; bekor?: boolean };

/**
 * Qat'iy rad — qayta yuborish foyda bermaydi: tranzaksiya yakunlanadi.
 * `IAP_OTHER_ACCOUNT` — xarid boshqa hisobga yozilgan (o'sha hisob uni
 * olgan); `IAP_REVOKED` — do'kon bekor qilgan; `IAP_UNKNOWN_PRODUCT` —
 * katalogdan chiqarilgan mahsulot. Qolganlari (aloqa, `IAP_OFF`,
 * `IAP_PENDING`, `IAP_INVALID`) — tranzaksiya turadi, keyin yana uriniladi.
 */
const YAKUNLANADI = new Set(["IAP_OTHER_ACCOUNT", "IAP_REVOKED", "IAP_UNKNOWN_PRODUCT"]);

async function tasdiqla(m: IapModul, p: Purchase): Promise<XaridNatija> {
  const token = p.purchaseToken;
  if (!token || p.purchaseState === "pending") return { ok: false, kod: "IAP_PENDING", productId: p.productId };
  const body =
    Platform.OS === "ios" ? { store: "apple", jws: token } : { store: "google", productId: p.productId, token };
  try {
    const r = await api<{ roleKey: string; endsAt: string | null }>("/api/iap", { method: "POST", body });
    /* Iste'mol — Android'da qayta sotib olish uchun shart; iOS'da yakunlash */
    await m.finishTransaction({ purchase: p, isConsumable: true }).catch(() => null);
    return { ok: true, roleKey: r.roleKey, endsAt: r.endsAt, productId: p.productId };
  } catch (e) {
    const kod = (e as FuramError).code ?? "NETWORK";
    if (YAKUNLANADI.has(kod)) await m.finishTransaction({ purchase: p, isConsumable: true }).catch(() => null);
    return { ok: false, kod, productId: p.productId };
  }
}

/* ── Natijani eshituvchilar (ekranlar) ─────────────────────────── */

const eshituvchilar = new Set<(r: XaridNatija) => void>();

/** Ekran xarid natijasini eshitadi (masalan «Men kimman?») */
export function xaridniEshit(fn: (r: XaridNatija) => void): () => void {
  eshituvchilar.add(fn);
  return () => eshituvchilar.delete(fn);
}

function tarqat(r: XaridNatija) {
  for (const fn of eshituvchilar) fn(r);
}

/**
 * Butun ilova uchun BITTA kuzatuvchi — kirgan odamda ishga tushadi.
 * Qaytaradi: to'xtatish funksiyasi.
 */
export function xaridKuzatuvchisi(onYoqildi: () => void): () => void {
  const m = iap();
  if (!m) return () => {};
  const a = m.purchaseUpdatedListener((p) => {
    void tasdiqla(m, p).then((r) => {
      if (r.ok) onYoqildi();
      tarqat(r);
    });
  });
  const b = m.purchaseErrorListener((e) => {
    tarqat({ ok: false, ...dokonKodi(m, e), productId: e.productId ?? undefined });
  });
  return () => {
    a.remove();
    b.remove();
  };
}

/**
 * Yakunlanmagan xaridlarni serverga qayta yuboradi — ilova ochilganda
 * (aloqa uzilgan, ilova yiqilgan, to'lov kechikib tasdiqlangan holatlar).
 */
export async function kutilganlarniYubor(onYoqildi: () => void): Promise<void> {
  const m = iap();
  if (!m || !(await ulan(m))) return;
  const list = await m.getAvailablePurchases().catch(() => [] as Purchase[]);
  for (const p of list) {
    const r = await tasdiqla(m, p);
    if (r.ok) onYoqildi();
  }
}
