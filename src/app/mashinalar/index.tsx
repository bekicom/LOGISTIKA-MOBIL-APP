/**
 * M1 — mashinalar ro'yxati.
 *
 * Yuklar bilan BITTA lentadan (`lib/feed.ts`) oziqlanadi, faqat
 * `/api/trucks/list` dan. Karta esa boshqacha: bosh raqam narx emas,
 * SIG'IM va surat kartaning yarmini egallaydi (`TruckCard` izohiga
 * qarang).
 *
 * Yuklar bilan almashish tepadagi ikkilik tugma orqali — mashina
 * bo'limini alohida ilova ichida ko'mib qo'ymaslik uchun.
 */
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { TruckCard, type TruckItem } from "@/components/cards";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { FiltrSheet, type Filtr, EMPTY_FILTR, filtrToQuery, filtrChips } from "@/components/FiltrSheet";
import { Segment } from "@/components/Segment";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Feed = { items: TruckItem[]; page: number; total: number; hasMore: boolean };

export default function Mashinalar() {
  const [filtr, setFiltr] = useState<Filtr>(EMPTY_FILTR);
  const [sheet, setSheet] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const query = useMemo(() => filtrToQuery(filtr), [filtr]);
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    `/api/trucks/list?${query}`,
    [query],
  );

  const chips = filtrChips(filtr);
  const clearOne = useCallback(
    (key: keyof Filtr) => setFiltr((f) => ({ ...f, [key]: EMPTY_FILTR[key] })),
    [],
  );

  const items = data?.items ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Segment
          value="trucks"
          onChange={(v) => v === "loads" && router.replace("/yuklar")}
          options={[
            { key: "loads", label: t("mob.loads.title") },
            { key: "trucks", label: t("mob.trucks.title") },
          ]}
        />

        <Pressable style={s.search} onPress={() => setSheet(true)}>
          <Icon name="search" size={19} stroke="#64748b" />
          <Text style={s.searchText} numberOfLines={1}>
            {filtr.fromName || filtr.toName
              ? `${filtr.fromName || "—"} → ${filtr.toName || "—"}`
              : t("mob.loads.cityPh")}
          </Text>
        </Pressable>
      </View>

      {/* Filtr chiplari */}
      <View style={s.chipBar}>
        <Pressable style={s.filtrBtn} onPress={() => setSheet(true)}>
          <Icon name="filter" size={15} stroke="#fff" />
          <Text style={s.filtrText}>{t("mob.loads.filters")}</Text>
          {chips.length ? (
            <View style={s.badge}>
              <Text style={s.badgeText}>{chips.length}</Text>
            </View>
          ) : null}
        </Pressable>
        {chips.map((c) => (
          <Pressable key={c.key} style={s.chip} onPress={() => clearOne(c.key as keyof Filtr)}>
            <Text style={s.chipText}>{c.label}</Text>
            <Icon name="close" size={13} stroke="#c2490f" />
          </Pressable>
        ))}
      </View>

      {loading && !items.length ? (
        <View style={{ padding: space.lg }}>
          <Skeleton rows={4} />
        </View>
      ) : error ? (
        <View style={{ padding: space.lg }}>
          <ErrorBox message={error} onRetry={reload} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
          }
          ListHeaderComponent={
            <View style={s.countRow}>
              <Text style={s.count}>
                <Text style={s.countNum}>{data?.total ?? 0}</Text>{" "}
                {t("mob.trucks.count")}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Empty
              icon="truck"
              title={t("mob.trucks.notFound")}
              text={t("mob.loads.emptyFiltered")}
            />
          }
          renderItem={({ item }) => (
            <TruckCard item={item} onPress={() => router.push(`/mashina/${item.id}`)} />
          )}
        />
      )}

      {/* E'lon berish */}
      <Pressable
        style={[s.fab, { bottom: insets.bottom + space.lg }]}
        onPress={() => router.push("/mashina-joylash")}
        accessibilityRole="button"
        accessibilityLabel={t("mob.trucks.post")}
      >
        <Icon name="plus" size={24} stroke="#fff" />
      </Pressable>

      <FiltrSheet
        open={sheet}
        value={filtr}
        onClose={() => setSheet(false)}
        onApply={(f) => {
          setFiltr(f);
          setSheet(false);
        }}
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
    gap: space.md,
  },
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

  chipBar: {
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    flexDirection: "row",
    gap: 7,
    flexWrap: "wrap",
  },
  filtrBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: color.foreground,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filtrText: { fontSize: font.caption, fontWeight: "600", color: "#fff" },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  chip: {
    height: 34,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 8,
    backgroundColor: color.brand + "1a",
    borderWidth: 1,
    borderColor: color.brand + "4d",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  chipText: { fontSize: font.caption, fontWeight: "500", color: "#c2490f" },

  list: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 4 },
  countRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  count: { fontSize: font.caption, color: color.mutedForeground },
  countNum: { fontWeight: "600", color: color.foreground },

  fab: {
    position: "absolute",
    right: space.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
