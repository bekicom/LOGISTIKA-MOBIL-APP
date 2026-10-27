/**
 * «AI bilan to'ldirish» — rasm + ovozli xabar yoki matn → e'lon maydonlari
 * (TZ v2 §7, A4, 2026-10-27). Webdagi `furam/src/app/market/new/ai-elon.tsx`
 * ning o'zi; server — `/api/market/ai-elon`. Forma to'ldiriladi, joylashni
 * sotuvchi o'zi bosadi.
 */
import { useState } from "react";
import { TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { Button } from "@/components/ui";
import { MicButton, type VoiceFile } from "@/components/Recorder";
import { apiUpload, FuramError } from "@/lib/api";
import { pickPhotos, toUpload, type Photo } from "@/lib/photo";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type ElonTaklif = {
  category: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  odometer: number | null;
  price: number | null;
  currency: string | null;
  euro: string | null;
  about: string | null;
};

export function AiElon({ onTaklif }: { onTaklif: (x: ElonTaklif) => void }) {
  const [rasmlar, setRasmlar] = useState<Photo[]>([]);
  const [ovoz, setOvoz] = useState<VoiceFile | null>(null);
  const [matn, setMatn] = useState("");
  const [band, setBand] = useState(false);
  const [xabar, setXabar] = useState<string | null>(null);

  async function yubor() {
    setBand(true);
    setXabar(null);
    try {
      const r = await apiUpload<{ taklif: ElonTaklif }>(
        "/api/market/ai-elon",
        matn.trim() ? { text: matn.trim() } : {},
        [
          ...rasmlar.slice(0, 3).map((p) => toUpload(p, "photos")),
          ...(ovoz ? [{ field: "voice", uri: ovoz.uri, name: ovoz.name, type: ovoz.type }] : []),
        ],
      );
      onTaklif(r.taklif);
      setXabar(t("aiElon.toldirildi"));
    } catch (e) {
      setXabar((e as FuramError).message ?? t("aiElon.xato"));
    } finally {
      setBand(false);
    }
  }

  return (
    <View style={s.card}>
      <Text style={s.title}>🤖 {t("aiElon.title")}</Text>
      <Text style={s.muted}>{t("aiElon.izoh")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Tap
          onPress={async () => setRasmlar((await pickPhotos(3)).slice(0, 3))}
          feel="select"
          style={s.btn}
        >
          <Text style={s.btnText}>📷 {rasmlar.length ? t("aiElon.rasmN", { n: rasmlar.length }) : t("aiElon.rasm")}</Text>
        </Tap>
        <MicButton onDone={setOvoz} onError={setXabar} onHint={setXabar} disabled={band} />
        {ovoz ? <Text style={[s.muted, { color: color.success }]}>🎙 {t("aiElon.ovozBor")}</Text> : null}
      </View>
      <TextInput
        value={matn}
        onChangeText={setMatn}
        placeholder={t("aiElon.matnPh")}
        placeholderTextColor={color.faintText}
        multiline
        style={s.input}
      />
      <Button
        title={band ? t("aiElon.oqilmoqda") : t("aiElon.toldir")}
        onPress={() => void yubor()}
        loading={band}
        disabled={!rasmlar.length && !ovoz && !matn.trim()}
      />
      {xabar ? <Text style={s.muted}>{xabar}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  card: {
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.brand,
    backgroundColor: color.brandSoft,
    gap: 8,
    marginBottom: space.md,
  },
  title: { fontSize: 15, fontFamily: "Manrope_700Bold", color: color.foreground },
  muted: { fontSize: 13, color: color.mutedForeground },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  btnText: { fontSize: 13, fontFamily: "Manrope_700Bold", color: color.foreground },
  input: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    padding: 10,
    fontSize: 16,
    color: color.foreground,
    backgroundColor: color.card,
  },
}));
