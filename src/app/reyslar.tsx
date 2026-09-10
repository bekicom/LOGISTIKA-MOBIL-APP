/**
 * E1 — mening reyslarim. Uch bo'lim: faol, kutilmoqda, yakunlangan.
 *
 * Dizayn-2: bu ekran endi tab emas, menyudan ochiladi — orqaga
 * tugmasi bor. Sarlavha chegarasiz, bo'limlar pill (faol yarmi ko'k,
 * sanoq bilan).
 */
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { HeaderIcons } from "@/components/TabHeader";
import { TripCard, type TripItem } from "@/components/cards";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/* FUNKSIYA, o'zgarmas emas: modul yuklanganda til hali
   o'qilmagan bo'ladi va matn o'zbekchada qotib qolardi. */
function tabs() {
  return [
    { key: "active", label: t("mob.trips.active") },
    { key: "upcoming", label: t("mob.trips.upcoming") },
    { key: "done", label: t("mob.trips.done") },
  ] as const;
}

function empty(): Record<string, { title: string; text: string }> {
  return {
    active: { title: t("mob.trips.empty"), text: t("mob.ui.noTripMine") },
    upcoming: { title: t("mob.misc.noUpcoming"), text: t("mob.misc.noUpcomingText") },
    done: { title: t("mob.misc.noDone"), text: t("mob.misc.noDoneText") },
  };
}

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
        <View style={s.headRow}>
          {/* Tarix bo'lmasa (push/deep link) bosh sahifaga */}
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/bosh"))}
            hitSlop={8}
            accessibilityRole="button"
            style={s.back}
          >
            <Icon name="back" size={22} stroke={color.foreground} />
          </Pressable>
          <Text style={s.title}>{t("mob.trips.title")}</Text>
          <View style={{ flex: 1 }} />
          <HeaderIcons />
        </View>

        <View style={s.segment}>
          {tabs().map((tb) => {
            const on = tab === tb.key;
            return (
              <Pressable
                key={tb.key}
                onPress={() => setTab(tb.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[s.segItem, on && s.segOn]}
              >
                <Text style={[s.segText, on && s.segTextOn]} numberOfLines={1}>
                  {tb.label}
                </Text>
                {on && data ? (
                  <View style={s.segBadge}>
                    <Text style={s.segBadgeText}>{data.total}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <TripCard item={item} onPress={() => router.push(`/reys/${item.id}`)} />}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <Skeleton rows={2} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <Empty icon="route" title={empty()[tab].title} text={empty()[tab].text} />
          )
        }
      />
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  head: { paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: space.sm, gap: space.md },
  headRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  back: { width: 40, height: 40, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: color.foreground, letterSpacing: -0.5 },

  segment: {
    flexDirection: "row",
    gap: 3,
    backgroundColor: color.card,
    borderRadius: radius.pill,
    padding: 4,
    ...shadow.card,
  },
  segItem: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  segOn: { backgroundColor: color.blue },
  segText: { fontSize: 13.5, fontWeight: "700", color: color.mutedForeground },
  segTextOn: { color: "#ffffff" },
  segBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#ffffff33",
    alignItems: "center",
    justifyContent: "center",
  },
  segBadgeText: { fontSize: 11, fontWeight: "800", color: "#ffffff" },

  list: { padding: space.lg, paddingTop: space.sm, gap: space.md },
}));
