/**
 * Ovozli xarajat (TZ v2 §6.2, A7, 2026-10-27) — webdagi
 * `finance/ovozli-xarajat.tsx` bilan bir xil.
 *
 * «200 litr solyarka, 2 mln» deydi (mikrofonni bosib turadi) yoki yozadi →
 * forma maydonlari to'ldiriladi. Saqlashni odam o'zi bosadi: AI taxmini
 * ko'rib tasdiqlanadi (chek skaneri bilan bir xil qoida).
 */
import { useState } from "react";
import { ActivityIndicator, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { MicButton, type VoiceFile } from "@/components/Recorder";
import { apiUpload, FuramError } from "@/lib/api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type XarajatTaklif = {
  category: string | null;
  amount: number | null;
  currency: string | null;
  liters: number | null;
  station: string | null;
  note: string | null;
  transcript: string | null;
};

export function OvozliXarajat({ onTaklif }: { onTaklif: (t: XarajatTaklif) => void }) {
  const [matn, setMatn] = useState("");
  const [band, setBand] = useState(false);
  const [xabar, setXabar] = useState<string | null>(null);

  async function yubor(ovoz: VoiceFile | null) {
    if (!ovoz && !matn.trim()) return;
    setBand(true);
    setXabar(null);
    try {
      const r = await apiUpload<{ taklif: XarajatTaklif }>(
        "/api/ai/finance/ovoz",
        ovoz ? {} : { text: matn.trim() },
        ovoz ? [{ field: "voice", uri: ovoz.uri, name: ovoz.name, type: ovoz.type }] : [],
      );
      const tk = r.taklif;
      if (tk.transcript) setMatn(tk.transcript);
      if (tk.amount == null && !tk.category) {
        setXabar(t("ovozliXarajat.tushunmadi"));
        return;
      }
      onTaklif(tk);
      setXabar(t("ovozliXarajat.toldirildi"));
    } catch (e) {
      setXabar((e as FuramError).message ?? t("ovozliXarajat.xato"));
    } finally {
      setBand(false);
    }
  }

  return (
    <View style={s.card}>
      <Text style={s.title}>🎙 {t("ovozliXarajat.title")}</Text>
      <Text style={s.muted}>{t("ovozliXarajat.izoh")}</Text>
      <View style={s.row}>
        <TextInput
          value={matn}
          onChangeText={setMatn}
          placeholder={t("ovozliXarajat.ph")}
          placeholderTextColor={color.mutedForeground}
          onSubmitEditing={() => void yubor(null)}
          returnKeyType="done"
          style={s.input}
        />
        {band ? (
          <ActivityIndicator color={color.brand} />
        ) : matn.trim() ? (
          <Tap onPress={() => void yubor(null)} feel="select" style={s.btn}>
            <Text style={s.btnText}>{t("ovozliXarajat.toldir")}</Text>
          </Tap>
        ) : (
          <MicButton onDone={(v) => void yubor(v)} onError={setXabar} onHint={setXabar} disabled={band} />
        )}
      </View>
      {xabar ? <Text style={s.muted}>{xabar}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  card: { padding: space.md, borderRadius: radius.control, borderWidth: 1, borderColor: color.brand, gap: 6 },
  title: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground },
  muted: { fontSize: 12, color: color.mutedForeground },
  row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    color: color.foreground,
    fontSize: 15,
  },
  btn: { paddingHorizontal: 14, minHeight: 44, borderRadius: radius.control, backgroundColor: color.brand, justifyContent: "center" as const },
  btnText: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.brandForeground },
}));
