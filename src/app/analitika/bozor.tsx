/**
 * An2 — bozor holati.
 *
 * ── ISHONCHSIZLIK YASHIRILMAYDI ─────────────────────────────────
 *
 * Kam ma'lumotdan chiqarilgan o'rtacha stavka aniq raqamdek
 * ko'rinadi-yu, aslida tasodifiy. Odam unga qarab narx aytadi va
 * yutqazadi. Shuning uchun namuna soni tepada turadi, mediana esa
 * yetarli ma'lumot bo'lmasa umuman ko'rsatilmaydi — bo'sh joy
 * o'rniga sabab yoziladi.
 *
 * ── DIAPAZON, O'RTACHA EMAS ─────────────────────────────────────
 *
 * Savdolashayotgan odamga o'rtachaning o'zi foydasiz: unga «eng
 * kam qancha, eng ko'p qancha» kerak.
 *
 * ── HOLAT RANGDA HAM, SO'ZDA HAM ────────────────────────────────
 *
 * Faqat rangda bo'lsa rang ko'rmaydigan odam o'qiy olmasdi.
 */
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Rate = {
  currency: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number | null;
  enough: boolean;
};

type Route = {
  route: string;
  loads: number;
  trucks: number;
  level: "shortage" | "tight" | "balanced" | "surplus" | "unknown";
  rates: Rate[];
};

/** `furam/src/lib/market.ts:balance()` bilan bir xil to'plam */
const TONE: Record<string, string> = {
  shortage: color.danger,
  tight: color.warning,
  balanced: color.mutedForeground,
  surplus: color.mutedForeground,
  unknown: color.mutedForeground,
};

export default function Bozor() {
  const insets = useSafeAreaInsets();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    limits: { sample: number; median: number };
    market: { sample: number; enough: boolean; overall: Rate[]; routes: Route[] };
  }>("/api/analytics");

  const mk = data?.market;

  return (
    <View style={s.root}>
      <Header
        title={t("mob.an.marketTitle")}
        subtitle={mk ? t("mob.an.sampleN", { n: mk.sample }) : undefined}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !mk || mk.sample === 0 ? (
          <Empty icon="chart" title={t("mob.an.mktEmptyTitle")} text={t("mob.an.mktEmptyHint")} />
        ) : (
          <>
            {/* ══ NAMUNA YETARLIMI — BIRINCHI AYTILADI ══ */}
            <View style={s.warn}>
              <Icon name="alert" size={17} stroke={color.warning} />
              <Text style={s.warnText}>
                {mk.enough
                  ? t("mob.an.openOnly", { n: mk.sample })
                  : t("mob.an.tooFew", { n: mk.sample, min: data!.limits.sample })}
              </Text>
            </View>

            {/* ══ STAVKA DIAPAZONI ══ */}
            {mk.overall.length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.an.rateGroup")}</Text>
                <View style={{ gap: 9 }}>
                  {mk.overall.map((r) => (
                    <View key={r.currency} style={s.card}>
                      <View style={s.rateTop}>
                        <Text style={s.rateCur}>{r.currency}</Text>
                        <Text style={s.rateCount}>{t("mob.an.loadsN", { n: r.count })}</Text>
                      </View>

                      {r.median != null ? (
                        <>
                          {/* Chiziq: eng past — mediana — eng yuqori */}
                          <View style={s.track}>
                            <View style={s.trackFill} />
                            <View
                              style={[
                                s.pin,
                                { left: `${pinAt(r.min, r.median, r.max)}%` },
                              ]}
                            />
                          </View>
                          <View style={s.rateFoot}>
                            <View>
                              <Text style={s.rateKey}>{t("mob.an.rateMin")}</Text>
                              <Text style={s.rateSide}>{fmtNum(Math.round(r.min))}</Text>
                            </View>
                            <View style={{ alignItems: "center" }}>
                              <Text style={s.rateKey}>{t("mob.an.rateMed")}</Text>
                              <Text style={s.rateMid}>{fmtNum(Math.round(r.median))}</Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={s.rateKey}>{t("mob.an.rateMax")}</Text>
                              <Text style={s.rateSide}>{fmtNum(Math.round(r.max))}</Text>
                            </View>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={s.rateRange}>
                            {fmtNum(Math.round(r.min))} — {fmtNum(Math.round(r.max))}
                          </Text>
                          {/* MEDIANA YO'Q. Bo'sh joy qoldirilmaydi:
                              sabab aytiladi, aks holda odam buni
                              xato deb o'ylaydi. */}
                          <Text style={s.rateNote}>
                            {t("mob.an.noMedian", { min: data!.limits.median })}
                          </Text>
                        </>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ══ TALAB VA TAKLIF ══ */}
            {mk.routes.length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.an.routeGroup")}</Text>
                <View style={{ gap: 9 }}>
                  {mk.routes.slice(0, 12).map((r) => {
                    const tone = TONE[r.level] ?? color.mutedForeground;
                    const top = Math.max(r.loads, r.trucks, 1);
                    return (
                      <View key={r.route} style={s.card}>
                        <View style={[s.tag, { backgroundColor: tone + "1a" }]}>
                          <Text style={[s.tagText, { color: tone }]}>
                            {t(`mob.anLevel.${r.level}`)}
                          </Text>
                        </View>
                        <Text style={s.routeName}>{r.route}</Text>

                        <View style={s.bars}>
                          <View style={s.barCol}>
                            <View style={s.barBox}>
                              <View
                                style={[
                                  s.barFill,
                                  {
                                    height: `${(r.loads / top) * 100}%`,
                                    backgroundColor: tone,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={s.barKey}>{t("mob.an.loadsN", { n: r.loads })}</Text>
                          </View>
                          <View style={s.barCol}>
                            <View style={s.barBox}>
                              <View
                                style={[
                                  s.barFill,
                                  { height: `${(r.trucks / top) * 100}%`, backgroundColor: "#cbd5e1" },
                                ]}
                              />
                            </View>
                            <Text style={s.barKey}>{t("mob.an.trucksN", { n: r.trucks })}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Medianani eng past va eng yuqori orasidagi joyi (2–98%) */
function pinAt(min: number, median: number, max: number) {
  if (!(max > min)) return 50;
  const p = ((median - min) / (max - min)) * 100;
  return Math.min(98, Math.max(2, p));
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

  warn: {
    flexDirection: "row",
    gap: 10,
    padding: space.md,
    borderRadius: radius.card,
    backgroundColor: color.warning + "12",
    borderWidth: 1,
    borderColor: color.warning + "3d",
  },
  warnText: { flex: 1, fontSize: 12.5, color: "#78350f", lineHeight: 19 },

  rateTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  rateCur: { fontSize: 15, fontWeight: "700", color: color.foreground },
  rateCount: { fontSize: 12, color: "#94a3b8" },

  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: color.muted,
    marginTop: 15,
    marginBottom: 13,
    justifyContent: "center",
  },
  trackFill: { height: "100%", borderRadius: 3, backgroundColor: color.info + "33" },
  pin: {
    position: "absolute",
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: color.foreground,
  },
  rateFoot: { flexDirection: "row", justifyContent: "space-between" },
  rateKey: { fontSize: 10.5, color: "#94a3b8", letterSpacing: 0.3 },
  rateSide: { fontSize: 13.5, fontWeight: "600", color: color.foreground, marginTop: 1 },
  rateMid: { fontSize: 15, fontWeight: "700", color: color.foreground, marginTop: 1 },
  rateRange: { fontSize: 18, fontWeight: "700", color: color.foreground, marginTop: 9 },
  rateNote: { fontSize: 12, color: "#94a3b8", marginTop: 5 },

  tag: { alignSelf: "flex-start", height: 21, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  tagText: { fontSize: 10.5, fontWeight: "700" },
  routeName: { fontSize: 15, fontWeight: "600", color: color.foreground, marginTop: 9 },

  bars: { flexDirection: "row", gap: 3, marginTop: 9 },
  barCol: { flex: 1 },
  barBox: { height: 26, justifyContent: "flex-end" },
  barFill: { borderRadius: 3, minHeight: 3 },
  barKey: { fontSize: 11, color: color.mutedForeground, marginTop: 4 },
});
