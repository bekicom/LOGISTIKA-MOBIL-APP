/**
 * Sh1 — shartnomalar ro'yxati.
 *
 * ── «SIZDAN KUTILMOQDA» ALOHIDA ─────────────────────────────────
 *
 * Sanaga qarab saralash odamning asosiy savolini yo'qotadi: qaysi
 * biri MENDAN qadam kutmoqda. Beshta shartnomani ochib-yopib
 * chiqish o'rniga ular tepada, alohida guruhda turadi.
 *
 * Ikki xil kutish bor va ular BOSHQA jumla bilan aytiladi:
 * versiyani tasdiqlash va ikkinchi tomon aytgan to'lovni
 * tasdiqlash — birinchisi shartnoma haqida, ikkinchisi pul haqida.
 *
 * ── TO'LOV HOLATI RO'YXATDA ─────────────────────────────────────
 *
 * «Pulim qayerda» degan savolga shartnomani ochmasdan javob
 * beriladi. Faqat IKKALA tomon tasdiqlagan to'lov hisoblanadi.
 */
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Item = {
  id: string;
  no: number;
  label: string;
  status: string;
  tripNo: number | null;
  load: { title: string; weightT: number | null } | null;
  party: { name: string | null; furamId: number } | null;
  myRole: string;
  version: { no: number; price: number; currency: string; paymentTerm: string } | null;
  approvals: { approved: number; total: number };
  pay: {
    confirmed: number;
    claimed: number;
    remaining: number;
    currency: string;
    status: string;
    mixedCurrency: boolean;
  } | null;
  needsMe: boolean;
  waiting: "approval" | "payment" | null;
};

/** `furam/src/lib/contract.ts:CONTRACT_STATUS_TONE` bilan bir xil */
const TONE: Record<string, string> = {
  DRAFT: color.mutedForeground,
  PENDING: color.warning,
  APPROVED: color.success,
  REJECTED: color.danger,
  CHANGE_PENDING: color.brand,
  TRIP_STARTED: color.brand,
  TRIP_DONE: color.success,
  CLOSED: color.mutedForeground,
  CANCELLED: color.danger,
};

/* Yopilgan va bekor qilingani «amaldagi» emas */
const DONE = ["CLOSED", "CANCELLED", "REJECTED"];

export default function Shartnomalar() {
  const insets = useSafeAreaInsets();

  const { data, loading, error, refreshing, refresh, reload } =
    useApi<{ items: Item[] }>("/api/contracts");

  const all = data?.items ?? [];
  const mine = all.filter((c) => c.needsMe);
  const live = all.filter((c) => !c.needsMe && !DONE.includes(c.status));
  const done = all.filter((c) => !c.needsMe && DONE.includes(c.status));

  return (
    <View style={s.root}>
      <Header
        title={t("mob.ctr.title")}
        subtitle={data ? t("mob.ctr.liveN", { n: all.length - done.length }) : undefined}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : all.length === 0 ? (
          <Empty icon="doc" title={t("mob.ctr.emptyTitle")} text={t("mob.ctr.emptyHint")} />
        ) : (
          <>
            {mine.length > 0 && (
              <Group title={t("mob.ctr.needsMe")} items={mine} hot />
            )}
            {live.length > 0 && <Group title={t("mob.ctr.live")} items={live} />}
            {done.length > 0 && <Group title={t("mob.ctr.done")} items={done} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Group({ title, items, hot }: { title: string; items: Item[]; hot?: boolean }) {
  return (
    <View>
      <Text style={s.group}>{title}</Text>
      <View style={{ gap: 9 }}>
        {items.map((c) => (
          <Card key={c.id} c={c} hot={hot} />
        ))}
      </View>
    </View>
  );
}

function Card({ c, hot }: { c: Item; hot?: boolean }) {
  const router = useRouter();
  const tone = TONE[c.status] ?? color.mutedForeground;
  const price = c.version?.price ?? 0;
  const paid = c.pay?.confirmed ?? 0;
  const pct = price > 0 ? Math.min(100, Math.round((paid / price) * 100)) : 0;

  return (
    <Pressable
      style={[s.card, hot && s.cardHot]}
      onPress={() => router.push({ pathname: "/shartnoma/[id]", params: { id: c.id } })}
    >
      <View style={s.head}>
        <View style={[s.tag, { backgroundColor: (hot ? color.brand : tone) + "1a" }]}>
          <Text style={[s.tagText, { color: hot ? color.brand : tone }]}>
            {/* Kutilayotgan ish holat nomidan muhimroq */}
            {c.waiting === "approval"
              ? t("mob.ctr.waitApproval")
              : c.waiting === "payment"
                ? t("mob.ctr.waitPayment")
                : t(`contractStatus.${c.status}`)}
          </Text>
        </View>
        <Text style={s.no}>{c.label}</Text>
      </View>

      <View style={s.partyRow}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(c.party?.name ?? "")}</Text>
        </View>
        <View style={{ flexGrow: 1, minWidth: 0 }}>
          <Text style={s.partyName} numberOfLines={1}>
            {c.party?.name ?? t("mob.ctr.unknownParty")}
          </Text>
          <Text style={s.partyMeta} numberOfLines={1}>
            {[
              /* Rolim emas, IKKINCHI tomonning roli — odam kim
                 bilan ishlayotganini biladi */
              t(`contractRole.${c.myRole === "CARRIER" ? "CARGO_OWNER" : "CARRIER"}`),
              c.load?.title,
              c.load?.weightT ? `${c.load.weightT} t` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      </View>

      {c.version && (
        <View style={s.sumRow}>
          <View>
            <Text style={s.sumKey}>{t("mob.ctr.price")}</Text>
            <Text style={s.sumValue}>
              {fmtNum(c.version.price)} <Text style={s.sumCur}>{c.version.currency}</Text>
            </Text>
          </View>
          <Text style={s.term}>{c.version.paymentTerm}</Text>
        </View>
      )}

      {/* TO'LOV CHIZIG'I — faqat pul harakati boshlangan bo'lsa.
          Nol chiziq foydali ma'lumot bermaydi, faqat joy egallaydi. */}
      {c.pay && price > 0 && paid > 0 && (
        <View style={{ marginTop: 11 }}>
          <View style={s.payTop}>
            <Text style={s.payKey}>{t("mob.ctr.paid")}</Text>
            <Text style={s.payVal}>
              {fmtNum(paid)} / {fmtNum(price)}
            </Text>
          </View>
          <View style={s.bar}>
            <View
              style={[
                s.barFill,
                {
                  width: `${Math.max(2, pct)}%`,
                  backgroundColor: c.pay.status === "PAID" ? color.success : color.warning,
                },
              ]}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardHot: { borderWidth: 2, borderColor: color.brand },

  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { height: 21, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  tagText: { fontSize: 10, fontWeight: "700" },
  no: { marginLeft: "auto", fontSize: 11, color: "#94a3b8" },

  partyRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 11 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 11, fontWeight: "700", color: color.mutedForeground },
  partyName: { fontSize: 14, fontWeight: "600", color: color.foreground },
  partyMeta: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  sumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.muted,
  },
  sumKey: { fontSize: 11, color: color.mutedForeground },
  sumValue: { fontSize: 20, fontWeight: "700", color: color.foreground, marginTop: 1 },
  sumCur: { fontSize: 13, color: color.mutedForeground },
  term: { fontSize: 12, color: color.mutedForeground },

  payTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  payKey: { fontSize: 12, color: color.mutedForeground },
  payVal: { fontSize: 12.5, fontWeight: "600", color: color.foreground },
  bar: { height: 6, borderRadius: 3, backgroundColor: color.muted, marginTop: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
});
