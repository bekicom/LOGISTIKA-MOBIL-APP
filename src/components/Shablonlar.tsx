/**
 * Hujjat shablonlari va sug'urta (TZ v2 §6.1.1–6.1.2, 2026-10-27) — webdagi
 * `fleet/[id]/shablonlar.tsx` bilan bir xil.
 *
 * Shablon: bir tugma → kartalardan PDF, mashina (CMR — reys) hujjatlariga
 * o'zi yoziladi. Sug'urta: hamkorlik API'si yo'q — tugma rasmiy saytni
 * ochadi (havolani admin beradi), polis rasmi «Hujjat qo'shish» orqali.
 */
import { useState } from "react";
import { ActivityIndicator, Linking, View } from "react-native";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { openRemoteFile } from "@/lib/files";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

const TURLAR = ["yol_varaqa", "ishonchnoma", "cmr"] as const;
const SUGURTA = ["OSAGO", "KASKO", "GREEN_CARD", "CARGO"] as const;
type Holat = { reysBor: boolean; sugurta: Partial<Record<(typeof SUGURTA)[number], string>> };

export function Shablonlar({ vehicleId, onYaratildi, onPolis }: { vehicleId: string; onYaratildi: () => void; onPolis: () => void }) {
  const { data } = useApi<Holat>(`/api/fleet/vehicles/${vehicleId}/shablon`, [vehicleId]);
  const [band, setBand] = useState<string | null>(null);
  const [xabar, setXabar] = useState<string | null>(null);

  async function yarat(tur: (typeof TURLAR)[number]) {
    setBand(tur);
    setXabar(null);
    try {
      const r = await api<{ url: string }>(`/api/fleet/vehicles/${vehicleId}/shablon`, { method: "POST", body: { tur } });
      setXabar(t("shablon.tayyor"));
      onYaratildi();
      await openRemoteFile(r.url, `${t(`shablon.${tur}`)}.pdf`).catch(() => null);
    } catch (e) {
      setXabar((e as Error).message);
    } finally {
      setBand(null);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      <View style={s.card}>
        <Text style={s.h}>{t("shablon.title")}</Text>
        <Text style={s.muted}>{t("shablon.izoh")}</Text>
        <View style={s.wrap}>
          {TURLAR.map((tur) => {
            const yopiq = !!band || (tur === "cmr" && !data?.reysBor);
            return (
              <Tap key={tur} onPress={() => void yarat(tur)} disabled={yopiq} feel="select" style={[s.chip, yopiq && { opacity: 0.5 }]}>
                {band === tur ? <ActivityIndicator size="small" color={color.brand} /> : <Text style={s.chipText}>{t(`shablon.${tur}`)}</Text>}
              </Tap>
            );
          })}
        </View>
        {data && !data.reysBor ? <Text style={s.muted}>{t("shablon.cmrReyssiz")}</Text> : null}
        {xabar ? <Text style={s.muted}>{xabar}</Text> : null}
      </View>

      <View style={s.card}>
        <Text style={s.h}>{t("shablon.sugurta")}</Text>
        <Text style={s.muted}>{t("shablon.sugurtaIzoh")}</Text>
        <View style={s.wrap}>
          {SUGURTA.map((k) => {
            const url = data?.sugurta[k];
            return url ? (
              <Tap key={k} onPress={() => void Linking.openURL(url)} feel="select" style={s.chip}>
                <Text style={s.chipText}>{t(`shablon.s_${k}`)} ↗</Text>
              </Tap>
            ) : (
              <View key={k} style={[s.chip, s.dashed]}>
                <Text style={s.muted}>{`${t(`shablon.s_${k}`)} · ${t("shablon.tezOrada")}`}</Text>
              </View>
            );
          })}
        </View>
        <Tap onPress={onPolis} feel="select">
          <Text style={s.link}>{t("shablon.polisYukla")} →</Text>
        </Tap>
      </View>
    </View>
  );
}

const s = themed(() => ({
  card: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, gap: 8 },
  h: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.mutedForeground, textTransform: "uppercase" as const },
  wrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, minHeight: 40, justifyContent: "center" as const },
  dashed: { borderStyle: "dashed" as const },
  chipText: { fontSize: 14, fontFamily: "Manrope_600SemiBold", color: color.foreground },
  link: { fontSize: 14, fontFamily: "Manrope_600SemiBold", color: color.brand },
  muted: { fontSize: 12, color: color.mutedForeground },
}));
