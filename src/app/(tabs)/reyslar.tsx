/** E1 — mening reyslarim. Uch bo'lim: faol, kutilmoqda, yakunlangan. */
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TripCard, type TripItem } from "@/components/cards";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

const TABS = [
  { key: "active", label: t("mob.trips.active") },
  { key: "upcoming", label: t("mob.trips.upcoming") },
  { key: "done", label: t("mob.trips.done") },
] as const;

const EMPTY: Record<string, { title: string; text: string }> = {
  active: { title: t("mob.trips.empty"), text: "Hozir yo'lda bo'lgan reysingiz yo'q." },
  upcoming: { title: t("mob.misc.noUpcoming"), text: t("mob.misc.noUpcomingText") },
  done: { title: t("mob.misc.noDone"), text: t("mob.misc.noDoneText") },
};

export default function Reyslar() {
  const [tab, setTab] = useState<string>("active");
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    items: TripItem[];
    total: number;
  }>(`/api/trips/list?tab=${tab}`, [tab]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Text style={s.title}>{t("mob.trips.title")}</Text>

        <View style={s.segment}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[s.segItem, tab === t.key && s.segOn]}>
              <Text style={[s.segText, tab === t.key && s.segTextOn]}>{t.label}</Text>
              {t.key === tab && data ? (
                <View style={s.segBadge}>
                  <Text style={s.segBadgeText}>{data.total}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <TripCard item={item} onPress={() => router.push(`/reys/${item.id}`)} />}
        contentContainerStyle={[s.list, { paddingBottom: space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <Skeleton rows={2} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <Empty icon="route" title={EMPTY[tab].title} text={EMPTY[tab].text} />
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: {
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingTop: 4,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    gap: space.md,
  },
  title: { fontSize: 22, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },

  segment: { flexDirection: "row", gap: 4, backgroundColor: color.muted, borderRadius: radius.control, padding: 3 },
  segItem: {
    flex: 1, height: 38, borderRadius: 6, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 6,
  },
  segOn: { backgroundColor: color.card },
  segText: { fontSize: 14, fontWeight: "500", color: color.mutedForeground },
  segTextOn: { fontWeight: "600", color: color.foreground },
  segBadge: {
    minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9,
    backgroundColor: color.brand, alignItems: "center", justifyContent: "center",
  },
  segBadgeText: { fontSize: 11, fontWeight: "600", color: "#fff" },

  list: { padding: space.lg, gap: space.md },
});
