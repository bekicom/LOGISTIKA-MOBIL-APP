/**
 * Bitta yo'nalish (TZ 28-okt 51): bugungi jo'nashlar, narx oralig'i, yo'l
 * vaqti, chegara holati. Webdagi `/rides/yonalish/[slug]` bilan bitta
 * funksiya (`GET /api/rides/yolovchilar?yonalish=<slug>`).
 *
 * Papka emas, `?slug=` parametri: yangi route papkasi Metro'ni qayta
 * yoqishni talab qilardi.
 */
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Safar = {
  id: string;
  departAt: string;
  timeKnown: boolean;
  seatsFree: number;
  seatsTotal: number;
  price: number;
  currency: string;
  vehicleKind: string | null;
  vehicle: string | null;
  source: string;
  groupCount: number;
};
type Sahifa = {
  from: { id: number; name: string; country: string };
  to: { id: number; name: string; country: string };
  bugun: Safar[];
  keyingi: Safar[];
  narx: { currency: string; min: number; max: number }[];
  yolSoat: number | null;
  taxminiy: boolean;
  chegaralar: { id: string; name: string }[];
  sorovSoni: number;
};
type Qator = { tur: "sarlavha"; matn: string; key: string } | { tur: "safar"; s: Safar; key: string } | { tur: "bosh"; key: string };

const ikki = (n: number) => String(n).padStart(2, "0");
function vaqt(iso: string) {
  const d = new Date(iso);
  return `${ikki(d.getDate())}.${ikki(d.getMonth() + 1)} · ${ikki(d.getHours())}:${ikki(d.getMinutes())}`;
}

export default function YolovchiYonalish() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const { data: d, loading, error, refreshing, refresh, reload } = useApi<Sahifa>(
    slug ? `/api/rides/yolovchilar?yonalish=${encodeURIComponent(slug)}` : null,
    [slug],
  );

  /* Ro'yxat chegaralangan: server 40 tadan ko'p safar bermaydi */
  const qatorlar: Qator[] = d
    ? [
        { tur: "sarlavha", matn: `${t("yolovchi.bugungiJonashlar")} (${d.bugun.length})`, key: "h1" },
        ...(d.bugun.length ? d.bugun.map((s) => ({ tur: "safar" as const, s, key: s.id })) : [{ tur: "bosh" as const, key: "b" }]),
        ...(d.keyingi.length
          ? [
              { tur: "sarlavha" as const, matn: t("yolovchi.keyingiJonashlar"), key: "h2" },
              ...d.keyingi.map((s) => ({ tur: "safar" as const, s, key: s.id })),
            ]
          : []),
      ]
    : [];

  const malumot = d ? (
    <View style={{ gap: space.md }}>
      <Text style={s.title}>
        {d.from.name} — {d.to.name}
      </Text>
      <View style={s.qator3}>
        <View style={s.kichik}>
          <Text style={s.label}>{t("yolovchi.narxOraligi")}</Text>
          {d.narx.length === 0 ? (
            <Text style={s.meta}>{t("yolovchi.malumotYoq")}</Text>
          ) : (
            d.narx.map((n) => (
              <Text key={n.currency} style={s.qiymat}>
                {fmtNum(n.min)}
                {n.max !== n.min ? ` – ${fmtNum(n.max)}` : ""} {n.currency}
              </Text>
            ))
          )}
        </View>
        <View style={s.kichik}>
          <Text style={s.label}>{t("yolovchi.yolVaqti")}</Text>
          <Text style={s.qiymat}>{d.yolSoat != null ? t("yolovchi.soat", { n: d.yolSoat }) : t("yolovchi.malumotYoq")}</Text>
          {d.taxminiy ? <Text style={s.meta}>{t("yolovchi.taxminiy")}</Text> : null}
        </View>
      </View>
      <View style={s.kichik}>
        <Text style={s.label}>{t("yolovchi.chegara")}</Text>
        {d.from.country === d.to.country ? (
          <Text style={s.meta}>{t("yolovchi.chegaraYoq")}</Text>
        ) : d.chegaralar.length === 0 ? (
          <Text style={s.meta}>{t("yolovchi.malumotYoq")}</Text>
        ) : (
          <>
            {d.chegaralar.map((c) => (
              <Text key={c.id} style={s.qiymatKichik}>
                {c.name}
              </Text>
            ))}
            <Pressable onPress={() => router.push("/postlar-bandligi" as never)} accessibilityRole="link">
              <Text style={s.havola}>{t("yolovchi.postlarBandligi")} →</Text>
            </Pressable>
          </>
        )}
      </View>
      <Pressable onPress={() => router.push("/yolovchi" as never)} accessibilityRole="button" style={s.btn}>
        <Text style={s.btnText}>{t("yolovchi.yolovchilarSoni", { n: d.sorovSoni })}</Text>
      </Pressable>
    </View>
  ) : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/yolovchi-yonalishlar" as never))} hitSlop={8} style={s.back} accessibilityRole="button">
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
      </View>
      <FlatList
        data={qatorlar}
        keyExtractor={(q) => q.key}
        ListHeaderComponent={malumot}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        renderItem={({ item: q }) =>
          q.tur === "sarlavha" ? (
            <Text style={s.label}>{q.matn}</Text>
          ) : q.tur === "bosh" ? (
            <Text style={s.meta}>{t("yolovchi.bugunYoq")}</Text>
          ) : (
            <View style={s.card}>
              <Text style={s.yol}>{q.s.timeKnown ? vaqt(q.s.departAt) : t("yolovchi.vaqtKelishiladi")}</Text>
              <Text style={s.meta}>
                {[q.s.vehicle, q.s.vehicleKind ? t(`yolovchi.tur_${q.s.vehicleKind}`) : null].filter(Boolean).join(" · ")}
              </Text>
              <Text style={s.meta}>
                {q.s.seatsTotal > 0 ? t("yolovchi.joyQoldi", { n: q.s.seatsFree }) : t("yolovchi.orinAytilmagan")}
                {q.s.source !== "FURAM" && q.s.groupCount > 1 ? ` · ${t("yolovchi.guruhlarda", { n: q.s.groupCount })}` : ""}
              </Text>
              <Text style={s.narx}>{q.s.price > 0 ? `${fmtNum(q.s.price)} ${q.s.currency}` : t("yolovchi.narxKelishiladi")}</Text>
            </View>
          )
        }
        ListEmptyComponent={loading ? <Skeleton rows={3} /> : error ? <ErrorBox message={error} onRetry={reload} /> : null}
      />
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, paddingTop: 4 },
  back: { width: 40, height: 40, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: color.foreground },
  list: { padding: space.lg, gap: space.md },
  qator3: { flexDirection: "row", gap: space.md },
  kichik: { flex: 1, padding: 12, gap: 2, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, textTransform: "uppercase" },
  qiymat: { fontSize: 17, fontWeight: "800", color: color.foreground },
  qiymatKichik: { fontSize: 14, fontWeight: "600", color: color.foreground },
  havola: { fontSize: 13, fontWeight: "700", color: color.brandText, marginTop: 4 },
  btn: { alignSelf: "flex-start", height: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: color.brand, justifyContent: "center" },
  btnText: { fontSize: 13.5, fontWeight: "700", color: color.brandText },
  card: { padding: 14, gap: 3, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  yol: { fontSize: 16, fontWeight: "800", color: color.foreground },
  meta: { fontSize: 13, color: color.mutedForeground },
  narx: { fontSize: 15, fontWeight: "800", color: color.brandText, marginTop: 2 },
}));
