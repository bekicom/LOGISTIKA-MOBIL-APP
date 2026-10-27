/**
 * Logist hujjatlari reysdan (TZ v3 §15-18) — web `trips/[id]/reys-shablonlar.tsx`
 * bilan bir xil: CMR, invoys — doim; tranzit va ruxsatnoma — xalqaro reysda.
 * PDF serverda reys ma'lumotidan yasaladi va reys hujjatlariga yoziladi.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { openRemoteFile } from "@/lib/files";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

const TURLAR = ["cmr", "invoys", "tranzit", "ruxsatnoma"] as const;

export function ReysShablonlar({ tripId, onYaratildi }: { tripId: string; onYaratildi?: () => void }) {
  const holat = useApi<{ xalqaro: boolean }>(`/api/trips/${tripId}/shablon`);
  const [band, setBand] = useState<string | null>(null);
  const [xato, setXato] = useState<string | null>(null);
  if (!holat.data) return null;

  async function yarat(tur: (typeof TURLAR)[number]) {
    setBand(tur);
    setXato(null);
    try {
      const r = await api<{ url: string }>(`/api/trips/${tripId}/shablon`, { method: "POST", body: { tur } });
      onYaratildi?.();
      await openRemoteFile(r.url, `${tur}-${tripId}.pdf`);
    } catch (e) {
      setXato(e instanceof FuramError ? e.message : t("reysShablon.xato"));
    } finally {
      setBand(null);
    }
  }

  return (
    <View style={s.card}>
      <Text style={s.title}>{t("reysShablon.sarlavha")}</Text>
      <View style={s.grid}>
        {TURLAR.filter((x) => holat.data!.xalqaro || (x !== "tranzit" && x !== "ruxsatnoma")).map((x) => (
          <Pressable
            key={x}
            onPress={() => void yarat(x)}
            disabled={!!band}
            accessibilityRole="button"
            style={({ pressed }) => [s.btn, (pressed || band === x) && { opacity: 0.6 }]}
          >
            <Text style={s.btnText}>📄 {band === x ? "…" : t(`reysShablon.${x}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.izoh}>{t("reysShablon.izoh")}</Text>
      {xato ? <Text style={s.xato}>{xato}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  card: { margin: space.lg, marginBottom: 0, padding: space.md, gap: 8, borderRadius: radius.card, backgroundColor: color.card, borderWidth: 1, borderColor: color.border },
  title: { fontSize: 13, fontWeight: "800", color: color.mutedForeground, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: { flexBasis: "47%", flexGrow: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.control, borderWidth: 1, borderColor: color.border },
  btnText: { fontSize: 14, fontWeight: "700", color: color.foreground },
  izoh: { fontSize: 12, color: color.mutedForeground },
  xato: { fontSize: 12.5, color: color.danger },
}));
