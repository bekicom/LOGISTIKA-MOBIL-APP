/**
 * J1 va J4 — chegara navbatlari.
 *
 * IKKI ROL, BITTA EKRAN. Haydovchida odatda BITTA navbat bo'ladi va
 * unga faqat SOAT kerak: 14:30, 3 soat qoldi. Transport egasida
 * o'nlab mashina bor va unga «qaysi biri e'tibor talab qiladi»
 * kerak — shuning uchun tepada uchta raqam va guruhlangan ro'yxat.
 *
 * Server allaqachon shunday ajratadi: `?role=driver` bo'lsa
 * `driverQueues()`, aks holda `ownerQueues()`.
 */
import { useMemo } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { t } from "@/lib/i18n";
import { color, font, radius, shadow, space } from "@/lib/theme";

type Queue = {
  id: string;
  status: string;
  border: string;
  borderMode: "REQUIRED" | "NOT_REQUIRED" | "CONDITIONAL";
  leadDays: number;
  plate: string;
  direction: string | null;
  slotAt: string | null;
  timeText: string | null;
  queueNo: string | null;
  neededBy: string | null;
  hasProof: boolean;
  tripNo: number | null;
  driver: string | null;
};
type Feed = { items: Queue[]; counts: { needed: number; today: number; booked: number } };

/** Navbat olinishi kutilayotgan holatlar */
const NEEDS_ACTION = ["NEEDED", "DETECTING"];
/** Navbat olingan va yo'lda */
const BOOKED = ["BOOKED", "SOON", "EN_ROUTE"];

/** Bugun o'tadimi — kun boshiga qarab, soatga emas */
function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

/** «3 soat 12 daqiqa qoldi» yoki «2 kun qoldi» */
function countdown(iso: string | null): { text: string; urgent: boolean } | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return { text: t("mob.queue.overdue"), urgent: true };
  const min = Math.floor(ms / 60000);
  if (min < 60 * 24) {
    return {
      text: t("mob.queue.leftHM", { h: Math.floor(min / 60), m: min % 60 }),
      urgent: min < 60 * 6,
    };
  }
  return { text: t("mob.queue.leftDays", { n: Math.ceil(min / 60 / 24) }), urgent: false };
}

export default function Navbatlar() {
  const { user } = useAuth();
  const router = useRouter();

  /* Rolni ILOVA emas, foydalanuvchi belgilaydi. Haydovchi bo'lsa
     o'ziga biriktirilganini ko'radi — boshqa mashinalarnikini emas. */
  const isDriver = user?.role === "DRIVER";
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    `/api/queues${isDriver ? "?role=driver" : ""}`,
    [isDriver],
  );

  const items = data?.items ?? [];

  const groups = useMemo(() => {
    const need = items.filter((q) => NEEDS_ACTION.includes(q.status));
    const today = items.filter((q) => !NEEDS_ACTION.includes(q.status) && isToday(q.slotAt));
    const rest = items.filter(
      (q) => !NEEDS_ACTION.includes(q.status) && !isToday(q.slotAt) && BOOKED.includes(q.status),
    );
    return { need, today, rest };
  }, [items]);

  /* Ro'yxat guruhlarga bo'linadi, SARALANMAYDI: muddati o'tayotgani
     uzun ro'yxat ichida yo'qolib ketmasin. */
  const rows = useMemo(() => {
    const out: ({ kind: "head"; key: string; label: string } | { kind: "row"; key: string; q: Queue })[] = [];
    const push = (label: string, list: Queue[]) => {
      if (!list.length) return;
      out.push({ kind: "head", key: `h-${label}`, label });
      for (const q of list) out.push({ kind: "row", key: q.id, q });
    };
    push(t("mob.queue.needAction"), groups.need);
    push(t("mob.queue.todayPass"), groups.today);
    push(t("mob.queue.bookedGroup"), groups.rest);
    return out;
  }, [groups]);

  return (
    <View style={s.root}>
      <Header
        title={t("mob.queue.title")}
        subtitle={
          items.length
            ? isDriver
              ? t("mob.queue.countLine", { n: items.length })
              : t("mob.queue.parkLine", { n: new Set(items.map((q) => q.plate)).size })
            : undefined
        }
      />

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
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
          }
          ListHeaderComponent={
            /* Egasida tepada uchta raqam — u ro'yxatni o'qimasdan
               oldin «nima bo'layapti» ni bilishi kerak. */
            !isDriver && data ? (
              <View style={s.tiles}>
                <Tile n={data.counts.needed} label={t("mob.queue.tileNeeded")} tone={color.danger} />
                <Tile n={data.counts.today} label={t("mob.queue.tileToday")} tone={color.brand} />
                <Tile n={data.counts.booked} label={t("mob.queue.tileBooked")} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Empty icon="border" title={t("mob.queue.empty")} text={t("mob.queue.emptyText")} />
          }
          renderItem={({ item }) =>
            item.kind === "head" ? (
              <Text style={s.group}>{item.label}</Text>
            ) : (
              <QueueCard q={item.q} onPress={() => router.push(`/navbat/${item.q.id}`)} />
            )
          }
        />
      )}
    </View>
  );
}

function Tile({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return (
    <View style={[s.tile, tone && n > 0 && { borderColor: tone + "59" }]}>
      <Text style={[s.tileN, tone && n > 0 && { color: tone }]}>{n}</Text>
      <Text style={s.tileL}>{label}</Text>
    </View>
  );
}

function QueueCard({ q, onPress }: { q: Queue; onPress: () => void }) {
  const needs = NEEDS_ACTION.includes(q.status);
  const detecting = q.status === "DETECTING";
  const left = countdown(q.slotAt);
  const deadline = q.neededBy ? countdown(q.neededBy) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        needs && !detecting && { borderColor: color.danger + "59" },
        left?.urgent && !needs && { borderColor: color.brand + "66", borderWidth: 1.5 },
        pressed && { backgroundColor: "#fafbfc" },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={[s.border, detecting && { color: "#475569" }]}>{q.border}</Text>
          <Text style={s.meta}>
            {[q.plate, q.tripNo ? `FURAM #${q.tripNo}` : t("mob.queue.noVehicle")].join(" · ")}
          </Text>
        </View>
        <Text
          style={[
            s.chip,
            detecting
              ? { color: color.mutedForeground, backgroundColor: color.muted }
              : needs
                ? { color: color.danger, backgroundColor: color.danger + "1f" }
                : isToday(q.slotAt)
                  ? { color: color.brand, backgroundColor: color.brand + "24" }
                  : { color: color.info, backgroundColor: color.info + "1f" },
          ]}
        >
          {detecting
            ? t("mob.queue.detecting")
            : needs
              ? t("mob.queue.needBadge")
              : isToday(q.slotAt)
                ? t("mob.queue.today")
                : t("mob.queue.onWay")}
        </Text>
      </View>

      {/* Navbat olingan: SOAT eng katta element */}
      {!needs && q.timeText ? (
        <>
          <View style={s.timeRow}>
            <Text style={s.time}>{q.timeText}</Text>
            {left ? (
              <Text style={[s.left, left.urgent && { color: color.brand }]}>{left.text}</Text>
            ) : null}
          </View>
          <View style={s.foot}>
            {q.queueNo ? (
              <View>
                <Text style={s.footK}>{t("mob.queue.queueNo")}</Text>
                <Text style={s.footV}>{q.queueNo}</Text>
              </View>
            ) : null}
            {q.direction ? (
              <View>
                <Text style={s.footK}>{t("mob.queue.direction")}</Text>
                <Text style={s.footV}>{q.direction}</Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            {q.hasProof ? <Icon name="check" size={17} stroke={color.success} /> : null}
          </View>
        </>
      ) : null}

      {/* Navbat kerak: MUDDAT ko'rsatiladi, sana emas */}
      {needs && !detecting ? (
        <View style={s.warn}>
          <Icon name="clock" size={17} stroke={color.danger} />
          <View style={{ flex: 1 }}>
            {deadline ? <Text style={s.warnT}>{deadline.text}</Text> : null}
            <Text style={s.warnB}>{t("mob.queue.needByHint", { n: q.leadDays })}</Text>
          </View>
        </View>
      ) : null}

      {detecting ? <Text style={s.cond}>{t("mob.queue.condHint")}</Text> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },

  tiles: { flexDirection: "row", gap: 8, marginBottom: space.xs },
  tile: {
    flex: 1, backgroundColor: color.card, borderWidth: 1, borderColor: color.border,
    borderRadius: 12, padding: 13,
  },
  tileN: { fontSize: 24, fontWeight: "700", color: color.foreground, letterSpacing: -0.6 },
  tileL: { fontSize: 11, color: color.mutedForeground, marginTop: 2, lineHeight: 15 },

  group: {
    fontSize: 12, fontWeight: "600", color: color.mutedForeground,
    letterSpacing: 0.3, marginTop: space.sm, marginLeft: space.xs,
  },

  card: {
    backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1,
    borderColor: color.border, padding: 15, ...shadow.card,
  },
  border: { fontSize: 17, fontWeight: "700", color: color.foreground },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 3 },
  chip: {
    fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, overflow: "hidden",
  },

  timeRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 14 },
  time: { fontSize: 34, fontWeight: "700", color: color.foreground, letterSpacing: -1 },
  left: { fontSize: 15, fontWeight: "600", color: color.mutedForeground },

  foot: {
    flexDirection: "row", alignItems: "center", gap: 18,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.border,
  },
  footK: { fontSize: 11, color: color.mutedForeground },
  footV: { fontSize: 15, fontWeight: "700", color: color.foreground, marginTop: 2 },

  warn: {
    flexDirection: "row", gap: 10, marginTop: 12, padding: 12,
    borderRadius: radius.control, backgroundColor: color.danger + "0d",
  },
  warnT: { fontSize: font.caption, fontWeight: "600", color: "#b91c1c" },
  warnB: { fontSize: 12, color: "#b91c1c", marginTop: 3, lineHeight: 18 },

  cond: { fontSize: 12, color: color.mutedForeground, lineHeight: 18, marginTop: 10 },
});
