/**
 * AI-dispetcher narx maslahati (TZ v2 §3.4.3, A11, 2026-10-27) — webdagi
 * `components/narx-maslahat.tsx` bilan bir xil. Raqam serverdan
 * (`/api/loads/narx-tahlil`), matn lug'atdan. Ma'lumot yetarli bo'lmasa
 * hech narsa chizilmaydi.
 *
 * Ikki rejim: `load` — yuk sahifasi (rol serverdan), aks holda forma
 * maydonlari (rol — «egasi»).
 */
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { api } from "@/lib/api";
import { isGuest } from "@/lib/guest";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Javob = {
  holat: "past" | "baland" | "mos" | "nomalum";
  median: number | null;
  currency: string;
  soni: number;
  foiz: number | null;
  boshaydi: number;
  rol?: "egasi" | "tashuvchi";
};

type Props =
  | { load: string }
  | { from: number | null; to: number | null; vt?: number | null; price: number | null; currency: string };

export function NarxMaslahat(p: Props) {
  const [j, setJ] = useState<Javob | null>(null);
  const kalit = "load" in p ? `load=${p.load}` : p.from && p.to && p.price ? new URLSearchParams({
    from: String(p.from),
    to: String(p.to),
    price: String(p.price),
    currency: p.currency,
    ...(p.vt ? { vt: String(p.vt) } : {}),
  }).toString() : null;

  useEffect(() => {
    /* Mehmonga yo'q — marshrut kirishni talab qiladi */
    if (!kalit || isGuest()) return;
    let tirik = true;
    const timer = setTimeout(() => {
      void api<Javob>(`/api/loads/narx-tahlil?${kalit}`)
        .then((d) => tirik && setJ(d))
        .catch(() => null);
    }, 600);
    return () => {
      tirik = false;
      clearTimeout(timer);
    };
  }, [kalit]);

  if (!kalit || !j || j.holat === "nomalum" || j.median == null) return null;
  const rol = j.rol ?? "egasi";
  const v = { median: new Intl.NumberFormat("ru-RU").format(j.median), cur: j.currency, n: j.soni, foiz: Math.abs(j.foiz ?? 0) };
  const ogoh = j.holat === "past";
  return (
    <View style={[s.card, ogoh && { borderColor: color.warning }]}>
      <Text style={s.title}>🤖 {t("narxMaslahat.title")}</Text>
      <Text style={s.body}>{t(`narxMaslahat.${rol}_${j.holat}`, v)}</Text>
      {rol === "egasi" && j.holat !== "past" && j.boshaydi >= 2 ? (
        <Text style={s.body}>{t("narxMaslahat.kuting", { n: j.boshaydi })}</Text>
      ) : null}
    </View>
  );
}

const s = themed(() => ({
  card: { padding: space.md, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, gap: 4 },
  title: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.mutedForeground },
  body: { fontSize: 13, color: color.foreground },
}));
