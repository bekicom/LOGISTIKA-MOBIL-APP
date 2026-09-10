/**
 * Moslik ro'yxati — «kim olib keta oladi» va «shu mashinaga qanday
 * yuk bor» (TZ 2-3).
 *
 * ── NEGA BITTA EKRAN ────────────────────────────────────────────
 *
 * Ikkalasi bitta dvigatelning ikki tomoni: server bir xil ball
 * beradi, farq faqat qaysi kartochka chizilishida. Ikki ekran
 * yozilsa, ballni ko'rsatish qoidasi ikki joyda turardi va vaqt
 * o'tib ular ajralib ketardi.
 *
 * Shuning uchun marshrutda `kind` bor: `/moslar/yuk/<id>` — shu
 * yukka mos MASHINALAR, `/moslar/mashina/<id>` — shu mashinaga mos
 * YUKLAR.
 *
 * ── BALL SABABI BILAN ───────────────────────────────────────────
 *
 * «87%» degan raqamning o'zi ishonch uyg'otmaydi. Nima uchun mos
 * ekani yoniga yoziladi — sabablar serverdan KALIT bo'lib keladi
 * (`mob.match.*`), matn qurilmada yasaladi.
 */
import { FlatList, RefreshControl, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Header } from "@/components/ui";
import { ListingCard, TruckCard, type Listing, type TruckItem } from "@/components/cards";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Match = { score: number; reasonKeys: string[] };
type Row = (Listing & TruckItem) & { match: Match };
type Feed = {
  items: Row[];
  load?: { title: string | null; from: string; to: string; weightT: number | null };
  truck?: { type: string; from: string; to: string; capacityT: number | null };
};

/** Ball → so'z. Chegaralar `furam/src/lib/matching.ts:scoreLabel` bilan bir xil */
function band(score: number): { text: string; fg: string; bg: string } {
  if (score >= 85) return { text: t("mob.match.veryGood"), fg: color.success, bg: color.successSoft };
  if (score >= 70) return { text: t("mob.match.good"), fg: color.brand, bg: color.brandSoft };
  return { text: t("mob.match.partial"), fg: color.mutedForeground, bg: color.muted };
}

export default function Moslar() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  /* `yuk` → shu yukka mos mashinalar; `mashina` → mos yuklar */
  const forLoad = kind === "yuk";
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    id ? (forLoad ? `/api/loads/${id}/matches` : `/api/trucks/${id}/matches`) : null,
    [kind, id],
  );

  const items = data?.items ?? [];
  const about = forLoad
    ? data?.load && [data.load.from, "→", data.load.to].join(" ")
    : data?.truck && [data.truck.from, "→", data.truck.to].join(" ");

  return (
    <View style={s.root}>
      <Header
        title={forLoad ? t("mob.match.trucksTitle") : t("mob.match.loadsTitle")}
        subtitle={about || undefined}
      />

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.sm }}>
            <Text style={s.lead}>{t("mob.match.lead")}</Text>
            {loading && !data ? <Skeleton rows={3} /> : null}
            {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
            {data && items.length > 0 ? (
              <View style={s.count}>
                <Icon name="sparkle" size={16} stroke={color.brand} />
                <Text style={s.countText}>{t("mob.match.found", { n: items.length })}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          data && !loading ? (
            <Empty
              icon={forLoad ? "truck" : "package"}
              title={forLoad ? t("mob.match.noneTrucks") : t("mob.match.noneLoads")}
              text={t("mob.match.noneHint")}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const b = band(item.match.score);
          return (
            <View style={{ gap: 6 }}>
              {/* Ball kartochka USTIDA: kartochkaning ichiga qo'yilsa
                  narx bilan raqobatlashib, ikkalasi ham o'qilmasdi */}
              <View style={s.scoreRow}>
                <View style={[s.badge, { backgroundColor: b.bg }]}>
                  <Text style={[s.badgeText, { color: b.fg }]}>
                    {item.match.score}% · {b.text}
                  </Text>
                </View>
                <Text style={s.reasons} numberOfLines={1}>
                  {item.match.reasonKeys.map((k) => t(`mob.match.${k}`)).join(" · ")}
                </Text>
              </View>

              {forLoad ? (
                <TruckCard item={item} onPress={() => router.push(`/mashina/${item.id}`)} />
              ) : (
                <ListingCard item={item} onPress={() => router.push(`/yuk/${item.id}`)} />
              )}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  count: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: color.brandSoft,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  countText: { fontSize: 13, fontWeight: "700", color: color.brand },

  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, ...shadow.card },
  badgeText: { fontSize: 11.5, fontWeight: "800" },
  reasons: { flex: 1, fontSize: 11.5, color: color.mutedForeground },
}));
