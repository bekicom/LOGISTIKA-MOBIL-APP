/**
 * F3 — qarzlar.
 *
 * ── MANBA — SHARTNOMA ───────────────────────────────────────────
 *
 * Kelishilgan summa va TASDIQLANGAN to'lovlar farqi. «To'ladim»
 * degan gap yetarli emas: ikkinchi tomon tasdiqlashi kerak.
 *
 * ── QOLDIQ ASOSIY RAQAM ─────────────────────────────────────────
 *
 * Jami emas, qoldiq. «6 000 000» degan raqam 3 600 000 to'langan
 * bo'lsa chalg'itadi — odam qancha kutayotganini bilishi kerak.
 *
 * ── MUDDAT SANA EMAS, KUN BILAN ─────────────────────────────────
 *
 * «12 kun kechikdi» — «22-avgust» dan aniqroq va darhol tushunarli.
 * Shakl serverdan keladi (`dueReminder`), bu yerda qayta
 * hisoblanmaydi.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, radius, space } from "@/lib/theme";
import { debtStatusLabel, t } from "@/lib/i18n";

type Debt = {
  contractId: string;
  contractNo: number;
  tripNo: number | null;
  incoming: boolean;
  party: { name: string; furamId: number } | null;
  left: number;
  total: number;
  paid: number;
  currency: string;
  reason: string;
  status: string;
  reminder: { urgent: boolean; key: string; days: number } | null;
};

/**
 * Eslatma matni.
 *
 * Server KALIT yuboradi (`dueReminder`), matn shu yerda yasaladi.
 * Kalit bildirishnomaniki bilan bir xil — telefonga kelgan xabar
 * bilan ekrandagi yozuv bir xil so'z bilan aytilsin.
 *
 * `t()` chaqiruvlari ATAYLAB uchtaga ochib yozilgan: lug'at
 * yig'uvchi (`sync-mobile-i18n`) o'zgaruvchili kalitni ko'rmaydi
 * va tarjima ilovaga ko'chirilmay qolardi.
 */
function reminderText(r: { key: string; days: number }) {
  if (r.key === "payLate") return t("notifyTitle.payLate", { days: r.days });
  if (r.key === "payToday") return t("notifyTitle.payToday");
  if (r.key === "paySoon") return t("notifyTitle.paySoon", { days: r.days });
  return null;
}

/** `furam/src/lib/finance.ts:DEBT_STATUSES` bilan bir xil */
const TONE: Record<string, string> = {
  OVERDUE: color.danger,
  PARTIAL: color.warning,
  WAITING: color.mutedForeground,
  PAID: color.success,
  CANCELLED: color.mutedForeground,
};

export default function Qarzlar() {
  const [tab, setTab] = useState<"in" | "out">("in");
  const insets = useSafeAreaInsets();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    summary: { toMe: { amount: number; currency: string }[]; fromMe: { amount: number; currency: string }[]; count: number };
    items: Debt[];
  }>("/api/finance/debts");

  const all = data?.items ?? [];
  /* CANCELLED ko'rsatilmaydi: bekor qilingan hisob ochiq qarz
     emas va ro'yxatni faqat cho'zadi. */
  const live = all.filter((d) => d.status !== "CANCELLED");
  const items = live.filter((d) => (tab === "in" ? d.incoming : !d.incoming));

  return (
    <View style={s.root}>
      <Header
        title={t("mob.fin.debtsTitle")}
        subtitle={t("mob.fin.openN", { n: live.length })}
      />

      <View style={s.tabs}>
        <Pressable style={[s.tab, tab === "in" && s.tabOn]} onPress={() => setTab("in")}>
          <Text style={[s.tabText, tab === "in" && s.tabTextOn]}>
            {t("mob.fin.toMeN", { n: live.filter((d) => d.incoming).length })}
          </Text>
        </Pressable>
        <Pressable style={[s.tab, tab === "out" && s.tabOn]} onPress={() => setTab("out")}>
          <Text style={[s.tabText, tab === "out" && s.tabTextOn]}>
            {t("mob.fin.fromMeN", { n: live.filter((d) => !d.incoming).length })}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <Empty
            icon="check"
            title={t("mob.fin.noDebtsTitle")}
            text={t("mob.fin.noDebtsHint")}
          />
        ) : (
          items.map((d) => {
            const tone = TONE[d.status] ?? color.mutedForeground;
            const partial = d.paid > 0 && d.paid < d.total;

            return (
              <View
                key={d.contractId}
                style={[s.card, d.status === "OVERDUE" && s.cardBad, d.status === "PARTIAL" && s.cardWarn]}
              >
                <View style={s.head}>
                  <View style={[s.tag, { backgroundColor: tone + "1a" }]}>
                    <Text style={[s.tagText, { color: tone }]}>
                      {/* Kechikkanda KUN ko'rsatiladi, holat nomi emas */}
                      {(d.reminder && reminderText(d.reminder)) ?? debtStatusLabel(d.status)}
                    </Text>
                  </View>
                  <Text style={s.no}>{t("mob.fin.contractN", { n: d.contractNo })}</Text>
                </View>

                <View style={s.partyRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials(d.party?.name ?? "")}</Text>
                  </View>
                  <View style={{ flexGrow: 1, minWidth: 0 }}>
                    <Text style={s.partyName} numberOfLines={1}>
                      {d.party?.name ?? t("mob.fin.unknownParty")}
                    </Text>
                    <Text style={s.partyMeta} numberOfLines={1}>
                      {[
                        d.party ? `FURAM-${d.party.furamId}` : null,
                        d.tripNo != null ? t("mob.fin.tripN", { n: d.tripNo }) : null,
                        d.reason,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                </View>

                {/* QOLDIQ ASOSIY RAQAM */}
                <View style={s.sumRow}>
                  <View>
                    <Text style={s.sumKey}>{t("mob.fin.left")}</Text>
                    <Text style={s.sumValue}>
                      {fmtNum(d.left)} <Text style={s.sumCur}>{d.currency}</Text>
                    </Text>
                  </View>
                  {partial && (
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={s.sumKey}>{t("mob.fin.paid")}</Text>
                      <Text style={s.sumPaid}>
                        {fmtNum(d.paid)} / {fmtNum(d.total)}
                      </Text>
                    </View>
                  )}
                </View>

                {!d.reminder && d.status === "WAITING" && (
                  <Text style={s.noDue}>{t("mob.fin.noDueDate")}</Text>
                )}

              </View>
            );
          })
        )}
      </ScrollView>
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  tabs: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  tab: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  tabOn: { backgroundColor: color.foreground },
  tabText: { fontSize: 13, fontWeight: "500", color: color.mutedForeground },
  tabTextOn: { color: color.card, fontWeight: "600" },

  scroll: { padding: space.lg, gap: space.md },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardBad: { borderWidth: 2, borderColor: color.danger },
  cardWarn: { borderColor: color.warning + "66" },

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
  sumValue: { fontSize: 22, fontWeight: "700", color: color.foreground, marginTop: 1 },
  sumCur: { fontSize: 13, color: color.mutedForeground },
  sumPaid: { fontSize: 13, fontWeight: "600", color: color.mutedForeground, marginTop: 3 },

  noDue: { fontSize: 12, color: color.mutedForeground, marginTop: 8 },

});
