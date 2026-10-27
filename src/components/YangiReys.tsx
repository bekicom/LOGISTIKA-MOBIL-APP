/**
 * «Yangi reys» (TZ v3 §15-6) — webdagi `trips/yangi-reys.tsx` bilan bir xil:
 * o'z yukim + Parkimdagi mashinam (haydovchisi bilan) → reys. Transport
 * e'lonlari yo'q — reys aynan Parkim mashinasi bilan ochiladi.
 * Variantlar serverdan (`/api/trips/yangi`), ochish — oddiy `/api/trips`.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Variantlar = {
  yuklar: { id: string; label: string }[];
  mashinalar: { id: string; label: string; haydovchi: string | null; sabab: "REYSDA" | "BAND" | "HAYDOVCHISIZ" | null }[];
};

export function YangiReys() {
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [v, setV] = useState<Variantlar | null>(null);
  const [yuk, setYuk] = useState("");
  const [mashina, setMashina] = useState("");
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function och() {
    setOchiq(true);
    setXato(null);
    setV(null);
    try {
      const j = await api<Variantlar>("/api/trips/yangi");
      setV(j);
      setYuk(j.yuklar[0]?.id ?? "");
      setMashina(j.mashinalar.find((m) => !m.sabab)?.id ?? "");
    } catch (e) {
      setXato(e instanceof FuramError ? e.message : t("yangiReys.xato"));
    }
  }

  async function yarat() {
    setBand(true);
    setXato(null);
    try {
      const j = await api<{ trip: { id: string } }>("/api/trips", {
        method: "POST",
        body: { loadId: yuk, vehicleId: mashina },
      });
      setOchiq(false);
      router.push(`/reys/${j.trip.id}`);
    } catch (e) {
      setXato(e instanceof FuramError ? e.message : t("yangiReys.xato"));
    } finally {
      setBand(false);
    }
  }

  return (
    <>
      <Pressable onPress={() => void och()} style={s.tugma} accessibilityRole="button" hitSlop={6}>
        <Text style={s.tugmaText}>+ {t("yangiReys.tugma")}</Text>
      </Pressable>
      <Sheet open={ochiq} onClose={() => setOchiq(false)} title={t("yangiReys.tugma")}>
        {!v ? (
          xato ? <Text style={s.xato}>{xato}</Text> : <Text style={s.izoh}>…</Text>
        ) : (
          <View style={{ gap: space.md }}>
            <Text style={s.bosh}>{t("yangiReys.yuk")}</Text>
            {v.yuklar.length === 0 ? (
              <Pressable onPress={() => { setOchiq(false); router.push("/yuk-joylash"); }} accessibilityRole="link">
                <Text style={s.izoh}>
                  {t("yangiReys.yukYoq")} <Text style={s.havola}>{t("yangiReys.yukQosh")} →</Text>
                </Text>
              </Pressable>
            ) : (
              v.yuklar.map((y) => (
                <Qator key={y.id} on={yuk === y.id} onPress={() => setYuk(y.id)} label={y.label} />
              ))
            )}

            <Text style={s.bosh}>{t("yangiReys.mashina")}</Text>
            {v.mashinalar.length === 0 ? (
              <Pressable onPress={() => { setOchiq(false); router.push("/parkim"); }} accessibilityRole="link">
                <Text style={s.izoh}>
                  {t("yangiReys.mashinaYoq")} <Text style={s.havola}>{t("yangiReys.mashinaQosh")} →</Text>
                </Text>
              </Pressable>
            ) : (
              v.mashinalar.map((m) => (
                <Qator
                  key={m.id}
                  on={mashina === m.id}
                  off={!!m.sabab}
                  onPress={() => setMashina(m.id)}
                  label={m.label}
                  izoh={m.sabab ? t(`yangiReys.s_${m.sabab}`) : (m.haydovchi ?? "")}
                />
              ))
            )}

            {xato ? <Text style={s.xato}>{xato}</Text> : null}
            <Button title={t("yangiReys.ochish")} loading={band} disabled={!yuk || !mashina} onPress={() => void yarat()} />
          </View>
        )}
      </Sheet>
    </>
  );
}

function Qator({ on, off, onPress, label, izoh }: { on: boolean; off?: boolean; onPress: () => void; label: string; izoh?: string }) {
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      disabled={off}
      accessibilityRole="radio"
      accessibilityState={{ selected: on, disabled: off }}
      style={[s.qator, on && s.qatorOn, off && { opacity: 0.55 }]}
    >
      <View style={[s.nuqta, on && s.nuqtaOn]} />
      <Text style={s.qatorText} numberOfLines={2}>
        {label}
      </Text>
      {izoh ? (
        <Text style={[s.qatorIzoh, off && { color: color.warningText }]} numberOfLines={1}>
          {izoh}
        </Text>
      ) : null}
    </Pressable>
  );
}

const s = themed(() => ({
  tugma: { height: 34, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.brand, justifyContent: "center", marginRight: 4 },
  tugmaText: { fontSize: 13, fontWeight: "800", color: "#ffffff" },
  bosh: { fontSize: 14, fontWeight: "800", color: color.foreground },
  izoh: { fontSize: 13.5, color: color.mutedForeground },
  havola: { fontWeight: "800", color: color.brandText },
  xato: { fontSize: 13.5, color: color.danger },
  qator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
  },
  qatorOn: { borderColor: color.brand, backgroundColor: color.brand + "10" },
  nuqta: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: color.border },
  nuqtaOn: { borderColor: color.brand, backgroundColor: color.brand },
  qatorText: { flex: 1, fontSize: 14, fontWeight: "700", color: color.foreground },
  qatorIzoh: { fontSize: 12, color: color.mutedForeground, maxWidth: 130 },
}));
