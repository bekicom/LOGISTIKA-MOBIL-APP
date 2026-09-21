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
 *
 * TZ-03 (2026-09-19): «Mening qidiruvlarim» yorliqlari va doimiy
 * «Qidiruvni saqlash» — yuklar lentasi bilan bir xil (`QidiruvYorliqlari`).
 */
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { HeaderIcons } from "@/components/TabHeader";
import { TruckCard, type TruckItem } from "@/components/cards";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { FiltrSheet, type Filtr, EMPTY_FILTR, filtrToQuery, filtrChips, JoylarYozuvi, YonalishAlmashtir } from "@/components/FiltrSheet";
import { SaveSearch } from "@/components/SaveSearch";
import { QidiruvYorliqlari, useQidiruvYorliqlari } from "@/components/QidiruvYorliqlari";
import { filtrdanParams, paramsKaliti } from "@/lib/saqlangan-qidiruv";
import { Segment } from "@/components/Segment";
import { useApi } from "@/lib/use-api";
import { tgSorov, useTgLenta } from "@/lib/tg-lenta";
import { TgToggle } from "@/components/TgToggle";
import { color, font, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Feed = { items: TruckItem[]; page: number; total: number; hasMore: boolean };

export default function Mashinalar() {
  const { qidiruv } = useLocalSearchParams<{ qidiruv?: string }>();
  const [filtr, setFiltr] = useState<Filtr>(EMPTY_FILTR);
  const [sheet, setSheet] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ss = useQidiruvYorliqlari("truck", filtr, setFiltr, qidiruv);

  /* Ilova filtriga sig'magan saqlangan qidiruv — xom so'rov bilan */
  /* Yuklar bilan BITTA holat — `lib/tg-lenta.ts` */
  const [tg] = useTgLenta();
  const query = useMemo(
    () => tgSorov(ss.xom ? ss.xom.query : filtrToQuery(filtr), tg),
    [ss.xom, filtr, tg],
  );
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
          {ss.xom || !(filtr.from.length || filtr.to.length) ? (
            <Text style={[s.searchText, !ss.xom && s.searchPlaceholder]} numberOfLines={1}>
              {ss.xom ? ss.xom.nomi : t("mob.loads.cityPh")}
            </Text>
          ) : (
            <>
              {/* «Toshkent +2 → —» — «+N» qisqarib ketmaydi (`JoylarYozuvi`) */}
              <JoylarYozuvi joylar={filtr.from} bosh="—" matnStyle={s.searchJoy} />
              <YonalishAlmashtir bor tone="blue" onPress={() => setFiltr((f) => ({ ...f, from: f.to, to: f.from }))} />
              <JoylarYozuvi joylar={filtr.to} bosh="—" matnStyle={s.searchJoy} />
            </>
          )}
        </Pressable>

        {/* O'z saqlagan qidiruvlari — bir bosishda (TZ-03) */}
        <QidiruvYorliqlari rows={ss.rows} jami={ss.jami} faolId={ss.faolId} onQoll={ss.qoll} />

        {/* Filtr chiplari va sanoq */}
        <View style={s.chipRow}>
          <Pressable style={s.filtrBtn} onPress={() => setSheet(true)}>
            <Icon name="filter" size={15} stroke={color.card} />
            <Text style={s.filtrText}>{t("mob.loads.filters")}</Text>
            {chips.length ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{chips.length}</Text>
              </View>
            ) : null}
          </Pressable>
          <TgToggle />
          {chips.map((c) => (
            <Pressable key={c.key} style={s.chip} onPress={() => clearOne(c.key as keyof Filtr)}>
              <Text style={s.chipText}>{c.label}</Text>
              <Icon name="close" size={13} stroke={color.brandText} />
            </Pressable>
          ))}
          {ss.xom ? (
            <Pressable style={s.chip} onPress={ss.tozala}>
              <Text style={s.chipText} numberOfLines={1}>
                {ss.xom.nomi}
              </Text>
              <Icon name="close" size={13} stroke={color.brandText} />
            </Pressable>
          ) : null}
          {data && chips.length === 0 && !ss.xom ? (
            <Text style={s.count}>
              <Text style={s.countNum}>{data.total}</Text> {t("mob.trucks.count")}
            </Text>
          ) : null}
        </View>

        {/* Doim turadi, bo'sh filtrda o'chiq — sababi `SaveSearch` izohida */}
        <SaveSearch
          key={paramsKaliti(filtrdanParams(filtr))}
          kind="truck"
          filtr={filtr}
          saqlangan={!!ss.faolId}
          onSaved={ss.reload}
        />
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
            /* Filtr bo'lsa — kengaytirish maslahati va tozalash. Ilgari bu
               yerda yuklar matni turardi: «Под эти условия грузов нет» */
            <Empty
              icon="truck"
              title={t("mob.trucks.notFound")}
              {...(chips.length || filtr.from.length || filtr.to.length || ss.xom
                ? {
                    text: t("mob.misc.widenFilters"),
                    actionLabel: t("mob.misc.clearFilters"),
                    onAction: () => {
                      ss.tozala();
                      setFiltr(EMPTY_FILTR);
                    },
                  }
                : {})}
            />
          }
          renderItem={({ item, index }) => (
            <TruckCard item={item} index={index} onPress={() => router.push(`/mashina/${item.id}`)} />
          )}
        />
      )}

      <FiltrSheet
        kind="truck"
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
  /* `JoylarYozuvi` uchun — `flex` siz (sababi o'sha komponent izohida) */
  searchJoy: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  searchPlaceholder: { fontWeight: "500", color: color.faintText },

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
  /* Fon `color.foreground` — yozuv mavzu bilan (2026-09-20):
     qattiq "#fff" qorong'i rejimda ko'rinmasdi */
  filtrText: { fontSize: font.caption, fontWeight: "600", color: color.card },
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
