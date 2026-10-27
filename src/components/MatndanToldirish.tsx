/**
 * Telegram'dan nusxalangan matn → yuk formasi (TZ v2 §3, A4, 2026-10-27) —
 * webdagi `post/matndan-toldirish.tsx` bilan bir xil. Server qoidali parser
 * bilan o'qiydi (AI kvotasi ketmaydi). Faqat to'ldiradi, joylashni odam bosadi.
 */
import { useState } from "react";
import { ActivityIndicator, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import type { Loc } from "@/components/FiltrSheet";
import { api } from "@/lib/api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type MatnTaklif = {
  ok: boolean;
  from: Loc | null;
  to: Loc | null;
  title: string | null;
  weightT: number | null;
  volumeM3: number | null;
  vehicleCount: number | null;
  vehicleTypeId: number | null;
  price: number | null;
  currency: string | null;
  isExtraLoad: boolean;
  description: string | null;
};

export function MatndanToldirish({ onTaklif }: { onTaklif: (t: MatnTaklif) => void }) {
  const [ochiq, setOchiq] = useState(false);
  const [matn, setMatn] = useState("");
  const [band, setBand] = useState(false);
  const [xabar, setXabar] = useState<string | null>(null);

  async function yubor() {
    setBand(true);
    setXabar(null);
    try {
      const r = await api<{ taklif: MatnTaklif }>("/api/loads/matndan", { method: "POST", body: { text: matn } });
      onTaklif(r.taklif);
      setXabar(r.taklif.from && r.taklif.to ? t("matndanYuk.toldirildi") : t("matndanYuk.qisman"));
    } catch {
      setXabar(t("matndanYuk.xato"));
    } finally {
      setBand(false);
    }
  }

  if (!ochiq) {
    return (
      <Tap onPress={() => setOchiq(true)} feel="select" style={[s.card, s.dashed]}>
        <Text style={s.link}>📋 {t("matndanYuk.title")}</Text>
      </Tap>
    );
  }
  return (
    <View style={s.card}>
      <Text style={s.title}>📋 {t("matndanYuk.title")}</Text>
      <Text style={s.muted}>{t("matndanYuk.izoh")}</Text>
      <TextInput
        value={matn}
        onChangeText={setMatn}
        multiline
        maxLength={4000}
        placeholder={t("matndanYuk.ph")}
        placeholderTextColor={color.mutedForeground}
        style={s.input}
      />
      <Tap onPress={() => void yubor()} disabled={band || matn.trim().length < 5} feel="select" style={[s.btn, (band || matn.trim().length < 5) && { opacity: 0.5 }]}>
        {band ? <ActivityIndicator color={color.brandForeground} /> : <Text style={s.btnText}>{t("matndanYuk.toldir")}</Text>}
      </Tap>
      {xabar ? <Text style={s.muted}>{xabar}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  card: { padding: space.md, borderRadius: radius.control, borderWidth: 1, borderColor: color.brand, gap: 8 },
  dashed: { borderStyle: "dashed" as const },
  title: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground },
  link: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.brand },
  muted: { fontSize: 12, color: color.mutedForeground },
  input: {
    minHeight: 96,
    padding: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    color: color.foreground,
    fontSize: 15,
    textAlignVertical: "top" as const,
  },
  btn: { minHeight: 44, borderRadius: radius.control, backgroundColor: color.brand, alignItems: "center" as const, justifyContent: "center" as const },
  btnText: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.brandForeground },
}));
