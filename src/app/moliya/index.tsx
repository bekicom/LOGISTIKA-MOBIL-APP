/**
 * F1 — moliya bosh ekrani.
 *
 * ── VALYUTALAR QO'SHILMAYDI ─────────────────────────────────────
 *
 * Dollar bilan so'mni jamlash — yolg'on raqam, va odam shu raqamga
 * qarab qaror qiladi. Server `Money[]` massiv qaytaradi, ekran har
 * valyutani alohida qatorda chizadi. Bu qoida butun ilovada bir
 * xil (haydovchi panelidagi «to'langan» ham massiv).
 *
 * ── TASDIQ KUTAYOTGAN XARAJAT — ISH TO'XTAB TURGAN JOY ──────────
 *
 * Haydovchi chek yubordi, egasi tasdiqlamaguncha reys hisobi
 * noto'g'ri va haydovchi puliga yeta olmaydi. Shuning uchun soni
 * bilan birga SUMMASI ham ko'rsatiladi: «4 ta» ko'p emas,
 * «3 100 000 so'm» ko'p.
 */
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { budgetCategoryLabel, t } from "@/lib/i18n";

type Money = { amount: number; currency: string };

type Budget = {
  id: string;
  category: string | null;
  plate: string | null;
  amount: number;
  currency: string;
  state: { limit: number; spent: number; left: number; pct: number; level: string } | null;
};

type MonthRow = { currency: string; income: number; expense: number; profit: number };

const LEVEL: Record<string, string> = {
  ok: color.success,
  near: color.warning,
  over: color.danger,
};

export default function Moliya() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    period: string;
    debts: { toMe: Money[]; fromMe: Money[]; overdue: Money[]; count: number; overdueCount: number };
    pending: { count: number; totals: Money[] };
    budgets: Budget[];
    month: MonthRow[];
  }>("/api/finance");

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={{ flexGrow: 1 }}>
          <Text style={s.title}>{t("mob.fin.title")}</Text>
          <Text style={s.sub}>{t("mob.fin.subtitle")}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : (
          <>
            {/* ══ QARZ ══ */}
            <Pressable style={s.debts} onPress={() => router.push("/moliya/qarzlar")}>
              <Text style={s.debtsKey}>{t("mob.fin.toMe")}</Text>
              <View style={s.moneyList}>
                {(data?.debts.toMe ?? []).length === 0 ? (
                  <Text style={s.debtsZero}>{t("mob.fin.none")}</Text>
                ) : (
                  (data?.debts.toMe ?? []).map((m, i) => (
                    <Text key={m.currency} style={i === 0 ? s.debtsBig : s.debtsSmall}>
                      {fmtNum(m.amount)} <Text style={s.debtsCur}>{m.currency}</Text>
                    </Text>
                  ))
                )}
              </View>

              <View style={s.debtsLine} />

              <Text style={s.debtsKey}>{t("mob.fin.fromMe")}</Text>
              <View style={s.moneyList}>
                {(data?.debts.fromMe ?? []).length === 0 ? (
                  <Text style={s.debtsZero}>{t("mob.fin.none")}</Text>
                ) : (
                  (data?.debts.fromMe ?? []).map((m) => (
                    <Text key={m.currency} style={s.debtsMid}>
                      {fmtNum(m.amount)} <Text style={s.debtsCur}>{m.currency}</Text>
                    </Text>
                  ))
                )}
              </View>

              {/* KECHIKKAN — bugun qilinadigan ish */}
              {(data?.debts.overdueCount ?? 0) > 0 && (
                <View style={s.overdue}>
                  <Icon name="alert" size={17} stroke="#fca5a5" />
                  <View style={{ flexGrow: 1 }}>
                    <Text style={s.overdueKey}>
                      {t("mob.fin.overdueN", { n: data?.debts.overdueCount ?? 0 })}
                    </Text>
                    {(data?.debts.overdue ?? []).map((m) => (
                      <Text key={m.currency} style={s.overdueValue}>
                        {fmtNum(m.amount)} {m.currency}
                      </Text>
                    ))}
                  </View>
                  <Icon name="chevron" size={17} stroke="#ffffff80" />
                </View>
              )}
            </Pressable>

            {/* ══ TASDIQ KUTMOQDA ══ */}
            {(data?.pending.count ?? 0) > 0 && (
              <View>
                <Text style={s.group}>{t("mob.fin.pendingGroup")}</Text>
                <View style={[s.card, s.cardHot]}>
                  <View style={s.pendRow}>
                    <View style={s.pendIcon}>
                      <Icon name="doc" size={21} stroke="#c2490f" />
                    </View>
                    <View style={{ flexGrow: 1 }}>
                      <Text style={s.pendCount}>
                        {t("mob.fin.expensesN", { n: data?.pending.count ?? 0 })}
                      </Text>
                      {(data?.pending.totals ?? []).map((m) => (
                        <Text key={m.currency} style={s.pendSum}>
                          {fmtNum(m.amount)} {m.currency}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <Text style={s.pendNote}>{t("mob.fin.pendingNote")}</Text>
                  <Pressable
                    style={[s.btn, s.btnPri]}
                    onPress={() => router.push("/moliya/xarajatlar")}
                  >
                    <Text style={s.btnPriText}>{t("mob.fin.review")}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* ══ BUDJET ══ */}
            {(data?.budgets ?? []).length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.fin.budgetGroup")}</Text>
                <View style={{ gap: space.sm }}>
                  {(data?.budgets ?? []).map((b) => {
                    const tone = LEVEL[b.state?.level ?? "ok"] ?? color.success;
                    const pct = Math.min(100, b.state?.pct ?? 0);
                    return (
                      <View
                        key={b.id}
                        style={[
                          s.card,
                          b.state?.level === "over" && { borderColor: color.danger + "66" },
                          b.state?.level === "near" && { borderColor: color.warning + "66" },
                        ]}
                      >
                        <View style={s.budHead}>
                          <Text style={s.budName}>
                            {b.category ? budgetCategoryLabel(b.category) : (b.plate ?? t("mob.fin.allCats"))}
                          </Text>
                          <Text style={[s.budPct, { color: tone }]}>{b.state?.pct ?? 0}%</Text>
                        </View>

                        <View style={s.bar}>
                          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: tone }]} />
                        </View>

                        <View style={s.budFoot}>
                          <Text style={s.budMeta}>
                            {fmtNum(b.state?.spent ?? 0)} / {fmtNum(b.amount)}
                          </Text>
                          <Text style={[s.budMeta, b.state?.level === "over" && { color: color.danger, fontWeight: "600" }]}>
                            {b.state && b.state.left < 0
                              ? t("mob.fin.overBy", { sum: fmtNum(-b.state.left) })
                              : t("mob.fin.leftSum", { sum: fmtNum(b.state?.left ?? b.amount) })}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ══ OY YAKUNI ══ */}
            {(data?.month ?? []).length > 0 && (
              <View style={s.card}>
                <Text style={s.sec}>{t("mob.fin.monthTotal")}</Text>
                {(data?.month ?? []).map((m) => (
                  <View key={m.currency} style={s.monthBlock}>
                    <Row label={t("mob.fin.income")} value={`${fmtNum(m.income)} ${m.currency}`} />
                    <Row label={t("mob.fin.expense")} value={`${fmtNum(m.expense)} ${m.currency}`} />
                    <View style={s.profitRow}>
                      <Text style={s.profitKey}>{t("mob.fin.profit")}</Text>
                      <Text
                        style={[s.profitValue, m.profit < 0 && { color: color.danger }]}
                      >
                        {fmtNum(m.profit)} {m.currency}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* ⚠️ TZ talabi: xarajat to'liq bo'lmasa YAKUNIY
                    deb ko'rsatilmaydi — aks holda foyda
                    haqiqatdan yuqori ko'rinadi. */}
                {(data?.pending.count ?? 0) > 0 && (
                  <View style={s.warn}>
                    <Icon name="alert" size={15} stroke={color.warning} />
                    <Text style={s.warnText}>
                      {t("mob.fin.notFinal", { n: data?.pending.count ?? 0 })}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.r}>
      <Text style={s.rk}>{label}</Text>
      <Text style={s.rv}>{value}</Text>
    </View>
  );
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
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  debts: { backgroundColor: color.navy, borderRadius: radius.card, padding: space.md },
  debtsKey: { fontSize: 12, color: "#f1f5f9a6", letterSpacing: 0.3 },
  moneyList: { marginTop: 7, gap: 3 },
  debtsBig: { fontSize: 26, fontWeight: "700", color: "#fff", letterSpacing: -0.7 },
  debtsMid: { fontSize: 20, fontWeight: "700", color: "#fff" },
  debtsSmall: { fontSize: 18, fontWeight: "700", color: "#fff" },
  debtsCur: { fontSize: 14, color: "#f1f5f999" },
  debtsZero: { fontSize: 17, fontWeight: "600", color: "#f1f5f966" },
  debtsLine: { height: 1, backgroundColor: "#ffffff1a", marginVertical: 15 },

  overdue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 15,
    padding: 12,
    borderRadius: 11,
    backgroundColor: color.danger + "26",
    borderWidth: 1,
    borderColor: color.danger + "59",
  },
  overdueKey: { fontSize: 13, fontWeight: "600", color: "#fecaca" },
  overdueValue: { fontSize: 17, fontWeight: "700", color: "#fff", marginTop: 2 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardHot: { borderWidth: 2, borderColor: color.brand },

  pendRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pendIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: color.brand + "1f",
    alignItems: "center",
    justifyContent: "center",
  },
  pendCount: { fontSize: 15, fontWeight: "600", color: color.foreground },
  pendSum: { fontSize: 19, fontWeight: "700", color: color.foreground, marginTop: 2 },
  pendNote: { fontSize: 12, color: color.mutedForeground, marginTop: 11, lineHeight: 18 },

  budHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  budName: { fontSize: 14, fontWeight: "600", color: color.foreground },
  budPct: { fontSize: 13, fontWeight: "700" },
  bar: { height: 8, borderRadius: 4, backgroundColor: color.muted, marginTop: 9, overflow: "hidden" },
  barFill: { height: "100%" },
  budFoot: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 8 },
  budMeta: { fontSize: 12, color: color.mutedForeground },

  sec: { fontSize: 15, fontWeight: "700", color: color.foreground },
  monthBlock: { marginTop: 11 },
  r: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.muted,
  },
  rk: { fontSize: 13, color: color.mutedForeground },
  rv: { fontSize: 13, fontWeight: "600", color: color.foreground },
  profitRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10 },
  profitKey: { fontSize: 14, fontWeight: "700", color: color.foreground },
  profitValue: { fontSize: 17, fontWeight: "700", color: color.success },

  warn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: color.warning + "14",
  },
  warnText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 18 },

  btn: { height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 11 },
  btnPri: { backgroundColor: color.brand },
  btnPriText: { fontSize: 14, fontWeight: "600", color: color.brandForeground },
});
