/**
 * C1 — yuklar ro'yxati.
 *
 * Ma'lumot `/api/loads/list` dan, u web'dagi `/loads` sahifasi bilan
 * BITTA kodni (`lib/feed.ts`) ishlatadi — natija bir xil bo'lishi kerak.
 *
 * Dizayn-2: sarlavha chegarasiz, qidiruv — oq karta soya bilan,
 * «Yuk joylash» suzuvchi tugmasi OLIB TASHLANDI — endi tab bardagi
 * «+» shu ishni qiladi, ikkita bir xil tugma chalg'itardi.
 * `?filtr=1` bilan ochilsa (bosh sahifadagi qidiruv kartasi) filtr
 * varag'i o'zi ochiladi.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Segment } from "@/components/Segment";
import { HeaderIcons } from "@/components/TabHeader";
import { ListingCard, type Listing } from "@/components/cards";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { FiltrSheet, type Filtr, EMPTY_FILTR, filtrToQuery, filtrChips } from "@/components/FiltrSheet";
import { SaveSearch } from "@/components/SaveSearch";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Feed = { items: Listing[]; page: number; total: number; hasMore: boolean };

export default function Yuklar() {
  const { filtr: openParam } = useLocalSearchParams<{ filtr?: string }>();
  const [filtr, setFiltr] = useState<Filtr>(EMPTY_FILTR);
  const [sheet, setSheet] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  /* Bosh sahifadagi «Yuk qidirish» kartasi shu parametr bilan keladi */
  useEffect(() => {
    if (openParam === "1") setSheet(true);
  }, [openParam]);

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
        <View style={s.headRow}>
          {/* Yuklar va mashinalar — lentaning ikki yarmi. Mashinalar
              uchun alohida tab yo'q, menyuga yashirsak esa bo'limni
              hech kim topmasdi. */}
          <View style={{ flex: 1 }}>
            <Segment
              value="loads"
              onChange={(v) => v === "trucks" && router.push("/mashinalar")}
              options={[
                { key: "loads", label: t("mob.loads.title") },
                { key: "trucks", label: t("mob.trucks.title") },
              ]}
            />
          </View>
          <HeaderIcons />
        </View>

        <Pressable style={({ pressed }) => [s.search, pressed && { opacity: 0.85 }]} onPress={() => setSheet(true)}>
          <View style={s.searchIcon}>
            <Icon name="search" size={19} stroke={color.brand} />
          </View>
          <Text style={[s.searchText, !filtr.fromName && s.searchPlaceholder]} numberOfLines={1}>
            {filtr.fromName ?? t("mob.loads.from")}
          </Text>
          <Icon name="arrow-right" size={16} stroke={color.brand} />
          <Text style={[s.searchText, !filtr.toName && s.searchPlaceholder]} numberOfLines={1}>
            {filtr.toName ?? t("mob.loads.to")}
          </Text>
        </Pressable>

        {/* Filtr chiplari va sanoq */}
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

          {data && chips.length === 0 ? (
            <Text style={s.count}>
              <Text style={{ fontWeight: "700", color: color.foreground }}>{data.total}</Text>{" "}
              {t("mob.loads.count", { n: data?.total ?? 0 })}
            </Text>
          ) : null}
        </View>

        {/* «Qidiruvni saqlash» — FAQAT filtr qo'yilganda ko'rinadi.
            Bo'sh qidiruv har e'longa mos keladi va odam kuniga
            o'nlab xabar olardi; tugmani doim ko'rsatib, keyin
            «avval filtr tanlang» deyishdan ko'ra ko'rsatmaslik
            yaxshi. */}
        {filtr.fromId || filtr.toId || filtr.vehicleTypeIds.length ? (
          <View style={{ marginTop: 10 }}>
            <SaveSearch kind="load" filtr={filtr} />
          </View>
        ) : null}
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <ListingCard item={item} onPress={() => router.push(`/yuk/${item.id}`)} />}
        contentContainerStyle={[s.list, { paddingBottom: space.xxl * 2 }]}
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
    paddingHorizontal: space.lg,
    paddingTop: 6,
    paddingBottom: space.sm,
    gap: space.md,
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  count: { fontSize: 13, color: color.mutedForeground, marginLeft: 4 },

  search: {
    height: 56,
    backgroundColor: color.card,
    borderRadius: radius.card,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingRight: 14,
    gap: 10,
    ...shadow.card,
  },
  searchIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: color.brandSoft, alignItems: "center", justifyContent: "center" },
  searchText: { flex: 1, fontSize: font.body, fontWeight: "700", color: color.foreground },
  searchPlaceholder: { fontWeight: "500", color: "#94a3b8" },

  chipRow: { flexDirection: "row", gap: 7, alignItems: "center", flexWrap: "wrap" },
  filterBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
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
    borderRadius: radius.pill,
    backgroundColor: color.brandSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  activeChipText: { fontSize: 13, fontWeight: "600", color: "#c2490f" },

  list: { padding: space.lg, paddingTop: space.sm, gap: space.md },
});
