/**
 * U1 — Ustaxona: usta chaqirish, buyurtmalarim, ustalar.
 *
 * ── ASOSIY AMAL TESKARI ─────────────────────────────────────────
 *
 * Web'dagi `/service` — USTALAR KATALOGI: ro'yxat, filtr, qidiruv.
 * Telefonda vaziyat boshqacha: mashina yo'lda to'xtab qolgan va
 * haydovchi katalog varaqlamaydi. Shuning uchun ekran boshida
 * «Usta chaqirish» turadi — muammoni yozadi, ustalar o'zi taklif
 * beradi. Katalog pastda qoladi, izlab topish uchun.
 *
 * ── KUTILAYOTGAN ISH TEPADA ─────────────────────────────────────
 *
 * Taklif keldi, qo'shimcha ish so'raldi, ish tugadi — bularning
 * hammasi MENDAN javob kutadi. Server `todo` bilan aytadi, ekran
 * shu kartochkani ajratib ko'rsatadi.
 */
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { serviceSpecLabel, serviceStatusLabel, t } from "@/lib/i18n";

/** `furam/src/lib/service.ts:SPECIALITIES` bilan bir xil to'plam */
const SPECS = [
  "engine", "gearbox", "chassis", "electric", "diagnostic", "ac",
  "brakes", "steering", "electronics", "welder", "body", "tyre",
  "vulcan", "fuel", "trailer", "tractor",
] as const;

type Order = {
  id: string;
  orderNo: number;
  problem: string;
  status: string;
  price: number | null;
  currency: string | null;
  offers: number;
  todo: "extra" | "choose" | "accept" | null;
  soonest: { arrivalMin: number | null; price: number; currency: string } | null;
  master: string | null;
};

type Master = {
  id: string;
  kind: string;
  name: string;
  specialities: string[];
  mobile: boolean;
  radiusKm: number | null;
  location: string | null;
  address: string | null;
  workHours: string | null;
  priceNote: string | null;
  verified: boolean;
  done: number;
};

const TONE: Record<string, string> = {
  NEW: color.mutedForeground,
  SEARCHING: color.mutedForeground,
  OFFERED: color.warning,
  ASSIGNED: color.warning,
  IN_WORK: color.warning,
  EXTRA_NEEDED: color.danger,
  DONE: color.success,
  CANCELLED: color.mutedForeground,
};

export default function Ustaxona() {
  const [spec, setSpec] = useState<string | null>(null);
  const [mobileOnly, setMobileOnly] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const query = `${spec ? `spec=${spec}&` : ""}${mobileOnly ? "mobile=1" : ""}`;
  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    canBeMaster: boolean;
    isMaster: boolean;
    masterApproved: boolean;
    orders: Order[];
    masters: Master[];
  }>(`/api/service?${query}`, [query]);

  const orders = data?.orders ?? [];
  const masters = data?.masters ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={{ flexGrow: 1 }}>
          <Text style={s.title}>{t("mob.svc.title")}</Text>
          <Text style={s.sub}>{t("mob.svc.subtitle")}</Text>
        </View>
      </View>

      {/* Ustalar katalogi cheksiz: server 60 tagacha qaytaradi va
          filtr o'zgarganda ro'yxat butunlay almashadi. Yuqoridagi
          bo'laklar sarlavhaga o'tdi — ular ro'yxat bilan birga
          suriladi, avvalgidek. */}
      <FlatList
        data={loading && !data ? [] : masters}
        keyExtractor={(m) => m.id}
        renderItem={({ item: m }) => <MasterCard m={m} />}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xxl }]}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.head2}>
              {/* ══ USTA CHAQIRISH — birinchi narsa ══ */}
              <View style={s.callBox}>
                <View style={s.callHead}>
                  <View style={s.callIcon}>
                    <Icon name="alert" size={21} stroke={color.brand} />
                  </View>
                  <View style={{ flexGrow: 1 }}>
                    <Text style={s.callTitle}>{t("mob.svc.callTitle")}</Text>
                    <Text style={s.callSub}>{t("mob.svc.callSub")}</Text>
                  </View>
                </View>

                <Pressable style={s.callBtn} onPress={() => router.push("/usta-chaqirish")}>
                  <Text style={s.callBtnText}>{t("mob.svc.newOrder")}</Text>
                </Pressable>

                <View style={s.callNote}>
                  <Icon name="border" size={15} stroke="#94a3b8" />
                  <Text style={s.callNoteText}>{t("mob.svc.mobileNote")}</Text>
                </View>
              </View>
            {loading && !data ? (
              <Skeleton rows={2} />
            ) : error ? (
              <ErrorBox message={error} onRetry={reload} />
            ) : (
              <>
              {/* ══ BUYURTMALARIM ══ */}
              {orders.length > 0 && (
                <View>
                  <Text style={s.group}>{t("mob.svc.myOrders")}</Text>
                  <View style={{ gap: space.sm }}>
                    {orders.map((o) => (
                      <OrderCard
                        key={o.id}
                        o={o}
                        onPress={() => router.push(`/ustaxona/${o.id}`)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* ══ USTA PANELI — pullik tomon, lekin yashirilmaydi ══ */}
              <Pressable
                style={s.panel}
                onPress={() => router.push("/usta-panelim")}
              >
                <View style={s.panelIcon}>
                  <Icon name="user" size={19} stroke={color.mutedForeground} />
                </View>
                <View style={{ flexGrow: 1 }}>
                  <Text style={s.panelTitle}>{t("mob.svc.masterPanel")}</Text>
                  <Text style={s.panelSub}>
                    {data?.isMaster
                      ? data.masterApproved
                        ? t("mob.svc.masterOn")
                        : t("mob.svc.masterWait")
                      : t("mob.svc.masterOff")}
                  </Text>
                </View>
                <Icon name="chevron" size={18} stroke="#cbd5e1" />
              </Pressable>
              {/* ══ USTALAR KATALOGI ══ */}
              <View>
                <Text style={s.group}>{t("mob.svc.masters")}</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chips}
                >
                  <Pressable
                    style={[s.chip, !spec && !mobileOnly && s.chipOn]}
                    onPress={() => {
                      setSpec(null);
                      setMobileOnly(false);
                    }}
                  >
                    <Text style={[s.chipText, !spec && !mobileOnly && s.chipTextOn]}>
                      {t("mob.market.all")}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[s.chip, mobileOnly && s.chipOn]}
                    onPress={() => setMobileOnly((v) => !v)}
                  >
                    <Text style={[s.chipText, mobileOnly && s.chipTextOn]}>
                      {t("mob.svc.mobileOnly")}
                    </Text>
                  </Pressable>
                  {SPECS.map((k) => (
                    <Pressable
                      key={k}
                      style={[s.chip, spec === k && s.chipOn]}
                      onPress={() => setSpec(spec === k ? null : k)}
                    >
                      <Text style={[s.chipText, spec === k && s.chipTextOn]}>
                        {serviceSpecLabel(k)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                </View>
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          loading || error ? null : (
            <View style={s.empty}>
              <Text style={s.emptyText}>{t("mob.svc.noMasters")}</Text>
            </View>
          )
        }
      />
    </View>
  );
}

function OrderCard({ o, onPress }: { o: Order; onPress: () => void }) {
  const tone = TONE[o.status] ?? color.mutedForeground;
  const waiting = !!o.todo;

  return (
    <Pressable style={[s.card, waiting && s.cardWait]} onPress={onPress}>
      <View style={s.cardHead}>
        <View style={[s.tag, { backgroundColor: tone + "1a" }]}>
          <Text style={[s.tagText, { color: tone }]}>
            {o.todo === "choose"
              ? t("mob.svc.offersN", { n: o.offers })
              : serviceStatusLabel(o.status)}
          </Text>
        </View>
        <Text style={s.no}>#{o.orderNo}</Text>
      </View>

      <Text style={s.problem} numberOfLines={2}>
        {o.problem}
      </Text>

      {/* Eng tez keladigani — yo'lda qolganda birinchi savol shu */}
      {o.todo === "choose" && o.soonest ? (
        <View style={s.soon}>
          <Icon name="clock" size={16} stroke="#15803d" />
          <Text style={s.soonText}>
            {o.soonest.arrivalMin != null
              ? t("mob.svc.fastest", { time: mins(o.soonest.arrivalMin) })
              : t("mob.svc.offerCame")}
          </Text>
          <Text style={s.soonPrice}>{fmtNum(o.soonest.price)}</Text>
        </View>
      ) : o.master ? (
        <View style={s.masterRow}>
          <Text style={s.masterName} numberOfLines={1}>
            {o.master}
          </Text>
          {o.price != null && (
            <Text style={s.price}>
              {fmtNum(o.price)} {o.currency ?? ""}
            </Text>
          )}
        </View>
      ) : null}

      {waiting && (
        <View style={s.todo}>
          <Text style={s.todoText}>{t(`mob.svc.todo_${o.todo}`)}</Text>
        </View>
      )}
    </Pressable>
  );
}

function MasterCard({ m }: { m: Master }) {
  const where = [m.location, m.address, m.workHours].filter(Boolean).join(" · ");

  return (
    <View style={s.card}>
      <View style={s.masterTop}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(m.name)}</Text>
        </View>
        <View style={{ flexGrow: 1, minWidth: 0 }}>
          <View style={s.nameRow}>
            <Text style={s.mName} numberOfLines={1}>
              {m.name}
            </Text>
            {m.verified && <Icon name="check" size={14} stroke={color.success} />}
          </View>
          {where ? (
            <Text style={s.mWhere} numberOfLines={1}>
              {where}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={s.mChips}>
        {m.mobile && (
          <View style={[s.mChip, s.mChipMobile]}>
            <Text style={[s.mChipText, s.mChipMobileText]}>
              {m.radiusKm
                ? t("mob.svc.mobileKm", { n: m.radiusKm })
                : t("mob.svc.mobileOnly")}
            </Text>
          </View>
        )}
        {m.specialities.slice(0, 3).map((k) => (
          <View key={k} style={s.mChip}>
            <Text style={s.mChipText}>{serviceSpecLabel(k)}</Text>
          </View>
        ))}
      </View>

      {m.priceNote ? <Text style={s.priceNote}>{m.priceNote}</Text> : null}

      <View style={s.mFoot}>
        <Text style={s.mDone}>{t("mob.svc.doneN", { n: m.done })}</Text>
      </View>
    </View>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Daqiqa → «40 daq» yoki «2 soat» */
function mins(n: number): string {
  return n < 60 ? t("mob.svc.minN", { n }) : t("mob.svc.hourN", { n: Math.round(n / 60) });
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },

  head: {
    backgroundColor: color.card,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: font.titleLg, fontWeight: "700", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  scroll: { padding: space.lg, gap: space.lg },
  /* Ro'yxat konteynerida `gap` YO'Q — u sarlavhaga ham tegardi */
  list: { padding: space.lg },
  head2: { gap: space.lg, marginBottom: space.lg },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  callBox: { backgroundColor: color.navy, borderRadius: radius.card, padding: space.md },
  callHead: { flexDirection: "row", alignItems: "center", gap: 11 },
  callIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: color.brand + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  callTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  callSub: { fontSize: 12, color: "#f1f5f9b3", marginTop: 2 },
  callBtn: {
    height: 46,
    borderRadius: 11,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  callBtnText: { fontSize: 15, fontWeight: "600", color: color.brandForeground },
  callNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ffffff1a",
  },
  callNoteText: { flex: 1, fontSize: 12, color: "#f1f5f9b3", lineHeight: 17 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardWait: { borderWidth: 2, borderColor: color.brand },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  tag: { height: 21, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  tagText: { fontSize: 10, fontWeight: "700" },
  no: { marginLeft: "auto", fontSize: 11, color: "#94a3b8" },

  problem: { fontSize: 15, fontWeight: "600", color: color.foreground, marginTop: 10, lineHeight: 21 },

  soon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  soonText: { flex: 1, fontSize: 13, color: color.foreground },
  soonPrice: { fontSize: 13, fontWeight: "700", color: color.foreground },

  masterRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 10 },
  masterName: { flex: 1, fontSize: 12, color: color.mutedForeground },
  price: { fontSize: 14, fontWeight: "700", color: color.foreground },

  todo: {
    marginTop: 11,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: color.brand + "12",
  },
  todoText: { fontSize: 12, fontWeight: "600", color: "#9a3412" },

  panel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  panelIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  panelTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  panelSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  chips: { gap: 7, paddingBottom: space.sm },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: color.foreground, borderColor: color.foreground },
  chipText: { fontSize: 13, color: color.mutedForeground },
  chipTextOn: { color: color.card, fontWeight: "600" },

  masterTop: { flexDirection: "row", gap: 11 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 11,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mName: { flexShrink: 1, fontSize: 15, fontWeight: "600", color: color.foreground },
  mWhere: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  mChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 11 },
  mChip: { height: 26, paddingHorizontal: 10, borderRadius: 8, backgroundColor: color.muted, justifyContent: "center" },
  mChipText: { fontSize: 12, fontWeight: "500", color: color.mutedForeground },
  mChipMobile: { backgroundColor: color.brand + "1a" },
  mChipMobileText: { color: "#c2490f", fontWeight: "600" },

  priceNote: { fontSize: 12, color: color.mutedForeground, marginTop: 10, lineHeight: 18 },

  mFoot: { marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: color.border },
  mDone: { fontSize: 12, color: color.mutedForeground },

  empty: { padding: space.lg, alignItems: "center" },
  emptyText: { fontSize: 13, color: color.mutedForeground, textAlign: "center" },
});
