/**
 * D9 — park tahlili (TZ 34-band).
 *
 * ── QAYSI SAVOLGA JAVOB BERADI ──────────────────────────────────
 *
 * «Qaysi mashina pul keltiryapti, qaysi biri yeb turibdi.» Shuning
 * uchun birinchi ro'yxat — mashina bo'yicha foyda, oxirgisi esa
 * ZARAR chiqqan reyslar: ular yashirilsa hisob chiroyli ko'rinadi-yu,
 * foydasi qolmaydi.
 *
 * ── VALYUTALAR QO'SHILMAYDI ─────────────────────────────────────
 *
 * Har summa o'z valyutasida alohida qatorda (qoida 2). Kurs kunlik
 * o'zgaradi: 100 USD bilan 100 000 UZS ni qo'shib «yetakchi»
 * chiqarish noto'g'ri javob berardi.
 *
 * Hisob SERVERDA — web sahifasi va AI savoli bilan bitta formula.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { TariffNotice } from "@/components/TariffNotice";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

const RANGES = [30, 90, 180, 365];

type Money = { currency: string; amount: number };
type Bucket = {
  key: string; label: string; sub: string | null; trips: number;
  income: Money[]; expenses: Money[]; profit: Money[]; extra?: string;
};
type Feed = {
  days: number;
  tripCount: number;
  byVehicle: Bucket[];
  byDriver: Bucket[];
  byRoute: Bucket[];
  fuel: { key: string; label: string; liters: number; per100: number | null; km: number }[];
  repairs: { key: string; label: string; issues: number; costs: Money[] }[];
  losses: { tripId: string; furamNo: number; route: string; plate: string | null; loss: Money }[];
};

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));
const money = (rows: Money[]) =>
  rows.length === 0 ? "—" : rows.map((m) => `${fmt(m.amount)} ${m.currency}`).join(" · ");

export default function ParkTahlili() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [days, setDays] = useState(90);
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    `/api/fleet/analytics?days=${days}`,
    [days],
  );

  return (
    <View style={s.root}>
      <Header title={t("mob.fan.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.fan.lead")}</Text>

        <TariffNotice feature="analytics" />

        <View style={s.chips}>
          {RANGES.map((d) => (
            <Pressable key={d} onPress={() => setDays(d)} style={[s.chip, days === d && s.chipOn]}>
              <Text style={[s.chipText, days === d && { color: "#fff" }]}>
                {t("mob.fan.days", { n: d })}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data && data.tripCount === 0 ? (
          <Empty icon="chart" title={t("mob.fan.noData")} text={t("mob.fan.noDataHint")} />
        ) : null}

        {data && data.tripCount > 0 ? (
          <>
            <View style={s.card}>
              <Text style={s.big}>{data.tripCount}</Text>
              <Text style={s.bigLabel}>{t("mob.fan.trips")}</Text>
            </View>

            <Group title={t("mob.fan.byVehicle")} rows={data.byVehicle} />
            <Group title={t("mob.fan.byDriver")} rows={data.byDriver} />
            <Group title={t("mob.fan.byRoute")} rows={data.byRoute} />

            {/* Yoqilg'i */}
            {data.fuel.length > 0 ? (
              <View>
                <Text style={s.group}>{t("mob.fan.fuel")}</Text>
                <View style={{ gap: 8 }}>
                  {data.fuel.map((f) => (
                    <View key={f.key} style={s.row}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.name}>{f.label}</Text>
                        <Text style={s.meta}>
                          {fmt(f.liters)} l · {fmt(f.km)} km
                        </Text>
                      </View>
                      {f.per100 != null ? (
                        <Text style={s.value}>{f.per100.toFixed(1)} l/100</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Ta'mir */}
            {data.repairs.length > 0 ? (
              <View>
                <Text style={s.group}>{t("mob.fan.repairs")}</Text>
                <View style={{ gap: 8 }}>
                  {data.repairs.map((r) => (
                    <View key={r.key} style={s.row}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.name}>{r.label}</Text>
                        <Text style={s.meta}>
                          {t("mob.tstate.issues")}: {r.issues}
                        </Text>
                      </View>
                      <Text style={s.value}>{money(r.costs)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Zarar chiqqan reyslar — YASHIRILMAYDI */}
            {data.losses.length > 0 ? (
              <View>
                <Text style={s.group}>{t("mob.fan.losses")}</Text>
                <View style={{ gap: 8 }}>
                  {data.losses.map((l) => (
                    <Pressable
                      key={l.tripId}
                      onPress={() => router.push(`/reys/${l.tripId}`)}
                      style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.name} numberOfLines={1}>
                          {l.route}
                        </Text>
                        <Text style={s.meta}>
                          FURAM #{l.furamNo}
                          {l.plate ? ` · ${l.plate}` : ""}
                        </Text>
                      </View>
                      <Text style={[s.value, { color: color.danger }]}>
                        −{fmt(l.loss.amount)} {l.loss.currency}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        <AiAsk />
      </ScrollView>
    </View>
  );
}

function Group({ title, rows }: { title: string; rows: Bucket[] }) {
  if (rows.length === 0) return null;
  return (
    <View>
      <Text style={s.group}>{title}</Text>
      <View style={{ gap: 8 }}>
        {rows.map((b) => (
          <View key={b.key} style={s.bucket}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={s.name} numberOfLines={1}>
                {b.label}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={s.trips}>{t("mob.common.countN", { n: b.trips })}</Text>
            </View>
            {b.sub ? <Text style={s.meta}>{b.sub}</Text> : null}

            <View style={s.lines}>
              <Line k={t("mob.fan.income")} v={money(b.income)} />
              <Line k={t("mob.fan.expenses")} v={money(b.expenses)} tone={color.mutedForeground} />
              <Line k={t("mob.fan.profit")} v={money(b.profit)} strong />
            </View>
            {b.extra ? <Text style={s.meta}>{b.extra}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function Line({ k, v, tone, strong }: { k: string; v: string; tone?: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={s.lineK}>{k}</Text>
      <Text
        style={[
          s.lineV,
          tone ? { color: tone } : null,
          strong ? { fontWeight: "800", color: color.foreground } : null,
        ]}
        numberOfLines={1}
      >
        {v}
      </Text>
    </View>
  );
}

/**
 * Parkim haqida AI savol.
 *
 * Model raqamlarni O'YLAB TOPMAYDI: server savolga qarab kerakli
 * hisobni chaqiradi (`ownerAnalytics` va boshqalar) va modelga
 * tayyor son beradi. Shuning uchun javob har safar bir xil chiqadi.
 */
function AiAsk() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function ask() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ answer: string }>("/api/ai/ask", {
        method: "POST",
        body: { question: q.trim() },
      });
      setAnswer(r.answer);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={s.aiIcon}>
          <Icon name="sparkle" size={18} stroke={color.purple} />
        </View>
        <Text style={s.aiTitle}>{t("mob.fan.ask")}</Text>
      </View>

      <View style={{ marginTop: space.md }}>
        <Field
          placeholder={t("mob.fan.askPh")}
          value={q}
          onChangeText={setQ}
          maxLength={500}
          multiline
        />
      </View>

      {answer ? (
        <View style={s.answer}>
          {answer
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l, i) => (
              <Text key={i} style={s.answerLine}>
                {l}
              </Text>
            ))}
        </View>
      ) : null}

      {err ? <Notice tone="danger">{err}</Notice> : null}

      <View style={{ marginTop: space.md }}>
        <Button
          title={busy ? t("mob.aiSum.running") : t("mob.cexp.run")}
          onPress={ask}
          loading={busy}
          disabled={q.trim().length < 3}
          variant="secondary"
        />
      </View>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  chips: { flexDirection: "row", gap: 7 },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
    alignItems: "center",
  },
  chipOn: { backgroundColor: color.foreground },
  chipText: { fontSize: 12.5, fontWeight: "700", color: color.mutedForeground },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  big: {
    fontSize: 34,
    fontWeight: "800",
    color: color.foreground,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  bigLabel: { fontSize: 12.5, color: color.mutedForeground, marginTop: 2 },

  group: {
    fontSize: 12,
    fontWeight: "700",
    color: color.mutedForeground,
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  bucket: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  name: { fontSize: 14, fontWeight: "700", color: color.foreground, flexShrink: 1 },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  trips: { fontSize: 11.5, fontWeight: "700", color: color.mutedForeground },
  value: { fontSize: 13, fontWeight: "700", color: color.foreground, fontVariant: ["tabular-nums"] },

  lines: { gap: 4, marginTop: 10 },
  lineK: { fontSize: 12.5, color: color.mutedForeground },
  lineV: {
    fontSize: 12.5,
    fontWeight: "600",
    color: color.foreground,
    flexShrink: 1,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },

  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: color.purpleSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  aiTitle: { fontSize: 15, fontWeight: "800", color: color.foreground },
  answer: {
    marginTop: space.md,
    backgroundColor: color.muted,
    borderRadius: radius.control,
    padding: space.md,
  },
  answerLine: { fontSize: 13.5, color: color.foreground, lineHeight: 20, marginBottom: 6 },
}));
