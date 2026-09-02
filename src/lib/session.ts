/**
 * Sessiya: token saqlash va joriy foydalanuvchi.
 *
 * Token FAQAT `expo-secure-store` da turadi — iOS Keychain, Android
 * Keystore. AsyncStorage yoki MMKV ga yozilmaydi: ular shifrlanmagan va
 * root qilingan telefonda ochiq o'qiladi.
 */
import * as SecureStore from "expo-secure-store";

const KEY = "furam_session_token";

let cached: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    cached = await SecureStore.getItemAsync(KEY);
  } catch {
    // Qurilma qulfsiz bo'lsa yoki Keychain ochilmasa — sessiyasiz davom etamiz
    cached = null;
  }
  return cached;
}

export async function saveToken(token: string): Promise<void> {
  cached = token;
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  cached = null;
  await SecureStore.deleteItemAsync(KEY);
}

/** Serverdagi `/api/auth/me` javobining bizga kerak qismi */
export type User = {
  id: string;
  furamId: number;
  phone: string;
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
