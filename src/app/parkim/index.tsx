/**
 * D1 — Parkim.
 *
 * Mashina egasi bu ekranga qarab BITTA savolga javob izlaydi:
 * qaysi mashina bo'sh, qaysi biri muammoli. Shuning uchun holat
 * chipi o'ngda, hujjat muammosi esa kartochka TAGIDA alohida qator
 * bo'lib chiqadi — ro'yxatni ochmasdan ko'rinadi.
 *
 * Muddati tugagan hujjat eng tepada TAKRORLANADI: u pul yo'qotadigan
 * xato (chegarada to'xtatiladi), ro'yxat ichida ko'zdan qochmasin.
 */
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";

type DocAlert = { kind: string; label: string; state: "expired" | "soon"; days: number | null };
type Trip = {
  id: string;
  no: number;
  from: string;
  to: string;
  placeName: string | null;
  remainingKm: number | null;
};
type Vehicle = {
  id: string;
  no: number;
  plate: string;
  brand: string;
  model: string | null;
  status: string;
  type: string;
  capacityT: number | null;
  odometer: number | null;
  driver: string | null;
  trailer: { plate: string; no: number } | null;
  docAlert: DocAlert | null;
  trip: Trip | null;
};
type Feed = { items: Vehicle[]; counts: Record<string, number>; total: number };

const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  FREE: { label: "BO'SH", fg: "#15803d", bg: "rgba(22,163,74,0.12)" },
  ON_TRIP: { label: "REYSDA", fg: color.info, bg: "rgba(29,78,216,0.12)" },
  REPAIR: { label: "TA'MIRDA", fg: color.warning, bg: "rgba(180,83,9,0.12)" },
  INACTIVE: { label: "TO'XTATILGAN", fg: color.mutedForeground, bg: color.muted },
  DOC_ISSUE: { label: "HUJJAT", fg: color.danger, bg: "rgba(220,38,38,0.12)" },
  DOC_EXPIRED: { label: "HUJJAT", fg: color.danger, bg: "rgba(220,38,38,0.12)" },
  SOLD: { label: "SOTILGAN", fg: color.mutedForeground, bg: color.muted },
};

const TABS = [
  { key: "", label: "Hammasi" },
  { key: "FREE", label: "Bo'sh" },
  { key: "ON_TRIP", label: "Reysda" },
  { key: "REPAIR", label: "Ta'mirda" },
] as const;

export default function Parkim() {
  const router = useRouter();
  const [tab, setTab] = useState<string>("");
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    `/api/fleet/vehicles${tab ? `?status=${tab}` : ""}`,
    [tab],
  );

  const items = data?.items ?? [];

  /* Tugagan hujjatlar tepadagi ogohlantirish uchun. Ro'yxatda ham
     turadi — ataylab takror: bu xato qimmatga tushadi. */
  const expired = useMemo(
    () => items.filter((v) => v.docAlert?.state === "expired"),
    [items],
  );

  const total = data?.total ?? 0;
  const onTrip = data?.counts?.ON_TRIP ?? 0;

  return (
    <View style={s.root}>
      <Header
        title="Parkim"
        subtitle={total ? `${total} ta transport${onTrip ? ` · ${onTrip} tasi reysda` : ""}` : undefined}
        right={
          <Pressable
            onPress={() => router.push("/parkim/qoshish")}
            style={({ pressed }) => [s.add, pressed && { backgroundColor: color.brandHover }]}
          >
            <Icon name="plus" size={15} stroke="#fff" />
            <Text style={s.addText}>Qo&apos;shish</Text>
          </Pressable>
        }
      />

      {/* Saralash */}
      <View style={s.tabsWrap}>
        {TABS.map((t) => {
          const n = t.key ? (data?.counts?.[t.key] ?? 0) : total;
          const on = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={({ pressed }) => [s.tab, on && s.tabOn, pressed && !on && { backgroundColor: color.muted }]}
            >
              <Text style={[s.tabText, on && s.tabTextOn]}>
                {t.label}
                {data ? ` ${n}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
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
          keyExtractor={(v) => v.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
          }
          ListHeaderComponent={
            expired.length > 0 && !tab ? (
              <View style={s.warn}>
                <Icon name="alert" size={19} stroke={color.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={s.warnTitle}>
                    {expired.length === 1
                      ? `${expired[0].plate} — ${expired[0].docAlert?.label.toLowerCase()} muddati tugagan`
                      : `${expired.length} ta mashinada hujjat muddati tugagan`}
                  </Text>
                  <Text style={s.warnBody}>
                    Chegarada to&apos;xtatiladi. Yangilamaguncha e&apos;lonlarda ko&apos;rinmaydi.
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Empty
              icon="truck"
              title={tab ? "Bu holatda mashina yo'q" : "Parkingiz bo'sh"}
              text={
                tab
                  ? "Boshqa bo'limga qarang."
                  : "Mashina qo'shsangiz yuk e'lonlari unga moslab ko'rsatiladi."
              }
              actionLabel={tab ? undefined : "Transport qo'shish"}
              onAction={tab ? undefined : () => router.push("/parkim/qoshish")}
            />
          }
          renderItem={({ item }) => (
            <VehicleCard item={item} onPress={() => router.push(`/parkim/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

function VehicleCard({ item, onPress }: { item: Vehicle; onPress: () => void }) {
  const st = STATUS[item.status] ?? STATUS.INACTIVE;
  const alert = item.docAlert;
  const bad = alert?.state === "expired";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        bad && { borderColor: color.danger + "59" },
        pressed && { backgroundColor: "#fafbfc" },
      ]}
    >
      <View style={{ flexDirection: "row", gap: 13 }}>
        <View style={[s.thumb, item.status === "REPAIR" && { opacity: 0.55 }]}>
          <Icon name="truck" size={30} stroke="#475569" />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.plate}>{item.plate}</Text>
              <Text style={s.sub} numberOfLines={1}>
                {[item.brand, item.model].filter(Boolean).join(" ")} · {item.type}
                {item.capacityT ? ` ${item.capacityT}t` : ""}
              </Text>
            </View>
            <Text style={[s.chip, { color: st.fg, backgroundColor: st.bg }]}>{st.label}</Text>
          </View>

          <View style={s.meta}>
            <Icon name="user" size={13} stroke={color.mutedForeground} />
            <Text style={s.metaText} numberOfLines={1}>
              {item.driver ?? "Haydovchi biriktirilmagan"}
            </Text>
            {item.odometer ? (
              <>
                <Text style={s.dot}>·</Text>
                <Text style={s.metaText}>{item.odometer.toLocaleString("ru-RU")} km</Text>
              </>
            ) : null}
          </View>

          {item.trailer ? (
            <Text style={s.trailer}>+ tirkama {item.trailer.plate}</Text>
          ) : null}
        </View>
      </View>

      {/* Reysda bo'lsa qayerdaligi — asosiy savol shu */}
      {item.trip ? (
        <View style={s.foot}>
          <Icon name="route" size={14} stroke={color.info} />
          <Text style={s.footText} numberOfLines={1}>
            {item.trip.placeName ?? `${item.trip.from} → ${item.trip.to}`}
          </Text>
          {item.trip.remainingKm != null ? (
            <Text style={s.footRight}>{item.trip.remainingKm.toLocaleString("ru-RU")} km qoldi</Text>
          ) : null}
        </View>
      ) : alert ? (
        <View style={s.foot}>
          <Icon name="doc" size={14} stroke={bad ? color.danger : color.warning} />
          <Text style={[s.footText, { color: bad ? color.danger : color.warning, fontWeight: "600" }]}>
            {alert.label}{" "}
            {alert.days == null
              ? ""
              : alert.days < 0
                ? `${-alert.days} kun oldin tugagan`
                : `${alert.days} kunda tugaydi`}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },

  add: {
    height: 36, paddingHorizontal: 13, borderRadius: radius.control,
    backgroundColor: color.brand, flexDirection: "row", alignItems: "center", gap: 6,
  },
  addText: { fontSize: font.caption, fontWeight: "600", color: "#fff" },

  tabsWrap: {
    flexDirection: "row", gap: 8, paddingHorizontal: space.lg, paddingVertical: space.md,
    backgroundColor: color.card, borderBottomWidth: 1, borderBottomColor: color.border,
  },
  tab: {
    height: 34, paddingHorizontal: 14, borderRadius: radius.pill,
    borderWidth: 1, borderColor: color.border, backgroundColor: color.card,
    alignItems: "center", justifyContent: "center",
  },
  tabOn: { backgroundColor: color.navy, borderColor: color.navy },
  tabText: { fontSize: font.caption, fontWeight: "600", color: "#475569" },
  tabTextOn: { color: "#fff" },

  list: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },

  warn: {
    flexDirection: "row", gap: 11, padding: 13,
    borderWidth: 1, borderColor: color.danger + "59", backgroundColor: color.danger + "0d",
    borderRadius: radius.card, marginBottom: space.md,
  },
  warnTitle: { fontSize: font.caption, fontWeight: "700", color: "#b91c1c" },
  warnBody: { fontSize: 12, color: "#b91c1c", marginTop: 3, lineHeight: 18 },

  card: {
    backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1,
    borderColor: color.border, padding: 14, ...shadow.card,
  },
  thumb: {
    width: 62, height: 62, borderRadius: 10, backgroundColor: color.muted,
    alignItems: "center", justifyContent: "center",
  },
  plate: { fontSize: 17, fontWeight: "700", color: color.foreground, letterSpacing: 0.3 },
  sub: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },
  chip: {
    fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, overflow: "hidden",
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 9 },
  metaText: { fontSize: 12, color: color.mutedForeground, flexShrink: 1 },
  dot: { fontSize: 12, color: "#cbd5e1" },
  trailer: { fontSize: 12, color: color.mutedForeground, marginTop: 5 },

  foot: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: color.border,
  },
  footText: { flex: 1, fontSize: 12, color: color.foreground },
  footRight: { fontSize: 12, color: color.mutedForeground },
});
