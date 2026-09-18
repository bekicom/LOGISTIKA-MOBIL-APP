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
import { crashDone, crashList, crashSave } from "./crash-store";
import { tokenNow } from "./session";

const MAX_PER_SESSION = 20;
const sent = new Set<string>();

/** Serverga yuborish — bitta joyda, halokat navbati ham shundan o'tadi */
function post(body: { message: string; stack?: string; path?: string; fatal?: boolean }): Promise<Response | null> {
  const token = tokenNow();
  return fetch(`${API_BASE}/api/client-error`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client": "mobile",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }).catch(() => null);
}

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

    void post({
      message,
      stack: typeof e?.stack === "string" ? e.stack.slice(0, 4000) : undefined,
      path,
    });
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
    /* ⚠️ HALOKATLI XATO DISKKA YOZILADI (2026-09-18, A27).
       Ilova shu zahoti yopiladi va `fetch` yo'lda qolib ketadi —
       ya'ni ilovani yiqitgan xato serverga hech qachon yetmasdi.
       Diskka SINXRON yozamiz va keyingi ochilishda yuboramiz. */
    if (fatal) {
      const err = e as { message?: unknown; stack?: unknown } | null;
      const message = String(err?.message ?? e ?? "").slice(0, 500).trim();
      if (message) {
        crashSave(message, typeof err?.stack === "string" ? err.stack : null, "global");
      }
    }
    reportError(e, "global");
    prev?.(e, fatal);
  });
}

/**
 * Oldingi seansda saqlangan halokatlarni yuborish.
 *
 * Ilova ochilganda BIR MARTA chaqiriladi. Yuborilgani o'chiriladi,
 * yuborilmagani turaveradi — keyingi ochilishda yana uriniladi.
 *
 * Tarmoq yo'q bo'lsa hech narsa qilinmaydi: `post` xatoni yutadi
 * va yozuv navbatda qoladi.
 */
export async function flushCrashes(): Promise<void> {
  try {
    const rows = crashList();
    if (!rows.length) return;
    const yuborilgan: number[] = [];
    for (const r of rows) {
      const res = await post({
        message: r.message,
        stack: r.stack ?? undefined,
        /* Qachon bo'lganini ham bilish kerak: yuborilishi keyingi
           ochilishga — ba'zan ertasiga — suriladi */
        path: `${r.path ?? "global"} · ${new Date(r.at).toISOString().slice(0, 16)}`,
        fatal: true,
      });
      /* 204 — server qabul qildi. Cheklovda ham 204 qaytadi, ya'ni
         yozuv baribir o'chadi: aks holda navbat abadiy qolib,
         har ochilishda takror yuborilardi. */
      if (res && res.status < 500) yuborilgan.push(r.id);
    }
    crashDone(yuborilgan);
  } catch {
    /* jim — xato haqidagi xabar ilovani yiqitmasin */
  }
}
