/**
 * Yo'lovchi yo'nalishlari — hamma davlat (TZ 28-okt 51). Webdagi
 * `/rides/yonalishlar` bilan bitta funksiya (`GET /api/rides/yolovchilar?yonalishlar=1`).
 */
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Yonalish = { slug: string; from: string; to: string; juft: string; safar: number; sorov: number };

export default function YolovchiYonalishlar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<{ items: Yonalish[] }>(
    "/api/rides/yolovchilar?yonalishlar=1",
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/yolovchi" as never))} hitSlop={8} style={s.back} accessibilityRole="button">
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          {t("yolovchi.yonalishlarSarlavha")}
        </Text>
      </View>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(r) => r.slug}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        renderItem={({ item: r }) => (
          <Pressable
            onPress={() => router.push(`/yolovchi-yonalish?slug=${encodeURIComponent(r.slug)}` as never)}
            accessibilityRole="button"
            style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
          >
            <Text style={s.yol}>
              {r.from} → {r.to}
            </Text>
            <Text style={s.meta}>
              {r.juft} · {t("yolovchi.safarSoni", { n: r.safar })} · {t("yolovchi.sorovSoni", { n: r.sorov })}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? <Skeleton rows={4} /> : error ? <ErrorBox message={error} onRetry={reload} /> : <Empty icon="route" title={t("yolovchi.bosh")} />
        }
      />
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  head: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: space.sm },
  back: { width: 40, height: 40, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: color.foreground, flexShrink: 1 },
  list: { padding: space.lg, gap: space.md },
  card: { padding: 14, gap: 4, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  yol: { fontSize: 16, fontWeight: "800", color: color.foreground },
  meta: { fontSize: 13, color: color.mutedForeground },
}));
