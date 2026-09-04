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
import { t } from "@/lib/i18n";

type DocAlert = { kind: string; title: string | null; state: "expired" | "soon"; days: number | null };
/**
 * Hujjat nomi — foydalanuvchi yozgani yoki tarjima.
 *
 * Server `title` (odam yozgan nom) va `kind` (kalit) ni ALOHIDA
 * yuboradi. Ilgari u tayyor satr yuborardi va u o'zbekcha edi:
 * rus tilidagi telefonda «Texko'rik 12 kun qoldi» chiqardi.
 */
function docName(d: { kind: string; title?: string | null }) {
  return d.title || t(`vehDocKind.${d.kind}`);
}
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

/* Yorliqlar FUNKSIYA ichida: modul yuklanganda til hali
   o'qilmagan bo'lishi mumkin, ular esa bir marta hisoblanardi. */
const TONE: Record<string, { fg: string; bg: string }> = {
  FREE: { fg: "#15803d", bg: "rgba(22,163,74,0.12)" },
  ON_TRIP: { fg: color.info, bg: "rgba(29,78,216,0.12)" },
  REPAIR: { fg: color.warning, bg: "rgba(180,83,9,0.12)" },
  INACTIVE: { fg: color.mutedForeground, bg: color.muted },
  DOC_ISSUE: { fg: color.danger, bg: "rgba(220,38,38,0.12)" },
  DOC_EXPIRED: { fg: color.danger, bg: "rgba(220,38,38,0.12)" },
  SOLD: { fg: color.mutedForeground, bg: color.muted },
};

const statusLabel = (k: string) =>
  ({
    FREE: t("mob.park.free"),
    ON_TRIP: t("mob.park.onTrip"),
    REPAIR: t("mob.park.repair"),
    INACTIVE: t("mob.park.inactive"),
    DOC_ISSUE: t("mob.park.docIssue"),
    DOC_EXPIRED: t("mob.park.docIssue"),
    SOLD: t("mob.park.sold"),
  })[k] ?? k;

const tabs = () => [
  { key: "", label: t("mob.common.all") },
  { key: "FREE", label: t("mob.park.free") },
  { key: "ON_TRIP", label: t("mob.park.onTrip") },
  { key: "REPAIR", label: t("mob.park.repair") },
];

export default function Parkim() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("");
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    `/api/fleet/vehicles${filter ? `?status=${filter}` : ""}`,
    [filter],
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
        title={t("mob.park.title")}
        subtitle={
          total
            ? [t("mob.park.count", { n: total }), onTrip ? t("mob.park.onTripCount", { n: onTrip }) : null]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        right={
          <Pressable
            onPress={() => router.push("/parkim/qoshish")}
            style={({ pressed }) => [s.add, pressed && { backgroundColor: color.brandHover }]}
          >
            <Icon name="plus" size={15} stroke="#fff" />
            <Text style={s.addText}>{t("mob.common.add")}</Text>
          </Pressable>
        }
      />

      {/* Saralash */}
      <View style={s.tabsWrap}>
        {tabs().map((tab) => {
          const n = tab.key ? (data?.counts?.[tab.key] ?? 0) : total;
          const on = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={({ pressed }) => [s.tab, on && s.tabOn, pressed && !on && { backgroundColor: color.muted }]}
            >
              <Text style={[s.tabText, on && s.tabTextOn]}>
                {tab.label}
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
            expired.length > 0 && !filter ? (
              <View style={s.warn}>
                <Icon name="alert" size={19} stroke={color.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={s.warnTitle}>
                    {expired.length === 1
                      ? t("mob.park.expiredOne", {
                          plate: expired[0].plate,
                          doc: expired[0].docAlert ? docName(expired[0].docAlert) : "",
                        })
                      : t("mob.park.expiredMany", { n: expired.length })}
                  </Text>
                  <Text style={s.warnBody}>{t("mob.park.expiredHint")}</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Empty
              icon="truck"
              title={filter ? t("mob.park.emptyTab") : t("mob.park.emptyTitle")}
              text={filter ? t("mob.park.emptyTabText") : t("mob.park.emptyText")}
              actionLabel={filter ? undefined : t("mob.park.addVehicle")}
              onAction={filter ? undefined : () => router.push("/parkim/qoshish")}
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
  const tone = TONE[item.status] ?? TONE.INACTIVE;
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
            <Text style={[s.chip, { color: tone.fg, backgroundColor: tone.bg }]}>
              {statusLabel(item.status)}
            </Text>
          </View>

          <View style={s.meta}>
            <Icon name="user" size={13} stroke={color.mutedForeground} />
            <Text style={s.metaText} numberOfLines={1}>
              {item.driver ?? t("mob.park.noDriver")}
            </Text>
            {item.odometer ? (
              <>
                <Text style={s.dot}>·</Text>
                <Text style={s.metaText}>{item.odometer.toLocaleString()} km</Text>
              </>
            ) : null}
          </View>

          {item.trailer ? (
            <Text style={s.trailer}>{t("mob.park.trailerLine", { plate: item.trailer.plate })}</Text>
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
            <Text style={s.footRight}>
              {t("mob.park.kmLeft", { n: item.trip.remainingKm.toLocaleString() })}
            </Text>
          ) : null}
        </View>
      ) : alert ? (
        <View style={s.foot}>
          <Icon name="doc" size={14} stroke={bad ? color.danger : color.warning} />
          <Text style={[s.footText, { color: bad ? color.danger : color.warning, fontWeight: "600" }]}>
            {docName(alert)}{" "}
            {alert.days == null
              ? ""
              : alert.days < 0
                ? t("mob.docs.expiredAgo", { n: -alert.days })
                : t("mob.docs.daysLeft", { n: alert.days })}
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
