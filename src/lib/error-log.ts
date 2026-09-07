/**
 * Ilova xatolarini serverga yuborish (TZ, poydevor).
 *
 * ── NEGA KERAK ──────────────────────────────────────────────────
 *
 * Serverdagi xato jurnalga tushadi, ilovadagisi esa hech qayerga
 * bormaydi: telefonda komponent yiqilsa, biz buni FAQAT Bekzod
 * aytganda bilamiz — «nimadir ishlamadi» degan gapdan esa
 * nosozlikni topib bo'lmaydi. Endi xabar, joy va stek serverga
 * boradi.
 *
 * ── SPAM QILMAYDI ───────────────────────────────────────────────
 *
 * Bitta xato sikl ichida yuzlab marta takrorlanishi mumkin
 * (`render` da yiqilgan komponent). Shuning uchun:
 *   · bir xil xabar bir seansda BIR MARTA yuboriladi;
 *   · seans davomida ko'pi bilan 20 ta.
 * Serverda ham chegara bor (IP ga soatiga 20 ta), lekin unga
 * tayanib qolish — foydali xatolarni o'zimiz ko'mib yuborish
 * demakdir: chegara to'lgach KEYINGI, boshqacha xato ham
 * tashlanardi.
 *
 * ── JIM ISHLAYDI ────────────────────────────────────────────────
 *
 * Yuborilmasa hech narsa qilinmaydi. Xato haqidagi xabarning o'zi
 * xato chiqarsa, foydalanuvchi ikki marta jazolanardi.
 */
import { API_BASE } from "./api";
import { tokenNow } from "./session";

const MAX_PER_SESSION = 20;
const sent = new Set<string>();

export function reportError(err: unknown, path?: string): void {
  try {
    if (sent.size >= MAX_PER_SESSION) return;

    const e = err as { message?: unknown; stack?: unknown } | null;
    const message = String(e?.message ?? err ?? "").slice(0, 500).trim();
    if (!message) return;

    /* Kalit — xabar + joy: bir xil xato boshqa ekranda chiqsa,
       bu YANGI ma'lumot va yuborilishi kerak. */
    const key = `${message}@${path ?? ""}`;
    if (sent.has(key)) return;
    sent.add(key);

    const token = tokenNow();
    void fetch(`${API_BASE}/api/client-error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client": "mobile",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        stack: typeof e?.stack === "string" ? e.stack.slice(0, 4000) : undefined,
        path,
      }),
    }).catch(() => null);
  } catch {
    /* Jurnal yozish ilovani yiqitmasin */
  }
}

/**
 * Ushlanmagan xatolarni tutish.
 *
 * `ErrorUtils` — React Native ning o'z global tutqichi. Uni
 * ALMASHTIRMAYMIZ, ustiga qo'shamiz: eskisi chaqirilmasa, `__DEV__`
 * da qizil ekran ham, chiqarilgan ilovada esa odatiy yiqilish ham
 * yo'qolardi va nosozlikni umuman ko'rib bo'lmasdi.
 */
export function installErrorLog(): void {
  const g = globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler?: () => (e: unknown, fatal?: boolean) => void;
      setGlobalHandler?: (h: (e: unknown, fatal?: boolean) => void) => void;
    };
  };
  const prev = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((e, fatal) => {
    reportError(e, "global");
    prev?.(e, fatal);
  });
}
