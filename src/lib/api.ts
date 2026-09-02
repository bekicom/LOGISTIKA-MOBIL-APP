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
import { currentLocale } from "./i18n";

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

/**
 * Backend porti.
 *
 * Qattiq yozilmaydi: Next.js dev serveri 3000 band bo'lsa 3100 ga
 * o'tib ketadi va ilova jimgina «ulanmadi» deb turaverardi. Bir marta
 * shu sababdan vaqt yo'qotilgan.
 *
 * `.env` da: `EXPO_PUBLIC_API_PORT=3100`
 */
const PORT = process.env.EXPO_PUBLIC_API_PORT ?? "3000";

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ && host ? `http://${host}:${PORT}` : "https://furam.uz");

export type ApiError = {
  error: string;
  message?: string;
  details?: Record<string, string[]>;
  status: number;
  /** Javobning to'liq tanasi */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
};

export class FuramError extends Error {
  code: string;
  status: number;
  details?: Record<string, string[]>;
  /**
   * Serverning to'liq javobi.
   *
   * Ba'zi xatolar `error` va `message` dan tashqari ma'lumot ham
   * beradi — masalan hisobni o'chirishdagi 409 yopilmagan reyslar
   * RO'YXATINI qaytaradi va ekran uni chizishi kerak. Busiz o'sha
   * ma'lumot yo'qolardi.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;

  constructor(e: ApiError) {
    super(e.message ?? e.error);
    this.code = e.error;
    this.status = e.status;
    this.details = e.details;
    this.data = e.data;
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
  /* Til QATTIQ YOZILMAYDI. Server javobdagi joy nomlari, transport
     turlari va holat yorliqlarini shu sarlavhaga qarab tanlaydi
     (`furam/src/lib/locale-server.ts`). Ilgari doim "uz" ketardi va
     rus tilidagi foydalanuvchi o'zbekcha matn olardi. */
  const { method = "GET", body, auth = true, locale = currentLocale() } = opts;

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
      data,
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

/* ─────────────────────────────────────────────── fayl yuborish */

export type Upload = { field: string; uri: string; name: string; type: string };

/**
 * Multipart so'rov — hujjat va chek suratlari uchun.
 *
 * Server tomonda bu yo'llar `req.formData()` kutadi, JSON emas.
 *
 * ⚠️ `Content-Type` QO'LDA QO'YILMAYDI. React Native `FormData` uchun uni
 * o'zi yozadi va ichiga `boundary` qo'shadi; qo'lda yozilsa boundary
 * tushib qoladi va server so'rovni umuman o'qiy olmaydi.
 *
 * Timeout uzunroq (60s): surat mobil internetda sekin ketadi.
 */
export async function apiUpload<T>(
  path: string,
  fields: Record<string, string | number | undefined>,
  files: Upload[] = [],
): Promise<T> {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== "") form.append(k, String(v));
  }
  for (const f of files) {
    // RN'da fayl shu uchlik bilan beriladi
    form.append(f.field, { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
  }

  const headers: Record<string, string> = { "X-Client": "mobile" };
  const token = await getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: form,
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new FuramError({
      error: aborted ? "TIMEOUT" : "NETWORK",
      message: aborted
        ? "Yuborish uzoq cho'zildi. Aloqa yaxshi joyda qayta urinib ko'ring."
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
      data,
    });
  }
  return data as T;
}
