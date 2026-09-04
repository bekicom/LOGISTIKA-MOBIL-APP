/**
 * An3 — muammolar va eng yaxshi natijalar.
 *
 * ── SON EMAS, ULUSH ─────────────────────────────────────────────
 *
 * 3 ta bekor qilish 5 ta reysda muammo, 300 ta reysda odatiy hol.
 * `problems()` shuning uchun foizga qaraydi va reys kam bo'lsa
 * umuman xulosa chiqarmaydi.
 *
 * ── OGOHLANTIRISH YECHIMSIZ BO'LMAYDI ───────────────────────────
 *
 * Har qatorda nima qilish kerakligi va uni qiladigan joyga
 * havola bor. Yechimsiz ogohlantirishni odam bir hafta ichida
 * o'qimaydigan bo'lib qoladi.
 *
 * ── MATN SERVERDAN KELMAYDI ─────────────────────────────────────
 *
 * `problems().text` o'zbekcha yasaladi va web uni to'g'ridan-to'g'ri
 * chizadi. Bu yerga esa `key` va RAQAMLAR keladi (`vars`), jumla
 * o'quvchining tilida yasaladi.
 */
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Header, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Problem = { key: string; level: "warn" | "bad"; vars: Record<string, number> };

/* `value` va `label` serverdan KELMAYDI: ikkalasi ham o'zbekcha
   yasalgan edi. Bu yerga kalit, ism va xom raqam keladi.
   `currency` bo'sh bo'lsa `amount` — reys soni, pul emas. */
type Leader = {
  key: string;
  name: string;
  amount: number;
  currency: string | null;
};

/** Har muammoning yechimi qayerda — havolasiz qator foydasiz */
const FIX: Record<string, { route: "/moliya/qarzlar" | "/parkim" | "/reyslar"; tk: string }> = {
  payment: { route: "/moliya/qarzlar", tk: "mob.an.fixDebt" },
  doc: { route: "/parkim", tk: "mob.an.fixDoc" },
  cancel: { route: "/reyslar", tk: "mob.an.fixTrips" },
  late: { route: "/reyslar", tk: "mob.an.fixTrips" },
};

export default function Muammolar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    problems: { trips: number; items: Problem[] };
    leaders: Leader[];
  }>("/api/analytics");

  const items = data?.problems.items ?? [];
  const trips = data?.problems.trips ?? 0;
  /* `problems()` xulosani 5 ta reysdan boshlab chiqaradi */
  const thin = trips < 5;

  return (
    <View style={s.root}>
      <Header
        title={t("mob.an.probTitle")}
        subtitle={data ? t("mob.an.last90", { n: trips }) : undefined}
      />

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
            {items.length === 0 ? (
              <Empty
                icon="check"
                title={t("mob.an.cleanTitle")}
                text={t(thin ? "mob.an.thinHint" : "mob.an.cleanHint")}
              />
            ) : (
              <View style={{ gap: 9 }}>
                {items.map((p) => {
                  const bad = p.level === "bad";
                  const fix = FIX[p.key];
                  return (
                    <View
                      key={p.key}
                      style={[s.card, bad ? s.cardBad : s.cardWarn]}
                    >
                      <View style={s.probRow}>
                        <View
                          style={[
                            s.rule,
                            { backgroundColor: bad ? color.danger : color.warning },
                          ]}
                        />
                        <View style={{ flexGrow: 1, minWidth: 0 }}>
                          {/* Sarlavha — RAQAM bilan, o'z tilida */}
                          <Text style={s.probTitle}>
                            {t(`mob.anProbN.${p.key}`, p.vars)}
                          </Text>
                          <Text style={s.probText}>{t(`mob.anProbWhy.${p.key}`)}</Text>

                          {fix && (
                            <View style={{ alignSelf: "flex-start", marginTop: 9 }}>
                              <Button
                                title={t(fix.tk)}
                                onPress={() => router.push(fix.route)}
                              />
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ══ ENG YAXSHI NATIJALAR ══
                Muammodan keyin teskarisi. Bu maqtov emas: qaysi
                yo'nalish va qaysi haydovchi pul keltirayotgani
                keyingi qarorga asos bo'ladi. */}
            {(data?.leaders ?? []).length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.an.bestGroup")}</Text>
                <View style={[s.card, { padding: 0 }]}>
                  {data!.leaders.map((l, i) => (
                    <View
                      key={l.key}
                      style={[s.best, i < data!.leaders.length - 1 && s.bestLine]}
                    >
                      <Text style={s.bestKey}>{t(`mob.anBest.${l.key}`)}</Text>
                      <View style={s.bestRow}>
                        <Text style={s.bestName} numberOfLines={1}>
                          {l.name}
                        </Text>
                        <Text style={s.bestVal}>
                          {l.currency
                            ? `${fmtNum(l.amount)} ${l.currency}`
                            : t("mob.an.tripsN", { n: l.amount })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ══ MA'LUMOT KAM BO'LSA ══
                Bo'sh ekran «ishlamayapti» degan taassurot
                qoldiradi. Sabab ochiq aytiladi. */}
            {thin && (
              <View style={s.note}>
                <Icon name="alert" size={16} stroke={color.mutedForeground} />
                <Text style={s.noteText}>{t("mob.an.minTrips", { n: 5 })}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
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
  cardBad: { borderWidth: 2, borderColor: color.danger + "66" },
  cardWarn: { borderColor: color.warning + "59" },

  probRow: { flexDirection: "row", gap: 11 },
  rule: { width: 3, borderRadius: 2 },
  probTitle: { fontSize: 14.5, fontWeight: "600", color: color.foreground },
  probText: { fontSize: 12.5, color: color.mutedForeground, marginTop: 3, lineHeight: 19 },

  best: { padding: space.md },
  bestLine: { borderBottomWidth: 1, borderBottomColor: color.muted },
  bestKey: { fontSize: 11, color: "#94a3b8", letterSpacing: 0.3 },
  bestRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 4,
  },
  bestName: { flexShrink: 1, fontSize: 14.5, fontWeight: "600", color: color.foreground },
  bestVal: { fontSize: 14, fontWeight: "700", color: color.success },
  bestMeta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },

  note: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: color.mutedForeground + "12",
  },
  noteText: { flex: 1, fontSize: 12.5, color: color.mutedForeground, lineHeight: 19 },
});
