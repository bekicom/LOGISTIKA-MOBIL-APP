/**
 * Dispetcher — «Mening transportlarim» (TZ 29-okt §11.4).
 *
 * Web `/panel/vehicles` bilan bitta manba: `GET /api/panel/transportlar`.
 * Holatlar: Bo'sh · Yuk kutmoqda · Yo'lda · Chegarada · Ta'mirda; joylashuv
 * va biriktirilgan yuk. Bo'sh mashinada «AI bilan yuk topish» (§11.5).
 */
import { useState } from "react";
import { FlatList, Linking, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

const HOLATLAR = ["bosh", "kutmoqda", "yolda", "chegarada", "tamirda"] as const;
type Holat = (typeof HOLATLAR)[number];

type Transport = {
  id: string;
  vehicleType: string;
  capacityT: number | null;
  plate: string | null;
  from: string;
  to: string;
  holat: Holat;
  joy: string;
  joyVaqt: string | null;
  lat: number | null;
  lng: number | null;
  yuk: { slug: string; title: string; from: string; to: string } | null;
  trip: { id: string; furamNo: number } | null;
};
type Javob = { sonlar: Record<Holat | "jami", number>; transportlar: Transport[] };

function rang(h: Holat): { fg: string; bg: string } {
  switch (h) {
    case "kutmoqda":
      return { fg: "#b45309", bg: "#f59e0b26" };
    case "yolda":
      return { fg: "#0369a1", bg: "#0ea5e926" };
    case "chegarada":
      return { fg: "#6d28d9", bg: "#8b5cf626" };
    case "tamirda":
      return { fg: color.danger, bg: "#dc26261a" };
    default:
      return { fg: color.success, bg: color.successSoft };
  }
}

export default function DispetcherTransportlarim() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [holat, setHolat] = useState<Holat | null>(null);
  const { data, loading, error, refreshing, refresh, reload } = useApi<Javob>(
    `/api/panel/transportlar${holat ? `?holat=${holat}` : ""}`,
    [holat],
  );

  return (
    <View style={s.root}>
      <Header title={t("tz5e.meningTransportlarim")} />
      <FlatList
        data={data?.transportlar ?? []}
        keyExtractor={(x) => x.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(["jami", ...HOLATLAR] as const).map((h) => {
                const faol = h === "jami" ? !holat : holat === h;
                return (
                  <Tap key={h} onPress={() => setHolat(h === "jami" ? null : h)} style={[s.son, faol && s.sonFaol]}>
                    <Text style={s.sonNom}>{t(`tz5e.tr_${h}`)}</Text>
                    <Text style={s.sonQiymat}>{data?.sonlar?.[h] ?? "—"}</Text>
                  </Tap>
                );
              })}
            </ScrollView>
            {loading && !data ? <Skeleton rows={4} /> : null}
            {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
          </View>
        }
        ListEmptyComponent={
          data && !loading ? <Empty icon="truck" title={t("panelUi.noManagedVehicles")} text={t("panelUi.noManagedVehiclesHint")} /> : null
        }
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        renderItem={({ item: v }) => {
          const r = rang(v.holat);
          return (
            <View style={s.card}>
              <Tap onPress={() => router.push(`/mashina/${v.id}`)} style={{ gap: 4 }}>
                <View style={s.qator}>
                  <Text style={s.nom} numberOfLines={1}>
                    {[v.vehicleType, v.capacityT != null ? `${v.capacityT} t` : null, v.plate].filter(Boolean).join(" · ")}
                  </Text>
                  <View style={[s.belgi, { backgroundColor: r.bg }]}>
                    <Text style={[s.belgiTxt, { color: r.fg }]}>{t(`tz5e.tr_${v.holat}`)}</Text>
                  </View>
                </View>
                <Text style={s.sub}>
                  {v.from} → {v.to}
                </Text>
                <Text style={s.sub}>
                  📍 {t("tz5e.joylashuv")}: {v.joy}
                </Text>
                <Text style={s.sub} numberOfLines={1}>
                  📦 {v.yuk ? `${t("tz5e.biriktirilganYuk")}: ${v.yuk.title} · ${v.yuk.from} → ${v.yuk.to}` : t("tz5e.yukYoq")}
                </Text>
              </Tap>
              <View style={s.amallar}>
                {v.trip ? (
                  <Tap onPress={() => router.push(`/reys/${v.trip!.id}`)} style={s.btn}>
                    <Text style={s.btnTxt}>#{v.trip.furamNo}</Text>
                  </Tap>
                ) : v.holat !== "tamirda" ? (
                  <Tap
                    onPress={() => router.push({ pathname: "/moslar/[kind]/[id]", params: { kind: "mashina", id: v.id } })}
                    style={s.btn}
                  >
                    <Text style={s.btnTxt}>🤖 {t("tz5e.aiYukTop")}</Text>
                  </Tap>
                ) : null}
                {v.lat != null && v.lng != null ? (
                  <Tap
                    onPress={() => void Linking.openURL(`https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=9/${v.lat}/${v.lng}`)}
                    style={s.btnOq}
                  >
                    <Text style={s.btnOqTxt}>{t("tz5e.xaritada")}</Text>
                  </Tap>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg },
  son: { minWidth: 90, padding: 10, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  sonFaol: { borderColor: color.brand, backgroundColor: color.brandSoft },
  sonNom: { fontSize: 11, fontWeight: "700", color: color.mutedForeground },
  sonQiymat: { fontSize: 20, fontWeight: "800", color: color.foreground, marginTop: 2 },
  card: { padding: 14, gap: 10, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  qator: { flexDirection: "row", alignItems: "center", gap: 8 },
  nom: { flex: 1, fontSize: 15, fontWeight: "800", color: color.foreground },
  belgi: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  belgiTxt: { fontSize: 11, fontWeight: "800" },
  sub: { fontSize: 12, color: color.mutedForeground },
  amallar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.control, backgroundColor: color.brand },
  btnTxt: { fontSize: 13, fontWeight: "800", color: "#ffffff" },
  btnOq: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.control, borderWidth: 1, borderColor: color.border },
  btnOqTxt: { fontSize: 13, fontWeight: "700", color: color.foreground },
}));
