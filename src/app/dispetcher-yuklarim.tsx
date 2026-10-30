/**
 * Dispetcher — «Mening yuklarim» (TZ 29-okt §11.2–11.6).
 *
 * Web `/panel/loads` bilan BITTA manba: `GET /api/panel/yuklar`. Tepada
 * hisoblagichlar (bosilganda filtrlaydi), qidiruv va saralash; kartada
 * yo'nalish, tur, og'irlik, sana, narx, egasi, takliflar soni va rangli
 * holat; «AI bilan transport topish» — mos mashinalar foiz bilan va bir
 * bosishda taklif (`/moslar/yuk/<id>`).
 */
import { useState } from "react";
import { FlatList, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { PanelgaOlish } from "@/components/PanelgaOlish";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t, tripStatusLabel } from "@/lib/i18n";

const HOLATLAR = ["qidirilmoqda", "taklif", "biriktirildi", "yolda", "yetkazildi", "muddati"] as const;
type Holat = (typeof HOLATLAR)[number];
const SARALASH = ["yangi", "eski", "narx", "sana"] as const;

type Yuk = {
  id: string;
  title: string;
  from: string;
  to: string;
  vehicleType: string;
  weightT: number | null;
  loadingDate: string | null;
  price: number | null;
  currency: string | null;
  isNegotiable: boolean;
  ownerName: string;
  ochiqManba: boolean;
  phone: string | null;
  takliflar: number;
  holat: Holat;
  manba: "ozim" | "kelishuv" | "olingan";
  trip: { id: string; furamNo: number; status: string } | null;
  deal: { fee: number; currency: string; paid: boolean } | null;
};
type Javob = { sonlar: Record<Holat | "jami", number>; yuklar: Yuk[] };

/** Holat rangi — webdagi `YUK_RANG` bilan bir ma'noda */
function rang(h: Holat): { fg: string; bg: string } {
  switch (h) {
    case "taklif":
      return { fg: "#b45309", bg: "#f59e0b26" };
    case "biriktirildi":
      return { fg: "#6d28d9", bg: "#8b5cf626" };
    case "yolda":
      return { fg: "#0369a1", bg: "#0ea5e926" };
    case "yetkazildi":
      return { fg: color.success, bg: color.successSoft };
    case "muddati":
      return { fg: color.mutedForeground, bg: color.muted };
    default:
      return { fg: color.brand, bg: color.brandSoft };
  }
}

function narxMatn(y: Yuk): string {
  if (y.isNegotiable || y.price == null) return t("tz5e.kelishiladi");
  return `${new Intl.NumberFormat("ru-RU").format(y.price)} ${y.currency ?? ""}`.trim();
}

export default function DispetcherYuklarim() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{ holat?: string }>();
  const [holat, setHolat] = useState<Holat | null>(
    (HOLATLAR as readonly string[]).includes(p.holat ?? "") ? (p.holat as Holat) : null,
  );
  const [q, setQ] = useState("");
  const [qYuborilgan, setQYuborilgan] = useState("");
  const [sort, setSort] = useState<(typeof SARALASH)[number]>("yangi");

  const query = new URLSearchParams({ ...(holat ? { holat } : {}), ...(qYuborilgan ? { q: qYuborilgan } : {}), sort }).toString();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Javob>(`/api/panel/yuklar?${query}`, [query]);

  return (
    <View style={s.root}>
      <Header title={t("tz5e.meningYuklarim")} />
      <FlatList
        data={data?.yuklar ?? []}
        keyExtractor={(y) => y.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            {/* Hisoblagichlar — bosilganda filtrlaydi (§11.2) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(["jami", ...HOLATLAR] as const).map((h) => {
                const faol = h === "jami" ? !holat : holat === h;
                return (
                  <Tap key={h} onPress={() => setHolat(h === "jami" ? null : h)} style={[s.son, faol && s.sonFaol]}>
                    <Text style={s.sonNom}>{t(`tz5e.yuk_${h}`)}</Text>
                    <Text style={s.sonQiymat}>{data?.sonlar?.[h] ?? "—"}</Text>
                  </Tap>
                );
              })}
            </ScrollView>
            {/* Qidiruv va saralash (§11.6) */}
            <TextInput
              value={q}
              onChangeText={setQ}
              onSubmitEditing={() => setQYuborilgan(q.trim())}
              returnKeyType="search"
              placeholder={t("tz5e.filtrYonalishPh")}
              placeholderTextColor={color.mutedForeground}
              style={s.input}
            />
            <View style={s.chips}>
              {SARALASH.map((x) => (
                <Tap key={x} onPress={() => setSort(x)} style={[s.chip, sort === x && s.chipOn]}>
                  <Text style={[s.chipTxt, sort === x && { color: color.brand }]}>{t(`tz5e.sort_${x}`)}</Text>
                </Tap>
              ))}
            </View>
            {loading && !data ? <Skeleton rows={4} /> : null}
            {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
          </View>
        }
        ListEmptyComponent={
          data && !loading ? (
            <Empty
              icon="package"
              title={data.sonlar.jami === 0 ? t("panelUi.noManagedLoads") : t("tz5e.filtrBosh")}
              text={data.sonlar.jami === 0 ? t("tz5e.bosPanelHint") : undefined}
            />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        renderItem={({ item: y }) => {
          const r = rang(y.holat);
          return (
            <View style={s.card}>
              <Tap onPress={() => router.push(`/yuk/${y.id}`)} style={{ gap: 4 }}>
                <View style={s.qator}>
                  <Text style={s.yol} numberOfLines={1}>
                    {y.from} → {y.to}
                  </Text>
                  <View style={[s.belgi, { backgroundColor: r.bg }]}>
                    <Text style={[s.belgiTxt, { color: r.fg }]}>{t(`tz5e.yuk_${y.holat}`)}</Text>
                  </View>
                </View>
                <Text style={s.sub} numberOfLines={1}>
                  {[y.title, y.vehicleType, y.weightT != null ? `${y.weightT} t` : null, y.loadingDate?.slice(0, 10)]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Text style={s.sub} numberOfLines={1}>
                  {t("tz5e.yukEgasi")}: {y.ochiqManba ? t("tz5e.ochiqManba") : y.ownerName || "—"} ·{" "}
                  {t("tz5e.takliflarSoni", { n: y.takliflar })}
                </Text>
                <Text style={s.narx}>{narxMatn(y)}</Text>
              </Tap>
              <View style={s.amallar}>
                {y.trip ? (
                  <Tap onPress={() => router.push(`/reys/${y.trip!.id}`)} style={s.btn}>
                    <Text style={s.btnTxt}>
                      #{y.trip.furamNo} · {tripStatusLabel(y.trip.status)}
                    </Text>
                  </Tap>
                ) : y.holat !== "muddati" ? (
                  <Tap
                    onPress={() => router.push({ pathname: "/moslar/[kind]/[id]", params: { kind: "yuk", id: y.id } })}
                    style={s.btn}
                  >
                    <Text style={s.btnTxt}>🤖 {t("tz5e.aiTransportTop")}</Text>
                  </Tap>
                ) : null}
                {y.manba === "olingan" ? <PanelgaOlish loadId={y.id} initial onChange={() => reload()} /> : null}
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
  son: { minWidth: 96, padding: 10, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  sonFaol: { borderColor: color.brand, backgroundColor: color.brandSoft },
  sonNom: { fontSize: 11, fontWeight: "700", color: color.mutedForeground },
  sonQiymat: { fontSize: 20, fontWeight: "800", color: color.foreground, marginTop: 2 },
  input: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    color: color.foreground,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: color.border },
  chipOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
  chipTxt: { fontSize: 12, fontWeight: "700", color: color.mutedForeground },
  card: { padding: 14, gap: 10, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  qator: { flexDirection: "row", alignItems: "center", gap: 8 },
  yol: { flex: 1, fontSize: 15, fontWeight: "800", color: color.foreground },
  belgi: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  belgiTxt: { fontSize: 11, fontWeight: "800" },
  sub: { fontSize: 12, color: color.mutedForeground },
  narx: { fontSize: 14, fontWeight: "800", color: color.brand },
  amallar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.control, backgroundColor: color.brand },
  btnTxt: { fontSize: 13, fontWeight: "800", color: "#ffffff" },
}));
