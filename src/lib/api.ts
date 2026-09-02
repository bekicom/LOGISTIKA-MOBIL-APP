/**
 * FURAM backend bilan ishlash.
 *
 * Bitta backend — web bilan bir xil (`furam/src/app/api/...`). Farqi
 * shundaki, mobil klient sessiyani cookie'da emas, `Authorization: Bearer`
 * sarlavhasida olib yuradi. Server tomonda buni `getCurrentUser()`
 * qo'llab-quvvatlaydi (`furam/src/lib/auth.ts`).
 */
import Constants from "expo-constants";
import { getToken } from "./session";

/**
 * Manzil qanday topiladi:
 *
 *  1. `EXPO_PUBLIC_API_URL` — qo'lda berilsa, o'sha ustun.
 *  2. Dev rejimida — Expo qaysi kompyuterdan uzatilayotgan bo'lsa, o'sha
 *     mashinaning IP'si. `localhost` YARAMAYDI: telefon uchun localhost —
 *     telefonning o'zi.
 *  3. Aks holda jonli sayt.
 */
function devHost(): string | null {
  const uri =
    Constants.expoConfig?.hostUri ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Constants as any).expoGoConfig?.debuggerHost ??
    null;
  if (uri) {
    const host = String(uri).split(":")[0];
    if (host) return host;
  }
  /* Web'da `hostUri` bo'sh bo'ladi — brauzer qaysi manzilda ochilgan
     bo'lsa, backend ham o'sha mashinada. Busiz dev rejimida ilova
     jimgina JONLI saytga so'rov yuborardi. */
  if (typeof window !== "undefined" && window.location?.hostname) {
    return window.location.hostname;
  }
  return null;
}

const host = devHost();

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ && host ? `http://${host}:3000` : "https://furam.uz");

export type ApiError = {
  error: string;
  message?: string;
  details?: Record<string, string[]>;
  status: number;
};

export class FuramError extends Error {
  code: string;
  status: number;
  details?: Record<string, string[]>;

  constructor(e: ApiError) {
    super(e.message ?? e.error);
    this.code = e.error;
    this.status = e.status;
    this.details = e.details;
  }
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Kirishdan oldingi so'rovlarda token bo'lmaydi */
  auth?: boolean;
  locale?: string;
};

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, auth = true, locale = "uz" } = opts;

  const headers: Record<string, string> = {
    "X-Client": "mobile",
    "Accept-Language": locale,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  // Sekin tarmoqda cheksiz kutib qolmaslik uchun
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new FuramError({
      error: aborted ? "TIMEOUT" : "NETWORK",
      message: aborted
        ? "Server javob bermadi. Qaytadan urinib ko'ring."
        : "Internetga ulanmadi. Aloqani tekshiring.",
      status: 0,
    });
  }
  clearTimeout(timer);

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    throw new FuramError({
      error: data?.error ?? "HTTP_" + res.status,
      message: data?.message,
      details: data?.details,
      status: res.status,
    });
  }

  return data as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
