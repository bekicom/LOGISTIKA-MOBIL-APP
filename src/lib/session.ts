/**
 * Sessiya: token saqlash va joriy foydalanuvchi.
 *
 * Token FAQAT `expo-secure-store` da turadi — iOS Keychain, Android
 * Keystore. AsyncStorage yoki MMKV ga yozilmaydi: ular shifrlanmagan va
 * root qilingan telefonda ochiq o'qiladi.
 *
 * Brauzerda (faqat sinov uchun) — brauzer xotirasi: `secure-kv.ts`.
 */
import { kvDel, kvGet, kvSet } from "./secure-kv";

const KEY = "furam_session_token";

let cached: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    cached = await kvGet(KEY);
  } catch {
    // Qurilma qulfsiz bo'lsa yoki Keychain ochilmasa — sessiyasiz davom etamiz
    cached = null;
  }
  return cached;
}

/**
 * Sinxron token — RASM so'rovlari uchun.
 *
 * `<Image source={{ uri }}>` sarlavha qo'shmaydi, shuning uchun
 * token QO'LDA berilishi kerak: `{ uri, headers }`. Bu esa sinxron
 * bo'lishi shart — render paytida `await` qilib bo'lmaydi.
 *
 * Xavfsiz: har ekran chizilgunga qadar kamida bitta API so'rovi
 * o'tadi va `cached` to'ladi. Bo'sh bo'lsa rasm shunchaki
 * yuklanmaydi, ilova esa buzilmaydi.
 */
export function tokenNow(): string | null {
  return cached ?? null;
}

export async function saveToken(token: string): Promise<void> {
  cached = token;
  await kvSet(KEY, token);
}

export async function clearToken(): Promise<void> {
  cached = null;
  await kvDel(KEY);
}

/** Serverdagi `/api/auth/me` javobining bizga kerak qismi */
export type User = {
  id: string;
  furamId: number;
  /* Google yoki Apple bilan ochilgan hisobda raqam YO'Q (2026-09-17,
     A10): tur `string` deb yozilgani uchun ilova uni doim bor deb
     hisoblardi va profil ekranida `null` chizilardi. */
  phone: string | null;
  firstName: string;
  lastName: string | null;
  role: string;
  locale: string;
  isVerified: boolean;
  isAdmin: boolean;
  /* Profil ekrani uchun — `getCurrentUser()` bularni allaqachon
     qaytaradi (`furam/src/lib/auth.ts`), shunchaki bu yerda
     e'lon qilinmagan edi. */
  avatarUrl?: string | null;
  premiumUntil?: string | null;
  vipUntil?: string | null;
  createdAt?: string | null;
};
