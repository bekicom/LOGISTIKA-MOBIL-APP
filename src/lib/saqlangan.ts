/**
 * E'lon saqlanganmi — kartadagi 🔖 (2026-09-21).
 *
 * Ilgari kartada BEZAK yurak turardi: bosilsa karta ochilardi, hech narsa
 * saqlanmasdi. Bekzod: «yurakchani bossam saqlangan xabar bo'lishi kerak».
 *
 * ── BOSHLANG'ICH HOLAT SERVERDAN, O'ZGARISH SHU YERDA ───────────
 *
 * Lenta har e'lon bilan `saved` beradi (`/api/loads/list`, web lentasi
 * ham shunday — `SaveButton initialSaved`). Odam bosganda holat shu
 * yerga yoziladi va DARROV chiziladi (serverni kutmaydi); xato bo'lsa
 * qaytariladi. Bir e'lon bir necha joyda turishi mumkin (lenta,
 * mosliklar, «Saqlanganlar» dan o'chirish) — hammasi shu bitta
 * holatni o'qiydi, ya'ni bir joyda bosilsa boshqasida ham o'zgaradi.
 */
import { useSyncExternalStore } from "react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { api, FuramError } from "./api";
import { guestBlocked } from "./guest-gate";
import { t } from "./i18n";
import { xabarcha } from "@/components/Xabarcha";

export type SaqlashTuri = "load" | "truck";

const holat = new Map<string, boolean>();
/** Yo'ldagi so'rov — tez ikki bosishda POST va DELETE poygaga tushmasin */
const band = new Set<string>();
const tinglovchi = new Set<() => void>();
const xabarBer = () => tinglovchi.forEach((l) => l());
const obuna = (cb: () => void) => {
  tinglovchi.add(cb);
  return () => {
    tinglovchi.delete(cb);
  };
};
const kalit = (tur: SaqlashTuri, id: string) => `${tur}:${id}`;

/** `serverdan` — lenta qatoridagi `saved` (eski server bermasa — saqlanmagan) */
export function useSaqlangan(tur: SaqlashTuri, id: string, serverdan?: boolean | null): boolean {
  const k = kalit(tur, id);
  const ol = () => holat.get(k) ?? !!serverdan;
  return useSyncExternalStore(obuna, ol, ol);
}

/** Boshqa ekrandan o'zgarganda (masalan «Saqlanganlar» dan o'chirildi) */
export function saqlanganDeb(tur: SaqlashTuri, id: string, qiymat: boolean) {
  holat.set(kalit(tur, id), qiymat);
  xabarBer();
}

export async function saqlashniAlmashtir(tur: SaqlashTuri, id: string, hozir: boolean): Promise<void> {
  if (guestBlocked()) return;
  const k = kalit(tur, id);
  if (band.has(k)) return;
  band.add(k);

  const yangi = !hozir;
  saqlanganDeb(tur, id, yangi);
  void Haptics.selectionAsync().catch(() => {});
  try {
    if (yangi) {
      await api("/api/saved", { method: "POST", body: { kind: tur, id } });
    } else {
      /* ⚠️ SO'ROV QATORIDA, tanada emas: server `DELETE` da faqat
         `?kind=&id=` ni o'qiydi (`api/saved/route.ts`) */
      await api(`/api/saved?kind=${tur}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    }
    xabarcha(
      yangi
        ? {
            matn: t("mob.common.saved"),
            amal: { nom: t("mob.saved.see"), bos: () => router.push("/saqlanganlar") },
          }
        : { matn: t("mob.saved.removed") },
    );
  } catch (e) {
    saqlanganDeb(tur, id, hozir);
    xabarcha({ matn: (e as FuramError).message, ohang: "xato" });
  } finally {
    band.delete(k);
  }
}
