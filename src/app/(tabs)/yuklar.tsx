/**
 * C1 — yuklar ro'yxati.
 *
 * Ma'lumot `/api/loads/list` dan, u web'dagi `/loads` sahifasi bilan
 * BITTA kodni (`lib/feed.ts`) ishlatadi — natija bir xil bo'lishi kerak.
 */
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Segment } from "@/components/Segment";
import { ListingCard, type Listing } from "@/components/cards";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { FiltrSheet, type Filtr, EMPTY_FILTR, filtrToQuery, filtrChips } from "@/components/FiltrSheet";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";
import { guestBlocked } from "@/lib/guest-gate";

type Feed = { items: Listing[]; page: number; total: number; hasMore: boolean };

export default function Yuklar() {
  const [filtr, setFiltr] = useState<Filtr>(EMPTY_FILTR);
  const [sheet, setSheet] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const query = useMemo(() => filtrToQuery(filtr), [filtr]);
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    `/api/loads/list?${query}`,
    [query],
  );

  const chips = filtrChips(filtr);
  const clearOne = useCallback(
    (key: keyof Filtr) => setFiltr((f) => ({ ...f, [key]: EMPTY_FILTR[key] })),
    [],
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Sarlavha va qidiruv */}
      <View style={s.head}>
        {/* Yuklar va mashinalar — lentaning ikki yarmi. Mashinalar
            uchun yettinchi tab qo'shib bo'lmaydi, menyuga yashirsak
            esa bo'limni hech kim topmasdi. */}
        <Segment
          value="loads"
          onChange={(v) => v === "trucks" && router.push("/mashinalar")}
          options={[
            { key: "loads", label: t("mob.loads.title") },
            { key: "trucks", label: t("mob.trucks.title") },
          ]}
        />

        {data ? (
          <Text style={s.count}>
            <Text style={{ fontWeight: "700", color: color.foreground }}>{data.total}</Text>{" "}
            {t("mob.loads.count", { n: data?.total ?? 0 })}
          </Text>
        ) : null}

        <Pressable style={s.search} onPress={() => setSheet(true)}>
          <Icon name="search" size={19} />
          <Text style={[s.searchText, !filtr.fromName && s.searchPlaceholder]}>
            {filtr.fromName ?? t("mob.loads.from")}
          </Text>
          <Icon name="arrow-right" size={16} stroke="#94a3b8" />
          <Text style={[s.searchText, !filtr.toName && s.searchPlaceholder]}>
            {filtr.toName ?? t("mob.loads.to")}
          </Text>
        </Pressable>

        {/* Filtr chiplari */}
        <View style={s.chipRow}>
          <Pressable style={s.filterBtn} onPress={() => setSheet(true)}>
            <Icon name="filter" size={15} stroke="#fff" />
            <Text style={s.filterText}>{t("mob.loads.filters")}</Text>
            {chips.length > 0 ? (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeText}>{chips.length}</Text>
              </View>
            ) : null}
          </Pressable>

          {chips.map((c) => (
            <Pressable key={c.key} style={s.activeChip} onPress={() => clearOne(c.key)}>
              <Text style={s.activeChipText}>{c.label}</Text>
              <Icon name="close" size={13} stroke="#c2490f" />
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <ListingCard item={item} onPress={() => router.push(`/yuk/${item.id}`)} />}
        contentContainerStyle={[s.list, { paddingBottom: space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <Skeleton />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : chips.length > 0 || filtr.fromId ? (
            <Empty
              title={t("mob.loads.emptyFiltered")}
              text={t("mob.misc.widenFilters")}
              actionLabel={t("mob.misc.clearFilters")}
              onAction={() => setFiltr(EMPTY_FILTR)}
            />
          ) : (
            <Empty title={t("mob.misc.noListings")} text={t("mob.misc.noListingsText")} />
          )
        }
      />

      <Pressable style={[s.fab, { bottom: insets.bottom + space.lg }]} onPress={() => {
          if (guestBlocked()) return;
          router.push("/yuk-joylash");
        }}>
        <Icon name="plus" size={20} stroke="#fff" />
        <Text style={s.fabText}>{t("mob.loads.post")}</Text>
      </Pressable>

      <FiltrSheet
        open={sheet}
        value={filtr}
        onClose={() => setSheet(false)}
        onApply={(f) => {
          setFiltr(f);
          setSheet(false);
        }}
        total={data?.total}
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
  count: { fontSize: 13, color: color.mutedForeground },

  search: {
    height: 52,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 11,
  },
  searchText: { flex: 1, fontSize: font.body, fontWeight: "600", color: color.foreground },
  searchPlaceholder: { fontWeight: "400", color: "#94a3b8" },

  chipRow: { flexDirection: "row", gap: 7, alignItems: "center", flexWrap: "wrap" },
  filterBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    backgroundColor: color.foreground,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filterText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  filterBadge: {
    minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9,
    backgroundColor: color.brand, alignItems: "center", justifyContent: "center",
  },
  filterBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },

  activeChip: {
    height: 34,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: radius.control,
    backgroundColor: "#f45a181a",
    borderWidth: 1,
    borderColor: "#f45a184d",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  activeChipText: { fontSize: 13, fontWeight: "500", color: "#c2490f" },

  list: { padding: space.lg, gap: space.md },
  fab: {
    position: "absolute", right: space.lg, height: 52, paddingHorizontal: 20, borderRadius: 26,
    backgroundColor: color.brand, flexDirection: "row", alignItems: "center", gap: 8,
    shadowColor: color.brand, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  fabText: { fontSize: font.body, fontWeight: "600", color: "#fff" },
});
