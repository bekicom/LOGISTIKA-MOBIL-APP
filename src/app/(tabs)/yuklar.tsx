/**
 * C1 — yuklar ro'yxati.
 *
 * Ma'lumot `/api/loads/list` dan, u web'dagi `/loads` sahifasi bilan
 * BITTA kodni (`lib/feed.ts`) ishlatadi — natija bir xil bo'lishi kerak.
 */
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { ListingCard, type Listing } from "@/components/cards";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { FiltrSheet, type Filtr, EMPTY_FILTR, filtrToQuery, filtrChips } from "@/components/FiltrSheet";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";

type Feed = { items: Listing[]; page: number; total: number; hasMore: boolean };

export default function Yuklar() {
  const [filtr, setFiltr] = useState<Filtr>(EMPTY_FILTR);
  const [sheet, setSheet] = useState(false);
  const insets = useSafeAreaInsets();

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
        <View style={s.headTop}>
          <Text style={s.title}>Yuklar</Text>
          {data ? (
            <Text style={s.count}>
              <Text style={{ fontWeight: "700", color: color.foreground }}>{data.total}</Text> ta e&apos;lon
            </Text>
          ) : null}
        </View>

        <Pressable style={s.search} onPress={() => setSheet(true)}>
          <Icon name="search" size={19} />
          <Text style={[s.searchText, !filtr.fromName && s.searchPlaceholder]}>
            {filtr.fromName ?? "Qayerdan"}
          </Text>
          <Icon name="arrow-right" size={16} stroke="#94a3b8" />
          <Text style={[s.searchText, !filtr.toName && s.searchPlaceholder]}>
            {filtr.toName ?? "Qayerga"}
          </Text>
        </Pressable>

        {/* Filtr chiplari */}
        <View style={s.chipRow}>
          <Pressable style={s.filterBtn} onPress={() => setSheet(true)}>
            <Icon name="filter" size={15} stroke="#fff" />
            <Text style={s.filterText}>Filtrlar</Text>
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
        renderItem={({ item }) => <ListingCard item={item} />}
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
              title="Bu shartlarga mos yuk yo'q"
              text="Filtrlarni kengaytirib ko'ring — masalan transport turini olib tashlang."
              actionLabel="Filtrlarni tozalash"
              onAction={() => setFiltr(EMPTY_FILTR)}
            />
          ) : (
            <Empty title="Hozircha e'lon yo'q" text="Yangi yuklar paydo bo'lishi bilan shu yerda ko'rinadi." />
          )
        }
      />

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
  headTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
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
});
