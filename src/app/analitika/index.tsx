/**
 * An1 — hisobot.
 *
 * ── WEB'DAGI JADVAL KO'CHIRILMADI ───────────────────────────────
 *
 * `/reports` da o'nlab ko'rsatkich, ikkita grafik va beshta jadval
 * bor. 393px ga ularni siqish mumkin, lekin keyin hech biri
 * o'qilmaydi. Telefonda BITTA savol bor: shu davrda ishlaganim
 * foyda berdimi. Shuning uchun sof foyda tepada va yolg'iz.
 *
 * ── VALYUTALAR QO'SHILMAYDI ─────────────────────────────────────
 *
 * Moliya bo'limidagi qoida shu yerda ham: har valyuta alohida
 * qatorda. Foiz esa faqat BIR valyuta bo'yicha hisoblanadi va
 * qaysi biri ekani yozib qo'yiladi.
 *
 * ── ZARAR YASHIRINMAYDI ─────────────────────────────────────────
 *
 * Transport ro'yxatida manfiy foyda qizil bo'ladi. Jadvalda u
 * boshqa qatorlar orasida ko'zga tashlanmasdi, holbuki aynan shu
 * qator savol tug'diradi.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { expenseCategoryLabel, t } from "@/lib/i18n";

type Money = { amount: number; currency: string };

type Rep = {
  kinds: string[];
  kind: string | null;
  period: string;
  range: { from: string | null; to: string };
  profitDelta: { pct: number | null; dir: "up" | "down" | "flat"; good: boolean } | null;
  income: Money[];
  expense: Money[];
  profit: Money[];
  trips: { total: number; active: number; closed: number; cancelled: number; avgDays: number | null };
  byCategory: { key: string; rows: Money[] }[];
  byVehicle: { id: string; plate: string; trips: number; km: number; profit: Money[]; perKm: number | null }[];
  empty: { totalKm: number; emptyKm: number; emptyPct: number } | null;
  docs: { ok: number; soon: number; expired: number };
  debt: { toMe: Money[]; fromMe: Money[]; overdue: Money[] };
  currency: string | null;
};

/** `furam/src/lib/report.ts:PERIODS` bilan bir xil tartib */
const PERIODS = ["week", "month", "quarter", "year", "all"] as const;

/* Kategoriya ustunlarining rangi. Birinchisi brend rangida:
   eng katta xarajat darhol ko'zga tashlansin. */
const BARS = [color.brand, color.warning, color.mutedForeground, "#cbd5e1", "#e2e8f0"];

export default function Analitika() {
  const [period, setPeriod] = useState<string>("month");
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<Rep>(
    `/api/reports?period=${period}`,
    [period],
  );

  const analytics = useApi<{
    problems: { trips: number; items: { key: string; level: string; vars: Record<string, number> }[] };
  }>("/api/analytics");

  const problems = analytics.data?.problems.items ?? [];
  const bad = problems.filter((p) => p.level === "bad").length;

  /* Kategoriya ulushi FAQAT bir valyuta ichida hisoblanadi.
     Aralashtirilsa foizlar yolg'on chiqadi. */
  const cur = data?.currency ?? null;
  const catRows = (data?.byCategory ?? [])
    .map((c) => ({ key: c.key, amount: c.rows.find((r) => r.currency === cur)?.amount ?? 0 }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const catTotal = catRows.reduce((a, c) => a + c.amount, 0);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <View style={s.headTop}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
            <Icon name="back" size={22} stroke={color.foreground} />
          </Pressable>
          <View style={{ flexGrow: 1 }}>
            <Text style={s.title}>{t("mob.an.title")}</Text>
            <Text style={s.sub}>{t("mob.an.subtitle")}</Text>
          </View>
        </View>

        {/* DAVR — tanlov emas, kontekst. Ochiladigan ro'yxat bitta
            qo'shimcha bosish demak, holbuki odam deyarli har doim
            «oy» ni ko'radi. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {PERIODS.map((p) => (
            <Pressable
              key={p}
              style={[s.tab, period === p && s.tabOn]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[s.tabText, period === p && s.tabTextOn]}>{t(`mob.an.p_${p}`)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={4} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data?.kind ? (
          <Empty icon="chart" title={t("mob.an.noneTitle")} text={t("mob.an.noneHint")} />
        ) : (
          <>
            {/* ══ SOF FOYDA ══ */}
            <View style={s.hero}>
              <Text style={s.heroKey}>{t("mob.an.profit")}</Text>
              <View style={s.moneyList}>
                {(data.profit ?? []).length === 0 ? (
                  <Text style={s.heroZero}>{t("mob.an.noData")}</Text>
                ) : (
                  data.profit.map((m, i) => (
                    <Text
                      key={m.currency}
                      style={[
                        i === 0 ? s.heroBig : s.heroMid,
                        { color: m.amount < 0 ? "#fca5a5" : "#4ade80" },
                      ]}
                    >
                      {fmtNum(m.amount)} <Text style={s.heroCur}>{m.currency}</Text>
                    </Text>
                  ))
                )}
              </View>

              {/* O'TGAN DAVR BILAN — raqamning o'zi ma'nosiz */}
              {data.profitDelta && data.profitDelta.pct != null && (
                <View
                  style={[
                    s.delta,
                    { backgroundColor: (data.profitDelta.good ? "#4ade80" : "#fca5a5") + "26" },
                  ]}
                >
                  <Icon
                    name="chart"
                    size={13}
                    stroke={data.profitDelta.good ? "#4ade80" : "#fca5a5"}
                  />
                  <Text
                    style={[
                      s.deltaText,
                      { color: data.profitDelta.good ? "#4ade80" : "#fca5a5" },
                    ]}
                  >
                    {t(data.profitDelta.dir === "down" ? "mob.an.deltaDown" : "mob.an.deltaUp", {
                      pct: Math.abs(data.profitDelta.pct),
                    })}
                  </Text>
                </View>
              )}

              <View style={s.heroLine} />

              <View style={s.heroFoot}>
                <Foot k={t("mob.an.income")} v={sumOf(data.income, cur)} />
                <Foot k={t("mob.an.expense")} v={sumOf(data.expense, cur)} />
                <Foot k={t("mob.an.trips")} v={String(data.trips.total)} />
              </View>
            </View>

            {/* ══ MUAMMO SIGNALI ══
                Web'da muammolar alohida yorliqda va odam u yerga
                bormasa bilmaydi. Bu yerda signal bosh ekranda. */}
            {problems.length > 0 && (
              <Pressable
                style={[s.card, bad > 0 ? s.cardBad : s.cardWarn]}
                onPress={() => router.push("/analitika/muammolar")}
              >
                <View style={s.row}>
                  <View
                    style={[
                      s.icon,
                      { backgroundColor: (bad > 0 ? color.danger : color.warning) + "1a" },
                    ]}
                  >
                    <Icon name="alert" size={20} stroke={bad > 0 ? color.danger : color.warning} />
                  </View>
                  <View style={{ flexGrow: 1, minWidth: 0 }}>
                    <Text style={s.rowTitle}>{t("mob.an.foundN", { n: problems.length })}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>
                      {problems.map((p) => t(`mob.anProb.${p.key}`)).join(", ")}
                    </Text>
                  </View>
                  <Icon name="chevron" size={17} stroke={color.mutedForeground} />
                </View>
              </Pressable>
            )}

            {/* ══ XARAJAT QAYERGA KETDI ══
                Web'da donut. 393px da donut mayda chiqadi va
                yorliqlari o'qilmaydi; gorizontal chiziq esa
                tartibni ham, ulushni ham bir vaqtda ko'rsatadi. */}
            {catRows.length > 0 && catTotal > 0 && (
              <View>
                <Text style={s.group}>{t("mob.an.catGroup")}</Text>
                <View style={[s.card, { gap: 13 }]}>
                  {catRows.slice(0, 5).map((c, i) => {
                    const pct = Math.round((c.amount / catTotal) * 100);
                    return (
                      <View key={c.key}>
                        <View style={s.catTop}>
                          <Text style={s.catName}>{expenseCategoryLabel(c.key)}</Text>
                          <Text style={s.catVal}>
                            {fmtNum(c.amount)} · {pct}%
                          </Text>
                        </View>
                        <View style={s.bar}>
                          <View
                            style={[
                              s.barFill,
                              { width: `${Math.max(2, pct)}%`, backgroundColor: BARS[i] ?? BARS[4] },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ══ TRANSPORT BO'YICHA ══ */}
            {(data.byVehicle ?? []).length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.an.vehGroup")}</Text>
                <View style={[s.card, { padding: 0 }]}>
                  {data.byVehicle.map((v, i) => {
                    const p = v.profit.find((m) => m.currency === cur)?.amount ?? 0;
                    const neg = p < 0;
                    return (
                      <View
                        key={v.id}
                        style={[s.veh, i < data.byVehicle.length - 1 && s.vehLine]}
                      >
                        <View
                          style={[
                            s.vehRule,
                            { backgroundColor: neg ? color.danger : color.success },
                          ]}
                        />
                        <View style={{ flexGrow: 1, minWidth: 0 }}>
                          <Text style={s.vehPlate}>{v.plate}</Text>
                          <Text style={s.vehMeta}>
                            {t("mob.an.tripsN", { n: v.trips })}
                            {v.km > 0 ? ` · ${fmtNum(Math.round(v.km))} km` : ""}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={[s.vehSum, { color: neg ? color.danger : color.success }]}
                          >
                            {p > 0 ? "+" : ""}
                            {fmtNum(p)}
                          </Text>
                          {!!cur && <Text style={s.vehCur}>{cur}</Text>}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ══ BOZORGA O'TISH ══
                O'z raqamlari ko'rilgach tabiiy savol: bu yaxshimi
                yoki yomonmi. Javob bozor ekranida. */}
            <Pressable style={s.card} onPress={() => router.push("/analitika/bozor")}>
              <View style={s.row}>
                <View style={[s.icon, { backgroundColor: color.brand + "1a" }]}>
                  <Icon name="chart" size={20} stroke={color.brand} />
                </View>
                <View style={{ flexGrow: 1, minWidth: 0 }}>
                  <Text style={s.rowTitle}>{t("mob.an.marketTitle")}</Text>
                  <Text style={s.rowSub}>{t("mob.an.marketHint")}</Text>
                </View>
                <Icon name="chevron" size={17} stroke={color.mutedForeground} />
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Foot({ k, v }: { k: string; v: string }) {
  return (
    <View>
      <Text style={s.footKey}>{k}</Text>
      <Text style={s.footVal}>{v}</Text>
    </View>
  );
}

/** Taqqoslash valyutasidagi summa; u aniqlanmagan bo'lsa birinchisi */
function sumOf(rows: Money[], currency: string | null) {
  if (rows.length === 0) return "—";
  const row = currency ? rows.find((r) => r.currency === currency) : null;
  return fmtNum((row ?? rows[0]).amount);
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },

  head: {
    backgroundColor: color.card,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  headTop: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.md },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: font.titleLg, fontWeight: "700", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  tabs: { gap: 6, paddingHorizontal: space.lg, paddingTop: 11, paddingBottom: space.md },
  tab: {
    height: 30,
    paddingHorizontal: 13,
    borderRadius: radius.control,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  tabOn: { backgroundColor: color.foreground },
  tabText: { fontSize: 13, fontWeight: "500", color: color.mutedForeground },
  tabTextOn: { color: color.card, fontWeight: "600" },

  scroll: { padding: space.lg, gap: space.lg },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  hero: { backgroundColor: color.navy, borderRadius: radius.card, padding: 17 },
  heroKey: { fontSize: 12, color: "#f1f5f9a6", letterSpacing: 0.3 },
  moneyList: { marginTop: 8, gap: 4 },
  heroBig: { fontSize: 30, fontWeight: "700", letterSpacing: -0.8 },
  heroMid: { fontSize: 19, fontWeight: "700" },
  heroCur: { fontSize: 14, color: "#f1f5f999" },
  heroZero: { fontSize: 18, fontWeight: "600", color: "#f1f5f966" },
  delta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 11,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  deltaText: { fontSize: 12, fontWeight: "600" },
  heroLine: { height: 1, backgroundColor: "#ffffff1a", marginTop: 16, marginBottom: 14 },
  heroFoot: { flexDirection: "row", gap: 20 },
  footKey: { fontSize: 11, color: "#f1f5f98c" },
  footVal: { fontSize: 15, fontWeight: "600", color: "#fff", marginTop: 2 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardBad: { borderWidth: 2, borderColor: color.danger },
  cardWarn: { borderColor: color.warning + "66" },

  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  rowSub: { fontSize: 12.5, color: color.mutedForeground, marginTop: 1 },

  catTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  catName: { fontSize: 13.5, fontWeight: "600", color: color.foreground },
  catVal: { fontSize: 13, color: color.mutedForeground },
  bar: { height: 7, borderRadius: 4, backgroundColor: color.muted, marginTop: 6, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },

  veh: { flexDirection: "row", alignItems: "center", gap: 12, padding: space.md },
  vehLine: { borderBottomWidth: 1, borderBottomColor: color.muted },
  vehRule: { width: 3, height: 34, borderRadius: 2 },
  vehPlate: { fontSize: 14, fontWeight: "600", color: color.foreground },
  vehMeta: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  vehSum: { fontSize: 15, fontWeight: "700" },
  vehCur: { fontSize: 11, color: "#94a3b8" },
});
