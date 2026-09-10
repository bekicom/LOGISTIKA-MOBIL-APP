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
 *
 * Dizayn-2: yuklar ekrani bilan bir xil qobiq — chegarasiz sarlavha,
 * oq qidiruv kartasi, o'ngda chat/qo'ng'iroq. «Mashina joylash»
 * suzuvchi tugmasi olib tashlandi — tab bardagi «+» shu ishni qiladi.
 */
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { HeaderIcons } from "@/components/TabHeader";
import { TruckCard, type TruckItem } from "@/components/cards";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { FiltrSheet, type Filtr, EMPTY_FILTR, filtrToQuery, filtrChips } from "@/components/FiltrSheet";
import { SaveSearch } from "@/components/SaveSearch";
import { Segment } from "@/components/Segment";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space, themed } from "@/lib/theme";
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
        <View style={s.headRow}>
          <View style={{ flex: 1 }}>
            <Segment
              value="trucks"
              onChange={(v) => v === "loads" && router.replace("/yuklar")}
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
            <Icon name="search" size={19} stroke={color.blue} />
          </View>
          <Text style={[s.searchText, !(filtr.fromName || filtr.toName) && s.searchPlaceholder]} numberOfLines={1}>
            {filtr.fromName || filtr.toName
              ? `${filtr.fromName || "—"} → ${filtr.toName || "—"}`
              : t("mob.loads.cityPh")}
          </Text>
        </Pressable>

        {/* Filtr chiplari va sanoq */}
        <View style={s.chipRow}>
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
              <Icon name="close" size={13} stroke={color.brandText} />
            </Pressable>
          ))}
          {data && chips.length === 0 ? (
            <Text style={s.count}>
              <Text style={s.countNum}>{data.total}</Text> {t("mob.trucks.count")}
            </Text>
          ) : null}
        </View>

        {/* Yuklar ekranidagi bilan bir xil shart — sababi
            `(tabs)/yuklar.tsx` da */}
        {filtr.fromId || filtr.toId || filtr.vehicleTypeIds.length ? (
          <View style={{ marginTop: 10 }}>
            <SaveSearch kind="truck" filtr={filtr} />
          </View>
        ) : null}
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
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xxl * 2 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
          }
          showsVerticalScrollIndicator={false}
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

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  head: { paddingHorizontal: space.lg, paddingTop: 6, paddingBottom: space.sm, gap: space.md },
  headRow: { flexDirection: "row", alignItems: "center", gap: space.md },

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
  searchIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: color.blueSoft, alignItems: "center", justifyContent: "center" },
  searchText: { flex: 1, fontSize: font.body, fontWeight: "700", color: color.foreground },
  searchPlaceholder: { fontWeight: "500", color: "#94a3b8" },

  chipRow: { flexDirection: "row", gap: 7, alignItems: "center", flexWrap: "wrap" },
  filtrBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
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
    borderRadius: radius.pill,
    backgroundColor: color.brandSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  chipText: { fontSize: font.caption, fontWeight: "600", color: color.brandText },
  count: { fontSize: font.caption, color: color.mutedForeground, marginLeft: 4 },
  countNum: { fontWeight: "700", color: color.foreground },

  list: { padding: space.lg, paddingTop: space.sm, gap: space.md },
}));
